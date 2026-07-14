class NeuroEvolution {
    static nextGeneration(savedBirds, bestScore, targetPopulation) {
        // adjust fitness scores based on survival time and pipes passed
        for (let bird of savedBirds) {
            let frameScore = bird.fitness / 100;
            let pipeScore = Math.pow(bird.score, 2) * 100;
            bird.fitness = frameScore + pipeScore;
        }

        let sumBirdFitness = 0;

        for (let bird of savedBirds) {
            sumBirdFitness += bird.fitness;
        }

        // normalize fitness scores
        for (let i = 0; i < savedBirds.length; ++i) {
            savedBirds[i].fitness = savedBirds[i].fitness / sumBirdFitness;
        }

        let dynamicMutationRate = map(bestScore, 0, 30, 0.20, 0.01, true);
        let newPopulation = [];

        // generate new population based on fitness probability
        for (let i = 0; i < targetPopulation; i++) {
            let parentBrain = this.pickOneRandomBrain(savedBirds);
            let childBrain = parentBrain.copy();
            childBrain.mutate(dynamicMutationRate);
            newPopulation.push(new Bird(childBrain));
        }

        // dispose old models from memory to prevent memory leaks
        for (let bird of savedBirds) {
            bird.dispose();
        }

        return newPopulation;
    }

    static pickOneRandomBrain(savedBirds) {
        let r = random(1);
        let index = 0;

        while (r > 0 && index < savedBirds.length) {
            r -= savedBirds[index].fitness;
            index += 1;
        }
        index -= 1;

        // safety check to prevent array out of bounds error
        if (index < 0) {
            index = 0;
        }
        if (index >= savedBirds.length) {
            index = savedBirds.length - 1;
        }

        return savedBirds[index].brain;
    }
}