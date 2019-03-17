with open('paramInput.txt', 'w') as f:
    for Qrationality in range(1,20,1) :
        for Arationality in range(1,20,1) :
            for cost in [.1, .5, 1, 1.5, 2] :
                f.write(','.join(map(str, [Qrationality, Arationality, cost])) + '\n')
