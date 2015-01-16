// ctfUtils contains functions that do NOT need access
// to state, continuation, and/or address.

"use strict";

var assert = require('assert');


// --------------------------------------------------------------------
// Misc utils

function arraysEqual(a1, a2){
  return JSON.stringify(a1) === JSON.stringify(a2);
}

function cached(f, thisArg) {
  var c = {};
  var cf = function() {
    var stringedArgs = JSON.stringify(arguments);
    if (stringedArgs in c) {
      return c[stringedArgs];
    } else {
      var value = f.apply(thisArg, arguments);
      c[stringedArgs] = value;
      return value;
    }
  };
  return cf;
}

function sampleDiscrete(xs, ps){

}


// --------------------------------------------------------------------
// Address manipulation

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
};

function parseAddress(address){
  // address starts with '_', so slice of first element
  var addressArray = address.split("_").slice(1);
  for (var i=0; i<addressArray.length; i++){
    addressArray[i] = parseInt(addressArray[i]);
  }
  return addressArray;
}

function relativizeAddress(base, address){
  var parsedBase = parseAddress(base);
  var parsedAddress = parseAddress(address);
  var tmp = removeCommonPrefix(parsedBase, parsedAddress);
  var shortBase = tmp[0];
  var shortAddress = tmp[1];
  assert.equal(shortBase.length, 1);
  var initAddressCounter = shortBase[0];
  var relativizedArray = shortAddress.map(
    function(i){return i-initAddressCounter;}
  );
  var relativizedAddress = '_' + relativizedArray.join('_');
  return relativizedAddress;
}


// --------------------------------------------------------------------
// Value coarsening and refinement

function isUpper(x0, x1){
  var size = x1 - x0 + 1;
  return x1 % (size * 2) == 0;
};

function coarsenValue(x){
  // console.log('coarsen:', x);
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

function refineValue(x){
  // console.log('refine:', x);
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


module.exports = {
  parseAddress: parseAddress,
  removeCommonPrefix: removeCommonPrefix,
  relativizeAddress: relativizeAddress,
  coarsenValue: coarsenValue,
  refineValue: refineValue,
  arraysEqual: arraysEqual,
  cached: cached
};
