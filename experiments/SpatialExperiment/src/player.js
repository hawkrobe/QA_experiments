class GamePlayer {
  constructor (gameInstance, playerInstance) {
    this.instance = playerInstance;
    this.game = gameInstance;
    this.role = '';
    this.message = '';
    this.id = '';
  }
};

module.exports = GamePlayer;
