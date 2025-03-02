// Game version and build configuration
export const config = {
    version: '0.2.9',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Floating Armor',
    releaseNotes: 'Improved armor pickup visuals with better floating animation and positioning',
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
