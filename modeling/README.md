Modeling directory
=================

The model is implemented in `webppl`, a probabilistic programming language.

* `qa`: a [webppl package](https://webppl.readthedocs.io/en/master/packages.html) containing utilities shared across all experiments
* `experiment1`: contains models for the guessing game task (exp. 1 in manuscript). 
* `experiment2`: contains model for the cards experiment (exp. 2)
* `experiment3`: contains model for the spatial experiment (exp. 3)

Old 
==========

These are gathered into guessingGameFullPragmatic.js, which uses qa.js as a module (to make it faster). Note that a number of copies of this file, used to compute predictions and fit parameter values for different models, are in experiment3/analysis/model_prediction/.

The simulations directory contains computational experiments showing how our model handles (1) the 'mention-some' reading of questions like `who was at the party?' and (2) the Clark (1979) study where liquor merchants answer the question `Is a bottle of Jim Beam more than $5?' differently depending on questioner-provided context.

The vanRooy directory contains a formalization of Robert van Rooy's decision theoretic model of question behavior, and several applications.

The outdated directory contains a bevy of old versions of models that have been incorporated into the code in ```guessingGame``` and ```vanRooy```


