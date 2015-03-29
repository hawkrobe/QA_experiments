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
var has_require = typeof require !== 'undefined'

if( typeof _ === 'undefined' ) {
    if( has_require ) {
        _ = require('underscore')
    }
    else throw new ('mymodule requires underscore, see http://underscorejs.org');
}                        

var game_core = function(game_instance){

    this.debug = false

    // Define some variables specific to our game to avoid
    // 'magic numbers' elsewhere
    this.instance = game_instance;

    //Store a flag if we are the server instance
    this.server = this.instance !== undefined;

    //Dimensions of world -- Used in collision detection, etc.
    this.world = {width : 600, height : 600};  // 160cm * 3
    this.ratio = 2;
    this.questionBox = {
        tlX : 125*this.ratio, tlY: 400*this.ratio, 
        height: 175*this.ratio, width: 350*this.ratio}

    this.answerLine = {
        startX : this.questionBox.tlX + 50*this.ratio, 
        endX   : this.questionBox.tlX + this.questionBox.width - 50*this.ratio,
        y      : this.questionBox.tlY + this.questionBox.height/2}

    this.sendQuestionButton = {
        width: this.questionBox.width/4,
        height: this.questionBox.height*1/8,
        tlX: this.questionBox.tlX + this.questionBox.width*3/8,
        tlY: this.questionBox.tlY + this.questionBox.height*7/8 - 2*this.ratio,
    }

    this.data = {trials : []}
    this.trialPacket = {}
    this.roundNum = -1;
    this.goalNum = -1;
    this.numRounds = 8;
    this.phase = 0;

    if(this.server) {
        this.players = [{
            id: this.instance.player_instances[0].id, 
            player: new game_player(this,this.instance.player_instances[0].player)
        }];
        this.server_send_update()
    } else {
        this.players = [{
            id: null, 
            player: new game_player(this)
        }]
    }
}; 

var game_player = function( game_instance, player_instance) {
    //Store the instance, if any
    this.instance = player_instance;
    this.game = game_instance;
    this.role = ''
    //Set up initial values for our state information
    this.questionBoxAdjustment = 0; // so we don't have magic numbers!
    this.message = '';
    this.id = '';
}; 

var word = function( content ) {
    this.content = content
    this.trueX = 0;
    this.trueY = 0;
}

// server side we set some classes to global types, so that
// it can use them in other files (specifically, game.server.js)
if('undefined' != typeof global) {
    module.exports = global.game_core = game_core;
    module.exports = global.game_player = game_player;
    var objectSet = require('./stimuli/objectSet')
}

// HELPER FUNCTIONS

// Method to easily look up player 
game_core.prototype.get_player = function(id) {
    var result = _.find(this.players, function(e){ return e.id == id; });
    return result.player
};

// Method to get list of players that aren't the given id
game_core.prototype.get_others = function(id) {
    return _.without(_.map(_.filter(this.players, function(e){return e.id != id}), 
        function(p){return p.player ? p : null}), null)
};

// Returns all other players
game_core.prototype.get_active_players = function() {
    return _.without(_.map(this.players, function(p){
        return p.player ? p : null}), null)
};

game_core.prototype.newRound = function() {
    console.log("new round!")
    console.log(this.roundNum)
    if(this.roundNum == this.numRounds - 1) {
        var local_game = this;
        _.map(local_game.get_active_players(), function(p){
            p.player.instance.disconnect()})//send('s.end')})
    } else {
        this.item = this.makeItem()
        this.roundNum += 1;
        this.goals = this.item.goals
        this.questions = this.item.questions
        wordList = _.shuffle([' where ', ' is ', ' the ', ' that '].concat(this.questions))
        this.words = _.map(wordList, function(content) {
            return new word(content)
        })
        this.goalNum = Math.floor(Math.random() * 4);
        this.phase = 0;
        this.goal = this.goals[this.goalNum]
        this.server_send_update()

    }
}

// Randomizes objects in the way given by Keysar et al (2003)
game_core.prototype.makeItem = function () {
    // 1) Choose order of experimental & baseline (no more than 2 in a row)
    var local_this = this;

    // 2) Assign target & distractor based on condition
    var item = _.sample(JSON.parse(JSON.stringify(objectSet.items)))

    // 3. assign random initial locations (probably won't want to do this in the real exp.)
    var xLocs = _.range(100 * this.ratio, 600 * this.ratio , 125 * this.ratio)
    item.goals = _.shuffle(item.goals)
    _.map(_.zip(item.goals, xLocs), function(pair) {
        obj = pair[0]
        obj.trueX = pair[1] - obj.width/2
        obj.trueY = local_this.ratio * 100 - obj.height/2
    })

    _.map(_.zip(_.range(4), _.shuffle(_.range(4))),  function(pair) {
        var i = pair[0]
        var presentationNum = pair[1]
        item.goals[i].presentationNum = presentationNum;
    })

    return item
}

// maps a grid location to the exact pixel coordinates
// for x = 1,2,3,4; y = 1,2,3,4
game_core.prototype.getPixelFromCell = function (x, y) {
    return {
        centerX: 25 + 68.75 + 137.5 * (x - 1),
        centerY: 25 + 68.75 + 137.5 * (y - 1),
        width: 137.5,
        height: 137.5
    }
}

// maps a raw pixel coordinate to to the exact pixel coordinates
// for x = 1,2,3,4; y = 1,2,3,4
game_core.prototype.getCellFromPixel = function (mx, my) {
    var cellX = Math.floor((mx - 25) / 137.5) + 1
    var cellY = Math.floor((my - 25) / 137.5) + 1
    return [cellX, cellY]
}

game_core.prototype.server_send_update = function(){
    //Make a snapshot of the current state, for updating the clients
    var local_game = this;
    
    // Add info about all players
    var player_packet = _.map(local_game.players, function(p){
        return {id: p.id,
            player: null}
        })

    var state = {
            gs : this.game_started,                      // true when game's started
            pt : this.players_threshold,
            pc : this.player_count,
            goalNum : this.goalNum,
            goal : this.goal,
            phase : this.phase
        };

    _.extend(state, {players: player_packet})
    _.extend(state, {questions: this.questions})
    _.extend(state, {words: this.words})

    if(player_packet.length == 2) {
        _.extend(state, {goals: this.goals})
    }

    //Send the snapshot to the players
    this.state = state;
    console.log("sending update:")
    console.log(state)
    _.map(local_game.get_active_players(), function(p){
        p.player.instance.emit( 'onserverupdate', state)})
};

// (4.22208334636).fixed(n) will return fixed point value to n places, default n = 3
Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
