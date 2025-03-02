import * as THREE from 'three';
import { config } from './config.js';
import { 
    WorldPosition, 
    ObjectData, 
    FighterData, 
    ArmorCubeUserData 
} from './types';

export default class SceneManager {
    private scene: THREE.Scene;
    private mapWidth: number;
    private mapHeight: number;
    private cellSize: number;
    
    // Object collections
    private armorCubes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[];
    private fighters: Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>;
    
    // Reusable geometries and materials
    private armorGeometry!: THREE.BoxGeometry;
    private armorMaterial!: THREE.MeshPhongMaterial;
    private fighterGeometry!: THREE.BoxGeometry;
    private fighterMaterial!: THREE.MeshStandardMaterial;
    
    constructor(scene: THREE.Scene, mapWidth: number, mapHeight: number, cellSize: number) {
        this.scene = scene;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.cellSize = cellSize;
        
        this.armorCubes = [];
        this.fighters = new Map();
        
        this.createGeometriesAndMaterials();
    }
    
    private createGeometriesAndMaterials(): void {
        // Armor cube
        this.armorGeometry = new THREE.BoxGeometry(4, 4, 4);
        this.armorMaterial = new THREE.MeshPhongMaterial({
            color: 0xff00ff,
            emissive: 0x440044,
            shininess: 30,
            specular: 0x804080
        });
        
        // Fighter
        this.fighterGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
        this.fighterMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    }
    
    // Convert grid coordinates to world coordinates
    private gridToWorld(x: number, z: number): WorldPosition {
        return {
            x: (x - this.mapWidth/2) * this.cellSize,
            z: (z - this.mapHeight/2) * this.cellSize
        };
    }
    
    // Create Methods
    public createArmorCube(data: ObjectData): THREE.Mesh {
        const cube = new THREE.Mesh(this.armorGeometry, this.armorMaterial);
        const worldPos = this.gridToWorld(data.x, data.z);
        
        cube.position.set(worldPos.x, 16, worldPos.z);
        
        // Store animation parameters
        const userData: ArmorCubeUserData = {
            initialY: cube.position.y,
            bobSpeed: 0.002,
            bobHeight: 4,
            rotateSpeed: 0.02,
            timeOffset: Math.random() * Math.PI * 2,
            objectId: data.objectId
        };
        cube.userData = userData;
        
        cube.rotation.y = Math.PI / 4;
        
        this.scene.add(cube);
        this.armorCubes.push(cube);
        
        return cube;
    }
    
    public createFighter(data: ObjectData): THREE.Mesh {
        const cube = new THREE.Mesh(this.fighterGeometry, this.fighterMaterial);
        const worldPos = this.gridToWorld(data.x, data.z);
        
        cube.position.set(worldPos.x, 1, worldPos.z);
        cube.userData.objectId = data.objectId;
        
        this.scene.add(cube);
        this.fighters.set(data.objectId, cube);
        
        if (config.debug) {
            console.log(`New fighter created: ${data.objectId}`);
        }
        
        return cube;
    }
    
    // Read Methods
    public getArmorCube(objectId: string): THREE.Mesh | undefined {
        return this.armorCubes.find(cube => cube.userData.objectId === objectId);
    }
    
    public getFighter(objectId: string): THREE.Mesh | undefined {
        return this.fighters.get(objectId);
    }
    
    // Update Methods
    public updateFighter(objectId: string, data: FighterData): void {
        const fighter = this.getFighter(objectId);
        if (fighter) {
            // Update position if provided
            if (data.x !== undefined && data.z !== undefined) {
                const worldPos = this.gridToWorld(data.x, data.z);
                fighter.position.set(worldPos.x, 1, worldPos.z);
            }
            
            // Update rotation if provided
            if (data.rx !== undefined && data.ry !== undefined && data.rz !== undefined) {
                fighter.rotation.set(data.rx, data.ry, data.rz);
            }
        }
    }
    
    public updateArmorCubes(time: number): void {
        this.armorCubes.forEach(cube => {
            const userData = cube.userData as ArmorCubeUserData;
            // Bob up and down with random phase offset
            cube.position.y = userData.initialY + 
                Math.sin(time * 4 + userData.timeOffset) * userData.bobHeight;
            
            // Rotate continuously
            cube.rotation.y += userData.rotateSpeed;
        });
    }
    
    // Delete Methods
    public removeArmorCube(objectId: string): boolean {
        const index = this.armorCubes.findIndex(cube => cube.userData.objectId === objectId);
        if (index !== -1) {
            const cube = this.armorCubes[index];
            this.scene.remove(cube);
            this.armorCubes.splice(index, 1);
            return true;
        }
        return false;
    }
    
    public removeFighter(objectId: string): boolean {
        const fighter = this.fighters.get(objectId);
        if (fighter) {
            this.scene.remove(fighter);
            this.fighters.delete(objectId);
            if (config.debug) {
                console.log(`Fighter removed: ${objectId}`);
            }
            return true;
        }
        return false;
    }
    
    // Cleanup
    public dispose(): void {
        // Dispose of geometries
        this.armorGeometry.dispose();
        this.fighterGeometry.dispose();
        
        // Dispose of materials
        this.armorMaterial.dispose();
        this.fighterMaterial.dispose();
        
        // Clear collections
        this.armorCubes = [];
        this.fighters.clear();
    }
}
