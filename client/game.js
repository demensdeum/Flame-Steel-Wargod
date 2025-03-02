import * as THREE from 'three';
import CameraControls from './cameraControls.js';
import GameMap from './gameMap.js';
import HUD from './hud.js';
import { config } from './config.js';
import Cover from './cover.js';

class Game {
    // Helper function to validate PNG data
    isPngValid(base64String) {
        try {
            // Remove data:image/png;base64, prefix
            const base64Data = base64String.split(',')[1];
            // Check if we can decode the base64 string
            const decodedData = atob(base64Data);
            // Check PNG signature (first 8 bytes)
            const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            const isValid = pngSignature.every((byte, i) => byte === decodedData.charCodeAt(i));
            if (isValid) {
                console.log('PNG validation successful');
            } else {
                console.error('PNG validation failed: Invalid PNG signature');
            }
            return isValid;
        } catch (e) {
            console.error('PNG validation error:', e);
            return false;
        }
    }
    constructor() {

        this.playerId = null;
        this.prevTime = performance.now();
        
        // Player stats
        this.health = 100;
        this.currentWeapon = 'Fists';
        this.armor = 0;
        
        // Create HUD
        this.hud = new HUD();
        
        // Create cover screen
        this.cover = new Cover(this.isMobile, () => {
            if (this.isMobile) {
                this.cover.hide();
                this.hud.show();
                document.getElementById('touchControls').style.display = 'block';
                this.setupTouchControls();
            } else {
                this.controls.lock();
            }
        });

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        
        // Create armor cube geometry and material
        this.armorGeometry = new THREE.BoxGeometry(1, 1, 1);
        this.armorMaterial = new THREE.MeshPhongMaterial({ color: 0x800080 }); // Purple
        this.armorCubes = [];
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.y = 1.6; // Eye height
        
        // Initialize camera controls
        this.controls = new CameraControls(this.camera, document.body);
        
        // Setup control events
        this.controls.addEventListener('lock', () => {
            this.cover.hide();
            this.hud.show();
        });
        
        this.controls.addEventListener('unlock', () => {
            this.cover.show();
            this.hud.hide();
        });
        
        if (this.isMobile) {
            this.controls.setupTouchControls();
        }

        this.fighters = new Map();
        this.walls = new Set();
        
        this.setupLights();
        this.setupWebSocket();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        document.addEventListener('mousedown', (event) => this.onMouseDown(event));
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    }

    setupLights() {
        // Single bright ambient light like in Wolf3D
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);
    }

    setupWebSocket() {
        this.socket = new WebSocket(`ws://${window.location.host}`);
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };
    }

    handleServerMessage(data) {
        console.log('Received message:', data);
        if (data.type === 'connected') {
            this.playerId = data.id;
            this.map = new GameMap(data.map);
            console.log('Map data:', this.map);
            this.createMap(data.map);
            return;
        }
        
        switch (data.type) {
            case 'armorPickup':
                // Update armor cubes
                if (data.remainingSpawns) {
                    // Clear existing armor cubes
                    this.armorCubes.forEach(cube => this.scene.remove(cube));
                    this.armorCubes = [];
                    
                    // Create new cubes for remaining spawns
                    data.remainingSpawns.forEach(spawn => {
                        const cube = new THREE.Mesh(this.armorGeometry, this.armorMaterial);
                        cube.position.set(
                            spawn.x - this.map.width/2 + 0.5,
                            0.5, // Float above ground
                            spawn.y - this.map.height/2 + 0.5
                        );
                        cube.scale.set(0.5, 0.5, 0.5);
                        this.scene.add(cube);
                        this.armorCubes.push(cube);
                    });
                }
                
                // If this player picked up armor, update HUD
                if (data.fighterId === this.playerId) {
                    this.armor = data.armorAmount;
                    this.hud.update(this.health, this.currentWeapon, this.armor, this.fighters.size + 1);
                }
                break;
                
            case 'newFight':
                this.map = new GameMap(data.map);
                this.createMap(data.map);
                break;
            case 'gameState':
                // Set initial position if this is the first gameState
                if (!this.initialPositionSet) {
                    const myFighter = data.fighters.find(f => f.id === this.playerId);
                    if (myFighter) {
                        // Position in world space - scale by cellSize and center in map
                        this.camera.position.y = 1;
                        this.camera.position.x = (myFighter.x / this.map.cellSize) - this.map.width/2 + 0.5;
                        this.camera.position.z = (myFighter.z / this.map.cellSize) - this.map.height/2 + 0.5;
                        console.log('Set camera position to:', this.camera.position, 'from fighter:', myFighter);
                        this.initialPositionSet = true;
                    }
                }
                this.updateGameState(data);
                break;
        }
    }

    createMap(mapData) {
        console.log('Creating map with data:', mapData);
        // Clear existing walls
        this.walls.forEach(wall => this.scene.remove(wall));
        this.walls.clear();

        // Clear existing armor cubes
        this.armorCubes.forEach(cube => this.scene.remove(cube));
        this.armorCubes = [];
        
        // Create armor cubes at spawn points
        if (mapData.armorSpawns) {
            mapData.armorSpawns.forEach(spawn => {
                const cube = new THREE.Mesh(this.armorGeometry, this.armorMaterial);
                cube.position.set(
                    spawn.x - mapData.width/2 + 0.5,
                    0.5, // Float above ground
                    spawn.y - mapData.height/2 + 0.5
                );
                cube.scale.set(0.5, 0.5, 0.5); // Make cubes smaller
                this.scene.add(cube);
                this.armorCubes.push(cube);
            });
        }
        
        // Create floor using grid units
        const floorGeometry = new THREE.PlaneGeometry(mapData.width, mapData.height);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0066cc });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, 0);
        this.scene.add(floor);

        // Create ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(mapData.width, mapData.height);
        const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 2, 0); // At wall height
        this.scene.add(ceiling);

        // Count walls for instancing
        let wallCount = 0;
        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                if (mapData.grid[y][x] === 1) {
                    wallCount++;
                }
            }
        }

        // Create temporary instanced mesh
        const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
        const tempMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide
        });
        
        const instancedMesh = new THREE.InstancedMesh(wallGeometry, tempMaterial, wallCount);
        this.walls.add(instancedMesh);
        
        // Set instance positions
        let instanceIndex = 0;
        const matrix = new THREE.Matrix4();
        
        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                if (mapData.grid[y][x] === 1) {
                    matrix.setPosition(
                        x - mapData.width/2 + 0.5,
                        1,
                        y - mapData.height/2 + 0.5
                    );
                    instancedMesh.setMatrixAt(instanceIndex, matrix);
                    instanceIndex++;
                }
            }
        }
        
        // Update instance matrices
        instancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedMesh);

        // Load brick texture and update wall materials
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'textures/bricks.png',
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(2, 2);
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearMipMapLinearFilter;
                texture.generateMipmaps = true;
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                
                const brickMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide
                });

                // Update instanced mesh material
                instancedMesh.material = brickMaterial;
            },
            undefined,
            (error) => {
                console.error('Error loading brick texture:', error);
                // Walls already have temporary material, no need to recreate
            }
        );
    }

    updateGameState(state) {
        console.log('Updating game state:', state);
        // Update fighters
        const fighters = state.fighters || [];
        console.log('Fighters:', fighters);
        // Keep track of active fighters
        const activeFighterIds = new Set();

        fighters.forEach(fighter => {
            activeFighterIds.add(fighter.id);

            if (fighter.id === this.playerId) {
                // Update player stats if available
                if (fighter.health !== undefined) this.health = fighter.health;
                if (fighter.weapon !== undefined) this.currentWeapon = fighter.weapon;
                if (fighter.armor !== undefined) this.armor = fighter.armor;
            } else {
                let cube = this.fighters.get(fighter.id);
                
                if (!cube) {
                    // Create new fighter cube
                    const geometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
                    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                    cube = new THREE.Mesh(geometry, material);
                    this.scene.add(cube);
                    this.fighters.set(fighter.id, cube);
                }

                // Update position - convert from server coordinates to world coordinates
                cube.position.set(
                    (fighter.x / this.map.cellSize) - this.map.width/2 + 0.5,
                    1,
                    (fighter.z / this.map.cellSize) - this.map.height/2 + 0.5
                );

                // Update rotation from rx, ry, rz
                if (fighter.rx !== undefined && fighter.ry !== undefined && fighter.rz !== undefined) {
                    cube.rotation.set(fighter.rx, fighter.ry, fighter.rz);
                }
            }
        });

        // Remove disconnected fighters
        for (const [id, cube] of this.fighters) {
            if (!activeFighterIds.has(id)) {
                this.scene.remove(cube);
                this.fighters.delete(id);
            }
        }
        
        // Update HUD with latest fighter count (including current player)
        const totalFighters = activeFighterIds.size; // Count of all active fighters including player
        this.hud.update(this.health, this.currentWeapon, this.armor, totalFighters);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'KeyD':
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    onMouseDown(event) {
        if (event.button === 0 && this.controls.isLocked) { // Left click
            this.socket.send(JSON.stringify({
                type: 'attack'
            }));
        }
    }

    onMouseMove(event) {
        if (this.controls.isLocked) {
            const rotation = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
            // Get quaternion from camera
            const quaternion = this.camera.quaternion;
            this.socket.send(JSON.stringify({
                type: 'rotate',
                x: quaternion.x,
                y: quaternion.y,
                z: quaternion.z,
                w: quaternion.w
            }));
        }
    }

    canMoveTo(x, z) {
        // Convert world to grid coordinates
        const gridX = Math.floor(x + this.map.width/2);
        const gridY = Math.floor(z + this.map.height/2);
        
        // Check bounds
        if (gridX < 0 || gridX >= this.map.width || gridY < 0 || gridY >= this.map.height) {
            return false;
        }
        
        // Check if target cell is empty
        return this.map.grid[gridY][gridX] === 0;
    }

    canMoveInDirection(x, z) {
        // Add padding to avoid getting too close to walls
        const padding = 0.3;
        const stepSize = 0.2; // Size of the step to check ahead
        
        // Check both current position and one step ahead
        const positions = [
            [x, z],  // Current position
            [x + Math.sign(x - this.camera.position.x) * stepSize, z + Math.sign(z - this.camera.position.z) * stepSize]  // One step ahead
        ];
        
        // For each position, check center and padded points
        return positions.every(([posX, posZ]) => {
            const checkPoints = [
                [posX, posZ],  // Center
                [posX + padding, posZ],  // Right
                [posX - padding, posZ],  // Left
                [posX, posZ + padding],  // Front
                [posX, posZ - padding]   // Back
            ];
            
            return checkPoints.every(([checkX, checkZ]) => {
                // Convert world to grid coordinates
                const futureX = checkX + this.map.width/2;
                const futureZ = checkZ + this.map.height/2;
                const gridX = Math.floor(futureX);
                const gridZ = Math.floor(futureZ);
                
                return this.map.isEmptyCell(gridX, gridZ);
            });
        });
    }

    updateMovement() {
        // Get current position
        const pos = this.camera.position;
        
        // Send position update to server
        const serverX = (pos.x + this.map.width/2) * this.map.cellSize;
        const serverZ = (pos.z + this.map.height/2) * this.map.cellSize;
        
        this.socket.send(JSON.stringify({
            type: 'move',
            x: serverX,
            y: pos.y,
            z: serverZ
        }));
        
        this.prevTime = performance.now();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Rotate and bob armor cubes
        const time = Date.now() * 0.001;
        this.armorCubes.forEach(cube => {
            cube.rotation.y = time;
            cube.position.y = 0.5 + Math.sin(time * 2) * 0.1; // Floating animation
        });
        
        // Update camera controls and movement if we have a map
        if (this.map) {
            // Update camera controls with collision check
            this.controls.update((x, z) => this.canMoveTo(x, z));
            // Update server with new position
            this.updateMovement();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();
