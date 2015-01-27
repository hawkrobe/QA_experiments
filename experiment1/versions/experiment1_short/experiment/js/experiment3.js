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
    present : _.shuffle(["dalmatian", "poodle", "siamese cat", "goldfish"]),
    present_handle : function(qud) {
      var list_items = [["dalmatian", "dalmatian?"],
          ["mammal", "mammal?"],
          ["dog", "dog?"],
          ["animal", "animal?"]]

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
      $('#qud').text("Goal: Find the " + qud + "!")
      $('#instructs').text("Before you try to guess which gate the " + qud + " is behind, " 
        + "you have the opportunity to ask one question!")
      $('#instructs').append(" Remember: <ul> <li> The helper can tell you <b>the location of exactly one object</b>.</li>"
        + "<li> The helper knows the set of questions you have to pick from.</li> </ul>") 
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
    
    log_responses : function() {
      exp.data_trials.push({
        "trial_type" : "question",
        "qud": this.qud,
        "response" : $('#select_box')[0].value
      });
    },
  });



  slides.a_instructions = slide({
    name : "a_instructions",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });
  
  slides.a_exp = slide({
    name: "a_exp",
    present : _.shuffle([["dalmatian", "Dalmatian?"],
                         ["animal", "Animal?"],
                         ["dog","Dog?"],
                         ["mammal", "Mammal?"]]
                         ),
    present_handle : function(utt) {
      // Reset things
      $('#ans_select_box').val(0)
      $(".err1").hide();
      $('#textbox').val('');

      // Set up scenario & instructions
      this.utt = utt[0]
      $('#question').html("From the above choices, the guesser asked:<br><b>'" + utt[1] + "'</b>")

      // Highlight the utterance
      $('#' + this.utt + "_q").addClass('highlight')

      // Present random world state
      this.gate_order = _.shuffle(["dalmatian", "poodle", "siamese cat", "goldfish"])
      $('#gates').empty()
      $.each(this.gate_order, function (index, value) {
        $('#gates').append('<div class="figure">'
          + '<div class="image"><img src="' + value.split(" ")[0] + '.jpg" height=150px width=150px/></div>'
          + '<p class="caption"> Gate ' + (index+1) + '</p>'
          + '</div>');
      });  

    },

    button : function() {
      if($("#textbox").val() == "") {
        $(".err1").show();
      } else {
        $('#' + this.utt + "_q").removeClass('highlight')
        this.log_responses();
        _stream.apply(this); //use _stream.apply(this); if and only if there is "present" data.
      }
    },
    
    log_responses : function() {
      exp.data_trials.push({
        "trial_type" : "ans:",
        "utterance" : this.utt,
        "world_state": this.gate_order,
        "response" : $("#ans_select_box").val(),
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
  if(Math.random() < .5){
    q_first = true;
    exp.structure=[ "i0", "q_instructions", "q_exp", "a_instructions", "a_exp", 'subj_info', 'thanks'];
  }
  else {
    q_first = false
    exp.structure=[ "i0", "a_instructions", "a_exp", "q_instructions", "q_exp", 'subj_info', 'thanks'];
  }

  if(q_first) {
    $("#q_title").html("Part 1: <br> Guesser Instructions")
    $("#a_title").html("Part 2: <br> Helper Instructions")
  }
  else{
    $("#q_title").html("Part 2: <br> Guesser Instructions")
    $("#a_title").html("Part 1: <br> Helper Instructions")
  }

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
