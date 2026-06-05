const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

const BRICK_TYPES = { NORMAL: 1, HEALTH: 2, IRON: 3, BOMB: 4 };
const brickColors = ['#ff007f', '#bc13fe', '#00f2ff', '#7cff01', '#ffea00', '#ff6600', '#ff00ff', '#00ffcc'];

// Ball
let balls = [];
function createBall(x, y, dx, dy) {
    return { x, y, radius: 8, speed: 5, dx: dx || 4, dy: dy || -4, color: '#ffffff', trail: [] };
}

// Paddle
const paddle = {
    width: 120, originalWidth: 120, height: 15,
    x: (CANVAS_WIDTH - 120) / 2, y: CANVAS_HEIGHT - 35,
    speed: 8, dx: 0,
    color: '#00f2ff', glow: '#00f2ff',
    powerUpTimer: null,
    laserActive: false, laserUses: 0, laserTimer: null,
    autoShootActive: false, autoShootTimer: null
};

// Brick system
let bricks = [];
let brickRowCount = 5, brickColumnCount = 8;
const brickWidth = 80, brickHeight = 25, brickPadding = 12;
let totalBricks = 0, destroyedBricks = 0;

function isBrickAlive(b) { return b && b.status === 1 && b.hp > 0; }

function initBricks() {
    const lv = levels[currentLevel || 0];
    brickRowCount = lv.rows;
    brickColumnCount = lv.cols;
    bricks = [];
    destroyedBricks = 0;
    totalBricks = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            const raw = lv.data[r]?.[c] || 0;
            const active = raw > 0;
            let hp = 0, type = 0;
            if (raw === 2) { type = 2; hp = 2; }
            else if (raw === 3) { type = 3; hp = Infinity; }
            else if (raw === 4) { type = 4; hp = 1; }
            else if (raw === 1) { type = 1; hp = 1; }
            bricks[c][r] = {
                x: 0, y: 0, status: active ? 1 : 0,
                type, hp, maxHp: hp,
                color: active ? brickColors[r % brickColors.length] : null
            };
            if (active && type !== BRICK_TYPES.IRON) totalBricks++;
        }
    }
}

// Levels
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
  { rows: 5, cols: 9, data: [
      [0,0,0,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,0,0],
      [0,1,1,2,1,2,1,1,0],
      [0,0,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,0,0,0],
  ]},
  { rows: 6, cols: 10, data: [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,1,1,2,2,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,0],
  ]},
  { rows: 6, cols: 8, data: [
      [1,1,1,1,1,1,1,1],
      [1,3,0,0,0,0,3,1],
      [1,0,1,1,1,1,0,1],
      [1,0,1,0,0,1,0,1],
      [1,0,1,1,1,1,0,1],
      [1,3,0,0,0,0,3,1],
  ]},
  { rows: 5, cols: 9, data: [
      [1,1,1,0,0,0,0,0,0],
      [0,0,1,1,1,4,0,0,0],
      [0,0,0,0,1,1,1,1,1],
      [0,0,1,1,1,1,0,0,0],
      [1,1,1,0,0,0,0,0,0],
  ]},
  { rows: 7, cols: 9, data: [
      [0,0,0,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,0,0],
      [0,1,1,4,0,4,1,1,0],
      [1,1,1,1,0,1,1,1,1],
      [0,1,1,0,0,0,1,1,0],
      [0,0,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,0,0,0],
  ]},
  { rows: 6, cols: 10, data: [
      [1,1,0,0,1,1,0,0,1,1],
      [1,1,0,0,3,3,0,0,1,1],
      [0,0,1,1,0,0,1,1,0,0],
      [0,0,1,1,0,0,1,1,0,0],
      [1,1,0,0,3,3,0,0,1,1],
      [1,1,0,0,1,1,0,0,1,1],
  ]},
  { rows: 6, cols: 8, data: [
      [1,0,2,0,1,0,2,0],
      [1,0,1,0,1,0,1,0],
      [2,0,1,0,2,0,1,0],
      [1,0,2,0,1,0,2,0],
      [1,0,1,0,1,0,1,0],
      [2,0,1,0,2,0,1,0],
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

// Power-ups
const powerUpTypes = {
    EXPAND: { color: '#00f2ff', label: 'E', chance: 0.1 },
    MULTI_BALL: { color: '#ffea00', label: 'M', chance: 0.1 },
    SLOW_BALL: { color: '#7cff01', label: 'S', chance: 0.05 },
    LASER: { color: '#bc13fe', label: 'L', chance: 0.08 },
    AUTO_SHOT: { color: '#ff4500', label: 'A', chance: 0.08 }
};

let powerUps = [];

class PowerUp {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.width = 25; this.height = 15;
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
        if (this.y + this.height > paddle.y && this.x + this.width > paddle.x && this.x < paddle.x + paddle.width) {
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
                paddle.powerUpTimer = setTimeout(() => { paddle.width = paddle.originalWidth; }, 10000);
                break;
            case 'MULTI_BALL': {
                const base = balls[0] || paddle;
                for (let i = 0; i < 2; i++) {
                    balls.push(createBall(base.x, base.y || paddle.y - 10, (Math.random() - 0.5) * 8, -4));
                }
                break;
            }
            case 'SLOW_BALL':
                balls.forEach(b => { b.dx *= 0.7; b.dy *= 0.7; });
                setTimeout(() => { balls.forEach(b => { b.dx /= 0.7; b.dy /= 0.7; }); }, 8000);
                break;
            case 'LASER':
                if (paddle.laserTimer) clearTimeout(paddle.laserTimer);
                paddle.laserActive = true;
                paddle.laserUses = 6;
                paddle.laserTimer = setTimeout(() => { paddle.laserActive = false; }, 12000);
                break;
            case 'AUTO_SHOT':
                if (paddle.autoShootTimer) clearInterval(paddle.autoShootTimer);
                paddle.autoShootActive = true;
                paddle.autoShootTimer = setInterval(() => {
                    if (typeof fireAutoShot === 'function') fireAutoShot();
                }, 500);
                setTimeout(() => {
                    paddle.autoShootActive = false;
                    if (paddle.autoShootTimer) { clearInterval(paddle.autoShootTimer); paddle.autoShootTimer = null; }
                }, 10000);
                break;
        }
    }
}

// Lasers (manual)
let lasers = [];

class Laser {
    constructor(x) {
        this.x = x; this.y = paddle.y;
        this.width = 3; this.height = 20;
        this.speed = 14;
        this.active = true;
    }

    update() {
        this.y -= this.speed;
        if (this.y + this.height < 0) this.active = false;
    }

    draw() {
        ctx.beginPath();
        const g = ctx.createLinearGradient(0, this.y, 0, this.y + this.height);
        g.addColorStop(0, 'rgba(188,19,254,0)');
        g.addColorStop(0.4, '#bc13fe');
        g.addColorStop(1, 'rgba(188,19,254,0)');
        ctx.fillStyle = g;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#bc13fe';
        ctx.fillRect(this.x - 1.5, this.y, 3, this.height);
        ctx.closePath();
        ctx.shadowBlur = 0;
    }
}

// Auto-shots
let shots = [];

class Shot {
    constructor(x) {
        this.x = x; this.y = paddle.y;
        this.radius = 4;
        this.speed = 16;
        this.active = true;
    }

    update() {
        this.y -= this.speed;
        if (this.y < 0) this.active = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4500';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ff4500';
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
    }
}
