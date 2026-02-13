// Sokoban Level Generator using Reverse-Play Algorithm
// Based on Taylor & Parberry (2011) approach

class SokobanGenerator {
    constructor(width = 8, height = 8, boxCount = 3, complexity = 20) {
        this.width = width;
        this.height = height;
        this.boxCount = boxCount;
        this.complexity = complexity; // Number of reverse moves to make

        this.TILES = {
            FLOOR: 0,
            WALL: 1,
            TARGET: 2,
            BOX: 3,
            PLAYER: 4,
            BOX_ON_TARGET: 5
        };
    }

    generate() {
        // Step 1: Create empty room with walls
        const grid = this.createEmptyRoom();

        // Step 2: Place targets randomly
        const targets = this.placeTargets(grid);

        // Step 3: Place boxes on targets (solved state)
        const boxes = [...targets];

        // Step 4: Place player near boxes
        let playerPos = this.placePlayer(grid, boxes);

        // Step 5: Perform reverse moves to scramble boxes
        const state = this.reversePlay(grid, boxes, playerPos, targets);

        // Step 6: Build final grid
        return this.buildFinalGrid(state.grid, state.boxes, state.playerPos, targets);
    }

    createEmptyRoom() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Create walls around perimeter
                if (x === 0 || x === this.width - 1 ||
                    y === 0 || y === this.height - 1) {
                    grid.push(this.TILES.WALL);
                } else {
                    // Add some internal walls for complexity (20% chance)
                    grid.push(Math.random() < 0.2 ? this.TILES.WALL : this.TILES.FLOOR);
                }
            }
        }
        return grid;
    }

    placeTargets(grid) {
        const targets = [];
        const floorTiles = [];

        // Find all floor tiles
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === this.TILES.FLOOR) {
                floorTiles.push(i);
            }
        }

        // Shuffle and pick first N floor tiles as targets
        this.shuffle(floorTiles);

        for (let i = 0; i < Math.min(this.boxCount, floorTiles.length); i++) {
            targets.push(floorTiles[i]);
            grid[floorTiles[i]] = this.TILES.TARGET;
        }

        return targets;
    }

    placePlayer(grid, boxes) {
        // Find floor tiles adjacent to boxes
        const candidates = [];

        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === this.TILES.FLOOR || grid[i] === this.TILES.TARGET) {
                const x = i % this.width;
                const y = Math.floor(i / this.width);

                // Check if adjacent to any box
                const adjacent = this.getAdjacentPositions(x, y);
                const nearBox = adjacent.some(pos => boxes.includes(pos));

                if (nearBox) {
                    candidates.push(i);
                }
            }
        }

        // Pick random candidate, or any floor tile if none found
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }

        // Fallback: any floor tile
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === this.TILES.FLOOR || grid[i] === this.TILES.TARGET) {
                return i;
            }
        }

        return -1;
    }

    reversePlay(grid, boxes, playerPos, targets) {
        // Simulate game in reverse: pull boxes instead of push
        // This guarantees the final state is solvable

        const state = {
            grid: [...grid],
            boxes: [...boxes],
            playerPos: playerPos
        };

        const moves = [
            [0, -1], // up
            [0, 1],  // down
            [-1, 0], // left
            [1, 0]   // right
        ];

        for (let step = 0; step < this.complexity; step++) {
            // Pick a random box
            const boxIdx = Math.floor(Math.random() * state.boxes.length);
            const boxPos = state.boxes[boxIdx];
            const boxX = boxPos % this.width;
            const boxY = Math.floor(boxPos / this.width);

            // Try to pull it in a random direction
            this.shuffle(moves);

            for (const [dx, dy] of moves) {
                // Player would need to be on opposite side of box
                const playerX = boxX - dx;
                const playerY = boxY - dy;
                const newPlayerPos = playerY * this.width + playerX;

                // New box position (pulled toward player)
                const newBoxX = boxX + dx;
                const newBoxY = boxY + dy;
                const newBoxPos = newBoxY * this.width + newBoxX;

                // Check if move is valid
                if (!this.isValidPosition(playerX, playerY)) continue;
                if (!this.isValidPosition(newBoxX, newBoxY)) continue;

                const playerTile = state.grid[newPlayerPos];
                const newBoxTile = state.grid[newBoxPos];

                // Player position must be walkable
                if (playerTile === this.TILES.WALL) continue;

                // New box position must be walkable and not occupied by another box
                if (newBoxTile === this.TILES.WALL) continue;
                if (state.boxes.includes(newBoxPos)) continue;

                // Valid reverse move! Apply it
                state.boxes[boxIdx] = newBoxPos;
                state.playerPos = boxPos; // Player moves to where box was
                break;
            }
        }

        return state;
    }

    buildFinalGrid(grid, boxes, playerPos, targets) {
        const finalGrid = [...grid];

        // Clear targets from grid (we'll track them separately)
        for (let i = 0; i < finalGrid.length; i++) {
            if (finalGrid[i] === this.TILES.TARGET) {
                finalGrid[i] = this.TILES.FLOOR;
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

        // Place player
        const playerOnTarget = targets.includes(playerPos);
        if (playerOnTarget) {
            // Keep target visible under player
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
        // Fisher-Yates shuffle
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
