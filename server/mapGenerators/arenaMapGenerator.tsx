import GameMap from '../gameMap';
import { CoordinateSystem, WorldPosition } from '../../shared/coordinates';

export function generateArenaMap(): GameMap {
    const width = 32;
    const height = 32;
    const cellSize = 4;
    
    const map = new GameMap(width, height, cellSize);
    
    const coords = new CoordinateSystem(width, height, cellSize);

    // Create walls around the arena
    for (let x = 0; x < width; x++) {
        map.setCell(coords.gridToWorld({ x, z: 0 }), 1);
        map.setCell(coords.gridToWorld({ x, z: height - 1 }), 1);
    }
    
    for (let z = 0; z < height; z++) {
        map.setCell(coords.gridToWorld({ x: 0, z }), 1);
        map.setCell(coords.gridToWorld({ x: width - 1, z }), 1);
    }
    
    // Add some random walls
    for (let i = 0; i < 50; i++) {
        const gridX = Math.floor(Math.random() * (width - 2)) + 1;
        const gridZ = Math.floor(Math.random() * (height - 2)) + 1;
        map.setCell(coords.gridToWorld({ x: gridX, z: gridZ }), 1);
    }
    
    // Add armor spawns
    const numArmorSpawns = 5;
    let spawnsCreated = 0;
    
    while (spawnsCreated < numArmorSpawns) {
        const gridX = Math.floor(Math.random() * width);
        const gridZ = Math.floor(Math.random() * height);
        const worldPos = coords.gridToWorld({ x: gridX, z: gridZ });
        
        if (map.isEmptyCell(worldPos)) {
            map.addArmorSpawn(worldPos);
            spawnsCreated++;
        }
    }
    
    return map;
}
