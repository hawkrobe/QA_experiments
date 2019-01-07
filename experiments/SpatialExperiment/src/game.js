var player = require('./player.js');

class Game {
  constructor(config){
    this.roundNum = -1;
    this.trialInfo = {};

    this.email = config.email;
    this.projectName = config.projectName;
    this.experimentName = config.experimentName;
    this.iterationName = config.iterationName;
    this.anonymizeCSV = config.anonymizeCSV;
    this.bonusAmt = config.bonusAmt;
    this.dataStore = config.dataStore;
    this.playersThreshold = config.playersThreshold;
    this.playerRoleNames = config.playerRoleNames;
    this.numRounds = config.numRounds;
    this.numHorizontalCells = config.numHorizontalCells;
    this.numVerticalCells = config.numVerticalCells;
    this.cellDimensions = config.cellDimensions;
    this.cellPadding = config.cellPadding;
    this.world = {
      height: this.cellDimensions.height * this.numVerticalCells,
      width: this.cellDimensions.width * this.numHorizontalCells
    },
    this.delay = config.delay;
  }

  // Returns player object corresponding to id
  getPlayer (id) {
    return _.find(this.players, {id : id})['player'];
  };

  // Returns all players that aren't the given id
  getOthers (id) {
    var otherPlayersList = _.filter(this.players, e => e.id != id);
    var noEmptiesList = _.map(otherPlayersList, p => p.player ? p : null);
    return _.without(noEmptiesList, null);
  };

  // Returns array of all active players
  activePlayers () {
    return _.without(_.map(this.players, p => p.player ? p : null), null);
  };
};

// ServerGame is copy of game with more specific server-side functions
// Takes a more specific config as well as custom functions to construct
// trial list and advance to next round
class ServerGame extends Game {
  constructor(config, experiment) {
    super(config);
    this.active = false;
    this.streams = {};
    
    this.gameid = config.gameid; 
    this.expPath = config.expPath;
    this.playerCount = config.playerCount;
    this.trialList = experiment.makeTrialList();
    
    this.players = [{
      id: config.initPlayer.userid,
      instance: config.initPlayer,
      player: new player(this, config.initPlayer)
    }];
  }

  // Bundle up server-side info to update client
  takeSnapshot () {
    var playerPacket = _.map(this.players, p => {return {id: p.id, player: null};});
    var state = {
      active : this.active,
      roundNum : this.roundNum,
      trialInfo: this.trialInfo,
      objects: this.objects
    };

    _.extend(state, {players: playerPacket});

    return state;
  };

  endGame () {
    setTimeout(() => {
      _.forEach(this.activePlayers, p => {
	try {
	  p.player.instance.send('s.end');
	} catch(err) {
	  console.log('player did not exist to disconnect');
	}
      });
    }, this.delay);
  }
  
  // This is called on the server side to trigger new round
  newRound (delay) {
    if(this.roundNum == this.numRounds - 1) {
      this.active = false;
      this.endGame();
    } else {
      // Otherwise, get the preset list of tangrams for the new round
      this.roundNum += 1;
      this.currStim = this.trialList[this.roundNum];
      var state = this.makeSnapshot();
      setTimeout(function() {
	_.forEach(this.activePlayers, p => {
	  p.player.instance.emit( 'newRoundUpdate', state);
	});
      }, delay);
    }
  };
}

class ClientGame extends Game {
  constructor (config) {
    console.log(config);
    super(config);
    this.confetti = new Confetti(300);
    this.data = {
      score: 0,
      gameID: this.id
    };

    this.players = [{
      id: null,
      instance: null,
      player: new player(this)
    }];
  }
}

module.exports = {ClientGame, ServerGame};
