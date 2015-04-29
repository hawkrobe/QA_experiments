// Indexed by object set ID

var dalmatian = {
	url: 'stimuli/dalmatian.jpg', name: 'dalmatian', width: 200, height: 200}

var poodle = {
	url: 'stimuli/poodle.jpg', name: 'poodle', width: 200, height: 200}

var siamese = {
	url: 'stimuli/siamese.jpg', name: 'siamese cat', width: 200, height: 200}

var whale1 = {
	url: 'stimuli/whale1.jpg', name: 'whale', width: 200, height: 200}

var retriever = {
	url: 'stimuli/retriever.jpg', name: 'retriever', width: 200, height: 200}

var lion = {
	url: 'stimuli/lion.jpg', name: 'lion', width: 200, height: 200}

var housecat = {
	url: 'stimuli/housecat.jpg', name: 'house cat', width: 200, height: 200}

var whale2 = {
	url: 'stimuli/whale2.jpg', name: 'whale', width: 200, height: 200}

var evergreen = {
	url: 'stimuli/evergreen.png', name: 'evergreen', width: 200, height: 200}

var palm = {
	url: 'stimuli/palm.png', name: 'palm', width: 200, height: 200}

var daisy = {
	url: 'stimuli/daisy.png', name: 'daisy', width: 200, height: 200}

var rose = {
	url: 'stimuli/rose.png', name: 'rose', width: 200, height: 200}

var cottage = {
	url: 'stimuli/cottage.jpg', name: 'cottage', width: 200, height: 200}

var mansion = {
	url: 'stimuli/mansion.jpg', name: 'mansion', width: 200, height: 200}

var office = {
	url: 'stimuli/office.jpg', name: 'office', width: 200, height: 200}

var park1 = {
	url: 'stimuli/park1.jpg', name: 'park', width: 200, height: 200}

var diner = {
	url: 'stimuli/diner.jpg', name: 'diner', width: 200, height: 200}

var hotelLobby = {
	url: 'stimuli/fancyBar.jpeg', name: 'hotel lobby', width: 200, height: 200}

var diveBar = {
	url: 'stimuli/dive.jpg', name: 'dive bar', width: 200, height: 200}

var park2 = {
    url: 'stimuli/park2.jpg', name: 'park', width: 200, height: 200}	

var oakLeaves = {
	url: 'stimuli/oakLeaves.jpg', name: 'oak', width: 200, height: 200}	

var lettuce = {
	url: 'stimuli/lettuce.jpg', name: 'lettuce', width: 200, height: 200}	

var carrots = {
	url: 'stimuli/carrots.jpg', name: 'carrots', width: 200, height: 200}	

var flower = {
	url: 'stimuli/flower.jpg', name: 'flower', width: 200, height: 200}

var animalWheel1 = {
	prizes : [{"name" : "siamese cat", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "whale", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "poodle", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "dalmatian", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/animalWheel1.png'
}

var animalWheel2 = {
	prizes : [{"name" : "house cat", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "lion", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "whale", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "golden retriever", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/animalWheel2.png'
}

var plantWheel1 = {
	prizes : [{"name" : "rose", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "evergreen", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "daisy", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "palm", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/plantWheel1.png'
}

var plantWheel2 = {
	prizes : [{"name" : "flower", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "oak", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "lettuce", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "carrots", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/plantWheel2.png'
}

var placeWheel1 = {
	prizes : [{"name" : "cottage", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "mansion", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "park", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "office", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/placeWheel1.png'
}

var placeWheel2 = {
	prizes : [{"name" : "hotel lobby", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "diner", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "park", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "dive bar", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/placeWheel2.png'

}

// These are the different 'items' that could be seen.
// Each item has a goal set and a question set, 
var items = [
	{
		goals: [mansion, cottage, office, park1],
		questions: [" mansion ", " house ", " building ", " place "],
		wheel: placeWheel1,
		domain: "places",
		type: "branching",
		objectSet: 1,
	},
	{
		goals: [diner, diveBar, hotelLobby, park2],
		questions: [" diner ", " restaurant ", " bar ", " place "],
		domain: "places",
		type: "overlapping",
		wheel: placeWheel2,
		objectSet: 2,
	},
	{
		goals: [dalmatian, poodle, siamese, whale1],
		questions: [" dog ", " dalmatian ", " pet ", " animal "],
		domain: "animals",
		type: "branching",
		wheel: animalWheel1,
		objectSet: 3,
	},
	{
		goals: [retriever, housecat, lion, whale2],
		questions: [" lion ", " cat ", " pet ", " animal "],
		domain: "animals",
		type: "overlapping",
		wheel: animalWheel2,
		objectSet: 4,
	},
	{
		goals: [oakLeaves, lettuce, carrots, flower],
		questions: [" carrot ", " food ", " plant ", " leaves "],
		wheel: plantWheel2,
		domain: "plants",
		type : "overlapping",
		objectSet: 5,
	},
	{
		goals: [evergreen, palm, daisy, rose],
		questions: [" rose ", " flower ", " plant ", " tree ", " evergreen "],
		wheel: plantWheel1,
		domain: "plants",
		type : "filler",
		objectSet: 6,
	},
	{
		goals: [dalmatian, poodle, siamese, whale1],
		questions: [" dog ", " animal "],
		wheel: animalWheel1,
		domain: "animals",
		type : "filler",
		objectSet: 7,
	}]


module.exports = {items: items}
