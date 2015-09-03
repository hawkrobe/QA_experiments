col1 = rep(c('yes', 'no', 'M+D', 'M', 'D', 'none'), 2)
col2 = c(.19, 0, .41, 0.20, 0.15, 0.04, 0.51, 0, 0.26,0.13, 0.08,0.02)
col3 = c(rep('Do you accept any kinds of credit card?', 6), rep('Do you accept MasterCard?', 6))

qData = data.frame(answer = col1, model_probability = col2, question = col3)
qData$answer = factor(qData$answer, levels = c('yes', 'no', 'M+D', 'M', 'D', 'none'))

pdf("../writing/2015/computational-experiments-final/creditCardPlot.jpeg",
    width=6, height=3)
g = (ggplot(qData, aes(x = answer, y = model_probability))
     + geom_bar(stat = 'identity', position = 'dodge')
     + facet_wrap(~ question)
     + ggtitle("Pragmatic Answerer: Clark (1979) Experiment 4"))
g
dev.off()
