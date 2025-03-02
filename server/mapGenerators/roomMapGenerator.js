const GameMap = require('../gameMap');

class Room {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.connected = false;
    }

    overlaps(other, padding = 1) {
        return !(this.x - padding > other.x + other.width ||
                this.x + this.width + padding < other.x ||
                this.y - padding > other.y + other.height ||
                this.y + this.height + padding < other.y);
    }

    getCenter() {
        return {
            x: Math.floor(this.x + this.width / 2),
            y: Math.floor(this.y + this.height / 2)
        };
    }
}

class RoomMapGenerator {
    constructor(width = 32, height = 32) {
        this.width = width;
        this.height = height;
        this.minRoomSize = 3;
        this.maxRoomSize = 8;
        this.maxRooms = 15;
        this.rooms = [];
    }

    generate() {
        const map = new GameMap(this.width, this.height);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                map.setWall(x, y);
            }
        }

        this._generateRooms();
        this._carveRooms(map);
        this._connectRooms(map);

        // Add armor spawn points - one in each of the 4 largest rooms
        const sortedRooms = [...this.rooms].sort((a, b) => (b.width * b.height) - (a.width * a.height));
        map.armorSpawns = [];
        
        // Take up to 4 largest rooms
        for (let i = 0; i < 4 && i < sortedRooms.length; i++) {
            const room = sortedRooms[i];
            const center = room.getCenter();
            
            // Offset slightly from center for variety
            const offsetX = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            const offsetY = Math.floor(Math.random() * 3) - 1;
            
            map.armorSpawns.push({
                x: center.x + offsetX,
                y: center.y + offsetY
            });
        }

        return map;
    }

    _generateRooms() {
        for (let i = 0; i < this.maxRooms; i++) {
            const width = Math.floor(Math.random() * (this.maxRoomSize - this.minRoomSize + 1)) + this.minRoomSize;
            const height = Math.floor(Math.random() * (this.maxRoomSize - this.minRoomSize + 1)) + this.minRoomSize;
            const x = Math.floor(Math.random() * (this.width - width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - height - 2)) + 1;

            const newRoom = new Room(x, y, width, height);

            let overlaps = false;
            for (const room of this.rooms) {
                if (newRoom.overlaps(room)) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.rooms.push(newRoom);
            }
        }
    }

    _carveRooms(map) {
        for (const room of this.rooms) {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    map.setEmpty(x, y);
                }
            }
        }
    }

    _connectRooms(map) {
        if (this.rooms.length === 0) return;

        this.rooms[0].connected = true;

        while (this.rooms.some(room => !room.connected)) {
            let bestDistance = Infinity;
            let bestStart = null;
            let bestEnd = null;
            for (const room1 of this.rooms) {
                if (!room1.connected) continue;
                
                for (const room2 of this.rooms) {
                    if (room2.connected) continue;

                    const center1 = room1.getCenter();
                    const center2 = room2.getCenter();
                    const distance = Math.abs(center1.x - center2.x) + Math.abs(center1.y - center2.y);

                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestStart = center1;
                        bestEnd = center2;
                    }
                }
            }

            if (bestStart && bestEnd) {
                this._createCorridor(map, bestStart, bestEnd);
                for (const room of this.rooms) {
                    const center = room.getCenter();
                    if (center.x === bestEnd.x && center.y === bestEnd.y) {
                        room.connected = true;
                        break;
                    }
                }
            }
        }
    }

    _createCorridor(map, start, end) {
        let x = start.x;
        let y = start.y;

        if (Math.random() < 0.5) {
            while (x !== end.x) {
                map.setEmpty(x, y);
                x += (x < end.x) ? 1 : -1;
            }
            while (y !== end.y) {
                map.setEmpty(x, y);
                y += (y < end.y) ? 1 : -1;
            }
        } else {
            while (y !== end.y) {
                map.setEmpty(x, y);
                y += (y < end.y) ? 1 : -1;
            }
            while (x !== end.x) {
                map.setEmpty(x, y);
                x += (x < end.x) ? 1 : -1;
            }
        }
    }

    static generateBasicMap() {
        const generator = new RoomMapGenerator(32, 32);
        return generator.generate();
    }
}

module.exports = RoomMapGenerator;
