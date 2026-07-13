let pipes = [];
let birds = [];
let savedBirds = [];
let speedSlider;
let populationSlider;
let spawnTimer = 0;

let currentScore = 0;
let bestScore = 0;

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

    // slider: min 1x, max 10x, default 5x, step 1
    speedSlider = createSlider(1, 10, 5, 1);
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

    let btnReset = createButton("Kill All Birds (Force Next Gen)");

    btnReset.parent(controlContainer);
    btnReset.style('padding', '6px 12px');
    btnReset.style('background-color', '#ff4c4c');
    btnReset.style('color', 'white');
    btnReset.style('border', 'none');
    btnReset.style('border-radius', '4px');
    btnReset.style('cursor', 'pointer');
    btnReset.mousePressed(killAllBirds);

    let targetPopulation = populationSlider.value();
    for (let i = 0; i < targetPopulation; i++) {
        birds.push(new Bird());
    }
}

function draw() {
    // get amount of execution loops from slider value
    let cycles = floor(speedSlider.value());

    // run physics logic multiple times before rendering
    for (let n = 0; n < cycles; n++) {
        // handle pipe generation logic
        spawnTimer += 1;
        if (spawnTimer >= 100) {
            pipes.push(new Pipe());
            spawnTimer = 0;
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].update();

            if (!pipes[i].passed && pipes[i].x + pipes[i].width < xStart) {
                pipes[i].passed = true;
                currentScore++;

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
            let diff = (pipes[i].x + pipes[i].width) - xStart;
            if (diff > 0 && diff < record) {
                record = diff;
                closestPipe = pipes[i];
            }
        }

        // handle bird physics and collision logic
        for (let i = birds.length - 1; i >= 0; i--) {
            birds[i].think(closestPipe)
            birds[i].update();

            let hitPipe = false;
            for (let pipe of pipes) {
                if (pipe.hits(birds[i])) {
                    hitPipe = true;
                    break;
                }
            }

            if (birds[i].isDead() || hitPipe) {
                // save the dead bird to the pool for genetic selection before removing it
                savedBirds.push(birds.splice(i, 1)[0]);
            }
        }

        if (birds.length === 0) {
            nextGeneration();
            break;
        }
    }

    background(0);

    // update HTML every 5 frame (because of p5.js performance issue)
    if (frameCount % 5 === 0) {
        currentScoreLabel.html("Current Score: " + currentScore);
        bestScoreLabel.html("Best Score: <b>" + bestScore + "</b>");
        averageScoreLabel.html("Average Gen Best Score: <b>" + averageScore.toFixed(2) + "</b>");
        generationLabel.html("Generation: " + generationCount);
        speedLabel.html("Training Speed (Cycles): " + speedSlider.value() + "x");
        populationLabel.html("Bird Count (Next Attempt): " + populationSlider.value());
        statusLabel.html("Birds Alive: " + birds.length);
    }

    for (let pipe of pipes) {
        pipe.show();
    }

    for (let bird of birds) {
        bird.show();
    }
}

function nextGeneration() {
    totalGenScores += currentScore;
    averageScore = totalGenScores / generationCount;

    generationCount++;
    pipes = [];
    birds = [];
    spawnTimer = 0;
    currentScore = 0;

    let bestBird = savedBirds[0];
    for (let bird of savedBirds) {
        if (bird.fitness > bestBird.fitness) {
            bestBird = bird;
        }
    }

    let targetPopulation = populationSlider.value();
    let bestBrain = bestBird.brain;

    birds.push(new Bird(bestBrain.copy()));

    let dynamicMutationRate = map(bestScore, 0, 30, 0.20, 0.01, true);

    // 80% of birds will use best brain, while the others will use new brain
    let mutationQuota = floor(targetPopulation * 0.8);

    for (let i = 1; i < mutationQuota; i++) {
        let childBrain = bestBrain.copy();
        childBrain.mutate(dynamicMutationRate);
        birds.push(new Bird(childBrain));
    }

    let remainingSlots = targetPopulation - birds.length;
    for (let i = 0; i < remainingSlots; i++) {
        birds.push(new Bird());
    }

    // dispose old models from memory to prevent memory leaks
    for (let bird of savedBirds) {
        bird.dispose();
    }

    savedBirds = [];
}

function killAllBirds() {
    for (let i = birds.length - 1; i >= 0; i--) {
        savedBirds.push(birds.splice(i, 1)[0]);
    }

    nextGeneration();
}

function keyPressed() {
    // if (key === ' ') {
    //     for (let bird of birds) {
    //         bird.jump();
    //     }
    // }
}