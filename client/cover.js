import { config } from './config.js';

export default class Cover {
    constructor(isMobile, onStart) {
        this.isMobile = isMobile;
        this.blocker = document.createElement('div');
        this.setupBlocker();
        this.setupStartHandlers(onStart);
    }

    setupBlocker() {
        Object.assign(this.blocker.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: '999999',
            touchAction: 'manipulation',
            userSelect: 'none',
            webkitUserSelect: 'none',
            webkitTapHighlightColor: 'transparent',
            flexDirection: 'column'
        });

        // Add cover image
        const cover = document.createElement('img');
        cover.src = './textures/cover.jpg';
        Object.assign(cover.style, {
            maxWidth: '30%',
            height: 'auto',
            marginBottom: '30px',
            borderRadius: '10px',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
        });

        // Create game title
        const title = document.createElement('div');
        title.textContent = this.isMobile ? 'Tap to Play' : 'Click to Play';
        title.style.marginBottom = '20px';

        // Create version info container
        const version = document.createElement('div');
        Object.assign(version.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            fontFamily: 'monospace'
        });

        // Version and build name
        const versionText = document.createElement('div');
        versionText.textContent = `v${config.version} ${config.buildName}`;
        Object.assign(versionText.style, {
            fontSize: '14px',
            opacity: '0.8'
        });

        // Build ID
        const buildId = document.createElement('div');
        buildId.textContent = `Build ${config.buildId}`;
        Object.assign(buildId.style, {
            fontSize: '12px',
            opacity: '0.6'
        });

        // Release notes
        const notes = document.createElement('div');
        notes.textContent = config.releaseNotes;
        Object.assign(notes.style, {
            fontSize: '12px',
            opacity: '0.7',
            maxWidth: '400px',
            textAlign: 'center',
            marginTop: '5px'
        });

        // Assemble version info
        version.appendChild(versionText);
        version.appendChild(buildId);
        version.appendChild(notes);

        // Add all elements to blocker
        this.blocker.appendChild(cover);
        this.blocker.appendChild(title);
        this.blocker.appendChild(version);
        document.body.appendChild(this.blocker);
    }

    setupStartHandlers(onStart) {
        const startGameHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onStart();
        };

        this.blocker.addEventListener('click', startGameHandler);
        this.blocker.addEventListener('touchstart', startGameHandler, { passive: false });
        this.blocker.addEventListener('touchend', startGameHandler, { passive: false });
    }

    show() {
        this.blocker.style.display = 'flex';
    }

    hide() {
        this.blocker.style.display = 'none';
    }
}
