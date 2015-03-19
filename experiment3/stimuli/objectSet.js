// Indexed by object set ID

var dalmatian = {
	url: 'stimuli/dalmatian.jpg', name: 'dalmatian', width: 100, height: 100}

var poodle = {
	url: 'stimuli/poodle.jpg', name: 'poodle', width: 100, height: 100}

var siamese = {
	url: 'stimuli/siamese.jpg', name: 'siamese', width: 100, height: 100}

var whale = {
	url: 'stimuli/whale.jpg', name: 'whale', width: 100, height: 100}

// These are the different 'items' that could be seen.
// Each item has a goal set and a question set, 
var items = [
	{
		goals: [dalmatian, poodle, siamese, whale],
		questions: [" dog ", " dalmatian ", " pet ", " animal "],
		objectSet: 1,
	}]


module.exports = {items: items}
