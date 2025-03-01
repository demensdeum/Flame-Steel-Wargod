export default class HUD {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.pointerEvents = 'none';
        this.container.style.bottom = '20px';
        this.container.style.left = '20px';
        this.container.style.color = '#ffffff';
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '24px';
        this.container.style.textShadow = '2px 2px 2px #000000';
        
        this.healthDisplay = document.createElement('div');
        this.weaponDisplay = document.createElement('div');
        this.armorDisplay = document.createElement('div');
        this.fighterCountDisplay = document.createElement('div');
        
        this.container.appendChild(this.healthDisplay);
        this.container.appendChild(this.weaponDisplay);
        this.container.appendChild(this.armorDisplay);
        this.container.appendChild(this.fighterCountDisplay);
        
        document.body.appendChild(this.container);
        
        this.health = 100;
        this.currentWeapon = 'Fists';
        this.armor = 0;
        this.fighterCount = 0;
    }
    
    update(health, weapon, armor, fighterCount) {
        this.health = health;
        this.currentWeapon = weapon;
        this.armor = armor;
        this.fighterCount = fighterCount;
        this.render();
    }
    
    render() {
        this.healthDisplay.textContent = `❤️ Health: ${this.health}`;
        this.weaponDisplay.textContent = `🗡️ Weapon: ${this.currentWeapon}`;
        this.armorDisplay.textContent = `🛡️ Armor: ${this.armor}`;
        this.fighterCountDisplay.textContent = `👥 Fighters: ${this.fighterCount}`;
    }
    
    show() {
        this.container.style.display = 'block';
    }
    
    hide() {
        this.container.style.display = 'none';
    }
}
