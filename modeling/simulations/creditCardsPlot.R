col1 = c('AmericanExpress', 'AmericanExpress\nCarteBlanche', 
         'AmericanExpress\nDiners', 'AmericanExpress\nDiners\nCarteBlanche\n\n')
col2 = c(0.25554128204638693, 0.24834069415362003, 0.2485424286904104, 0.24757559510958238)

qData = data.frame(answer = col1, probability = col2)
#qData$answer = factor(qData$answer, levels = c('yes', 'no', 'M+D', 'M', 'D', 'none'))

pdf("../writing/2015/journal-manuscript/figures/americanExpressPosterior.pdf",
    width=8, height=4)
g = (ggplot(qData, aes(x = answer, y = probability))
     + geom_bar(stat = 'identity', position = 'dodge')
     + ggtitle("Pragmatic Answerer Posterior, Q = 'AmericanExpress?'")
     + theme_bw())
g
dev.off()

col1 = c('Visa\nMasterCard\nAmericanExpress\nDiners\nCarteBlanche',
         'Visa\nMasterCard\nAmericanExpress\nCarteBlanche',
         'Visa\nMasterCard\nDiners\nCarteBlanche',
         'Visa\nMasterCard\nAmericanExpress\nDiners',
         'Visa\nMasterCard\nAmericanExpress')
col2 = c(0.18993035940048889 , 0.19365593924754979 , 
         0.18993035940048889 , 0.19464844308741136 ,
         0.23183489886406064)

qData = data.frame(answer = col1, probability = col2)
#qData$answer = factor(qData$answer, levels = c('yes', 'no', 'M+D', 'M', 'D', 'none'))

pdf("../writing/2015/journal-manuscript/figures/creditCardsPosterior.pdf",
    width=8, height=4)
g = (ggplot(qData, aes(x = answer, y = probability))
     + geom_bar(stat = 'identity', position = 'dodge')
     + ggtitle("Pragmatic Answerer Posterior, Q = 'Credit Cards?'")
     + theme_bw())
g
dev.off()
