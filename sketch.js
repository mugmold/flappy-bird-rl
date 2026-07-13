let pipes = [];
let birds = [];
let speedSlider;
let populationSlider;
let spawnTimer;
let speedLabel;
let populationLabel;
let statusLabel;

function setup() {
    createCanvas(600, 600);

    spawnTimer = 0;

    let controlContainer = createDiv();
    controlContainer.style('margin-top', '20px');
    controlContainer.style('font-family', 'sans-serif');

    speedLabel = createP("");
    speedLabel.parent(controlContainer);
    speedLabel.style('margin', '0 0 5px 0');

    speedSlider = createSlider(1, 10, 1, 0.5);
    speedSlider.parent(controlContainer);
    speedSlider.style('width', '200px');
    speedSlider.style('margin-bottom', '15px');

    populationLabel = createP("");
    populationLabel.parent(controlContainer);
    populationLabel.style('margin', '0 0 5px 0');

    // slider: min 1 bird, max 20 birds, default 10, step 1
    populationSlider = createSlider(1, 20, 10, 1);
    populationSlider.parent(controlContainer);
    populationSlider.style('width', '200px');
    populationSlider.style('margin-bottom', '15px');

    statusLabel = createP("");
    statusLabel.parent(controlContainer);
    statusLabel.style('font-weight', 'bold');
    statusLabel.style('margin-bottom', '15px');

    let btnReset = createButton("Reset Birds");
    btnReset.parent(controlContainer);
    btnReset.style('padding', '6px 12px');
    btnReset.style('display', 'block');
    btnReset.mousePressed(resetGame);

    resetGame();
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

            if (pipes[i].offscreen()) {
                pipes.splice(i, 1);
            }
        }

        // find the closest upcoming pipe for the neural network inputs later
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
            birds[i].update();

            let hitPipe = false;
            for (let pipe of pipes) {
                if (pipe.hits(birds[i])) {
                    hitPipe = true;
                    break;
                }
            }

            if (birds[i].isDead() || hitPipe) {
                birds.splice(i, 1);
            }
        }

        if (birds.length === 0) {
            nextAttempt();
        }
    }

    background(0);

    // update html interface elements
    speedLabel.html("Training Speed (Cycles): " + speedSlider.value() + "x");
    populationLabel.html("Bird Count (Next Attempt): " + populationSlider.value());
    statusLabel.html("Birds Alive: " + birds.length);

    for (let pipe of pipes) {
        pipe.show();
    }

    for (let bird of birds) {
        bird.show();
    }
}

function nextAttempt() {
    pipes = [];
    spawnTimer = 0;

    let targetPopulation = populationSlider.value();
    for (let i = 0; i < targetPopulation; i++) {
        birds.push(new Bird());
    }
}

function resetGame() {
    birds = [];
    nextAttempt();
}

function keyPressed() {
    if (key === ' ') {
        for (let bird of birds) {
            bird.jump();
        }
    }
}