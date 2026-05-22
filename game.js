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
        this.playOsc(523.25, 'sine', 0.2, 0.2); // C5
        setTimeout(() => this.playOsc(659.25, 'sine', 0.2, 0.2), 150); // E5
        setTimeout(() => this.playOsc(783.99, 'sine', 0.4, 0.2), 300); // G5
    }

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
canvas.width = 800;
canvas.height = 600;

// Configurações do Jogo
let score = 0;
let lives = 3;
let gameRunning = false;
let animationId;

// Paleta (Paddle)
const paddle = {
    width: 120,
    originalWidth: 120,
    height: 15,
    x: (canvas.width - 120) / 2,
    y: canvas.height - 30,
    speed: 8,
    dx: 0,
    color: '#00f2ff',
    glow: '#00f2ff',
    powerUpTimer: null
};

// Bolas (Suporte a múltiplas)
let balls = [{
    x: canvas.width / 2,
    y: canvas.height - 45,
    radius: 8,
    speed: 5,
    dx: 4,
    dy: -4,
    color: '#ffffff',
    trail: []
}];

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
        
        // Colisão com a raquete
        if (this.y + this.height > paddle.y && 
            this.x + this.width > paddle.x && 
            this.x < paddle.x + paddle.width) {
            this.applyEffect();
            return true; // Remover
        }
        
        return this.y > canvas.height; // Remover se sair da tela
    }

    applyEffect() {
        sounds.playOsc(800, 'sine', 0.2, 0.2);
        
        switch(this.type) {
            case 'EXPAND':
                if (paddle.powerUpTimer) clearTimeout(paddle.powerUpTimer);
                paddle.width = 200;
                paddle.powerUpTimer = setTimeout(() => {
                    paddle.width = paddle.originalWidth;
                }, 10000); // 10 segundos
                break;
            case 'MULTI_BALL':
                // Adicionar 2 bolas extras
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
const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 80;
const brickHeight = 25;
const brickPadding = 12;
const brickOffsetTop = 50;
const brickOffsetLeft = 35;

let bricks = [];
const colors = ['#ff007f', '#bc13fe', '#00f2ff', '#7cff01', '#ffea00'];

function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { 
                x: 0, 
                y: 0, 
                status: 1, 
                color: colors[r] 
            };
        }
    }
}

// Controles
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener('mousemove', mouseMoveHandler);

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
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
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

// Lógica
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                balls.forEach(ball => {
                    if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        score += 10;
                        scoreEl.innerText = score;
                        sounds.playBrick();
                        
                        // Dropar Power-up
                        const rand = Math.random();
                        if (rand < 0.25) { // 25% de chance total
                            const types = Object.keys(powerUpTypes);
                            const type = types[Math.floor(Math.random() * types.length)];
                            powerUps.push(new PowerUp(b.x + brickWidth/2, b.y, type));
                        }

                        // Verificar Vitória
                        if (score === brickRowCount * brickColumnCount * 10) {
                            endGame(true);
                        }
                    }
                });
            }
        }
    }
}

function moveBalls() {
    balls = balls.filter(ball => {
        // Adicionar rastro
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.shift();

        ball.x += ball.dx;
        ball.y += ball.dy;

        // Colisão com paredes laterais
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            sounds.playWall();
        }

        // Colisão com topo
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            sounds.playWall();
        }

        // Colisão com a raquete
        if (ball.y + ball.radius > paddle.y && 
            ball.x > paddle.x && 
            ball.x < paddle.x + paddle.width) {
            ball.dy = -Math.abs(ball.dy); // Garantir que sobe
            sounds.playHit();
            
            let hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            ball.dx = hitPos * 7; // Ajustar sensibilidade do ângulo
        }

        // Colisão com o fundo
        if (ball.y + ball.radius > canvas.height) {
            if (balls.length > 1) {
                return false; // Remover esta bola se houver outras
            } else {
                lives--;
                livesEl.innerText = lives;
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
        y: canvas.height - 45,
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
}

function endGame(win) {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    overlay.classList.remove('hidden');
    overlayTitle.innerText = win ? 'VITÓRIA!' : 'GAME OVER';
    overlayTitle.style.color = win ? '#7cff01' : '#ff007f';
    overlayMsg.innerText = win ? `Incrível! Você limpou o campo com ${score} pontos.` : `Você marcou ${score} pontos. Tente novamente!`;
    
    if (win) sounds.playWin();
    else sounds.playGameOver();
    sounds.stopMusic();
}

function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    balls.forEach(drawBall);
    drawPaddle();
    
    // Power-ups
    powerUps = powerUps.filter(p => {
        p.draw();
        return !p.update();
    });

    collisionDetection();
    movePaddle();
    moveBalls();

    animationId = requestAnimationFrame(update);
}

function drawBall(ball) {
    // Rastro
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
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    initBricks();
    resetBalls();
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

// Iniciar slideshow
changeBackground();
setInterval(changeBackground, 10000); // Mudar a cada 10 segundos

// Inicializar blocos ao carregar
initBricks();
