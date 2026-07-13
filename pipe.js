class Pipe {
    constructor() {
        this.width = 60;
        this.gap = 130;
        this.speed = 3;

        this.top = random(50, height / 2);
        this.bottom = height - (this.top + this.gap);

        this.x = width;

        // flag that checks if birds passed this pipe or not
        this.passed = false;
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
        fill(34, 139, 34);

        rect(this.x, 0, this.width, this.top);
        rect(this.x, height - this.bottom, this.width, this.bottom);
    }

    offscreen() {
        return this.x < -this.width;
    }
}