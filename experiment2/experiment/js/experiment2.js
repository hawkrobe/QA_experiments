function make_slides(f) {
  var domains = _.shuffle(["pets", "clothes", "foods", "vehicles"])
  var slides = {};
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
  
  slides.text = slide({
    name: "text",
    present : _.shuffle(domains),
    present_handle : function(domain) {
      // Set up scenario & instructions
      $(".err1").hide();
      $("#other").val(" ")
      var stim_num = _.sample(_.range(stim_list[domain].length))
      this.stim = stim_list[domain][stim_num]
      $('#instruct_button').show()
      $('#scenario').text(this.stim.s)
      $('#question').text(this.stim.q)
      $('#instructs').text("Please indicate how appropriate it would be for " + this.stim.a_name + " to give each of the following answers:") 

      // Set up sliders
      this.sentences = _.shuffle(this.stim.a)
      this.n_sliders = this.sentences.length;
      $(".slider_row").remove();
      for (var i=0; i < this.n_sliders; i++) {
        var sentence = this.sentences[i];
        $("#multi_slider_table").append('<tr class="slider_row"><td class="slider_target" id="sentence' + i + '"> <b>' + sentence + ' </b></td><td colspan="2"><div id="slider' + i + '" class="slider">-------[ ]--------</div></td></tr>');
        utils.match_row_height("#multi_slider_table", ".slider_target");
      }
      this.init_sliders(this.sentences);
      exp.sliderPost = [];
    },

    button : function() {
      if (exp.sliderPost.length < this.n_sliders) {
        $(".err1").show();
      } else {
        this.log_responses();
        _stream.apply(this); //use _stream.apply(this); if and only if there is "present" data.
      }
    },

    init_sliders : function(sentences) {
      for (var i=0; i<sentences.length; i++) {
        utils.make_slider("#slider" + i, this.make_slider_callback(i));
      }
    },

    make_slider_callback : function(i) {
      return function(event, ui) {
        exp.sliderPost[i] = ui.value;
      };
    },
    
    log_responses : function() {
      for (var i=0; i<this.sentences.length; i++) {
        var sentence_types = ['id', 'sib', 'sup', 'sub']
        var sentence_type = sentence_types[i];
        exp.data_trials.push({
          "trial_type" : this.stim.tt,
          "sentence_type" : sentence_type,
          "other" : $("#other").val(),
          "response" : exp.sliderPost[i]
        });
      }
    },
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
  exp.structure=[ "i0", "instructions", "text", 'subj_info', 'thanks'];
  
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
