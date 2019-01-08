var _ = require('lodash');
var utils = require('./sharedUtils.js');
var ServerGame = require('./game.js')['ServerGame'];
var player = require('./player.js');

class ReferenceGameServer {
  constructor(expPath) {
    this.expPath = expPath;
    this.customConfig = require([__base, expPath, 'config.json'].join('/'));
    this.customExperiment = require([__base, expPath, 'customExperiment.js'].join('/'));
    this.customEvents = this.customExperiment.customEvents;
    
    // Track ongoing games
    this.games = {};
    this.gameCount = 0;
  }

  // if game relies on asynchronous stim logic, need to wait until everything
  // is fetched before starting game (otherwise race conditions)
  startGame(game) {
    game.active = true;
    game.newRound();
  }
  /*
    Writes data specified by experiment instance to csv and/or mongodb
  */
  writeData (client, eventType, message_parts) {
    var output = this.customExperiment.dataOutput();
    var game = client.game;
    if(_.has(output, eventType)) {
      var dataPoint = _.extend(output[eventType](client, message_parts), {eventType});
      if(_.includes(game.dataStore, 'csv'))
	utils.writeDataToCSV(game, dataPoint);
      if(_.includes(game.dataStore, 'mongo'))
	utils.writeDataToMongo(game, dataPoint); 
    }
  }

  onMessage (client, message) {
    var message_parts = message.split('.');
    this.customExperiment.onMessage(client, message);
    if(!_.isEmpty(client.game.dataStore)) {
      this.writeData(client, message_parts[0], message_parts);
    }
  }

  connectPlayer(game, player) {
    player.game = game;
    player.emit('joinGame', {
      id: player.userid,
      numPlayers: game.players.length
    });
  }
  
  // Will run when first player connects
  createGame (player) {
    //Create a new game instance
    var config = _.extend({}, this.customConfig, {
      expPath: this.expPath,
      server: true,
      id : utils.UUID(),
      initPlayer : player,
      playerCount: 1
    });

    var game = new ServerGame(config, this.customExperiment);
    
    // assign role
    this.connectPlayer(game, player);
    this.log('player ' + player.userid + ' created a game with id ' + game.id);
    
    // add to game collection
    this.games[game.id] = game;
    this.gameCount++;

    return game;
  }; 
  
  findGame (player) {
    this.log('looking for a game. We have : ' + this.gameCount);
    var joined_a_game = false;
    var game;
    for (var id in this.games) {
      game = this.games[id];
      if(game.playerCount < game.playersThreshold) {
	// End search
	joined_a_game = true;

	// Add player to game
	game.playerCount++;
	game.players.push({
	  id: player.userid,
	  instance: player,
	  player: new this.player(game, player)
	});

	// Add game to player
	this.connectPlayer(player, game);

	// notify existing players that someone new is joining
	_.map(game.get_others(player.userid), function(p){
	  p.player.instance.emit( 'addPlayer', {id: player.userid});
	});
      }
    }
    
    // If you couldn't find a game to join, create a new one
    if(!joined_a_game) {
      game = this.createGame(player);
    }

    // Start game
    if(game.playersThreshold == game.playerCount) {
      this.startGame(game);
    }
  };

  // we are requesting to kill a game in progress.
  // This gets called if someone disconnects
  endGame (id, userid) {
    var game = this.games[id];
    try {
      // Remove the person who dropped out
      var i = _.indexOf(game.players, _.find(game.players, {id: userid}));
      game.players[i].player = null;

      // If game is ongoing and someone drops out, tell other players and end game
      // If game is over, remove game when last player drops out
      console.log("active: " + game.active);
      if(game.active || game.get_active_players().length < 1) {
	game.endGame();
	delete this.games[id];
	this.gameCount--;
	this.log('game removed. there are now ' + this.gameCount + ' games' );
      } 
    } catch (err) {
      this.log('game ' + id + ' already ended');
    }  
  }; 
  
  // A simple wrapper for logging so we can toggle it, and augment it for clarity.
  log () {
    console.log.apply(this,arguments);
  };
};

module.exports = ReferenceGameServer;

