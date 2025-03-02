const CaveMapGenerator = require('./mapGenerators/caveMapGenerator');
const Armor = require('./armor');

class Area {
    constructor(map = new CaveMapGenerator().generate()) {
        this.map = map;
    }

    getMap() {
        return this.map;
    }

    getArmorObjects() {
        return Array.from(this.map.armorObjects.values());
    }

    removeArmor(armorId) {
        return this.map.armorObjects.delete(armorId);
    }

    getArmorAt(x, y, z) {
        for (const armor of this.map.armorObjects.values()) {
            const pos = armor.getPosition();
            const dx = pos.x - x;
            const dy = pos.y - y;
            const dz = pos.z - z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance < 1.0) { // Within 1 unit of distance
                return armor;
            }
        }
        return null;
    }

    respawnFighter(fighter) {
        fighter.respawn();
        const spawnPoint = this.map.getRandomSpawnPoint();
        fighter.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        return spawnPoint;
    }

    isPositionValid(position) {
        return this.map.isPositionValid(position);
    }
}

module.exports = Area;
