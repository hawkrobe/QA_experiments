# compiled exitSurvey
cd exitSurvey
head -1 2019-1-5-11h-48m-7s-6731-315c810d-5389-40df-8565-e6bd58376594.csv > exitSurvey.csv;
tail -n +2 -q 2019-* >> exitSurvey.csv
cd ..

# compile chatmessage
cd chatMessage
head -1 2019-1-5-11h-45m-59s-6731-315c810d-5389-40df-8565-e6bd58376594.csv > chatMessage.csv;
tail -n +2 -q 2019-* >> chatMessage.csv
cd ..

# compiled reveal
cd reveal
head -1 2019-1-6-11h-35m-26s-2339-7655e5c4-0db4-4dde-8f1c-f4635c20cb81.csv  > reveal.csv;
tail -n +2 -q 2019-* >> reveal.csv
cd ..
