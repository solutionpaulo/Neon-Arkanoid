const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const muteBtn = document.getElementById('mute-btn');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');

// Gerenciador de Sons (Web Audio API)
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgMusic = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.3;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        this.bgMusic.muted = this.muted;
        muteBtn.innerText = this.muted ? '🔇' : '🔊';
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
    playCombo() { this.playOsc(660, 'sine', 0.15, 0.15); }

    startMusic() {
        if (!this.muted) {
            this.bgMusic.play().catch(e => console.log("Erro ao tocar música:", e));
        }
    }

    stopMusic() {
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }
}

const sounds = new SoundManager();

// Ajustar resolução do canvas
canvas.width = 960;
canvas.height = 540;

// Configurações do Jogo
let score = 0;
let lives = 3;
let currentLevel = 0;
let gameRunning = false;
let animationId;

// Paleta (Paddle)
const paddle = {
    width: 120,
    originalWidth: 120,
    height: 15,
    x: (canvas.width - 120) / 2,
    y: canvas.height - 35,
    speed: 8,
    dx: 0,
    color: '#00f2ff',
    glow: '#00f2ff',
    powerUpTimer: null
};

// Bolas (Suporte a múltiplas)
let balls = [{
    x: canvas.width / 2,
    y: canvas.height - 55,
    radius: 8,
    speed: 5,
    dx: 4,
    dy: -4,
    color: '#ffffff',
    trail: []
}];

// Sistema de Partículas
class Particle {
    constructor(x, y, color) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        this.x = x;
        this.y = y;
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

const particles = [];

function emitBrickParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function emitPaddleParticles(x, y) {
    const colors = ['#00f2ff', '#ffffff', '#7cff01'];
    for (let i = 0; i < 6; i++) {
        const p = new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]);
        p.vx = (Math.random() - 0.5) * 6;
        p.vy = -Math.random() * 5;
        p.gravity = 0.05;
        p.maxLife = 15;
        p.decay = 1 / p.maxLife;
        particles.push(p);
    }
}

// Screen Shake + Flash
const shake = { intensity: 0, decay: 0.88 };
const flash = { alpha: 0, color: '#ffffff' };

function triggerShake(intensity = 8) {
    shake.intensity = Math.max(shake.intensity, intensity);
}

function triggerFlash(color = '#ffffff', alpha = 0.3) {
    flash.color = color;
    flash.alpha = Math.max(flash.alpha, alpha);
}

// Combo / Streak
const combo = { count: 0, multiplier: 1, textAlpha: 0, textY: 0 };

function resetCombo() {
    combo.count = 0;
    combo.multiplier = 1;
    combo.textAlpha = 0;
    comboEl.textContent = '';
    comboEl.classList.remove('active');
}

function addCombo() {
    combo.count++;
    const newMult = 1 + Math.floor(combo.count / 5);
    if (newMult > combo.multiplier) {
        combo.multiplier = newMult;
        combo.textAlpha = 1;
        combo.textY = canvas.height / 2;
        sounds.playCombo();
        triggerShake(4);
        triggerFlash(combo.multiplier >= 3 ? '#ffea00' : '#7cff01', 0.15);
    }
    if (combo.count >= 3) {
        comboEl.textContent = `${combo.multiplier}x`;
        comboEl.classList.add('active');
    }
}

// Floating texts
const floatingTexts = [];

function addFloatingText(x, y, text, color = '#ffffff') {
    floatingTexts.push({ x, y, text, color, alpha: 1, life: 30 });
}

// Power-ups
const powerUpTypes = {
    EXPAND: { color: '#00f2ff', label: 'E', chance: 0.1 },
    MULTI_BALL: { color: '#ffea00', label: 'M', chance: 0.1 },
    SLOW_BALL: { color: '#7cff01', label: 'S', chance: 0.05 }
};

let powerUps = [];

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 15;
        this.type = type;
        this.speed = 2.5;
        this.color = powerUpTypes[type].color;
        this.label = powerUpTypes[type].label;
    }

    draw() {
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.font = "bold 12px Outfit";
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height - 3);
        ctx.closePath();
        ctx.shadowBlur = 0;
    }

    update() {
        this.y += this.speed;
        
        if (this.y + this.height > paddle.y && 
            this.x + this.width > paddle.x && 
            this.x < paddle.x + paddle.width) {
            this.applyEffect();
            return true;
        }
        
        return this.y > canvas.height;
    }

    applyEffect() {
        sounds.playOsc(800, 'sine', 0.2, 0.2);
        
        switch(this.type) {
            case 'EXPAND':
                if (paddle.powerUpTimer) clearTimeout(paddle.powerUpTimer);
                paddle.width = 200;
                paddle.powerUpTimer = setTimeout(() => {
                    paddle.width = paddle.originalWidth;
                }, 10000);
                break;
            case 'MULTI_BALL':
                const baseBall = balls[0] || { x: paddle.x + paddle.width/2, y: paddle.y - 10, dx: 4, dy: -4 };
                for (let i = 0; i < 2; i++) {
                    balls.push({
                        x: baseBall.x,
                        y: baseBall.y,
                        radius: 8,
                        speed: baseBall.speed || 5,
                        dx: (Math.random() - 0.5) * 8,
                        dy: -4,
                        color: '#ffffff',
                        trail: []
                    });
                }
                break;
            case 'SLOW_BALL':
                balls.forEach(b => {
                    b.dx *= 0.7;
                    b.dy *= 0.7;
                });
                setTimeout(() => {
                    balls.forEach(b => {
                        b.dx /= 0.7;
                        b.dy /= 0.7;
                    });
                }, 8000);
                break;
        }
    }
}

// Blocos (Bricks)
let brickRowCount = 5;
let brickColumnCount = 8;
const brickWidth = 80;
const brickHeight = 25;
const brickPadding = 12;
let bricks = [];
const colors = ['#ff007f', '#bc13fe', '#00f2ff', '#7cff01', '#ffea00', '#ff6600', '#ff00ff', '#00ffcc'];

const levels = [
  { rows: 5, cols: 8, data: [
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
  ]},
  { rows: 5, cols: 9, data: [
      [0,0,0,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,0,0,0],
  ]},
  { rows: 6, cols: 10, data: [
      [1,0,1,0,1,0,1,0,1,0],
      [0,1,0,1,0,1,0,1,0,1],
      [1,0,1,0,1,0,1,0,1,0],
      [0,1,0,1,0,1,0,1,0,1],
      [1,0,1,0,1,0,1,0,1,0],
      [0,1,0,1,0,1,0,1,0,1],
  ]},
  { rows: 6, cols: 10, data: [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
  ]},
  { rows: 6, cols: 8, data: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1],
      [1,0,1,0,0,1,0,1],
      [1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,1],
  ]},
  { rows: 5, cols: 9, data: [
      [1,1,1,0,0,0,0,0,0],
      [0,0,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,1,1,1],
      [0,0,1,1,1,1,0,0,0],
      [1,1,1,0,0,0,0,0,0],
  ]},
  { rows: 7, cols: 9, data: [
      [0,0,0,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,0,0],
      [0,1,1,0,0,0,1,1,0],
      [1,1,1,0,0,0,1,1,1],
      [0,1,1,0,0,0,1,1,0],
      [0,0,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,0,0,0],
  ]},
  { rows: 6, cols: 10, data: [
      [1,1,0,0,1,1,0,0,1,1],
      [1,1,0,0,1,1,0,0,1,1],
      [0,0,1,1,0,0,1,1,0,0],
      [0,0,1,1,0,0,1,1,0,0],
      [1,1,0,0,1,1,0,0,1,1],
      [1,1,0,0,1,1,0,0,1,1],
  ]},
  { rows: 6, cols: 8, data: [
      [1,0,1,0,1,0,1,0],
      [1,0,1,0,1,0,1,0],
      [1,0,1,0,1,0,1,0],
      [1,0,1,0,1,0,1,0],
      [1,0,1,0,1,0,1,0],
      [1,0,1,0,1,0,1,0],
  ]},
  { rows: 8, cols: 10, data: [
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
  ]},
];

function initBricks() {
    const lv = levels[currentLevel];
    brickRowCount = lv.rows;
    brickColumnCount = lv.cols;
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            const active = lv.data[r][c];
            bricks[c][r] = { 
                x: 0, 
                y: 0, 
                status: active,
                color: active ? colors[r % colors.length] : null
            };
        }
    }
}

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') paddle.dx = paddle.speed;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') paddle.dx = -paddle.speed;
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key === 'Left' || e.key === 'ArrowLeft') {
        paddle.dx = 0;
    }
}

function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.offsetLeft;
    const canvasScale = canvas.width / canvas.offsetWidth;
    const mouseX = relativeX * canvasScale;
    
    if (mouseX > 0 && mouseX < canvas.width) {
        paddle.x = mouseX - paddle.width / 2;
    }
}

document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener('mousemove', mouseMoveHandler);

// Touch support
function touchMoveHandler(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const relativeX = (touch.clientX - rect.left) / rect.width * canvas.width;
    
    if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = relativeX - paddle.width / 2;
    }
}

document.addEventListener('touchmove', touchMoveHandler, { passive: false });
document.addEventListener('touchstart', (e) => {
    if (!gameRunning && !startScreen.classList.contains('hidden')) {
        startGame();
    }
});

function drawPaddle() {
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
    ctx.fillStyle = paddle.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddle.glow;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function drawBricks() {
    const totalWidth = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
    const offsetLeft = (canvas.width - totalWidth) / 2;
    const offsetTop = 25;
    
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = c * (brickWidth + brickPadding) + offsetLeft;
                const brickY = r * (brickHeight + brickPadding) + offsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.roundRect(brickX, brickY, brickWidth, brickHeight, 4);
                ctx.fillStyle = bricks[c][r].color;
                ctx.shadowBlur = 5;
                ctx.shadowColor = bricks[c][r].color;
                ctx.fill();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
        }
    }
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                balls.forEach(ball => {
                    if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        
                        const pts = 10 * combo.multiplier;
                        score += pts;
                        scoreEl.innerText = score;
                        sounds.playBrick();
                        
                        addCombo();
                        
                        // Particles
                        const cx = b.x + brickWidth / 2;
                        const cy = b.y + brickHeight / 2;
                        emitBrickParticles(cx, cy, b.color, 10 + combo.multiplier * 3);
                        
                        // Floating score text
                        const label = combo.multiplier > 1 ? `${pts} (${combo.multiplier}x)` : `${pts}`;
                        addFloatingText(cx + (Math.random() - 0.5) * 20, cy, label, b.color);
                        
                        // 25% chance de dropar Power-up
                        const rand = Math.random();
                        if (rand < 0.25) {
                            const types = Object.keys(powerUpTypes);
                            const type = types[Math.floor(Math.random() * types.length)];
                            powerUps.push(new PowerUp(cx, cy, type));
                        }

                        if (areAllBricksDestroyed()) {
                            if (currentLevel < levels.length - 1) {
                                levelComplete();
                            } else {
                                endGame(true);
                            }
                        }
                    }
                });
            }
        }
    }
}

function moveBalls() {
    balls = balls.filter(ball => {
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.shift();

        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            sounds.playWall();
        }

        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            sounds.playWall();
        }

        if (ball.y + ball.radius > paddle.y && 
            ball.x > paddle.x && 
            ball.x < paddle.x + paddle.width) {
            ball.dy = -Math.abs(ball.dy);
            sounds.playHit();
            
            resetCombo();
            emitPaddleParticles(ball.x, paddle.y);
            
            let hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            ball.dx = hitPos * 7;
        }

        if (ball.y + ball.radius > canvas.height) {
            if (balls.length > 1) {
                return false;
            } else {
                lives--;
                livesEl.innerText = lives;
                triggerShake(12);
                triggerFlash('#ff007f', 0.4);
                if (lives === 0) {
                    endGame(false);
                } else {
                    resetBalls();
                }
                return true;
            }
        }
        return true;
    });
}

function resetBalls() {
    balls = [{
        x: canvas.width / 2,
        y: canvas.height - 55,
        radius: 8,
        speed: 5,
        dx: 4,
        dy: -4,
        color: '#ffffff',
        trail: []
    }];
    paddle.x = (canvas.width - paddle.width) / 2;
    paddle.width = paddle.originalWidth;
    powerUps = [];
    resetCombo();
}

function areAllBricksDestroyed() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) return false;
        }
    }
    return true;
}

function levelComplete() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    overlayTitle.innerText = `FASE ${currentLevel + 1} CONCLUÍDA!`;
    overlayTitle.style.color = '#7cff01';
    overlayMsg.innerText = `Prepare-se para a Fase ${currentLevel + 2}...`;
    overlay.classList.remove('hidden');
    sounds.playWin();
    triggerShake(6);
    triggerFlash('#7cff01', 0.3);

    setTimeout(() => {
        currentLevel++;
        levelEl.innerText = currentLevel + 1;
        initBricks();
        resetBalls();
        overlay.classList.add('hidden');
        gameRunning = true;
        update();
    }, 2500);
}

function endGame(win) {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    overlay.classList.remove('hidden');
    overlayTitle.innerText = win ? 'VITÓRIA!' : 'GAME OVER';
    overlayTitle.style.color = win ? '#7cff01' : '#ff007f';
    overlayMsg.innerText = win ? `Incrível! Você zerou o jogo com ${score} pontos.` : `Você marcou ${score} pontos. Tente novamente!`;
    
    if (win) {
        sounds.playWin();
        triggerShake(10);
        triggerFlash('#ffea00', 0.5);
        // Big particle celebration
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                emitBrickParticles(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height * 0.5,
                    colors[Math.floor(Math.random() * colors.length)],
                    20
                );
            }, i * 200);
        }
    } else {
        sounds.playGameOver();
        triggerShake(15);
        triggerFlash('#ff007f', 0.5);
    }
    sounds.stopMusic();
    resetCombo();
}

function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Screen Shake
    if (shake.intensity > 0.5) {
        const sx = (Math.random() - 0.5) * shake.intensity * 2;
        const sy = (Math.random() - 0.5) * shake.intensity * 2;
        ctx.save();
        ctx.translate(sx, sy);
        shake.intensity *= shake.decay;
    }

    drawBricks();
    balls.forEach(drawBall);
    drawPaddle();

    // Particles
    particles.forEach(p => p.draw());

    // Floating texts
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 14px Outfit';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // Flash overlay
    if (flash.alpha > 0.01) {
        ctx.fillStyle = flash.color;
        ctx.globalAlpha = flash.alpha;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        flash.alpha *= 0.92;
    }

    // Power-ups
    powerUps.forEach(p => p.draw());

    if (shake.intensity > 0.5) {
        ctx.restore();
    }

    // Update power-ups (física fora do shake)
    powerUps = powerUps.filter(p => !p.update());

    collisionDetection();
    movePaddle();
    moveBalls();

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].dead) particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 1.5;
        ft.alpha -= 0.03;
        if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }

    animationId = requestAnimationFrame(update);
}

function drawBall(ball) {
    ball.trail.forEach((t, index) => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * (index / ball.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${index / 20})`;
        ctx.fill();
        ctx.closePath();
    });

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function movePaddle() {
    paddle.x += paddle.dx;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function startGame() {
    sounds.init();
    score = 0;
    lives = 3;
    currentLevel = 0;
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    levelEl.innerText = 1;
    particles.length = 0;
    floatingTexts.length = 0;
    initBricks();
    resetBalls();
    resetCombo();
    gameRunning = true;
    startScreen.classList.add('hidden');
    overlay.classList.add('hidden');
    sounds.startMusic();
    update();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
muteBtn.addEventListener('click', () => sounds.toggleMute());

// Slideshow de Fundo
const bgSlideshow = document.getElementById('bg-slideshow');
const landscapes = [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80'
];

let currentBgIndex = 0;

function changeBackground() {
    bgSlideshow.style.backgroundImage = `url('${landscapes[currentBgIndex]}')`;
    currentBgIndex = (currentBgIndex + 1) % landscapes.length;
}

changeBackground();
setInterval(changeBackground, 10000);

initBricks();
