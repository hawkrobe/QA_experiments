from swda import Transcript
trans = Transcript('swda/sw00utt/sw_0001_4325.utt.csv', 'swda/swda-metadata.csv')

print(trans.topic_description)
