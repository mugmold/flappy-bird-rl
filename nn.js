class NeuralNetwork {
    constructor(inputs, hidden, outputs, customModel = null) {
        this.inputNodes = inputs;
        this.hiddenNodes = hidden;
        this.outputNodes = outputs;

        // if an existing tensorflow model is passed, use it. otherwise, build a new one.
        if (customModel) {
            this.model = customModel;
        } else {
            this.model = this.createModel();
        }
    }

    // create the neural network
    createModel() {
        // use tf.tidy to prevent memory leaks by automatically cleaning up tensors
        return tf.tidy(() => {
            const model = tf.sequential();

            // hidden layer
            const hiddenLayer = tf.layers.dense({
                units: this.hiddenNodes,
                inputShape: [this.inputNodes],
                activation: 'sigmoid'
            });
            model.add(hiddenLayer);

            // output layer
            const outputLayer = tf.layers.dense({
                units: this.outputNodes,
                activation: 'sigmoid'
            });
            model.add(outputLayer);

            // compile the model with an optimizer and a loss function
            model.compile({
                optimizer: 'sgd', // stochastic gradient descent
                loss: 'meanSquaredError'
            });

            return model;
        });
    }

    // predict the action based on game environment inputs
    predict(inputs) {
        return tf.tidy(() => {
            const xs = tf.tensor2d([inputs]);

            const ys = this.model.predict(xs);

            // extract the raw javascript array data out of the tensor
            const outputs = ys.dataSync();

            return outputs;
        });
    }

    // duplicate the network weights to create a child network
    copy() {
        return tf.tidy(() => {
            // create a brand new architecture first
            const modelCopy = this.createModel();

            // get the trained weights from the current model
            const weights = this.model.getWeights();
            const weightCopies = [];

            // clone every single weight tensor to avoid reference sharing
            for (let i = 0; i < weights.length; i++) {
                weightCopies[i] = weights[i].clone();
            }

            // inject the copied weights into the new model
            modelCopy.setWeights(weightCopies);

            // return a fresh neural network instance wrapping the copied model
            return new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes, modelCopy);
        });
    }

    // tweak the weights slightly based on a specific mutation rate
    mutate(rate) {
        tf.tidy(() => {
            const weights = this.model.getWeights();
            const mutatedWeights = [];

            for (let i = 0; i < weights.length; i++) {
                let tensor = weights[i];
                let shape = weights[i].shape;

                // extract raw weight values
                let values = tensor.dataSync().slice();

                // loop through every single weight connection
                for (let j = 0; j < values.length; j++) {
                    // if the random check falls under the mutation rate, modify the weight
                    if (random(1) < rate) {
                        let current = values[j];
                        // add a small gaussian distribution value to shift the behavior slightly
                        values[j] = current + randomGaussian(0, 0.1);
                    }
                }

                // pack the mutated array back into a tensorflow tensor
                let newTensor = tf.tensor(values, shape);
                mutatedWeights[i] = newTensor;
            }

            // apply the brand new mutated weights back to the current bird model
            this.model.setWeights(mutatedWeights);
        });
    }

    dispose() {
        this.model.dispose();
    }
}