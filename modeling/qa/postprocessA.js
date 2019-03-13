var fs = require('fs');
var babyparse = require('babyparse');
var _ = require('lodash');

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8'), {
    header: true,
    keepEmptyRows:false,
    skipEmptyLines: true
  }).data;
};

function writeCSV(csv, filename){
  fs.writeFileSync(filename, babyparse.unparse(csv) + '\n');
}

// Tests for scenario where some questions reveal goal and others are ambiguous
function diffRowsCols(state) {
  if (state['safe'].length != 2 || state['unsafe'].length != 0) {
    return false;
  } else {
    var safe1 = state['safe'][0];
    var safe2 = state['safe'][1];
    return safe1[0] != safe2[0] && safe1[1] != safe2[1];
  }
}

// Tests for scenario where you have 2 in same row/col and are trying to get 3rd
function sameRowsCols(state) {
  if (state['safe'].length != 2 || state['unsafe'].length != 0) {
    return false;
  } else {
    var safe1 = state['safe'][0];
    var safe2 = state['safe'][1];
    return safe1[0] == safe2[0] || safe1[1] == safe2[1];
  }
}

function mapQuestionDiff(goal, question, state) {
  var safe = state['safe'];
  var getRelevantPart = goal == 'rows' ? v => v[0] : v => v[1];
  var getOtherPart = goal == 'rows' ? v => v[1] : v => v[0];
  var relevantPartOfQuestion = getRelevantPart(question);
  var otherPartOfQuestion = getOtherPart(question);  
  var relevantPartOfState = _.map(safe, getRelevantPart);
  var otherPartOfState = _.map(safe, getOtherPart);
  if(_.includes(relevantPartOfState, relevantPartOfQuestion) &&
     _.includes(otherPartOfState, otherPartOfQuestion)) {
    return 'confusing';
  } else if(_.includes(relevantPartOfState, relevantPartOfQuestion) &&
	    !_.includes(otherPartOfState, otherPartOfQuestion)) {
    return 'pragmatic';
  } else {
    return 'other';
  }
}
function mapQuestionSame(goal, question, state) {
  var safe = state['safe'];
  var getRelevantPart = goal == 'rows' ? v => v[0] : v => v[1];
  var getOtherPart = goal == 'rows' ? v => v[1] : v => v[0];
  var relevantPartOfQuestion = getRelevantPart(question);
  var otherPartOfQuestion = getOtherPart(question);  
  var relevantPartOfState = _.uniq(_.map(safe, getRelevantPart));
  var otherPartOfState = _.uniq(_.map(safe, getOtherPart));
  var info = relevantPartOfState.length == 1 ? {withinGoal: true} : {withinGoal: false}
  console.log(relevantPartOfState)
  console.log(relevantPartOfQuestion);
  if(info.withinGoal && relevantPartOfState[0] == relevantPartOfQuestion) {
    return _.extend({question: 'easy'}, info);
  } else if(_.includes(relevantPartOfState, relevantPartOfQuestion)) {
    return _.extend({question: 'hard'}, info);
  } else {
    return _.extend({question: 'other'}, info);
  }
}

function getValueOfPart(cell, world, getRelevantPart) {
  var part = getRelevantPart(cell);
  var othersWithPart = _.filter(_.keys(world), s => getRelevantPart(s) == part);
  return _.map(othersWithPart, s => world[s]);
}

var answererData = readCSV('../../data/experiment3/answerFromMongo_clean.csv');
//var questionerData = readCSV('../../data/experiment3/questionFromMongo_clean.csv');

var handleBlocked = function(response) {
  var state = JSON.parse(response['gridState']);
  var world = JSON.parse(response['underlyingWorld']);  
  var origA = JSON.parse(response['answer']);
  var rowGoal = response['trueGoal'] == 'rows';
  var getRelevantPart = rowGoal ? v => v[0] : v => v[1];
  var getOtherPart = rowGoal ? v => v[1] : v => v[0];

  // Two cases: they asked about unsafe cell or asked about safe cell
  var askedAboutStatus = world[response['cellAskedAbout']];
  
  // If they just gave literal answer, escape now
  if(origA.length == 1) {
    return _.extend({}, response, {askedAboutStatus, trialType: 'blocked', answerType: 'literal'});
  }
  
  // You can additionally tell them about
  // (1) safe cell in same row, (2) unsafe cell in same row,
  // (3) safe cell in different unsafe row, (4) unsafe cell in different unsafe row
  // (5) safe cell in an all-safe row, or (6) nothing
  var otherCell = _.without(origA, response['cellAskedAbout'])[0];
  var otherCellStatus = world[otherCell];

  var rowStatus = _.includes(getValueOfPart(otherCell, world, getRelevantPart), 'unsafe') ? 'Unsafe' : 'Safe';

  console.log(getRelevantPart(otherCell));
  console.log(getRelevantPart(response['cellAskedAbout']));
  var answerType = getRelevantPart(otherCell) == getRelevantPart(response['cellAskedAbout']) ? 'sameRow' : 'different' + rowStatus + 'Row';

  return _.extend({}, response, {
    askedAboutStatus, trialType: 'blocked',
    answerType: otherCellStatus + ' cell in ' + answerType
  });
}

var annotatedAnswererData = _.map(answererData, function(response) {
  var state = JSON.parse(response['gridState']);
  var world = JSON.parse(response['underlyingWorld']);  
  var origA = JSON.parse(response['answer']);
  var rowGoal = response['trueGoal'] == 'rows';
  var getRelevantPart = rowGoal ? v => v[0] : v => v[1];
  var getOtherPart = rowGoal ? v => v[1] : v => v[0];

  // first order of business: fix the mislabeled 'blocked' trials
  if(state['safe'].length == 1 && response['questionNumber'] == 1) {
    var vals = getValueOfPart(state['safe'][0], world, getRelevantPart);
    if(_.includes(vals, 'unsafe')) {
      return handleBlocked(response);
    } else {
      return _.extend({}, response, {
	askedAboutStatus: 'none', answerType: 'none', trialType: 'pragmatic'
      });
    }
  } else {
    return _.extend({}, response, {
	askedAboutStatus: 'none', answerType: 'none'
      })
  }
});

writeCSV(annotatedAnswererData, './answerFromMongo_fixed.csv');
