export default class DebugMap {
    constructor() {
        // Create debug map canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '10px';
        this.canvas.style.right = '10px';
        this.canvas.style.width = '200px';
        this.canvas.style.height = '200px';
        this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.canvas.style.border = '1px solid white';
        this.canvas.style.zIndex = '1000';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
    }

    update(data, camera, fighters, walls, armorCubes) {
        const mapWidth = 200;
        const mapHeight = 200;
        this.canvas.width = mapWidth;
        this.canvas.height = mapHeight + 100; // Extra space for debug text

        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, mapWidth, mapHeight + 100);

        // Draw walls
        ctx.fillStyle = '#666';
        walls.forEach(wall => {
            const x = (wall.position.x + data.map.width/2) * (mapWidth/data.map.width);
            const y = (wall.position.z + data.map.height/2) * (mapHeight/data.map.height);
            ctx.fillRect(x-2, y-2, 4, 4);
        });

        // Draw armor cubes
        ctx.fillStyle = '#ff00ff';
        armorCubes.forEach(cube => {
            const x = (cube.position.x + data.map.width/2) * (mapWidth/data.map.width);
            const y = (cube.position.z + data.map.height/2) * (mapHeight/data.map.height);
            ctx.fillRect(x-3, y-3, 6, 6);
        });

        // Draw other players
        ctx.fillStyle = '#ff0000';
        fighters.forEach(fighter => {
            if (fighter.position) {
                const x = (fighter.position.x + data.map.width/2) * (mapWidth/data.map.width);
                const y = (fighter.position.z + data.map.height/2) * (mapHeight/data.map.height);
                ctx.fillRect(x-2, y-2, 4, 4);
            }
        });

        // Draw player (camera position)
        const playerX = Math.floor(camera.position.x);
        const playerZ = Math.floor(camera.position.z);
        const x = (camera.position.x + data.map.width/2) * (mapWidth/data.map.width);
        const y = (camera.position.z + data.map.height/2) * (mapHeight/data.map.height);
        
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x-3, y-3, 6, 6);

        // Draw debug text
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`Grid: ${playerX},${playerZ}`, 5, mapHeight + 12);
        ctx.fillText(`Scene: ${camera.position.x.toFixed(1)},${camera.position.z.toFixed(1)}`, 5, mapHeight + 24);
        ctx.fillText(`Armor: ${data.armor}`, 5, mapHeight + 36);
        
        // Display armor respawn timers from server
        if (data.map && data.map.armorRespawnInfo) {
            let timerY = mapHeight + 48;
            for (const info of data.map.armorRespawnInfo) {
                ctx.fillText(`Armor at ${info.x},${info.z} respawns in: ${info.timeLeft}s`, 5, timerY);
                timerY += 12;
            }
        }
    }

    hide() {
        this.canvas.style.display = 'none';
    }

    show() {
        this.canvas.style.display = 'block';
    }
}
