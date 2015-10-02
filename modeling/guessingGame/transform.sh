#!/bin/bash

# Get rid of weird return characters
gsed "s///" answererPredictions.raw.csv > answererPredictions.csv
# gsed 's///' questionerPredictions.raw.csv > questionPredictions.csv

