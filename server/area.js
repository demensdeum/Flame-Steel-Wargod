const CaveMapGenerator = require('./mapGenerators/caveMapGenerator');

class Area {
    constructor(map = new CaveMapGenerator().generate()) {
        this.map = map;
    }

    getMap() {
        return this.map;
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
