export default class AdService {
    constructor(scene) {
        this.scene = scene;
        this.isAdShowing = false;
    }

    createOverlay(text) {
        const div = document.createElement('div');
        div.id = 'ad-overlay';
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.backgroundColor = 'rgba(0,0,0,0.9)';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.justifyContent = 'center';
        div.style.alignItems = 'center';
        div.style.zIndex = '1000';
        div.style.color = 'white';
        div.style.fontFamily = 'Arial, sans-serif';
        div.innerHTML = `<h1>ADVERTISEMENT</h1><p>${text}</p><div class="loader">Loading...</div>`;
        document.body.appendChild(div);
        return div;
    }

    removeOverlay() {
        const el = document.getElementById('ad-overlay');
        if (el) el.remove();
    }

    showInterstitial() {
        return new Promise((resolve) => {
            if (this.isAdShowing) { resolve(); return; }
            this.isAdShowing = true;

            // Pause Game if possible
            if (this.scene.game.sound.context.state === 'running') {
                this.scene.game.sound.context.suspend();
            }
            this.scene.physics?.pause(); // If physics used

            this.createOverlay('Sponsor Message...');

            setTimeout(() => {
                this.removeOverlay();
                this.isAdShowing = false;
                if (this.scene.game.sound.context.state === 'suspended') {
                    this.scene.game.sound.context.resume();
                }
                this.scene.physics?.resume();
                resolve();
            }, 1500);
        });
    }

    showRewarded(reason) {
        return new Promise((resolve, reject) => {
            if (this.isAdShowing) { reject('Ad already showing'); return; }
            this.isAdShowing = true;

            // Pause
            const wasRunning = this.scene.game.sound.context.state === 'running';
            if (wasRunning) this.scene.game.sound.context.suspend();

            const overlay = this.createOverlay(`Watch video for ${reason}?`);

            // Add Close Button (Simulate fail/close)
            const closeBtn = document.createElement('button');
            closeBtn.innerText = "X";
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '20px';
            closeBtn.style.right = '20px';
            closeBtn.onclick = () => {
                this.removeOverlay();
                this.isAdShowing = false;
                if (wasRunning) this.scene.game.sound.context.resume();
                reject('User closed ad');
            };
            overlay.appendChild(closeBtn);

            setTimeout(() => {
                this.removeOverlay();
                this.isAdShowing = false;
                if (wasRunning) this.scene.game.sound.context.resume();

                // 80% Success Rate
                if (Math.random() < 0.8) {
                    resolve('Reward Granted');
                } else {
                    alert('Ad failed to load');
                    reject('Ad failed');
                }
            }, 2000);
        });
    }
}
