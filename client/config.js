// Game version and build configuration
export const config = {
    version: '0.1.0',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Alpha Wolf', // Cool codename for this version
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
