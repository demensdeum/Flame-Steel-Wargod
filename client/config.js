// Game version and build configuration
export const config = {
    version: '0.2.8',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Armor Debug',
    releaseNotes: 'Fixed armor object synchronization and added client-side validation',
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
