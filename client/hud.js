export default class HUD {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.bottom = '20px';
        this.container.style.left = '20px';
        this.container.style.color = '#ffffff';
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '24px';
        this.container.style.textShadow = '2px 2px 2px #000000';
        
        this.healthDisplay = document.createElement('div');
        this.weaponDisplay = document.createElement('div');
        this.armorDisplay = document.createElement('div');
        
        this.container.appendChild(this.healthDisplay);
        this.container.appendChild(this.weaponDisplay);
        this.container.appendChild(this.armorDisplay);
        
        document.body.appendChild(this.container);
        
        this.health = 100;
        this.currentWeapon = 'Fists';
        this.armor = 0;
    }
    
    update(health, weapon, armor) {
        this.health = health;
        this.currentWeapon = weapon;
        this.armor = armor;
        this.render();
    }
    
    render() {
        this.healthDisplay.textContent = `❤️ Health: ${this.health}`;
        this.weaponDisplay.textContent = `🗡️ Weapon: ${this.currentWeapon}`;
        this.armorDisplay.textContent = `🛡️ Armor: ${this.armor}`;
    }
    
    show() {
        this.container.style.display = 'block';
    }
    
    hide() {
        this.container.style.display = 'none';
    }
}
