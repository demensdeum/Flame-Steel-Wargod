class ArenaObject {
    constructor(x = 0, y = 0, z = 0, width = 1, height = 1, depth = 1, qx = 0, qy = 0, qz = 0, qw = 1) {
        console.log('ArenaObject constructor called with:', { 
            x: typeof x === 'number' ? x : `${x} (${typeof x})`,
            y: typeof y === 'number' ? y : `${y} (${typeof y})`,
            z: typeof z === 'number' ? z : `${z} (${typeof z})`
        });
        
        this.position = { 
            x: Number(x), 
            y: Number(y), 
            z: Number(z) 
        };
        
        if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
            console.error('Invalid position values detected:', { x, y, z });
            throw new Error('Invalid position values');
        }
        
        this.rotation = { x: qx, y: qy, z: qz, w: qw };
        this.boundingBox = {
            width,
            height,
            depth
        };
        console.log('ArenaObject initialized with position:', this.position);
    }

    setPosition(x, y, z) {
        this.position = { x, y, z };
    }

    getPosition() {
        console.log('ArenaObject getPosition called, returning:', this.position);
        return { 
            x: Number(this.position.x),
            y: Number(this.position.y),
            z: Number(this.position.z)
        };
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
