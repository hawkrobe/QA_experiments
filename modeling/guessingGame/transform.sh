#!/bin/bash

# Get rid of weird return characters
gsed "s///" answererPredictionsUnif.raw.csv > answererPredictionsUnif.csv
gsed "s///" answererPredictionsEmp.raw.csv > answererPredictionsEmp.csv
gsed 's///' questionerPredictionsUnif.raw.csv > questionerPredictionsUnif.csv
gsed 's///' questionerPredictionsEmp.raw.csv > questionerPredictionsEmp.csv

