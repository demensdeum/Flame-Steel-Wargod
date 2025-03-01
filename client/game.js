import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class Game {
    constructor() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.playerId = null;
        this.prevTime = performance.now();
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new PointerLockControls(this.camera, document.body);
        this.camera.position.y = 1.6; // Eye height

        // Click to start
        const blocker = document.createElement('div');
        blocker.style.position = 'absolute';
        blocker.style.width = '100%';
        blocker.style.height = '100%';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.5)';
        blocker.style.display = 'flex';
        blocker.style.justifyContent = 'center';
        blocker.style.alignItems = 'center';
        blocker.style.color = 'white';
        blocker.style.fontSize = '24px';
        blocker.style.cursor = 'pointer';
        blocker.textContent = 'Click to Play';
        document.body.appendChild(blocker);

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
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);
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
            this.map = data.map;
            this.createMap(data.map);
            return;
        }
        switch (data.type) {
            case 'newFight':
                this.createMap(data.map);
                break;
            case 'gameState':
                this.updateGameState(data);
                break;
        }
    }

    createMap(mapData) {
        console.log('Creating map with data:', mapData);
        // Clear existing walls
        this.walls.forEach(wall => this.scene.remove(wall));
        this.walls.clear();

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(mapData.width * mapData.cellSize, mapData.height * mapData.cellSize);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Create walls
        const wallGeometry = new THREE.BoxGeometry(mapData.cellSize, mapData.cellSize, mapData.cellSize);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });

        for (let x = 0; x < mapData.width; x++) {
            for (let y = 0; y < mapData.height; y++) {
                if (mapData.grid[y][x] === 1) {  // Wall
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(
                        (x * mapData.cellSize) - (mapData.width * mapData.cellSize / 2),
                        mapData.cellSize / 2,
                        (y * mapData.cellSize) - (mapData.height * mapData.cellSize / 2)
                    );
                    this.scene.add(wall);
                    this.walls.add(wall);
                }
            }
        }
    }

    updateGameState(state) {
        console.log('Updating game state:', state);
        // Update fighters
        const fighters = state.fighters || [];
        console.log('Fighters:', fighters);
        fighters.forEach(fighter => {
            let cube = this.fighters.get(fighter.id);
            
            if (!cube) {
                // Create new fighter cube
                const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                cube = new THREE.Mesh(geometry, material);
                this.scene.add(cube);
                this.fighters.set(fighter.id, cube);
            }

            // Update position
            cube.position.set(
                fighter.x - (this.map.width * this.map.cellSize / 2),
                fighter.y,
                fighter.z - (this.map.height * this.map.cellSize / 2)
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

    updateMovement() {
        if (!this.controls.isLocked) return;

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        this.velocity.x = 0;
        this.velocity.z = 0;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        const speed = 5.0;
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * speed * delta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * speed * delta;
        }

        if (this.velocity.x !== 0 || this.velocity.z !== 0) {
            this.controls.moveRight(-this.velocity.x);
            this.controls.moveForward(-this.velocity.z);

            // Send position update to server
            this.socket.send(JSON.stringify({
                type: 'move',
                x: this.camera.position.x + this.map.width/2,
                y: this.camera.position.z + this.map.height/2,
                z: 0
            }));
        }

        this.prevTime = time;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updateMovement();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();
