import { TILES } from './tiles.js';
import { placePatrolEntities } from './entities.js';

/**
 * Post-generation level decorator.
 * Places overlays on floor tiles after generation.
 *
 * Two tile pools:
 *   - "all floor" tiles: any floor tile except player start (for collectibles, spikes)
 *   - "safe" tiles: floor tiles NOT on the solution path (for ice, which alters movement)
 *
 * Collectibles and spikes don't affect solvability, so they use all floor tiles.
 * Ice changes player movement, so it only goes on non-solution-path tiles.
 * Exit uses all floor tiles (placed far from player).
 */

export function decorateLevel(level, genome) {
    const genes = genome.genes;

    // Initialize overlays array (same length as grid, 0 = empty)
    level.overlays = new Array(level.grid.length).fill(0);

    // Initialize entities array
    level.entities = [];

    // Two pools of eligible tiles
    const allFloor = getAllFloorTiles(level);
    if (allFloor.length === 0) return;

    const safeTiles = getSafeTiles(level);

    // Place collectibles (DNA fragments) — on any floor tile
    placeCollectibles(level, allFloor, genes.collectibleDensity || 0);

    // Place ice if enabled
    // Box-ice: use allFloor tiles (solver verification ensures solvability)
    // Regular ice: only on non-solution-path tiles (affects player movement)
    if (genes.iceEnabled) {
        const icePool = (genes.boxIceEnabled)
            ? (allFloor.length > 0 ? allFloor : safeTiles)
            : (safeTiles.length > 0 ? safeTiles : allFloor);
        placeIce(level, icePool, genes.iceDensity || 0);
    }

    // Set box-ice flag on level for game loop
    level.boxIceEnabled = !!(genes.iceEnabled && genes.boxIceEnabled);

    // Place exit if enabled — on any floor tile (far from player)
    if (genes.exitEnabled) {
        placeExit(level, allFloor);
    }

    // Place spikes if enabled — on any floor tile
    if (genes.spikeEnabled) {
        placeSpikes(level, allFloor, genes.spikeDensity || 0);
    }

    // Place patrol enemies if enabled
    if (genes.patrolEnabled) {
        level.entities = placePatrolEntities(level, genes);
    }
}

function getAllFloorTiles(level) {
    const tiles = [];
    const playerIdx = level.playerY * level.width + level.playerX;

    for (let i = 0; i < level.grid.length; i++) {
        if (level.grid[i] === TILES.FLOOR && i !== playerIdx) {
            tiles.push(i);
        }
    }

    shuffle(tiles);
    return tiles;
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

function placeCollectibles(level, floorTiles, density) {
    if (density <= 0) return;

    // Place on floor tiles not already used by other overlays
    const available = floorTiles.filter(i => level.overlays[i] === 0);
    // Scale: density 0-1 maps to 0-25% of available tiles, minimum 1
    const count = Math.max(1, Math.round(available.length * density * 0.25));

    for (let i = 0; i < count && i < available.length; i++) {
        level.overlays[available[i]] = TILES.COLLECTIBLE;
    }
}

function placeIce(level, floorTiles, density) {
    if (density <= 0) return;

    // Ice on tiles not used by collectibles
    const available = floorTiles.filter(i => level.overlays[i] === 0);
    // Scale: density 0-1 maps to 0-30% of available tiles, minimum 1
    const count = Math.max(1, Math.round(available.length * density * 0.3));

    for (let i = 0; i < count && i < available.length; i++) {
        level.overlays[available[i]] = TILES.ICE;
    }
}

function placeExit(level, floorTiles) {
    // Place exit on a floor tile far from the player start
    const available = floorTiles.filter(i => level.overlays[i] === 0);
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

function placeSpikes(level, floorTiles, density) {
    if (density <= 0) return;

    // Spikes on floor tiles not used by other overlays
    const available = floorTiles.filter(i => level.overlays[i] === 0);
    // Scale: density 0-0.25 maps to 0-20% of available tiles, minimum 1
    const count = Math.max(1, Math.round(available.length * density * 0.8));

    for (let i = 0; i < count && i < available.length; i++) {
        level.overlays[available[i]] = TILES.SPIKES;
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
