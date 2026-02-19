import { TILES } from './tiles.js';

/**
 * Forward BFS solver for Sokoban levels.
 * Verifies solvability by searching (normalizedPlayer, boxPositions) state space.
 * Handles standard pushes + box-ice slides + exit reachability.
 *
 * Ignores collectibles, spikes, and entities (don't affect structural solvability).
 */

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

    const { walls, targets, boxes, playerPos, iceTiles, exitPos, width, height } = puzzle;

    // Quick check: if no boxes and no targets, level is trivially solvable
    if (boxes.length === 0 && targets.size === 0) {
        return { solvable: true, pushCount: 0 };
    }

    // Initial state
    const initialBoxSet = new Set(boxes);
    const initialReachable = floodFill(playerPos, walls, initialBoxSet, width, height);
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

                // Push-to must be free (not wall, not another box)
                if (walls.has(pushToPos)) continue;
                if (boxSet.has(pushToPos)) continue;

                // Resolve box-ice slide if enabled
                let finalBoxPos = pushToPos;
                if (boxIceEnabled) {
                    finalBoxPos = resolveBoxSlide(pushToPos, dx, dy, walls, iceTiles, boxSet, width, height);
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
                const newReachable = floodFill(newPlayerPos, walls, newBoxSet, width, height);
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
    if (level.overlays) {
        for (let i = 0; i < level.overlays.length; i++) {
            if (level.overlays[i] === TILES.ICE) {
                iceTiles.add(i);
            } else if (level.overlays[i] === TILES.EXIT) {
                exitPos = i;
            }
        }
    }

    return { walls, targets, boxes, playerPos, iceTiles, exitPos, width, height };
}

/**
 * BFS flood fill from startPos, blocked by walls and boxes.
 * Returns Set of reachable positions.
 */
function floodFill(startPos, walls, boxSet, width, height) {
    const reachable = new Set([startPos]);
    const queue = [startPos];
    let head = 0;

    while (head < queue.length) {
        const cur = queue[head++];
        const cx = cur % width;
        const cy = Math.floor(cur / width);

        // Up
        if (cy > 0) {
            const n = cur - width;
            if (!reachable.has(n) && !walls.has(n) && !boxSet.has(n)) {
                reachable.add(n);
                queue.push(n);
            }
        }
        // Down
        if (cy < height - 1) {
            const n = cur + width;
            if (!reachable.has(n) && !walls.has(n) && !boxSet.has(n)) {
                reachable.add(n);
                queue.push(n);
            }
        }
        // Left
        if (cx > 0) {
            const n = cur - 1;
            if (!reachable.has(n) && !walls.has(n) && !boxSet.has(n)) {
                reachable.add(n);
                queue.push(n);
            }
        }
        // Right
        if (cx < width - 1) {
            const n = cur + 1;
            if (!reachable.has(n) && !walls.has(n) && !boxSet.has(n)) {
                reachable.add(n);
                queue.push(n);
            }
        }
    }

    return reachable;
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
function resolveBoxSlide(boxPos, dx, dy, walls, iceTiles, boxSet, width, height) {
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
