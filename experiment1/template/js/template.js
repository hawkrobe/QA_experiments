function make_slides(f) {
  var   slides = {};

  slides.i0 = slide({
     name : "i0",
     start: function() {
      exp.startT = Date.now();
     }
  });

  slides.instructions = slide({
    name : "instructions",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

  slides.familiarization = slide({
    name : "familiarization",
    present : [], //trial information for this block
    start : function() {/*what to do at the beginning of a block*/},
    present_handle : function() {/*what to do at the beginning of each trial*/},
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    },
    end : function() {/*what to do at the end of a block*/}
  });

  slides.one_slider = slide({
    name : "one_slider",
    start : function() {
      $(".err").hide();
      this.init_sliders();
      exp.sliderPost = null;
    },
    button : function() {
      if (exp.sliderPost != null) {
        exp.go(); //use exp.go() if and only if there is no "present" data.
        this.log_responses();
      } else {
        $(".err").show();
      }
    },
    init_sliders : function() {
      utils.make_slider("#single_slider", function(event, ui) {
        exp.sliderPost = ui.value;
      });
    },
    log_responses : function() {
      exp.data_trials.push({
        "trial_type" : "one_slider",
        "response" : exp.sliderPost
      });
    }
  });

  slides.multi_slider = slide({
    name : "multi_slider",
    present : _.shuffle([
      {"critter":"Wugs", "property":"fur"},
      {"critter":"Blicks", "property":"fur"},
      {"critter":"Wugs", "property":"spots"},
      {"critter":"Blicks", "property":"spots"},
      {catchT: 1, one:'left', two:'left', three:'right', four:'right', five: 'left'},
    ]),
    present_handle : function(stim) {
      $(".err").hide();
      this.stim = stim; //FRED: allows you to access stim in helpers
      $('#ms_instruction').text("Here are some sliders"); //FRED
      this.sentence_types = _.shuffle(["generic", "negation", "always", "sometimes", "usually"]);
      var sentences = {
        "generic": stim.critter + " have " + stim.property + ".",
        "negation": stim.critter + " do not have " + stim.property + ".",
        "always": stim.critter + " always have " + stim.property + ".",
        "sometimes": stim.critter + " sometimes have " + stim.property + ".",
        "usually": stim.critter + " usually have " + stim.property + "."
      };
      this.n_sliders = this.sentence_types.length;
      $(".slider_row").remove();
      for (var i=0; i<this.n_sliders; i++) {
        var sentence_type = this.sentence_types[i];
        var sentence = sentences[sentence_type];
        $("#multi_slider_table").append('<tr class="slider_row"><td class="slider_target" id="sentence' + i + '">' + sentence + '</td><td colspan="2"><div id="slider' + i + '" class="slider">-------[ ]--------</div></td></tr>');
        utils.match_row_height("#multi_slider_table", ".slider_target");
      }
      this.init_sliders(this.sentence_types);
      exp.sliderPost = [];
    },
    catch_trial_handle : function(stim) { //FRED: catch trials tell the subject to move the sliders to left or right
      $(".err").hide();
      this.stim = stim; //FRED: allows you to access stim in helpers
      $('#ms_instruction').text("Slide each slider all the way in the direction indicated");
      this.direction_nums = ['one', 'two', 'three', 'four', 'five'];
      this.n_sliders = this.direction_nums.length;
      $(".slider_row").remove();
      for (var i=0; i<this.direction_nums.length; i++) {
        var direction_num = this.direction_nums[i];
        var direction = stim[direction_num];
        $("#multi_slider_table").append('<tr class="slider_row"><td class="slider_target" id="direction' + i + '">' + direction + '</td><td colspan="2"><div id="slider' + i + '" class="slider">-------[ ]--------</div></td></tr>');
        utils.match_row_height("#multi_slider_table", ".slider_target");
      }
      this.init_sliders(this.direction_nums);
      exp.sliderPost = [];
    },
    button : function() {
      if (exp.sliderPost.length < this.n_sliders) {
        $(".err").show();
      } else {
        if (! this.stim.catchT) this.log_responses(); //FRED: added if statement to handle catch trials
        else this.log_catch_trial();
        _stream.apply(this); //use _stream.apply(this); if and only if there is "present" data.
      }
    },
    init_sliders : function(sentence_types) {
      for (var i=0; i<sentence_types.length; i++) {
        var sentence_type = sentence_types[i];
        utils.make_slider("#slider" + i, this.make_slider_callback(i));
      }
    },
    make_slider_callback : function(i) {
      return function(event, ui) {
        exp.sliderPost[i] = ui.value;
      };
    },
    log_responses : function() {
      for (var i=0; i<this.sentence_types.length; i++) {
        var sentence_type = this.sentence_types[i];
        exp.data_trials.push({
          "trial_type" : "multi_slider",
          "sentence_type" : sentence_type,
          "response" : exp.sliderPost[i]
        });
      }
    },
    // FRED: a catch trial is recorded as one object with (direction_nums.length) 
    //       properties, each of which is either 'pass' or 'FAIL'
    log_catch_trial : function() {
      var performance = {};
      for (var i=0; i<this.direction_nums.length; i++) {
        var direction_num = this.direction_nums[i];
        var direction = this.stim[direction_num];
        //check if slider is in right direction
        var correct = (direction == 'right') ? 1:0;
        if (Math.abs(correct - exp.sliderPost[i]) < 0.4) performance[direction_num] = 'pass';
        else performance[direction_num] = 'FAIL';
      }
      exp.catch_trials.push(performance);
    }
  });

  slides.subj_info =  slide({
    name : "subj_info",
    submit : function(e){
      //if (e.preventDefault) e.preventDefault(); // I don't know what this means.
      exp.subj_data = {
        language : $("#language").val(),
        enjoyment : $("#enjoyment").val(),
        asses : $('input[name="assess"]:checked').val(),
        age : $("#age").val(),
        gender : $("#gender").val(),
        education : $("#education").val(),
        comments : $("#comments").val(),
      };
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

  slides.thanks = slide({
    name : "thanks",
    start : function() {
      exp.data= {
          "trials" : exp.data_trials,
          "catch_trials" : exp.catch_trials,
          "system" : exp.system,
          "condition" : exp.condition,
          "subject_information" : exp.subj_data,
          "time_in_minutes" : (Date.now() - exp.startT)/60000
      };
      setTimeout(function() {turk.submit(exp.data);}, 1000);
    }
  });

  return slides;
}

/// init ///
function init() {
  exp.trials = [];
  exp.catch_trials = [];
  exp.condition = {}; //can randomize between subject conditions here
  exp.system = {
      Browser : BrowserDetect.browser,
      OS : BrowserDetect.OS,
      screenH: screen.height,
      screenUH: exp.height,
      screenW: screen.width,
      screenUW: exp.width
    };
  //blocks of the experiment:
  exp.structure=["i0", "instructions", "familiarization", "one_slider", "multi_slider", 'subj_info', 'thanks'];
  
  exp.data_trials = [];
  //make corresponding slides:
  exp.slides = make_slides(exp);

  exp.nQs = utils.get_exp_length(); //this does not work if there are stacks of stims (but does work for an experiment with this structure)
                    //relies on structure and slides being defined

  $('.slide').hide(); //hide everything

  //make sure turkers have accepted HIT (or you're not in mturk)
  $("#start_button").click(function() {
    if (turk.previewMode) {
      $("#mustaccept").show();
    } else {
      $("#start_button").click(function() {$("#mustaccept").show();});
      exp.go();
    }
  });

  exp.go(); //show first slide
}