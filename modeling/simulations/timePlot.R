modelPreds = read.csv("../modeling/simulations/timePredictions.csv",
         sep = ',', header = TRUE)


pdf("../writing/2015/fyp-report/timeExpResults.pdf")
(ggplot(modelPreds, aes(x = answer, y = modelProb, fill = worldState))
     + geom_bar(stat = 'identity')
     + geom_vline(xintercept = 5)
     + geom_vline(xintercept = 25)
     + ggtitle("Pragmatic Answerer: Gibbs Jr. & Bryant (2008)")
     + theme(axis.text.x=element_text(angle = 90, vjust = 0.5, hjust=1)))
dev.off()