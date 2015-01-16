'use strict';

var ctfUtils = require('../code/ctfUtils.js');

function testFunction(test, testCase, fn){
  testCase.forEach(
    function(testCase){
      if (testCase.inputs !== undefined){
        var actualOutput = fn.apply(fn, testCase.inputs);
      } else {
        var actualOutput = fn(testCase.input);
      }
      test.equal(
        JSON.stringify(actualOutput),
        JSON.stringify(testCase.output)
      );
    }
  );
}


module.exports = {

  testMiscUtils: {
    testArraysEqual: function(test){
      var testCases = [
        { inputs: [[], []],
          output: true },
        { inputs: [[1], [1]],
          output: true },
        { inputs: [[1, "foo"], [1, "foo"]],
          output: true },
        { inputs: [[], [1]],
          output: false },
        { inputs: [[1], [2]],
          output: false },
        { inputs: [[1, "bar"], [1, "foo"]],
          output: false }
      ];
      testFunction(test, testCases, ctfUtils.arraysEqual);
      test.done();
    },
    testCached: function(test){
      var x = 5;
      var cf = ctfUtils.cached(function(j){x += j; return x;});
      var v = cf(1);
      test.equal(v, 6);
      test.equal(x, 6);
      v = cf(1);
      test.equal(v, 6);
      test.equal(x, 6);
      v = cf(2);
      test.equal(v, 8);
      test.equal(x, 8);
      v = cf(2);
      test.equal(v, 8);
      test.equal(x, 8);
      v = cf(1);
      test.equal(v, 6);
      test.equal(x, 8);
      test.done();
    }
  },

  testCoarsenValue : {
    testNumbers: function(test){
      var testCases = [
        { input: 1,
          output: [1, 2] },
        { input: 2,
          output: [1, 2] },
        { input: 3,
          output: [3, 4] }
      ];
      testFunction(test, testCases, ctfUtils.coarsenValue);
      test.done();
    },
    testArrays: function(test){
      var testCases = [
        { input: [1, 2],
          output: [1, 4] },
        { input: [3, 4],
          output: [1, 4] },
        { input: [5, 8],
          output: [1, 8] },
        { input: [9, 12],
          output: [9, 16] }
      ];
      testFunction(test, testCases, ctfUtils.coarsenValue);
      test.done();
    }

  },

  testRefineValue : {
    testNumbers: function(test){
      var testCases = [
        { input: [1, 2],
          output: [1, 2] },
        { input: [3, 4],
          output: [3, 4] }
      ];
      testFunction(test, testCases, ctfUtils.refineValue);
      test.done();
    },
    testArrays: function(test){
      var testCases = [
        { input: [1, 4],
          output: [[1, 2], [3, 4]] },
        { input: [1, 8],
          output: [[1, 4], [5, 8]] },
        { input: [9, 16],
          output: [[9, 12], [13, 16]] }
      ];
      testFunction(test, testCases, ctfUtils.refineValue);
      test.done();
    }
  },

  testAddressing: {

    testRemoveCommonPrefix: function(test){
      var testCases = [
        { inputs: [[1, 2, 3], [1, 2, 3]],
          output: [[], []] },
        { inputs: [[1, 2, 3], [4, 5, 6]],
          output: [[1, 2, 3], [4, 5, 6]] },
        { inputs: [[1, 2, 3, 4], [1, 2, 5, 6]],
          output: [[3, 4], [5, 6]] }
      ];
      testFunction(test, testCases, ctfUtils.removeCommonPrefix);
      test.done();
    },

    testParseAddress: function(test){
      var testCases = [
        { input: '_1',
          output: [1] },
        { input: '_1_2',
          output: [1, 2] },
        { input: '_1_2_10_12',
          output: [1, 2, 10, 12] }
      ];
      testFunction(test, testCases, ctfUtils.parseAddress);
      test.done();
    },

    testRelativizeAddress: function(test){
      var testCases = [
        { inputs: ['_16_11_9_4', '_16_11_9_7_6_5'],
          output: '_3_2_1' },
        { inputs: ['_16_11_10_9_4', '_16_11_10_9_7_6_5'],
          output: '_3_2_1' },
        { inputs: ['_16_11_10_10_8_4', '_16_11_10_10_8_7_6_5'],
          output: '_3_2_1' },
        { inputs: ['_17_12', '_17_15_14_13'],
          output: '_3_2_1' }
      ];
      testFunction(test, testCases, ctfUtils.relativizeAddress);
      test.done();
    }

  }


};
