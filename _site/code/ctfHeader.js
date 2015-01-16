// ctfHeader contains functions that need access to
// state, continuation, and/or address.
//
// Functions defined in ctfHeader also have access to functions
// exported from webppl header.js. TODO: verify

"use strict";

var ctfUtils = require('./ctfUtils.js');
var assert = require('assert');


// --------------------------------------------------------------------
// Misc

function getAddress(s, k, a){
  k(s, a);
}

var globalCtfCache = {};

function cacheByName(s, k, a, cacheKey, webpplThunk) {
  if (cacheKey in globalCtfCache) {
    k(s, globalCtfCache[cacheKey]);
  } else {
    var newK = function(s, r) {
      globalCtfCache[cacheKey] = r;
      k(s, r);
    };
    webpplThunk(s, newK, a);
  }
};


// --------------------------------------------------------------------
// ERP lifting

function erpSiteNameAtLevel(store, address, level){
  var baseAddress = store['baseAddress'];
  var relativeAddress = ctfUtils.relativizeAddress(baseAddress, address);
  return 'ERP_L' + level + relativeAddress;
};

function erpSiteName(store, address){
  var level = store['level'];
  return erpSiteNameAtLevel(store, address, level);
}

// Methods of LiftedERP are not allowed to modify the store
// make caching strategy a parameter
function LiftedErpMaker(erp){

  this.cache = {};

  this.makeERP = function(s, a){
    var sampler = function(){return this.sample(s, a);}.bind(this);
    var scorer = function(){console.error('score not implemented for LiftedERP');};
    return new ERP(sampler, scorer);
  };

  this.sample = function(s, a){
    return this.sampleAtLevel(s, a, s['level']);
  };

  this.sampleAtLevel = function(s, a, level){
    var upperErpSiteName = erpSiteNameAtLevel(s, a, level+1);
    var upperValue = s[upperErpSiteName];
    if (upperValue === undefined){
      if (level === 0){
        return erp.sample([]);
      } else {
        return ctfUtils.coarsenValue(this.sampleAtLevel(s, a, level-1));
      }
    } else {
      var support = ctfUtils.refineValue(upperValue);
      var probs = support.map(
        function(value){
          return Math.exp(this.priorScore(value, level));
        }.bind(this));
      var i = multinomialSample(probs);
      return support[i];
    }
  };

  this.priorScore = function(value, level){
    var cacheKey = JSON.stringify([value, level]);
    if (cacheKey in this.cache){
      return this.cache[cacheKey];
    } else {
      if (level === 0){
        var score = erp.score([], value);
      } else {
        var support = ctfUtils.refineValue(value);
        var scores = support.map(
          function(value){
            return this.priorScore(value, level-1);
          }.bind(this));
        var score = util.logsumexp(scores);
      }
      this.cache[cacheKey] = score;
      return score;
    }
  };

}

// Create lifted erp object (for caching, and to allow
// recursive calls to other levels)
function liftERP(s, k, a, erp){
  var erpMaker = new LiftedErpMaker(erp);
  var sampler = function(s_, k_, a_){
    var name = erpSiteName(s_, a_);
    var ctfERP = erpMaker.makeERP(s_, a_);
    var cont = function(store, value){
      store[name] = value;
      k_(store, value);
    };
    sample(s_, cont, a_, ctfERP);
  };
  k(s, sampler);
}


// --------------------------------------------------------------------
// Factor lifting

function factorSiteNameAtLevel(store, address, level){
  var baseAddress = store['baseAddress'];
  var relativeAddress = ctfUtils.relativizeAddress(baseAddress, address);
  return 'FACTOR_L' + level + relativeAddress;
};

function factorSiteName(store, address){
  var level = store['level'];
  return factorSiteNameAtLevel(store, address, level);
}

function liftedFactor(s, k, a, score){
  var level = s['level'];
  var thisFactorName = factorSiteName(s, a);
  var thisScore = (((level > 0) && (score === -Infinity)) ? -10 : score);
  var upperFactorName = factorSiteNameAtLevel(s, a, level + 1);
  var upperScore = (s[upperFactorName] === undefined) ? 0 : s[upperFactorName];
  var newK = function(s_){
    s_[thisFactorName] = thisScore;
    k(s_);
  };
  factor(s, newK, a, score - upperScore);
}


module.exports = {
  liftERP: liftERP,
  liftedFactor: liftedFactor,
  getAddress: getAddress,
  assert: assert, // call assert.equal, assert.ok etc.
  cacheByName: cacheByName
};