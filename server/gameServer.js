const Area = require('./area');
const Fighter = require('./fighter');
const Viewer = require('./viewer');
const MathUtils = require('./mathUtils');
const TransportFactory = require('./transport/transportFactory');
const TransportLayer = require('./transport/transportLayer');
const CaveMapGenerator = require('./mapGenerators/caveMapGenerator');
const RoomMapGenerator = require('./mapGenerators/roomMapGenerator');
const ArenaMapGenerator = require('./mapGenerators/arenaMapGenerator');

const MapGeneratorType = {
    CAVE: 'cave',
    ROOM: 'room',
    ARENA: 'arena'
};

class GameServer {
    constructor(port = 8080, TransportClass = TransportFactory.WebSocket, maxPlayers = 16, maxViewers = 90) {
        if (!(TransportClass.prototype instanceof TransportLayer)) {
            throw new Error('Transport class must extend TransportLayer');
        }

        this.port = port;
        this.maxPlayers = maxPlayers;
        this.maxViewers = maxViewers;
        this.clients = new Map();
        this.players = new Set();
        this.viewers = new Set();
        this.arena = new Area();
        this.transport = new TransportClass(port);
    }

    start() {
        this.startNewFight();

        this.transport.onConnection((client) => {
            console.log('New client connected');
            this.handleNewConnection(client);
        });

        this.transport.onMessage((client, message) => {
            this.handleMessage(client, message);
        });

        this.transport.onDisconnection((client) => {
            this.handleDisconnection(client);
        });

        this.transport.start();
        console.log(`Game server started on port ${this.port}`);
    }

    startNewFight(generatorType = MapGeneratorType.ARENA) {
        console.log('Starting new fight, creating armor objects...');
        let generator;
        switch (generatorType) {
            case MapGeneratorType.CAVE:
                generator = new CaveMapGenerator();
                break;
            case MapGeneratorType.ROOM:
                generator = new RoomMapGenerator();
                break;
            case MapGeneratorType.ARENA:
            default:
                generator = new ArenaMapGenerator();
                break;
        }
        
        // Generate new map
        const map = generator.generate();
        this.arena = new Area(map);
        
        // Create armor objects at spawn points
        const centerX = Math.floor(map.width / 2);
        const centerY = Math.floor(map.height / 2);
        const radius = Math.min(centerX, centerY) - 5;
        const armorRadius = radius * 0.6;
        
        // Add 4 armor objects in a circle
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const spawnX = Math.floor(centerX + Math.cos(angle) * armorRadius);
            const spawnZ = Math.floor(centerY + Math.sin(angle) * armorRadius);
            
            map.setEmpty(spawnX, spawnZ); // Ensure spot is empty
            const armor = map.addArmorObject(spawnX, spawnZ); // Create armor object at this position
            console.log('Created armor object:', {
                id: armor.getName(),
                position: armor.getPosition(),
                defense: armor.getDefense()
            });
        }
        
        // Respawn all fighters at random points
        Array.from(this.players).forEach(fighter => {
            const spawnPoint = this.arena.getMap().getRandomSpawnPoint();
            fighter.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
            fighter.respawn();
        });

        // Broadcast new fight event with map data including armor objects
        const mapData = this.arena.getMap().getMapData();
        console.log('Broadcasting new fight with armor objects:', {
            numArmorObjects: mapData.armorObjects.length,
            armorObjects: mapData.armorObjects
        });
        
        this.broadcastEvent({
            type: 'newFight',
            map: mapData  // Use the same mapData object
        });

        this.broadcastGameState();
    }

    handleNewConnection(connection) {
        if (this.players.size >= this.maxPlayers) {
            this.transport.send(connection, { type: 'error', message: 'Server is full' });
            this.transport.closeConnection(connection);
            return;
        }

        const fighter = new Fighter(`Player${this.players.size + 1}`);
        
        // Get map and validate spawn point
        const map = this.arena.getMap();
        let spawnPoint = map.getRandomSpawnPoint();
        let attempts = 0;
        const maxAttempts = 10;
        
        // Keep trying to find a valid spawn point
        while (attempts < maxAttempts) {
            // Convert to grid coordinates
            const gridX = Math.floor(spawnPoint.x / map.cellSize);
            const gridY = Math.floor(spawnPoint.z / map.cellSize);
            
            console.log('Trying spawn point:', {
                world: spawnPoint,
                grid: {x: gridX, y: gridY},
                cellSize: map.cellSize
            });
            
            // Validate grid position
            if (gridX >= 0 && gridX < map.width && gridY >= 0 && gridY < map.height) {
                // First check the exact spawn point
                if (map.grid[gridY][gridX] === 0) {
                    // Then check surrounding area
                    let isValid = true;
                    let wallCount = 0;
                    
                    for (let dy = -2; dy <= 2 && isValid; dy++) {
                        for (let dx = -2; dx <= 2 && isValid; dx++) {
                            const checkX = gridX + dx;
                            const checkY = gridY + dy;
                            if (checkX >= 0 && checkX < map.width && checkY >= 0 && checkY < map.height) {
                                if (map.grid[checkY][checkX] === 1) {
                                    wallCount++;
                                    // If wall is too close (in 3x3 area), reject
                                    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                                        isValid = false;
                                    }
                                }
                            }
                        }
                    }
                    
                    // Reject if too many walls nearby
                    if (wallCount > 8) {
                        isValid = false;
                    }
                    
                    if (isValid) {
                        console.log('Valid spawn point found:', {
                            world: spawnPoint,
                            grid: {x: gridX, y: gridY},
                            wallCount: wallCount
                        });
                        break;
                    }
                }
            }
            
            console.log('Invalid spawn point, retrying...');
            spawnPoint = map.getRandomSpawnPoint();
            attempts++;
        }
        
        if (attempts === maxAttempts) {
            console.error('Could not find valid spawn point after', maxAttempts, 'attempts');
        }
        
        fighter.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.clients.set(connection, fighter);
        this.players.add(fighter);

        this.transport.send(connection, { 
            type: 'connected',
            id: fighter.id,
            map: map.getMapData()
        });
        
        console.log('Sent initial map data:', {
            armorObjects: map.getMapData().armorObjects
        });

        // Send game state immediately after connection
        this.broadcastGameState();
    }

    checkArmorPickup(fighter) {
        // Get armor at fighter's position
        const armor = this.arena.getArmorAt(
            fighter.position.x,
            fighter.position.y,
            fighter.position.z
        );

        if (armor) {
            console.log('Fighter picked up armor:', {
                fighter: fighter.id,
                armor: armor.getName(),
                position: armor.getPosition(),
                defense: armor.getDefense()
            });

            // Remove armor from arena
            this.arena.removeArmor(armor.getName());

            // Update fighter's armor
            if (!fighter.armor) fighter.armor = 0;
            fighter.armor += armor.getDefense();

            // Get updated armor objects list
            const armorObjects = this.arena.getArmorObjects().map(a => ({
                id: a.getName(),
                position: a.getPosition(),
                defense: a.getDefense()
            }));

            console.log('Broadcasting armor pickup:', {
                playerId: fighter.id,
                newArmorValue: fighter.armor,
                remainingArmorObjects: armorObjects.length
            });

            // Broadcast pickup event to all clients
            this.broadcastEvent({
                type: 'armorPickup',
                playerId: fighter.id,
                armor: fighter.armor,
                armorObjects: armorObjects
            });
        }
    }

    handleMessage(connection, message) {
        try {
            const data = JSON.parse(message);
            const client = this.clients.get(connection);

            if (!client) return;

            if (client instanceof Viewer) {
                if (data.type === 'becomeFighter') {
                    this.convertViewerToFighter(connection, client);
                }
                return;
            }

            const fighter = client;
            switch (data.type) {
                case 'move':
                    fighter.setPosition(data.x, data.y, data.z);
                    
                    // Check for armor pickup on movement
                    const cellSize = this.arena.getMap().cellSize;
                    const fighterGridX = Math.floor(fighter.position.x / cellSize);
                    const fighterGridZ = Math.floor(fighter.position.z / cellSize);
                    
                    // Check all armor objects
                    for (const [armorId, armor] of this.arena.getMap().armorObjects) {
                        const armorPos = armor.getPosition();
                        const armorGridX = Math.floor(armorPos.x / cellSize);
                        const armorGridZ = Math.floor(armorPos.z / cellSize);
                        
                        console.log('Checking armor pickup:', {
                            fighter: {
                                world: fighter.position,
                                grid: {x: fighterGridX, z: fighterGridZ}
                            },
                            armor: {
                                id: armorId,
                                world: armorPos,
                                grid: {x: armorGridX, z: armorGridZ}
                            },
                            match: {
                                x: fighterGridX === armorGridX,
                                z: fighterGridZ === armorGridZ
                            }
                        });

                        // If fighter is in same grid cell as armor
                        if (fighterGridX === armorGridX && fighterGridZ === armorGridZ) {
                            // Remove armor from arena
                            this.arena.removeArmor(armor.getName());

                            // Update fighter's armor
                            if (!fighter.armor) fighter.armor = 0;
                            fighter.armor += armor.getDefense();

                            // Get updated armor objects list
                            const armorObjects = this.arena.getArmorObjects().map(a => ({
                                id: a.getName(),
                                position: a.getPosition(),
                                defense: a.getDefense()
                            }));

                            console.log('Broadcasting armor pickup:', {
                                playerId: fighter.id,
                                newArmorValue: fighter.armor,
                                remainingArmorObjects: armorObjects.length
                            });

                            // Broadcast pickup event to all clients
                            this.broadcastEvent({
                                type: 'armorPickup',
                                playerId: fighter.id,
                                armor: fighter.armor,
                                armorObjects: armorObjects
                            });
                            
                            // Only pick up one armor at a time
                            break;
                        }
                    }
                    break;
                    
                case 'rotate':
                    fighter.setRotation(data.x, data.y, data.z, data.w);
                    break;
                case 'attack':
                    this.handleAttack(fighter, data);
                    break;
                case 'newFight':
                    this.startNewFight(data.generatorType);
                    break;
                    break;
            }

            // Broadcast updated game state to all clients
            this.broadcastGameState();
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    handleDisconnection(connection) {
        const client = this.clients.get(connection);
        if (client) {
            if (client instanceof Fighter) {
                // Don't remove the fighter immediately, just mark last update time
                // Fighter will be removed after 10 seconds of no updates
                client.lastUpdateTime = Date.now();
            } else if (client instanceof Viewer) {
                this.viewers.delete(client);
            }
            this.clients.delete(connection);
        }
        console.log(`${client instanceof Viewer ? 'Viewer' : 'Player'} disconnected`);
        
        // Broadcast updated game state to remaining clients
        this.broadcastGameState();
    }

    handleAttack(attacker, data) {
        if (!attacker.weapon) return;

        const attackerPos = attacker.getPosition();
        const attackerForward = MathUtils.quaternionToForward(attacker.getRotation());
        
        const rayOrigin = {
            x: attackerPos.x,
            y: attackerPos.y + 1,
            z: attackerPos.z
        };
        
        const targets = Array.from(this.players)
            .filter(entity => entity !== attacker)
            .filter(target => {
                const distance = attacker.getDistanceTo(target);
                if (distance > attacker.weapon.getRange()) return false;

                return MathUtils.rayBoxIntersection(
                    rayOrigin,
                    attackerForward,
                    target.getPosition(),
                    target.boundingBox
                );
            });

        targets.forEach(target => {
            const damage = attacker.attack(target);
            if (damage > 0) {
                const actualDamage = target.takeDamage(damage);
                this.broadcastEvent({
                    type: 'attack',
                    attacker: attacker.getName(),
                    target: target.getName(),
                    damage: actualDamage,
                    position: target.getPosition()
                });

                if (!target.isAlive()) {
                    this.respawnFighter(target);
                }
            }
        });
    }

    sendGameState(client) {
        console.log('Players:', this.players);
        const gameState = {
            type: 'gameState',
            fighters: Array.from(this.players).map(fighter => ({
                id: fighter.id,
                x: fighter.position.x,
                y: fighter.position.y,
                z: fighter.position.z,
                rx: fighter.rotation.x,
                ry: fighter.rotation.y,
                rz: fighter.rotation.z,
                health: fighter.health
            })),
            map: this.arena.getMap().getMapData()
        };
        console.log('Sending game state:', {
            numFighters: gameState.fighters.length,
            mapData: {
                width: gameState.map.width,
                height: gameState.map.height,
                numArmorObjects: gameState.map.armorObjects.length,
                armorObjects: gameState.map.armorObjects
            }
        });
        this.transport.send(client, gameState);
    }

    broadcastGameState() {
        console.log('Broadcasting game state to', this.clients.size, 'clients');
        
        // Check for inactive fighters (no updates in last 10 seconds)
        const now = Date.now();
        const inactiveFighters = Array.from(this.players).filter(fighter => 
            now - fighter.lastUpdateTime > 10000
        );
        
        // Remove inactive fighters
        inactiveFighters.forEach(fighter => {
            console.log(`Removing inactive fighter ${fighter.id}`);
            this.players.delete(fighter);
        });

        // Get map data first to ensure consistent state
        const mapData = this.arena.getMap().getMapData();
        
        // Validate armor objects count
        if (mapData.armorObjects.length < 2) {
            console.error('CRITICAL ERROR: Not enough armor objects:', mapData.armorObjects.length);
            throw new Error('Server crash: Not enough armor objects');
        }
        
        console.log('Map data for broadcast:', {
            numArmorObjects: mapData.armorObjects.length,
            armorObjects: mapData.armorObjects
        });

        const gameState = {
            type: 'gameState',
            fighters: Array.from(this.players).map(fighter => ({
                id: fighter.id,
                x: fighter.position.x,
                y: fighter.position.y,
                z: fighter.position.z,
                rx: fighter.rotation.x,
                ry: fighter.rotation.y,
                rz: fighter.rotation.z,
                health: fighter.health
            })),
            map: mapData  // Use the same mapData object
        };
        console.log('Broadcasting state:', gameState);
        this.transport.broadcast(gameState);
    }

    broadcastEvent(event) {
        this.transport.broadcast(event);
    }

    respawnFighter(fighter) {
        const spawnPoint = this.arena.respawnFighter(fighter);

        this.broadcastEvent({
            type: 'respawn',
            player: fighter.getName(),
            position: spawnPoint
        });

        this.broadcastGameState();
    }

    convertViewerToFighter(connection, viewer) {
        // Check if we can add more fighters
        if (this.players.size >= this.maxPlayers) {
            this.transport.send(connection, { 
                type: 'error', 
                message: 'Cannot become fighter - maximum players reached' 
            });
            return;
        }

        // Remove viewer
        this.viewers.delete(viewer);

        // Create new fighter
        const fighter = new Fighter(`Player${this.players.size + 1}`);
        const spawnPoint = this.arena.getMap().getRandomSpawnPoint();
        fighter.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.clients.set(connection, fighter);
        this.players.add(fighter);

        // Notify client of role change
        this.transport.send(connection, { type: 'connectionType', role: 'player' });

        // Broadcast updated game state
        this.broadcastGameState();
    }

    stop() {
        this.transport.stop();
        console.log('Game server stopped');
    }
}

module.exports = GameServer;
