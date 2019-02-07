const _ = require('lodash');

class GameMap {
  constructor(trialInfo) {
    this.trialType = trialInfo.trialType;
    this.goalType = trialInfo.goal;    

    this.labels = [
      'A1', 'A2', 'A3',
      'B1', 'B2', 'B3', 
      'C1', 'C2', 'C3'
    ];

    // Boards are equivalent w.r.t. reflection, so we 
    // construct assuming row goal and then rotate to get col goal boards
    const transformation = this.goalType == 'rows' ? _.sample([
      x => x,
      x => this.rotate(this.reflect(this.rotate(x)))
    ]) : _.sample([
      x => this.rotate(x),
      x => this.reflect(this.rotate(x)),
    ]);
	  
    this.sampleMap(transformation);
  }
  
  sampleMap (transformation) {
    const grid = (this.trialType == 'catch' ? this.sampleCatch() :
		  this.trialType == 'pragmatic' ? this.samplePragmatic(false) :
		  this.trialType == 'blocked' ? this.samplePragmatic(true) :
		  this.trialType == 'empty' ? this.sampleEmpty() :
		  this.trialType == 'random' ? this.sampleRandom() :
		  console.error('unknown trialType' + this.trialType));
    const initDict = this.matrixToDict(transformation(grid.initRevealed));
    this.initRevealed = _.filter(_.keys(initDict), key => initDict[key] === 'x');
    this.underlying = this.matrixToDict(transformation(grid.underlying));
  }

  matrixToDict (matrix) {
    return _.zipObject(this.labels, _.flatten(matrix));
  }
  
  // We pick 1 of the 3 rows to be initiated,
  // and then ensure that row has no bombs...
  sampleCatch () {
    const rowToReveal = _.sample([0,1,2]);
    let initRevealed = this.allHidden();
    let underlying = this.allBombs();
    initRevealed[rowToReveal][0] = 'x';
    initRevealed[rowToReveal][1] = 'x';    
    underlying[rowToReveal][0] = 'o';
    underlying[rowToReveal][1] = 'o';    
    underlying[rowToReveal][2] = 'o';
    return (!this.validate(initRevealed, underlying) ? this.sampleCatch() :
	    this.sampleReflection(initRevealed, underlying));
  }

  // For some spice, we randomly sample initializations and stuff
  sampleRandom () {
    let underlying = this.allBombs();
    let clearRow = _.sample([0,1,2]);
    underlying[clearRow][0] = 'o';
    underlying[clearRow][1] = 'o';    
    underlying[clearRow][2] = 'o';
    
    let initRevealed = _.map(underlying, row => {
      return _.map(row, cell => {
	return (cell == 'x' ? 'o' :
		Math.random() < .5 ? 'x' : 'o');
      });
    });

    return (!this.validate(initRevealed, underlying) ? this.sampleRandom() :
	    this.sampleReflection(initRevealed, underlying));

  }

  // We pick 1 cell to be initiated,
  // and then ensure that row has no bombs...
  samplePragmatic (blocked) {
    const rowToReveal = _.sample([0,1,2]);
    const colToReveal = _.sample([0,1,2]);
    let initRevealed = this.allHidden();
    let underlying = this.allBombs();
    initRevealed[rowToReveal][colToReveal] = 'x';
    if(blocked) {
      const colToBlock = _.sample(_.without([0,1,2], colToReveal));
      const otherCol = _.sample(_.without([0,1,2], colToReveal, colToBlock)); 
      underlying[rowToReveal][colToBlock] = 'x';
      underlying[rowToReveal][colToReveal] = 'o';    
      underlying[rowToReveal][otherCol] = 'o';
      // But ensure this row is safe...
      const otherRow = _.sample(_.without([0,1,2], rowToReveal));
      underlying[otherRow][0] = 'o';
      underlying[otherRow][1] = 'o';    
      underlying[otherRow][2] = 'o';
    } else {
      underlying[rowToReveal][0] = 'o';
      underlying[rowToReveal][1] = 'o';    
      underlying[rowToReveal][2] = 'o';
    }
    return (!this.validate(initRevealed, underlying) ? this.samplePragmatic() :
	    this.sampleReflection(initRevealed, underlying));
  }
  
  sampleEmpty () {
    let initRevealed = this.allHidden();
    let underlying = this.allBombs();
    const rowToBeOkay = _.sample([0,1,2]);
    underlying[rowToBeOkay][0] = 'o';
    underlying[rowToBeOkay][1] = 'o';    
    underlying[rowToBeOkay][2] = 'o';
    return (!this.validate(initRevealed, underlying) ? this.sampleEmpty() :
	    this.sampleReflection(initRevealed, underlying));
  }

  sampleReflection (initRevealed, underlying) {
    if(Math.random() < .5)
      return {initRevealed, underlying};
    else 
      return {initRevealed: this.reflect(initRevealed),
	      underlying: this.reflect(underlying)};
  }
  
  validate(initRevealed, underlying) {
    return !this.allRevealed(initRevealed) && this.colRowExists(underlying);
  }

  completeRow (grid, valToCheck) {
    return _.some(grid, row => _.every(row, cellName => cellName == valToCheck));
  };
  
  colRowExists(grid) {
    return this.completeRow(grid, 'o') && this.completeRow(this.rotate(grid), 'o');
  }
  
  allRevealed(grid) {
    return this.completeRow(grid, 'x') || this.completeRow(this.rotate(grid), 'x');
  }
  
  allHidden() {
    return [
      ['o' ,'o', 'o'],
      ['o', 'o', 'o'],
      ['o', 'o', 'o']
    ];
  }
  
  allBombs() {
    return [
      [this.bomb(), this.bomb(), this.bomb()],
      [this.bomb(), this.bomb(), this.bomb()],
      [this.bomb(), this.bomb(), this.bomb()]
    ];
  }
  
  bomb() {
    return Math.random() < .5 ? 'o' : 'x';
  }

  rotate (grid) {
    return _.zip(...grid);
  }

  reflect (grid) {
    return _.map(grid, row => _.reverse(row.slice()));
  }
}

module.exports = GameMap;
