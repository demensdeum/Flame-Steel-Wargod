// Game version and build configuration
export const config = {
    version: '0.2.4',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Touch Visible', // Fixed touch controls visibility
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
