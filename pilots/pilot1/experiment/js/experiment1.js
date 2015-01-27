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
  
  slides.text = slide({
    name: "text",
    present : _.shuffle(_.range(domains.length)),
    present_handle : function(stim_num) {
      console.log(stim_num)
      $("#part2").hide();
      $("#part3").hide();
      $(".err1").hide();
      var domain = domains[stim_num]
      this.stim = stim_list[domain][stim_num];
      $('#instruct_button').show()
      $('#info_instruction').text("Suppose " + this.stim.person + " asks, \""
				  + this.stim.q_obj + "\"")
      $('#Q1').text("1. Why do you think " + this.stim.person + " asked this question?")
      $('#label1').text(this.stim.person + " asked this question because...");
      $('#a1').val('');
    },
    button1 : function() {
      if($("#a1").val() == "") {
        $(".err1").show();
      } else {
	$(".err1").hide();
	$("#part2").show();
	$('#question').text("Suppose the other person answers: \""
			    + this.stim.a_obj + "\"");
	$('#question').append("<p>2. Why do you think they responded this way?</p>")
	$('#label2').text("They responded this way because...");
	$('#a2').val('');
      }},
    button2 : function() {
      if($("#a2").val() == "") {
        $(".err2").show();
      } else {
	$(".err2").hide();
	$("#part3").show();
	$('#answer').text("3. Please rate how useful this response might be " 
			  + "for answering " + this.stim.person + "'s question:");
	utils.make_slider("#a_slider", function(event, ui) {
	  exp.sliderPost2 = ui.value;
	});
	exp.sliderPost2 = null;
      }},
    
    button3 : function() {
      if(exp.sliderPost2 == null) {
        $(".err3").show();
      } else {
	this.log_responses(); 
	_stream.apply(this);
      }
    },
    
    log_responses : function() {
      exp.data_trials.push({
        "trial_type" : this.stim.trial_t,
        "q_explanation" : $("#a1").val(),
	"a_explanation" : $("#a2").val(),
	"helpful" : exp.sliderPost2,
      });
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
  exp.structure=[ "i0", "instructions",// "familiarization",
		  "text", 'subj_info', 'thanks'];
  
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
