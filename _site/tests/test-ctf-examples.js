"use strict";

var fs = require('fs');
var path = require('path');
var webppl = require('../assets/webppl/src/main.js');
var util = require('../assets/webppl/src/util.js');
var ctfHeader = require('../code/ctfHeader.js');
var ctfUtils = require('../code/ctfUtils.js');

var topK;
var _trampoline;

function runDistributionTest(test, code, expectedHist, tolerance){
  var hist = {};
  topK = function(s,erp){
    _trampoline = null;
    erp.support().forEach(
      function (value){
        hist[value] = Math.exp(erp.score([], value));
      });
    var normHist = util.normalizeHist(hist);
    test.ok(util.histsApproximatelyEqual(normHist, expectedHist, tolerance));
    test.done();
  };
  webppl.run(code, topK);
};

// Make ctfUtils globally available
global.ctfUtils = ctfUtils;

// Make fns in ctfHeader globally available
for (var prop in ctfHeader){
  if (ctfHeader.hasOwnProperty(prop)){
    global[prop] = ctfHeader[prop];
  }
}

function readTestData(dir){
  var files = (fs.readdirSync(dir)
               .filter(function(file){return /\.wppl$/.test(file);}));
  var testNames = files.map(function(file){return file.split('.wppl')[0];});
  var preamble = fs.readFileSync(path.join(__dirname, '../code/ctfPreamble.wppl'), 'utf8');
  
  var testData = {};
  testNames.forEach(
    function(testName){
      var prefix = path.join(dir, testName);
      var code = fs.readFileSync(prefix + '.wppl', 'utf8');
      var json = JSON.parse(fs.readFileSync(prefix + '.json'));
      testData[testName] = {
        code: preamble + ';' + code,
        targetDist: json.dist,
        tolerance: json.tolerance
      };
    });

  return testData;
}


function buildTests(testData){
  var tests = {};
  _.forEach(
    testData,
    function(testDatum, testName){
      tests[testName] = function(test){
        runDistributionTest(test, testDatum.code, testDatum.targetDist, testDatum.tolerance);
      };
    });
  return tests;
}

var testData = readTestData(path.join(__dirname, '../code/examples/'));

exports.testCtfExamples = buildTests(testData);
