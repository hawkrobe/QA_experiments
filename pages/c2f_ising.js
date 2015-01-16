  
/// HELPERS

// Use for command-line printing
var erp_print = function(erp) {
  map(function(v) {console.log(JSON.stringify(v, null, 4) + " : " + Math.exp(erp.score([], v)).toFixed(2))},
   erp.support())
}

// Construct discrete-valued erp assigning probs p to values v
var makeERP = function(ps, vs){
  return ParticleFilter(function(){return vs[discrete(ps)]}, 1000);
}

// Returns mean of erp
var ERPmean = function(thunk){
  return expectation(Enumerate(thunk), function(v){return v;});
};

// Returns mean of list
var mean = function(a) {
  return sum(a)/a.length;
}

// Constructs uniform distribution over values x
var uniformDist = function(xs) {
  Enumerate(function(){ return xs[randomInteger(xs.length)] })
}
///

/// LATTICE METHODS

var stateVals = [-1,1]
var stateDist = uniformDist(stateVals)

// Samples a raw n x n lattice
var lattice = function(n) {
  return repeat(n, function(){return repeat(n, function(){ return sample(stateDist) })})
}

// Samples an n x n lattice in a form we like -- allows us to coarsen nicely
var parsedLattice = function(n) {
  var l = lattice(n)
  var parsedL = _.flatten(map(function(i){
    map(function(j){
      return {loc: [i,j], val: l[i][j], size: 1}
    }, _.range(n))
  }, _.range(n)))
  return parsedL
}

// Returns total size of lattice (accounting for coarsened cells)
var getLatticeSize = function(parsedL) {
  return reduce(function(v,rest){
   return rest + v.size 
 }, 0, parsedL)
}

// Returns true if the given cell location matches the targetLocation
// If super-cell, check whether targetLoc is included in boundary
var locMatch = function(cell, targetLoc) {
  return (cell.size > 1 ?  
          (_.contains(_.range(cell.loc[0], cell.loc[0] + Math.sqrt(cell.size)), targetLoc[0])
          & _.contains(_.range(cell.loc[1], cell.loc[1] + Math.sqrt(cell.size)), targetLoc[1])) :
          (cell.loc[0] == targetLoc[0] & cell.loc[1] == targetLoc[1]))
}

// Returns the cell at the target location
var getCell = function (parsedL, targetLoc){
  return (parsedL.length == 0 ? undefined : 
          locMatch(parsedL[0], targetLoc) ? parsedL[0] : 
          getCell(parsedL.slice(1), targetLoc))
};

// TODO: Generalize to find sublattice of size 4 if all of size 1 are missing
// Just look for smallest size... 
var getFineCell = function(parsedL) {
  // Checks to see if a cell has size 1
  return (parsedL[0].size == 1 ? parsedL[0] :
          getFineCell(parsedL.slice(1)))
}

// TODO: Generalize to find largest cell if there's one bigger than 4
var getCoarseCell = function(parsedL) {
  return (parsedL[0].size == 4 ? parsedL[0] :
          getCoarseCell(parsedL.slice(1)))
}

// Returns the first (non-coarsened) sublattice, in order to coarsen sequentially
var getFreeSublattice = function(parsedL) {
  var firstCell = getFineCell(parsedL)
  var loc = firstCell.loc
  var locX = loc[0]
  var locY = loc[1]
  return map(function(t_loc){
    var c = getCell(parsedL, t_loc)
    return c
  }, [[locX, locY],[locX+1,locY],[locX, locY+1], [locX+1,locY+1]])
}

// returns true if parsedL contains cell
var containsCell = function(parsedL, cell) {
  return reduce(function(v, rest) {
    return rest | locMatch(v, cell.loc)
  }, false, parsedL)
}

// the remove function, customized for lattice objects
var removeCell = function(cell, parsedL) {
  return filter(function(e) { return !locMatch(e, cell.loc);}, parsedL);
};

// Gets rid of redundant cells, i.e. cells with same location
var uniqueCells = function(parsedL){
  return _.flatten(reduce(function(v, rest) {
    return cons(!containsCell(_.flatten(rest), v) ? v : [],  rest)
  }, [], parsedL))
}

/// STANDARD COARSE-TO-FINE FUNCTIONS

// Sequentially coarsens lattice 
var coarsenValues = function(parsedL) {
  var firstFree = getFreeSublattice(parsedL); // Find a small sublattice to replace
  var coarsenedLoc = firstFree[0].loc // Store upper-left corner
  var coarsenedVal = mean(map(function(c) {return c.val}, firstFree)) // compute mean val
  // Build new parsed lattice with the sublattice replaced by a bigger cell 
  var newL = uniqueCells(map(function(c){
    return (_.isEqual(getCell(firstFree, c.loc), c) ? 
            {loc: coarsenedLoc, val: coarsenedVal, size: firstFree.length} : 
            c)
  }, parsedL))
  return newL
}

// Returns an ERP over all 2x2 lattices that coarsen to the same mean
var refineValues = function(parsedL) {
  var firstFree = getCoarseCell(parsedL)
  var mean_val = firstFree.val
  return Enumerate(function(){
    var sub_l = lattice(2)
    factor(mean(_.flatten(sub_l)) === mean_val ? 0 : -Infinity)
    var newL = _.flatten(map(function(c){
      return (locMatch(firstFree.loc, c.loc) ?
              // if you find the coarse one, replace it with a list of components
              map(function(i){ 
                map(function(j){
                  return {loc: [firstFree.loc[0]+i,firstFree.loc[1]+j], 
                          val: sub_l[i][j],
                          size: Math.pow(Math.sqrt(firstFree.size) - 1, 2)}
                }, _.range(Math.sqrt(firstFree.size)))
              }, _.range(Math.sqrt(firstFree.size))) : c)
    }, parsedL))
    return newL
  })
};

// Returns the neighbors of a cell -- handles partially coarsened lattices
var findNeighborVals = function(parsedL, targetLoc) {
  var c = getCell(parsedL, targetLoc)
  // If there's a coarsened cell, want to search all interior locations
  var locsToSearch = _.flatten(map(function(i){ 
    map(function(j){
      return {x: c.loc[0]+i, y: c.loc[1]+j}
    }, _.range(Math.sqrt(c.size)))
  }, _.range(Math.sqrt(c.size))))
  var neighborCells = map(function(loc){
    var i = loc.x
    var j = loc.y
    var n = Math.sqrt(getLatticeSize(parsedL))
    var rowIndices = map(function(v){return (v + n) % n}, [i-1, i, i+1, i])
    var colIndices = map(function(v){return (v + n) % n}, [j, j+1, j, j-1])
    return map2(function(i,j) {return getCell(parsedL, [i,j])}, rowIndices, colIndices)
  }, locsToSearch)
  // Clean up big list of neighbors and return set of unique ones
  var targetCells = removeCell(c, uniqueCells(_.flatten(neighborCells)))
  return map(function(c){return c.val},targetCells)
}

var coarsenERP = function(erp, coarsenValue){
  // Get concrete values and probabilities
  var allVs = erp.support([]);
  var allPs = map(function(v){return Math.exp(erp.score([], v));}, allVs);

  // Group distribution based on equivalence classes
  // implied by coarsenValue function
  var groups = groupBy(
    function(vp1, vp2){
      return coarsenValue(vp1[0]) == coarsenValue(vp2[0]);
    },
    zip(allVs, allPs));
  
  var groupSymbols = map(
    function(group){
      // group[0][0]: first value in group
      return coarsenValue(group[0][0])},
    groups)

  var groupedVs = map(
    function(group){
      return map(first, group);
    },
    groups);

  var groupedPs = map(
    function(group){
      return map(second, group);
    },
    groups);

  // Construct unconditional (abstract) sampler and
  // conditional (concrete) sampler
  var abstractPs = map(sum, groupedPs);
  var abstractSampler = makeERP(abstractPs, groupSymbols);
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(abstractSymbol){
    var i = indexOf(abstractSymbol, groupSymbols);
    return groupERPs[i];
  }
  return [abstractSampler, getConcreteSampler];
}

// ISING-SPECIFIC FUNCTIONS

// Creates an interaction matrix in the same format as lattice
var parsedJ_id = function(n, val) {
  var J = repeat(n, function(){
    return repeat(n, function(){ 
      return val})})
  var parsedJ = _.flatten(map(function(i){
    map(function(j){
      return {loc: [i,j], val: J[i][j], size: 1}
    }, _.range(n))
  }, _.range(n)))
  return parsedJ
}

// Deterministically coarsen interaction matrix to match lattice coarsening
var coarsenJ = function(parsedJ, iterations) {
  return iterations == 0 ? parsedJ : coarsenJ(coarsenValues(parsedJ), iterations-1);
}

// Computes Hamiltonian for lattice L and interaction matrix J
var energy = function(parsedL, parsedJ) {
  // For every cell
  var interactionTerm = map(function(c){
    // compute \sum_{<i,j>} J_ij*S_i*S_j over neighbors
    var l_neighbor_vals = findNeighborVals(parsedL, c.loc)
    var J_neighbor_vals = findNeighborVals(parsedJ, c.loc)
    return sum(map2(function(S_j, J_ij) {
      var S_i = c.val
      return J_ij * S_i * S_j;
    }, l_neighbor_vals, J_neighbor_vals))    
    return sum(internal_sums)
  }, parsedL)
  return sum(interactionTerm) / 2
}

// Generates a subsample of parsed lattices that can be used in the model
var parsedL_ERP = function(n, n_samples) {
  ParticleFilter(function(){
    return parsedLattice(n)
  },n_samples)
}

// Create coarsened vals independently of model
var erp0 = parsedL_ERP(4,100)
console.log("finished making parsedL ERP")
var tmp = coarsenERP(erp0, coarsenValues);
console.log("finsihed coarsening")
var c_erp0 = tmp[0]
var get_f_erp0 = tmp[1]

// Model just uses this coarsening, with some factor statements
var model = function(){
  console.log("starting model")
  var n = 4
  var J0 = parsedJ_id(4,1)
  var lConfigCoarse = sample(c_erp0)
  factor(energy(lConfigCoarse, coarsenJ(J0,1)))
  var lConfigFine = sample(get_f_erp0(lConfigCoarse))
  return lConfigFine
}

// TODO: lifted energy function

erp_print(ParticleFilter(model, 100))
