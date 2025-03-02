import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
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
    private controls: OrbitControls;
    private sceneManager!: SceneManager;
    private gameMap: GameMap | null;
    private hud: HUD;
    private ws: WebSocket;
    private playerId: string;
    private health: number;
    private currentWeapon: string;
    private armor: number;
    private lastUpdateTime: number;
    private clock: THREE.Clock;
    
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.gameMap = null;
        this.hud = new HUD();
        this.ws = new WebSocket(config.wsUrl);
        this.playerId = '';
        this.health = 100;
        this.currentWeapon = 'none';
        this.armor = 0;
        this.lastUpdateTime = 0;
        this.clock = new THREE.Clock();
        
        this.setupScene();
        this.setupWebSocket();
        this.setupEventListeners();
        this.animate();
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
        this.ws.onmessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data) as ServerMessage;
            
            switch (message.type) {
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
            }
        };
    }
    
    private setupEventListeners(): void {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        document.addEventListener('keydown', (event) => {
            if (!this.gameMap) return;
            
            const fighter = this.sceneManager.getFighter(this.playerId);
            if (!fighter) return;
            
            const movement = { x: 0, z: 0 };
            
            switch (event.key) {
                case 'w': movement.z = -1; break;
                case 's': movement.z = 1; break;
                case 'a': movement.x = -1; break;
                case 'd': movement.x = 1; break;
            }
            
            if (movement.x !== 0 || movement.z !== 0) {
                const gridX = Math.round((fighter.position.x / this.gameMap.cellSize) + this.gameMap.width/2);
                const gridZ = Math.round((fighter.position.z / this.gameMap.cellSize) + this.gameMap.height/2);
                
                const newGridX = gridX + movement.x;
                const newGridZ = gridZ + movement.z;
                
                if (this.gameMap.isEmptyCell(newGridX, newGridZ)) {
                    const message: ClientMessage = {
                        type: 'objectMoved',
                        objectId: this.playerId,
                        x: newGridX,
                        z: newGridZ
                    };
                    this.ws.send(JSON.stringify(message));
                }
            }
        });
    }
    
    public createMap(data: MapData): void {
        this.gameMap = new GameMap(data);
        this.sceneManager = new SceneManager(
            this.scene,
            this.gameMap.width,
            this.gameMap.height,
            this.gameMap.cellSize
        );
        
        // Load wall texture
        const textureLoader = new THREE.TextureLoader();
        const wallTexture = textureLoader.load('textures/wall.jpg', () => {
            // Create walls
            if (this.gameMap) {
                const wallGeometry = new THREE.BoxGeometry(
                    this.gameMap.cellSize,
                    this.gameMap.cellSize * 2,
                    this.gameMap.cellSize
                );
                const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });
                
                for (let z = 0; z < this.gameMap.height; z++) {
                    for (let x = 0; x < this.gameMap.width; x++) {
                        if (this.gameMap.grid[z][x] === 1) {
                            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                            const worldPos = {
                                x: (x - this.gameMap.width/2) * this.gameMap.cellSize,
                                z: (z - this.gameMap.height/2) * this.gameMap.cellSize
                            };
                            wall.position.set(worldPos.x, this.gameMap.cellSize, worldPos.z);
                            this.scene.add(wall);
                        }
                    }
                }
            }
        });
        
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(
            this.gameMap.worldWidth,
            this.gameMap.worldHeight
        );
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);
        
        // Create armor spawns
        data.armorSpawns.forEach(spawn => {
            this.sceneManager.createArmorCube({
                objectId: spawn.id,
                objectType: 'armor',
                x: spawn.x,
                y: 0,
                z: spawn.z
            });
        });
    }
    
    private updateGameState(state: GameState): void {
        state.fighters.forEach((fighter: FighterData) => {
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
        requestAnimationFrame(this.animate);
        
        const currentTime = this.clock.getElapsedTime();
        if (currentTime - this.lastUpdateTime >= 0.016) { // 60 FPS
            this.sceneManager.updateArmorCubes(currentTime);
            this.controls.update();
            this.lastUpdateTime = currentTime;
        }
        
        this.renderer.render(this.scene, this.camera);
    };
    
    public dispose(): void {
        this.sceneManager.dispose();
        this.ws.close();
        this.renderer.dispose();
    }
}
