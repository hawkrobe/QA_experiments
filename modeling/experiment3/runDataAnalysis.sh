#!/bin/bash#
# parallel  --colsep ',' "sh ./runDataAnalysis.sh {1} {2} {3}" :::: "paramInput.txt" > "dataAnalysisOut.txt"
webppl dataAnalysis.wppl --require ../qa/ -- --Qrationality $1 --Arationality $2 --answerCost $3
