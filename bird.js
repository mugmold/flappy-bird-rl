let minVelocity = -15;
let maxVelocity = 10;
let birdLift = -15;
let birdRadius = 12;
let birdGravity = 0.6;

class Bird {
    constructor() {
        this.x = xStart;
        this.y = height / 2;
        this.r = birdRadius;
        this.gravity = birdGravity;
        this.velocity = 0;
        this.lift = birdLift;

        // fitness score to track how long the bird survives
        this.fitness = 0;

        // to track how many pipes the bird passed
        this.score = 0;
    }

    show(opacity = 200) {
        push();
        translate(this.x, this.y);

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
        this.velocity += this.lift;
        this.velocity = constrain(this.velocity, minVelocity, maxVelocity);
    }

    isDead() {
        return (this.y > height - this.r || this.y < this.r);
    }

    // extract state logic for easier integration with other rl algorithms
    getState(closestPipe) {
        // default value if there are no pipes
        let pipeX = width;
        let pipeTop = 0;
        let pipeBottom = height;

        if (closestPipe) {
            pipeX = closestPipe.x;                      // exact x-coordinate of the closest pipe
            pipeTop = closestPipe.top;                  // exact y-coordinate of the top closest pipe
            pipeBottom = height - closestPipe.bottom;   // exact y-coordinate of the bottom closest pipe
        }

        // make sure all inputs are normalized to avoid bias
        return [
            this.y / height,                                              // bird vertical position
            (this.velocity - minVelocity) / (maxVelocity - minVelocity),  // bird velocity
            pipeX / width,                                                // distance to the upcoming pipe
            pipeTop / height,                                             // top pipe boundary position
            pipeBottom / height,                                          // bottom pipe boundary position
        ];
    }
}