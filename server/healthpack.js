const ArenaObject = require('./arenaObject');

class Healthpack extends ArenaObject {
    constructor(healingPower = 50, x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1) {
        super(x, y, z, qx, qy, qz, qw);
        this.healingPower = healingPower;
        this.used = false;
    }

    getHealingPower() {
        return this.healingPower;
    }

    isUsed() {
        return this.used;
    }

    use() {
        if (!this.used) {
            this.used = true;
            return this.healingPower;
        }
        return 0;
    }
}

module.exports = Healthpack;
