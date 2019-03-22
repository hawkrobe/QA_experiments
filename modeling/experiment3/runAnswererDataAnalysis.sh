#!/bin/bash#
# parallel  --colsep ',' "sh ./runAnswererDataAnalysis.sh {1} {2} {3}" :::: "paramInput.txt" > "dataAnalysisOut_answerer.txt"
webppl answererDataAnalysis.wppl --require ../qa/ -- --Qrationality $1 --Arationality $2 --answerCost $3
