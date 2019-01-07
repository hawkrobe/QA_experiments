# compiled exitSurvey
cd exitSurvey
head -1 2018-12-22-18h-51m-21s-3721-ca61d6f6-da2d-4a8b-b6a4-01ae2db13ac0.csv > exitSurvey.csv;
tail -n +2 -q 2018-* >> exitSurvey.csv
cd ..

# compile chatmessage
cd chatMessage
head -1 2018-12-22-18h-51m-26s-9786-9823584e-a808-46d6-ae75-76aa7404896f.csv > chatMessage.csv;
tail -n +2 -q 2018-* >> chatMessage.csv
cd ..

# compiled reveal
cd reveal
head -1 2018-12-22-12h-48m-48s-7382-42639d10-4528-4631-bded-c1a75331569f.csv > reveal.csv;
tail -n +2 -q 2018-* >> reveal.csv
cd ..
