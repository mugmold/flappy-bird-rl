class GAAgent {
    constructor(populationSize) {
        this.populationSize = populationSize;
        this.brains = [];

        // initialize the starting population's brains
        // 5 inputs: bird.y, bird.velocity, closest pipe.x, closest pipe.top, closest pipe.bottom
        // 8 hidden nodes
        // 2 outputs: jump, do nothing
        for (let i = 0; i < populationSize; i++) {
            this.brains.push(new NeuralNetwork(5, 8, 2));
        }
    }

    // get actions for all currently alive birds
    actAll(states) {
        let actions = [];
        for (let i = 0; i < states.length; i++) {
            let actionArray = this.brains[i].predict(states[i]);
            let jumpProb = actionArray[0];
            let doNothingProb = actionArray[1];

            if (jumpProb > doNothingProb) {
                actions.push(1); // jump
            } else {
                actions.push(0); // do nothing
            }
        }
        return actions;
    }

    // evolve the brains based on fitness
    evolve(savedAgents, bestScore) {
        let newBrains = NeuroEvolution.nextGeneration(savedAgents, bestScore, this.populationSize);
        this.brains = newBrains;
    }

    // load a saved model for the entire population
    loadModel(loadedModel) {
        for (let brain of this.brains) {
            brain.dispose();
        }
        this.brains = [];
        let loadedBrain = new NeuralNetwork(5, 8, 2, loadedModel);
        this.brains.push(loadedBrain);
        this.populationSize = 1; // set population to 1 for showcase
    }
}