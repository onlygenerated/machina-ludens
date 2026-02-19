import { TILES } from './tiles.js';

/**
 * Forward BFS solver for Sokoban levels.
 * Verifies solvability by searching (normalizedPlayer, boxPositions) state space.
 * Handles standard pushes + box-ice slides + exit reachability.
 *
 * Ignores collectibles, spikes, and entities (don't affect structural solvability).
 */

/**
 * Quick reachability pre-screen for ice levels.
 * Compares player reachability with and without ice sliding.
 * If ice doesn't restrict reachability, the reverse-play solvability guarantee holds.
 * @param {Object} level - { grid, overlays, width, height, playerX, playerY }
 * @returns {{ restricted: boolean }}
 */
export function checkIceReachability(level) {
    const puzzle = extractPuzzleData(level);
    if (!puzzle) return { restricted: false };

    const { walls, boxes, playerPos, iceTiles, teleporterMap, gates, doors, width, height } = puzzle;

    if (!iceTiles || iceTiles.size === 0) return { restricted: false };

    const boxSet = new Set(boxes);

    // Reachability WITH ice (sliding physics)
    const iceReachable = floodFill(playerPos, walls, boxSet, width, height, teleporterMap, gates, doors, iceTiles);

    // Reachability WITHOUT ice (normal movement)
    const normalReachable = floodFill(playerPos, walls, boxSet, width, height, teleporterMap, gates, doors, null);

    // If any normally-reachable position is unreachable with ice, ice restricts movement
    for (const pos of normalReachable) {
        if (!iceReachable.has(pos)) {
            return { restricted: true };
        }
    }

    return { restricted: false };
}

/**
 * Quick reachability pre-screen for gate levels.
 * Compares player reachability with and without one-way gates.
 * Gates should change routes, not make areas completely unreachable.
 * @param {Object} level - { grid, overlays, width, height, playerX, playerY }
 * @returns {{ restricted: boolean }}
 */
export function checkGateReachability(level) {
    const puzzle = extractPuzzleData(level);
    if (!puzzle) return { restricted: false };

    const { walls, boxes, playerPos, iceTiles, teleporterMap, gates, doors, width, height } = puzzle;

    if (!gates || gates.size === 0) return { restricted: false };

    const boxSet = new Set(boxes);

    // Reachability WITH gates (real constraints)
    const gateReachable = floodFill(playerPos, walls, boxSet, width, height, teleporterMap, gates, doors, iceTiles);

    // Reachability WITHOUT gates (no directional constraints)
    const noGateReachable = floodFill(playerPos, walls, boxSet, width, height, teleporterMap, new Map(), doors, iceTiles);

    // If any position reachable without gates is unreachable with gates, gates created a barrier
    for (const pos of noGateReachable) {
        if (!gateReachable.has(pos)) {
            return { restricted: true };
        }
    }

    return { restricted: false };
}

/**
 * Solve a level using BFS on push-states.
 * @param {Object} level - { grid, overlays, width, height, playerX, playerY }
 * @param {Object} options - { maxStates: 50000, boxIceEnabled: false }
 * @returns {{ solvable: boolean, pushCount?: number, reason?: string }}
 */
export function solve(level, options = {}) {
    const maxStates = options.maxStates || 50000;
    const boxIceEnabled = !!options.boxIceEnabled;

    const puzzle = extractPuzzleData(level);
    if (!puzzle) return { solvable: false, reason: 'invalid_level' };

    const { walls, targets, boxes, playerPos, iceTiles, exitPos, teleporterMap, gates, doors, width, height } = puzzle;

    // Quick check: if no boxes and no targets, level is trivially solvable
    if (boxes.length === 0 && targets.size === 0) {
        return { solvable: true, pushCount: 0 };
    }

    // Initial state
    const initialBoxSet = new Set(boxes);
    const initialReachable = floodFill(playerPos, walls, initialBoxSet, width, height, teleporterMap, gates, doors, iceTiles);
    const initialCanonical = Math.min(...initialReachable);
    const initialBoxKey = [...initialBoxSet].sort((a, b) => a - b);

    const startKey = stateKey(initialCanonical, initialBoxKey);

    // Check if already solved
    if (isWinState(initialBoxSet, targets, exitPos, initialReachable)) {
        return { solvable: true, pushCount: 0 };
    }

    const visited = new Set([startKey]);
    const queue = [{ canonical: initialCanonical, boxes: initialBoxKey, reachable: initialReachable, pushCount: 0 }];
    let head = 0;

    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (head < queue.length) {
        if (visited.size >= maxStates) {
            return { solvable: false, reason: 'exceeded_limit' };
        }

        const state = queue[head++];
        const boxSet = new Set(state.boxes);

        // Try pushing each box in each direction
        for (let bi = 0; bi < state.boxes.length; bi++) {
            const boxPos = state.boxes[bi];
            const bx = boxPos % width;
            const by = Math.floor(boxPos / width);

            for (const [dx, dy] of directions) {
                // Player must stand at "push from" position (opposite side of push direction)
                const pushFromX = bx - dx;
                const pushFromY = by - dy;

                if (pushFromX < 0 || pushFromX >= width || pushFromY < 0 || pushFromY >= height) continue;

                const pushFromPos = pushFromY * width + pushFromX;

                // Can player reach the push-from position?
                if (!state.reachable.has(pushFromPos)) continue;

                // "Push to" position (where box moves)
                const pushToX = bx + dx;
                const pushToY = by + dy;

                if (pushToX < 0 || pushToX >= width || pushToY < 0 || pushToY >= height) continue;

                const pushToPos = pushToY * width + pushToX;

                // Push-to must be free (not wall, not another box, not locked door)
                if (walls.has(pushToPos)) continue;
                if (boxSet.has(pushToPos)) continue;
                if (doors.has(pushToPos)) continue;

                // Gate check: box can't enter a gate that blocks this push direction
                if (gates.has(pushToPos) && !gateAllowsDirection(gates.get(pushToPos), dx, dy)) continue;

                // Resolve box-ice slide if enabled
                let finalBoxPos = pushToPos;
                if (boxIceEnabled) {
                    finalBoxPos = resolveBoxSlide(pushToPos, dx, dy, walls, iceTiles, boxSet, width, height, gates);
                }

                // Check deadlock at final position
                if (isSimpleDeadlock(finalBoxPos, walls, targets, width, height)) continue;

                // Build new box array
                const newBoxes = [...state.boxes];
                newBoxes[bi] = finalBoxPos;
                const sortedBoxes = newBoxes.sort((a, b) => a - b);

                // New player position is where the box was (player pushed box from pushFrom through boxPos)
                const newPlayerPos = boxPos;

                // Compute new reachable area
                const newBoxSet = new Set(sortedBoxes);
                const newReachable = floodFill(newPlayerPos, walls, newBoxSet, width, height, teleporterMap, gates, doors, iceTiles);
                const newCanonical = Math.min(...newReachable);

                const key = stateKey(newCanonical, sortedBoxes);
                if (visited.has(key)) continue;
                visited.add(key);

                const newPushCount = state.pushCount + 1;

                // Check win
                if (isWinState(newBoxSet, targets, exitPos, newReachable)) {
                    return { solvable: true, pushCount: newPushCount };
                }

                queue.push({
                    canonical: newCanonical,
                    boxes: sortedBoxes,
                    reachable: newReachable,
                    pushCount: newPushCount
                });
            }
        }
    }

    // Exhausted all states without finding solution
    return { solvable: false, reason: 'no_solution' };
}

/**
 * Extract puzzle data from a level object.
 */
function extractPuzzleData(level) {
    const { grid, width, height, playerX, playerY } = level;
    if (!grid || !width || !height) return null;

    const walls = new Set();
    const targets = new Set();
    const boxes = [];
    const iceTiles = new Set();
    let exitPos = -1;
    const playerPos = playerY * width + playerX;

    for (let i = 0; i < grid.length; i++) {
        switch (grid[i]) {
            case TILES.WALL:
                walls.add(i);
                break;
            case TILES.TARGET:
                targets.add(i);
                break;
            case TILES.BOX:
                boxes.push(i);
                break;
            case TILES.BOX_ON_TARGET:
                boxes.push(i);
                targets.add(i);
                break;
        }
    }

    // Also check if player is on target (grid stores TARGET there)
    if (grid[playerPos] === TILES.TARGET) {
        targets.add(playerPos);
    }

    // Extract overlay data
    const gates = new Map();
    const doors = new Set();
    if (level.overlays) {
        for (let i = 0; i < level.overlays.length; i++) {
            if (level.overlays[i] === TILES.ICE) {
                iceTiles.add(i);
            } else if (level.overlays[i] === TILES.EXIT) {
                exitPos = i;
            } else if (level.overlays[i] >= TILES.GATE_UP && level.overlays[i] <= TILES.GATE_LEFT) {
                gates.set(i, level.overlays[i]);
            } else if (level.overlays[i] === TILES.DOOR) {
                doors.add(i);
            }
        }
    }

    // Build teleporter map from pairs
    const teleporterMap = new Map();
    if (level.teleporterPairs) {
        for (const [a, b] of level.teleporterPairs) {
            teleporterMap.set(a, b);
            teleporterMap.set(b, a);
        }
    }

    return { walls, targets, boxes, playerPos, iceTiles, exitPos, teleporterMap, gates, doors, width, height };
}

/**
 * BFS flood fill from startPos, blocked by walls and boxes.
 * Models player-ice sliding: stepping onto ice continues in (dx,dy) until stopped.
 * Only the stop position is added as reachable — intermediate ice tiles are not.
 * Returns Set of reachable positions.
 */
function floodFill(startPos, walls, boxSet, width, height, teleporterMap, gates, doors, iceTiles) {
    const reachable = new Set([startPos]);
    const queue = [startPos];
    let head = 0;

    const directions = [[0, -1, -width], [0, 1, width], [-1, 0, -1], [1, 0, 1]];

    while (head < queue.length) {
        const cur = queue[head++];
        const cx = cur % width;
        const cy = Math.floor(cur / width);

        for (const [dx, dy, delta] of directions) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

            let n = cur + delta;
            if (walls.has(n) || boxSet.has(n)) continue;

            // Door check: treat locked doors as impassable
            if (doors && doors.has(n)) continue;

            // Gate check: can we enter this tile from direction (dx, dy)?
            if (gates && gates.has(n) && !gateAllowsDirection(gates.get(n), dx, dy)) continue;

            // Ice slide: if stepping onto ice, simulate sliding in (dx, dy)
            if (iceTiles && iceTiles.size > 0 && iceTiles.has(n)) {
                let slidePos = n;
                while (iceTiles.has(slidePos)) {
                    const sx = slidePos % width;
                    const sy = Math.floor(slidePos / width);
                    const snx = sx + dx;
                    const sny = sy + dy;
                    if (snx < 0 || snx >= width || sny < 0 || sny >= height) break;
                    const nextPos = sny * width + snx;
                    if (walls.has(nextPos) || boxSet.has(nextPos)) break;
                    if (doors && doors.has(nextPos)) break;
                    if (gates && gates.has(nextPos) && !gateAllowsDirection(gates.get(nextPos), dx, dy)) break;
                    slidePos = nextPos;
                }
                n = slidePos; // final stop position
            }

            if (reachable.has(n)) continue;

            reachable.add(n);
            queue.push(n);

            // Teleporter: if this tile is a teleporter, also enqueue partner
            if (teleporterMap && teleporterMap.has(n)) {
                const partner = teleporterMap.get(n);
                if (!reachable.has(partner) && !walls.has(partner) && !boxSet.has(partner)) {
                    reachable.add(partner);
                    queue.push(partner);
                }
            }
        }
    }

    return reachable;
}

/**
 * Check if a gate allows entry from direction (dx, dy).
 * Gate tiles restrict which direction you can ENTER from.
 */
function gateAllowsDirection(gateTile, dx, dy) {
    switch (gateTile) {
        case TILES.GATE_UP:    return dy === -1; // moving up (from below)
        case TILES.GATE_DOWN:  return dy === 1;  // moving down (from above)
        case TILES.GATE_LEFT:  return dx === -1; // moving left (from right)
        case TILES.GATE_RIGHT: return dx === 1;  // moving right (from left)
        default: return true;
    }
}

/**
 * Create a string key for the visited set.
 */
function stateKey(canonicalPlayer, sortedBoxes) {
    return canonicalPlayer + ':' + sortedBoxes.join(',');
}

/**
 * Check if a box position is a simple deadlock (corner, not on target).
 */
function isSimpleDeadlock(boxPos, walls, targets, width, height) {
    if (targets.has(boxPos)) return false;

    const x = boxPos % width;
    const y = Math.floor(boxPos / width);

    const up = y > 0 ? walls.has(boxPos - width) : true;
    const down = y < height - 1 ? walls.has(boxPos + width) : true;
    const left = x > 0 ? walls.has(boxPos - 1) : true;
    const right = x < width - 1 ? walls.has(boxPos + 1) : true;

    // Corner deadlock: walls on two adjacent sides
    if (up && left) return true;
    if (up && right) return true;
    if (down && left) return true;
    if (down && right) return true;

    return false;
}

/**
 * Resolve box sliding on ice.
 * If box lands on ice, slide it in (dx, dy) until hitting wall/box/non-ice tile.
 */
function resolveBoxSlide(boxPos, dx, dy, walls, iceTiles, boxSet, width, height, gates) {
    let pos = boxPos;

    while (iceTiles.has(pos)) {
        const x = pos % width;
        const y = Math.floor(pos / width);
        const nx = x + dx;
        const ny = y + dy;

        // Out of bounds — stop
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;

        const nextPos = ny * width + nx;

        // Wall or another box — stop
        if (walls.has(nextPos) || boxSet.has(nextPos)) break;

        // Gate check: stop if next tile is a gate that blocks entry
        if (gates && gates.has(nextPos) && !gateAllowsDirection(gates.get(nextPos), dx, dy)) break;

        pos = nextPos;
    }

    return pos;
}

/**
 * Check if state is a win: all boxes on targets, and if exit exists, player can reach it.
 */
function isWinState(boxSet, targets, exitPos, playerReachable) {
    // All targets must have a box on them
    for (const t of targets) {
        if (!boxSet.has(t)) return false;
    }

    // All boxes must be on targets (no extra boxes off targets)
    for (const b of boxSet) {
        if (!targets.has(b)) return false;
    }

    // If exit exists, player must be able to reach it
    if (exitPos >= 0 && !playerReachable.has(exitPos)) return false;

    return true;
}
