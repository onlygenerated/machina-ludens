// Sokoban Level Generator using Reverse-Play Algorithm
// Based on Taylor & Parberry (2011) approach

class SokobanGenerator {
    constructor(width = 8, height = 8, boxCount = 3, complexity = 20, wallDensity = 0) {
        this.width = width;
        this.height = height;
        this.boxCount = boxCount;
        this.complexity = complexity;
        this.wallDensity = wallDensity; // 0-0.15, probability of internal walls

        this.TILES = {
            FLOOR: 0,
            WALL: 1,
            TARGET: 2,
            BOX: 3,
            PLAYER: 4,
            BOX_ON_TARGET: 5
        };
    }

    // Static method to generate with random parameters
    static generateRandom() {
        // Vary grid size (7x7 to 10x10)
        const size = 7 + Math.floor(Math.random() * 4);

        // Vary box count (2 to 5)
        const boxes = 2 + Math.floor(Math.random() * 4);

        // Vary complexity (20 to 50 reverse moves)
        const complexity = 20 + Math.floor(Math.random() * 31);

        // Vary wall density (0% to 10% chance of internal walls)
        const wallDensity = Math.random() * 0.1;

        const generator = new SokobanGenerator(size, size, boxes, complexity, wallDensity);
        return generator.generate();
    }

    generate() {
        // Keep trying until we get a valid level
        let attempts = 0;
        while (attempts < 50) {
            try {
                const result = this.attemptGenerate();
                if (result) return result;
            } catch (e) {
                // Try again
            }
            attempts++;
        }

        // Fallback: return a simple level
        return this.createSimpleFallback();
    }

    attemptGenerate() {
        // Step 1: Create simple room
        const grid = this.createSimpleRoom();

        // Step 2: Place TARGETS (these stay fixed throughout)
        const targets = this.placeSafeTargets(grid);
        if (targets.length === 0) return null;

        // Step 3: Place BOXES on targets (solved state - this is our starting point for reverse-play)
        const boxes = [...targets];

        // Step 4: Place player adjacent to boxes
        let playerPos = this.placePlayerNearBoxes(grid, boxes);
        if (playerPos === -1) return null;

        // Step 5: PULL boxes away from targets (reverse moves)
        // This scatters the boxes while keeping targets in place
        const state = this.reversePlay(grid, boxes, playerPos, targets);

        // Step 6: After reverse-play:
        // - Targets stay in their original positions
        // - Boxes have been pulled to new scattered positions
        // - Player is wherever the last pull left them

        // Step 7: Validate no boxes ended up in deadlocks
        for (const box of state.boxes) {
            if (this.isDeadlock(state.grid, box, targets)) {
                return null; // Invalid, try again
            }
        }

        // Step 7b: Validate no boxes are on targets (we want an unsolved puzzle)
        for (const box of state.boxes) {
            if (targets.includes(box)) {
                return null; // Box still on target, try again
            }
        }

        // Step 8: Build final grid
        // Targets: original positions (fixed)
        // Boxes: scattered positions from reverse-play
        return this.buildFinalGrid(state.grid, state.boxes, state.playerPos, targets);
    }

    createSimpleRoom() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Walls on perimeter
                if (x === 0 || x === this.width - 1 ||
                    y === 0 || y === this.height - 1) {
                    grid.push(this.TILES.WALL);
                } else {
                    // Add internal walls based on density
                    // But keep a safety margin from edges (at least 2 tiles from border)
                    const isSafeZone = x >= 2 && x < this.width - 2 &&
                                      y >= 2 && y < this.height - 2;

                    if (!isSafeZone && Math.random() < this.wallDensity) {
                        grid.push(this.TILES.WALL);
                    } else {
                        grid.push(this.TILES.FLOOR);
                    }
                }
            }
        }

        // Add some structured obstacles in the middle for variety
        this.addStructuredObstacles(grid);

        return grid;
    }

    addStructuredObstacles(grid) {
        // Add 1-3 small obstacle patterns in the middle of the board
        const numObstacles = 1 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numObstacles; i++) {
            const pattern = Math.floor(Math.random() * 4);

            // Pick a random center point (avoiding edges)
            const cx = 3 + Math.floor(Math.random() * Math.max(1, this.width - 6));
            const cy = 3 + Math.floor(Math.random() * Math.max(1, this.height - 6));

            switch(pattern) {
                case 0: // Single wall
                    this.setTileIfFloor(grid, cx, cy, this.TILES.WALL);
                    break;
                case 1: // 2x1 horizontal
                    this.setTileIfFloor(grid, cx, cy, this.TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy, this.TILES.WALL);
                    break;
                case 2: // 1x2 vertical
                    this.setTileIfFloor(grid, cx, cy, this.TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy + 1, this.TILES.WALL);
                    break;
                case 3: // L-shape
                    this.setTileIfFloor(grid, cx, cy, this.TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy, this.TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy + 1, this.TILES.WALL);
                    break;
            }
        }
    }

    setTileIfFloor(grid, x, y, tile) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        const idx = y * this.width + x;
        if (grid[idx] === this.TILES.FLOOR) {
            grid[idx] = tile;
        }
    }

    placeSafeTargets(grid) {
        const targets = [];
        const safeTiles = [];

        // Find floor tiles that aren't in corners or against walls
        for (let y = 2; y < this.height - 2; y++) {
            for (let x = 2; x < this.width - 2; x++) {
                const idx = y * this.width + x;
                if (grid[idx] === this.TILES.FLOOR) {
                    // Check it's not a corner or against a wall
                    if (!this.isCornerOrWall(grid, x, y)) {
                        safeTiles.push(idx);
                    }
                }
            }
        }

        // Shuffle and pick targets
        this.shuffle(safeTiles);
        const count = Math.min(this.boxCount, safeTiles.length);

        for (let i = 0; i < count; i++) {
            targets.push(safeTiles[i]);
            grid[safeTiles[i]] = this.TILES.TARGET;
        }

        return targets;
    }

    isCornerOrWall(grid, x, y) {
        // Check if position has walls in perpendicular directions (corner)
        const up = grid[(y - 1) * this.width + x];
        const down = grid[(y + 1) * this.width + x];
        const left = grid[y * this.width + (x - 1)];
        const right = grid[y * this.width + (x + 1)];

        // Corner if walls on two adjacent sides
        if ((up === this.TILES.WALL && left === this.TILES.WALL)) return true;
        if ((up === this.TILES.WALL && right === this.TILES.WALL)) return true;
        if ((down === this.TILES.WALL && left === this.TILES.WALL)) return true;
        if ((down === this.TILES.WALL && right === this.TILES.WALL)) return true;

        return false;
    }

    isDeadlock(grid, boxPos, targets) {
        // If box is on target, not a deadlock
        if (targets.includes(boxPos)) return false;

        const x = boxPos % this.width;
        const y = Math.floor(boxPos / this.width);

        // Check for corner deadlock (box trapped in corner)
        if (this.isCornerOrWall(grid, x, y)) return true;

        // Check for freeze deadlock (box against wall with no path to target along wall)
        if (this.isFreezeDeadlock(grid, x, y, targets)) return true;

        return false;
    }

    isAdjacentToWall(grid, x, y) {
        // Check if position is next to any wall
        const up = grid[(y - 1) * this.width + x];
        const down = grid[(y + 1) * this.width + x];
        const left = grid[y * this.width + (x - 1)];
        const right = grid[y * this.width + (x + 1)];

        return up === this.TILES.WALL ||
               down === this.TILES.WALL ||
               left === this.TILES.WALL ||
               right === this.TILES.WALL;
    }

    isBoxAccessible(grid, boxPos, otherBoxes, targets) {
        // Check if a box position allows the player to access it from enough sides
        // to potentially push it toward any target

        const x = boxPos % this.width;
        const y = Math.floor(boxPos / this.width);

        // Count how many sides are accessible (not wall, not other box)
        const up = (y - 1) * this.width + x;
        const down = (y + 1) * this.width + x;
        const left = y * this.width + (x - 1);
        const right = y * this.width + (x + 1);

        const upAccessible = grid[up] !== this.TILES.WALL && !otherBoxes.includes(up);
        const downAccessible = grid[down] !== this.TILES.WALL && !otherBoxes.includes(down);
        const leftAccessible = grid[left] !== this.TILES.WALL && !otherBoxes.includes(left);
        const rightAccessible = grid[right] !== this.TILES.WALL && !otherBoxes.includes(right);

        const accessibleSides = [upAccessible, downAccessible, leftAccessible, rightAccessible].filter(Boolean).length;

        // Need at least 2 accessible sides to maneuver
        // (Unless box is already on target)
        if (targets.includes(boxPos)) return true;

        return accessibleSides >= 2;
    }

    canReachAroundBox(grid, boxPos, otherBoxes) {
        // Check if the player can navigate from one pushable side of the box
        // to another via a walkable path (a "loop"), enabling the box to be pushed
        // from multiple directions even when adjacent to walls.

        const bx = boxPos % this.width;
        const by = Math.floor(boxPos / this.width);

        const directions = [
            { dx: 0, dy: -1, axis: 'v' }, // up
            { dx: 0, dy:  1, axis: 'v' }, // down
            { dx: -1, dy: 0, axis: 'h' }, // left
            { dx:  1, dy: 0, axis: 'h' }  // right
        ];

        // Find all accessible sides of the box (floor, not wall, not another box)
        const pushSides = [];
        for (const dir of directions) {
            const nx = bx + dir.dx;
            const ny = by + dir.dy;
            if (!this.isValidPosition(nx, ny)) continue;
            const nPos = ny * this.width + nx;
            if (grid[nPos] !== this.TILES.WALL && !otherBoxes.includes(nPos)) {
                pushSides.push({ pos: nPos, axis: dir.axis });
            }
        }

        if (pushSides.length < 2) return false;

        // Check if any two push sides on different axes are connected by a walkable path
        for (let i = 0; i < pushSides.length; i++) {
            for (let j = i + 1; j < pushSides.length; j++) {
                if (pushSides[i].axis === pushSides[j].axis) continue;
                if (this.bfsConnected(grid, pushSides[i].pos, pushSides[j].pos, boxPos, otherBoxes)) {
                    return true;
                }
            }
        }

        return false;
    }

    bfsConnected(grid, from, to, excludeBox, excludeBoxes) {
        // BFS to check if 'from' and 'to' are connected via walkable tiles,
        // excluding the box position itself and other boxes.
        const queue = [from];
        const visited = new Set([from]);

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === to) return true;

            const cx = current % this.width;
            const cy = Math.floor(current / this.width);

            const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            for (const [dx, dy] of offsets) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (!this.isValidPosition(nx, ny)) continue;
                const nPos = ny * this.width + nx;
                if (visited.has(nPos)) continue;
                if (grid[nPos] === this.TILES.WALL) continue;
                if (nPos === excludeBox) continue;
                if (excludeBoxes.includes(nPos)) continue;
                visited.add(nPos);
                queue.push(nPos);
            }
        }

        return false;
    }

    getPlayerReachable(grid, playerPos, boxes) {
        // BFS flood-fill from player position.
        // Walls and boxes are impassable. Returns a Set of all
        // positions the player can walk to.
        const reachable = new Set([playerPos]);
        const queue = [playerPos];

        while (queue.length > 0) {
            const current = queue.shift();
            const cx = current % this.width;
            const cy = Math.floor(current / this.width);

            const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            for (const [dx, dy] of offsets) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (!this.isValidPosition(nx, ny)) continue;
                const nPos = ny * this.width + nx;
                if (reachable.has(nPos)) continue;
                if (grid[nPos] === this.TILES.WALL) continue;
                if (boxes.includes(nPos)) continue;
                reachable.add(nPos);
                queue.push(nPos);
            }
        }

        return reachable;
    }

    isFreezeDeadlock(grid, x, y, targets) {
        // A box is freeze-deadlocked if it's against a wall and can't reach
        // a target by sliding along that wall

        const up = grid[(y - 1) * this.width + x];
        const down = grid[(y + 1) * this.width + x];
        const left = grid[y * this.width + (x - 1)];
        const right = grid[y * this.width + (x + 1)];

        // Check if against a horizontal wall (top or bottom)
        if (up === this.TILES.WALL || down === this.TILES.WALL) {
            // Can only move left or right along this wall
            // Check if any target is reachable horizontally from this row
            const canReachTarget = targets.some(target => {
                const tx = target % this.width;
                const ty = Math.floor(target / this.width);
                // Must be same row and path must be clear
                if (ty !== y) return false;

                // Check horizontal path between box and target
                const minX = Math.min(x, tx);
                const maxX = Math.max(x, tx);
                for (let checkX = minX; checkX <= maxX; checkX++) {
                    const tile = grid[y * this.width + checkX];
                    if (tile === this.TILES.WALL) return false;
                }
                return true;
            });

            if (!canReachTarget && (left === this.TILES.WALL || right === this.TILES.WALL)) {
                return true; // Deadlock: against wall with no horizontal path
            }
        }

        // Check if against a vertical wall (left or right)
        if (left === this.TILES.WALL || right === this.TILES.WALL) {
            // Can only move up or down along this wall
            const canReachTarget = targets.some(target => {
                const tx = target % this.width;
                const ty = Math.floor(target / this.width);
                // Must be same column
                if (tx !== x) return false;

                // Check vertical path between box and target
                const minY = Math.min(y, ty);
                const maxY = Math.max(y, ty);
                for (let checkY = minY; checkY <= maxY; checkY++) {
                    const tile = grid[checkY * this.width + x];
                    if (tile === this.TILES.WALL) return false;
                }
                return true;
            });

            if (!canReachTarget && (up === this.TILES.WALL || down === this.TILES.WALL)) {
                return true; // Deadlock: against wall with no vertical path
            }
        }

        return false;
    }

    placePlayerNearBoxes(grid, boxes) {
        const candidates = [];

        for (const box of boxes) {
            const x = box % this.width;
            const y = Math.floor(box / this.width);
            const adjacent = this.getAdjacentPositions(x, y);

            for (const pos of adjacent) {
                const tile = grid[pos];
                if ((tile === this.TILES.FLOOR || tile === this.TILES.TARGET) &&
                    !boxes.includes(pos)) {
                    candidates.push(pos);
                }
            }
        }

        if (candidates.length === 0) return -1;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    reversePlay(grid, boxes, playerPos, targets) {
        // Uses PULL-based reverse play (not pushes).
        //
        // A pull works like this:
        //   - Player stands adjacent to a box (at boxPos + d)
        //   - Player steps AWAY in direction d (to boxPos + 2d)
        //   - Box follows into player's old spot (from boxPos to boxPos + d)
        //
        // The undo of a pull (= the forward game push) is:
        //   - Player at boxPos + 2d pushes box from boxPos + d back to boxPos
        //   - Player is already in the correct position, so solvability is guaranteed.

        const state = {
            grid: [...grid],
            boxes: [...boxes],
            playerPos: playerPos
        };

        const moves = [
            [0, -1],  // up
            [0, 1],   // down
            [-1, 0],  // left
            [1, 0]    // right
        ];

        let successfulMoves = 0;

        for (let step = 0; step < this.complexity * 3 && successfulMoves < this.complexity; step++) {
            // Pick random box
            const boxIdx = Math.floor(Math.random() * state.boxes.length);
            const boxPos = state.boxes[boxIdx];
            const boxX = boxPos % this.width;
            const boxY = Math.floor(boxPos / this.width);

            // Compute player reachability once per step (BFS flood-fill
            // from current player position, treating walls and boxes as impassable)
            const reachable = this.getPlayerReachable(state.grid, state.playerPos, state.boxes);

            this.shuffle(moves);

            for (const [dx, dy] of moves) {
                // Pull direction d = (dx, dy): box moves from boxPos to boxPos + d
                const newBoxX = boxX + dx;
                const newBoxY = boxY + dy;
                const newBoxPos = newBoxY * this.width + newBoxX;

                // Player must stand at newBoxPos (adjacent to box, on the pull side)
                // then steps to playerDest = boxPos + 2d (one cell beyond newBoxPos)
                const playerDestX = boxX + 2 * dx;
                const playerDestY = boxY + 2 * dy;

                // Validate all positions are in bounds
                if (!this.isValidPosition(newBoxX, newBoxY)) continue;
                if (!this.isValidPosition(playerDestX, playerDestY)) continue;

                const playerDest = playerDestY * this.width + playerDestX;

                // newBoxPos must be empty floor (box destination)
                if (state.grid[newBoxPos] === this.TILES.WALL) continue;
                if (state.boxes.includes(newBoxPos)) continue;

                // playerDest must be empty floor (player steps there during pull)
                if (state.grid[playerDest] === this.TILES.WALL) continue;
                if (state.boxes.includes(playerDest)) continue;

                // Player must be able to walk to newBoxPos to initiate the pull
                if (!reachable.has(newBoxPos)) continue;

                // Check new box position isn't a deadlock
                if (this.isDeadlock(state.grid, newBoxPos, targets)) continue;

                // Quick filter: need at least 2 accessible sides
                if (!this.isBoxAccessible(state.grid, newBoxPos, state.boxes, targets)) continue;

                // Loop check: verify paths exist around the box for multi-axis pushing
                if (!targets.includes(newBoxPos)) {
                    const otherBoxes = state.boxes.filter((_, idx) => idx !== boxIdx);
                    if (!this.canReachAroundBox(state.grid, newBoxPos, otherBoxes)) continue;
                }

                // Valid pull!
                state.boxes[boxIdx] = newBoxPos;
                state.playerPos = playerDest;
                successfulMoves++;
                break;
            }
        }

        return state;
    }

    buildFinalGrid(grid, boxes, playerPos, targets) {
        const finalGrid = [];

        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === this.TILES.TARGET) {
                finalGrid.push(this.TILES.FLOOR);
            } else {
                finalGrid.push(grid[i]);
            }
        }

        // Place targets
        for (const target of targets) {
            finalGrid[target] = this.TILES.TARGET;
        }

        // Place boxes
        for (const box of boxes) {
            const isOnTarget = targets.includes(box);
            finalGrid[box] = isOnTarget ? this.TILES.BOX_ON_TARGET : this.TILES.BOX;
        }

        // Mark player tile (keep target visible if on target)
        const playerOnTarget = targets.includes(playerPos);
        if (playerOnTarget) {
            finalGrid[playerPos] = this.TILES.TARGET;
        } else {
            finalGrid[playerPos] = this.TILES.PLAYER;
        }

        return {
            width: this.width,
            height: this.height,
            grid: finalGrid,
            playerX: playerPos % this.width,
            playerY: Math.floor(playerPos / this.width)
        };
    }

    createSimpleFallback() {
        // Simple 7x7 level as fallback
        return {
            width: 7,
            height: 7,
            grid: [
                1,1,1,1,1,1,1,
                1,0,0,0,0,0,1,
                1,0,0,3,0,0,1,
                1,0,0,0,0,0,1,
                1,0,4,0,2,0,1,
                1,0,0,0,0,0,1,
                1,1,1,1,1,1,1
            ],
            playerX: 2,
            playerY: 4
        };
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    getAdjacentPositions(x, y) {
        const positions = [];
        const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (const [dx, dy] of offsets) {
            const newX = x + dx;
            const newY = y + dy;
            if (this.isValidPosition(newX, newY)) {
                positions.push(newY * this.width + newX);
            }
        }

        return positions;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SokobanGenerator;
}
