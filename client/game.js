import { TILES } from '../shared/tiles.js';
import { Population, Bot } from '../shared/genome.js';
import { LEVELS } from './levels.js';

// Game constants
const MAX_CANVAS = 600;

export function getTileSize(w, h) {
    return Math.max(4, Math.floor(MAX_CANVAS / Math.max(w, h)));
}

// --- Helpers ---

function hslStr(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
}

function fillRoundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r <= 0) { ctx.fillRect(x, y, w, h); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
}

// --- Theme resolution ---

// Default theme matching the original hardcoded colors (for tutorial levels)
export const DEFAULT_THEME = Object.freeze({
    colors: {
        FLOOR: '#1a1a2e',
        WALL: '#8B4513',
        WALL_LIGHT: '#A0522D',
        WALL_DARK: '#5C2E0A',
        TARGET: 'hsl(230, 40%, 20%)',
        TARGET_HIGHLIGHT: 'hsl(230, 35%, 30%)',
        BOX: 'hsl(32, 40%, 62%)',
        BOX_SHADOW: 'hsl(32, 30%, 40%)',
        CHECK: 'hsl(145, 65%, 30%)',
        CHECK_SHADOW: 'hsl(145, 40%, 15%)',
        PLAYER: 'hsl(14, 80%, 58%)'
    },
    cornerRadiusFactor: 0,
    borderScale: 0.06,
    boxInset: 0.08,
    targetShape: 'diamond',
    playerShape: 'circle',
    floorPattern: 'none',
    floorPatternAlpha: 0,
    wallTexture: 'flat',
    wallTextureAlpha: 0,
    wallHighlight: false,
    boxCross: false,
    targetRings: 0
});

export function resolveVisualTheme(genome) {
    const g = genome.genes;
    const hue = g.palette * 360;
    const ts = g.tileStyle;
    const dec = g.decoration;

    const colors = {
        // Environment colors vary with genome palette
        FLOOR:                hslStr(hue, 15, 12),
        WALL:                 hslStr((hue + 30) % 360, 45, 35),
        WALL_LIGHT:           hslStr((hue + 30) % 360, 45, 45),
        WALL_DARK:            hslStr((hue + 30) % 360, 45, 23),
        // Game piece colors are fixed for consistency across phenotypes
        TARGET:               'hsl(230, 40%, 20%)',    // dark indigo pit
        TARGET_HIGHLIGHT:     'hsl(230, 35%, 30%)',    // pit edge highlight
        BOX:                  'hsl(32, 40%, 62%)',     // warm tan/sandstone rock
        BOX_SHADOW:           'hsl(32, 30%, 40%)',     // rock shadow
        CHECK:                'hsl(145, 65%, 30%)',    // dark green check mark
        CHECK_SHADOW:         'hsl(145, 40%, 15%)',    // check shadow
        PLAYER:               'hsl(14, 80%, 58%)'     // coral/orange accent
    };

    return {
        colors,
        // cornerRadius is per-tile; multiplied by tileSize at render time
        cornerRadiusFactor: ts * 0.4,
        borderScale: (1 - ts) * 0.12 + 0.02,
        boxInset: 0.08 + ts * 0.12,
        targetShape: ts < 0.33 ? 'diamond' : ts < 0.66 ? 'cross' : 'circle',
        playerShape: ts < 0.5 ? 'rounded_square' : 'circle',
        floorPattern: dec < 0.25 ? 'none' : dec < 0.50 ? 'dots' : dec < 0.75 ? 'grid_lines' : 'crosshatch',
        floorPatternAlpha: dec * 0.15,
        wallTexture: dec < 0.33 ? 'flat' : dec < 0.66 ? 'lines' : 'brick',
        wallTextureAlpha: Math.max(0, (dec - 0.25)) * 0.25,
        wallHighlight: dec > 0.5,
        boxCross: dec > 0.4,
        targetRings: Math.floor(dec * 3)  // 0, 1, or 2
    };
}

// Game state
export class Game {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentLevel = 0;
        this.moves = 0;
        this.pushes = 0;
        this.history = [];
        this.won = false;

        // Breeding mode state
        this.population = new Population(5); // Start with initial population
        this.currentBot = null; // Currently playing bot
        this.curatorBot = null; // Bot who curated/selected this level
        this.ratedBots = []; // Track rated bots with their scores
        this.currentLevelRating = 0;
        this.generationHistory = []; // Track stats over generations
        this.curationStats = []; // Track curator choices

        // Start fresh every page load (no persisted population)
        // this.loadState();

        this.setupControls();
        this.setupTouchGestures();

        // Generate first level automatically
        this.generateLevel();
    }

    handleTouch(dx, dy) {
        if (this.won) return;
        this.move(dx, dy);
    }

    setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        const minSwipeDistance = 30;

        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.won) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;

            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (absX < minSwipeDistance && absY < minSwipeDistance) {
                return;
            }

            if (absX > absY) {
                this.move(deltaX > 0 ? 1 : -1, 0);
            } else {
                this.move(0, deltaY > 0 ? 1 : -1);
            }

            e.preventDefault();
        }, { passive: false });
    }

    loadLevel(levelNum) {
        if (levelNum >= LEVELS.length) {
            this.showWin("All levels complete!");
            return;
        }

        this.currentLevel = levelNum;
        this.currentTheme = null; // Tutorial levels use DEFAULT_THEME
        const level = LEVELS[levelNum];
        this.width = level.width;
        this.height = level.height;
        this.grid = [...level.grid];
        this.moves = 0;
        this.pushes = 0;
        this.history = [];
        this.won = false;

        // Find player position
        const playerIdx = this.grid.indexOf(TILES.PLAYER);
        this.playerX = playerIdx % this.width;
        this.playerY = Math.floor(playerIdx / this.width);

        // Update canvas size
        const ts = getTileSize(this.width, this.height);
        this.canvas.width = this.width * ts;
        this.canvas.height = this.height * ts;

        this.updateUI();
        this.render();
    }

    reset() {
        // If it's a generated level, reset to saved state
        if (this.currentLevel === -1 && this.generatedLevelData) {
            const level = this.generatedLevelData;
            this.width = level.width;
            this.height = level.height;
            this.grid = [...level.grid]; // Copy the grid
            this.playerX = level.playerX;
            this.playerY = level.playerY;
            this.moves = 0;
            this.pushes = 0;
            this.history = [];
            this.won = false;

            const ts = getTileSize(this.width, this.height);
            this.canvas.width = this.width * ts;
            this.canvas.height = this.height * ts;

            this.updateUI();
            this.render();
        } else {
            // Regular level from LEVELS array
            this.loadLevel(this.currentLevel);
        }
    }

    nextLevel() {
        this.loadLevel(this.currentLevel + 1);
    }

    generateLevel() {
        // Show loading overlay, then defer heavy work so the browser can paint
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('visible');

        setTimeout(() => {
            this._doGenerateLevel();
            overlay.classList.remove('visible');
        }, 20);
    }

    _doGenerateLevel() {
        const genomes = this.population.getCurrentGeneration();

        // Pick a random bot to be the curator
        const curatorGenome = genomes[Math.floor(Math.random() * genomes.length)];
        this.curatorBot = new Bot(curatorGenome);

        // Curator evaluates all genomes and picks their favorite
        const curationResult = this.curatorBot.curate(genomes);
        const chosenGenome = curationResult.genome;
        const affinity = curationResult.affinity;

        // Create bot for the chosen genome
        this.currentBot = new Bot(chosenGenome);

        // Resolve visual theme from the chosen genome
        this.currentTheme = resolveVisualTheme(chosenGenome);

        // Track curation decision
        this.curationStats.push({
            curator: this.curatorBot.name,
            creator: this.currentBot.name,
            affinity: affinity,
            generation: this.population.generation
        });

        // Generate level from chosen genome
        const generatedLevel = this.currentBot.generateLevel();

        // Save the generated level data for reset functionality
        this.generatedLevelData = {
            width: generatedLevel.width,
            height: generatedLevel.height,
            grid: [...generatedLevel.grid], // Copy the grid
            playerX: generatedLevel.playerX,
            playerY: generatedLevel.playerY
        };

        // Load it as a custom level
        this.currentLevel = -1; // Mark as generated
        this.width = generatedLevel.width;
        this.height = generatedLevel.height;
        this.grid = generatedLevel.grid;
        this.playerX = generatedLevel.playerX;
        this.playerY = generatedLevel.playerY;
        this.moves = 0;
        this.pushes = 0;
        this.history = [];
        this.won = false;
        this.currentLevelRating = 0;

        // Update canvas size
        const ts = getTileSize(this.width, this.height);
        this.canvas.width = this.width * ts;
        this.canvas.height = this.height * ts;

        this.updateUI();
        this.render();
        this.updateRatingDisplay();
        this.updateBotDisplay();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.won) return;

            const key = e.key.toLowerCase();

            if (key === 'z') {
                this.undo();
                e.preventDefault();
            } else if (key === 'r') {
                this.reset();
                e.preventDefault();
            } else if (key === 'n') {
                this.nextLevel();
                e.preventDefault();
            } else {
                const moves = {
                    'arrowup': [0, -1],
                    'arrowdown': [0, 1],
                    'arrowleft': [-1, 0],
                    'arrowright': [1, 0],
                    'w': [0, -1],
                    's': [0, 1],
                    'a': [-1, 0],
                    'd': [1, 0]
                };

                if (moves[key]) {
                    this.move(...moves[key]);
                    e.preventDefault();
                }
            }
        });
    }

    move(dx, dy) {
        const newX = this.playerX + dx;
        const newY = this.playerY + dy;

        if (!this.isValid(newX, newY)) return;

        const targetTile = this.getTile(newX, newY);

        // Hit a wall
        if (targetTile === TILES.WALL) return;

        // Save state for undo
        this.saveState();

        // Check if pushing a box
        if (targetTile === TILES.BOX || targetTile === TILES.BOX_ON_TARGET) {
            const boxNewX = newX + dx;
            const boxNewY = newY + dy;

            if (!this.isValid(boxNewX, boxNewY)) {
                this.history.pop(); // Undo the save
                return;
            }

            const boxTargetTile = this.getTile(boxNewX, boxNewY);

            // Can't push into wall or another box
            if (boxTargetTile === TILES.WALL ||
                boxTargetTile === TILES.BOX ||
                boxTargetTile === TILES.BOX_ON_TARGET) {
                this.history.pop(); // Undo the save
                return;
            }

            // Move the box
            const isOnTarget = boxTargetTile === TILES.TARGET;
            this.setTile(boxNewX, boxNewY, isOnTarget ? TILES.BOX_ON_TARGET : TILES.BOX);
            this.pushes++;
        }

        // Clear old player position (restore target if needed)
        const wasOnTarget = this.getTile(this.playerX, this.playerY) === TILES.TARGET;
        this.setTile(this.playerX, this.playerY, wasOnTarget ? TILES.TARGET : TILES.FLOOR);

        // Clear box from new player position if present
        const movingToTarget = targetTile === TILES.TARGET || targetTile === TILES.BOX_ON_TARGET;

        // Move player
        this.playerX = newX;
        this.playerY = newY;
        this.setTile(newX, newY, movingToTarget ? TILES.TARGET : TILES.FLOOR);

        this.moves++;
        this.updateUI();
        this.render();
        this.checkWin();
    }

    undo() {
        if (this.history.length === 0) return;

        const state = this.history.pop();
        this.grid = [...state.grid]; // Make sure to copy the array
        this.playerX = state.playerX;
        this.playerY = state.playerY;
        this.moves = state.moves;
        this.pushes = state.pushes;
        this.won = false; // Reset win state when undoing

        this.updateUI();
        this.render();

        // Clear win message
        document.getElementById('win-message').textContent = '';
    }

    saveState() {
        this.history.push({
            grid: [...this.grid],
            playerX: this.playerX,
            playerY: this.playerY,
            moves: this.moves,
            pushes: this.pushes
        });
    }

    isValid(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    getTile(x, y) {
        return this.grid[y * this.width + x];
    }

    setTile(x, y, tile) {
        this.grid[y * this.width + x] = tile;
    }

    checkWin() {
        // Check if all boxes are on targets
        const hasLooseBox = this.grid.some(tile => tile === TILES.BOX);

        if (!hasLooseBox) {
            this.won = true;
            this.showWin("Level Complete!");
        }
    }

    showWin(message) {
        document.getElementById('win-message').textContent = message;
    }

    updateUI() {
        const levelText = this.currentLevel === -1 ? 'Generated' : this.currentLevel + 1;
        document.getElementById('level-num').textContent = levelText;
        document.getElementById('move-count').textContent = this.moves;
        document.getElementById('push-count').textContent = this.pushes;
        document.getElementById('win-message').textContent = '';
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const theme = this.currentTheme || DEFAULT_THEME;
        const C = theme.colors;
        const ts = getTileSize(this.width, this.height);
        const cr = (theme.cornerRadiusFactor || 0) * ts;
        const pad = Math.max(1, ts * theme.borderScale);

        // Draw grid
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.getTile(x, y);
                const px = x * ts;
                const py = y * ts;

                // Floor background for every tile
                ctx.fillStyle = C.FLOOR;
                ctx.fillRect(px, py, ts, ts);

                // Floor pattern overlay
                if (theme.floorPattern !== 'none' && theme.floorPatternAlpha > 0 && tile !== TILES.WALL) {
                    ctx.save();
                    ctx.globalAlpha = theme.floorPatternAlpha;
                    ctx.strokeStyle = C.WALL;
                    ctx.lineWidth = 1;
                    const cx = px + ts / 2;
                    const cy = py + ts / 2;
                    if (theme.floorPattern === 'dots') {
                        ctx.fillStyle = C.WALL;
                        ctx.beginPath();
                        ctx.arc(cx, cy, ts * 0.04, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (theme.floorPattern === 'grid_lines') {
                        ctx.beginPath();
                        ctx.moveTo(px, py + ts);
                        ctx.lineTo(px + ts, py + ts);
                        ctx.moveTo(px + ts, py);
                        ctx.lineTo(px + ts, py + ts);
                        ctx.stroke();
                    } else if (theme.floorPattern === 'crosshatch') {
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(px + ts, py + ts);
                        ctx.moveTo(px + ts, py);
                        ctx.lineTo(px, py + ts);
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                if (tile === TILES.WALL) {
                    // 3D-style wall with optional rounding
                    ctx.fillStyle = C.WALL_LIGHT;
                    fillRoundedRect(ctx, px, py, ts, ts, cr);
                    ctx.fillStyle = C.WALL;
                    fillRoundedRect(ctx, px + pad, py + pad, ts - pad, ts - pad, cr * 0.8);
                    ctx.fillStyle = C.WALL_DARK;
                    ctx.fillRect(px + pad, py + ts - pad, ts - pad, pad);
                    ctx.fillRect(px + ts - pad, py + pad, pad, ts - pad);

                    // Wall texture overlay
                    if (theme.wallTexture !== 'flat' && theme.wallTextureAlpha > 0) {
                        ctx.save();
                        ctx.globalAlpha = theme.wallTextureAlpha;
                        ctx.strokeStyle = C.WALL_DARK;
                        ctx.lineWidth = 1;
                        if (theme.wallTexture === 'lines') {
                            for (let i = 0.25; i < 1; i += 0.25) {
                                ctx.beginPath();
                                ctx.moveTo(px + pad, py + ts * i);
                                ctx.lineTo(px + ts - pad, py + ts * i);
                                ctx.stroke();
                            }
                        } else if (theme.wallTexture === 'brick') {
                            const bh = ts / 3;
                            for (let row = 0; row < 3; row++) {
                                const by = py + row * bh;
                                ctx.beginPath();
                                ctx.moveTo(px + pad, by + bh);
                                ctx.lineTo(px + ts - pad, by + bh);
                                ctx.stroke();
                                const offset = row % 2 === 0 ? 0 : ts / 2;
                                ctx.beginPath();
                                ctx.moveTo(px + offset + ts / 2, by);
                                ctx.lineTo(px + offset + ts / 2, by + bh);
                                ctx.stroke();
                            }
                        }
                        ctx.restore();
                    }

                    // Wall highlight (top-left shine)
                    if (theme.wallHighlight) {
                        ctx.save();
                        ctx.globalAlpha = 0.15;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(px + pad, py + pad, (ts - pad * 2) * 0.4, pad * 2);
                        ctx.fillRect(px + pad, py + pad, pad * 2, (ts - pad * 2) * 0.4);
                        ctx.restore();
                    }
                } else if (tile === TILES.TARGET) {
                    // Empty pit: dark indigo rounded square
                    const pitInset = ts * 0.08;
                    const pitSize = ts - pitInset * 2;
                    const pitR = pitSize * 0.4;
                    const so = Math.max(2, ts * 0.06); // shadow offset scales with tile
                    // Edge highlight
                    ctx.fillStyle = C.TARGET_HIGHLIGHT;
                    fillRoundedRect(ctx, px + pitInset + so, py + pitInset + so, pitSize, pitSize, pitR);
                    // Pit surface
                    ctx.fillStyle = C.TARGET;
                    fillRoundedRect(ctx, px + pitInset, py + pitInset, pitSize, pitSize, pitR);
                } else if (tile === TILES.BOX || tile === TILES.BOX_ON_TARGET) {
                    const isOnTarget = tile === TILES.BOX_ON_TARGET;
                    const cx = px + ts / 2;
                    const cy = py + ts / 2;
                    const half = ts * 0.5;  // points touch tile edges
                    const so = Math.max(2, ts * 0.06);

                    if (isOnTarget) {
                        // Draw the pit underneath
                        const pitInset = ts * 0.08;
                        const pitSize = ts - pitInset * 2;
                        const pitR = pitSize * 0.4;
                        ctx.fillStyle = C.TARGET_HIGHLIGHT;
                        fillRoundedRect(ctx, px + pitInset + so, py + pitInset + so, pitSize, pitSize, pitR);
                        ctx.fillStyle = C.TARGET;
                        fillRoundedRect(ctx, px + pitInset, py + pitInset, pitSize, pitSize, pitR);
                    }

                    // Sharp diamond
                    const dHalf = isOnTarget ? half * 0.82 : half;
                    function drawDiamond(ox, oy) {
                        ctx.beginPath();
                        ctx.moveTo(ox, oy - dHalf);       // top
                        ctx.lineTo(ox + dHalf, oy);       // right
                        ctx.lineTo(ox, oy + dHalf);       // bottom
                        ctx.lineTo(ox - dHalf, oy);       // left
                        ctx.closePath();
                        ctx.fill();
                    }

                    // Rock shadow
                    ctx.fillStyle = C.BOX_SHADOW;
                    drawDiamond(cx + so, cy + so);

                    // Rock surface
                    ctx.fillStyle = C.BOX;
                    drawDiamond(cx, cy);

                    // Large green check mark on completed targets
                    if (isOnTarget) {
                        const lw = Math.max(3, ts * 0.12);
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.lineWidth = lw;
                        // Check mark shifted up 4px
                        const cUp = 4;
                        // Shadow first (offset down-right)
                        ctx.strokeStyle = C.CHECK_SHADOW;
                        ctx.beginPath();
                        ctx.moveTo(cx - ts * 0.28 + 2, cy - cUp + 2);
                        ctx.lineTo(cx - ts * 0.06 + 2, cy + ts * 0.28 - cUp + 2);
                        ctx.lineTo(cx + ts * 0.38 + 2, cy - ts * 0.30 - cUp + 2);
                        ctx.stroke();
                        // Check mark
                        ctx.strokeStyle = C.CHECK;
                        ctx.beginPath();
                        ctx.moveTo(cx - ts * 0.28, cy - cUp);
                        ctx.lineTo(cx - ts * 0.06, cy + ts * 0.28 - cUp);
                        ctx.lineTo(cx + ts * 0.38, cy - ts * 0.30 - cUp);
                        ctx.stroke();
                    }
                }
                // FLOOR: already drawn as background
            }
        }

        // Draw player on top
        const pcx = this.playerX * ts + ts / 2;
        const pcy = this.playerY * ts + ts / 2;
        const pr = ts * 0.35;
        ctx.fillStyle = C.PLAYER;

        if (theme.playerShape === 'circle') {
            ctx.beginPath();
            ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // rounded_square
            fillRoundedRect(ctx, pcx - pr, pcy - pr, pr * 2, pr * 2, pr * 0.4);
        }
    }

    // === BREEDING MODE METHODS ===

    rateCurrentLevel(rating) {
        if (!this.currentBot) {
            alert('Generate a level first!');
            return;
        }

        this.currentLevelRating = rating;

        // Store this rating (store genome for breeding compatibility)
        this.ratedBots.push({
            bot: this.currentBot,
            genome: this.currentBot.genome,
            rating: rating
        });

        // Update star display
        this.updateRatingDisplay();

        // Update generation display
        this.updateGenerationDisplay();

        // Show breed button if we have enough ratings
        if (this.ratedBots.length >= 3) {
            document.getElementById('breed-btn').classList.add('visible');
        }
    }

    updateRatingDisplay() {
        const stars = document.querySelectorAll('.rating-stars .star-btn');
        stars.forEach((star, i) => {
            if (i < this.currentLevelRating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    updateGenerationDisplay() {
        const display = document.getElementById('generation-display');
        display.textContent = `Generation: ${this.population.generation} | Rated: ${this.ratedBots.length}`;
    }

    updateBotDisplay() {
        if (!this.currentBot) return;

        // Update curator info
        if (this.curatorBot) {
            const curatorInfo = document.getElementById('curator-name');
            curatorInfo.textContent = this.curatorBot.name;
            curatorInfo.style.color = this.curatorBot.colors.primary;
            curatorInfo.style.fontWeight = 'bold';
        }

        // Update creator bot name
        document.getElementById('bot-name').textContent = this.currentBot.name;

        // Update personality with dominant style
        const styleName = this.currentBot.genome.getDominantStyle();
        document.getElementById('bot-personality').textContent =
            `${this.currentBot.personality} [${styleName}]`;

        // Draw creator bot sprite
        const canvas = document.getElementById('bot-sprite');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.currentBot.drawSprite(ctx, 40, 40, 70);
    }

    updatePopulationStats() {
        const stats = this.population.getStats();
        const display = document.getElementById('population-stats');
        display.style.display = 'block';
        const sw = stats.styleWeights;
        const va = stats.visualAverages;
        const tsLabel = va.tileStyle < 0.33 ? 'Angular' : va.tileStyle < 0.66 ? 'Balanced' : 'Organic';
        const decLabel = va.decoration < 0.33 ? 'Minimal' : va.decoration < 0.66 ? 'Moderate' : 'Rich';
        display.innerHTML = `
            <strong>Population Averages (Gen ${stats.generation}):</strong><br>
            Grid: ${stats.averages.gridSize} |
            Boxes: ${stats.averages.boxCount} |
            Complexity: ${stats.averages.complexity} |
            Density: ${stats.averages.wallDensity}<br>
            <span style="color: #a78bfa;">Clusters ${sw.clusters}% / Maze ${sw.maze}% / Caves ${sw.caves}% / Rooms ${sw.clusteredRooms}%</span><br>
            <span style="color: #f0abfc;">Palette: ${va.palette}&deg; | Style: ${tsLabel} | Decor: ${decLabel}</span>
        `;

        // Update curation stats if available
        if (this.curationStats.length > 0) {
            const avgAffinity = this.curationStats.reduce((sum, s) => sum + s.affinity, 0) / this.curationStats.length;
            const curationDisplay = document.getElementById('curation-stats');
            curationDisplay.style.display = 'block';
            curationDisplay.innerHTML = `
                Curations: ${this.curationStats.length} selections |
                Avg affinity: ${(avgAffinity * 100).toFixed(1)}%
            `;
        }
    }

    saveGenerationHistory() {
        const stats = this.population.getStats();
        this.generationHistory.push({
            generation: stats.generation,
            timestamp: Date.now(),
            averages: stats.averages,
            styleWeights: stats.styleWeights,
            visualAverages: stats.visualAverages
        });
        this.savePersistentState();
    }

    savePersistentState() {
        const state = {
            population: this.population.toJSON(),
            generationHistory: this.generationHistory,
            timestamp: Date.now()
        };
        localStorage.setItem('machinaLudensState', JSON.stringify(state));
    }

    loadState() {
        try {
            const saved = localStorage.getItem('machinaLudensState');
            if (!saved) return;

            const state = JSON.parse(saved);
            this.population = Population.fromJSON(state.population);
            this.generationHistory = state.generationHistory || [];

            console.log(`Loaded state: Generation ${this.population.generation}, ${this.generationHistory.length} history entries`);
        } catch (e) {
            console.error('Failed to load saved state:', e);
        }
    }

    clearState() {
        if (confirm('Clear all evolution history and restart? This cannot be undone.')) {
            localStorage.removeItem('machinaLudensState');
            this.population = new Population(5);
            this.generationHistory = [];
            this.ratedBots = [];
            this.currentLevelRating = 0;
            this.updateGenerationDisplay();
            this.updatePopulationStats();
            alert('Evolution history cleared. Starting fresh!');
            this.generateLevel();
        }
    }

    exportHistory() {
        const data = {
            generationHistory: this.generationHistory,
            currentGeneration: this.population.generation,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `machina-ludens-history-gen${this.population.generation}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    toggleHistoryView() {
        const historyView = document.getElementById('history-view');
        if (historyView.style.display === 'none') {
            historyView.style.display = 'block';
            this.renderHistoryTable();
        } else {
            historyView.style.display = 'none';
        }
    }

    renderHistoryTable() {
        const content = document.getElementById('history-content');

        if (this.generationHistory.length === 0) {
            content.innerHTML = '<p style="color: #666; font-style: italic;">No generation history yet. Breed your first generation to start tracking!</p>';
            return;
        }

        let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">';
        html += '<thead><tr style="border-bottom: 1px solid #444;">';
        html += '<th style="padding: 5px; text-align: left; color: #aaa;">Gen</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Grid</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Boxes</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Complex</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Density</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Style</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Palette</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Tile</th>';
        html += '<th style="padding: 5px; text-align: right; color: #aaa;">Decor</th>';
        html += '</tr></thead><tbody>';

        this.generationHistory.forEach(entry => {
            // Determine dominant style from saved styleWeights if available
            let styleLabel = '-';
            if (entry.styleWeights) {
                const sw = entry.styleWeights;
                const styles = [
                    { name: 'Clusters', pct: sw.clusters },
                    { name: 'Maze', pct: sw.maze },
                    { name: 'Caves', pct: sw.caves },
                    { name: 'Rooms', pct: sw.clusteredRooms }
                ].sort((a, b) => b.pct - a.pct);
                styleLabel = `${styles[0].name} ${styles[0].pct}%`;
            }
            // Visual averages (backward compat for old history entries)
            const va = entry.visualAverages || {};
            const paletteLabel = va.palette !== undefined ? `${va.palette}\u00b0` : '-';
            const tileLabel = va.tileStyle !== undefined
                ? (va.tileStyle < 0.33 ? 'Ang' : va.tileStyle < 0.66 ? 'Bal' : 'Org')
                : '-';
            const decorLabel = va.decoration !== undefined
                ? (va.decoration < 0.33 ? 'Min' : va.decoration < 0.66 ? 'Mod' : 'Rich')
                : '-';
            html += '<tr style="border-bottom: 1px solid #333;">';
            html += `<td style="padding: 5px; color: #e0e0e0;">${entry.generation}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #4ade80;">${entry.averages.gridSize}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #60a5fa;">${entry.averages.boxCount}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #fbbf24;">${entry.averages.complexity}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #f87171;">${entry.averages.wallDensity}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #a78bfa;">${styleLabel}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #f0abfc;">${paletteLabel}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #f0abfc;">${tileLabel}</td>`;
            html += `<td style="padding: 5px; text-align: right; color: #f0abfc;">${decorLabel}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        content.innerHTML = html;
    }

    saveExperiment() {
        const experimentName = prompt('Name this experiment (e.g., "Large Board Culture", "Dense Maze Preference"):', `Experiment-Gen${this.population.generation}`);
        if (!experimentName) return;

        const data = {
            experimentName: experimentName,
            population: this.population.toJSON(),
            generationHistory: this.generationHistory,
            savedDate: new Date().toISOString(),
            currentGeneration: this.population.generation
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${experimentName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        alert(`Experiment "${experimentName}" saved!\n\nYou can load this file later to continue the experiment.`);
    }

    loadExperiment(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.population || !data.generationHistory) {
                    alert('Invalid experiment file format!');
                    return;
                }

                if (this.population.generation > 0 || this.generationHistory.length > 0) {
                    if (!confirm('Loading this experiment will replace your current progress. Continue?')) {
                        return;
                    }
                }

                this.population = Population.fromJSON(data.population);
                this.generationHistory = data.generationHistory;
                this.ratedBots = [];
                this.currentLevelRating = 0;

                this.savePersistentState(); // Save to localStorage
                this.updateGenerationDisplay();
                this.updatePopulationStats();

                alert(`Experiment "${data.experimentName || 'Unnamed'}" loaded!\n\nGeneration: ${this.population.generation}\nHistory entries: ${this.generationHistory.length}`);

                this.generateLevel();
            } catch (err) {
                alert('Failed to load experiment: ' + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);

        // Reset the file input so the same file can be loaded again
        event.target.value = '';
    }

    breedNextGeneration() {
        if (this.ratedBots.length < 3) {
            alert('Rate at least 3 levels before breeding!');
            return;
        }

        // Build fitness array for current population
        // For genomes that were rated, use those ratings
        // For unrated genomes, use average rating
        const avgRating = this.ratedBots.reduce((sum, r) => sum + r.rating, 0) / this.ratedBots.length;

        const genomes = this.population.getCurrentGeneration();
        const fitnessScores = genomes.map(genome => {
            // Find rating for this genome
            const rated = this.ratedBots.find(r => r.genome === genome);
            return rated ? rated.rating : avgRating * 0.5; // Unrated get half of average
        });

        // Evolve to next generation
        this.population.evolve(fitnessScores);

        // Save generation history
        this.saveGenerationHistory();

        // Reset rated bots for new generation
        this.ratedBots = [];
        this.currentLevelRating = 0;
        this.curationStats = []; // Reset curation stats for new generation
        this.updateRatingDisplay();
        this.updateGenerationDisplay();
        this.updatePopulationStats();

        // Hide breed button
        document.getElementById('breed-btn').classList.remove('visible');

        // Show stats
        const stats = this.population.getStats();
        const va = stats.visualAverages;
        const tsLabel = va.tileStyle < 0.33 ? 'Angular' : va.tileStyle < 0.66 ? 'Balanced' : 'Organic';
        const decLabel = va.decoration < 0.33 ? 'Minimal' : va.decoration < 0.66 ? 'Moderate' : 'Rich';
        alert(`Generation ${this.population.generation} created!\n\nAvg Grid Size: ${stats.averages.gridSize}\nAvg Boxes: ${stats.averages.boxCount}\nAvg Complexity: ${stats.averages.complexity}\nAvg Wall Density: ${stats.averages.wallDensity}\n\nPalette: ${va.palette}\u00b0 | Style: ${tsLabel} | Decor: ${decLabel}`);
    }
}
