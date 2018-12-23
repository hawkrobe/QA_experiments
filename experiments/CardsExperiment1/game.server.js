/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins

    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/

    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/
    var
        fs    = require('fs'),
        utils = require(__base + '/sharedUtils/sharedUtils.js');

// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
var onMessage = function(client,message) {
  //Cut the message up into sub components
  var message_parts = message.split('.');

  //The first is always the type of message
  var message_type = message_parts[0];

  //Extract important variables
  var gc = client.game;
  var id = gc.id;
  var all = gc.get_active_players();
  var target = gc.get_player(client.userid);
  var others = gc.get_others(client.userid);
  switch(message_type) {

  case 'playerTyping' :
    _.map(others, function(p) {
      p.player.instance.emit( 'playerTyping', {typing: message_parts[1]});
    });
    break;

  case 'chatMessage' :
    if(client.game.player_count == 2 && !gc.paused) {
      var msg = message_parts[1].replace(/~~~/g,'.');
      _.map(all, function(p){
	p.player.instance.emit( 'chatMessage', {user: client.userid, msg: msg});});
    }
    break;

  case 'reveal' :
    var partner = others[0];
    partner.player.instance.emit('reveal', {selections: message_parts.slice(1)});    
    break;

  case 'exitSurvey' :
    console.log(message_parts.slice(1));
    break;
    
  case 'h' : // Receive message when browser focus shifts
    //target.visible = message_parts[1];
    break;
  }
};

var setCustomEvents = function(socket) {
  socket.on('allCardsFound', function(data) {
    var all = socket.game.get_active_players();
    _.map(all, function(p){
      p.player.instance.emit( 'updateScore', data);});
    socket.game.newRound(4000);
  });
}

/*
  Associates events in onMessage with callback returning json to be saved
  {
    <eventName>: (client, message_parts) => {<datajson>}
  }
  Note: If no function provided for an event, no data will be written
*/
var dataOutput = function() {
  function commonOutput (client, message_data) {
    var target = client.game.trialInfo.currStim.target;
    var distractor = target == 'g1' ? 'g0' : 'g1';
    return {
      iterationName: client.game.iterationName,
      gameid: client.game.id,
      time: Date.now(),
      workerId: client.workerid,
      assignmentId: client.assignmentid,
      trialNum: client.game.roundNum,
      trialType: client.game.trialInfo.currGoalType,
      targetGoalSet: client.game.trialInfo.currStim.goalSets[target],
      distractorGoalSet: client.game.trialInfo.currStim.goalSets[distractor]
    };
  };

  var revealOutput = function(client, message_data) {
    var selections = message_data.slice(1);
    var allObjs = client.game.trialInfo.currStim.hiddenCards;
    return _.extend(
      commonOutput(client, message_data), {
	revealedObjs : selections,
	numRevealed : selections.length,
	fullContext: JSON.stringify(_.map(allObjs, v => {
	  return _.omit(v, ['rank', 'suit', 'url']);
	}))
      });
  };
  

  var exitSurveyOutput = function(client, message_data) {
    var subjectInformationObj = JSON.parse(message_data.slice(1))['subject_information'];
    console.log(subjectInformationObj);
    return _.extend(
      _.omit(commonOutput(client, message_data),
	     ['targetGoalSet', 'distractorGoalSet', 'trialType', 'trialNum']),
      subjectInformationObj);
  };
  

  var messageOutput = function(client, message_data) {
    return _.extend(
      commonOutput(client, message_data), {
	text: message_data[1].replace(/~~~/g, '.'),
	timeFromRoundStart: message_data[2]
      }
    );
  };

  return {
    'chatMessage' : messageOutput,
    'reveal' : revealOutput,
    'exitSurvey' : exitSurveyOutput
  };
}();

module.exports = {dataOutput, onMessage, setCustomEvents};
