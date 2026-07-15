let pipes = [];
let birds = [];
let savedAgents = []; // array to store objects containing bird physics and ga brain

let gaAgent;

let speedSlider;
let populationSlider;
let spawnTimer = 0;

let currentScore = 0;
let bestScore = 0;
let pipesSpawned = 0;

let totalGenScores = 0;
let averageScore = 0;

let currentScoreLabel, bestScoreLabel, averageScoreLabel, speedLabel, populationLabel, statusLabel, generationLabel;
let generationCount = 1;
const xStart = 60;

function setup() {
    createCanvas(600, 600);
    tf.setBackend('cpu');

    let controlContainer = createDiv();
    controlContainer.style('margin-top', '20px');
    controlContainer.style('font-family', 'sans-serif');

    currentScoreLabel = createP("");
    bestScoreLabel = createP("");
    averageScoreLabel = createP("");
    generationLabel = createP("");
    speedLabel = createP("");

    // slider: min 1x, max 10x, default 5x, step 0.5x
    speedSlider = createSlider(1, 10, 5, 0.5);
    speedSlider.style('width', '200px');

    // slider: min 1 bird, max 200 birds, default 200, step 1
    populationLabel = createP("");
    populationSlider = createSlider(1, 200, 200, 1);
    populationSlider.style('width', '200px');

    statusLabel = createP("");

    currentScoreLabel.parent(controlContainer);
    bestScoreLabel.parent(controlContainer);
    averageScoreLabel.parent(controlContainer);
    generationLabel.parent(controlContainer);
    speedLabel.parent(controlContainer);
    speedSlider.parent(controlContainer);
    populationLabel.parent(controlContainer);
    populationSlider.parent(controlContainer);
    statusLabel.parent(controlContainer);

    let btnReset = createButton("kill all birds (force next gen)");
    btnReset.parent(controlContainer);
    btnReset.style('padding', '6px 12px');
    btnReset.style('background-color', '#ff4c4c');
    btnReset.style('color', 'white');
    btnReset.style('border', 'none');
    btnReset.style('border-radius', '4px');
    btnReset.style('cursor', 'pointer');
    btnReset.mousePressed(killAllBirds);

    let btnSave = createButton("save best bird");
    btnSave.parent(controlContainer);
    btnSave.style('padding', '6px 12px');
    btnSave.style('margin-left', '10px');
    btnSave.style('background-color', '#4CAF50');
    btnSave.style('color', 'white');
    btnSave.style('border', 'none');
    btnSave.style('border-radius', '4px');
    btnSave.style('cursor', 'pointer');
    btnSave.mousePressed(saveBestBird);

    // load model button setup
    let btnLoad = createButton("load model");
    btnLoad.parent(controlContainer);
    btnLoad.style('padding', '6px 12px');
    btnLoad.style('margin-left', '10px');
    btnLoad.style('background-color', '#2196F3'); // blue color
    btnLoad.style('color', 'white');
    btnLoad.style('border', 'none');
    btnLoad.style('border-radius', '4px');
    btnLoad.style('cursor', 'pointer');

    // hidden file input to handle multiple files (.json and .bin)
    let hiddenFileInput = createElement('input');
    hiddenFileInput.attribute('type', 'file');
    hiddenFileInput.attribute('multiple', '');
    hiddenFileInput.attribute('accept', '.json,.bin');
    hiddenFileInput.style('display', 'none');
    hiddenFileInput.parent(controlContainer);

    // trigger hidden input when button is clicked
    btnLoad.mousePressed(() => {
        hiddenFileInput.elt.click();
    });

    // handle the uploaded files via tensorflow api
    hiddenFileInput.elt.addEventListener('change', async (e) => {
        let files = e.target.files;

        // tfjs needs both the json and the weight bin files
        if (files.length < 2) {
            alert("please select both the model.json and model.weights.bin files at the same time.");
            return;
        }

        try {
            let fileArray = Array.from(files);

            // force the .json file to be the first element in the array
            fileArray.sort((a, b) => {
                if (a.name.endsWith('.json')) return -1;
                if (b.name.endsWith('.json')) return 1;
                return 0;
            });

            const loadedModel = await tf.loadLayersModel(tf.io.browserFiles(fileArray));

            // force ui sliders to 1 for showcase mode
            speedSlider.value(1);
            populationSlider.value(1);

            // load the brain into the agent
            gaAgent.loadModel(loadedModel);

            // reset all game logic stats to 0
            resetVariable();
            bestScore = 0;
            totalGenScores = 0;
            averageScore = 0;
            generationCount = 1;
            resetGameEnvironment();

            console.log("model successfully loaded!");
            hiddenFileInput.elt.value = "";
        } catch (err) {
            console.error(err);
            alert("failed to load model! check console for errors.");
        }
    });

    gaAgent = new GAAgent(populationSlider.value());
    resetGameEnvironment();
}

function draw() {
    // get amount of execution loops from slider value
    let cycles = floor(speedSlider.value());

    // run physics logic multiple times before rendering
    for (let n = 0; n < cycles; n++) {
        // handle pipe generation logic
        spawnTimer += 1;

        // stop spawning pipes if we hit the limit (1000)
        if (spawnTimer >= 100 && pipesSpawned < 1000) {
            pipesSpawned++;
            let isFinishLine = (pipesSpawned === 1000);
            pipes.push(new Pipe(isFinishLine));
            spawnTimer = 0;
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].update();

            if (!pipes[i].passed && pipes[i].x + pipes[i].width < (xStart - birdRadius)) {
                pipes[i].passed = true;
                currentScore++;

                for (let bird of birds) {
                    bird.score++;
                }

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                }
            }

            if (pipes[i].offscreen()) {
                pipes.splice(i, 1);
            }
        }

        // find the closest upcoming pipe for the neural network inputs
        let closestPipe = null;
        let record = Infinity;
        for (let i = 0; i < pipes.length; i++) {
            // calculate horizontal distance to the right edge of the pipe
            let diff = (pipes[i].x + pipes[i].width) - (xStart - birdRadius);
            if (diff > 0 && diff < record) {
                record = diff;
                closestPipe = pipes[i];
            }
        }

        let states = birds.map(b => b.getState(closestPipe));
        let actions = gaAgent.actAll(states);

        // handle bird physics and collision logic
        for (let i = birds.length - 1; i >= 0; i--) {
            let bird = birds[i];

            if (actions[i] === 1) bird.jump();
            bird.update();

            let hitPipe = false;
            for (let pipe of pipes) {
                if (pipe.hits(bird)) {
                    hitPipe = true;
                    break;
                }
            }

            if (bird.isDead() || hitPipe) {
                // save the dead bird to the pool for genetic selection before removing it
                savedAgents.push({
                    bird: bird,
                    brain: gaAgent.brains[i],
                    fitness: bird.fitness,
                    score: bird.score
                });

                gaAgent.brains.splice(i, 1);
                birds.splice(i, 1);
            }
        }

        // trigger episode end when all birds are dead or the finish line is passed
        if (birds.length === 0) {
            handleEpisodeEnd();
            break;
        } else if (currentScore >= 1000) {
            killAllBirds();
            break;
        }
    }

    background(0);

    // update html every 5 frame (because of p5.js performance issue)
    if (frameCount % 5 === 0) {
        let displayBest = bestScore >= 1000 ? "FINISH (1000)" : bestScore;
        currentScoreLabel.html("current score: " + currentScore);
        bestScoreLabel.html("best score: <b>" + displayBest + "</b>");
        averageScoreLabel.html("average gen best score: <b>" + averageScore.toFixed(2) + "</b>");
        generationLabel.html("generation: " + generationCount);
        speedLabel.html("training speed (cycles): " + speedSlider.value() + "x");
        populationLabel.html("bird count (next attempt): " + populationSlider.value());
        statusLabel.html("birds alive: " + birds.length);
    }

    for (let pipe of pipes) {
        pipe.show();
    }

    // handle opacity internally based on density
    let opacity = birds.length > 20 ? 80 : 200;
    for (let bird of birds) {
        bird.show(opacity);
    }
}

function handleEpisodeEnd() {
    totalGenScores += currentScore;
    averageScore = totalGenScores / generationCount;
    generationCount++;

    let targetPopulation = populationSlider.value();
    gaAgent.populationSize = targetPopulation;

    // delegate learning logic to the ai module
    gaAgent.evolve(savedAgents, bestScore);
    resetGameEnvironment();
}

function resetGameEnvironment() {
    birds = [];
    resetVariable();
    for (let i = 0; i < gaAgent.populationSize; i++) {
        birds.push(new Bird());
    }
}

function resetVariable() {
    savedAgents = [];
    pipes = [];
    spawnTimer = 0;
    currentScore = 0;
    pipesSpawned = 0;
}

function killAllBirds() {
    for (let i = birds.length - 1; i >= 0; i--) {
        let bird = birds[i];
        savedAgents.push({
            bird: bird,
            brain: gaAgent.brains[i],
            fitness: bird.fitness,
            score: bird.score
        });
    }
    birds = [];
    gaAgent.brains = [];
    handleEpisodeEnd();
}

function saveBestBird() {
    let bestBrain = null;
    let maxFitness = -1;

    for (let i = 0; i < birds.length; i++) {
        if (birds[i].fitness > maxFitness) {
            maxFitness = birds[i].fitness;
            bestBrain = gaAgent.brains[i];
        }
    }

    if (!bestBrain && savedAgents.length > 0) {
        for (let agent of savedAgents) {
            if (agent.fitness > maxFitness) {
                maxFitness = agent.fitness;
                bestBrain = agent.brain;
            }
        }
    }

    if (bestBrain) {
        console.log("saving bird with fitness: ", maxFitness);
        bestBrain.save();
    } else {
        console.log("no bird to save!");
    }
}