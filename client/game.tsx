import * as THREE from 'three';
import FirstPersonControls from './firstPersonControls';
import SceneManager from './sceneManager';
import GameMap from './gameMap';
import HUD from './hud';
import { config } from './config';
import { 
    MapData, 
    GameState, 
    ServerMessage, 
    ClientMessage,
    FighterData 
} from './types';

export default class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: FirstPersonControls;
    private sceneManager: SceneManager | null;
    private gameMap: GameMap | null;
    private hud: HUD;
    private ws: WebSocket;
    private playerId: string;
    private health: number;
    private currentWeapon: string;
    private armor: number;
    private lastUpdateTime: number;
    private clock: THREE.Clock;
    private animationFrameId: number | null;
    
    constructor() {
        try {
            console.log('Initializing game...');
            
            // Initialize Three.js scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
            
            // Initialize camera
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.set(0, 10, 10);
            this.camera.lookAt(0, 0, 0);
            
            // Initialize renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            document.body.appendChild(this.renderer.domElement);
            
            // Initialize first-person controls
            this.controls = new FirstPersonControls(this.camera, this.renderer.domElement);
            this.setupMovementCallback();
            
            // Initialize game state
            this.gameMap = null;
            this.sceneManager = null;
            this.hud = new HUD();
            this.animationFrameId = null;
            this.playerId = '';
            this.health = 100;
            this.currentWeapon = 'none';
            this.armor = 0;
            this.lastUpdateTime = 0;
            this.clock = new THREE.Clock();
            
            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x404040);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(10, 10, 10);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            this.scene.add(directionalLight);
            
            // Create a temporary ground plane
            const groundGeometry = new THREE.PlaneGeometry(100, 100);
            const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            this.scene.add(ground);
            
            console.log('Connecting to WebSocket at:', config.wsUrl);
            this.ws = new WebSocket(config.wsUrl);
            
            this.setupWebSocket();
            this.setupEventListeners();
            this.startAnimation();
            
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Error initializing game:', error);
            throw error; // Re-throw to handle in the UI
        }
    }
    
    private setupScene(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);
        
        // Set camera position
        this.camera.position.set(0, 50, 50);
        this.camera.lookAt(0, 0, 0);
        
        // Configure controls
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2;
    }
    
    private setupWebSocket(): void {
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data) as ServerMessage;
                
                if (!this.sceneManager && message.type !== 'initGame') {
                    console.warn('Received message before game initialization:', message.type);
                    return;
                }
                
                switch (message.type) {
                    case 'initGame':
                        this.playerId = message.playerId;
                        this.createMap(message.mapData);
                        break;
                        
                    case 'gameState':
                        if (message.data) {
                            this.updateGameState(message.data);
                        }
                        break;
                        
                    case 'objectCreated':
                        if (message.objectType && message.objectId && message.x !== undefined && message.z !== undefined) {
                            this.handleObjectCreated(message);
                        }
                        break;
                        
                    case 'objectRemoved':
                        if (message.objectType && message.objectId) {
                            this.handleObjectRemoved(message);
                        }
                        break;
                        
                    case 'armorPickup':
                        if (message.fighterId && message.armorAmount !== undefined) {
                            this.handleArmorPickup(message);
                        }
                        break;
                        
                    default:
                        console.warn('Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
    }
    
    private setupEventListeners(): void {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private setupMovementCallback(): void {
        this.controls.setMoveCallback((movement) => {
            if (!this.gameMap || !this.sceneManager) return;
            
            const fighter = this.sceneManager.getFighter(this.playerId);
            if (!fighter) return;
            
            const gridX = Math.round((fighter.position.x / this.gameMap.cellSize) + this.gameMap.width/2);
            const gridZ = Math.round((fighter.position.z / this.gameMap.cellSize) + this.gameMap.height/2);
            
            const newGridX = gridX + Math.round(movement.x);
            const newGridZ = gridZ + Math.round(movement.z);
            
            if (this.gameMap.isEmptyCell(newGridX, newGridZ)) {
                const message: ClientMessage = {
                    type: 'objectMoved',
                    objectId: this.playerId,
                    x: newGridX,
                    z: newGridZ
                };
                this.ws.send(JSON.stringify(message));
            }
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    public createMap(data: MapData): void {
        try {
            console.log('Creating game map...');
            
            // Initialize game map
            this.gameMap = new GameMap(data);
            if (!this.gameMap) {
                throw new Error('Failed to create GameMap');
            }
            
            // Initialize scene manager
            this.sceneManager = new SceneManager(
                this.scene,
                this.gameMap.width,
                this.gameMap.height,
                this.gameMap.cellSize
            );
            if (!this.sceneManager) {
                throw new Error('Failed to create SceneManager');
            }
            
            // Create floor with temporary material
            const floorGeometry = new THREE.PlaneGeometry(
                this.gameMap.worldWidth,
                this.gameMap.worldHeight
            );
            const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            this.scene.add(floor);
            
            // Create temporary walls
            const tempWallMaterial = new THREE.MeshStandardMaterial({ color: 0x404040 });
            const walls: THREE.Mesh[] = [];
            
            if (this.gameMap.grid) {
                for (let z = 0; z < this.gameMap.height; z++) {
                    for (let x = 0; x < this.gameMap.width; x++) {
                        if (this.gameMap.grid[z][x] === 1) {
                            const wallGeometry = new THREE.BoxGeometry(
                                this.gameMap.cellSize,
                                this.gameMap.cellSize * 2,
                                this.gameMap.cellSize
                            );
                            const wall = new THREE.Mesh(wallGeometry, tempWallMaterial);
                            const worldPos = {
                                x: (x - this.gameMap.width/2) * this.gameMap.cellSize,
                                z: (z - this.gameMap.height/2) * this.gameMap.cellSize
                            };
                            wall.position.set(worldPos.x, this.gameMap.cellSize, worldPos.z);
                            this.scene.add(wall);
                            walls.push(wall);
                        }
                    }
                }
            }
            
            // Load wall texture and update materials
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load('textures/wall.jpg', 
                // onLoad callback
                (wallTexture) => {
                    const wallMaterial = new THREE.MeshStandardMaterial({
                        map: wallTexture,
                        roughness: 0.7,
                        metalness: 0.3
                    });
                    walls.forEach(wall => {
                        wall.material = wallMaterial;
                    });
                },
                // onProgress callback
                undefined,
                // onError callback
                (error) => {
                    console.error('Error loading wall texture:', error);
                }
            );
            
            // Create armor spawns
            if (data.armorSpawns && this.sceneManager) {
                data.armorSpawns.forEach(spawn => {
                    this.sceneManager!.createArmorCube({
                        objectId: spawn.id,
                        objectType: 'armor',
                        x: spawn.x,
                        y: 0,
                        z: spawn.z
                    });
                });
            }
            
            console.log('Map created successfully');
        } catch (error) {
            console.error('Error creating map:', error);
            throw error; // Re-throw to handle it in the caller
        }
    }
    
    private updateGameState(state: GameState): void {
        if (!this.sceneManager || !this.gameMap) {
            console.warn('Received game state before full initialization');
            return;
        }

        try {
            if (!state.fighters) {
                console.warn('Received invalid game state: no fighters data');
                return;
            }

            state.fighters.forEach((fighter: FighterData) => {
                if (!fighter || !fighter.id) {
                    console.warn('Invalid fighter data received');
                    return;
                }

                if (fighter.id === this.playerId) {
                    // Update player stats
                    if (fighter.health !== undefined) {
                        this.health = fighter.health;
                        this.hud.updateHealth(this.health);
                    }
                    if (fighter.weapon !== undefined) {
                        this.currentWeapon = fighter.weapon;
                        this.hud.updateWeapon(this.currentWeapon);
                    }
                    if (fighter.armor !== undefined) {
                        this.armor = fighter.armor;
                        this.hud.updateArmor(this.armor);
                    }
                    if (config.debug) {
                        console.log(`Player stats - Health: ${this.health}, Weapon: ${this.currentWeapon}, Armor: ${this.armor}`);
                    }
                } else {
                    // Update other fighters
                    this.sceneManager.updateFighter(fighter.id, fighter);
                }
            });
        } catch (error) {
            console.error('Error updating game state:', error);
        }
    }
    
    private handleObjectCreated(message: ServerMessage): void {
        if (!message.objectType || !message.objectId || message.x === undefined || message.z === undefined) return;
        
        const objectData = {
            objectId: message.objectId,
            objectType: message.objectType,
            x: message.x,
            y: 0,
            z: message.z
        };
        
        if (message.objectType === 'armor') {
            this.sceneManager.createArmorCube(objectData);
        } else if (message.objectType === 'fighter') {
            if (message.objectId === this.playerId) {
                objectData.y = 1;
            }
            this.sceneManager.createFighter(objectData);
        }
    }
    
    private handleObjectRemoved(message: ServerMessage): void {
        if (!message.objectType || !message.objectId) return;
        
        if (message.objectType === 'armor') {
            this.sceneManager.removeArmorCube(message.objectId);
        } else if (message.objectType === 'fighter') {
            this.sceneManager.removeFighter(message.objectId);
        }
    }
    
    private handleArmorPickup(message: ServerMessage): void {
        if (!message.fighterId || message.armorAmount === undefined) return;
        
        if (message.fighterId === this.playerId) {
            this.armor = message.armorAmount;
            this.hud.updateArmor(this.armor);
        }
    }
    
    private animate = (): void => {
        this.animationFrameId = requestAnimationFrame(this.animate);
        
        const currentTime = this.clock.getElapsedTime();
        if (currentTime - this.lastUpdateTime >= 0.016) { // 60 FPS
            if (this.sceneManager) {
                this.sceneManager.updateArmorCubes(currentTime);
            }
            // Controls are handled by FirstPersonControls class
            this.lastUpdateTime = currentTime;
        }
        
        this.renderer.render(this.scene, this.camera);
    };

    private startAnimation(): void {
        if (!this.animationFrameId) {
            this.animate();
        }
    }
    
    public dispose(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
        this.ws.close();
        this.renderer.dispose();
    }
}
