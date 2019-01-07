var _ = require('lodash');
var utils  = require(__base + 'src/sharedUtils.js');
var assert = require('assert');
var config = require('./config.json');

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

class Experiment {
  constructor() {
    this.trialList = [];
    this.numRounds = config.numRounds;
    this.objects = require('./images/objects.json');
    this.firstRole = _.sample(['seeker', 'helper']);
  }

  sampleGoalSet (goalType, hiddenCards) {
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
  }

  sampleStimulusLocs (numObjects) {
    var locs = getAllLocs();
    return _.sampleSize(locs, numObjects);
  }

  // 3 trials of each row, counterbalanced
  sampleGoalSequence () {
    var types = ['overlap', 'catch', 'baseline'];
    var batch1 = _.map(_.shuffle(types), type => {
      return {goalType: type,
	      numCards: _.sample(_.range(5, 9)),
	      role: this.firstRole};
    });
    var batch2 = _.map(_.shuffle(types), type => {
      return {goalType: type,
	      numCards: _.sample(_.range(5, 9)),
	      role: this.firstRole == 'seeker' ? 'helper' : 'seeker'};
    });
  
    return _.concat(batch1, batch2);
  }

  sampleTrial (trialInfo) {
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
  }
    
  // Take condition as argument
  // construct context list w/ statistics of condition
  makeTrialList () {
    var trialSequence = this.sampleGoalSequence();

    // Construct trial list (in sets of complete rounds)
    for (var i = 0; i < this.numRounds; i++) {
      var world = this.sampleTrial(trialSequence[i]); 
      this.trialList.push(world);
    };
    return this.trialList;
  };
}

module.exports = new Experiment();
