class ArenaObject {
    constructor(x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1) {
        this.position = { x, y, z };
        this.rotation = { x: qx, y: qy, z: qz, w: qw };
    }

    setPosition(x, y, z) {
        this.position = { x, y, z };
    }

    getPosition() {
        return { ...this.position };
    }

    setRotation(x, y, z, w) {
        this.rotation = { x, y, z, w };
    }

    getRotation() {
        return { ...this.rotation };
    }

    getDistanceTo(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const dz = this.position.z - other.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

module.exports = ArenaObject;
