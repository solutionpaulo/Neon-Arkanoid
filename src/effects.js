// ==================== Particles ====================
let particles = [];

class Particle {
    constructor(x, y, color) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1;
        this.color = color;
        this.life = 1;
        this.maxLife = 30 + Math.random() * 30;
        this.decay = 1 / this.maxLife;
        this.size = 2 + Math.random() * 4;
        this.gravity = 0.08;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    get dead() { return this.life <= 0; }
}

function emitBrickParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function emitPaddleParticles(x, y) {
    const cols = ['#00f2ff', '#ffffff', '#7cff01'];
    for (let i = 0; i < 6; i++) {
        const p = new Particle(x, y, cols[Math.floor(Math.random() * cols.length)]);
        p.vx = (Math.random() - 0.5) * 6;
        p.vy = -Math.random() * 5;
        p.gravity = 0.05;
        p.maxLife = 15;
        p.decay = 1 / 15;
        particles.push(p);
    }
}

function clearParticles() { particles.length = 0; }

// ==================== Screen Shake + Flash ====================
const shake = { intensity: 0, decay: 0.88 };
const flash = { alpha: 0, color: '#ffffff' };

function triggerShake(intensity = 8) { shake.intensity = Math.max(shake.intensity, intensity); }
function triggerFlash(color = '#ffffff', alpha = 0.3) { flash.color = color; flash.alpha = Math.max(flash.alpha, alpha); }

// ==================== Combo ====================
const combo = { count: 0, multiplier: 1 };

function resetCombo() {
    combo.count = 0; combo.multiplier = 1;
    const el = document.getElementById('combo');
    if (el) { el.textContent = ''; el.classList.remove('active'); }
}

function addCombo() {
    combo.count++;
    const newMult = 1 + Math.floor(combo.count / 5);
    if (newMult > combo.multiplier) {
        combo.multiplier = newMult;
        sounds.playCombo();
        triggerShake(4);
        triggerFlash(newMult >= 3 ? '#ffea00' : '#7cff01', 0.15);
    }
    if (combo.count >= 3) {
        const el = document.getElementById('combo');
        if (el) { el.textContent = `${combo.multiplier}x`; el.classList.add('active'); }
    }
}

// ==================== Floating Texts ====================
let floatingTexts = [];

function addFloatingText(x, y, text, color = '#ffffff') {
    floatingTexts.push({ x, y, text, color, alpha: 1, life: 30 });
}

function clearFloatingTexts() { floatingTexts.length = 0; }

// ==================== Background (animated gradient + ambient) ====================
let bgTime = 0;
let ambientParticles = [];
const AMBIENT_COUNT = 50;

function initAmbientParticles() {
    ambientParticles = [];
    for (let i = 0; i < AMBIENT_COUNT; i++) {
        ambientParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 0.5 + Math.random() * 2,
            speed: 0.1 + Math.random() * 0.3,
            drift: (Math.random() - 0.5) * 0.2,
            opacity: 0.1 + Math.random() * 0.3
        });
    }
}

function drawBackground() {
    bgTime += 0.004;
    const h1 = ((Math.sin(bgTime * 0.3) * 30 + 240) % 360 + 360) % 360;
    const h2 = ((Math.sin(bgTime * 0.2 + 2) * 25 + 280) % 360 + 360) % 360;
    const g = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    g.addColorStop(0, `hsl(${h1}, 70%, 5%)`);
    g.addColorStop(0.5, `hsl(${(h1 + h2) / 2}, 60%, 7%)`);
    g.addColorStop(1, `hsl(${h2}, 70%, 4%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ambient floating particles
    ambientParticles.forEach(p => {
        p.y -= p.speed;
        p.x += Math.sin(bgTime + p.drift * 10) * p.drift;
        if (p.y < -5) { p.y = CANVAS_HEIGHT + 5; p.x = Math.random() * CANVAS_WIDTH; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${h1}, 80%, 70%, ${p.opacity})`;
        ctx.fill();
        ctx.closePath();
    });
}

// ==================== Progress Bar ====================
function drawProgressBar() {
    const barW = CANVAS_WIDTH - 4;
    const barH = 4;
    const barX = 2, barY = 2;
    const progress = totalBricks > 0 ? (destroyedBricks / totalBricks) : 0;

    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * progress, barH, 2);
    const hue = Math.round(progress * 120);
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}
