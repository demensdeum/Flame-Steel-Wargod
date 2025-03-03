import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export default class CameraControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new PointerLockControls(camera, domElement);
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Mobile detection
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Touch controls state
        this.moveStickActive = false;
        this.lookStickActive = false;
        this.moveStickStartPos = { x: 0, y: 0 };
        this.lookStickStartPos = { x: 0, y: 0 };
        this.moveStickOffset = { x: 0, y: 0 };
        this.lookStickOffset = { x: 0, y: 0 };
        
        if (!this.isMobile) {
            this.setupKeyboardControls();
        }
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
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
    
    setupTouchControls() {
        const moveArea = document.getElementById('moveArea');
        const lookArea = document.getElementById('lookArea');
        
        // Move stick events
        moveArea.addEventListener('touchstart', (e) => {
            this.moveStickActive = true;
            const touch = e.touches[0];
            this.moveStickStartPos = { x: touch.clientX, y: touch.clientY };
        });
        
        moveArea.addEventListener('touchmove', (e) => {
            if (!this.moveStickActive) return;
            const touch = e.touches[0];
            this.moveStickOffset = {
                x: (touch.clientX - this.moveStickStartPos.x) / 50,
                y: (touch.clientY - this.moveStickStartPos.y) / 50
            };
        });
        
        moveArea.addEventListener('touchend', () => {
            this.moveStickActive = false;
            this.moveStickOffset = { x: 0, y: 0 };
        });
        
        // Look stick events
        lookArea.addEventListener('touchstart', (e) => {
            this.lookStickActive = true;
            const touch = e.touches[0];
            this.lookStickStartPos = { x: touch.clientX, y: touch.clientY };
        });
        
        lookArea.addEventListener('touchmove', (e) => {
            if (!this.lookStickActive) return;
            const touch = e.touches[0];
            const sensitivity = 0.002;
            const deltaX = (touch.clientX - this.lookStickStartPos.x) * sensitivity;
            const deltaY = (touch.clientY - this.lookStickStartPos.y) * sensitivity;
            this.controls.rotateY(-deltaX);
            this.lookStickStartPos = { x: touch.clientX, y: touch.clientY };
        });
        
        lookArea.addEventListener('touchend', () => {
            this.lookStickActive = false;
        });
    }
    
    update(canMoveToFn) {
        if (this.isMobile && this.moveStickActive) {
            this.moveForward = this.moveStickOffset.y < -0.1;
            this.moveBackward = this.moveStickOffset.y > 0.1;
            this.moveLeft = this.moveStickOffset.x < -0.1;
            this.moveRight = this.moveStickOffset.x > 0.1;
        }
        
        // Calculate velocity
        const speed = 0.15;
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveLeft) - Number(this.moveRight); // Fix inverted left/right movement
        this.direction.normalize();
        
        if (this.moveForward || this.moveBackward) {
            this.velocity.z = this.direction.z * speed;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x = this.direction.x * speed;
        }
        
        // Get movement in camera direction
        if (this.velocity.x !== 0 || this.velocity.z !== 0) {
            const cameraDirection = this.controls.getDirection(new THREE.Vector3());
            const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
            
            const moveX = this.velocity.x * Math.cos(-angle) - this.velocity.z * Math.sin(-angle);
            const moveZ = this.velocity.x * Math.sin(-angle) + this.velocity.z * Math.cos(-angle);
            
            // Check if we can move to the new position
            const newX = this.camera.position.x + moveX;
            const newZ = this.camera.position.z + moveZ;
            
            if (canMoveToFn(newX, this.camera.position.z)) {
                this.camera.position.x = newX;
            }
            if (canMoveToFn(this.camera.position.x, newZ)) {
                this.camera.position.z = newZ;
            }
        }
    }
    
    lock() {
        this.controls.lock();
    }
    
    unlock() {
        this.controls.unlock();
    }
    
    isLocked() {
        return this.controls.isLocked;
    }
    
    addEventListener(event, callback) {
        this.controls.addEventListener(event, callback);
    }
    
    removeEventListener(event, callback) {
        this.controls.removeEventListener(event, callback);
    }
}
