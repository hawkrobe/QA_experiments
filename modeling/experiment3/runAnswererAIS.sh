#!/bin/bash#
# parallel  --colsep ',' "sh ./runAnswererAIS.sh {1}" :::: "bdaInput/AISinput.txt" > "bdaOutput/AISoutput_answerer.txt"
webppl answererDataAnalysis.wppl --require ../qa/ -- --answererType $1
