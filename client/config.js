// Game version and build configuration
export const config = {
    version: '0.2.6',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Room Fight', // Using room generator by default
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
