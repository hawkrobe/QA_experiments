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
  
    var list_items = [["dalmatian", "Which gate has a dalmatian behind it?"],
		      ["animal", "Which gate has an animal behind it?"],
		      ["dog","Which gate has a dog behind it?"],
		      ["thing", "Which gate has a thing behind it?"]]

  slides.text = slide({
    name: "text",
    present : _.shuffle(["dalmatian", "poodle", "siamese cat", "daisy"]),
    present_handle : function(qud) {
      // Set up scenario & instructions
      this.qud = qud
      $(".err1").hide();
	$("#other").val(" ")
	//  shuffle drop down list order, and set to null
	$('#select_box').empty()
	console.log(list_items)
	$.each(_.shuffle(list_items), function (index, value) {
	    $('#select_box').append($('<option/>', { 
		value: value[0],
		text : value[1] 
	    }));
	});  
	$('#select_box').val(0);
      $("#" + qud.split(" ")[0]).addClass('border')
      $('#instruct_button').show()
      $('#question').text("Goal: Find the " + qud + "!")
      $('#instructs').text("Before you guess which gate the " + qud + " is behind, " 
        + "you have the opportunity to ask one question!")
      $('#instructs').append(" Remember: <ul> <li> The other player can tell you the location of exactly one object.</li>"
        + "<li> The other player knows the set of questions you have to pick from.</li> </ul>") 
      $('#instructs').append("<p>Please select which question you would ask in order to make the best decision.</p>") 
    },

    button : function() {
      if ($('#select_box').val() == null) {
        $(".err1").show();
      } else {
        $("#" + this.qud.split(" ")[0]).removeClass('border')
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
      exp.data_trials.push({
        "trial_type" : this.qud,
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
