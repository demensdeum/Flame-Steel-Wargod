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
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(x / this.map.cellSize);
        const gridZ = Math.floor(z / this.map.cellSize);

        console.log('Checking armor pickup at grid position:', {
            world: {x, y, z},
            grid: {x: gridX, z: gridZ}
        });

        // Check each armor object
        for (const armor of this.map.armorObjects.values()) {
            const pos = armor.getPosition();
            const armorGridX = Math.floor(pos.x / this.map.cellSize);
            const armorGridZ = Math.floor(pos.z / this.map.cellSize);

            console.log('Checking armor object:', {
                id: armor.getName(),
                world: pos,
                grid: {x: armorGridX, z: armorGridZ},
                match: {
                    x: gridX === armorGridX,
                    z: gridZ === armorGridZ,
                    both: gridX === armorGridX && gridZ === armorGridZ
                }
            });

            if (gridX === armorGridX && gridZ === armorGridZ) {
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
