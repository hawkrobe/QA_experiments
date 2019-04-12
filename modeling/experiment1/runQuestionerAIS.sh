#!/bin/bash#
# parallel  --colsep ',' "sh ./runQuestionerAIS.sh {1}" :::: "bdaInput/AISinput.txt" > "bdaOutput/AISoutput_questioner.txt"
webppl AIS_questioner.wppl --require ../qa/ -- --modelType $1
