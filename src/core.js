// ==================== DOM Refs ====================
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

// ==================== Canvas Setup ====================
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// ==================== Game State ====================
let score = 0;
let lives = 3;
let currentLevel = 0;
let gameRunning = false;
let paused = false;
let gameEnding = false;
let animationId;

// ==================== Drawing Functions ====================
function drawPaddle() {
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
    ctx.fillStyle = paddle.laserActive ? '#bc13fe' : paddle.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddle.laserActive ? '#bc13fe' : paddle.glow;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    if (paddle.laserActive) {
        ctx.beginPath();
        ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.closePath();
        ctx.setLineDash([]);
    }
}

function drawBricks() {
    const totalW = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
    const offsetLeft = (CANVAS_WIDTH - totalW) / 2;
    const offsetTop = 25;

    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c]?.[r];
            if (!b || !isBrickAlive(b)) continue;

            const bx = c * (brickWidth + brickPadding) + offsetLeft;
            const by = r * (brickHeight + brickPadding) + offsetTop;
            b.x = bx; b.y = by;

            ctx.beginPath();
            ctx.roundRect(bx, by, brickWidth, brickHeight, 4);

            // Determine visual based on type
            let color = b.color;
            if (b.type === BRICK_TYPES.HEALTH && b.hp < b.maxHp) {
                color = `hsl(${30 * b.hp}, 100%, 50%)`;
            }
            if (b.type === BRICK_TYPES.IRON) {
                color = '#555';
            }
            if (b.type === BRICK_TYPES.BOMB) {
                color = '#ff6600';
            }

            ctx.fillStyle = color;
            ctx.shadowBlur = b.type === BRICK_TYPES.IRON ? 2 : 8;
            ctx.shadowColor = b.type === BRICK_TYPES.IRON ? '#666' : color;
            ctx.fill();
            ctx.closePath();
            ctx.shadowBlur = 0;

            // Overlay icons for special bricks
            ctx.font = 'bold 14px Outfit';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (b.type === BRICK_TYPES.HEALTH) {
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillText('H', bx + brickWidth / 2, by + brickHeight / 2);
            }
            if (b.type === BRICK_TYPES.IRON) {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillText('I', bx + brickWidth / 2, by + brickHeight / 2);
            }
            if (b.type === BRICK_TYPES.BOMB) {
                ctx.fillStyle = 'rgba(255,255,200,0.6)';
                ctx.fillText('B', bx + brickWidth / 2, by + brickHeight / 2);
            }
            ctx.textBaseline = 'alphabetic';
        }
    }
}

function drawBall(ball) {
    ball.trail.forEach((t, i) => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * (i / ball.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${i / 20})`;
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

function drawLasers() {
    lasers.forEach(l => l.draw());
}

// ==================== Collision ====================
function handleBrickHit(b, c, r) {
    const cx = b.x + brickWidth / 2;
    const cy = b.y + brickHeight / 2;

    if (b.type === BRICK_TYPES.IRON) {
        sounds.playClank();
        emitBrickParticles(cx, cy, '#888', 5);
        triggerShake(2);
        return;
    }

    b.hp--;
    if (b.hp > 0) {
        emitBrickParticles(cx, cy, b.color, 4);
        sounds.playClank();
        addFloatingText(cx, cy, '💥', '#ff0');
        return;
    }

    destroyBrick(b, c, r);
}

function destroyBrick(b, c, r) {
    b.status = 0;
    if (b.type !== BRICK_TYPES.IRON) destroyedBricks++;

    const pts = 10 * Math.max(combo.multiplier, 1);
    score += pts;
    scoreEl.innerText = score;

    const cx = b.x + brickWidth / 2;
    const cy = b.y + brickHeight / 2;

    if (b.type === BRICK_TYPES.BOMB) {
        sounds.playBomb();
        emitBrickParticles(cx, cy, '#ff6600', 30);
        triggerShake(12);
        triggerFlash('#ff6600', 0.3);
        const dirs = [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]];
        dirs.forEach(([dc, dr]) => {
            const nb = bricks[c + dc]?.[r + dr];
            if (nb && isBrickAlive(nb) && nb.type !== BRICK_TYPES.IRON) destroyBrick(nb, c + dc, r + dr);
        });
    } else {
        emitBrickParticles(cx, cy, b.color, 10 + combo.multiplier * 3);
    }

    // Power-up drop
    if (Math.random() < 0.25) {
        const types = Object.keys(powerUpTypes);
        const type = types[Math.floor(Math.random() * types.length)];
        powerUps.push(new PowerUp(cx, cy, type));
    }

    sounds.playBrick();
    const label = combo.multiplier > 1 ? `${pts} (${combo.multiplier}x)` : `${pts}`;
    addFloatingText(cx + (Math.random() - 0.5) * 20, cy, label, b.color);
    addCombo();

    if (!gameEnding && areAllBricksDestroyed()) {
        if (currentLevel < levels.length - 1) levelComplete();
        else endGame(true);
    }
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c]?.[r];
            if (!b || !isBrickAlive(b)) continue;
            balls.forEach(ball => {
                if (ball.x > b.x && ball.x < b.x + brickWidth &&
                    ball.y > b.y && ball.y < b.y + brickHeight) {
                    ball.dy = -ball.dy;
                    handleBrickHit(b, c, r);
                }
            });
        }
    }
}

function checkLaserCollision() {
    lasers.forEach(laser => {
        if (!laser.active) return;
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const b = bricks[c]?.[r];
                if (!b || !isBrickAlive(b)) continue;
                if (laser.x + laser.width > b.x && laser.x < b.x + brickWidth &&
                    laser.y < b.y + brickHeight && laser.y + laser.height > b.y) {
                    if (b.type === BRICK_TYPES.IRON) {
                        sounds.playClank();
                        emitBrickParticles(b.x + brickWidth / 2, b.y + brickHeight / 2, '#888', 3);
                    } else {
                        destroyBrick(b, c, r);
                    }
                }
            }
        }
    });
}

function checkShotCollision() {
    shots.forEach(shot => {
        if (!shot.active) return;
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const b = bricks[c]?.[r];
                if (!b || !isBrickAlive(b)) continue;
                if (shot.x + shot.radius > b.x && shot.x - shot.radius < b.x + brickWidth &&
                    shot.y - shot.radius < b.y + brickHeight && shot.y + shot.radius > b.y) {
                    if (b.type === BRICK_TYPES.IRON) {
                        sounds.playClank();
                        emitBrickParticles(b.x + brickWidth / 2, b.y + brickHeight / 2, '#888', 3);
                    } else {
                        destroyBrick(b, c, r);
                    }
                    shot.active = false;
                    break;
                }
            }
            if (!shot.active) break;
        }
    });
}

function areAllBricksDestroyed() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c]?.[r];
            if (isBrickAlive(b) && b.type !== BRICK_TYPES.IRON) return false;
        }
    }
    return true;
}

// ==================== Game Logic ====================
function moveBalls() {
    const alive = [];
    const prevBalls = balls;

    for (const ball of prevBalls) {
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.shift();
        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x + ball.radius > CANVAS_WIDTH || ball.x - ball.radius < 0) { ball.dx = -ball.dx; sounds.playWall(); }
        if (ball.y - ball.radius < 0) { ball.dy = -ball.dy; sounds.playWall(); }

        if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
            ball.dy = -Math.abs(ball.dy);
            sounds.playHit();
            const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            ball.dx = hitPos * 7;
            resetCombo();
            emitPaddleParticles(ball.x, paddle.y);
        }

        if (ball.y + ball.radius > CANVAS_HEIGHT) {
            if (prevBalls.length > 1) continue; // remove this ball, keep others
            lives--;
            livesEl.innerText = lives;
            triggerShake(12);
            triggerFlash('#ff007f', 0.4);
            if (lives === 0) { endGame(false); alive.push(ball); break; }
            resetBalls();
            return; // resetBalls() already replaced `balls`, exit early
        }
        alive.push(ball);
    }

    balls = alive;
}

function movePaddle() {
    paddle.x += paddle.dx;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > CANVAS_WIDTH) paddle.x = CANVAS_WIDTH - paddle.width;
}

function clearPowerUps() {
    if (paddle.powerUpTimer) { clearTimeout(paddle.powerUpTimer); paddle.powerUpTimer = null; }
    if (paddle.laserTimer) { clearTimeout(paddle.laserTimer); paddle.laserTimer = null; }
    if (paddle.autoShootTimer) { clearInterval(paddle.autoShootTimer); paddle.autoShootTimer = null; }
    paddle.laserActive = false;
    paddle.autoShootActive = false;
    powerUps = [];
    lasers = [];
    shots = [];
}

function resetBalls() {
    balls = [createBall(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 55)];
    paddle.x = (CANVAS_WIDTH - paddle.width) / 2;
    paddle.width = paddle.originalWidth;
    clearPowerUps();
    resetCombo();
}

function fireLaser() {
    if (!paddle.laserActive || paddle.laserUses <= 0 || !gameRunning || paused) return;
    const cx = paddle.x + paddle.width / 2;
    [-30, 0, 30].forEach(off => lasers.push(new Laser(cx + off)));
    paddle.laserUses--;
    sounds.playLaser();
    if (paddle.laserUses <= 0) paddle.laserActive = false;
}

function fireAutoShot() {
    if (!paddle.autoShootActive || !gameRunning || paused) return;
    const cx = paddle.x + paddle.width / 2;
    [-18, 0, 18].forEach(off => shots.push(new Shot(cx + off)));
}

function getLevelBallSpeed() { return 5 + Math.floor(currentLevel / 3); }

function applyLevelSpeed() {
    const ns = getLevelBallSpeed();
    balls.forEach(b => {
        const cur = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
        if (cur > 0) { const r = ns / cur; b.dx *= r; b.dy *= r; }
    });
}

// ==================== Game Control ====================
function levelComplete() {
    if (gameEnding) return;
    gameEnding = true;
    gameRunning = false;
    paused = false;
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
        applyLevelSpeed();
        clearFloatingTexts();
        sounds.startMusic(currentLevel);
        overlay.classList.add('hidden');
        gameEnding = false;
        gameRunning = true;
        update();
    }, 2500);
}

function endGame(win) {
    if (gameEnding) return;
    gameEnding = true;
    gameRunning = false;
    paused = false;
    cancelAnimationFrame(animationId);

    overlay.classList.remove('hidden');
    overlayTitle.innerText = win ? 'VITÓRIA!' : 'GAME OVER';
    overlayTitle.style.color = win ? '#7cff01' : '#ff007f';
    overlayMsg.innerText = win ? `Incrível! Você zerou com ${score} pontos!` : `Você marcou ${score} pontos.`;
    resetCombo();

    if (win) {
        sounds.playWin();
        triggerShake(10);
        triggerFlash('#ffea00', 0.5);
        for (let i = 0; i < 5; i++) setTimeout(() =>
            emitBrickParticles(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT * 0.5,
                brickColors[Math.floor(Math.random() * brickColors.length)], 20), i * 200);
    } else {
        sounds.playGameOver();
        triggerShake(15);
        triggerFlash('#ff007f', 0.5);
    }
    sounds.stopMusic();
    clearPowerUps();
    resetCombo();

    // High score
    const hsForm = document.getElementById('highscore-form');
    if (hsForm) {
        renderHighScores();
        document.getElementById('highscore-save-container').classList.remove('hidden');
        if (isHighScore(score)) {
            document.getElementById('hs-section-title').innerText = 'NOVO RECORDE!';
            document.getElementById('hs-name-container').classList.remove('hidden');
            document.getElementById('hs-name').focus();
        } else {
            document.getElementById('hs-section-title').innerText = 'RECORDES';
            document.getElementById('hs-name-container').classList.add('hidden');
        }
    }
}

function startGame() {
    sounds.init();
    score = 0; lives = 3; currentLevel = 0;
    gameRunning = true; paused = false; gameEnding = false;
    scoreEl.innerText = '0';
    livesEl.innerText = '3';
    levelEl.innerText = '1';
    clearParticles();
    clearFloatingTexts();
    clearPowerUps();
    canvas.style.cursor = 'none';
    initBricks();
    resetBalls();
    resetCombo();
    startScreen.classList.add('hidden');
    overlay.classList.add('hidden');
    const hsForm = document.getElementById('highscore-form');
    if (hsForm) {
        document.getElementById('highscore-save-container').classList.add('hidden');
        document.getElementById('hs-name-container').classList.add('hidden');
    }
    sounds.startMusic(currentLevel);
    update();
}

function togglePause() {
    if (!gameRunning || gameEnding) return;
    paused = !paused;
    if (paused) {
        cancelAnimationFrame(animationId);
        overlayTitle.innerText = 'PAUSADO';
        overlayTitle.style.color = '#00f2ff';
        overlayMsg.innerHTML = 'Pressione <strong>ESC</strong> ou <strong>P</strong><br>para continuar';
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
        update();
    }
}

// ==================== Game Loop ====================
function update() {
    if (!gameRunning) return;
    if (paused) return;

    drawBackground();
    drawProgressBar();

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
    drawLasers();
    shots.forEach(s => s.draw());
    particles.forEach(p => p.draw());

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

    if (flash.alpha > 0.01) {
        ctx.fillStyle = flash.color;
        ctx.globalAlpha = flash.alpha;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalAlpha = 1;
        flash.alpha *= 0.92;
    }

    // Power-ups drawn inside shake
    powerUps.forEach(p => p.draw());

    if (shake.intensity > 0.5) ctx.restore();

    // Update all systems
    powerUps = powerUps.filter(p => !p.update());
    collisionDetection();
    movePaddle();
    if (paddle.laserActive) {
        lasers.forEach(l => l.update());
        checkLaserCollision();
        lasers = lasers.filter(l => l.active);
    } else {
        lasers = [];
    }

    if (paddle.autoShootActive) {
        shots.forEach(s => s.update());
        checkShotCollision();
        shots = shots.filter(s => s.active);
    } else {
        shots = [];
    }

    // Paddle visual
    if (paddle.laserActive) {
        paddle.color = '#bc13fe';
        paddle.glow = '#bc13fe';
    } else if (paddle.autoShootActive) {
        paddle.color = '#ff4500';
        paddle.glow = '#ff4500';
    } else {
        paddle.color = '#00f2ff';
        paddle.glow = '#00f2ff';
    }
    moveBalls();

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].dead) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 1.5;
        ft.alpha -= 0.03;
        if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }

    animationId = requestAnimationFrame(update);
}

// ==================== Input ====================
function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') paddle.dx = paddle.speed;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') paddle.dx = -paddle.speed;
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
    else if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); fireLaser(); }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key === 'Left' || e.key === 'ArrowLeft') paddle.dx = 0;
}

function mouseMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    const ratio = CANVAS_WIDTH / rect.width;
    const mx = (e.clientX - rect.left) * ratio;
    if (mx > 0 && mx < CANVAS_WIDTH) paddle.x = mx - paddle.width / 2;
}

function touchMoveHandler(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = (touch.clientX - rect.left) / rect.width * CANVAS_WIDTH;
    if (mx > 0 && mx < CANVAS_WIDTH) paddle.x = mx - paddle.width / 2;
}

function canvasClickHandler(e) {
    if (!gameRunning || paused) return;
    fireLaser();
}

document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener('mousemove', mouseMoveHandler);
canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
canvas.addEventListener('touchstart', (e) => {
    if (!gameRunning && !startScreen.classList.contains('hidden')) {
        startGame();
        return;
    }
    if (gameRunning && !paused) fireLaser();
});
canvas.addEventListener('click', canvasClickHandler);

// High score save
document.addEventListener('click', (e) => {
    if (e.target.id === 'hs-save') {
        const input = document.getElementById('hs-name');
        const name = input.value.trim() || 'ANÔNIMO';
        addHighScore(name, score);
        renderHighScores();
        document.getElementById('hs-name-container').classList.add('hidden');
        document.getElementById('hs-section-title').innerText = 'RECORDES';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('hs-name-container')?.classList.contains('hidden')) {
        document.getElementById('hs-save')?.click();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
muteBtn.addEventListener('click', () => sounds.toggleMute());

// ==================== Init ====================
initBricks();
initAmbientParticles();
renderHighScores('start-hs-list');
canvas.style.cursor = 'crosshair';
