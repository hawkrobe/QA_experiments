var dalmatian = {
  url: 'stimuli/dalmatian.jpg', name: 'dalmatian', width: 200, height: 200};

var poodle = {
  url: 'stimuli/poodle.jpg', name: 'poodle', width: 200, height: 200};

var siamese = {
  url: 'stimuli/siamese.jpg', name: 'siamese cat', width: 200, height: 200};

var whale1 = {
  url: 'stimuli/whale1.jpg', name: 'whale', width: 200, height: 200};

var retriever = {
  url: 'stimuli/retriever.jpg', name: 'golden retriever', width: 200, height: 200};

var lion = {
  url: 'stimuli/lion.jpg', name: 'lion', width: 200, height: 200};

var housecat = {
  url: 'stimuli/housecat.jpg', name: 'house cat', width: 200, height: 200};

var whale2 = {
  url: 'stimuli/whale2.jpg', name: 'whale', width: 200, height: 200};

var betta = {
  url: 'stimuli/betta.jpg', name: 'betta fish', width: 200, height: 200};

var goldfish = {
  url: 'stimuli/goldfish.jpg', name: 'goldfish', width: 200, height: 200};

var angler = {
  url: 'stimuli/angler.jpg', name: 'angler fish', width: 200, height: 200};

var cottage = {
  url: 'stimuli/cottage.jpg', name: 'cottage', width: 200, height: 200};

var mansion = {
  url: 'stimuli/mansion.jpg', name: 'mansion', width: 200, height: 200};

var office = {
  url: 'stimuli/office.jpg', name: 'office', width: 200, height: 200};

var park1 = {
  url: 'stimuli/park1.jpg', name: 'park', width: 200, height: 200};

var diner = {
  url: 'stimuli/diner.jpg', name: 'diner', width: 200, height: 200};

var hotelLobby = {
  url: 'stimuli/fancyBar.jpeg', name: 'hotel lobby', width: 200, height: 200};

var diveBar = {
  url: 'stimuli/dive.jpg', name: 'dive bar', width: 200, height: 200};

var park2 = {
  url: 'stimuli/park2.jpg', name: 'park', width: 200, height: 200};	

var iceHotelRoom = {
  url: 'stimuli/iceHotelRoom.jpg', name: 'ice hotel room', width: 200, height: 200};

var snowyForest = {
  url: 'stimuli/snowyForest.jpg', name: 'snowy forest', width: 200, height: 200};

var snowyMountain = {
  url: 'stimuli/snowyMountain.jpg', name: 'snowy mountain', width: 200, height: 200};

var sunnyBeach = {
  url: 'stimuli/sunnyBeach.jpg', name: 'sunny beach', width: 200, height: 200};

var evergreen = {
  url: 'stimuli/evergreen.png', name: 'evergreen', width: 200, height: 200};

var palm = {
  url: 'stimuli/palm.png', name: 'palm', width: 200, height: 200};

var daisy = {
  url: 'stimuli/daisy.png', name: 'daisy', width: 200, height: 200};

var rose = {
  url: 'stimuli/rose.png', name: 'rose', width: 200, height: 200};

var oakLeaves = {
  url: 'stimuli/oakLeaves.jpg', name: 'oak', width: 200, height: 200};

var lettuce = {
  url: 'stimuli/lettuce.jpg', name: 'lettuce', width: 200, height: 200};

var carrots = {
  url: 'stimuli/carrots.jpg', name: 'carrots', width: 200, height: 200};

var flower = {
  url: 'stimuli/flower.jpg', name: 'flower', width: 200, height: 200};

var sunflower = {
  url: 'stimuli/sunflower.jpg', name: 'sunflower', width: 200, height: 200};

var burger = {
  url: 'stimuli/burger.jpg', name: 'burger', width: 200, height: 200};

var tomato = {
  url: 'stimuli/tomato.jpg', name: 'tomatos', width: 200, height: 200};

var carrot2 = {
  url: 'stimuli/carrot2.jpg', name: 'carrot', width: 200, height: 200};

var deadFlower = {
  url: 'stimuli/deadFlower.jpg', name: 'dead flower', width: 200, height: 200};

// Artifacts

var couch = {
  url: 'stimuli/couch.jpg', name: 'couch', width: 200, height: 200};

var chair = {
  url: 'stimuli/chair.jpg', name: 'chair', width: 200, height: 200};

var table = {
  url: 'stimuli/table.jpg', name: 'table', width: 200, height: 200};

var castIronPan = {
  url: 'stimuli/castIron.jpg', name: 'iron skillet', width: 200, height: 200};

var ruler = {
  url: 'stimuli/ruler.jpg', name: 'wooden ruler', width: 200, height: 200};

var metalChair = {
  url: 'stimuli/metalChair.jpg', name: 'metal chair', width: 200, height: 200};

var woodChair = {
  url: 'stimuli/woodChair.jpg', name: 'wooden chair', width: 200, height: 200};

var metalStool = {
  url: 'stimuli/metalStool.jpg', name: 'metal stool', width: 200, height: 200};

var lawnmower = {
  url: 'stimuli/lawnmower.jpg', name: 'lawnmower', width: 200, height: 200};


var items = [{
  objects: [mansion, cottage, office, park1],
  labels: ["mansion","house","building","place"],
  domain: "places",
  type: "branching"
}, {
  objects: [diner, diveBar, hotelLobby, park2],
  labels: ["diner","restaurant","bar","place"],
  domain: "places",
  type: "overlapping"
}, {
  objects: [iceHotelRoom, snowyForest, snowyMountain, sunnyBeach],
  labels: ["outdoor place","cold place"],
  domain: "places",
  type: "equivocal"
},{
  objects: [dalmatian, poodle, siamese, whale1],
  labels: ["dog","dalmatian","pet","animal"],
  domain: "animals",
  type: "branching"
},{
  objects: [retriever, housecat, lion, whale2],
  labels: ["lion","cat","pet","animal"],
  domain: "animals",
  type: "overlapping"
},{
  objects: [dalmatian, betta, goldfish, angler],
  labels: ["pet","fish"],	
  domain: "animals",
  type: "equivocal"
},{
  objects: [deadFlower, tomato, carrot2, sunflower],
  labels: ["food","plant","living plant","carrot"],
  domain: "plants",
  type : "branching"
},{
  objects: [oakLeaves, lettuce, carrots, flower],
  labels: ["carrots","food","plant","leaves"],
  domain: "plants",
  type : "overlapping"
},{
  objects: [sunflower, tomato, carrot2, burger],
  labels: ["food","plant"],
  domain: "plants",
  type : "equivocal"
}, {
  objects: [couch, chair, table, lawnmower],
  labels: ["couch","seat","furniture","thing"],
  domain: "artifact",
  type : "branching"
}, {
  objects: [metalChair, woodChair, ruler, castIronPan],
  labels: ["skillet","seat","metal thing","thing"],
  domain: "artifact",
  type : "overlapping"
}, {
  objects: [metalChair, woodChair, metalStool, castIronPan],
  labels: ["seat","metal thing"],
  domain: "artifact",
  type : "equivocal"
}];


