library(ggplot2)
states = c("2", "3", "4", "2,3", "2,4", "3,4", "2,3,4")
bus_vals = c(0.1398, 0.1158, 0.1158, 0.1236, 0.1236, 0.1122, 0.2693)
tou_vals = c(0.2644, 0.1240, 0.1240, 0.1322, 0.1322, 0.0657, 0.1576)

col1 = rep(states, 2)
col2 = c(bus_vals,tou_vals)
col3 = c(rep('Businessperson', 7),rep('Tourist', 7))

qData = data.frame(answer = col1, model_probability = col2, question = col3)
qData$answer = factor(qData$answer, levels = states)
qData$question = factor(qData$question, levels = c("Tourist", "Businessperson"))


pdf("../../writing/2015/journal-manuscript/groenendijckPlot.pdf",
    width=6, height=3)
g = (ggplot(qData, aes(x = answer, y = model_probability))
     + geom_bar(stat = 'identity', position = 'dodge')
     + facet_wrap(~ question)
     + ggtitle("Pragmatic Answerer: Groenendijck & Stokhof (1984)"))
g
dev.off()
