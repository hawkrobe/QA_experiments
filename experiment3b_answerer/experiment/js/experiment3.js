function make_slides(f) {
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
  
  var leaf_list = ["dalmatian", "poodle", "siamese cat", "daisy"]
  var utt_items = [["dalmatian", "Which gate has a dalmatian behind it?"],
                   ["animal", "Which gate has an animal behind it?"],
                   ["dog","Which gate has a dog behind it?"],
                   ["thing", "Which gate has a thing behind it?"]]

  slides.text = slide({
    name: "text",
    present : _.shuffle(utt_items),
    present_handle : function(utt) {
      // Reset things
      $('#select_box_obj').val(0)
      $('#select_box_gate').val(0)
      $(".err1").hide();

      // Set up scenario & instructions
      this.utt = utt[0]
      $('#question').html("From the above choices, the other player asked:<br><b>'" + utt[1] + "'</b>")

      // Highlight the utterance
      $('#' + this.utt + "_q").addClass('highlight')

      // Present random world state
      this.gate_order = _.shuffle(leaf_list)
      $('#gates').empty()
      $.each(this.gate_order, function (index, value) {
        $('#gates').append('<div class="figure">'
          + '<div class="image"><img src="' + value.split(" ")[0] + '.jpg" height=150px width=150px/></div>'
          + '<p class="caption"> Gate ' + (index+1) + '</p>'
          + '</div>');
      });  

    },

    button : function() {
      console.log($('#select_box_obj')[0].value)
      if ($('#select_box_obj')[0].value == "" || $('#select_box_gate')[0].value == '') {
        $(".err1").show();
      } else {
        $('#' + this.utt + "_q").removeClass('highlight')
        this.log_responses();
        _stream.apply(this); //use _stream.apply(this); if and only if there is "present" data.
      }
    },
    
    log_responses : function() {
      exp.data_trials.push({
        "trial_type" : this.utt,
        "world_state": this.gate_order,
        "item_response" : $('#select_box_obj')[0].value,
        "gate_response" : $('#select_box_gate')[0].value
      });
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

jQuery.fn.shuffle = function () {
    var j;
    for (var i = 0; i < this.length; i++) {
        j = Math.floor(Math.random() * this.length);
        $(this[i]).before($(this[j]));
    }
    return this;
};  

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
