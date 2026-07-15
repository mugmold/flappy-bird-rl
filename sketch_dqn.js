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

let currentScoreLabel, bestScoreLabel, speedLabel, episodeLabel, lossLabel;

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

    lossLabel = createP("");

    // slider: min 1x, max 10x, default 5x, step 0.5x
    speedSlider = createSlider(1, 10, 5, 0.5);
    speedSlider.style('width', '200px');

    currentScoreLabel.parent(controlContainer);
    bestScoreLabel.parent(controlContainer);
    episodeLabel.parent(controlContainer);
    speedLabel.parent(controlContainer);
    speedSlider.parent(controlContainer);
    lossLabel.parent(controlContainer);

    dqnAgent = new DQNAgent(5, 2);
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
        let action = dqnAgent.act(currentState);

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
        let reward = 0.1; // reward for surviving

        if (isDead) {
            reward = -1; // punishment for dying
        } else if (currentScore > 0 && action === 1 && !hitPipe) {
            // TODO: reward
        }

        let nextState = isDead ? currentState : bird.getState(closestPipe);

        // save to memory buffer
        dqnAgent.remember(currentState, action, reward, nextState, isDead);

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
        currentScoreLabel.html("current score: " + currentScore);
        bestScoreLabel.html("best score: <b>" + displayBest + "</b>");
        episodeLabel.html("episode: " + episodeCount);
        speedLabel.html("training speed (cycles): " + speedSlider.value() + "x");
    }

    for (let pipe of pipes) {
        pipe.show();
    }

    // show single dqn bird (opacity 200)
    bird.show(200);
}

async function handleEpisodeEnd() {
    episodeCount++;

    // delegate learning logic to the ai module via replay
    await dqnAgent.replay();

    if (dqnAgent.lastLoss !== null) lossLabel.html("model loss: <b>" + dqnAgent.lastLoss.toFixed(4) + "</b>");

    resetGameEnvironment();
}

function resetGameEnvironment() {
    bird = new Bird();
    pipes = [];
    spawnTimer = 0;
    currentScore = 0;
    pipesSpawned = 0;
}

function keyPressed() { }