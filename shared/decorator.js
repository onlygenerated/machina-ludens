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

    // Initialize teleporter pairs
    level.teleporterPairs = [];

    // Initialize key/door pairs
    level.keyDoorPairs = [];

    // Two pools of eligible tiles
    const allFloor = getAllFloorTiles(level);
    if (allFloor.length === 0) return;

    const safeTiles = getSafeTiles(level);

    // Place collectibles (DNA fragments) — on any floor tile
    placeCollectibles(level, allFloor, genes.collectibleDensity || 0);

    // Place teleporters if enabled (before ice, so teleporter pads aren't on ice)
    if (genes.teleporterEnabled) {
        placeTeleporters(level, allFloor, genes.teleporterCount || 1);
    }

    // Place key/door pairs if enabled (before ice/spikes/gates)
    if (genes.keyDoorEnabled) {
        placeKeyDoors(level, genes.keyDoorCount || 1);
    }

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

    // Place one-way gates if enabled (after spikes, uses safeTiles to avoid breaking solutions)
    if (genes.gateEnabled) {
        placeGates(level, safeTiles, genes.gateDensity || 0);
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

function placeTeleporters(level, floorTiles, count) {
    const w = level.width;
    const minDist = Math.floor(level.width * 0.4);
    const available = floorTiles.filter(i => level.overlays[i] === 0);

    for (let p = 0; p < count && available.length >= 2; p++) {
        // Pick tile A
        const aListIdx = available.findIndex(() => true);
        if (aListIdx < 0) break;
        const idxA = available[aListIdx];
        available.splice(aListIdx, 1);

        const ax = idxA % w;
        const ay = Math.floor(idxA / w);

        // Pick tile B at sufficient Manhattan distance from A
        let bestB = -1;
        let bestBListIdx = -1;
        let bestDist = -1;
        for (let j = 0; j < available.length; j++) {
            const bx = available[j] % w;
            const by = Math.floor(available[j] / w);
            const dist = Math.abs(ax - bx) + Math.abs(ay - by);
            if (dist >= minDist && dist > bestDist) {
                bestDist = dist;
                bestB = available[j];
                bestBListIdx = j;
            }
        }

        // Fallback: if no tile meets distance requirement, pick farthest available
        if (bestB < 0) {
            for (let j = 0; j < available.length; j++) {
                const bx = available[j] % w;
                const by = Math.floor(available[j] / w);
                const dist = Math.abs(ax - bx) + Math.abs(ay - by);
                if (dist > bestDist) {
                    bestDist = dist;
                    bestB = available[j];
                    bestBListIdx = j;
                }
            }
        }

        if (bestB < 0) break;
        available.splice(bestBListIdx, 1);

        level.overlays[idxA] = TILES.TELEPORTER;
        level.overlays[bestB] = TILES.TELEPORTER;
        level.teleporterPairs.push([idxA, bestB]);
    }
}

function placeGates(level, safeTiles, density) {
    if (density <= 0) return;

    const w = level.width;
    const playerIdx = level.playerY * w + level.playerX;

    // Filter: floor tiles not used by other overlays and not adjacent to player start
    const available = safeTiles.filter(i => {
        if (level.overlays[i] !== 0) return false;
        const ix = i % w;
        const iy = Math.floor(i / w);
        const px = playerIdx % w;
        const py = Math.floor(playerIdx / w);
        if (Math.abs(ix - px) + Math.abs(iy - py) <= 1) return false;
        return true;
    });

    const count = Math.max(1, Math.round(available.length * density * 0.6));

    for (let i = 0; i < count && i < available.length; i++) {
        const idx = available[i];
        const x = idx % w;
        const y = Math.floor(idx / w);

        // Analyze corridor structure: find longest axis run
        let hRun = 0, vRun = 0;
        // Count horizontal run (left + right)
        for (let dx = -1; dx <= 1; dx += 2) {
            let cx = x + dx;
            while (cx >= 0 && cx < w && level.grid[y * w + cx] !== TILES.WALL) {
                hRun++;
                cx += dx;
            }
        }
        // Count vertical run (up + down)
        for (let dy = -1; dy <= 1; dy += 2) {
            let cy = y + dy;
            while (cy >= 0 && cy < level.height && level.grid[cy * w + x] !== TILES.WALL) {
                vRun++;
                cy += dy;
            }
        }

        // Choose gate direction along the longest corridor run
        let gateType;
        if (hRun >= vRun) {
            // Horizontal corridor — gate allows entry from one horizontal direction
            gateType = Math.random() < 0.5 ? TILES.GATE_RIGHT : TILES.GATE_LEFT;
        } else {
            // Vertical corridor — gate allows entry from one vertical direction
            gateType = Math.random() < 0.5 ? TILES.GATE_DOWN : TILES.GATE_UP;
        }

        level.overlays[idx] = gateType;
    }
}

function placeKeyDoors(level, count) {
    const w = level.width;
    const h = level.height;
    const playerIdx = level.playerY * w + level.playerX;

    for (let p = 0; p < count; p++) {
        // Find corridor chokepoint tiles (floor tile with 2+ wall neighbors, not adjacent to player/boxes)
        const chokepoints = [];
        for (let i = 0; i < level.grid.length; i++) {
            if (level.grid[i] !== TILES.FLOOR || level.overlays[i] !== 0) continue;

            const x = i % w;
            const y = Math.floor(i / w);

            // Skip tiles adjacent to player start
            const px = playerIdx % w;
            const py = Math.floor(playerIdx / w);
            if (Math.abs(x - px) + Math.abs(y - py) <= 1) continue;

            // Skip tiles with boxes nearby
            let nearBox = false;
            for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const t = level.grid[ny * w + nx];
                    if (t === TILES.BOX || t === TILES.BOX_ON_TARGET) nearBox = true;
                }
            }
            if (nearBox) continue;

            // Count wall neighbors
            let wallCount = 0;
            for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h || level.grid[ny * w + nx] === TILES.WALL) {
                    wallCount++;
                }
            }
            if (wallCount >= 2) chokepoints.push(i);
        }

        if (chokepoints.length === 0) continue;

        shuffle(chokepoints);
        const doorIdx = chokepoints[0];

        // BFS from player start treating door tile as wall, find reachable tiles for key placement
        const reachable = new Set();
        const queue = [playerIdx];
        reachable.add(playerIdx);
        let bfsHead = 0;
        while (bfsHead < queue.length) {
            const cur = queue[bfsHead++];
            const cx = cur % w;
            const cy = Math.floor(cur / w);
            for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const ni = ny * w + nx;
                if (reachable.has(ni)) continue;
                if (ni === doorIdx) continue; // treat door as wall
                if (level.grid[ni] === TILES.WALL) continue;
                reachable.add(ni);
                queue.push(ni);
            }
        }

        // Pick key position: reachable floor tile at moderate distance from door, not used by overlay
        const doorX = doorIdx % w;
        const doorY = Math.floor(doorIdx / w);
        const keyCandidate = [...reachable].filter(i => {
            if (level.grid[i] !== TILES.FLOOR) return false;
            if (level.overlays[i] !== 0) return false;
            if (i === playerIdx) return false;
            return true;
        });

        if (keyCandidate.length === 0) continue;

        // Sort by distance from door (moderate distance preferred)
        keyCandidate.sort((a, b) => {
            const da = Math.abs(a % w - doorX) + Math.abs(Math.floor(a / w) - doorY);
            const db = Math.abs(b % w - doorX) + Math.abs(Math.floor(b / w) - doorY);
            return db - da;
        });

        // Pick from the middle third for moderate distance
        const mid = Math.floor(keyCandidate.length / 3);
        const keyIdx = keyCandidate[Math.min(mid, keyCandidate.length - 1)];

        level.overlays[keyIdx] = TILES.KEY;
        level.overlays[doorIdx] = TILES.DOOR;
        level.keyDoorPairs.push({ keyIdx, doorIdx, colorIndex: p });
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
