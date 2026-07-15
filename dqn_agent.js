class DQNAgent {
    constructor(stateSize = 5, actionSize = 2) {
        this.stateSize = stateSize;
        this.actionSize = actionSize;

        // variable to store the last training loss to display on the ui
        this.lastLoss = null;
    }

    act(state) {
        return 0;
    }

    remember(state, action, reward, nextState, done) { }

    async replay() { }
}