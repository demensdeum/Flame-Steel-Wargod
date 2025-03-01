class Viewer {
    constructor(name) {
        this.name = name;
        this.type = 'viewer';
    }

    getName() {
        return this.name;
    }

    getPosition() {
        return { x: 0, y: 0, z: 0 }; // Viewers don't have a physical position
    }

    getRotation() {
        return { x: 0, y: 0, z: 0, w: 1 }; // Viewers don't have rotation
    }
}

module.exports = Viewer;
