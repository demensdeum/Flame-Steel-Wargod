import GameMap from '../gameMap';
import { CoordinateSystem, WorldPosition } from '../../shared/coordinates';

interface SpawnPoint {
    x: number;
    z: number;
}

export function generateArenaMap(): GameMap {
    console.log('Starting arena map generation...');
    const width = 32;
    const height = 32;
    const cellSize = 2; // Smaller cell size for better granularity
    
    const map = new GameMap(width, height, cellSize);
    
    console.log('Creating arena walls with dimensions:', { width, height, cellSize });
    
    // Create walls around the arena
    let wallCount = 0;
    
    // Create horizontal walls (top and bottom)
    for (let x = 0; x < width; x++) {
        console.log(`Creating top wall at (${x}, 0)`);
        map.setCell({ x, z: 0 }, 1);
        console.log(`Creating bottom wall at (${x}, ${height - 1})`);
        map.setCell({ x, z: height - 1 }, 1);
        wallCount += 2;
    }
    
    // Create vertical walls (left and right)
    for (let z = 0; z < height; z++) {
        console.log(`Creating left wall at (0, ${z})`);
        map.setCell({ x: 0, z }, 1);
        console.log(`Creating right wall at (${width - 1}, ${z})`);
        map.setCell({ x: width - 1, z }, 1);
        wallCount += 2;
    }
    
    // Verify wall creation
    const topWall = map.getGrid()[0];
    const bottomWall = map.getGrid()[height - 1];
    const leftWall = map.getGrid().map(row => row[0]);
    const rightWall = map.getGrid().map(row => row[width - 1]);
    
    console.log('Wall verification:', {
        topWall: topWall.join(''),
        bottomWall: bottomWall.join(''),
        leftWall: leftWall.join(''),
        rightWall: rightWall.join(''),
        totalWalls: wallCount
    });
    
    // Add tactical cover points
    function addCoverWall(startX: number, startZ: number, length: number, horizontal: boolean) {
        for (let i = 0; i < length; i++) {
            const x = horizontal ? startX + i : startX;
            const z = horizontal ? startZ : startZ + i;
            map.setCell({ x, z }, 1);
        }
    }
    
    // Define spawn points
    const spawnPoints: SpawnPoint[] = [
        { x: 4, z: 4 },                          // Top-left
        { x: width - 5, z: 4 },                  // Top-right
        { x: 4, z: height - 5 },                 // Bottom-left
        { x: width - 5, z: height - 5 },         // Bottom-right
        { x: Math.floor(width/2), z: 4 },        // Top-middle
        { x: Math.floor(width/2), z: height - 5 },// Bottom-middle
        { x: 4, z: Math.floor(height/2) },       // Left-middle
        { x: width - 5, z: Math.floor(height/2) } // Right-middle
    ];
    
    // Add spawn points to map
    spawnPoints.forEach(point => {
        map.addSpawnPoint(point);
    });
    
    // Add symmetric cover points
    const coverPoints = [
        // Center cross
        { x: Math.floor(width * 0.45), z: Math.floor(height * 0.5), length: 3, horizontal: true },
        { x: Math.floor(width * 0.5), z: Math.floor(height * 0.45), length: 3, horizontal: false },
        
        // Corner bunkers
        { x: 6, z: 6, length: 4, horizontal: true },
        { x: 6, z: 6, length: 4, horizontal: false },
        { x: width - 10, z: 6, length: 4, horizontal: true },
        { x: width - 6, z: 6, length: 4, horizontal: false },
        { x: 6, z: height - 10, length: 4, horizontal: true },
        { x: 6, z: height - 6, length: 4, horizontal: false },
        { x: width - 10, z: height - 10, length: 4, horizontal: true },
        { x: width - 6, z: height - 6, length: 4, horizontal: false },
        
        // Mid-point cover
        { x: Math.floor(width * 0.3), z: Math.floor(height * 0.3), length: 3, horizontal: true },
        { x: Math.floor(width * 0.7), z: Math.floor(height * 0.3), length: 3, horizontal: true },
        { x: Math.floor(width * 0.3), z: Math.floor(height * 0.7), length: 3, horizontal: true },
        { x: Math.floor(width * 0.7), z: Math.floor(height * 0.7), length: 3, horizontal: true }
    ];
    
    console.log('Adding cover points:', coverPoints.length);
    
    coverPoints.forEach((point, index) => {
        console.log(`Adding cover point ${index}:`, point);
        addCoverWall(point.x, point.z, point.length, point.horizontal);
    });
    
    // Log final map state
    const wallCells = map.grid.reduce((count, row) => 
        count + row.filter(cell => cell === 1).length, 0
    );
    
    console.log('Map generation complete:', {
        totalWalls: wallCells,
        dimensions: { width, height },
        spawnPoints: map.getSpawnPoints().length
    });
    
    return map;
}
    
    return map;
}
