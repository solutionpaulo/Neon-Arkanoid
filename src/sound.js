class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.currentBg = null;
        this.bgVolume = 0.3;
    }

    getLevelTrack(level) {
        const idx = (level % 16) + 1;
        return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${idx}.mp3`;
    }

    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.currentBg) this.currentBg.muted = this.muted;
        const btn = document.getElementById('mute-btn');
        if (btn) btn.innerText = this.muted ? '🔇' : '🔊';
    }

    playOsc(freq, type, duration, volume = 0.1) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHit() { this.playOsc(440, 'triangle', 0.1, 0.1); }
    playBrick() { this.playOsc(330, 'square', 0.1, 0.05); }
    playWall() { this.playOsc(150, 'sine', 0.05, 0.1); }
    playCombo() { this.playOsc(660, 'sine', 0.15, 0.15); }
    playClank() { this.playOsc(100, 'square', 0.08, 0.04); }
    playLaser() { this.playOsc(880, 'sawtooth', 0.12, 0.08); }
    playBomb() { this.playOsc(200, 'sawtooth', 0.3, 0.15); }

    playGameOver() {
        this.playOsc(300, 'sawtooth', 0.4, 0.2);
        setTimeout(() => this.playOsc(200, 'sawtooth', 0.4, 0.2), 200);
        setTimeout(() => this.playOsc(150, 'sawtooth', 0.6, 0.2), 400);
    }

    playWin() {
        this.playOsc(523.25, 'sine', 0.2, 0.2);
        setTimeout(() => this.playOsc(659.25, 'sine', 0.2, 0.2), 150);
        setTimeout(() => this.playOsc(783.99, 'sine', 0.4, 0.2), 300);
    }

    startMusic(level = 0) {
        this.stopMusic();
        if (this.muted) return;
        const url = this.getLevelTrack(level);
        this.currentBg = new Audio(url);
        this.currentBg.loop = true;
        this.currentBg.volume = this.bgVolume;
        this.currentBg.play().catch(() => {});
    }

    stopMusic() {
        if (this.currentBg) {
            this.currentBg.pause();
            this.currentBg.currentTime = 0;
            this.currentBg = null;
        }
    }
}

const sounds = new SoundManager();
