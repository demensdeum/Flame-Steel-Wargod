// Game version and build configuration
export const config = {
    version: '0.2.7',
    buildId: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14), // YYYYMMDDHHmmss
    buildName: 'Cover Art',
    releaseNotes: 'Added armor pickups, cover art, and touch controls',
    fullVersion: function() {
        return `${this.version}-${this.buildName}-${this.buildId}`;
    }
};
