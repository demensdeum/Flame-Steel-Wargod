// Game version and build configuration
export const config = {
    version: '0.2.0',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Mobile Hunter', // Now with mobile controls!
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
