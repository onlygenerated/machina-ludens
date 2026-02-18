import { TILES } from './tiles.js';

/**
 * Post-generation level decorator.
 * Places overlays (collectibles, ice, exit) on "safe" floor tiles —
 * tiles not on the solution path, so the base Sokoban puzzle stays solvable.
 */

export function decorateLevel(level, genome) {
    const genes = genome.genes;

    // Initialize overlays array (same length as grid, 0 = empty)
    level.overlays = new Array(level.grid.length).fill(0);

    // Find safe tiles: floor tiles not on the solution path and not the player start
    const safeTiles = getSafeTiles(level);
    if (safeTiles.length === 0) return;

    // Place collectibles (DNA fragments) — always active
    placeCollectibles(level, safeTiles, genes.collectibleDensity || 0);

    // Place ice if enabled
    if (genes.iceEnabled) {
        placeIce(level, safeTiles, genes.iceDensity || 0);
    }

    // Place exit if enabled
    if (genes.exitEnabled) {
        placeExit(level, safeTiles);
    }
}

function getSafeTiles(level) {
    const safe = [];
    const solutionPath = level.solutionPath || new Set();
    const playerIdx = level.playerY * level.width + level.playerX;

    for (let i = 0; i < level.grid.length; i++) {
        if (level.grid[i] === TILES.FLOOR &&
            !solutionPath.has(i) &&
            i !== playerIdx) {
            safe.push(i);
        }
    }

    shuffle(safe);
    return safe;
}

function placeCollectibles(level, safeTiles, density) {
    if (density <= 0) return;

    // Place on safe tiles not already used by other overlays
    const available = safeTiles.filter(i => level.overlays[i] === 0);
    // Scale: density 0-1 maps to 0-25% of available tiles, minimum 1
    const count = Math.max(1, Math.round(available.length * density * 0.25));

    for (let i = 0; i < count && i < available.length; i++) {
        level.overlays[available[i]] = TILES.COLLECTIBLE;
    }
}

function placeIce(level, safeTiles, density) {
    if (density <= 0) return;

    // Ice on safe tiles not used by collectibles
    const available = safeTiles.filter(i => level.overlays[i] === 0);
    // Scale: density 0-1 maps to 0-30% of available tiles, minimum 1
    const count = Math.max(1, Math.round(available.length * density * 0.3));

    for (let i = 0; i < count && i < available.length; i++) {
        level.overlays[available[i]] = TILES.ICE;
    }
}

function placeExit(level, safeTiles) {
    // Place exit on a safe tile far from the player start
    const available = safeTiles.filter(i => level.overlays[i] === 0);
    if (available.length === 0) return;

    const playerIdx = level.playerY * level.width + level.playerX;
    const w = level.width;

    // Sort by Manhattan distance from player (farthest first)
    available.sort((a, b) => {
        const distA = Math.abs(a % w - playerIdx % w) + Math.abs(Math.floor(a / w) - Math.floor(playerIdx / w));
        const distB = Math.abs(b % w - playerIdx % w) + Math.abs(Math.floor(b / w) - Math.floor(playerIdx / w));
        return distB - distA;
    });

    // Pick randomly from the farthest quarter
    const pickIdx = Math.floor(Math.random() * Math.max(1, Math.floor(available.length / 4)));
    level.overlays[available[pickIdx]] = TILES.EXIT;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
