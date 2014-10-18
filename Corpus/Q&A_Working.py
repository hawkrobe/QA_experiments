# -*- coding: utf-8 -*-
# <nbformat>3.0</nbformat>

# <codecell>

from collections import defaultdict
from operator import itemgetter
from swda import CorpusReader

# <markdowncell>

# Need a dictionary that can be indexed twice (to store arbitrarily nested expressions)

# <codecell>

def rec_dd():
    return defaultdict(rec_dd)

# <markdowncell>

# Now we loop through corpus, find all questions, and record the answer

# <codecell>

def tag_counts():
    d = rec_dd()
    corpus = CorpusReader('swda')
    # Loop, counting tags:\n",
    q_act_tag = None
    caller = None
    q_flag = False 
    for utt in corpus.iter_utterances(display_progress=True):
        # before resetting anything, check if this utterance is a response to something and log it
        if utt.caller != caller and q_flag:
            d[q_act_tag][utt.act_tag] = (d[q_act_tag][utt.act_tag] + 1 
                                         if type(d[q_act_tag][utt.act_tag]) == int 
                                         else 1)
            q_flag = False
        # second, if the utterance is a question, set up vars so that the above if statement will catch response
        if utt.act_tag in ['qy', 'qw', 'qy^d'] :
            q_act_tag = utt.act_tag
            q_flag = True
            caller = utt.caller
    return d

# <codecell>

d = tag_counts()

# <codecell>

sd = d['qy']['sd']/float(sum(d['qy'].values()))
print "% declarative statements in reponse to yes/no questions:", round(sd,3)

# <codecell>


