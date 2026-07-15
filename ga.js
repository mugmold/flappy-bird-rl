class NeuroEvolution {
    static nextGeneration(savedAgents, bestScore, targetPopulation) {
        // adjust fitness scores based on survival time and pipes passed
        for (let agent of savedAgents) {
            let frameScore = agent.fitness / 100;
            let pipeScore = Math.pow(agent.score, 2) * 100;
            agent.fitness = frameScore + pipeScore;
        }

        let sumFitness = 0;

        for (let agent of savedAgents) {
            sumFitness += agent.fitness;
        }

        // normalize fitness scores
        for (let i = 0; i < savedAgents.length; ++i) {
            savedAgents[i].fitness = savedAgents[i].fitness / sumFitness;
        }

        let dynamicMutationRate = map(bestScore, 0, 30, 0.20, 0.01, true);
        let newBrains = [];

        // generate new population based on fitness probability
        for (let i = 0; i < targetPopulation; i++) {
            let parentBrain = this.pickOneRandomBrain(savedAgents);
            let childBrain = parentBrain.copy();
            childBrain.mutate(dynamicMutationRate);
            newBrains.push(childBrain);
        }

        // dispose old models from memory to prevent memory leaks
        for (let agent of savedAgents) {
            agent.brain.dispose();
        }

        return newBrains;
    }

    static pickOneRandomBrain(savedAgents) {
        let r = random(1);
        let index = 0;

        while (r > 0 && index < savedAgents.length) {
            r -= savedAgents[index].fitness;
            index += 1;
        }
        index -= 1;

        // safety check to prevent array out of bounds error
        if (index < 0) {
            index = 0;
        }
        if (index >= savedAgents.length) {
            index = savedAgents.length - 1;
        }

        return savedAgents[index].brain;
    }
}