## Generate stim .json

library(tidyverse)
library(jsonlite)
data.frame(rank = c('2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'),
           suit = c('C', rep(c('C', 'D', 'H', 'S'), 3))) %>%
  expand(rank,suit) %>%
  unite(name, rank, suit, sep = '', remove = F) %>%
  rowwise() %>%
  mutate(url = paste0('./images/', name, '.png')) %>%
  write_json('./experiments/CardsExperiment/images/objects.json', dataframe = 'rows', pretty = T)
