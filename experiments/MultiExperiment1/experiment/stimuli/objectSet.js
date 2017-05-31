// Indexed by object set ID

var dalmatian = {
	url: 'stimuli/dalmatian.jpg', name: 'dalmatian', width: 200, height: 200}

var poodle = {
	url: 'stimuli/poodle.jpg', name: 'poodle', width: 200, height: 200}

var siamese = {
	url: 'stimuli/siamese.jpg', name: 'siamese cat', width: 200, height: 200}

var whale1 = {
	url: 'stimuli/whale1.jpg', name: 'whale', width: 200, height: 200}


var animalWheel1 = {
	prizes : [{"name" : "siamese cat", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "whale", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "poodle", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "dalmatian", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/animalWheel1.png'
}


// These are the different 'items' that could be seen.
// Each item has a goal set and a question set, 
var items = [
	{
		goals: [dalmatian, poodle, siamese, whale1],
		questions: [" dog ", " dalmatian ", " pet ", " animal "],
		domain: "animals",
		type: "branching",
		wheel: animalWheel1,
	}, {
				goals: [dalmatian, poodle, siamese, whale1],
		questions: [" dog ", " dalmatian ", " pet ", " animal "],
		domain: "animals",
		type: "branching",
		wheel: animalWheel1,
	}, {
		goals: [dalmatian, poodle, siamese, whale1],
		questions: [" dog ", " dalmatian ", " pet ", " animal "],
		domain: "animals",
		type: "branching",
		wheel: animalWheel1,
	}, {
		goals: [dalmatian, poodle, siamese, whale1],
		questions: [" dog ", " dalmatian ", " pet ", " animal "],
		domain: "animals",
		type: "branching",
		wheel: animalWheel1,
	}
	]


module.exports = {items: items}
