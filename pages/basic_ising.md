We begin by implementing the square-lattice Ising model in WebPPL. In this model, each cell (i,j) in a lattice can have a positive spin (S_ij = +1) or a negative spin (S_ij = -1). A cell's preferred state depends on its four nearest neighbors, making certain configurations preferred over others. For simplicity, we assume (1) that there is no 'external field' influencing individual spins, and (2) that each cell is coupled with its neighbors in the same way. 

The basic problem is to find the 'lowest energy state,' i.e. the configuration minimizing the energy function $H(\sigma) = J\sum_{<i,j>} S_iS_j$. This is a hard problem in general since (1) the space of configurations grows exponentially with the size of the lattice and (2) many configurations are 'close' to the best,   Later, we will show that a coarse-to-fine transformation may help us find 'good' solutions more quickly.

~~~~
///fold:

var uniformDist = function(xs) {
  Enumerate(function(){ return xs[randomInteger(xs.length)] })
}

///

// binary valued image
var stateVals = [-1,1]
var stateDist = uniformDist(stateVals)

var lattice = function(n) {
  return repeat(n, function(){return repeat(n, function(){ return sample(stateDist) })})
}

var J_rand = function(n) {
  return repeat(n, function(){
    return repeat(n, function(){ 
      return sample(uniformDist([-1,0,1])) })})
}

var J_id = function(n, val) {
  return repeat(n, function(){
    return repeat(n, function(){ 
      return val})})
}

var find_neighbor_vals = function(l, i, j) {
  var row_indices = map(function(v){return (v + l.length) % l.length}, 
                        [i-1, i, i+1, i])
  var col_indices = map(function(v){return (v + l[i].length) % l[i].length}, 
                        [j, j+1, j, j-1])
  return map2(function(i,j) {return l[i][j]}, row_indices, col_indices)
}

var myPrint = function(l) {
  map(function(i) {
    var row = map(function(j) {
      return (l[i][j]>0 ? "x " : "o ")
    }, _.range(l[0].length))
    print(sum(row).split(0,l.length - 1)[0])
  }, _.range(l.length))
}

var energy = function(l, J) {
  // For every row...
  var interactionTerm = map(function(i) {
    
    return withEmptyStack(
      function(){
        // For every cell in that column...
        var internal_sums = map(function(j) {
          // compute \sum_{<i,j>} J_ij*S_i*S_j over neighbors
          var l_neighbor_vals = find_neighbor_vals(l, i, j) 
          var J_neighbor_vals = find_neighbor_vals(J, i, j)
          return sum(map2(function(S_j, J_ij) {
            var S_i = l[i][j]
            return J_ij * S_i * S_j;
          }, l_neighbor_vals, J_neighbor_vals))    
        }, _.range(l[0].length))
        return sum(internal_sums)
      });
  
  }, _.range(l.length))
  return sum(interactionTerm) / 2
}

var model = function() {
  var n = 16
  print(n)
  var T = 3 // T ~ 1 stable config; T ~ 3.3 edge of chaos; T ~ 100 white noise; T < 0 antiferro
  var aLattice = lattice(n)
  myPrint(aLattice)
  print(" ")
  var J = J_id(n,1/T)
  factor(energy(aLattice, J))
  return aLattice
}

print(MH(model, 1000))

