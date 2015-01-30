We ran several iterations of this experiment:

* `experiment1_orig` was the basic "guessing game" task with "where" questions and dropdown menus to respond. There were some problems with the stimuli, however: 
  1. questions were phrased in a way that suggested that multiple answers were possible, 
  2. The top-level category was 'thing', which participants did not interpret as a super-class since it is odd to refer to cats and dogs as "things"
  3. the order of questioner and answerer blocks was not randomized
* `experiment1_fr` was the same as `experiment1_orig`, but gave participants a text box for the answerer phase instead of a drop down menu, allowing them to respond freely. This suffered from the same flaws, however.
* `experiment1_polar` was the same as `experiment1_orig`, but used polar questions instead of "which gate..." questions. It shared flaws 2. and 3. of the previous experiments, and also an additional one. The answerer could use radio buttons to respond "yes" or "no", or use a drop-down menu to select a more specific answer. The ease of clicking the "yes" or "no" responses biased the results such that very few participants actually gave the location of an object. This violates the structure of the task, since the questioner was told that "the answerer can tell you the location of exactly one object."
* `experiment1_short` was a refined version of `experiment1_orig` fixing the flaws noted about and driving home the message that the answerer can only give one location of one item. This was good, except many Turkers did not know whether a fish was a mammal or not... (and we replicated these effects in experiment1_short_replication.
* `experiment1` addressed this problem by changing 'mammal' to 'pets' and changing the non-mammal options to a whale (clearly not a pet). This is the data we ultimately used in our paper
* `experiment1_onlypets` and `experiment1_onlypets` were follow-up studies investigating a particular scenario in which the explicit and pragmatic questioner models made significantly different predictions.
