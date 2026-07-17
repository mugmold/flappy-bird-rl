class DQNAgent {
    constructor(stateSize = 5, actionSize = 2) {
        this.stateSize = stateSize;
        this.actionSize = actionSize;

        this.maxMemory = 10000;          // how many memories the bird can remember
        this.memory = [];                // array to store past experiences
        this.batchSize = 64;             // how many memories to learn from at once
        this.gamma = 0.95;               // discount factor (how much it cares about future rewards)

        this.epsilon = 1.0;              // start with 100% random actions
        this.epsilonMin = 0.01;          // never go below 1% random actions
        this.epsilonDecay = 0.995;       // slowly reduce randomness every training step
        this.learningRate = 0.001;

        // create the main brain (used for playing and predicting)
        this.model = this.buildModel();

        // create the target brain (used for calculating stable future rewards)
        this.targetModel = this.buildModel();
        this.updateTargetNetwork();

        this.trainCount = 0;
    }

    // creates the neural network architecture
    buildModel() {
        return tf.tidy(() => {
            const model = tf.sequential();

            // input layer and first hidden layer
            model.add(tf.layers.dense({
                units: 24,
                inputShape: [this.stateSize],
                activation: 'relu'
            }));

            // second hidden layer
            model.add(tf.layers.dense({
                units: 24,
                activation: 'relu'
            }));

            // output layer
            model.add(tf.layers.dense({
                units: this.actionSize,
                activation: 'linear'
            }));

            // compile with adam optimizer and mean squared error loss
            model.compile({
                optimizer: tf.train.adam(this.learningRate),
                loss: 'meanSquaredError'
            });

            return model;
        });
    }

    // update target model weights to match the main model
    updateTargetNetwork() {
        tf.tidy(() => {
            const weights = this.model.getWeights();
            const weightCopies = [];
            for (let i = 0; i < weights.length; i++) {
                weightCopies[i] = weights[i].clone();
            }
            this.targetModel.setWeights(weightCopies);
        });
    }

    // choose an action based on current state
    act(state) {
        // exploration: pick a random action
        if (Math.random() <= this.epsilon) {
            return Math.floor(Math.random() * this.actionSize);
        }

        // exploitation: let the neural network predict the best action
        return tf.tidy(() => {
            const stateTensor = tf.tensor2d([state]);
            const qValues = this.model.predict(stateTensor);

            // returns the index of the highest q-value (0 for do nothing, 1 for jump)
            return qValues.argMax(1).dataSync()[0];
        });
    }

    // store a frame of experience into the memory buffer
    remember(state, action, reward, nextState, done) {
        this.memory.push({ state, action, reward, nextState, done });

        // remove the oldest memory if we exceed the limit
        if (this.memory.length > this.maxMemory) {
            this.memory.shift();
        }
    }

    // learn from past experiences
    async replay() {
        // if we don't have enough memories to form a batch, do nothing
        if (this.memory.length < this.batchSize) return;

        // grab a random batch of memories
        let batch = [];
        for (let i = 0; i < this.batchSize; i++) {
            let randomIndex = Math.floor(Math.random() * this.memory.length);
            batch.push(this.memory[randomIndex]);
        }

        // extract all states and next states into arrays for bulk prediction
        const states = batch.map(x => x.state);
        const nextStates = batch.map(x => x.nextState);

        // predict q-values in bulk (much faster than predicting one by one)
        let currentQs, nextQs;
        tf.tidy(() => {
            currentQs = this.model.predict(tf.tensor2d(states)).arraySync();
            // use target model for next state to keep training stable
            nextQs = this.targetModel.predict(tf.tensor2d(nextStates)).arraySync();
        });

        // apply the bellman equation to update our target q-values
        for (let i = 0; i < this.batchSize; i++) {
            let target = batch[i].reward;

            // if the bird didn't die, add the discounted future reward
            if (!batch[i].done) {
                target = target + this.gamma * Math.max(...nextQs[i]);
            }

            // update the q-value for the specific action taken in this memory
            currentQs[i][batch[i].action] = target;
        }

        // train the model to output these updated target q-values
        const statesTensor = tf.tensor2d(states);
        const targetsTensor = tf.tensor2d(currentQs);

        const history = await this.model.fit(statesTensor, targetsTensor, {
            epochs: 1,
            verbose: 0 // silence the tensorflow console logs
        });

        // clean up memory
        statesTensor.dispose();
        targetsTensor.dispose();
    }

    onEpisodeEnd() {
        // make the epsilon lower everytime an episode end
        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }

        // update target model every 5 episodes
        this.trainCount++;
        if (this.trainCount % 5 === 0) {
            this.updateTargetNetwork();
        }
    }

    async save(filename = 'dqn-bird-model') {
        await this.model.save(`downloads://${filename}`);
    }

    // load a pre-trained model and replace the current brain
    loadModel(loadedModel) {
        // dispose old models to free up memory
        this.model.dispose();
        this.targetModel.dispose();

        // assign the loaded model and re-compile it for future training
        this.model = loadedModel;
        this.model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'meanSquaredError'
        });

        // recreate the target model and sync the weights
        this.targetModel = this.buildModel();
        this.updateTargetNetwork();
    }
}