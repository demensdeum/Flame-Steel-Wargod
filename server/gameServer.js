const WebSocket = require('ws');
const Area = require('./area');
const Fighter = require('./fighter');
const MathUtils = require('./mathUtils');

class GameServer {
    constructor(port = 8080) {
        this.port = port;
        this.clients = new Map(); // Map of WebSocket -> Fighter
        this.arena = new Area();
        this.server = null;
    }

    start() {
        this.server = new WebSocket.Server({ port: this.port });
        
        this.server.on('connection', (ws) => {
            console.log('New client connected');
            
            // Handle new connection
            this.handleNewConnection(ws);

            // Handle messages
            ws.on('message', (message) => {
                this.handleMessage(ws, message);
            });

            // Handle disconnection
            ws.on('close', () => {
                this.handleDisconnection(ws);
            });
        });

        console.log(`Game server started on port ${this.port}`);
    }

    handleNewConnection(ws) {
        // Create a new fighter for this client
        const fighter = new Fighter(`Player${this.clients.size + 1}`);
        this.clients.set(ws, fighter);
        this.arena.addEntity(fighter);

        // Send initial game state
        this.sendGameState(ws);
    }

    handleMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            const fighter = this.clients.get(ws);

            if (!fighter) return;

            switch (data.type) {
                case 'move':
                    fighter.setPosition(data.x, data.y, data.z);
                    break;
                case 'rotate':
                    fighter.setRotation(data.x, data.y, data.z, data.w);
                    break;
                case 'attack':
                    this.handleAttack(fighter, data);
                    break;
            }

            // Broadcast updated game state to all clients
            this.broadcastGameState();
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    handleDisconnection(ws) {
        const fighter = this.clients.get(ws);
        if (fighter) {
            this.arena.removeEntity(fighter);
            this.clients.delete(ws);
        }
        console.log('Client disconnected');
        
        // Broadcast updated game state to remaining clients
        this.broadcastGameState();
    }

    handleAttack(attacker, data) {
        if (!attacker.weapon) return;

        // Get attacker's position and forward direction
        const attackerPos = attacker.getPosition();
        const attackerForward = MathUtils.quaternionToForward(attacker.getRotation());
        
        // Create attack ray
        const rayOrigin = {
            x: attackerPos.x,
            y: attackerPos.y + 1, // Adjust to roughly shoulder height
            z: attackerPos.z
        };
        
        const targets = this.arena.getEntities()
            .filter(entity => entity instanceof Fighter && entity !== attacker)
            .filter(target => {
                // First check if target is within weapon range
                const distance = attacker.getDistanceTo(target);
                if (distance > attacker.weapon.getRange()) return false;

                // Check ray intersection with target's bounding box
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
                    position: target.getPosition() // Send hit position for effects
                });
            }
        });
    }

    sendGameState(ws) {
        const gameState = {
            type: 'gameState',
            entities: this.arena.getEntities().map(entity => ({
                type: entity.constructor.name,
                name: entity.getName(),
                position: entity.getPosition(),
                rotation: entity.getRotation(),
                health: entity instanceof Fighter ? entity.getCurrentHealth() : null
            }))
        };
        ws.send(JSON.stringify(gameState));
    }

    broadcastGameState() {
        const gameState = JSON.stringify({
            type: 'gameState',
            entities: this.arena.getEntities().map(entity => ({
                type: entity.constructor.name,
                name: entity.getName(),
                position: entity.getPosition(),
                rotation: entity.getRotation(),
                health: entity instanceof Fighter ? entity.getCurrentHealth() : null
            }))
        });

        this.clients.forEach((_, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(gameState);
            }
        });
    }

    broadcastEvent(event) {
        const eventMessage = JSON.stringify(event);
        this.clients.forEach((_, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(eventMessage);
            }
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('Game server stopped');
        }
    }
}

module.exports = GameServer;
