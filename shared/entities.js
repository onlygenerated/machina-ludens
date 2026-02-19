import { TILES } from './tiles.js';

/**
 * Entity system for dynamic objects (patrol enemies).
 * Entities have position + direction state that changes each turn.
 * Stored in level.entities[] rather than the flat overlay array.
 */

/**
 * Place patrol enemies on floor tiles.
 * Enemies are dynamic (like spikes) so they use allFloor tiles, not safeTiles.
 * Filters out tiles with overlays and tiles adjacent to player start.
 */
export function placePatrolEntities(level, genes) {
    const entities = [];
    const count = genes.patrolCount || 1;
    const w = level.width;
    const h = level.height;
    const grid = level.grid;
    const overlays = level.overlays;
    const playerIdx = level.playerY * w + level.playerX;

    // Build set of tiles adjacent to player start (including player tile)
    const playerAdjacent = new Set();
    playerAdjacent.add(playerIdx);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [ddx, ddy] of dirs) {
        const ax = level.playerX + ddx;
        const ay = level.playerY + ddy;
        if (ax >= 0 && ax < w && ay >= 0 && ay < h) {
            playerAdjacent.add(ay * w + ax);
        }
    }

    // Build set of occupied entity positions
    const occupied = new Set();

    // Collect eligible floor tiles
    const candidates = [];
    for (let i = 0; i < grid.length; i++) {
        if (grid[i] !== TILES.FLOOR) continue;
        if (playerAdjacent.has(i)) continue;
        if (overlays && overlays[i] !== 0) continue;
        candidates.push(i);
    }

    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let e = 0; e < count && candidates.length > 0; e++) {
        let placed = false;

        for (let ci = 0; ci < candidates.length; ci++) {
            const idx = candidates[ci];
            if (occupied.has(idx)) continue;

            const x = idx % w;
            const y = Math.floor(idx / w);

            // Measure corridor length in each axis
            const hLen = measureCorridor(grid, w, h, x, y, 1, 0);
            const vLen = measureCorridor(grid, w, h, x, y, 0, 1);

            // Need at least 2 tiles of corridor
            if (hLen < 2 && vLen < 2) continue;

            // Choose longer axis
            let dx, dy;
            if (hLen >= vLen) {
                dx = Math.random() < 0.5 ? 1 : -1;
                dy = 0;
            } else {
                dx = 0;
                dy = Math.random() < 0.5 ? 1 : -1;
            }

            const entity = {
                type: 'patrol',
                x, y,
                dx, dy,
                startX: x, startY: y,
                startDx: dx, startDy: dy
            };

            entities.push(entity);
            occupied.add(idx);
            candidates.splice(ci, 1);
            placed = true;
            break;
        }

        if (!placed) break;
    }

    return entities;
}

/**
 * Measure longest unobstructed corridor through (x, y) along axis (adx, ady).
 * Counts tiles in both directions + the tile itself.
 */
function measureCorridor(grid, w, h, x, y, adx, ady) {
    let length = 1; // the tile itself

    // Forward
    let cx = x + adx, cy = y + ady;
    while (cx >= 0 && cx < w && cy >= 0 && cy < h && grid[cy * w + cx] === TILES.FLOOR) {
        length++;
        cx += adx;
        cy += ady;
    }

    // Backward
    cx = x - adx;
    cy = y - ady;
    while (cx >= 0 && cx < w && cy >= 0 && cy < h && grid[cy * w + cx] === TILES.FLOOR) {
        length++;
        cx -= adx;
        cy -= ady;
    }

    return length;
}

/**
 * Advance all patrol entities by 1 step.
 * If next tile is wall/box/box-on-target/out-of-bounds/another entity: reverse direction, don't move.
 */
export function advanceEntities(entities, grid, width, height) {
    // Build set of entity positions for collision
    const posSet = new Set();
    for (const e of entities) {
        posSet.add(e.y * width + e.x);
    }

    for (const e of entities) {
        if (e.type !== 'patrol') continue;

        const nx = e.x + e.dx;
        const ny = e.y + e.dy;

        // Out of bounds
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            e.dx = -e.dx;
            e.dy = -e.dy;
            continue;
        }

        const nextTile = grid[ny * width + nx];

        // Blocked by wall or box
        if (nextTile === TILES.WALL || nextTile === TILES.BOX || nextTile === TILES.BOX_ON_TARGET) {
            e.dx = -e.dx;
            e.dy = -e.dy;
            continue;
        }

        // Blocked by another entity
        const nextIdx = ny * width + nx;
        // Remove self from posSet, check if another entity is there
        const selfIdx = e.y * width + e.x;
        posSet.delete(selfIdx);
        if (posSet.has(nextIdx)) {
            posSet.add(selfIdx);
            e.dx = -e.dx;
            e.dy = -e.dy;
            continue;
        }

        // Move
        posSet.add(nextIdx);
        e.x = nx;
        e.y = ny;
    }
}

/**
 * Check if any entity occupies the player's tile.
 */
export function checkEntityCollision(entities, playerX, playerY) {
    for (const e of entities) {
        if (e.x === playerX && e.y === playerY) return true;
    }
    return false;
}

/**
 * Deep-clone entity array for undo snapshots.
 */
export function cloneEntities(entities) {
    return entities.map(e => ({ ...e }));
}
