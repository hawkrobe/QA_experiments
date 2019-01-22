var _ = require('lodash');
var fs    = require('fs');
var assert = require('assert');
var utils  = require(__base + 'src/sharedUtils.js');
var ServerGame = require('./src/game.js')['ServerGame'];

function makeGoalObject (goals) {
  var goalNames = _.map(_.range(goals.length), v=>'g' + v);
  return _.zipObject(goalNames, goals);
};

function getAllLocs() {
  return _.flattenDeep(_.map(_.range(1,5), function(i) {
    return _.map(_.range(1,5), function(j) {
      return {x: i, y: j};
    });
  }));
};

function sampleStimulusLocs (numObjects) {
  var locs = getAllLocs();
  return _.sampleSize(locs, numObjects);
}

class ServerRefGame extends ServerGame {
  constructor(config) {
    super(config);
    this.trialList = [];
    this.numRounds = config.numRounds;
    this.firstRole = _.sample(['helper', 'leader']);
    this.trialList = this.makeTrialList(this.firstRole);
  }

  customEvents (socket) {
    socket.on('allCardsFound', function(data) {
      var all = socket.game.activePlayers();
      setTimeout(function() {
	_.map(all, function(p){
	  p.player.instance.emit( 'updateScore', data);
	});
       }, 1000);
      socket.game.newRound(4000);
    });
  }
  
  // *
  // * TrialList creation
  // *

  // 3 trials of each row, counterbalanced
  sampleMapSequence () {
    var types = ['catch', 'catch'];
    var otherRole = this.firstRole == 'leader' ? 'helper' : 'leader';
    console.log('first role is' + this.firstRole);
    return _.map(types, (type, i) => {
      return {mapType: type, role: i % 2 == 0 ? this.firstRole : otherRole};
    });
  }
  
  constructMap (trialInfo) {
    if(trialInfo.mapType == 'catch') {
      var grid = new GameMap()['grid'];
      return {full: grid,
	      initRevealed: ['A1', 'A2'],
	      role: trialInfo.role};
    } else {
      console.error('map type ' + trialInfo.mapType + ' not yet implemented');
    }
  }

  // Take condition as argument
  // construct context list w/ statistics of condition
  makeTrialList () {
    var trialSequence = this.sampleMapSequence();
    // Construct trial list (in sets of complete rounds)
    for (var i = 0; i < this.numRounds; i++) {
      var world = this.constructMap(trialSequence[i]); 
      this.trialList.push(world);
    };
    return this.trialList;
  };

  onMessage (client,message) {
    //Cut the message up into sub components
    var message_parts = message.split('.');

    //The first is always the type of message
    var message_type = message_parts[0];

    //Extract important variables
    var gc = client.game;
    var id = gc.id;
    var all = gc.activePlayers();
    var target = gc.getPlayer(client.userid);
    var others = gc.getOthers(client.userid);
    switch(message_type) {
    
    case 'chatMessage' :
      if(client.game.playerCount == gc.playersThreshold && !gc.paused) {
	var msg = message_parts[2].replace(/~~~/g,'.');
	_.map(all, function(p){
	  p.player.instance.emit( 'chatMessage', {
	    user: client.userid, msg: msg, code: message_parts[1],
	    sender: message_parts[4],
	    source_role: message_parts[5]
	  });
	});
      }
      break;

    case 'reveal' :
      _.map(all, function(p){
	p.player.instance.emit('reveal', {selections: message_parts.slice(3)});
      });
      break;

    case 'exitSurvey' :
      console.log(message_parts.slice(1));
      break;
      
    case 'h' : // Receive message when browser focus shifts
      //target.visible = message_parts[1];
      break;
    }
  };

  /*
    Associates events in onMessage with callback returning json to be saved
    {
    <eventName>: (client, message_parts) => {<datajson>}
    }
    Note: If no function provided for an event, no data will be written
  */
  dataOutput () {
    function commonOutput (client, message_data) {
      //var target = client.game.currStim.target;
      //var distractor = target == 'g1' ? 'g0' : 'g1';
      console.log(client.game.currStim);
      return {
	iterationName: client.game.iterationName,
	gameid: client.game.id,
	time: Date.now(),
	workerId: client.workerid,
	assignmentId: client.assignmentid,
	trialNum: client.game.roundNum,
	trialType: client.game.currStim.currGoalType,
	// targetGoalSet: client.game.currStim.goalSets[target],
	// distractorGoalSet: client.game.currStim.goalSets[distractor],
	firstRole: client.game.firstRole
      };
    };
    
    var revealOutput = function(client, message_data) {
      var selections = message_data.slice(3);
      var allObjs = client.game.currStim.hiddenCards;
      return _.extend(
	commonOutput(client, message_data), {
	  sender: message_data[1],
	  timeFromMessage: message_data[2],
	  revealedObjs : selections,
	  numRevealed : selections.length,
	  fullContext: JSON.stringify(_.map(allObjs, v => {
	    return _.omit(v, ['rank', 'suit', 'url']);
	  }))
	});
    };
    

    var exitSurveyOutput = function(client, message_data) {
      var subjInfo = JSON.parse(message_data.slice(1));
      return _.extend(
	_.omit(commonOutput(client, message_data),
	       ['targetGoalSet', 'distractorGoalSet', 'trialType', 'trialNum']),
	subjInfo);
    };
    

    var messageOutput = function(client, message_data) {
      return _.extend(
	commonOutput(client, message_data), {
	  cardAskedAbout: message_data[1],
	  sender: message_data[4],
	  timeFromRoundStart: message_data[3]
	}
      );
    };

    return {
      'chatMessage' : messageOutput,
      'reveal' : revealOutput,
      'exitSurvey' : exitSurveyOutput
    };
  }
}

class GameMap {
  constructor() {
    const origMap = [
      ['g' ,'g', 'g', 'g'],
      ['g', 'g', 'g', 'g'],
      ['r', 'r', 'r', 'r'],
      ['r', 'r', 'r', 'r']
    ];
    const labels = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4',
		    'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4'];
    var transformation = _.sample([
      x => x,
      x => this.rotate(x),
      // x => this.reflect(this.rotate(x)),
      // x => this.rotate(this.reflect(this.rotate(x)))
    ]);
    this.grid = _.zipObject(labels, _.flatten(transformation(origMap)));
    // console.log(transformation(origMap));
    // console.log(_.flatten(transformation(origMap)));
    // console.log(this.grid);
  }

  rotate (grid) {
    console.log('before rotated:')
    console.log(grid);
    console.log('after rotated:')
    console.log(_.zip(...grid));
    return _.zip(...grid);
  }

  reflect (grid) {
    console.log('before reflect:')
    console.log(grid);
    console.log('after reflect')
    console.log(_.map(grid, row => _.reverse(...row)));
    return _.map(grid, row => _.reverse(...row));
  }
}

module.exports = ServerRefGame;
