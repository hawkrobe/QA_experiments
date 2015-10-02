equivocalFarLeftAnswers <- c("wooden chair", "burger", "dalmatian", "sunny beach")
equivocalNearLeftAnswers <- c("metal chair", "tomatos", "betta fish", "snowy forest")
equivocalNearRightAnswers <- c("metal stool", "carrot", "goldfish", "snowy mountain")
equivocalFarRightAnswers <- c("iron skillet", "sunflower", "angler fish", "ice hotel room")
branchingFarLeftAnswers <- c("mansion", "dalmatian", "carrot", "couch")
branchingNearLeftAnswers <- c("cottage", "poodle", "tomatos", "chair")
branchingNearRightAnswers <- c("office", "siamese cat", "sunflower", "table")
branchingFarRightAnswers <- c("park", "whale", "dead flower", "lawnmower")
overlappingFarLeftAnswers <- c("golden retriever", "dive bar", "oak", "wooden chair")
overlappingNearLeftAnswers <- c("house cat", "hotel lobby", "lettuce", "metal chair")
overlappingNearRightAnswers <- c("lion", "diner", "carrots", "iron skillet")
overlappingFarRightAnswers <- c("whale", "park", "flower", "wooden ruler")

mapAnswer <- function(type, answer) {
  if(type == "equivocal") {
    if(answer %in% equivocalFarLeftAnswers)
      return("A1")
    else if(answer %in% equivocalNearLeftAnswers)
      return("A2")
    else if(answer %in% equivocalNearRightAnswers)
      return("A3")
    else if(answer %in% equivocalFarRightAnswers)
      return("A4")
    else 
      stop(cat("Unrecognized answer in equivocal:", answer))
  } else if(type == "branching") {
    if(answer %in% branchingFarLeftAnswers)
      return("A1")
    else if(answer %in% branchingNearLeftAnswers)
      return("A2")
    else if(answer %in% branchingNearRightAnswers)
      return("A3")
    else if(answer %in% branchingFarRightAnswers)
      return("A4")
    else 
      stop(cat("Unrecognized answer in branching:", answer))
  } else if(type == "overlapping") {
    if(answer %in% overlappingFarLeftAnswers)
      return("A1")
    else if(answer %in% overlappingNearLeftAnswers)
      return("A2")
    else if(answer %in% overlappingNearRightAnswers)
      return("A3")
    else if(answer %in% overlappingFarRightAnswers)
      return("A4")
    else 
      stop(cat("Unrecognized answer in overlapping: ", answer))
  } else {
    stop(cat("Unrecognized type", type))
  }
}

equivocalLeftQuestions <- c("seat", "food", "pet", "outdoor place")
equivocalRightQuestions <- c("metal thing", "plant", "fish", "cold place")
branchingLowestLevelQuestions <- c("mansion", "dalmatian", "carrot", "couch")
branchingNextLowestLevelQuestions <- c("house", "dog", "food", "seat")
branchingNextHighestLevelQuestions <- c("building", "pet", "living plant", "furniture")
branchingHighestLevelQuestions <- c("place", "animal", "plant", "thing")
overlappingLowestLevelQuestions <- c("diner", "lion", "carrots", "skillet")
overlappingDominatedQuestions <- c("restaurant", "cat", "food", "metal thing")
overlappingNonDominatedQuestions <- c("bar", "pet", "leaves", "seat")
overlappingHighestLevelQuestions <- c("place", "animal", "plant", "thing")

mapQuestion <- function(type, question) {
  if(type == "equivocal") {
    if(question %in% equivocalLeftQuestions) {
      return("Q1")
    } else if(question %in% equivocalRightQuestions)
      return("Q2")
    else 
      stop(cat("Unrecognized question in equivocal:", question))
  } else if(type == "branching") {
    if(question %in% branchingLowestLevelQuestions)
      return("Q1")
    else if(question %in% branchingNextLowestLevelQuestions)
      return("Q2")
    else if(question %in% branchingNextHighestLevelQuestions)
      return("Q3")
    else if(question %in% branchingHighestLevelQuestions)
      return("Q4")
    else 
      stop(cat("Unrecognized question in branching:", question))
  } else if(type == "overlapping") {
    if(question %in% overlappingLowestLevelQuestions)
      return("Q1")
    else if(question %in% overlappingDominatedQuestions)
      return("Q2")
    else if(question %in% overlappingNonDominatedQuestions)
      return("Q3")
    else if(question %in% overlappingHighestLevelQuestions)
      return("Q4")
    else 
      stop(cat("Unrecognized question in overlapping: ", question))
  } else {
    stop(cat("Unrecognized type", type))
  }
}

mapGoal <- function(type, goal) {
  if(type == "equivocal") {
    if(goal %in% equivocalFarLeftAnswers)
      return("G1")
    else if(goal %in% equivocalNearLeftAnswers)
      return("G2")
    else if(goal %in% equivocalNearRightAnswers)
      return("G3")
    else if(goal %in% equivocalFarRightAnswers)
      return("G4")
    else 
      stop(cat("Unrecognized answer in equivocal:", goal))
  } else if(type == "branching") {
    if(goal %in% branchingFarLeftAnswers)
      return("G1")
    else if(goal %in% branchingNearLeftAnswers)
      return("G2")
    else if(goal %in% branchingNearRightAnswers)
      return("G3")
    else if(goal %in% branchingFarRightAnswers)
      return("G4")
    else 
      stop(cat("Unrecognized answer in branching:", goal))
  } else if(type == "overlapping") {
    if(goal %in% overlappingFarLeftAnswers)
      return("G1")
    else if(goal %in% overlappingNearLeftAnswers)
      return("G2")
    else if(goal %in% overlappingNearRightAnswers)
      return("G3")
    else if(goal %in% overlappingFarRightAnswers)
      return("G4")
    else 
      stop(cat("Unrecognized answer in overlapping: ", goal))
  } else {
    stop(cat("Unrecognized type", type))
  }
}