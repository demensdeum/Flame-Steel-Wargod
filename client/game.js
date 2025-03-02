import * as THREE from 'three';
import CameraControls from './cameraControls.js';
import GameMap from './gameMap.js';
import HUD from './hud.js';
import { config } from './config.js';

const CELL_SIZE = 64; // Grid cell size in pixels
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

        // Create debug map canvas
        this.debugMapCanvas = document.createElement('canvas');
        this.debugMapCanvas.style.position = 'fixed';
        this.debugMapCanvas.style.top = '10px';
        this.debugMapCanvas.style.right = '10px';
        this.debugMapCanvas.style.width = '200px';
        this.debugMapCanvas.style.height = '200px';
        this.debugMapCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.debugMapCanvas.style.border = '1px solid white';
        this.debugMapCanvas.style.zIndex = '1000';
        document.body.appendChild(this.debugMapCanvas);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        
        // Create armor cube geometry and material
        this.armorGeometry = new THREE.BoxGeometry(1, 1, 1);
        this.armorMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff,     // Bright magenta
            emissive: 0xff00ff,  // Full bright glow
            transparent: true,
            opacity: 1.0,        // Fully opaque
            side: THREE.DoubleSide // Visible from both sides
        });
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
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Add directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);

        // Add point lights for better visibility
        const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
        pointLight1.position.set(0, 10, 0);
        this.scene.add(pointLight1);
    }

    setupWebSocket() {
        this.socket = new WebSocket(`ws://${window.location.host}`);
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };
    }

    handleServerMessage(data) {
        console.log('Received message:', {
            type: data.type,
            hasMap: data.map ? true : false,
            mapDetails: data.map ? {
                width: data.map.width,
                height: data.map.height,
                numArmor: data.map.armorObjects?.length
            } : null,
            armorObjects: data.armorObjects
        });
        if (data.type === 'connected') {
            this.playerId = data.id;
            this.map = new GameMap(data.map);
            console.log('Map data:', this.map);
            this.createMap(data.map);
            return;
        }
        
        switch (data.type) {
            case 'armorPickup':
                // Update armor objects
                if (data.armorObjects) {
                    // Track active armor IDs
                    const activeArmorIds = new Set();
                    
                    data.armorObjects.forEach(armorData => {
                        if (!armorData.position || typeof armorData.position.x !== 'number' || 
                            typeof armorData.position.y !== 'number' || 
                            typeof armorData.position.z !== 'number') {
                            console.error('Invalid armor object position:', armorData);
                            throw new Error('Armor object missing valid position');
                        }
                        
                        activeArmorIds.add(armorData.id);
                        
                        // Find existing cube or create new one
                        let cube = this.armorCubes.find(c => c.userData.id === armorData.id);
                        
                        if (!cube) {
                            // Create new armor cube
                            cube = new THREE.Mesh(this.armorGeometry, this.armorMaterial.clone());
                            cube.scale.set(1.5, 1.5, 1.5);
                            cube.userData.id = armorData.id;
                            this.armorCubes.push(cube);
                            this.scene.add(cube);
                        }
                        
                        // Update position and properties
                        const pos = armorData.position;
                        // Store original coordinates for grid calculation
                        cube.userData.originalX = pos.x;
                        cube.userData.originalZ = pos.z;
                        // Convert from grid coordinates to scene coordinates
                        const sceneX = (pos.x / CELL_SIZE) - this.map.width/2 + 0.5;
                        const sceneY = pos.y;
                        const sceneZ = (pos.z / CELL_SIZE) - this.map.height/2 + 0.5;
                        
                        cube.position.set(sceneX, sceneY, sceneZ);
                        cube.userData.defense = armorData.defense;
                    });
                    
                    // Remove inactive armor cubes
                    this.armorCubes = this.armorCubes.filter(cube => {
                        if (!activeArmorIds.has(cube.userData.id)) {
                            console.log('Removing armor cube:', cube.userData.id);
                            this.scene.remove(cube);
                            return false;
                        }
                        return true;
                    });
                }
                
                // If this player picked up armor, update HUD
                if (data.playerId === this.playerId && data.armor !== undefined) {
                    console.log('Player picked up armor:', data.armor);
                    this.armor = data.armor;
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
        
        // Update armor objects from server data
        console.log('Updating armor objects:', {
            received: mapData.armorObjects,
            currentCubes: this.armorCubes.map(c => ({ 
                id: c.userData.id,
                position: c.position,
                visible: c.visible,
                parent: c.parent ? 'scene' : 'none'
            }))
        });
        if (Array.isArray(mapData.armorObjects)) {
            const activeArmorIds = new Set();
            
            mapData.armorObjects.forEach(armorData => {
                console.log('Processing armor:', armorData);
                if (!armorData.position || typeof armorData.position.x !== 'number' || 
                    typeof armorData.position.y !== 'number' || 
                    typeof armorData.position.z !== 'number') {
                    console.error('Invalid armor object position:', armorData);
                    throw new Error('Armor object missing valid position');
                }
                
                activeArmorIds.add(armorData.id);
                
                // Find existing cube or create new one
                let cube = this.armorCubes.find(c => c.userData.id === armorData.id);
                
                if (!cube) {
                    console.log('Creating new armor cube for:', armorData.id);
                    // Create new armor cube
                    console.log('Creating armor cube:', armorData);
                    cube = new THREE.Mesh(this.armorGeometry, this.armorMaterial.clone());
                    cube.scale.set(1.5, 1.5, 1.5); // Make them bigger
                    cube.userData.id = armorData.id;
                    this.armorCubes.push(cube);
                    this.scene.add(cube);
                    console.log('Added cube to scene, total cubes:', this.armorCubes.length);
                }
                
                // Update position and properties
                const pos = armorData.position;
                // Store original coordinates for grid calculation
                cube.userData.originalX = pos.x;
                cube.userData.originalZ = pos.z;
                // Convert from grid coordinates to scene coordinates
                const sceneX = (pos.x / CELL_SIZE) - mapData.width/2 + 0.5;
                const sceneY = pos.y;
                const sceneZ = (pos.z / CELL_SIZE) - mapData.height/2 + 0.5;
                
                cube.position.set(sceneX, sceneY, sceneZ);
                console.log('Armor position conversion:', {
                    id: armorData.id,
                    grid: pos,
                    scene: {x: sceneX, y: sceneY, z: sceneZ}
                });
                cube.userData.defense = armorData.defense;
                
                console.log('Armor cube position:', {
                    id: armorData.id,
                    world: pos,
                    scene: {x: sceneX, y: sceneY, z: sceneZ},
                    actual: cube.position
                });
            });
            
            // Remove inactive armor cubes
            const beforeCount = this.armorCubes.length;
            this.armorCubes = this.armorCubes.filter(cube => {
                if (!activeArmorIds.has(cube.userData.id)) {
                    console.log('Removing inactive armor cube:', cube.userData.id);
                    this.scene.remove(cube);
                    return false;
                }
                return true;
            });
            console.log('Armor cubes count:', {
                before: beforeCount,
                after: this.armorCubes.length,
                active: activeArmorIds.size
            });
        }
        
        // Create floor using grid units
        const floorGeometry = new THREE.PlaneGeometry(mapData.width, mapData.height);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0066cc,
            transparent: true,
            opacity: 0.5
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, 0);
        this.scene.add(floor);

        // Create ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(mapData.width, mapData.height);
        const ceilingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White
            transparent: true,
            opacity: 0.5
        });
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
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
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
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.5
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
                    (fighter.x / CELL_SIZE) - this.map.width/2 + 0.5,
                    1,
                    (fighter.z / CELL_SIZE) - this.map.height/2 + 0.5
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

    checkArmorPickup(serverX, serverZ) {
        // Server handles all armor pickup detection
        // Just log position for debugging
        console.log('Fighter position:', {
            server: {x: serverX, z: serverZ},
            camera: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            }
        });
    }

    updateMovement() {
        // Get current position
        const pos = this.camera.position;
        
        // Convert scene coordinates to server coordinates
        const serverX = (pos.x + this.map.width/2) * CELL_SIZE;
        const serverZ = (pos.z + this.map.height/2) * CELL_SIZE;
        
        // Check for armor pickup
        this.checkArmorPickup(serverX, serverZ);

        // Send position update to server
        this.socket.send(JSON.stringify({
            type: 'move',
            x: serverX,
            y: pos.y,
            z: serverZ
        }));
        
        this.prevTime = performance.now();
    }

    printSceneDebug() {
        console.log('=== THREE.JS SCENE DEBUG ===');
        console.log('Camera:', {
            position: this.camera.position.clone(),
            rotation: this.camera.rotation.clone(),
            quaternion: this.camera.quaternion.clone()
        });

        console.log('Scene hierarchy:');
        let objectsCount = { total: 0 };
        this.scene.traverse(obj => {
            objectsCount.total++;
            objectsCount[obj.type] = (objectsCount[obj.type] || 0) + 1;
        });

        console.log('Scene objects count:', objectsCount);

        console.log('Armor cubes:', {
            total: this.armorCubes.length,
            cubes: this.armorCubes.map(cube => ({
                id: cube.userData.id,
                position: cube.position.clone(),
                worldPosition: cube.getWorldPosition(new THREE.Vector3()),
                scale: cube.scale.clone(),
                visible: cube.visible,
                inScene: this.scene.children.includes(cube),
                material: {
                    type: cube.material.type,
                    color: '#' + cube.material.color.getHexString(),
                    opacity: cube.material.opacity,
                    transparent: cube.material.transparent,
                    visible: cube.material.visible
                }
            }))
        });

        console.log('Fighters:', {
            total: this.fighters.size,
            fighters: Array.from(this.fighters.entries()).map(([id, mesh]) => ({
                id,
                position: mesh.position.clone(),
                worldPosition: mesh.getWorldPosition(new THREE.Vector3()),
                visible: mesh.visible
            }))
        });

        console.log('Walls:', {
            total: this.walls.size,
            firstWall: this.walls.size > 0 ? {
                position: Array.from(this.walls)[0].position.clone(),
                visible: Array.from(this.walls)[0].visible
            } : null
        });

        console.log('========================');
    }

    updateDebugMap() {
        if (!this.map) return;
        
        const canvas = this.debugMapCanvas;
        const ctx = canvas.getContext('2d');
        const cellSize = 10; // Size of each grid cell in pixels
        
        // Set canvas size to match grid
        canvas.width = this.map.width * cellSize;
        canvas.height = this.map.height * cellSize + 40; // Extra space for debug info
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
        for (let x = 0; x <= this.map.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, this.map.height * cellSize);
            ctx.stroke();
        }
        for (let y = 0; y <= this.map.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(this.map.width * cellSize, y * cellSize);
            ctx.stroke();
        }
        
        // Draw walls
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.map.grid[y][x] === 1) {
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
        
        // Draw armor cubes
        this.armorCubes.forEach(cube => {
            const gridX = Math.floor(cube.userData.originalX / CELL_SIZE);
            const gridZ = Math.floor(cube.userData.originalZ / CELL_SIZE);
            
            // Draw cube background
            ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
            ctx.fillRect(gridX * cellSize, gridZ * cellSize, cellSize, cellSize);
            
            // Draw cube border
            ctx.strokeStyle = 'magenta';
            ctx.strokeRect(gridX * cellSize, gridZ * cellSize, cellSize, cellSize);
            
            // Draw cube ID
            ctx.fillStyle = 'white';
            ctx.font = '8px monospace';
            ctx.fillText(cube.userData.id.split('_')[1], gridX * cellSize + 2, gridZ * cellSize + 8);
        });
        
        // Draw player position
        const playerX = Math.floor((this.camera.position.x + this.map.width/2) * CELL_SIZE / CELL_SIZE);
        const playerZ = Math.floor((this.camera.position.z + this.map.height/2) * CELL_SIZE / CELL_SIZE);
        
        // Draw player circle
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.arc(playerX * cellSize + cellSize/2, playerZ * cellSize + cellSize/2, cellSize/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player direction
        const angle = Math.atan2(this.camera.rotation.x, this.camera.rotation.z);
        ctx.beginPath();
        ctx.moveTo(playerX * cellSize + cellSize/2, playerZ * cellSize + cellSize/2);
        ctx.lineTo(
            playerX * cellSize + cellSize/2 + Math.cos(angle) * cellSize,
            playerZ * cellSize + cellSize/2 + Math.sin(angle) * cellSize
        );
        ctx.strokeStyle = 'lime';
        ctx.stroke();
        
        // Draw debug info
        const mapHeight = this.map.height * cellSize;
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`Grid: ${playerX},${playerZ}`, 5, mapHeight + 12);
        ctx.fillText(`Scene: ${this.camera.position.x.toFixed(1)},${this.camera.position.z.toFixed(1)}`, 5, mapHeight + 24);
        ctx.fillText(`Armor: ${this.armor}`, 5, mapHeight + 36);
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
            // Update debug map
            this.updateDebugMap();
        }
        
        // Print debug every 2 seconds
        const currentTime = Date.now();
        if (currentTime - (this._lastDebugTime || 0) > 2000) {
            this.printSceneDebug();
            this._lastDebugTime = currentTime;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();
