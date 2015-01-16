var reporter = require('nodeunit').reporters.default;

var isUpper = function(x0, x1){
  var size = x1 - x0 + 1;
  return x1 % (size * 2) == 0;
};

var coarsen = function(x){
  if (x instanceof Array){
    // interval
    var x0 = x[0];
    var x1 = x[1];
    var size = x1 - x0 + 1;
    if (isUpper(x0, x1)){
      return [(x0 - size), x1];
    } else {
      return [x0, x1 + size];
    }
  } else {
    // number
    if (x <= 0) {
      // score
      return x;
    } else {
      if (x % 2 == 0) {
        return [x-1, x];
      } else {
        return [x, x+1];
      }
    }
  }
};

var refine = function(x){
  if (x instanceof Array){
    // interval
    var x0 = x[0];
    var x1 = x[1];
    var size = (x1 - x0 + 1) / 2;
    if (size == 1){
      return [x0, x1];
    } else {
      return [[x0, x1-size], [x0 + size, x1]];
    }
  } else {
    if (x <=0){
      // score
      return [x];
    } else {
      console.error('tried to refine plain number!');
      return "ERROR";
    }
  }
};

var makeIsUpperTest = function(input, expectedOutput){
  return function(test){
    test.deepEqual(isUpper(input[0], input[1]), expectedOutput);
    test.done();
  };
};

var makeCoarsenTest = function(input, expectedOutput){
  return function(test){
    test.deepEqual(coarsen(input), expectedOutput);
    test.done();
  };
};

var makeRefineTest = function(input, expectedOutput){
  return function(test){
    test.deepEqual(refine(input), expectedOutput);
    test.done();
  };
};

var testIsUpper = {
  test1: makeIsUpperTest([1, 2], false),
  test2: makeIsUpperTest([3, 4], true),
  test3: makeIsUpperTest([1, 4], false),
  test4: makeIsUpperTest([5, 8], true),
  test5: makeIsUpperTest([1, 8], false),
  test6: makeIsUpperTest([9, 16], true)
};

var testNumericCoarsening = {

  testC1: makeCoarsenTest(1, [1, 2]),
  testC2: makeCoarsenTest(2, [1, 2]),
  testC3: makeCoarsenTest(3, [3, 4]),
  testC4: makeCoarsenTest(4, [3, 4]),
  testC5: makeCoarsenTest([1, 2], [1, 4]),
  testC6: makeCoarsenTest([3, 4], [1, 4]),
  testC7: makeCoarsenTest([5, 6], [5, 8]),
  testC8: makeCoarsenTest([1, 4], [1, 8]),
  testC9: makeCoarsenTest([5, 8], [1, 8]),
  testC13: makeCoarsenTest([9, 16], [1, 16]),
  testC14: makeCoarsenTest([1, 16], [1, 32]),
  testC15: makeCoarsenTest([17, 32], [1, 32]),

  testC10: makeCoarsenTest(-1, -1),
  testC11: makeCoarsenTest(-2, -2),
  testC12: makeCoarsenTest(-Infinity, -Infinity),

  testR1: makeRefineTest([1, 2], [1, 2]),
  testR2: makeRefineTest([3, 4], [3, 4]),
  testR3: makeRefineTest([1, 4], [[1, 2], [3, 4]]),
  testR4: makeRefineTest([5, 8], [[5, 6], [7, 8]]),
  testR5: makeRefineTest([1, 8], [[1, 4], [5, 8]]),
  testR9: makeRefineTest([1, 32], [[1, 16], [17, 32]]),

  testR6: makeRefineTest(-1, [-1]),
  testR7: makeRefineTest(-2, [-2]),
  testR8: makeRefineTest(-Infinity, [-Infinity])

};

reporter.run(
  {
    testIsUpper: testIsUpper,
    testNumericCoarsening: testNumericCoarsening
  });