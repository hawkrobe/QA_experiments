var printDist = function(erp){
  erp.support([]).forEach(
    function(v){
      console.log(v, Math.exp(erp.score([], v)));
    });
};


var invertMap = function (obj) {

  var newObj = {};

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      var value = obj[prop];
      if (newObj.hasOwnProperty(value)) {
        newObj[value].push(prop);
      } else {
        newObj[value] = [prop];
      }
    }
  }

  return newObj;
};

module.exports = {
  invertMap: invertMap,
  printDist: printDist
};
