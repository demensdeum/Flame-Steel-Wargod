import * as THREE from 'three';

export default class FirstPersonControls {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private mouseSensitivity: number = 0.002;
    private moveSpeed: number = 0.1;
    private euler: THREE.Euler;
    private isPointerLocked: boolean = false;
    private onMove: ((movement: { x: number, z: number }) => void) | null = null;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        
        // Set initial camera position and rotation
        this.camera.position.set(0, 2, 5);
        this.camera.rotation.set(0, 0, 0);
        
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    private handleMouseMove(event: MouseEvent): void {
        if (this.isPointerLocked) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            this.euler.y -= event.movementX * this.mouseSensitivity;
            this.euler.x -= event.movementY * this.mouseSensitivity;
            this.euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);
        }
    }

    private handlePointerLockChange(): void {
        this.isPointerLocked = document.pointerLockElement === this.domElement;
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.isPointerLocked || !this.onMove) return;

        const movement = { x: 0, z: 0 };
        const direction = new THREE.Vector3();
        const rotation = this.camera.getWorldDirection(direction);

        switch (event.key.toLowerCase()) {
            case 'w':
                movement.x = rotation.x;
                movement.z = rotation.z;
                break;
            case 's':
                movement.x = -rotation.x;
                movement.z = -rotation.z;
                break;
            case 'a':
                movement.x = -rotation.z;
                movement.z = rotation.x;
                break;
            case 'd':
                movement.x = rotation.z;
                movement.z = -rotation.x;
                break;
            default:
                return;
        }

        if (movement.x !== 0 || movement.z !== 0) {
            // Normalize movement vector
            const length = Math.sqrt(movement.x * movement.x + movement.z * movement.z);
            movement.x /= length;
            movement.z /= length;

            this.onMove(movement);
        }
    }

    public setMoveCallback(callback: (movement: { x: number, z: number }) => void): void {
        this.onMove = callback;
    }

    public setMouseSensitivity(sensitivity: number): void {
        this.mouseSensitivity = sensitivity;
    }

    public setMoveSpeed(speed: number): void {
        this.moveSpeed = speed;
    }

    public dispose(): void {
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
}
