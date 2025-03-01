const ArenaObject = require('./arenaObject');

class Armor extends ArenaObject {
    constructor(name, defense, x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1) {
        super(x, y, z, qx, qy, qz, qw);
        this.name = name;
        this.defense = defense;
        this.durability = 100;
    }

    getDefense() {
        return this.defense * (this.durability / 100);
    }

    getName() {
        return this.name;
    }

    getDurability() {
        return this.durability;
    }

    takeDamage(damage) {
        this.durability = Math.max(0, this.durability - damage * 0.1);
    }

    repair() {
        this.durability = 100;
    }
}

module.exports = Armor;
