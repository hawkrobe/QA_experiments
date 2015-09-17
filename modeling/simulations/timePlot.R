library(ggplot2)
library(dplyr)
setwd("~/Box Sync/stanford/research/goodman/q&a/modeling/")
modelPreds = read.csv("simulations/timePredictions.csv",
                       sep = ',', header = TRUE) 


pdf("../writing/2015/journal-manuscript/figures/timeExpResults.pdf",
    width = 6, height = 3)
(ggplot(modelPreds, aes(x = answer, y = modelProb, fill = worldState))
     + geom_bar(stat = 'identity')
     + geom_vline(xintercept = 5)
     + geom_vline(xintercept = 25)
     + ggtitle("Pragmatic Answerer: Gibbs Jr. & Bryant (2008)\n 'I have an appointment at 4:00'")
     + theme(axis.text.x=element_text(angle = 90, vjust = 0.5, hjust=1)))
dev.off()
