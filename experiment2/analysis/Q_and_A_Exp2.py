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

# <codecell>

df = pd.read_table("../data/q_and_a2-trials.tsv")

# <codecell>

scenario_col = df['trial_type'].str.split('_').str.get(1)
df.insert(1, "scenario", scenario_col)
domain_col = df['trial_type'].str.split('_').str.get(0)
df.insert(2, "domain", domain_col)
df

# <codecell>

car_df = df[df['domain'] == 'dog']
p_obj = car_df.hist(column = 'response', by = ['scenario', 'sentence_type'], 
                    bins=np.linspace(0,1,10), figsize = (15,10), layout = (3,4))
for array in p_obj :
    for subplot in array:
        subplot.set_xlim((-.1,1.1))
plt.show()

# <codecell>

import scipy.stats as st

# <codecell>

#tab = df.groupby('scenario', 'sentence_type').agg(['count','mean',np.std])
dog_df = df[df['domain'] == 'dog']
dog_gb_type = dog_df.groupby(['sentence_type'])
for k1, gframe1 in dog_gb_type :
    print("group = ", k1)
    ls = []
    dog_gb_scen = gframe1.groupby(['scenario'])
    for k2, gframe2 in dog_gb_scen :
        ls.append(dog_gb_scen.get_group(k2)['response'])
    print("Mann-Whitney =", st.mannwhitneyu(ls[0],ls[1]))#,ls[2]))

# <codecell>


# <codecell>


