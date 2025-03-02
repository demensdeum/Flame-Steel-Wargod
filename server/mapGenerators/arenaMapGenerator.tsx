import GameMap from '../gameMap';
import { CoordinateSystem, WorldPosition } from '../../shared/coordinates';

export function generateArenaMap(): GameMap {
    const width = 32;
    const height = 32;
    const cellSize = 2; // Smaller cell size for better granularity
    
    const map = new GameMap(width, height, cellSize);
    
    // Create walls around the arena
    for (let x = 0; x < width; x++) {
        map.setCell({ x, z: 0 }, 1);
        map.setCell({ x, z: height - 1 }, 1);
    }
    
    for (let z = 0; z < height; z++) {
        map.setCell({ x: 0, z }, 1);
        map.setCell({ x: width - 1, z }, 1);
    }
    
    // Add tactical cover points
    function addCoverWall(startX: number, startZ: number, length: number, horizontal: boolean) {
        for (let i = 0; i < length; i++) {
            const x = horizontal ? startX + i : startX;
            const z = horizontal ? startZ : startZ + i;
            map.setCell({ x, z }, 1);
        }
    }
    
    // Add symmetric cover points
    const coverPoints = [
        // Center cross
        { x: Math.floor(width * 0.45), z: Math.floor(height * 0.5), length: 3, horizontal: true },
        { x: Math.floor(width * 0.5), z: Math.floor(height * 0.45), length: 3, horizontal: false },
        
        // Corner bunkers
        { x: 4, z: 4, length: 4, horizontal: true },
        { x: 4, z: 4, length: 4, horizontal: false },
        { x: width - 8, z: 4, length: 4, horizontal: true },
        { x: width - 4, z: 4, length: 4, horizontal: false },
        { x: 4, z: height - 8, length: 4, horizontal: true },
        { x: 4, z: height - 8, length: 4, horizontal: false },
        { x: width - 8, z: height - 8, length: 4, horizontal: true },
        { x: width - 4, z: height - 8, length: 4, horizontal: false },
        
        // Mid-point cover
        { x: Math.floor(width * 0.3), z: Math.floor(height * 0.3), length: 3, horizontal: true },
        { x: Math.floor(width * 0.7), z: Math.floor(height * 0.3), length: 3, horizontal: true },
        { x: Math.floor(width * 0.3), z: Math.floor(height * 0.7), length: 3, horizontal: true },
        { x: Math.floor(width * 0.7), z: Math.floor(height * 0.7), length: 3, horizontal: true }
    ];
    
    coverPoints.forEach(point => {
        addCoverWall(point.x, point.z, point.length, point.horizontal);
    });
    
    return map;
}
    
    return map;
}
