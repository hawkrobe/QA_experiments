# -*- coding: utf-8 -*-
# <nbformat>3.0</nbformat>

# <codecell>

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
%pylab inline
# Make things looks pretty
pd.set_option('display.max_colwidth', 1000)
pd.set_option('display.max_rows', 100)

# <markdowncell>

# Import data

# <codecell>

df = pd.read_table("../data/q_and_a1-trials.tsv")

# <markdowncell>

# Split the trial type into new 'domain' and 'set_relation' columns

# <codecell>

set_col = df['trial_type'].str.split('_').str.get(1)
df.insert(1, "set_relation", set_col)
domain_col = df['trial_type'].str.split('_').str.get(0)
df.insert(2, "domain", domain_col)

# <markdowncell>

# Clean up escape chars

# <codecell>

df['q_explanation'] = df['q_explanation'].str.replace('&quotechar', '\'', case=False)
df['a_explanation'] = df['a_explanation'].str.replace('&quotechar', '\'', case=False)
df['q_exp_tag'] = df['q_exp_tag'].str.strip()

# <markdowncell>

# Get rid of unneeded columns

# <codecell>

df = df.drop(['workerid','trial_type'], 1)

# <codecell>

df.sort_index(by = ['domain','set_relation'] )

# <codecell>

tab = df.groupby('set_relation').agg(['count','mean',np.std])
print(df.groupby(['domain', 'q_exp_tag']).agg(['count']))['helpful']
pr_prop = [21/float(25), 22/float(25), 1/float(25), 24/float(25)]

# <codecell>


unique(df['domain'])

# <codecell>

for domain in unique(df['domain']) :
    sub_df = df[df['domain'] == domain]
    sub_df.boxplot(column = 'helpful', by = 'set_relation')
    plt.title(domain)
    plt.show()

# <codecell>

import nltk
from nltk.corpus import stopwords
minlength = 2
porter = nltk.PorterStemmer()
global_list = []
for i in range(len(df['q_explanation'])) :
    sentence = df['q_explanation'][i]
    new_list = []
    mysentencetokens_sw= nltk.word_tokenize(sentence)
    mysentencetokens = [token for token in mysentencetokens_sw if 
                        (not token in stopwords.words('english')) and len(token) >= minlength]
    for token in mysentencetokens :
        print(porter.stem(token))
        new_list.append(porter.stem(token))
    global_list.append(new_list)
df['parsed_q'] = global_list

# <codecell>

df['parsed_q']

# <codecell>


