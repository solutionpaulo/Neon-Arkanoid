const HIGH_SCORE_KEY = 'neon-arkanoid-scores';
const MAX_SCORES = 5;

function loadHighScores() {
    try {
        return JSON.parse(localStorage.getItem(HIGH_SCORE_KEY)) || [];
    } catch { return []; }
}

function saveHighScores(scores) {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores.slice(0, MAX_SCORES)));
}

function addHighScore(name, score) {
    const scores = loadHighScores();
    scores.push({ name: name.toUpperCase().slice(0, 10), score, date: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    saveHighScores(scores);
    return scores;
}

function isHighScore(score) {
    const scores = loadHighScores();
    return scores.length < MAX_SCORES || score > scores[scores.length - 1].score;
}

function renderHighScores(containerId = 'hs-list') {
    const list = document.getElementById(containerId);
    if (!list) return;
    const scores = loadHighScores();
    list.innerHTML = '';
    if (scores.length === 0) {
        list.innerHTML = '<li class="hs-empty">Nenhum recorde ainda</li>';
        return;
    }
    scores.forEach((s, i) => {
        const li = document.createElement('li');
        li.className = i < 3 ? 'hs-top' : '';
        li.innerHTML = `<span class="hs-rank">${i + 1}</span>
                        <span class="hs-name">${s.name}</span>
                        <span class="hs-score">${s.score.toLocaleString()}</span>`;
        list.appendChild(li);
    });
}
