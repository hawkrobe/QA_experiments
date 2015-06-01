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

mapAnswer <- function(row) {
  if(row$type == "equivocal") {
    if(row$answer %in% equivocalFarLeftAnswers)
      return("A1")
    else if(row$answer %in% equivocalNearLeftAnswers)
      return("A2")
    else if(row$answer %in% equivocalNearRightAnswers)
      return("A3")
    else if(row$answer %in% equivocalFarRightAnswers)
      return("A4")
    else 
      stop(cat("Unrecognized answer in equivocal:", row$answer))
  } else if(row$type == "branching") {
    if(row$answer %in% branchingFarLeftAnswers)
      return("A1")
    else if(row$answer %in% branchingNearLeftAnswers)
      return("A2")
    else if(row$answer %in% branchingNearRightAnswers)
      return("A3")
    else if(row$answer %in% branchingFarRightAnswers)
      return("A4")
    else 
      stop(cat("Unrecognized answer in branching:", row$answer))
  } else if(row$type == "overlapping") {
    if(row$answer %in% overlappingFarLeftAnswers)
      return("A1")
    else if(row$answer %in% overlappingNearLeftAnswers)
      return("A2")
    else if(row$answer %in% overlappingNearRightAnswers)
      return("A3")
    else if(row$answer %in% overlappingFarRightAnswers)
      return("A4")
    else 
      stop(cat("Unrecognized answer in overlapping: ", row$answer))
  } else {
    stop(cat("Unrecognized type", row$type))
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

mapQuestion <- function(row) {
  if(row$type == "equivocal") {
    if(row$question %in% equivocalLeftQuestions) {
      return("Q1")
    } else if(row$question %in% equivocalRightQuestions)
      return("Q2")
    else 
      stop(cat("Unrecognized question in equivocal:", row$question))
  } else if(row$type == "branching") {
    if(row$question %in% branchingLowestLevelQuestions)
      return("Q1")
    else if(row$question %in% branchingNextLowestLevelQuestions)
      return("Q2")
    else if(row$question %in% branchingNextHighestLevelQuestions)
      return("Q3")
    else if(row$question %in% branchingHighestLevelQuestions)
      return("Q4")
    else 
      stop(cat("Unrecognized question in branching:", row$question))
  } else if(row$type == "overlapping") {
    if(row$question %in% overlappingLowestLevelQuestions)
      return("Q1")
    else if(row$question %in% overlappingDominatedQuestions)
      return("Q2")
    else if(row$question %in% overlappingNonDominatedQuestions)
      return("Q3")
    else if(row$question %in% overlappingHighestLevelQuestions)
      return("Q4")
    else 
      stop(cat("Unrecognized question in overlapping: ", row$question))
  } else {
    stop(cat("Unrecognized type", row$type))
  }
}

mapGoal <- function(row) {
  if(row$type == "equivocal") {
    if(row$goal %in% equivocalFarLeftAnswers)
      return("G1")
    else if(row$goal %in% equivocalNearLeftAnswers)
      return("G2")
    else if(row$goal %in% equivocalNearRightAnswers)
      return("G3")
    else if(row$goal %in% equivocalFarRightAnswers)
      return("G4")
    else 
      stop(cat("Unrecognized answer in equivocal:", row$goal))
  } else if(row$type == "branching") {
    if(row$goal %in% branchingFarLeftAnswers)
      return("G1")
    else if(row$goal %in% branchingNearLeftAnswers)
      return("G2")
    else if(row$goal %in% branchingNearRightAnswers)
      return("G3")
    else if(row$goal %in% branchingFarRightAnswers)
      return("G4")
    else 
      stop(cat("Unrecognized answer in branching:", row$goal))
  } else if(row$type == "overlapping") {
    if(row$goal %in% overlappingFarLeftAnswers)
      return("G1")
    else if(row$goal %in% overlappingNearLeftAnswers)
      return("G2")
    else if(row$goal %in% overlappingNearRightAnswers)
      return("G3")
    else if(row$goal %in% overlappingFarRightAnswers)
      return("G4")
    else 
      stop(cat("Unrecognized answer in overlapping: ", row$goal))
  } else {
    stop(cat("Unrecognized type", row$type))
  }
}