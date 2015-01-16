'use strict';

var _ = require('underscore');
var ctfHeader = require('../code/ctfHeader.js');

var webpplHeader = require("../assets/webppl/src/header.js");

// Make fns in webpplHeader globally available (as assumed in
// ctfHeader)
for (var prop in webpplHeader){
  if (webpplHeader.hasOwnProperty(prop)){
    global[prop] = webpplHeader[prop];
  }
}


function makePositiveIntegerERP(n){
  var sampler = function(){
    return randomIntegerERP.sample([n]) + 1;
  };
  var scorer = function(params, value){
    return randomIntegerERP.score([n], value - 1);
  };
  return new ERP(sampler, scorer);
}

function testInRange(test, x, min, max){
  test.notStrictEqual(x, undefined);
  test.ok(x >= min);
  test.ok(x < max);
}

function testMeanIsApproximately(test, xs, targetMean, epsilon){
  var empiricalMean = util.sum(xs) / xs.length;
  testInRange(test, empiricalMean, targetMean-epsilon, targetMean+epsilon);
}

module.exports = {

  testLiftERP: {

    setUp: function(callback){
      this.erp = makePositiveIntegerERP(10);
      var cont = function(s, v){
        this.liftedSampler = v;
        callback();
      }.bind(this);
      ctfHeader.liftERP({}, cont, '_1', this.erp);
    },

    testBaseLevel: function(test){
      var store;
      var address = '_3';
      var numSamples = 1000;
      var returnValues = [];
      var cont = function(s, v){
        test.equal(_.keys(s).length, 3);
        test.equal(s['baseAddress'], '_2');
        test.equal(s['level'], 0);
        testInRange(test, s['ERP_L0_1'], 1, 11);
        test.equal(s['ERP_L0_1'], v);
        returnValues.push(v);
      };
      for (var i=0; i<numSamples; i++){
        store = {
          baseAddress: '_2',
          level: 0
        };
        this.liftedSampler(store, cont, address);
      }
      testMeanIsApproximately(test, returnValues, 5.5, .5);
      test.done();
    },

    testMultiStage: function(test){
      var store;
      var address = '_3';
      var numSamples = 1000;
      var returnValues = [];
      var cont = function(s, v){
        if (s['level'] > 0){
          test.equal(s['level'] + _.keys(s).length, 6);
          s['level'] = s['level'] - 1;
          this.liftedSampler(s, cont, address);
        } else {
          test.equal(_.keys(s).length, 6);
          test.equal(s['baseAddress'], '_2');
          test.equal(s['level'], 0);
          testInRange(test, s['ERP_L0_1'], 1, 11);
          test.equal(s['ERP_L0_1'], v);
          returnValues.push(v);
        }
      }.bind(this);
      for (var i=0; i<numSamples; i++){
        store = {
          baseAddress: '_2',
          level: 3
        };
        this.liftedSampler(store, cont, address);
      }
      testMeanIsApproximately(test, returnValues, 5.5, .5);
      test.done();
    }

  }

};