const Weapon = require('./weapon');
const Armor = require('./armor');
const ArenaObject = require('./arenaObject');

class Fighter extends ArenaObject {
    constructor(name, maxHealth = 100, x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1) {
        super(x, y, z, 1, 2, 1, qx, qy, qz, qw); // width=1, height=2, depth=1 for human-sized character
        this.name = name;
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.weapon = null;
        this.armor = null;
    }

    getName() {
        return this.name;
    }

    getCurrentHealth() {
        return this.currentHealth;
    }

    getMaxHealth() {
        return this.maxHealth;
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

        this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
        return actualDamage;
    }

    heal(amount) {
        const oldHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        return this.currentHealth - oldHealth;
    }

    isAlive() {
        return this.currentHealth > 0;
    }
}

module.exports = Fighter;
