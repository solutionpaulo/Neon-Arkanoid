# Neon Arkanoid ⚡

Um jogo clássico de Arkanoid reinventado com estética neon e jogabilidade moderna. Desenvolvido com HTML5 Canvas, CSS3 e JavaScript puro.

## 🎮 Como Jogar

- **Mouse**: Movimente a paleta horizontalmente
- **Touch**: Arraste o dedo na tela para mover a paleta (mobile)
- **Teclado**: Setas ← → para mover a paleta, **ESG/P** para pausar, **Espaço** para atirar laser
- **Objetivo**: Destrua todos os blocos sem deixar a bola cair
- **Combo**: Acertos consecutivos sem a bola tocar na paleta multiplicam seus pontos!

## ✨ Funcionalidades

- Efeitos visuais neon com brilho e rastros
- **Sistema de partículas** com física, gravidade e fade em cada colisão
- **Screen shake** + flash de tela em eventos impactantes
- **Sistema de Combo** — acertos consecutivos multiplicam a pontuação até 5x+
- **Power-ups**: Expandir paleta, Multi-ball, Desacelerar bola, **Laser**
- **Blocos especiais**: Health (H - 2 hits), Iron (I - inquebrável), Bomb (B - explode vizinhos)
- **High score** com top 5 salvo no navegador (localStorage)
- **Dificuldade progressiva** — bola acelera a cada 3 fases
- **Fundo gradiente animado** com partículas ambiente (substitui slideshow)
- **Barra de progresso** no topo da tela
- Trilha sonora e efeitos sonoros (Web Audio API)
- 10 fases com layouts únicos e blocos especiais
- Tela de início, pause e game over com recordes
- **Código modular** organizado em arquivos separados

## 🛠️ Tecnologias

- HTML5 Canvas
- CSS3 (Glassmorphism, animações, variáveis)
- JavaScript (ES6+, modular)
- Web Audio API

## 📁 Estrutura

```
neon-arkanoid/
├── index.html       # Estrutura do jogo
├── style.css        # Estilização neon
├── src/
│   ├── sound.js     # Gerenciador de som (Web Audio API)
│   ├── entities.js  # Classes do jogo (Paddle, Balls, Bricks, Power-ups, Laser)
│   ├── effects.js   # Efeitos visuais (Partículas, Shake, Flash, Background)
│   ├── highscore.js # Sistema de recordes (localStorage)
│   └── core.js      # Lógica principal (Game loop, colisão, input, estados)
```

## ▶️ Como Executar

Abra o arquivo `index.html` em qualquer navegador moderno. Não requer servidor.

---

Criado por Antigravity
