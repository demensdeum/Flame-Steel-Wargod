// Game version and build configuration
export const config = {
    version: '0.2.7',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Cover Art', // Added game cover art
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
