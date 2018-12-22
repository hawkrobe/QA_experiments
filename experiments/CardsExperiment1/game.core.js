
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
  this.projectName = 'QA';
  this.experimentName = 'cards';
  this.iterationName = 'pilot0';
  this.anonymizeCSV = true;
  this.bonusAmt = 5; // in cents
  
  // save data to the following locations (allowed: 'csv', 'mongo')
  this.dataStore = ['csv', 'mongo'];

  // How many players in the game?
  this.players_threshold = 2;
  this.playerRoleNames = {
    role1 : 'seeker',
    role2 : 'helper'
  };

  //Dimensions of world in pixels and numberof cells to be divided into;
  this.numHorizontalCells = 4;
  this.numVerticalCells = 4;
  this.cellDimensions = {height : 300, width : 300}; // in pixels
  this.cellPadding = 0;
  this.world = {
    height: 600 * 2,
    width: 600 * 2
  };
  
  // Which round are we on (initialize at -1 so that first round is 0-indexed)
  this.roundNum = -1;

  // How many rounds do we want people to complete?
  this.numRounds = 8;
  this.feedbackDelay = 300;
  this.revealedCards = [];
  
  // This will be populated with the objectst
  this.trialInfo = {roles: _.values(this.playerRoleNames)};

  if(this.server) {
    this.id = options.id; 
    this.expName = options.expName;
    this.active = false;
    this.player_count = options.player_count;
    this.objects = require('./images/objects.json');
    this.trialList = this.makeTrialList();
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
    this.confetti = new Confetti(300);
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
	currGoalType: localThis.contextTypeList[localThis.roundNum],
	roles: _.zipObject(_.map(localThis.players, p =>p.id),
			   _.reverse(_.values(localThis.trialInfo.roles)))
      };
      localThis.server_send_update();
    }
  }, delay);
};

// Take condition as argument
// construct context list w/ statistics of condition
game_core.prototype.makeTrialList = function () {
  var that = this;
  var trialList = [];
  this.contextTypeList = [];
  this.repetitionList = [];
  
  // Keep sampling until we get a suitable sequence
  var sequence = this.sampleGoalSequence();
  // Construct trial list (in sets of complete rounds)
  for (var i = 0; i < this.numRounds; i++) {
    var trialInfo = sequence[i];
    this.contextTypeList.push(trialInfo['goalType']);

    var world = this.sampleTrial(trialInfo); 
    trialList.push(world);
  };
  return trialList;
};

var makeGoalObject = function(goals) {
  var goalNames = _.map(_.range(goals.length), v=>'g' + v);
  return _.zipObject(goalNames, goals);
};

game_core.prototype.sampleGoalSet = function(goalType, hiddenCards) {
  var numGoals = 2;
  if(goalType == 'catch') {
    return makeGoalObject(_.map(_.sampleSize(hiddenCards, numGoals), v => [v.name]));
  } else if(goalType == 'overlap') {
    var overlappingGoal = _.sampleSize(hiddenCards, 1)[0]['name'];
    var otherGoals = _.filter(hiddenCards, v => v.name != overlappingGoal);
    return makeGoalObject(_.map(_.sampleSize(otherGoals, 2),
				v => [v.name, overlappingGoal]));
  } else if(goalType == 'baseline') {
    var goal1 = _.map(_.sampleSize(hiddenCards, 2), 'name');
    var others = _.filter(hiddenCards, v => !_.includes(goal1, v.name));
    var goal2 = _.map(_.sampleSize(others, 2), 'name');
    return makeGoalObject([goal1, goal2]);
  } else if(goalType == 'practice') {
    return makeGoalObject([_.map(_.sampleSize(hiddenCards, 2), 'name')]);
  } else {
    console.error('goal type ' + goalType + ' not yet implemented');
  }
};

game_core.prototype.sampleGoalSequence = function() {
  var types = ['overlap', 'catch', 'baseline'];
  var player1trials = ['practice'].concat(_.shuffle(types));
  var player2trials = ['practice'].concat(_.shuffle(types));
  // This interleaves the trials (i.e. 'zips' together, so roles alternate)
  var result = _.reduce(player1trials, (arr, v, i) => {
    return arr.concat(v, player2trials[i]); 
  }, []);
  return _.flattenDeep(_.map(result, type => {
    return {
      goalType: type,
      numCards: _.sample(_.range(5, 9))  // Sample a random set of cards to be hidden this round
    };
  }));
};

game_core.prototype.sampleTrial = function(trialInfo) {
  // Sample set of hidden cards
  var hiddenCards = _.sampleSize(this.objects, trialInfo.numCards);

  // Sample the goal sets and pick one to be the target
  var goalSets = this.sampleGoalSet(trialInfo.goalType, hiddenCards);
  var target = _.sample(_.keys(goalSets));
  
  // Sample places to put cards
  var locs = this.sampleStimulusLocs(trialInfo.numCards);
  return _.extend({}, trialInfo, {
    goalSets,
    target,
    hiddenCards: _.map(hiddenCards, function(obj, index) {
      return _.extend({}, obj, {
	gridX: locs[index]['x'],
	gridY: locs[index]['y']
      });
    })
  });
};

function getAllLocs() {
  return _.flattenDeep(_.map(_.range(1,5), function(i) {
    return _.map(_.range(1,5), function(j) {
      return {x: i, y: j};
    });
  }));
};

game_core.prototype.sampleStimulusLocs = function(numObjects) {
  var locs = getAllLocs();
  return _.sampleSize(locs, numObjects);
};

game_core.prototype.server_send_update = function(){
  //Make a snapshot of the current state, for updating the clients
  var local_game = this;

  // Add info about all players
  var player_packet = _.map(local_game.players, function(p){
    return {id: p.id,
            player: null};
  });

//  console.log(this.trialInfo.currStim);

  var state = {
    gs : this.game_started,   // true when game's started
    pt : this.players_threshold,
    pc : this.player_count,
    dataObj  : this.data,
    roundNum : this.roundNum,
    trialInfo: this.trialInfo,
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
