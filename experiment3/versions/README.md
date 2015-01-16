We ran several iterations of this experiment:

* `experiment3_orig` was the basic "guessing game" task with "where" questions and dropdown menus to respond. There were some problems with the stimuli, however: 
  1. questions were phrased in a way that suggested that multiple answers were possible, 
  2. The top-level category was 'thing', which participants did not interpret as a super-class since it is odd to refer to cats and dogs as "things"
  3. the order of questioner and answerer blocks was not randomized
* `experiment3_fr` was the same as `experiment3_orig`, but gave participants a text box for the answerer phase instead of a drop down menu, allowing them to respond freely. This suffered from the same flaws, however.
* `experiment3_polar` was the same as `experiment3_orig`, but used polar questions instead of "which gate..." questions. It shared flaws 2. and 3. of the previous experiments, and also an additional one. The answerer could use radio buttons to respond "yes" or "no", or use a drop-down menu to select a more specific answer. The ease of clicking the "yes" or "no" responses biased the results such that very few participants actually gave the location of an object. This violates the structure of the task, since the questioner was told that "the answerer can tell you the location of exactly one object."
* `experiment3_short` was a refined version of `experiment3_orig` fixing the flaws noted about and driving home the message that the answerer can only give one location of one item. 
* `experiment3_long` was intended to allow the answerer to give the locations of *all* the dogs, or *all* the animals, etc. It has not yet been coded up or run.
