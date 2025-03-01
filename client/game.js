import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import GameMap from './gameMap.js';

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

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.playerId = null;
        this.prevTime = performance.now();
        // Click to start
        const blocker = document.createElement('div');
        blocker.style.position = 'fixed';
        blocker.style.top = '0';
        blocker.style.left = '0';
        blocker.style.width = '100%';
        blocker.style.height = '100%';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.5)';
        blocker.style.display = 'flex';
        blocker.style.justifyContent = 'center';
        blocker.style.alignItems = 'center';
        blocker.style.color = 'white';
        blocker.style.fontSize = '24px';
        blocker.style.cursor = 'pointer';
        blocker.style.zIndex = '999';
        blocker.textContent = 'Click to Play';
        document.body.appendChild(blocker);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new PointerLockControls(this.camera, document.body);
        this.camera.position.y = 1.6; // Eye height

        blocker.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('lock', () => {
            blocker.style.display = 'none';
        });

        this.controls.addEventListener('unlock', () => {
            blocker.style.display = 'flex';
        });

        this.fighters = new Map();
        this.walls = new Set();
        
        this.setupLights();
        this.setupWebSocket();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
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
        fighters.forEach(fighter => {
            // Skip rendering own fighter
            if (fighter.id === this.playerId) {
                return;
            }
            
            let cube = this.fighters.get(fighter.id);
            
            if (!cube) {
                // Create new fighter cube
                const geometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
                const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                cube = new THREE.Mesh(geometry, material);
                this.scene.add(cube);
                this.fighters.set(fighter.id, cube);
            }

            // Update position
            const gridX = Math.floor(fighter.x / this.map.cellSize);
            const gridY = Math.floor(fighter.z / this.map.cellSize);
            cube.position.set(
                gridX - this.map.width/2 + 0.5,
                1,
                gridY - this.map.height/2 + 0.5
            );

            // Update rotation
            cube.rotation.set(fighter.rx, fighter.ry, fighter.rz);
        });

        // Remove disconnected fighters
        const currentIds = new Set(state.fighters.map(f => f.id));
        for (const [id, cube] of this.fighters) {
            if (!currentIds.has(id)) {
                this.scene.remove(cube);
                this.fighters.delete(id);
            }
        }
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
            this.socket.send(JSON.stringify({
                type: 'rotate',
                x: rotation.x,
                y: rotation.y,
                z: rotation.z,
                w: 0
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
        
        // Check center and padded points
        const checkPoints = [
            [x, z],  // Center
            [x + padding, z],  // Right
            [x - padding, z],  // Left
            [x, z + padding],  // Front
            [x, z - padding]   // Back
        ];
        
        // If any check point hits a wall, block movement
        return checkPoints.every(([checkX, checkZ]) => {
            // Convert world to grid coordinates
            const futureX = checkX + this.map.width/2;
            const futureZ = checkZ + this.map.height/2;
            const gridX = Math.floor(futureX);
            const gridZ = Math.floor(futureZ);
            
            return this.map.isEmptyCell(gridX, gridZ);
        });
    }

    updateMovement() {
        if (!this.controls.isLocked) return;

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;
        const moveSpeed = 3.0;

        // Get forward direction from quaternion
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0; // Keep movement horizontal
        forward.normalize();

        // Calculate right vector
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0; // Keep movement horizontal
        right.normalize();

        let moveX = 0;
        let moveZ = 0;

        // Calculate desired movement
        if (this.moveForward) {
            moveX += forward.x * moveSpeed * delta;
            moveZ += forward.z * moveSpeed * delta;
        }
        if (this.moveBackward) {
            moveX -= forward.x * moveSpeed * delta;
            moveZ -= forward.z * moveSpeed * delta;
        }
        if (this.moveLeft) {
            moveX -= right.x * moveSpeed * delta;
            moveZ -= right.z * moveSpeed * delta;
        }
        if (this.moveRight) {
            moveX += right.x * moveSpeed * delta;
            moveZ += right.z * moveSpeed * delta;
        }

        // Check X and Z movements separately
        const futureX = this.camera.position.x + moveX;
        const futureZ = this.camera.position.z + moveZ;

        // Try X movement
        if (this.canMoveInDirection(futureX, this.camera.position.z)) {
            this.camera.position.x = futureX;
        }

        // Try Z movement
        if (this.canMoveInDirection(this.camera.position.x, futureZ)) {
            this.camera.position.z = futureZ;
        }
        
        // Send position update to server
        if (moveX !== 0 || moveZ !== 0) {
            this.socket.send(JSON.stringify({
                type: 'move',
                x: this.camera.position.x + this.map.width/2,
                y: this.camera.position.z + this.map.height/2,
                z: 0
            }));
        }

        this.prevTime = performance.now();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updateMovement();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();
