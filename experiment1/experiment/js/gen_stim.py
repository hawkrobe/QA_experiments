import random as nd

domains = ["pets","clothes","vehicles","foods"]
d = {"pets":    {"q" : "a dog",
                 "a" : ["a dog","a cat", "an animal","a dalmatian"]},
     "foods":   {"q" : "some mexican food",
                 "a" : ["some mexican food", "some italian food",
                        "some food", "some burritos"]},
     "clothes": {"q" : "a shirt",
                 "a" : ["a shirt", "some pants", "some clothing", "a polo"]},
     "vehicles":{"q" : "a car",
                 "a" : ["a car", "a truck", "a vehicle", "a sports car"]}}
names = ["Bob", "Charles", "Sally", "Alice"]
q_frame = "Do you have "
a_frame = "I have "
a_types = ["id", "sib", "super", "sub"]
with open('stim_list2.js', 'wb') as f :
    f.write("var stim_list = {")
    for domain in domains:
        f.write("\"{0}\": [".format(domain))
        for i in range(len(a_types)) :
            answer = d[domain]["a"][i]
            f.write("{{person   : \"{0}\",\n".format(nd.choice(names)))
            f.write("q_obj    : \"{0}{1}?\",\n".format(q_frame, d[domain]["q"]))
            f.write("a_obj    : \"{0}{1}.\",\n".format(a_frame, answer))
            f.write("trial_t  : \"{0}_{1}\"}},\n".format(domain, a_types[i]))
        f.write("],\n")
    f.write("}")
                    
    
    
