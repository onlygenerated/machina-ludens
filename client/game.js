import { TILES } from '../shared/tiles.js';
import { Genome, Population, Bot } from '../shared/genome.js';
import { LEVELS } from './levels.js';

// Game constants
const MAX_CANVAS = 600;

const PHASES = Object.freeze({
    CHOOSE: 'CHOOSE',
    BREED: 'BREED',
    OBSERVE: 'OBSERVE'
});

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
        FLOOR:                hslStr(hue, 15, 12),
        WALL:                 hslStr((hue + 30) % 360, 45, 35),
        WALL_LIGHT:           hslStr((hue + 30) % 360, 45, 45),
        WALL_DARK:            hslStr((hue + 30) % 360, 45, 23),
        TARGET:               'hsl(230, 40%, 20%)',
        TARGET_HIGHLIGHT:     'hsl(230, 35%, 30%)',
        BOX:                  'hsl(32, 40%, 62%)',
        BOX_SHADOW:           'hsl(32, 30%, 40%)',
        CHECK:                'hsl(145, 65%, 30%)',
        CHECK_SHADOW:         'hsl(145, 40%, 15%)',
        PLAYER:               'hsl(14, 80%, 58%)'
    };

    return {
        colors,
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
        targetRings: Math.floor(dec * 3)
    };
}

// --- Overlay drawing helpers ---

function drawCollectible(ctx, cx, cy, tileSize) {
    const r = tileSize * 0.2;

    // Glow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Diamond shape
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.7, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.7, cy);
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.25, cy);
    ctx.lineTo(cx, cy + r * 0.15);
    ctx.lineTo(cx - r * 0.25, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawIce(ctx, px, py, tileSize) {
    // Semi-transparent blue overlay
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(px, py, tileSize, tileSize);
    ctx.restore();

    // Subtle diagonal lines
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const step = Math.max(3, tileSize / 4);
    for (let i = 0; i < tileSize * 2; i += step) {
        ctx.beginPath();
        ctx.moveTo(px + i, py);
        ctx.lineTo(px + i - tileSize, py + tileSize);
        ctx.stroke();
    }
    ctx.restore();

    // Small sparkle dots
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ccefff';
    const dotR = Math.max(1, tileSize * 0.03);
    ctx.beginPath(); ctx.arc(px + tileSize * 0.25, py + tileSize * 0.3, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + tileSize * 0.7, py + tileSize * 0.6, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + tileSize * 0.45, py + tileSize * 0.8, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawExit(ctx, cx, cy, tileSize) {
    const r = tileSize * 0.35;

    // Outer glow
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Portal ring
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = Math.max(2, tileSize * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner fill
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Smaller inner ring
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = Math.max(1, tileSize * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// --- Standalone grid renderer ---

function renderGrid(ctx, gridWidth, gridHeight, grid, playerX, playerY, theme, maxSize, overlays = null) {
    const tileSize = Math.max(4, Math.floor(maxSize / Math.max(gridWidth, gridHeight)));
    const canvasW = gridWidth * tileSize;
    const canvasH = gridHeight * tileSize;

    ctx.canvas.width = canvasW;
    ctx.canvas.height = canvasH;
    ctx.clearRect(0, 0, canvasW, canvasH);

    const C = theme.colors;
    const cr = (theme.cornerRadiusFactor || 0) * tileSize;
    const pad = Math.max(1, tileSize * theme.borderScale);

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const tile = grid[y * gridWidth + x];
            const px = x * tileSize;
            const py = y * tileSize;

            // Floor background
            ctx.fillStyle = C.FLOOR;
            ctx.fillRect(px, py, tileSize, tileSize);

            // Floor pattern overlay
            if (theme.floorPattern !== 'none' && theme.floorPatternAlpha > 0 && tile !== TILES.WALL) {
                ctx.save();
                ctx.globalAlpha = theme.floorPatternAlpha;
                ctx.strokeStyle = C.WALL;
                ctx.lineWidth = 1;
                const cx = px + tileSize / 2;
                const cy = py + tileSize / 2;
                if (theme.floorPattern === 'dots') {
                    ctx.fillStyle = C.WALL;
                    ctx.beginPath();
                    ctx.arc(cx, cy, tileSize * 0.04, 0, Math.PI * 2);
                    ctx.fill();
                } else if (theme.floorPattern === 'grid_lines') {
                    ctx.beginPath();
                    ctx.moveTo(px, py + tileSize);
                    ctx.lineTo(px + tileSize, py + tileSize);
                    ctx.moveTo(px + tileSize, py);
                    ctx.lineTo(px + tileSize, py + tileSize);
                    ctx.stroke();
                } else if (theme.floorPattern === 'crosshatch') {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + tileSize, py + tileSize);
                    ctx.moveTo(px + tileSize, py);
                    ctx.lineTo(px, py + tileSize);
                    ctx.stroke();
                }
                ctx.restore();
            }

            if (tile === TILES.WALL) {
                ctx.fillStyle = C.WALL_LIGHT;
                fillRoundedRect(ctx, px, py, tileSize, tileSize, cr);
                ctx.fillStyle = C.WALL;
                fillRoundedRect(ctx, px + pad, py + pad, tileSize - pad, tileSize - pad, cr * 0.8);
                ctx.fillStyle = C.WALL_DARK;
                ctx.fillRect(px + pad, py + tileSize - pad, tileSize - pad, pad);
                ctx.fillRect(px + tileSize - pad, py + pad, pad, tileSize - pad);

                if (theme.wallTexture !== 'flat' && theme.wallTextureAlpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = theme.wallTextureAlpha;
                    ctx.strokeStyle = C.WALL_DARK;
                    ctx.lineWidth = 1;
                    if (theme.wallTexture === 'lines') {
                        for (let i = 0.25; i < 1; i += 0.25) {
                            ctx.beginPath();
                            ctx.moveTo(px + pad, py + tileSize * i);
                            ctx.lineTo(px + tileSize - pad, py + tileSize * i);
                            ctx.stroke();
                        }
                    } else if (theme.wallTexture === 'brick') {
                        const bh = tileSize / 3;
                        for (let row = 0; row < 3; row++) {
                            const by = py + row * bh;
                            ctx.beginPath();
                            ctx.moveTo(px + pad, by + bh);
                            ctx.lineTo(px + tileSize - pad, by + bh);
                            ctx.stroke();
                            const offset = row % 2 === 0 ? 0 : tileSize / 2;
                            ctx.beginPath();
                            ctx.moveTo(px + offset + tileSize / 2, by);
                            ctx.lineTo(px + offset + tileSize / 2, by + bh);
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                }

                if (theme.wallHighlight) {
                    ctx.save();
                    ctx.globalAlpha = 0.15;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(px + pad, py + pad, (tileSize - pad * 2) * 0.4, pad * 2);
                    ctx.fillRect(px + pad, py + pad, pad * 2, (tileSize - pad * 2) * 0.4);
                    ctx.restore();
                }
            } else if (tile === TILES.TARGET) {
                const pitInset = tileSize * 0.08;
                const pitSize = tileSize - pitInset * 2;
                const pitR = pitSize * 0.4;
                const so = Math.max(2, tileSize * 0.06);
                ctx.fillStyle = C.TARGET_HIGHLIGHT;
                fillRoundedRect(ctx, px + pitInset + so, py + pitInset + so, pitSize, pitSize, pitR);
                ctx.fillStyle = C.TARGET;
                fillRoundedRect(ctx, px + pitInset, py + pitInset, pitSize, pitSize, pitR);
            } else if (tile === TILES.BOX || tile === TILES.BOX_ON_TARGET) {
                const isOnTarget = tile === TILES.BOX_ON_TARGET;
                const cx = px + tileSize / 2;
                const cy = py + tileSize / 2;
                const half = tileSize * 0.5;
                const so = Math.max(2, tileSize * 0.06);

                if (isOnTarget) {
                    const pitInset = tileSize * 0.08;
                    const pitSize = tileSize - pitInset * 2;
                    const pitR = pitSize * 0.4;
                    ctx.fillStyle = C.TARGET_HIGHLIGHT;
                    fillRoundedRect(ctx, px + pitInset + so, py + pitInset + so, pitSize, pitSize, pitR);
                    ctx.fillStyle = C.TARGET;
                    fillRoundedRect(ctx, px + pitInset, py + pitInset, pitSize, pitSize, pitR);
                }

                const dHalf = isOnTarget ? half * 0.82 : half;
                function drawDiamond(ox, oy) {
                    ctx.beginPath();
                    ctx.moveTo(ox, oy - dHalf);
                    ctx.lineTo(ox + dHalf, oy);
                    ctx.lineTo(ox, oy + dHalf);
                    ctx.lineTo(ox - dHalf, oy);
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.fillStyle = C.BOX_SHADOW;
                drawDiamond(cx + so, cy + so);
                ctx.fillStyle = C.BOX;
                drawDiamond(cx, cy);

                if (isOnTarget) {
                    const lw = Math.max(3, tileSize * 0.12);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.lineWidth = lw;
                    const cUp = 4;
                    ctx.strokeStyle = C.CHECK_SHADOW;
                    ctx.beginPath();
                    ctx.moveTo(cx - tileSize * 0.28 + 2, cy - cUp + 2);
                    ctx.lineTo(cx - tileSize * 0.06 + 2, cy + tileSize * 0.28 - cUp + 2);
                    ctx.lineTo(cx + tileSize * 0.38 + 2, cy - tileSize * 0.30 - cUp + 2);
                    ctx.stroke();
                    ctx.strokeStyle = C.CHECK;
                    ctx.beginPath();
                    ctx.moveTo(cx - tileSize * 0.28, cy - cUp);
                    ctx.lineTo(cx - tileSize * 0.06, cy + tileSize * 0.28 - cUp);
                    ctx.lineTo(cx + tileSize * 0.38, cy - tileSize * 0.30 - cUp);
                    ctx.stroke();
                }
            }
        }
    }

    // Draw overlays (collectibles, ice, exit) on top of floor tiles
    if (overlays) {
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const overlay = overlays[y * gridWidth + x];
                if (overlay === 0) continue;

                const px = x * tileSize;
                const py = y * tileSize;
                const cx = px + tileSize / 2;
                const cy = py + tileSize / 2;

                if (overlay === TILES.COLLECTIBLE) {
                    drawCollectible(ctx, cx, cy, tileSize);
                } else if (overlay === TILES.ICE) {
                    drawIce(ctx, px, py, tileSize);
                } else if (overlay === TILES.EXIT) {
                    drawExit(ctx, cx, cy, tileSize);
                }
            }
        }
    }

    // Draw player
    const pcx = playerX * tileSize + tileSize / 2;
    const pcy = playerY * tileSize + tileSize / 2;
    const pr = tileSize * 0.35;
    ctx.fillStyle = C.PLAYER;

    if (theme.playerShape === 'circle') {
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
        ctx.fill();
    } else {
        fillRoundedRect(ctx, pcx - pr, pcy - pr, pr * 2, pr * 2, pr * 0.4);
    }
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

        // Phase state
        this.phase = PHASES.CHOOSE;

        // Population
        this.population = new Population(5);
        this.generationHistory = [];
        this.lastBreedingReport = null;

        // Tournament state
        this.tournamentRound = 0;
        this.roundWinners = [];
        this.roundSlots = [];
        this.activeLevelIdx = null;  // null=comparison, 0/1/2=playing
        this.tournamentPool = [];    // 15 slot objects

        // Overlay and DNA state
        this.overlays = null;
        this.dnaCollected = 0;       // DNA collected this level
        this.dnaBank = 0;            // Total DNA across all levels

        this.setupControls();
        this.setupTouchGestures();

        // Start the phase loop
        this.startTournament();
    }

    get isPlaying() {
        return this.activeLevelIdx !== null;
    }

    handleTouch(dx, dy) {
        if (!this.isPlaying) return;
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
            if (!this.isPlaying) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;

            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (absX < minSwipeDistance && absY < minSwipeDistance) return;

            if (absX > absY) {
                this.move(deltaX > 0 ? 1 : -1, 0);
            } else {
                this.move(0, deltaY > 0 ? 1 : -1);
            }

            e.preventDefault();
        }, { passive: false });
    }

    reset() {
        if (this.activeLevelIdx !== null && this.generatedLevelData) {
            const level = this.generatedLevelData;
            this.width = level.width;
            this.height = level.height;
            this.grid = [...level.grid];
            this.overlays = level.overlays ? [...level.overlays] : null;
            this.playerX = level.playerX;
            this.playerY = level.playerY;
            this.moves = 0;
            this.pushes = 0;
            this.history = [];
            this.won = false;
            // Undo any DNA collected this level
            this.dnaBank = Math.max(0, this.dnaBank - this.dnaCollected);
            this.dnaCollected = 0;

            this.updateUI();
            this.render();
        }
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying) return;

            const key = e.key.toLowerCase();

            if (key === 'z') {
                this.undo();
                e.preventDefault();
            } else if (key === 'r') {
                this.reset();
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
        if (this.won) return;

        const newX = this.playerX + dx;
        const newY = this.playerY + dy;

        if (!this.isValid(newX, newY)) return;

        const targetTile = this.getTile(newX, newY);
        if (targetTile === TILES.WALL) return;

        this.saveState();

        if (targetTile === TILES.BOX || targetTile === TILES.BOX_ON_TARGET) {
            const boxNewX = newX + dx;
            const boxNewY = newY + dy;

            if (!this.isValid(boxNewX, boxNewY)) {
                this.history.pop();
                return;
            }

            const boxTargetTile = this.getTile(boxNewX, boxNewY);

            if (boxTargetTile === TILES.WALL ||
                boxTargetTile === TILES.BOX ||
                boxTargetTile === TILES.BOX_ON_TARGET) {
                this.history.pop();
                return;
            }

            const isOnTarget = boxTargetTile === TILES.TARGET;
            this.setTile(boxNewX, boxNewY, isOnTarget ? TILES.BOX_ON_TARGET : TILES.BOX);
            this.pushes++;
        }

        const wasOnTarget = this.getTile(this.playerX, this.playerY) === TILES.TARGET;
        this.setTile(this.playerX, this.playerY, wasOnTarget ? TILES.TARGET : TILES.FLOOR);

        const movingToTarget = targetTile === TILES.TARGET || targetTile === TILES.BOX_ON_TARGET;

        this.playerX = newX;
        this.playerY = newY;
        this.setTile(newX, newY, movingToTarget ? TILES.TARGET : TILES.FLOOR);

        // Collect overlay at new position
        this._collectOverlay();

        // Ice sliding — player slides on ice until hitting obstacle
        this._handleIceSlide(dx, dy);

        this.moves++;
        this.updateUI();
        this.render();
        this.checkWin();
    }

    _collectOverlay() {
        if (!this.overlays) return;
        const idx = this.playerY * this.width + this.playerX;
        if (this.overlays[idx] === TILES.COLLECTIBLE) {
            this.overlays[idx] = 0;
            this.dnaCollected++;
            this.dnaBank++;
        }
    }

    _handleIceSlide(dx, dy) {
        if (!this.overlays) return;

        let idx = this.playerY * this.width + this.playerX;
        while (this.overlays[idx] === TILES.ICE) {
            const slideX = this.playerX + dx;
            const slideY = this.playerY + dy;

            if (!this.isValid(slideX, slideY)) break;

            const nextTile = this.getTile(slideX, slideY);
            if (nextTile === TILES.WALL || nextTile === TILES.BOX || nextTile === TILES.BOX_ON_TARGET) break;

            // Leave current ice tile — restore floor (preserve TARGET)
            const leavingTile = this.getTile(this.playerX, this.playerY);
            this.setTile(this.playerX, this.playerY, leavingTile === TILES.TARGET ? TILES.TARGET : TILES.FLOOR);

            // Move player to next position
            this.playerX = slideX;
            this.playerY = slideY;

            // Set grid at new position (preserve TARGET if present)
            const isTarget = nextTile === TILES.TARGET;
            this.setTile(slideX, slideY, isTarget ? TILES.TARGET : TILES.FLOOR);

            // Collect overlay at new position
            this._collectOverlay();

            idx = this.playerY * this.width + this.playerX;
        }
    }

    undo() {
        if (this.history.length === 0) return;

        const state = this.history.pop();
        this.grid = [...state.grid];
        this.overlays = state.overlays ? [...state.overlays] : null;
        this.playerX = state.playerX;
        this.playerY = state.playerY;
        this.moves = state.moves;
        this.pushes = state.pushes;
        // Undo DNA collection
        const dnaDelta = (this.dnaCollected || 0) - (state.dnaCollected || 0);
        this.dnaCollected = state.dnaCollected || 0;
        this.dnaBank = Math.max(0, (this.dnaBank || 0) - dnaDelta);
        this.won = false;

        this.updateUI();
        this.render();
        this.checkWin();
    }

    saveState() {
        this.history.push({
            grid: [...this.grid],
            overlays: this.overlays ? [...this.overlays] : null,
            playerX: this.playerX,
            playerY: this.playerY,
            moves: this.moves,
            pushes: this.pushes,
            dnaCollected: this.dnaCollected || 0
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
        const hasLooseBox = this.grid.some(tile => tile === TILES.BOX);
        if (hasLooseBox) return;

        // If exit overlay exists, player must be standing on it
        if (this.overlays) {
            const hasExit = this.overlays.some(o => o === TILES.EXIT);
            if (hasExit) {
                const playerOverlay = this.overlays[this.playerY * this.width + this.playerX];
                if (playerOverlay !== TILES.EXIT) {
                    // Show hint that player needs to reach exit
                    document.getElementById('win-message').textContent = 'All boxes placed! Find the exit...';
                    return;
                }
            }
        }

        this.won = true;
        document.getElementById('win-message').textContent = 'Level Complete!';

        // Mark slot as completed
        if (this.activeLevelIdx !== null) {
            this.roundSlots[this.activeLevelIdx].completed = true;
        }
    }

    showWin(message) {
        document.getElementById('win-message').textContent = message;
    }

    updateUI() {
        document.getElementById('move-count').textContent = this.moves;
        document.getElementById('push-count').textContent = this.pushes;
        document.getElementById('win-message').textContent = '';
        const dnaEl = document.getElementById('dna-count');
        if (dnaEl) dnaEl.textContent = this.dnaCollected || 0;
        const dnaBankEl = document.getElementById('dna-bank-count');
        if (dnaBankEl) dnaBankEl.textContent = this.dnaBank || 0;
    }

    render() {
        const theme = this.currentTheme || DEFAULT_THEME;
        renderGrid(this.ctx, this.width, this.height, this.grid, this.playerX, this.playerY, theme, MAX_CANVAS, this.overlays);
    }

    // === PHASE STATE MACHINE ===

    setPhase(phase) {
        this.phase = phase;
        this.updatePhaseUI();
    }

    updatePhaseUI() {
        const phase = this.phase;

        // Update phase bar highlights
        const steps = document.querySelectorAll('.phase-step');
        const order = [PHASES.CHOOSE, PHASES.BREED, PHASES.OBSERVE];
        const currentIdx = order.indexOf(phase);
        steps.forEach((step, i) => {
            step.classList.remove('active', 'completed');
            if (i === currentIdx) step.classList.add('active');
            else if (i < currentIdx) step.classList.add('completed');
        });

        // Element visibility
        const comparisonView = document.getElementById('comparison-view');
        const playView = document.getElementById('play-view');
        const observeView = document.getElementById('observe-view');
        const touchControls = document.getElementById('touch-controls');
        const phaseBar = document.getElementById('phase-bar');

        // Hide everything first
        comparisonView.style.display = 'none';
        playView.style.display = 'none';
        observeView.style.display = 'none';

        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        touchControls.style.display = 'none';

        phaseBar.style.display = 'flex';

        switch (phase) {
            case PHASES.CHOOSE:
                if (this.isPlaying) {
                    playView.style.display = 'block';
                    touchControls.style.display = (isMobile) ? 'flex' : 'none';
                } else {
                    comparisonView.style.display = 'block';
                }
                break;
            case PHASES.OBSERVE:
                observeView.style.display = 'block';
                break;
        }
    }

    // === TOURNAMENT METHODS ===

    startTournament() {
        this.tournamentRound = 0;
        this.roundWinners = [];
        this.activeLevelIdx = null;
        this._buildTournamentPool();
        this.setPhase(PHASES.CHOOSE); // Show comparison view BEFORE generating (so overlay is visible)
        this._setupRound(0);
    }

    _buildTournamentPool() {
        const genomes = [...this.population.getCurrentGeneration()]; // 5 genomes

        // Build 15 slots: each genome appears exactly 3 times across 5 rounds of 3
        // Rejection-sample to ensure no round has duplicate genomes
        let rounds;
        do {
            const indices = [];
            for (let i = 0; i < 5; i++) {
                indices.push(i, i, i); // 3 copies of each index
            }
            // Shuffle
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            // Deal into 5 rounds of 3
            rounds = [];
            for (let r = 0; r < 5; r++) {
                rounds.push(indices.slice(r * 3, r * 3 + 3));
            }
        } while (rounds.some(r => new Set(r).size < 3));

        this.tournamentPool = [];
        for (const round of rounds) {
            for (const idx of round) {
                this.tournamentPool.push({
                    genome: genomes[idx],
                    bot: null,
                    theme: null,
                    levelData: null,
                    completed: false
                });
            }
        }
    }

    _setupRound(roundIdx) {
        this.tournamentRound = roundIdx;
        this.activeLevelIdx = null;

        const startIdx = roundIdx * 3;
        this.roundSlots = this.tournamentPool.slice(startIdx, startIdx + 3);

        // Show loading overlay while generating levels
        const overlay = document.getElementById('round-loading-overlay');
        if (overlay) overlay.style.display = 'flex';

        // Double rAF ensures the browser actually paints the overlay before
        // the heavy generation work blocks the main thread
        const doGenerate = () => {
            for (const slot of this.roundSlots) {
                slot.bot = new Bot(slot.genome);
                slot.theme = resolveVisualTheme(slot.genome);
                slot.completed = false;

                const level = slot.genome.generateLevel();
                slot.levelData = {
                    width: level.width,
                    height: level.height,
                    grid: [...level.grid],
                    overlays: level.overlays ? [...level.overlays] : null,
                    playerX: level.playerX,
                    playerY: level.playerY
                };
            }

            if (overlay) overlay.style.display = 'none';
            this._renderComparisonView();
        };
        // Two nested rAFs: first lets the overlay render, second runs generation after paint
        requestAnimationFrame(() => requestAnimationFrame(doGenerate));
    }

    _renderComparisonView() {
        // Update round counter
        document.getElementById('round-counter').textContent = `Round ${this.tournamentRound + 1} of 5`;

        const cardsContainer = document.getElementById('preview-cards');
        // Clear existing cards
        while (cardsContainer.firstChild) {
            cardsContainer.removeChild(cardsContainer.firstChild);
        }

        for (let i = 0; i < 3; i++) {
            const slot = this.roundSlots[i];
            const card = document.createElement('div');
            card.className = 'preview-card';

            // Preview canvas
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 180;
            previewCanvas.height = 180;
            previewCanvas.style.cssText = 'display: block; background: #1a1a1a; border-radius: 4px; width: 100%;';
            const previewCtx = previewCanvas.getContext('2d');
            renderGrid(previewCtx, slot.levelData.width, slot.levelData.height,
                slot.levelData.grid, slot.levelData.playerX, slot.levelData.playerY,
                slot.theme, 180, slot.levelData.overlays);
            card.appendChild(previewCanvas);

            // Bot name
            const nameDiv = document.createElement('div');
            nameDiv.className = 'preview-bot-name';
            nameDiv.textContent = slot.bot.name;
            nameDiv.style.color = slot.bot.colors.primary;
            card.appendChild(nameDiv);

            // Traits line with mechanic indicators
            const genes = slot.genome.genes;
            const dominantStyle = slot.genome.getDominantStyle();
            const traitsDiv = document.createElement('div');
            traitsDiv.className = 'preview-traits';
            let traitText = `${genes.gridSize}\u00d7${genes.gridSize} \u00b7 ${genes.boxCount} boxes \u00b7 ${dominantStyle}`;
            if (genes.iceEnabled) traitText += ' \u00b7 Ice';
            if (genes.exitEnabled) traitText += ' \u00b7 Exit';
            traitsDiv.textContent = traitText;
            card.appendChild(traitsDiv);

            // Origin label (champion / child / wild card / founder)
            const lineageRec = this.population.lineage.find(r => r.id === slot.genome._id);
            let originText, originColor;
            if (!lineageRec || lineageRec.parentIds.length === 0 && !lineageRec.isWildCard) {
                originText = 'Founder';
                originColor = '#9ca3af';
            } else if (lineageRec.isElite) {
                originText = '\u2605 Champion';
                originColor = '#fbbf24';
            } else if (lineageRec.isWildCard) {
                originText = 'Wild Card';
                originColor = '#c4b5fd';
            } else {
                originText = 'Child';
                originColor = '#6ee7b7';
            }
            const originDiv = document.createElement('div');
            originDiv.className = 'preview-origin';
            originDiv.textContent = originText;
            originDiv.style.color = originColor;
            card.appendChild(originDiv);

            // Completed check (hidden initially)
            const checkDiv = document.createElement('div');
            checkDiv.className = 'preview-completed';
            checkDiv.id = `preview-check-${i}`;
            checkDiv.textContent = '\u2714 Solved';
            checkDiv.style.display = 'none';
            card.appendChild(checkDiv);

            // Button row
            const btnRow = document.createElement('div');
            btnRow.className = 'preview-btn-row';

            const playBtn = document.createElement('button');
            playBtn.className = 'preview-play-btn';
            playBtn.textContent = 'Play';
            const playIdx = i;
            playBtn.onclick = () => this.expandLevel(playIdx);
            btnRow.appendChild(playBtn);

            const chooseBtn = document.createElement('button');
            chooseBtn.className = 'preview-choose-btn';
            chooseBtn.textContent = 'Choose';
            const chooseIdx = i;
            chooseBtn.onclick = () => this.chooseWinner(chooseIdx);
            btnRow.appendChild(chooseBtn);

            card.appendChild(btnRow);

            cardsContainer.appendChild(card);
        }

        this.updatePhaseUI();
    }

    expandLevel(idx) {
        this.activeLevelIdx = idx;
        const slot = this.roundSlots[idx];

        // Load level into game state (always fresh)
        this.currentLevel = -1;
        this.currentTheme = slot.theme;
        this.width = slot.levelData.width;
        this.height = slot.levelData.height;
        this.grid = [...slot.levelData.grid];
        this.overlays = slot.levelData.overlays ? [...slot.levelData.overlays] : null;
        this.playerX = slot.levelData.playerX;
        this.playerY = slot.levelData.playerY;
        this.moves = 0;
        this.pushes = 0;
        this.history = [];
        this.won = false;
        this.dnaCollected = 0;

        // Save for reset
        this.generatedLevelData = {
            width: slot.levelData.width,
            height: slot.levelData.height,
            grid: [...slot.levelData.grid],
            overlays: slot.levelData.overlays ? [...slot.levelData.overlays] : null,
            playerX: slot.levelData.playerX,
            playerY: slot.levelData.playerY
        };

        // Update play view bot info
        document.getElementById('play-bot-name').textContent = slot.bot.name;
        document.getElementById('play-bot-name').style.color = slot.bot.colors.primary;

        this.updateUI();
        this.render();
        this.updatePhaseUI();
    }

    backToComparison() {
        // Update the completed check if this level was solved
        if (this.activeLevelIdx !== null) {
            const slot = this.roundSlots[this.activeLevelIdx];
            if (slot.completed) {
                const checkEl = document.getElementById(`preview-check-${this.activeLevelIdx}`);
                if (checkEl) checkEl.style.display = 'block';
            }
        }

        this.activeLevelIdx = null;
        document.getElementById('win-message').textContent = '';
        this._renderComparisonView();
    }

    chooseWinner(idx) {
        const slot = this.roundSlots[idx];
        this.roundWinners.push(slot.genome);
        this.activeLevelIdx = null;
        document.getElementById('win-message').textContent = '';

        const nextRound = this.tournamentRound + 1;
        if (nextRound < 5) {
            this._setupRound(nextRound);
        } else {
            this._triggerTournamentBreed();
        }
    }

    _triggerTournamentBreed() {
        const report = this.population.evolveFromWinners(this.roundWinners);
        this.lastBreedingReport = report;
        this.saveGenerationHistory();

        this._populateObserveOverlay();
        this.setPhase(PHASES.OBSERVE);
    }

    // === OBSERVE OVERLAY ===

    _createBotLine(genome, subtitle) {
        const bot = new Bot(genome);
        const line = document.createElement('div');
        line.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 3px 0;';

        const swatch = document.createElement('span');
        swatch.style.cssText = `display: inline-block; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: ${bot.colors.primary};`;
        line.appendChild(swatch);

        const textWrap = document.createElement('span');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = bot.name;
        nameSpan.style.color = '#e0e0e0';
        textWrap.appendChild(nameSpan);

        if (subtitle) {
            const sub = document.createElement('div');
            sub.textContent = subtitle;
            sub.style.cssText = 'font-size: 0.8em; color: #666; margin-top: 1px;';
            textWrap.appendChild(sub);
        }

        line.appendChild(textWrap);
        return line;
    }

    _populateObserveOverlay() {
        const report = this.lastBreedingReport;
        const container = document.getElementById('observe-stats');
        container.textContent = '';

        document.getElementById('observe-generation').textContent =
            report ? report.generation : this.population.generation;

        if (!report) return;

        // CHAMPION section
        const champHeader = document.createElement('div');
        champHeader.textContent = 'CHAMPION';
        champHeader.style.cssText = 'color: #fbbf24; font-weight: bold; font-size: 0.85em; letter-spacing: 0.05em; margin-bottom: 4px;';
        container.appendChild(champHeader);
        container.appendChild(this._createBotLine(report.elite.genome, 'Survived unchanged'));

        // NEW OFFSPRING section (bred from winners only)
        const bred = report.offspring.filter(r => r.parent1Genome !== null);
        const wildcards = report.offspring.filter(r => r.parent1Genome === null);

        if (bred.length > 0) {
            const offspringHeader = document.createElement('div');
            offspringHeader.textContent = 'NEW OFFSPRING';
            offspringHeader.style.cssText = 'color: #4ade80; font-weight: bold; font-size: 0.85em; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 4px;';
            container.appendChild(offspringHeader);

            for (const rec of bred) {
                const p1 = new Bot(rec.parent1Genome).name;
                const p2 = new Bot(rec.parent2Genome).name;
                const parentLabel = rec.parent1Genome === rec.parent2Genome
                    ? `from ${p1} (self-cross)`
                    : `from ${p1} + ${p2}`;
                container.appendChild(this._createBotLine(rec.genome, parentLabel));
            }
        }

        // WILD CARD section (fresh random genome injected for diversity)
        if (wildcards.length > 0) {
            const wildcardHeader = document.createElement('div');
            wildcardHeader.textContent = 'WILD CARD';
            wildcardHeader.style.cssText = 'color: #a78bfa; font-weight: bold; font-size: 0.85em; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 4px;';
            container.appendChild(wildcardHeader);

            for (const rec of wildcards) {
                container.appendChild(this._createBotLine(rec.genome, 'Fresh genome — unknown lineage'));
            }
        }

        // RETIRED section
        if (report.eliminated.length > 0) {
            const retiredHeader = document.createElement('div');
            retiredHeader.textContent = 'RETIRED';
            retiredHeader.style.cssText = 'color: #555; font-weight: bold; font-size: 0.85em; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 4px;';
            container.appendChild(retiredHeader);

            for (const genome of report.eliminated) {
                const line = this._createBotLine(genome);
                line.style.opacity = '0.6';
                line.style.fontSize = '0.9em';
                container.appendChild(line);
            }
        }

        // Render family tree
        this._renderFamilyTree();
    }

    _renderFamilyTree() {
        const canvas = document.getElementById('family-tree-canvas');
        if (!canvas) return;

        const lineage = this.population.lineage;
        if (!lineage || lineage.length === 0) return;

        // Group by generation
        const byGen = new Map();
        for (const rec of lineage) {
            if (!byGen.has(rec.generation)) byGen.set(rec.generation, []);
            byGen.get(rec.generation).push(rec);
        }

        const generations = [...byGen.keys()].sort((a, b) => a - b);
        const visibleGens = generations.slice(-6);

        // If only one generation, show placeholder
        if (visibleGens.length < 2) {
            canvas.width = 320;
            canvas.height = 44;
            canvas.style.background = 'transparent';
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 320, 44);
            ctx.fillStyle = '#555';
            ctx.font = '11px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('Complete a cycle to grow the family tree', 160, 26);
            return;
        }

        const NODE_R = 11;
        const COL_W = 60;
        const ROW_H = 70;
        const LABEL_W = 30; // left margin for gen labels
        const PAD_Y = 20;
        const LEGEND_H = 26;

        const maxBots = Math.max(...visibleGens.map(g => byGen.get(g).length));
        const canvasW = LABEL_W + maxBots * COL_W + 20; // +20 right padding so rightmost node isn't clipped
        const canvasH = PAD_Y + visibleGens.length * ROW_H + LEGEND_H;

        canvas.width = canvasW;
        canvas.height = canvasH;
        canvas.style.background = '#1a1a22';
        canvas.style.borderRadius = '8px';
        canvas.style.padding = '0';

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasW, canvasH);

        // Alternating row backgrounds for readability
        visibleGens.forEach((gen, rowIdx) => {
            if (rowIdx % 2 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                ctx.fillRect(0, PAD_Y + rowIdx * ROW_H - ROW_H * 0.35, canvasW, ROW_H);
            }
        });

        // Consistent color per genome id — returns plain HSL string
        const getColor = (rec) => {
            if (rec.isWildCard) return `hsl(270, 80%, 72%)`;
            if (rec.isElite) return `hsl(45, 100%, 62%)`;
            const hue = (parseInt(rec.id, 36) * 137) % 360;
            return `hsl(${hue}, 70%, 68%)`;
        };
        // Name from stored lineage record (matches Bot names in the Observe list above)
        const getName = (rec) => rec.name || rec.id;

        // Compute node positions
        const nodePos = new Map();
        visibleGens.forEach((gen, rowIdx) => {
            const bots = byGen.get(gen);
            const rowW = bots.length * COL_W;
            const startX = LABEL_W + (canvasW - LABEL_W - rowW) / 2 + COL_W / 2;
            const y = PAD_Y + rowIdx * ROW_H;
            bots.forEach((rec, colIdx) => {
                const x = startX + colIdx * COL_W;
                nodePos.set(rec.id, { x, y, color: getColor(rec), rec });
            });
        });

        // Draw edges — bright, visible lines
        for (const [id, pos] of nodePos) {
            const { rec } = pos;
            if (!rec.parentIds || rec.parentIds.length === 0) continue;
            const drawnParents = new Set();
            for (const pid of rec.parentIds) {
                if (drawnParents.has(pid)) continue;
                drawnParents.add(pid);
                const ppos = nodePos.get(pid);
                if (!ppos) continue;
                const midY = (ppos.y + pos.y) / 2;
                // Bright line — use globalAlpha since HSL strings can't take hex alpha suffix
                ctx.globalAlpha = 0.75;
                ctx.beginPath();
                ctx.moveTo(ppos.x, ppos.y + NODE_R);
                ctx.bezierCurveTo(ppos.x, midY, pos.x, midY, pos.x, pos.y - NODE_R);
                ctx.strokeStyle = pos.color; // child's color
                ctx.lineWidth = 2.5;
                ctx.setLineDash([]);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }

        // Draw nodes on top of edges
        for (const [id, pos] of nodePos) {
            const { x, y, color, rec } = pos;

            // Dark backing circle so node is crisp on any edge color
            ctx.beginPath();
            ctx.arc(x, y, NODE_R + 2, 0, Math.PI * 2);
            ctx.fillStyle = '#1a1a22';
            ctx.fill();

            // Glow for elite
            if (rec.isElite) {
                ctx.beginPath();
                ctx.arc(x, y, NODE_R + 7, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(251,191,36,0.15)';
                ctx.fill();
            }

            // Node fill
            ctx.beginPath();
            ctx.arc(x, y, NODE_R, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Node border
            ctx.beginPath();
            ctx.arc(x, y, NODE_R, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Wild card: dashed outer ring (purple)
            if (rec.isWildCard) {
                ctx.beginPath();
                ctx.arc(x, y, NODE_R + 4, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(192,160,255,0.65)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Elite: star glyph
            if (rec.isElite) {
                ctx.fillStyle = '#1a1a1a';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', x, y);
                ctx.textBaseline = 'alphabetic';
            }

            // Name below node — same name as shown in Observe list
            ctx.fillStyle = color;
            ctx.font = '8px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(getName(rec), x, y + NODE_R + 11);

            // Gen label at left edge of each row (once per row)
            const rowNodes = [...nodePos.values()].filter(p => p.rec.generation === rec.generation);
            if (rowNodes[0] === pos) {
                ctx.fillStyle = '#555';
                ctx.font = 'bold 9px Courier New';
                ctx.textAlign = 'left';
                ctx.fillText(`G${rec.generation}`, 4, y + 4);
            }
        }

        // Legend strip at bottom
        const legendY = canvasH - 10;
        ctx.font = '9px Courier New';
        ctx.textAlign = 'left';

        // Champion
        ctx.beginPath(); ctx.arc(LABEL_W, legendY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(45,100%,62%)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#888'; ctx.fillText('Champion', LABEL_W + 10, legendY + 3);

        // Wild card
        const wcX = LABEL_W + 100;
        ctx.beginPath(); ctx.arc(wcX, legendY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(270,80%,72%)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
        ctx.fillStyle = '#888'; ctx.fillText('Wild Card', wcX + 10, legendY + 3);

        // Offspring
        const offX = LABEL_W + 195;
        ctx.beginPath(); ctx.arc(offX, legendY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(120,60%,65%)'; ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#888'; ctx.fillText('Offspring', offX + 10, legendY + 3);
    }

    startNextCycle() {
        this.startTournament();
    }

    // === PERSISTENCE & EXPERIMENT TOOLS ===

    saveGenerationHistory() {
        const stats = this.population.getStats();
        this.generationHistory.push({
            generation: stats.generation,
            timestamp: Date.now(),
            averages: stats.averages,
            styleWeights: stats.styleWeights,
            visualAverages: stats.visualAverages,
            mechanicAverages: stats.mechanicAverages
        });
        this.savePersistentState();
    }

    savePersistentState() {
        const state = {
            population: this.population.toJSON(),
            generationHistory: this.generationHistory,
            dnaBank: this.dnaBank || 0,
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
            this.dnaBank = state.dnaBank || 0;

            console.log(`Loaded state: Generation ${this.population.generation}, ${this.generationHistory.length} history entries, DNA bank: ${this.dnaBank}`);
        } catch (e) {
            console.error('Failed to load saved state:', e);
        }
    }

    clearState() {
        if (confirm('Clear all evolution history and restart? This cannot be undone.')) {
            localStorage.removeItem('machinaLudensState');
            this.population = new Population(5);
            this.generationHistory = [];
            this.startTournament();
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
            content.textContent = 'No generation history yet. Breed your first generation to start tracking!';
            content.style.cssText = 'color: #666; font-style: italic;';
            return;
        }
        content.style.cssText = '';

        // Build table using DOM methods
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 0.85em;';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.borderBottom = '1px solid #444';
        const headers = ['Gen', 'Grid', 'Boxes', 'Complex', 'Density', 'Style', 'Palette', 'Tile', 'Decor'];
        for (const h of headers) {
            const th = document.createElement('th');
            th.style.cssText = `padding: 5px; text-align: ${h === 'Gen' ? 'left' : 'right'}; color: #aaa;`;
            th.textContent = h;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const colors = ['#e0e0e0', '#4ade80', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f0abfc', '#f0abfc', '#f0abfc'];

        for (const entry of this.generationHistory) {
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
            const va = entry.visualAverages || {};
            const paletteLabel = va.palette !== undefined ? `${va.palette}\u00b0` : '-';
            const tileLabel = va.tileStyle !== undefined
                ? (va.tileStyle < 0.33 ? 'Ang' : va.tileStyle < 0.66 ? 'Bal' : 'Org')
                : '-';
            const decorLabel = va.decoration !== undefined
                ? (va.decoration < 0.33 ? 'Min' : va.decoration < 0.66 ? 'Mod' : 'Rich')
                : '-';

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #333';
            const values = [
                entry.generation, entry.averages.gridSize, entry.averages.boxCount,
                entry.averages.complexity, entry.averages.wallDensity,
                styleLabel, paletteLabel, tileLabel, decorLabel
            ];
            for (let ci = 0; ci < values.length; ci++) {
                const td = document.createElement('td');
                td.style.cssText = `padding: 5px; text-align: ${ci === 0 ? 'left' : 'right'}; color: ${colors[ci]};`;
                td.textContent = values[ci];
                row.appendChild(td);
            }
            tbody.appendChild(row);
        }

        table.appendChild(tbody);

        // Clear and append
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }
        content.appendChild(table);
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

                this.savePersistentState();

                alert(`Experiment "${data.experimentName || 'Unnamed'}" loaded!\n\nGeneration: ${this.population.generation}\nHistory entries: ${this.generationHistory.length}`);

                this.startTournament();
            } catch (err) {
                alert('Failed to load experiment: ' + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);

        event.target.value = '';
    }
}
