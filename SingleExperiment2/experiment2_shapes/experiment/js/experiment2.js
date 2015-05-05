function make_slides(f) {
  var q_first = null;
  var slides = {};
  slides.i0 = slide({
    name : "i0",
    start: function() {
      exp.startT = Date.now();
    }
  });
  
  slides.q_instructions = slide({
    name : "q_instructions",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });
  
  slides.q_exp = slide({
    name: "q_exp",

    present : _.shuffle(["red circle", "blue circle"]),

    present_handle : function(qud) {
      var list_items = [["redCircle", "red circle?"],
          ["square", "square?"]]
      // Jump to top of page
      $('html,body').scrollTop(0);
      // Set up scenario & instructions
      this.qud = qud
      $(".err1").hide();
      $("#other").val(" ")
      //  shuffle drop down list order, and set to null
      $('#select_box').empty()
      $('#select_box').append($('<option/>', {selected: true, disabled: true, value: "", text: ""}))
      $.each(_.shuffle(list_items), function (index, value) {
        $('#select_box').append($('<option/>', { 
          value: value[0],
          text : value[1] 
        }));
      });  
      $('#select_box').val(0);
      $('#instruct_button').show()
      // Highlight the utterance
      console.log(this.qud)
      $('#' + this.qud.replace(/\s+/g, '') + "_g").addClass('highlight')
      $('#qud').text("Find the " + qud + "!")
      $('#instructs').text("Before you try to guess which gate the " + qud + " is behind, " 
        + "you have the opportunity to ask one question!")
      $('#instructs').append(" Remember: <ul> <li> The helper can tell you the location of exactly one object.</li>"
        + "<li> The helper knows the set of questions you have to pick from.</li> "
        + "<li> The helper doesn't know whether you want to know about the red or blue circle!</ul>") 
    },

    button : function() {
      if ($('#select_box').val() == null) {
        $(".err1").show();
      } else {
	$("#" + this.qud.replace(/\s+/g, '') + "_g").removeClass('highlight')
//        $("#" + this.qud.split(" ")[0]).removeClass('border')
        this.log_responses();
        _stream.apply(this); //use _stream.apply(this); if and only if there is "present" data.
      }
    },
    
    log_responses : function() {
      exp.data_trials.push({
        "trial_type" : "question",
        "qud": this.qud,
        "response" : $('#select_box')[0].value
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
  // counterbalance 'questions first' vs. 'answers first'
  exp.structure=[ "i0", "q_instructions", "q_exp", 'subj_info', 'thanks'];

  $("#q_title").html("Guesser Instructions")

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
