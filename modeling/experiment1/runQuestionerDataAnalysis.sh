#!/bin/bash#
# parallel  --colsep ',' "sh ./runQuestionerDataAnalysis.sh {1} {2} {3}" :::: "bdaInput/paramInput.txt" > "bdaOutput/dataAnalysisOut_questioner.txt"
webppl questionerDataAnalysis.wppl --require ../qa/ -- --Qrationality $1 --Arationality $2 --answerCost $3
