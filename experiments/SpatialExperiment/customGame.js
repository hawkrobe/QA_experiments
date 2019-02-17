var _ = require('lodash');
var fs    = require('fs');
var assert = require('assert');
var utils  = require(__base + 'src/sharedUtils.js');
var ServerGame = require('./src/game.js')['ServerGame'];
var GameMap = require('./maps.js');
var sendPostRequest = require('request').post;
var questionsFromModel = require('./src/spatialQuestionerOutput.json');

var getBestVal = function(possibilities) {
  var maxProb = _.max(_.map(possibilities, function(v) {
    return _.toNumber(v.prob);
  }));
  var valsWithMax = _.filter(possibilities, function(v){
    return _.toNumber(v.prob) == maxProb;
  });
  return _.sample(valsWithMax);
};

var getAnswerBotResponseFromDB = function(postData, successCallback, failCallback) {
  sendPostRequest('http://localhost:5000/db/getAnswer', {
    json: postData
  }, function(error, res, body) {
    try {
      if (!error && res.statusCode === 200) {
	console.log("success! Received data " + JSON.stringify(body));
	successCallback(body);
      } else {
	throw `${error}`;
      }
    } catch (err) {
      console.log(err);
      console.log('no database; allowing participant to continue');
      failCallback();
    }
  }.bind(this));
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

    
    socket.game.sendAnswerMessage = function(askedAbout, other, fullMap, data) {
      let msg = (fullMap[askedAbout] == 'safe' ? 'Yes, it is safe' :
		 'No, it is not safe');
      msg += other ? ' and ' + other.split('_')[0] + ' is ' + other.split('_')[1] : '';

      let packet = ["answer", msg, 5000, 'bot', 'helper', askedAbout].join('.');
      packet += other ? '.' + other.split('_')[0] : '';
      setTimeout(function() {
	this.onMessage(socket, packet);
      }.bind(this), 3000);
    }.bind(this);
    
    // Pulls out requested data from json and returns as message
    socket.on('getQuestion', function(data){
      var state = {'safe' : _.clone(data.state['safe']).sort(),
		   'unsafe' : _.clone(data.state['unsafe']).sort()};
      var possibilities = _.filter(questionsFromModel, {
	initState: JSON.stringify(state),
	goal: data.goal,
	questionerType: 'pragmatic'
      });

      var code = getBestVal(possibilities)['question'];
      setTimeout(function() {
	this.onMessage(socket, ["question", code, 5000, 'bot', 'leader'].join('.'));
      }.bind(this), 3000);
    }.bind(this));

    // Pulls out requested answer bot response data from db and retunrs as message
    socket.on('getAnswer', function(data){
      console.log('bot getting answer...');
      const state = {'safe' : _.clone(data.state['safe']).sort(),
		     'unsafe' : _.clone(data.state['unsafe']).sort()};
      const fullMap = _.mapValues(data.fullMap, v => v == 'o' ? 'safe' : 'unsafe');
      const postData = {
	dbname: 'QA', colname: 'answererBotResponses',
	cellAskedAbout: data.cellAskedAbout,
	fullMap: JSON.stringify(fullMap),
	state: JSON.stringify(state)
      };

      const successCallback = function(body) {
	const selections = getBestVal(body)['answer'].split(',');
	const askedAbout = _.find(selections, v => {
	  return v.split('_')[0] == data.cellAskedAbout;
	});
	const other = _.find(selections, v => {
	  return v.split('_')[0] != data.cellAskedAbout;
	});
	socket.game.sendAnswerMessage(askedAbout.split('_')[0], other, fullMap, data);
      };

      // if comes back empty, just answer literally
      const failCallback = function() {
	socket.game.sendAnswerMessage(data.cellAskedAbout, '', fullMap, data);
      };
      
      // Now query database
      getAnswerBotResponseFromDB(postData, successCallback, failCallback);
    }.bind(this));

    // Gets called when round is over
    socket.on('endRound', function(data) {
      console.log('round ended...');
      var all = socket.game.activePlayers();
      setTimeout(function() {
	_.map(all, function(p){
	  p.player.instance.emit( 'updateScore', data);
	});
      }, 1000);
      socket.game.questionNum = 0;
      socket.game.newRound(4000);
    });
  }
  
  // *
  // * TrialList creation
  // *
  
  
  sampleMapSequence () {
    // Everyone starts with a couple catch trials for practice
    var otherRole = this.firstRole == 'leader' ? 'helper' : 'leader';
    var initTypes = ['catch', 'catch', 'random', 'random', 'random', 'random'];
    var restTypes = ['random', 'random', 'random', 'random', 
		     'pragmatic', 'blocked', 'empty'];
    var restAsLeader = _.shuffle(restTypes);
    var restAsHelper = _.shuffle(restTypes);    
    var result = initTypes.concat(_.flattenDeep(_.reduce(restAsLeader, (arr, v, i) => {
      return arr.concat(v, restAsHelper[i]);
    }, [])));
    console.log (result)
    return _.map(result, (type, i) => {
      return {trialType: type,
	      goal: _.sample(['rows', 'columns']),
	      role: i % 2 == 0 ? this.firstRole : otherRole};
    });
  }

  // Take trialInfo obj and make a map out of it
  constructMap (trialInfo) {
    const gameMap = new GameMap(trialInfo);
    return {underlying: gameMap['underlying'],
	    initRevealed: gameMap['initRevealed'],
	    goal: trialInfo.goal,
	    role: trialInfo.role};
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
    
    case 'question' :
      gc.questionNum += 1;
      var code = message_parts[1];
      var msg = ("Is " + code + " safe?");
      _.map(all, function(p){
	p.player.instance.emit( 'chatMessage', {
	  user: client.userid,
	  msg: msg,
	  code: code,
	  sender: message_parts[3],
	  source_role: message_parts[4]
	});
      });
      break;
      
    case 'answer' :
      console.log(message_parts);
      _.map(all, function(p){
	p.player.instance.emit('chatMessage', {
	  user: client.userid,
	  msg: message_parts[1],
	  sender: message_parts[3],
	  source_role: message_parts[4],
	  code: message_parts.slice(5)
	});
      });
      break;

    case 'goalInference' :
      console.log(message_parts.slice(1));
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
	questionNumber: client.game.questionNum,
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

module.exports = ServerRefGame;
