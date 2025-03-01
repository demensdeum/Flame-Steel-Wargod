// Game version and build configuration
export const config = {
    version: '0.2.2',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Touch Warrior', // Improved touch controls with HUD fix
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
