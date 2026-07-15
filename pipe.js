class Pipe {
    // accept a boolean to determine if this is the final pipe
    constructor(isFinishLine = false) {
        this.width = 60;
        this.gap = 110;
        this.speed = 3;

        this.top = random(50, height / 2);
        this.bottom = height - (this.top + this.gap);

        this.x = width;

        // flag that checks if birds passed this pipe or not
        this.passed = false;

        // tag for the golden pipe
        this.isFinishLine = isFinishLine;
    }

    hits(bird) {
        // check x pos
        if (bird.x + bird.r > this.x && bird.x - bird.r < this.x + this.width) {
            // check y pos (top pipe)
            if (bird.y - bird.r < this.top) {
                return true;
            }

            // check y pos (bottom pipe)
            if (bird.y + bird.r > height - this.bottom) {
                return true;
            }
        }

        // not hit
        return false;
    }

    update() {
        this.x -= this.speed;
    }

    show() {
        // change color to gold if it's the final pipe
        if (this.isFinishLine) {
            fill(255, 215, 0); // shiny gold
        } else {
            fill(34, 139, 34); // normal green
        }

        rect(this.x, 0, this.width, this.top);
        rect(this.x, height - this.bottom, this.width, this.bottom);
    }

    offscreen() {
        return this.x < -this.width;
    }
}