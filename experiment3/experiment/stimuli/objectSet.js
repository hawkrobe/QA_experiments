// Indexed by object set ID

var dalmatian = {
	url: 'stimuli/dalmatian.jpg', name: 'dalmatian', width: 200, height: 200}

var poodle = {
	url: 'stimuli/poodle.jpg', name: 'poodle', width: 200, height: 200}

var siamese = {
	url: 'stimuli/siamese.jpg', name: 'siamese cat', width: 200, height: 200}

var whale = {
	url: 'stimuli/whale.jpg', name: 'whale', width: 200, height: 200}

var lion = {
	url: 'stimuli/lion.jpg', name: 'lion', width: 200, height: 200}

var evergreen = {
	url: 'stimuli/evergreen.png', name: 'evergreen', width: 200, height: 200}

var palm = {
	url: 'stimuli/palm.png', name: 'palm', width: 200, height: 200}

var daisy = {
	url: 'stimuli/daisy.png', name: 'daisy', width: 200, height: 200}

var rose = {
	url: 'stimuli/rose.png', name: 'rose', width: 200, height: 200}

var animalWheel = {
	prizes : [{"name" : "siamese cat", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "whale", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "poodle", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "dalmatian", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/animalWheel.png'
}

var plantWheel = {
	prizes : [{"name" : "rose", "startAngle" : 0,   "endAngle" : 89},
         	  {"name" : "evergreen", "startAngle" : 90,  "endAngle" : 179},
         	  {"name" : "daisy", "startAngle" : 180,  "endAngle" : 269},
         	  {"name" : "palm", "startAngle" : 270, "endAngle" : 359},
         	  ],
    url: 'stimuli/plantWheel.png'
}

// These are the different 'items' that could be seen.
// Each item has a goal set and a question set, 
var items = [
	// {
	// 	goals: [dalmatian, poodle, siamese, whale],
	// 	questions: [" dog ", " dalmatian ", " pet ", " animal "],
	// 	wheel: "stimuli/animalWheel.png",
	// 	objectSet: 1,
	// },
	{
		goals: [dalmatian, poodle, siamese, whale],
		questions: [" dog ", " animal "],
		wheel: "stimuli/animalWheel.png",
		objectSet: 2,
	},
	{
		goals: [dalmatian, poodle, siamese, whale],
		questions: [" dog ", " dalmatian ", " pet ", " animal "],
		wheel: "stimuli/animalWheel.png",
		objectSet: 3,
	},
	{
		goals: [evergreen, palm, daisy, rose],
		questions: [" rose ", " flower ", " plant ", " tree ", " evergreen "],
		wheel: plantWheel,
		objectSet: 4,
	}]


module.exports = {items: items}
