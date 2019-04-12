#!/bin/bash#
# parallel  --colsep ',' "sh ./runAnswererAIS.sh {1}" :::: "bdaInput/AISinput.txt" > "bdaOutput/AISoutput_answerer.txt"
webppl AIS_answerer.wppl --require ../qa/ -- --modelType $1
