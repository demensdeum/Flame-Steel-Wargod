export default class HUD {
    private healthElement: HTMLElement;
    private weaponElement: HTMLElement;
    private armorElement: HTMLElement;
    
    constructor() {
        this.healthElement = document.getElementById('health') as HTMLElement;
        this.weaponElement = document.getElementById('weapon') as HTMLElement;
        this.armorElement = document.getElementById('armor') as HTMLElement;
    }
    
    public updateHealth(health: number): void {
        this.healthElement.textContent = `Health: ${health}`;
    }
    
    public updateWeapon(weapon: string): void {
        this.weaponElement.textContent = `Weapon: ${weapon}`;
    }
    
    public updateArmor(armor: number): void {
        this.armorElement.textContent = `Armor: ${armor}`;
    }
}
