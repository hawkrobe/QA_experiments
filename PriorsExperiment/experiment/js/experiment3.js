function make_slides(f) {
  var q_first = null;
  var slides = {};
  slides.i0 = slide({
    name : "i0",
    start: function() {
      exp.startT = Date.now();
    }
  });
  
  // slides.q_instructions = slide({
  //   name : "q_instructions",
  //   button : function() {
  //     exp.go(); //use exp.go() if and only if there is no "present" data.
  //   }
  // });
  
  slides.q_exp = slide({
    name: "q_exp",
    present : _.shuffle(items), // from stim_list.js
    present_handle : function(item) {
      // Set up page
      $(".err1").hide();
      $("#other").val(" ");

      // Sample a possible label
      var label = _.sample(item.labels);
      
      // Change images
      _.forEach(item.objects, function(obj) {
	var img = {};
	img.src = obj.url;
	img.id = obj.name;
	img.height = obj.height;
	img.width = obj.width;
	document.getElementById("images").appendChild(img);
      });

      $('#instruct_button').show();
      $('#instruct').text("Click the " + label + "!");
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
    
    log_responses : function() {
      exp.data_trials.push({
        "trial_type" : "question",
        "qud": this.qud,
        "response" : $('#select_box')[0].value
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
  exp.structure=[ "i0", "q_exp", 'subj_info', 'thanks'];
  console.log(exp);
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
