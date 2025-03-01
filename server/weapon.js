const ArenaObject = require('./arenaObject');

class Weapon extends ArenaObject {
    constructor(name, damage, range, x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1) {
        super(x, y, z, qx, qy, qz, qw);
        this.name = name;
        this.damage = damage;
        this.range = range;
        this.durability = 100;
    }

    getDamage() {
        return this.damage;
    }

    getRange() {
        return this.range;
    }

    getName() {
        return this.name;
    }

    getDurability() {
        return this.durability;
    }

    use() {
        if (this.durability > 0) {
            this.durability -= 1;
            return true;
        }
        return false;
    }

    repair() {
        this.durability = 100;
    }
}

module.exports = Weapon;
