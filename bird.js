let minVelocity = -15
let maxVelocity = 10
let birdLift = -10

class Bird {
    constructor(brain = null) {
        this.x = xStart;
        this.y = height / 2;
        this.r = 12;
        this.gravity = 0.6;
        this.velocity = 0;
        this.lift = birdLift;

        // fitness score to track how long the bird survives
        this.fitness = 0;

        // if a trained brain is passed, use it. otherwise, create a fresh one.
        // 5 inputs: bird.y, bird.velocity, closestPipe.x, closestPipe.top, closestPipe.bottom
        // 8 hidden nodes (can be adjusted)
        // 2 outputs: [jump, do_nothing]
        if (brain) {
            this.brain = brain;
        } else {
            this.brain = new NeuralNetwork(5, 8, 2);
        }
    }

    show() {
        push();
        translate(this.x, this.y);

        // adjust opacity based on population density so it doesn't blind the screen
        let opacity = birds.length > 20 ? 80 : 200;

        // body (chubby bird shape)
        fill(255, 204, 0, opacity); // bright yellow
        stroke(200, 150, 0, opacity);
        strokeWeight(1.5);
        ellipse(0, 0, this.r * 2, this.r * 1.8);

        // big cartoon eye
        fill(255, 255, 255, opacity);
        noStroke();
        ellipse(this.r * 0.4, -this.r * 0.2, this.r * 0.7, this.r * 0.7); // white eye
        fill(0, 0, 0, opacity);
        ellipse(this.r * 0.5, -this.r * 0.2, this.r * 0.3, this.r * 0.3); // pupil

        // orange beak
        fill(255, 102, 0, opacity);
        stroke(200, 50, 0, opacity);
        triangle(
            this.r * 0.8, -this.r * 0.1,  // top base
            this.r * 0.8, this.r * 0.3,   // bottom base
            this.r * 1.4, this.r * 0.1    // tip pointing right
        );

        // wing flapping animation based on velocity
        fill(240, 170, 0, opacity); // darker yellow for wing
        stroke(200, 150, 0, opacity);

        // if velocity is negative, wing goes up. if positive, wing goes down.
        let wingOffset = this.velocity < 0 ? -this.r * 0.3 : this.r * 0.2;
        ellipse(-this.r * 0.2, wingOffset, this.r * 1.1, this.r * 0.6);

        pop();
    }

    update() {
        // increase fitness every frame the bird stays alive
        this.fitness++;

        this.velocity += this.gravity;
        this.velocity = constrain(this.velocity, minVelocity, maxVelocity);
        this.y += this.velocity;
    }

    jump() {
        this.velocity = this.lift;
    }

    isDead() {
        return (this.y > height - this.r || this.y < this.r);
    }

    think(closestPipe) {
        // default value if there are no pipes
        let pipeX = width;
        let pipeTop = 0;
        let pipeBottom = height;

        if (closestPipe) {
            pipeX = closestPipe.x;                      // exact x-coordinate of the closestPipe
            pipeTop = closestPipe.top;                  // exact y-coordinate of the top closestPipe
            pipeBottom = height - closestPipe.bottom;   // exact y-coordinate of the bottom closestPipe
        }

        // make sure all inputs are normalized to avoid bias
        let inputs = [
            this.y / height,                                                        // bird vertical position
            (this.velocity - minVelocity) / (maxVelocity - minVelocity),            // bird velocity
            pipeX / width,                                                          // distance to the upcoming pipe
            pipeTop / height,                                                       // top pipe boundary position
            pipeBottom / height,                                                    // bottom pipe boundary position
        ]

        let action = this.brain.predict(inputs);

        let jumpProb = action[0];
        let doNothingProb = action[1];

        if (jumpProb > doNothingProb) {
            this.jump();
        }
    }

    dispose() {
        this.brain.dispose();
    }

    save() {
        this.brain.save();
    }
}