# -*- coding: utf-8 -*-
# <nbformat>3.0</nbformat>

# <codecell>

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import statsmodels.formula.api as sm
from sklearn.linear_model import LinearRegression
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

# <markdowncell>

# Get rid of unneeded columns

# <codecell>

df = df.drop(['workerid','trial_type'], 1)

# <codecell>

df.sort_index(by = ['set_relation', 'domain'] )

# <codecell>

df.groupby('set_relation').agg(['count','mean',np.std])

# <codecell>

df.boxplot(column = 'helpful', by = 'set_relation')
plt.show()

# <codecell>


