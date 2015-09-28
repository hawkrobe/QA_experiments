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
      // Set trial variables
      this.item = item;
      this.label = _.sample(this.item.labels);
      this.domain = this.item.domain;
      this.type = this.item.type;
      this.objects = _.shuffle(this.item.objects);
      var localThis = this;

      // Set up page
      $('#instruct').text("Click the " + this.label + "!");

      this.images = [];
      // Change images
      for(i = 0; i < this.objects.length; i++) {
        var obj = this.objects[i]
        var img = new Image(obj.height, obj.width);
        img.src = obj.url;
	img.id = obj.name.replace(/\s+/g, '');
	img.labelName = obj.name;
        this.images.push(img);
      };

      _.forEach(this.images, function(img) {
	document.getElementById("images").appendChild(img);
      });
      _.forEach(this.images, function(img) {
	localThis.addClickHandler(img);
      });
    },

    addClickHandler : function(img) {
      var localThis = this;
      $('#' + img.id).click(function(evt){
	var objClicked = evt.toElement.labelName;
	localThis.log_responses(objClicked);
	_stream.apply(localThis);
      });
    },

    removeAllImages : function() {
      var childNodes = _.clone(document.getElementById("images").childNodes);
      _.forEach(childNodes, function(obj) {
    	document.getElementById("images").removeChild(obj);
      });
    },
    
    log_responses : function(objClicked) {
      exp.data_trials.push({
        "domain" : this.domain,
        "type": this.type,
	"label" : this.label,
        "response" : objClicked
      });
      this.removeAllImages();
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
