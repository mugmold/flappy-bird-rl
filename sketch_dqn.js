let pipes = [];
let bird;
let dqnAgent;

let speedSlider;
let spawnTimer = 0;
let currentScore = 0;
let bestScore = 0;
let pipesSpawned = 0;
let episodeCount = 1;
const xStart = 60;
const FRAME_SKIP = 3;

let framesAlive = 0;
let accumulatedReward = 0;
let lastState = null;
let lastAction = 0;

let isTraining = false;
let isTestMode = false;
let savedEpsilon = 1.0;
let savedSpeed = 5;

let currentScoreLabel, bestScoreLabel, speedLabel, episodeLabel;
let btnTest, btnSave, btnLoad, hiddenFileInput;

function setup() {
    createCanvas(600, 600);
    tf.setBackend('cpu');

    let controlContainer = createDiv();
    controlContainer.style('margin-top', '20px');
    controlContainer.style('font-family', 'sans-serif');

    currentScoreLabel = createP("");
    bestScoreLabel = createP("");
    episodeLabel = createP("");
    speedLabel = createP("");

    // slider: min 1x, max 10x, default 5x, step 0.5x
    speedSlider = createSlider(1, 10, 5, 0.5);
    speedSlider.style('width', '200px');
    speedSlider.style('display', 'block');
    speedSlider.style('margin-bottom', '15px');

    currentScoreLabel.parent(controlContainer);
    bestScoreLabel.parent(controlContainer);
    episodeLabel.parent(controlContainer);
    speedLabel.parent(controlContainer);
    speedSlider.parent(controlContainer);

    // button setup for test mode
    btnTest = createButton("Run Test Mode (1 Episode)");
    btnTest.parent(controlContainer);
    btnTest.style('padding', '6px 12px');
    btnTest.style('background-color', '#ff9800'); // orange color
    btnTest.style('color', 'white');
    btnTest.style('border', 'none');
    btnTest.style('border-radius', '4px');
    btnTest.style('cursor', 'pointer');

    btnTest.mousePressed(() => {
        if (!isTestMode) {
            isTestMode = true;

            // backup current training state
            savedEpsilon = dqnAgent.epsilon;
            savedSpeed = speedSlider.value();

            // force pure exploitation (predict, no training) and normal speed
            dqnAgent.epsilon = 0;
            speedSlider.value(1);

            resetGameEnvironment();
        }
    });

    // button setup for saving model
    btnSave = createButton("Save DQN Model");
    btnSave.parent(controlContainer);
    btnSave.style('padding', '6px 12px');
    btnSave.style('margin-left', '10px');
    btnSave.style('background-color', '#4CAF50');
    btnSave.style('color', 'white');
    btnSave.style('border', 'none');
    btnSave.style('border-radius', '4px');
    btnSave.style('cursor', 'pointer');
    btnSave.mousePressed(() => dqnAgent.save());

    // button setup for loading model
    btnLoad = createButton("Load DQN Model");
    btnLoad.parent(controlContainer);
    btnLoad.style('padding', '6px 12px');
    btnLoad.style('margin-left', '10px');
    btnLoad.style('background-color', '#2196F3'); // blue color
    btnLoad.style('color', 'white');
    btnLoad.style('border', 'none');
    btnLoad.style('border-radius', '4px');
    btnLoad.style('cursor', 'pointer');

    // hidden file input to handle multiple files (.json and .bin)
    hiddenFileInput = createElement('input');
    hiddenFileInput.attribute('type', 'file');
    hiddenFileInput.attribute('multiple', '');
    hiddenFileInput.attribute('accept', '.json,.bin');
    hiddenFileInput.style('display', 'none');
    hiddenFileInput.parent(controlContainer);

    btnLoad.mousePressed(() => hiddenFileInput.elt.click());

    // handle the uploaded files via tensorflow api
    hiddenFileInput.elt.addEventListener('change', async (e) => {
        let files = e.target.files;

        if (files.length < 2) {
            alert("please select both the model.json and model.weights.bin files at the same time.");
            return;
        }

        try {
            let fileArray = Array.from(files);
            fileArray.sort((a, b) => {
                if (a.name.endsWith('.json')) return -1;
                if (b.name.endsWith('.json')) return 1;
                return 0;
            });

            const loadedModel = await tf.loadLayersModel(tf.io.browserFiles(fileArray));

            dqnAgent.loadModel(loadedModel);

            // manually drop epsilon to minimum since we assume the loaded model is already smart
            dqnAgent.epsilon = dqnAgent.epsilonMin;

            resetGameEnvironment();
            bestScore = 0;
            episodeCount = 1;

            console.log("dqn model successfully loaded!");
            hiddenFileInput.elt.value = "";
        } catch (err) {
            console.error(err);
            alert("failed to load model! check console for errors.");
        }
    });

    dqnAgent = new DQNAgent(5, 2);
    resetGameEnvironment();
}

function draw() {
    if (isTraining) {
        background(0);
        fill(255);
        textSize(20);
        textAlign(CENTER, CENTER);
        text("Training Brain... Please Wait", width / 2, height / 2);
        return;
    }

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

        let oldScore = currentScore;

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].update();

            if (!pipes[i].passed && pipes[i].x + pipes[i].width < (xStart - birdRadius)) {
                pipes[i].passed = true;
                currentScore++;
                bird.score++;

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

        // get state and action
        let currentState = bird.getState(closestPipe);
        let action = 0;

        if (framesAlive % FRAME_SKIP === 0) {
            action = dqnAgent.act(currentState);
            lastState = currentState;
            lastAction = action;
        }

        // handle bird physics and collision logic
        if (action === 1) bird.jump();
        bird.update();

        let hitPipe = false;
        for (let pipe of pipes) {
            if (pipe.hits(bird)) {
                hitPipe = true;
                break;
            }
        }

        let isDead = bird.isDead() || hitPipe;
        let stepReward = 0.05;

        if (isDead) {
            stepReward = -1;
        } else if (currentScore > oldScore) {
            stepReward = 1;
        } else if (closestPipe !== null) { // i think it's better to increase reward based on bird.y too so it can be more accurate (maybe)
            let gapCenter = closestPipe.top + (closestPipe.gap / 2);
            let distanceToCenter = abs(bird.y - gapCenter);

            if (distanceToCenter < closestPipe.gap / 2) {
                stepReward += 0.1;
            } else {
                stepReward -= 0.1;
            }
        }

        accumulatedReward += stepReward;
        framesAlive++;

        // save to memory buffer only if we are not in test mode
        if (!isTestMode && (framesAlive % FRAME_SKIP === 0 || isDead)) {
            let nextState = isDead ? currentState : bird.getState(closestPipe);

            if (lastState !== null) {
                dqnAgent.remember(lastState, lastAction, accumulatedReward, nextState, isDead);
            }
            accumulatedReward = 0;
        }

        // trigger episode end when dead or game is complete
        if (isDead || currentScore >= 1000) {
            handleEpisodeEnd();
            break;
        }
    }

    background(0);

    // update html every 5 frame (because of p5.js performance issue)
    if (frameCount % 5 === 0) {
        let displayBest = bestScore >= 1000 ? "FINISH (1000)" : bestScore;
        let displayMode = isTestMode ? "<b>[TEST MODE - NO EXPLORATION]</b>" : episodeCount;

        currentScoreLabel.html("current score: " + currentScore);
        bestScoreLabel.html("best score: <b>" + displayBest + "</b>");
        episodeLabel.html("episode: " + displayMode);
        speedLabel.html("training speed (cycles): " + speedSlider.value() + "x");
    }

    for (let pipe of pipes) {
        pipe.show();
    }

    // show single dqn bird (opacity 200)
    bird.show(200);
}

async function handleEpisodeEnd() {
    // if we are in test mode, do not train. just revert settings and resume normal training.
    if (isTestMode) {
        isTestMode = false;
        dqnAgent.epsilon = savedEpsilon;
        speedSlider.value(savedSpeed);
        resetGameEnvironment();
        return;
    }

    isTraining = true;
    episodeCount++;

    let numBatches = Math.max(1, Math.floor(framesAlive / FRAME_SKIP));
    numBatches = Math.min(numBatches, 50);

    for (let i = 0; i < numBatches; i++) {
        await dqnAgent.replay();
    }

    dqnAgent.onEpisodeEnd();

    resetGameEnvironment();
    isTraining = false;
}

function resetGameEnvironment() {
    bird = new Bird();
    pipes = [];
    spawnTimer = 0;
    currentScore = 0;
    pipesSpawned = 0;

    framesAlive = 0;
    accumulatedReward = 0;
    lastState = null;
    lastAction = 0;
}