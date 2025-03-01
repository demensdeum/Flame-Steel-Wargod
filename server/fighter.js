const Weapon = require('./weapon');
const Armor = require('./armor');
const ArenaObject = require('./arenaObject');

class Fighter extends ArenaObject {
    static nextId = 1;

    constructor(name, maxHealth = 100, x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1) {
        super(x, y, z, 1, 2, 1, qx, qy, qz, qw);
        this.id = Fighter.nextId++;
        this.name = name;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.weapon = null;
        this.armor = null;

        // Expose position and rotation directly
        this.position = { x, y, z };
        this.rotation = { x: qx, y: qy, z: qz };
        
        // Track last update time
        this.lastUpdateTime = Date.now();
    }

    getName() {
        return this.name;
    }

    getCurrentHealth() {
        return this.health;
    }

    getMaxHealth() {
        return this.maxHealth;
    }

    setPosition(x, y, z) {
        super.setPosition(x, y, z);
        this.position = { x, y, z };
        this.lastUpdateTime = Date.now();
    }

    setRotation(x, y, z, w) {
        super.setRotation(x, y, z, w);
        this.rotation = { x, y, z };
        this.lastUpdateTime = Date.now();
    }

    equip(item) {
        if (item instanceof Weapon) {
            this.weapon = item;
            return true;
        } else if (item instanceof Armor) {
            this.armor = item;
            return true;
        }
        return false;
    }

    attack(target) {
        if (!this.weapon) {
            return 0;
        }
        
        if (this.weapon.use()) {
            return this.weapon.getDamage();
        }
        return 0;
    }

    takeDamage(damage) {
        let actualDamage = damage;
        
        if (this.armor) {
            actualDamage = Math.max(0, damage - this.armor.getDefense());
            this.armor.takeDamage(damage);
        }

        this.health = Math.max(0, this.health - actualDamage);
        return actualDamage;
    }

    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health - oldHealth;
    }

    isAlive() {
        return this.health > 0;
    }

    respawn() {
        this.health = this.maxHealth;
    }
}

module.exports = Fighter;
