                 // scenario 1
var stim_list = [{person    : "Tom", // specific q, general a
		  scenario  : "Tom is running late for his flight.",
		  question  : "Is it 10:35 yet?",
		  answer    : "It's the morning.",
		  trial_type: "time_spec_gen"},
		 {person    : "Tom", // general q, general a
		  scenario  : "Tom is running late for his flight.",
		  question  : "Is it the afternoon yet?",
		  answer    : "It's the morning.",
		  trial_type: "time_gen_gen"},
		 {person    : "Tom", // specific q, specific a
		  scenario  : "Tom is running late for his flight.",
		  question  : "Is it 10:35 yet?",
		  answer    : "It's 10:00.",
		  trial_type: "time_spec_spec"},
		 {person    : "Tom", // general q, specific a
		  scenario  : "Tom is running late for his flight.",
		  question  : "Is it the afternoon yet?",
		  answer    : "It's 10:00.",
		  trial_type: "time_gen_spec"},
		 // scenario 2
		 {person   : "Paul", // specific q, general a
		  scenario : "Paul is looking for a dog.",
		  question : "Should I get a poodle?",
		  answer   : "You should get a cat.",
		  trial_type: "pet_spec_gen"},
		 {person   : "Paul", // specific q, specific a
		  scenario : "Paul is looking for a dog.",
		  question : "Should I get a poodle?",
		  answer   : "You should get a dalamatian.",
		  trial_type: "pet_spec_spec"},
		 {person   : "Paul", // general q, specific a
		  scenario : "Paul is looking for a dog.",
		  question : "Should I get a dog?",
		  answer   : "You should get a dalamatian.",
		  trial_type: "pet_gen_spec"},
		 {person   : "Paul", // general q, general a
		  scenario : "Paul is looking for a dog.",
		  question : "Should I get a dog?",
		  answer   : "You should get a cat.",
		  trial_type: "pet_gen_gen"},
		 // scenario 3
		 {person   : "Susan", // specific q, specific a
		  scenario : "Susan is hungry for mexican food",
		  question : "Are we having burritos for dinner?",
		  answer   : "We're having tacos.",
		  trial_type: "food_spec_spec"},
		 {person   : "Susan", // specific q, general a
		  scenario : "Susan is hungry for mexican food",
		  question : "Are we having burritos for dinner?",
		  answer   : "We're having italian food.",
		  trial_type: "food_spec_gen"},
		 {person   : "Susan", // general q, general a
		  scenario : "Susan is hungry for mexican food",
		  question : "Are we having mexican food for dinner?",
		  answer   : "We're having italian food.",
		  trial_type: "food_gen_gen"},
		 {person   : "Susan", // general q, specific a
		  scenario : "Susan is hungry for mexican food",
		  question : "Are we having mexican food for dinner?",
		  answer   : "We're having tacos.",
		  trial_type: "food_gen_spec"},
		  ];
