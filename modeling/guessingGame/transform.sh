#!/bin/bash

# Get rid of weird return characters
gsed -i "s///" answererPredictions.raw.csv
gsed -i 's///' questionerPredictions.raw.csv

# equivocal answerer
gsed 's/Qe:whereIsFish?/Q2/g' answererPredictions.raw.csv > answererPredictions.csv
gsed -i 's/Qe:whereIsPet?/Q1/g' answererPredictions.csv

gsed -i 's/Ae:dalmatian/A1/g' answererPredictions.csv
gsed -i 's/Ae:beta/A2/g' answererPredictions.csv 
gsed -i 's/Ae:goldfish/A3/g' answererPredictions.csv
gsed -i 's/Ae:angler/A4/g' answererPredictions.csv 

# equivocal questioner
gsed 's/Qe:fish/Q2/g' questionerPredictions.raw.csv > questionerPredictions.csv
gsed -i 's/Qe:pet/Q1/g' questionerPredictions.csv 

gsed -i 's/Ge:dalmatian/G1/g' questionerPredictions.csv 
gsed -i 's/Ge:beta/G2/g' questionerPredictions.csv 
gsed -i 's/Ge:goldfish/G3/g' questionerPredictions.csv 
gsed -i 's/Ge:angler/G4/g' questionerPredictions.csv 

# overlapping answerer
gsed -i 's/Qo:whereIsLion?/Q1/g' answererPredictions.csv
gsed -i 's/Qo:whereIsCat?/Q2/g' answererPredictions.csv
gsed -i 's/Qo:whereIsPet?/Q3/g' answererPredictions.csv
gsed -i 's/Qo:whereIsAnimal?/Q4/g' answererPredictions.csv

gsed -i 's/Ao:lion/A3/g' answererPredictions.csv 
gsed -i 's/Ao:siamese/A2/g' answererPredictions.csv 
gsed -i 's/Ao:dalmatian/A1/g' answererPredictions.csv
gsed -i 's/Ao:whale/A4/g' answererPredictions.csv 

# overlapping questioner
gsed -i 's/Qo:lion/Q1/g' questionerPredictions.csv
gsed -i 's/Qo:cat/Q2/g' questionerPredictions.csv
gsed -i 's/Qo:pet/Q3/g' questionerPredictions.csv
gsed -i 's/Qo:animal/Q4/g' questionerPredictions.csv

gsed -i 's/Go:dalmatian/G1/g' questionerPredictions.csv
gsed -i 's/Go:siamese/G2/g' questionerPredictions.csv
gsed -i 's/Go:lion/G3/g' questionerPredictions.csv
gsed -i 's/Go:whale/G4/g' questionerPredictions.csv

# branching answerer
gsed -i 's/Qb:whereIsDalmatian?/Q1/g' answererPredictions.csv
gsed -i 's/Qb:whereIsDog?/Q2/g' answererPredictions.csv
gsed -i 's/Qb:whereIsPet?/Q3/g' answererPredictions.csv
gsed -i 's/Qb:whereIsAnimal?/Q4/g' answererPredictions.csv

gsed -i 's/Ab:dalmatian/A1/g' answererPredictions.csv
gsed -i 's/Ab:poodle/A2/g' answererPredictions.csv
gsed -i 's/Ab:siamese/A3/g' answererPredictions.csv
gsed -i 's/Ab:whale/A4/g' answererPredictions.csv 

# branching questioner
gsed -i 's/Qb:dalmatian/Q1/g' questionerPredictions.raw.csv > questionerPredictions.csv
gsed -i 's/Qb:dog/Q2/g' questionerPredictions.csv
gsed -i 's/Qb:pet/Q3/g' questionerPredictions.csv
gsed -i 's/Qb:animal/Q4/g' questionerPredictions.csv

gsed -i 's/Gb:dalmatian/G1/g' questionerPredictions.csv
gsed -i 's/Gb:poodle/G2/g' questionerPredictions.csv
gsed -i 's/Gb:siamese/G3/g' questionerPredictions.csv
gsed -i 's/Gb:whale/G4/g' questionerPredictions.csv
