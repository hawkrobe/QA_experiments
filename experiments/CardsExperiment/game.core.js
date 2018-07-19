
/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström,
                  2013 Robert XD Hawkins

 written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/

    substantially modified for collective behavior experiments on the web
    MIT Licensed.
*/

/*
  The main game class. This gets created on both server and
  client. Server creates one for each game that is hosted, and each
  client creates one for itself to play the game. When you set a
  variable, remember that it's only set in that instance.
*/

var has_require = typeof require !== 'undefined';

if( typeof _ === 'undefined' ) {
  if( has_require ) {
    _ = require('lodash');
    utils  = require(__base + 'sharedUtils/sharedUtils.js');
    assert = require('assert');
  }
  else throw 'mymodule requires underscore, see http://underscorejs.org';
}

var game_core = function(options){
  // Store a flag if we are the server instance
  this.server = options.server ;

  // Some config settings
  this.email = 'rxdh@stanford.edu';
  this.projectName = 'basicLevel';
  this.experimentName = 'artificialLanguage';
  this.iterationName = 'experiment2_pilot';
  this.anonymizeCSV = true;
  this.bonusAmt = 3; // in cents
  
  // save data to the following locations (allowed: 'csv', 'mongo')
  this.dataStore = ['csv', 'mongo'];

  // How many players in the game?
  this.players_threshold = 2;
  this.playerRoleNames = {
    role1 : 'speaker',
    role2 : 'listener'
  };

  //Dimensions of world in pixels and numberof cells to be divided into;
  this.numHorizontalCells = 2;
  this.numVerticalCells = 2;
  this.cellDimensions = {height : 600, width : 600}; // in pixels
  this.cellPadding = 0;
  this.world = {
    height: 600 * 2,
    width: 600 * 2
  };
  
  // Which round are we on (initialize at -1 so that first round is 0-indexed)
  this.roundNum = -1;

  // How many rounds do we want people to complete?
  this.numRounds = 72;
  this.feedbackDelay = 300;

  // This will be populated with the tangram set
  this.trialInfo = {roles: _.values(this.playerRoleNames)};

  if(this.server) {
    this.id = options.id; 
    this.expName = options.expName;
    this.active = false;
    this.player_count = options.player_count;
    var rawObjects = require('./objects.json');
    this.stimulusHalf = _.sample(['square', 'circle']);
    this.objects = _.filter(rawObjects, ['super', this.stimulusHalf]);
    this.condition = 'mixed';//_.sample(['mixed', 'singleton', 'set']);
    this.trialList = this.makeTrialList();
    this.language = new ArtificialLanguage();
    this.data = {
      id : this.id,
      subject_information : {
	score: 0,
        gameID: this.id
      }
    };
    this.players = [{
      id: options.player_instances[0].id,
      instance: options.player_instances[0].player,
      player: new game_player(this,options.player_instances[0].player)
    }];
    this.streams = {};
    this.server_send_update();
  } else {
    // If we're initializing a player's local game copy, create the player object
    this.players = [{
      id: null,
      instance: null,
      player: new game_player(this)
    }];
  }
};

var game_player = function( game_instance, player_instance) {
  this.instance = player_instance;
  this.game = game_instance;
  this.role = '';
  this.message = '';
  this.id = '';
};

// server side we set some classes to global types, so that
// we can use them in other files (specifically, game.server.js)
if('undefined' != typeof global) {
  module.exports = {game_core, game_player};
}

// HELPER FUNCTIONS

// Method to easily look up player
game_core.prototype.get_player = function(id) {
  var result = _.find(this.players, function(e){ return e.id == id; });
  return result.player;
};

// Method to get list of players that aren't the given id
game_core.prototype.get_others = function(id) {
  var otherPlayersList = _.filter(this.players, function(e){ return e.id != id; });
  var noEmptiesList = _.map(otherPlayersList, function(p){return p.player ? p : null;});
  return _.without(noEmptiesList, null);
};

// Returns all players
game_core.prototype.get_active_players = function() {
  var noEmptiesList = _.map(this.players, function(p){return p.player ? p : null;});
  return _.without(noEmptiesList, null);
};

game_core.prototype.newRound = function(delay) {
  var players = this.get_active_players();
  var localThis = this;
  setTimeout(function() {
    // If you've reached the planned number of rounds, end the game
    if(localThis.roundNum == localThis.numRounds - 1) {
      localThis.active = false;
      _.forEach(players, p => p.player.instance.emit( 'finishedGame' ));
    } else {
      // Tell players
      _.forEach(players, p => p.player.instance.emit( 'newRoundUpdate'));

      // Otherwise, get the preset list of tangrams for the new round
      localThis.roundNum += 1;

      localThis.trialInfo = {
	currStim: localThis.trialList[localThis.roundNum],
	currContextType: localThis.contextTypeList[localThis.roundNum],
	currRepetition: localThis.repetitionList[localThis.roundNum],
	labels: localThis.language.vocab,
	roles: _.zipObject(_.map(localThis.players, p =>p.id),
			   _.reverse(_.values(localThis.trialInfo.roles)))
      };
      localThis.server_send_update();
    }
  }, delay);
};

game_core.prototype.coordExtension = function(obj, gridCell) {
  return {
    trueX : gridCell.centerX - obj.width/2,
    trueY : gridCell.centerY - obj.height/2,
    gridPixelX: gridCell.centerX - 100,
    gridPixelY: gridCell.centerY - 100
  };
};

// Take condition as argument
// construct context list w/ statistics of condition
game_core.prototype.makeTrialList = function () {
  var that = this;
  var trialList = [];
  this.contextTypeList = [];
  this.repetitionList = [];
  
  // Keep sampling until we get a suitable sequence
  var sequence = this.sampleTargetSequence();
  while(!checkSequence(sequence)) {
    sequence = this.sampleTargetSequence();
  }
  sequence = markRepetitions(sequence);
  console.log(sequence);
  // Construct trial list (in sets of complete rounds)
  for (var i = 0; i < this.numRounds; i++) {
    var trialInfo = sequence[i];
    this.contextTypeList.push(trialInfo['trialType']);
    this.repetitionList.push(trialInfo['repetition']);
    var world = this.sampleTrial(trialInfo['target'], trialInfo['trialType']); 
    trialList.push(_.map(world, function(obj) {
      var newObj = _.clone(obj);
      var speakerGridCell = that.getPixelFromCell(obj.speakerCoords);
      var listenerGridCell = that.getPixelFromCell(obj.listenerCoords);
      newObj.width = that.cellDimensions.width * 3/4;
      newObj.height = that.cellDimensions.height * 3/4;      
      _.extend(newObj.speakerCoords, that.coordExtension(newObj, speakerGridCell));
      _.extend(newObj.listenerCoords, that.coordExtension(newObj, listenerGridCell));
      return newObj;
    }));
  };
  return(trialList);
};

var designMatrix = {
  'mixed'     : ['singleton', 'singleton', 'set'],
  'singleton' : ['singleton'],
  'set'       : ['set']
};

// Ensure each object appears even number of times, evenly spaced across trial types...?
game_core.prototype.sampleTargetSequence = function() {
  var trials = designMatrix[this.condition];
  var targetRepetitions = this.numRounds / this.objects.length;
  var trialTypeSequenceLength = trials.length;
  var that = this;
  return _.flattenDeep(_.map(_.range(targetRepetitions / trialTypeSequenceLength), i => {
    return _.shuffle(_.flatten(_.map(trials, function(trialType) {
      return _.map(that.objects, function(target) {
	var id = trialType == 'set' ? target.name.slice(0, -1) + 's' : target.name;
	return {target, id, trialType};
      });
    })));
  }));
};

function markRepetitions(trialList) {
  var setSeenCounts = {
    'redSquares' : 0, 'blueSquares': 0, 'stripedCircles' : 0, 'spottedCircles': 0,
    'redSquare1' : 0, 'redSquare2' : 0, 'blueSquare1' : 0, 'blueSquare2' : 0,
    'spottedCircle1' : 0, 'spottedCircle2' : 0, 'stripedCircle1' : 0, 'stripedCircle2' : 0
  };
  return _.map(trialList, function(trial) {
    var localRepetition = setSeenCounts[trial.id];
    setSeenCounts[trial.id] += 1;
    return _.extend({}, trial, {repetition: localRepetition});
  });
};

// Want to make sure there are no adjacent targets (e.g. gap is at least 1 apart?)
function mapPairwise(arr, func){
  var l = [];
  for(var i=0;i<arr.length-1;i++){
    l.push(func(arr[i], arr[i+1]));
  }
  return l;
}

// Make sure targets don't appear back-to-back
// TODO: also make sure trial types aren't too clumpy?
var checkSequence = function(proposalList) {
//  console.log(proposalList);
  return _.every(mapPairwise(proposalList, function(curr, next) {
    return curr.id !== next.id;
  }));
};

// Make sure all distractors come in pairs
game_core.prototype.sampleDistractors = function(target, contextType) {
  var targetMatch = contextType == 'set' ? [] : _.filter(this.objects, v => {
    return v.basic == target.basic && v.subID != target.subID;
  });
  var otherDistractor = _.sample(_.filter(this.objects, v => {
    return v.basic != target.basic;
  }));
  var distractorMatch = _.filter(this.objects, v => {
    return v.basic == otherDistractor.basic && v.subID != otherDistractor.subID;
  });
  return targetMatch.concat(otherDistractor).concat(distractorMatch);
};

game_core.prototype.sampleTargetSet = function(target, contextType) {
  if(contextType == 'singleton') {
    return [_.extend({}, target, {targetStatus: 'target'})];
  } else {
    return _.filter(this.objects, v => v.basic == target.basic);
  }
};

// take context type as argument
game_core.prototype.sampleTrial = function(target, contextType) {
  var targets = _.map(this.sampleTargetSet(target, contextType),
		      v => _.extend({}, v, {targetStatus: 'target'}));
  var distractors = _.map(this.sampleDistractors(target, contextType),
			  v => _.extend({}, v, {targetStatus: 'distractor'}));
  var locs = this.sampleStimulusLocs();
  return _.map(distractors.concat(targets), function(obj, index) {
    return _.extend(obj, {
      listenerCoords: {
	gridX: locs.listener[index][0],
	gridY: locs.listener[index][1]},
      speakerCoords: {
	gridX: locs.speaker[index][0],
	gridY: locs.speaker[index][1]}
    });
  });
};

// maps a grid location to the exact pixel coordinates
// for x = 1,2,3,4; y = 1,2,3,4
game_core.prototype.getPixelFromCell = function (coords) {
  var x = coords.gridX;
  var y = coords.gridY;
  return {
    centerX: (this.cellPadding/2 + this.cellDimensions.width * (x - 1)
        + this.cellDimensions.width / 2),
    centerY: (this.cellPadding/2 + this.cellDimensions.height * (y - 1)
        + this.cellDimensions.height / 2),
    upperLeftX : (this.cellDimensions.width * (x - 1) + this.cellPadding/2),
    upperLeftY : (this.cellDimensions.height * (y - 1) + this.cellPadding/2),
    width: this.cellDimensions.width,
    height: this.cellDimensions.height
  };
};

game_core.prototype.sampleStimulusLocs = function() {
  var listenerLocs = _.shuffle([[1,1], [2,1], [1,2], [2,2]]);
  var speakerLocs = _.shuffle([[1,1], [2,1], [1,2], [2,2]]);
  return {listener : listenerLocs, speaker : speakerLocs};
};

game_core.prototype.server_send_update = function(){
  //Make a snapshot of the current state, for updating the clients
  var local_game = this;

  // Add info about all players
  var player_packet = _.map(local_game.players, function(p){
    return {id: p.id,
            player: null};
  });

  var state = {
    gs : this.game_started,   // true when game's started
    pt : this.players_threshold,
    pc : this.player_count,
    dataObj  : this.data,
    roundNum : this.roundNum,
    trialInfo: this.trialInfo,
    language: this.language,
    allObjects: this.objects,
    stimulusHalf : this.stimulusHalf
  };
  _.extend(state, {players: player_packet});
  _.extend(state, {instructions: this.instructions});

  //Send the snapshot to the players
  this.state = state;
  _.map(local_game.get_active_players(), function(p){
    p.player.instance.emit( 'onserverupdate', state);});
};

var ArtificialLanguage = function() {
  this.vocabSize = 9;
  this.wordLength = 4;
  this.possibleVowels = ['a','e','i','o','u'];
  this.possibleConsonants = ['g','h','k','l','m','n','p','w'];
  // Keep sampling vocabs until we get one that works
  this.vocab = this.sampleVocab();
  while(!this.verifyVocab(this.vocab)) {
    this.vocab = this.sampleVocab();
  }
};

ArtificialLanguage.prototype.sampleVocab = function() {
  var vocab = _.map(_.range(this.vocabSize), (wordNum) => {
    return _.map(_.range(this.wordLength), (charNum) => {
      var chars = charNum % 2 === 0 ? this.possibleConsonants : this.possibleVowels;
      return _.sample(chars);
    }).join('');
  });
  return this.verifyVocab(vocab) ? vocab : this.sampleVocab();
}; 

// Ensure no words have same morpheme in same position
ArtificialLanguage.prototype.verifyVocab = function(vocab) {
  var morphemes = _.map(vocab, w => _.map(_.chunk(w.split(''), 2), m => m.join('')));
  var uniqueMorphemes = _.every(_.zip.apply(_, morphemes), morpheme => {
    return _.uniq(morpheme).length === vocab.length;
  });
  // Prevent some sketchy words from being generated
  var sketchyWords = ['niga', 'kike', 'kale', 'wine', 'nope', 'male', 'page', 'name'];
  var noTabooWords = _.intersection(vocab,sketchyWords).length == 0;
  return uniqueMorphemes && noTabooWords;
};
