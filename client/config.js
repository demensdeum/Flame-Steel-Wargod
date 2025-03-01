// Game version and build configuration
export const config = {
    version: '0.2.5',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Touch Debug', // Added movement debug logging
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
