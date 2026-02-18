import { TILES } from './tiles.js';

// Sokoban Level Generator using Reverse-Play Algorithm
// Based on Taylor & Parberry (2011) approach

export class SokobanGenerator {
    constructor(width = 8, height = 8, boxCount = 3, complexity = 20, wallDensity = 0, styleWeights = null) {
        this.width = width;
        this.height = height;
        this.boxCount = boxCount;
        this.complexity = complexity;
        this.wallDensity = wallDensity; // 0-0.15, probability of internal walls
        this.styleWeights = styleWeights || { clusters: 25, maze: 25, caves: 25, clusteredRooms: 25 };
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
        const failReasons = {};
        const originalBoxCount = this.boxCount;

        while (attempts < 100) {
            try {
                // Progressive relaxation: reduce box count after repeated failures
                if (attempts === 40 && this.boxCount > 2) {
                    this.boxCount = Math.max(2, this.boxCount - 1);
                    console.log(`[SokobanGen] Relaxing: boxCount → ${this.boxCount}`);
                }
                if (attempts === 70 && this.boxCount > 2) {
                    this.boxCount = Math.max(2, this.boxCount - 1);
                    console.log(`[SokobanGen] Relaxing further: boxCount → ${this.boxCount}`);
                }

                const result = this.attemptGenerate(failReasons, attempts);
                if (result) {
                    console.log(`[SokobanGen] Success after ${attempts + 1} attempts (${this.width}x${this.height}, ${this.boxCount} boxes). Failures:`, failReasons);
                    this.boxCount = originalBoxCount;
                    return result;
                }
            } catch (e) {
                failReasons['exception'] = (failReasons['exception'] || 0) + 1;
            }
            attempts++;
        }

        // Last-ditch: try 20 more times with only deadlock validation
        // (skip spacing/moves checks — a close-box real level beats the static fallback)
        this.boxCount = Math.max(2, Math.min(originalBoxCount, 3));
        for (let i = 0; i < 20; i++) {
            try {
                const result = this.attemptGeneratePermissive(failReasons);
                if (result) {
                    console.log(`[SokobanGen] Permissive success after ${attempts + i + 1} total attempts (${this.width}x${this.height}, ${this.boxCount} boxes)`);
                    this.boxCount = originalBoxCount;
                    return result;
                }
            } catch (e) { /* ignore */ }
        }

        console.warn(`[SokobanGen] All attempts failed (${this.width}x${this.height}). Failures:`, failReasons, '— using fallback');
        this.boxCount = originalBoxCount;
        return this.createSimpleFallback();
    }

    attemptGenerate(failReasons = {}, attempt = 0) {
        // Step 1: Create simple room
        const grid = this.createSimpleRoom();

        // Step 2: Place TARGETS (these stay fixed throughout)
        const targets = this.placeSafeTargets(grid);
        if (targets.length === 0) {
            failReasons['no_targets'] = (failReasons['no_targets'] || 0) + 1;
            return null;
        }

        // Step 3: Place BOXES on targets (solved state - this is our starting point for reverse-play)
        const boxes = [...targets];

        // Step 4: Place player adjacent to boxes
        let playerPos = this.placePlayerNearBoxes(grid, boxes);
        if (playerPos === -1) {
            failReasons['no_player_pos'] = (failReasons['no_player_pos'] || 0) + 1;
            return null;
        }

        // Step 5: PULL boxes away from targets (reverse moves)
        const state = this.reversePlay(grid, boxes, playerPos, targets);

        // Step 6: Validate no boxes ended up in deadlocks
        for (const box of state.boxes) {
            if (this.isDeadlock(state.grid, box, targets)) {
                failReasons['deadlock'] = (failReasons['deadlock'] || 0) + 1;
                return null;
            }
        }

        // Step 6b: Validate no boxes are on targets (we want an unsolved puzzle)
        for (const box of state.boxes) {
            if (targets.includes(box)) {
                failReasons['box_on_target'] = (failReasons['box_on_target'] || 0) + 1;
                return null;
            }
        }

        // Step 7: Tier 3 — Minimum moves achieved
        // reversePlay must achieve at least 40% of requested complexity
        const minDim = Math.min(this.width, this.height);
        let minMovesFraction = 0.4;
        if (attempt >= 60) minMovesFraction = 0.3;
        if (attempt >= 80) minMovesFraction = 0.2;
        if (attempt >= 90) minMovesFraction = 0.1;
        const minMoves = Math.floor(this.complexity * minMovesFraction);
        if (state.successfulMoves < minMoves) {
            failReasons['too_few_moves'] = (failReasons['too_few_moves'] || 0) + 1;
            return null;
        }

        // Step 8: Two-tier box-target spacing validation
        // Progressive relaxation based on attempt number
        const perBoxRelax = (attempt >= 50 ? 1 : 0) + (attempt >= 70 ? 1 : 0) + (attempt >= 85 ? 1 : 0);
        const avgRelax = (attempt >= 50 ? 1 : 0) + (attempt >= 70 ? 1 : 0) + (attempt >= 85 ? 1 : 0);

        // Tier 1: Per-box minimum distance (hard floor)
        // Cap at 5 so large grids don't get impossibly high thresholds
        const perBoxMinDist = Math.max(1, Math.min(5, Math.max(2, Math.floor(minDim / 4))) - perBoxRelax);
        for (const box of state.boxes) {
            const bx = box % this.width;
            const by = Math.floor(box / this.width);
            let nearest = Infinity;
            for (const t of targets) {
                const tx = t % this.width;
                const ty = Math.floor(t / this.width);
                nearest = Math.min(nearest, Math.abs(bx - tx) + Math.abs(by - ty));
            }
            if (nearest < perBoxMinDist) {
                failReasons['box_too_close'] = (failReasons['box_too_close'] || 0) + 1;
                return null;
            }
        }

        // Tier 2: Average distance threshold (quality floor)
        // Cap at 8 to keep it achievable on large grids
        const avgDistThreshold = Math.max(1,
            Math.min(8, Math.max(3, Math.floor(minDim / 3.5 * Math.min(1.5, this.complexity / 40)))) - avgRelax);
        let totalDist = 0;
        for (const box of state.boxes) {
            const bx = box % this.width;
            const by = Math.floor(box / this.width);
            let nearest = Infinity;
            for (const t of targets) {
                const tx = t % this.width;
                const ty = Math.floor(t / this.width);
                nearest = Math.min(nearest, Math.abs(bx - tx) + Math.abs(by - ty));
            }
            totalDist += nearest;
        }
        const avgDist = totalDist / state.boxes.length;
        if (avgDist < avgDistThreshold) {
            failReasons['boxes_too_close'] = (failReasons['boxes_too_close'] || 0) + 1;
            return null;
        }

        // Step 9: Build final grid
        return this.buildFinalGrid(state.grid, state.boxes, state.playerPos, targets, state.solutionPath);
    }

    // Permissive generation: only checks deadlock, skips spacing/moves.
    // Accepts partially-solved puzzles (some boxes still on targets) rather than fallback.
    attemptGeneratePermissive(failReasons = {}) {
        const grid = this.createSimpleRoom();
        const targets = this.placeSafeTargets(grid);
        if (targets.length === 0) return null;

        const boxes = [...targets];
        let playerPos = this.placePlayerNearBoxes(grid, boxes);
        if (playerPos === -1) return null;

        const state = this.reversePlay(grid, boxes, playerPos, targets);

        // Only check deadlocks
        for (const box of state.boxes) {
            if (this.isDeadlock(state.grid, box, targets)) return null;
        }

        // Require at least 1 box off its target (otherwise puzzle is already solved)
        if (state.boxes.every(b => targets.includes(b))) return null;

        return this.buildFinalGrid(state.grid, state.boxes, state.playerPos, targets, state.solutionPath);
    }

    // === WEIGHT-BASED STYLE DISPATCH ===

    selectPrimaryAlgorithm() {
        const w = this.styleWeights;
        const total = w.clusters + w.maze + w.caves + w.clusteredRooms;
        if (total === 0) return 'clusters'; // fallback
        const roll = Math.random() * total;
        let acc = 0;
        acc += w.clusters;   if (roll < acc) return 'clusters';
        acc += w.maze;       if (roll < acc) return 'maze';
        acc += w.caves;      if (roll < acc) return 'caves';
        return 'clusteredRooms';
    }

    selectSecondaryAlgorithm(primary) {
        const w = { ...this.styleWeights };
        const primaryWeight = w[primary];
        delete w[primary];
        // Pick the next-highest-weighted style
        let best = null, bestVal = -1;
        for (const [key, val] of Object.entries(w)) {
            if (val > bestVal) { bestVal = val; best = key; }
        }
        // Only apply overlay if secondary weight >= 20% of primary
        if (best && bestVal >= primaryWeight * 0.2) return best;
        return null;
    }

    createSimpleRoom() {
        const primary = this.selectPrimaryAlgorithm();
        let grid;
        switch (primary) {
            case 'clusters':       grid = this.createRandomClusters(); break;
            case 'maze':           grid = this.createMazeSubdivision(); break;
            case 'caves':          grid = this.createOrganicCaves(); break;
            case 'clusteredRooms': grid = this.createClusteredRooms(); break;
            default:               grid = this.createRandomClusters(); break;
        }
        // Apply secondary overlay
        const secondary = this.selectSecondaryAlgorithm(primary);
        if (secondary) this.applyOverlay(grid, secondary);
        this.ensureConnectivity(grid);
        return grid;
    }

    // === ALGORITHM A: Random Clusters ===
    createRandomClusters() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    grid.push(TILES.WALL);
                } else {
                    grid.push(TILES.FLOOR);
                }
            }
        }
        // Calculate wall budget from wallDensity
        const interiorArea = (this.width - 2) * (this.height - 2);
        const wallBudget = Math.floor(this.wallDensity * interiorArea);
        let wallsPlaced = 0;
        // Place multiple clusters using random-walk growth from seed points
        const numClusters = Math.max(1, Math.floor(wallBudget / 4));
        for (let c = 0; c < numClusters && wallsPlaced < wallBudget; c++) {
            const seedX = 2 + Math.floor(Math.random() * Math.max(1, this.width - 4));
            const seedY = 2 + Math.floor(Math.random() * Math.max(1, this.height - 4));
            const clusterSize = 2 + Math.floor(Math.random() * 5); // 2-6 tiles
            wallsPlaced += this.growCluster(grid, seedX, seedY, Math.min(clusterSize, wallBudget - wallsPlaced));
        }
        // Add structured obstacles for extra variety
        this.addStructuredObstacles(grid);
        this.ensureConnectivity(grid);
        return grid;
    }

    // === ALGORITHM B: Recursive Subdivision (Maze) ===
    createMazeSubdivision() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    grid.push(TILES.WALL);
                } else {
                    grid.push(TILES.FLOOR);
                }
            }
        }
        const minDim = Math.min(this.width, this.height);
        let maxDepth = 2 + Math.floor(this.wallDensity * 12);
        if (minDim < 12) maxDepth = Math.min(maxDepth, 1);

        this.subdivide(grid, 1, 1, this.width - 2, this.height - 2, 0, maxDepth);
        this.ensureConnectivity(grid);
        return grid;
    }

    subdivide(grid, x1, y1, x2, y2, depth, maxDepth) {
        const w = x2 - x1 + 1;
        const h = y2 - y1 + 1;
        if (depth >= maxDepth || w < 5 || h < 5) return;

        // Split along longer axis (70/30 bias toward longer)
        const splitHorizontal = (h > w) ? (Math.random() < 0.7) :
                                (w > h) ? (Math.random() < 0.3) :
                                (Math.random() < 0.5);

        if (splitHorizontal) {
            // Horizontal wall line
            const wy = y1 + 2 + Math.floor(Math.random() * Math.max(1, h - 4));
            const gapCount = 1 + (w > 8 ? 1 : 0);
            const gaps = new Set();
            for (let g = 0; g < gapCount; g++) {
                const gapStart = x1 + Math.floor(Math.random() * Math.max(1, w - 2));
                const gapSize = 2 + Math.floor(Math.random() * 2); // 2-3 tile gap
                for (let gx = gapStart; gx < gapStart + gapSize && gx <= x2; gx++) {
                    gaps.add(gx);
                }
            }
            for (let x = x1; x <= x2; x++) {
                if (!gaps.has(x)) {
                    grid[wy * this.width + x] = TILES.WALL;
                }
            }
            this.subdivide(grid, x1, y1, x2, wy - 1, depth + 1, maxDepth);
            this.subdivide(grid, x1, wy + 1, x2, y2, depth + 1, maxDepth);
        } else {
            // Vertical wall line
            const wx = x1 + 2 + Math.floor(Math.random() * Math.max(1, w - 4));
            const gapCount = 1 + (h > 8 ? 1 : 0);
            const gaps = new Set();
            for (let g = 0; g < gapCount; g++) {
                const gapStart = y1 + Math.floor(Math.random() * Math.max(1, h - 2));
                const gapSize = 2 + Math.floor(Math.random() * 2);
                for (let gy = gapStart; gy < gapStart + gapSize && gy <= y2; gy++) {
                    gaps.add(gy);
                }
            }
            for (let y = y1; y <= y2; y++) {
                if (!gaps.has(y)) {
                    grid[y * this.width + wx] = TILES.WALL;
                }
            }
            this.subdivide(grid, x1, y1, wx - 1, y2, depth + 1, maxDepth);
            this.subdivide(grid, wx + 1, y1, x2, y2, depth + 1, maxDepth);
        }
    }

    // === ALGORITHM C: Organic Caves (Cellular Automata) ===
    createOrganicCaves() {
        const grid = [];
        const wallProb = Math.min(0.55, this.wallDensity + 0.15);
        // Initialize: perimeter walls, interior random
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    grid.push(TILES.WALL);
                } else {
                    grid.push(Math.random() < wallProb ? TILES.WALL : TILES.FLOOR);
                }
            }
        }
        // Run 4-5 cellular automata iterations
        const iterations = 4 + Math.floor(Math.random() * 2);
        for (let iter = 0; iter < iterations; iter++) {
            const next = [...grid];
            for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    const idx = y * this.width + x;
                    const neighbors = this.countWallNeighbors8(grid, x, y);
                    if (grid[idx] === TILES.WALL) {
                        // Wall survives if 4+ wall neighbors
                        next[idx] = neighbors >= 4 ? TILES.WALL : TILES.FLOOR;
                    } else {
                        // Floor becomes wall if 5+ wall neighbors
                        next[idx] = neighbors >= 5 ? TILES.WALL : TILES.FLOOR;
                    }
                }
            }
            for (let i = 0; i < grid.length; i++) grid[i] = next[i];
        }
        // Keep only the largest connected floor region
        this.keepLargestFloorRegion(grid);
        // If too few floor tiles for boxes, widen with extra smoothing pass
        const floorCount = grid.filter(t => t === TILES.FLOOR).length;
        const minFloor = this.boxCount * 6 + 10;
        if (floorCount < minFloor) {
            const next = [...grid];
            for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    const idx = y * this.width + x;
                    if (grid[idx] === TILES.WALL) {
                        const neighbors = this.countWallNeighbors8(grid, x, y);
                        if (neighbors <= 3) next[idx] = TILES.FLOOR;
                    }
                }
            }
            for (let i = 0; i < grid.length; i++) grid[i] = next[i];
            this.keepLargestFloorRegion(grid);
        }
        this.ensureConnectivity(grid);
        return grid;
    }

    countWallNeighbors8(grid, x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                    count++; // Out of bounds counts as wall
                } else if (grid[ny * this.width + nx] === TILES.WALL) {
                    count++;
                }
            }
        }
        return count;
    }

    keepLargestFloorRegion(grid) {
        const visited = new Set();
        let largestRegion = [];
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] !== TILES.FLOOR || visited.has(i)) continue;
            const region = this.floodFillFloor(grid, i);
            for (const t of region) visited.add(t);
            if (region.size > largestRegion.length) {
                largestRegion = [...region];
            }
        }
        // Fill all non-largest floor regions with walls
        const keep = new Set(largestRegion);
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === TILES.FLOOR && !keep.has(i)) {
                grid[i] = TILES.WALL;
            }
        }
    }

    // === ALGORITHM D: Rooms with Internal Clusters ===
    createClusteredRooms() {
        // BSP rooms + corridors (reusing existing logic inline)
        const grid = new Array(this.width * this.height).fill(TILES.WALL);
        const interiorW = this.width - 2;
        const interiorH = this.height - 2;
        const interiorArea = interiorW * interiorH;
        const roomAreaTarget = Math.max(15, Math.round(80 - this.wallDensity * 200));
        const roomCount = Math.max(2, Math.floor(interiorArea / roomAreaTarget));
        const minSide = 3;
        const maxSide = Math.min(7, Math.max(4, Math.floor(Math.min(this.width, this.height) / 4)));

        const rooms = [];
        let attempts = 0;
        const maxAttempts = roomCount * 20;
        while (rooms.length < roomCount && attempts < maxAttempts) {
            attempts++;
            const rw = minSide + Math.floor(Math.random() * (maxSide - minSide + 1));
            const rh = minSide + Math.floor(Math.random() * (maxSide - minSide + 1));
            const rx = 2 + Math.floor(Math.random() * Math.max(1, this.width - rw - 3));
            const ry = 2 + Math.floor(Math.random() * Math.max(1, this.height - rh - 3));
            let overlaps = false;
            for (const room of rooms) {
                if (rx - 1 < room.x + room.w && rx + rw + 1 > room.x &&
                    ry - 1 < room.y + room.h && ry + rh + 1 > room.y) {
                    overlaps = true; break;
                }
            }
            if (overlaps) continue;
            for (let dy = 0; dy < rh; dy++) {
                for (let dx = 0; dx < rw; dx++) {
                    grid[(ry + dy) * this.width + (rx + dx)] = TILES.FLOOR;
                }
            }
            rooms.push({ x: rx, y: ry, w: rw, h: rh,
                cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) });
        }
        // Connect rooms with corridors
        for (let i = 1; i < rooms.length; i++) {
            this.carveCorridor(grid, rooms[i - 1].cx, rooms[i - 1].cy,
                                     rooms[i].cx, rooms[i].cy);
        }
        const extras = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < extras && rooms.length >= 2; i++) {
            const a = Math.floor(Math.random() * rooms.length);
            let b = Math.floor(Math.random() * rooms.length);
            if (b === a) b = (a + 1) % rooms.length;
            this.carveCorridor(grid, rooms[a].cx, rooms[a].cy,
                                     rooms[b].cx, rooms[b].cy);
        }

        // Populate room interiors with wall clusters (the "clustered rooms" twist)
        for (const room of rooms) {
            const roomArea = room.w * room.h;
            if (roomArea >= 20) {
                const numClusters = 1 + Math.floor(Math.random() * 3);
                for (let c = 0; c < numClusters; c++) {
                    const sx = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
                    const sy = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
                    this.growCluster(grid, sx, sy, 2 + Math.floor(Math.random() * 3),
                        room.x + 1, room.y + 1, room.x + room.w - 2, room.y + room.h - 2);
                }
            }
            if (roomArea >= 30 && Math.random() < 0.5) {
                this.addStructuredObstaclesInRoom(grid, room);
            }
        }
        this.ensureConnectivity(grid);
        return grid;
    }

    addStructuredObstaclesInRoom(grid, room) {
        // Place a single structured obstacle inside a room's bounds
        const cx = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 3));
        const cy = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 3));
        const pattern = Math.floor(Math.random() * 4);
        switch (pattern) {
            case 0: // Single wall
                this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                break;
            case 1: // L-shape
                this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                this.setTileIfFloor(grid, cx + 1, cy, TILES.WALL);
                this.setTileIfFloor(grid, cx, cy + 1, TILES.WALL);
                break;
            case 2: // 2x1 horizontal
                this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                this.setTileIfFloor(grid, cx + 1, cy, TILES.WALL);
                break;
            case 3: // 2x1 vertical
                this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                this.setTileIfFloor(grid, cx, cy + 1, TILES.WALL);
                break;
        }
    }

    // === OVERLAY SYSTEM ===
    applyOverlay(grid, style) {
        switch (style) {
            case 'clusters': this.overlayScatterClusters(grid); break;
            case 'maze':     this.overlaySubdivisionWalls(grid); break;
            case 'caves':    this.overlayCaveSmoothing(grid); break;
            case 'clusteredRooms': this.overlayEdgeClusters(grid); break;
        }
    }

    overlayScatterClusters(grid) {
        // Scatter a few extra small wall clusters onto floor tiles
        const count = 1 + Math.floor(Math.random() * 3);
        for (let c = 0; c < count; c++) {
            const sx = 2 + Math.floor(Math.random() * Math.max(1, this.width - 4));
            const sy = 2 + Math.floor(Math.random() * Math.max(1, this.height - 4));
            if (grid[sy * this.width + sx] === TILES.FLOOR) {
                this.growCluster(grid, sx, sy, 1 + Math.floor(Math.random() * 3));
            }
        }
    }

    overlaySubdivisionWalls(grid) {
        // Add 1-2 subdivision walls with gaps across existing floor space
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            const isVertical = Math.random() < 0.5;
            if (isVertical) {
                const wx = 3 + Math.floor(Math.random() * Math.max(1, this.width - 6));
                const gapStart = 2 + Math.floor(Math.random() * Math.max(1, this.height - 6));
                const gapSize = 2 + Math.floor(Math.random() * 2);
                for (let y = 1; y < this.height - 1; y++) {
                    if (y >= gapStart && y < gapStart + gapSize) continue;
                    this.setTileIfFloor(grid, wx, y, TILES.WALL);
                }
            } else {
                const wy = 3 + Math.floor(Math.random() * Math.max(1, this.height - 6));
                const gapStart = 2 + Math.floor(Math.random() * Math.max(1, this.width - 6));
                const gapSize = 2 + Math.floor(Math.random() * 2);
                for (let x = 1; x < this.width - 1; x++) {
                    if (x >= gapStart && x < gapStart + gapSize) continue;
                    this.setTileIfFloor(grid, x, wy, TILES.WALL);
                }
            }
        }
    }

    overlayCaveSmoothing(grid) {
        // Run 1-2 cellular automata smoothing iterations (softens edges)
        const iterations = 1 + Math.floor(Math.random() * 2);
        for (let iter = 0; iter < iterations; iter++) {
            const next = [...grid];
            for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    const idx = y * this.width + x;
                    const neighbors = this.countWallNeighbors8(grid, x, y);
                    if (grid[idx] === TILES.FLOOR && neighbors >= 5) {
                        next[idx] = TILES.WALL;
                    } else if (grid[idx] === TILES.WALL && neighbors <= 2) {
                        next[idx] = TILES.FLOOR;
                    }
                }
            }
            for (let i = 0; i < grid.length; i++) grid[i] = next[i];
        }
    }

    overlayEdgeClusters(grid) {
        // Add small wall clusters near existing wall edges
        const count = 1 + Math.floor(Math.random() * 3);
        for (let c = 0; c < count; c++) {
            // Find a random floor tile adjacent to a wall
            const candidates = [];
            for (let y = 2; y < this.height - 2; y++) {
                for (let x = 2; x < this.width - 2; x++) {
                    const idx = y * this.width + x;
                    if (grid[idx] === TILES.FLOOR && this.countWallNeighbors8(grid, x, y) >= 2) {
                        candidates.push({ x, y });
                    }
                }
            }
            if (candidates.length > 0) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                this.growCluster(grid, pick.x, pick.y, 1 + Math.floor(Math.random() * 2));
            }
        }
    }

    // === HELPER: Random-walk cluster placement ===
    growCluster(grid, seedX, seedY, size, minX = 1, minY = 1, maxX = null, maxY = null) {
        if (maxX === null) maxX = this.width - 2;
        if (maxY === null) maxY = this.height - 2;
        let placed = 0;
        let cx = seedX, cy = seedY;
        for (let i = 0; i < size * 3 && placed < size; i++) {
            if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
                const idx = cy * this.width + cx;
                if (grid[idx] === TILES.FLOOR) {
                    grid[idx] = TILES.WALL;
                    placed++;
                }
            }
            // Random walk
            const dir = Math.floor(Math.random() * 4);
            if (dir === 0) cx++;
            else if (dir === 1) cx--;
            else if (dir === 2) cy++;
            else cy--;
        }
        return placed;
    }

    carveCorridor(grid, x1, y1, x2, y2) {
        // L-shaped corridor: horizontal then vertical (or vice versa randomly)
        if (Math.random() < 0.5) {
            this.carveHLine(grid, x1, x2, y1);
            this.carveVLine(grid, y1, y2, x2);
        } else {
            this.carveVLine(grid, y1, y2, x1);
            this.carveHLine(grid, x1, x2, y2);
        }
    }

    carveHLine(grid, x1, x2, y) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let x = minX; x <= maxX; x++) {
            if (x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1) {
                grid[y * this.width + x] = TILES.FLOOR;
            }
        }
    }

    carveVLine(grid, y1, y2, x) {
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        for (let y = minY; y <= maxY; y++) {
            if (x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1) {
                grid[y * this.width + x] = TILES.FLOOR;
            }
        }
    }

    floodFillFloor(grid, startIdx) {
        // BFS from startIdx, returning set of all reachable FLOOR tiles
        const visited = new Set([startIdx]);
        const queue = [startIdx];
        let head = 0;
        while (head < queue.length) {
            const cur = queue[head++];
            const cx = cur % this.width;
            const cy = Math.floor(cur / this.width);
            for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
                const nx = cx + dx, ny = cy + dy;
                if (!this.isValidPosition(nx, ny)) continue;
                const nIdx = ny * this.width + nx;
                if (visited.has(nIdx)) continue;
                if (grid[nIdx] !== TILES.FLOOR) continue;
                visited.add(nIdx);
                queue.push(nIdx);
            }
        }
        return visited;
    }

    ensureConnectivity(grid) {
        // Find all floor tiles
        const floorTiles = [];
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === TILES.FLOOR) floorTiles.push(i);
        }
        if (floorTiles.length === 0) return;

        // BFS from first floor tile
        const mainRegion = this.floodFillFloor(grid, floorTiles[0]);

        // Find isolated tiles and connect them
        for (const tile of floorTiles) {
            if (!mainRegion.has(tile)) {
                this.connectIsolatedTile(grid, tile, mainRegion);
                // Re-flood to update connected region
                const expanded = this.floodFillFloor(grid, floorTiles[0]);
                for (const t of expanded) mainRegion.add(t);
            }
        }
    }

    connectIsolatedTile(grid, tileIdx, mainRegion) {
        // Carve a corridor from tileIdx toward the nearest tile in mainRegion
        const tx = tileIdx % this.width;
        const ty = Math.floor(tileIdx / this.width);

        // Find nearest main region tile
        let nearestIdx = -1;
        let nearestDist = Infinity;
        for (const mIdx of mainRegion) {
            const mx = mIdx % this.width;
            const my = Math.floor(mIdx / this.width);
            const dist = Math.abs(mx - tx) + Math.abs(my - ty);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = mIdx;
            }
        }

        if (nearestIdx === -1) return;

        const nx = nearestIdx % this.width;
        const ny = Math.floor(nearestIdx / this.width);
        this.carveCorridor(grid, tx, ty, nx, ny);
    }

    addStructuredObstacles(grid) {
        // Scale obstacle count with grid size, but cap for small grids
        const gridSize = Math.max(this.width, this.height);
        const numObstacles = gridSize <= 10
            ? 1 + Math.floor(Math.random() * 2)   // 1-2 for small grids
            : 2 + Math.floor(gridSize / 5);        // 2+ for larger grids

        for (let i = 0; i < numObstacles; i++) {
            // Small grids: only use simpler patterns (0-3) to avoid deadlock-heavy shapes
            const maxPattern = gridSize <= 10 ? 4 : 7;
            const pattern = Math.floor(Math.random() * maxPattern);

            // Pick a random center point (avoiding edges)
            const cx = 3 + Math.floor(Math.random() * Math.max(1, this.width - 6));
            const cy = 3 + Math.floor(Math.random() * Math.max(1, this.height - 6));

            switch(pattern) {
                case 0: // Single wall
                    this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                    break;
                case 1: // 3-tile horizontal line
                    this.setTileIfFloor(grid, cx - 1, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy, TILES.WALL);
                    break;
                case 2: // 3-tile vertical line
                    this.setTileIfFloor(grid, cx, cy - 1, TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy + 1, TILES.WALL);
                    break;
                case 3: // L-shape
                    this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy + 1, TILES.WALL);
                    break;
                case 4: // T-shape (horizontal bar + down stem)
                    this.setTileIfFloor(grid, cx - 1, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy + 1, TILES.WALL);
                    break;
                case 5: // 2x2 block
                    this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx, cy + 1, TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy + 1, TILES.WALL);
                    break;
                case 6: // 2x1 horizontal (small)
                    this.setTileIfFloor(grid, cx, cy, TILES.WALL);
                    this.setTileIfFloor(grid, cx + 1, cy, TILES.WALL);
                    break;
            }
        }

        // Add a random interior wall segment to break up the open space
        const maxSegLen = gridSize <= 10 ? 2 : 4;
        const segLen = 2 + Math.floor(Math.random() * Math.max(1, maxSegLen - 1));
        const horizontal = Math.random() < 0.5;
        const sx = 2 + Math.floor(Math.random() * Math.max(1, this.width - 4 - (horizontal ? segLen : 0)));
        const sy = 2 + Math.floor(Math.random() * Math.max(1, this.height - 4 - (horizontal ? 0 : segLen)));
        for (let s = 0; s < segLen; s++) {
            if (horizontal) {
                this.setTileIfFloor(grid, sx + s, sy, TILES.WALL);
            } else {
                this.setTileIfFloor(grid, sx, sy + s, TILES.WALL);
            }
        }
    }

    setTileIfFloor(grid, x, y, tile) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        const idx = y * this.width + x;
        if (grid[idx] === TILES.FLOOR) {
            grid[idx] = tile;
        }
    }

    placeSafeTargets(grid) {
        const safeTiles = [];

        // Find floor tiles that aren't in corners or against walls
        for (let y = 2; y < this.height - 2; y++) {
            for (let x = 2; x < this.width - 2; x++) {
                const idx = y * this.width + x;
                if (grid[idx] === TILES.FLOOR) {
                    // Check it's not a corner or against a wall
                    if (!this.isCornerOrWall(grid, x, y)) {
                        safeTiles.push(idx);
                    }
                }
            }
        }

        this.shuffle(safeTiles);
        const count = Math.min(this.boxCount, safeTiles.length);
        const minTargetDist = this.width <= 14
            ? Math.max(2, Math.floor(Math.max(this.width, this.height) / 5))
            : Math.max(3, Math.floor(Math.max(this.width, this.height) / 4));

        // Greedy placement with minimum distance enforcement
        let targets = this.placeWithMinDistance(safeTiles, count, minTargetDist);

        // Fallback: retry with half distance if too few placed
        if (targets.length < count) {
            targets = this.placeWithMinDistance(safeTiles, count, Math.floor(minTargetDist / 2));
        }

        // Last resort: just take what we can get
        if (targets.length < count) {
            for (const tile of safeTiles) {
                if (targets.length >= count) break;
                if (!targets.includes(tile)) targets.push(tile);
            }
        }

        for (const t of targets) {
            grid[t] = TILES.TARGET;
        }

        return targets;
    }

    placeWithMinDistance(candidates, count, minDist) {
        const placed = [];
        for (const tile of candidates) {
            if (placed.length >= count) break;
            const tx = tile % this.width;
            const ty = Math.floor(tile / this.width);
            let tooClose = false;
            for (const other of placed) {
                const ox = other % this.width;
                const oy = Math.floor(other / this.width);
                if (Math.abs(tx - ox) + Math.abs(ty - oy) < minDist) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) placed.push(tile);
        }
        return placed;
    }

    isCornerOrWall(grid, x, y) {
        // Check if position has walls in perpendicular directions (corner)
        const up = grid[(y - 1) * this.width + x];
        const down = grid[(y + 1) * this.width + x];
        const left = grid[y * this.width + (x - 1)];
        const right = grid[y * this.width + (x + 1)];

        // Corner if walls on two adjacent sides
        if ((up === TILES.WALL && left === TILES.WALL)) return true;
        if ((up === TILES.WALL && right === TILES.WALL)) return true;
        if ((down === TILES.WALL && left === TILES.WALL)) return true;
        if ((down === TILES.WALL && right === TILES.WALL)) return true;

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

        return up === TILES.WALL ||
               down === TILES.WALL ||
               left === TILES.WALL ||
               right === TILES.WALL;
    }

    isBoxAccessible(grid, boxPos, boxSet, targetSet) {
        // Check if a box position allows the player to access it from enough sides
        // to potentially push it toward any target.
        // boxSet and targetSet should be Sets for O(1) lookups.

        const x = boxPos % this.width;
        const y = Math.floor(boxPos / this.width);

        // Count how many sides are accessible (not wall, not other box)
        const up = (y - 1) * this.width + x;
        const down = (y + 1) * this.width + x;
        const left = y * this.width + (x - 1);
        const right = y * this.width + (x + 1);

        const upAccessible = grid[up] !== TILES.WALL && !boxSet.has(up);
        const downAccessible = grid[down] !== TILES.WALL && !boxSet.has(down);
        const leftAccessible = grid[left] !== TILES.WALL && !boxSet.has(left);
        const rightAccessible = grid[right] !== TILES.WALL && !boxSet.has(right);

        const accessibleSides = [upAccessible, downAccessible, leftAccessible, rightAccessible].filter(Boolean).length;

        // Need at least 2 accessible sides to maneuver
        // (Unless box is already on target)
        if (targetSet.has(boxPos)) return true;

        return accessibleSides >= 2;
    }

    canReachAroundBox(grid, boxPos, otherBoxSet) {
        // Check if the player can navigate from one pushable side of the box
        // to another via a walkable path (a "loop"), enabling the box to be pushed
        // from multiple directions even when adjacent to walls.
        // otherBoxSet should be a Set for O(1) lookups.

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
            if (grid[nPos] !== TILES.WALL && !otherBoxSet.has(nPos)) {
                pushSides.push({ pos: nPos, axis: dir.axis });
            }
        }

        if (pushSides.length < 2) return false;

        // Check if any two push sides on different axes are connected by a walkable path
        for (let i = 0; i < pushSides.length; i++) {
            for (let j = i + 1; j < pushSides.length; j++) {
                if (pushSides[i].axis === pushSides[j].axis) continue;
                if (this.bfsConnected(grid, pushSides[i].pos, pushSides[j].pos, boxPos, otherBoxSet)) {
                    return true;
                }
            }
        }

        return false;
    }

    bfsConnected(grid, from, to, excludeBox, excludeBoxSet) {
        // BFS to check if 'from' and 'to' are connected via walkable tiles,
        // excluding the box position itself and other boxes.
        // excludeBoxSet should be a Set for O(1) lookups.
        const queue = [from];
        const visited = new Set([from]);
        let head = 0;

        while (head < queue.length) {
            const current = queue[head++];
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
                if (grid[nPos] === TILES.WALL) continue;
                if (nPos === excludeBox) continue;
                if (excludeBoxSet.has(nPos)) continue;
                visited.add(nPos);
                queue.push(nPos);
            }
        }

        return false;
    }

    getPlayerReachable(grid, playerPos, boxSet) {
        // BFS flood-fill from player position.
        // Walls and boxes are impassable. Returns a Set of all
        // positions the player can walk to.
        // boxSet should be a Set for O(1) lookups.
        const reachable = new Set([playerPos]);
        const queue = [playerPos];
        let head = 0;

        const w = this.width;
        const h = this.height;

        while (head < queue.length) {
            const current = queue[head++];
            const cx = current % w;
            const cy = (current - cx) / w;

            // Inline the 4 neighbors to avoid array allocation + destructuring
            let nx, ny, nPos;

            nx = cx; ny = cy - 1;
            if (ny >= 0) {
                nPos = current - w;
                if (!reachable.has(nPos) && grid[nPos] !== 1 && !boxSet.has(nPos)) {
                    reachable.add(nPos); queue.push(nPos);
                }
            }
            nx = cx; ny = cy + 1;
            if (ny < h) {
                nPos = current + w;
                if (!reachable.has(nPos) && grid[nPos] !== 1 && !boxSet.has(nPos)) {
                    reachable.add(nPos); queue.push(nPos);
                }
            }
            nx = cx - 1;
            if (nx >= 0) {
                nPos = current - 1;
                if (!reachable.has(nPos) && grid[nPos] !== 1 && !boxSet.has(nPos)) {
                    reachable.add(nPos); queue.push(nPos);
                }
            }
            nx = cx + 1;
            if (nx < w) {
                nPos = current + 1;
                if (!reachable.has(nPos) && grid[nPos] !== 1 && !boxSet.has(nPos)) {
                    reachable.add(nPos); queue.push(nPos);
                }
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
        if (up === TILES.WALL || down === TILES.WALL) {
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
                    if (tile === TILES.WALL) return false;
                }
                return true;
            });

            if (!canReachTarget && (left === TILES.WALL || right === TILES.WALL)) {
                return true; // Deadlock: against wall with no horizontal path
            }
        }

        // Check if against a vertical wall (left or right)
        if (left === TILES.WALL || right === TILES.WALL) {
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
                    if (tile === TILES.WALL) return false;
                }
                return true;
            });

            if (!canReachTarget && (up === TILES.WALL || down === TILES.WALL)) {
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
                if ((tile === TILES.FLOOR || tile === TILES.TARGET) &&
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

        // Use a Set for O(1) box lookups (kept in sync with state.boxes array)
        const boxSet = new Set(state.boxes);
        const targetSet = new Set(targets);

        // Track solution path — all tiles involved in the puzzle solution.
        // Safe overlay tiles are FLOOR tiles NOT in this set.
        const solutionPath = new Set();
        solutionPath.add(playerPos);
        for (const box of boxes) solutionPath.add(box);
        for (const target of targets) solutionPath.add(target);

        const moves = [
            [0, -1],  // up
            [0, 1],   // down
            [-1, 0],  // left
            [1, 0]    // right
        ];

        let successfulMoves = 0;

        // Cache player reachability — only recompute after a successful pull
        let reachable = this.getPlayerReachable(state.grid, state.playerPos, boxSet);

        const maxSteps = this.complexity * 3;
        for (let step = 0; step < maxSteps && successfulMoves < this.complexity; step++) {
            // Pick random box
            const boxIdx = Math.floor(Math.random() * state.boxes.length);
            const boxPos = state.boxes[boxIdx];
            const boxX = boxPos % this.width;
            const boxY = Math.floor(boxPos / this.width);

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
                if (state.grid[newBoxPos] === TILES.WALL) continue;
                if (boxSet.has(newBoxPos)) continue;

                // playerDest must be empty floor (player steps there during pull)
                if (state.grid[playerDest] === TILES.WALL) continue;
                if (boxSet.has(playerDest)) continue;

                // Player must be able to walk to newBoxPos to initiate the pull
                if (!reachable.has(newBoxPos)) continue;

                // Check new box position isn't a deadlock
                if (this.isDeadlock(state.grid, newBoxPos, targets)) continue;

                // Quick filter: need at least 2 accessible sides
                if (!this.isBoxAccessible(state.grid, newBoxPos, boxSet, targetSet)) continue;

                // Loop check: only apply expensive BFS loop check when box is near a wall
                if (!targetSet.has(newBoxPos) && this.isAdjacentToWall(state.grid, newBoxX, newBoxY)) {
                    const otherBoxSet = new Set(boxSet);
                    otherBoxSet.delete(boxPos);
                    if (!this.canReachAroundBox(state.grid, newBoxPos, otherBoxSet)) continue;
                }

                // Valid pull! Update state and box Set
                boxSet.delete(boxPos);
                boxSet.add(newBoxPos);
                state.boxes[boxIdx] = newBoxPos;
                state.playerPos = playerDest;
                successfulMoves++;

                // Record solution path positions
                solutionPath.add(playerDest);
                solutionPath.add(newBoxPos);

                // Recompute reachability after state changed
                reachable = this.getPlayerReachable(state.grid, state.playerPos, boxSet);
                break;
            }
        }

        // Add the player's final reachable area to solution path
        // (player may need to walk through these tiles to reach push positions)
        const finalReachable = this.getPlayerReachable(state.grid, state.playerPos, boxSet);
        for (const pos of finalReachable) solutionPath.add(pos);

        console.log(`[SokobanGen] reversePlay: ${successfulMoves}/${this.complexity} moves achieved`);

        state.successfulMoves = successfulMoves;
        state.solutionPath = solutionPath;
        return state;
    }

    buildFinalGrid(grid, boxes, playerPos, targets, solutionPath = null) {
        const finalGrid = [];

        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === TILES.TARGET) {
                finalGrid.push(TILES.FLOOR);
            } else {
                finalGrid.push(grid[i]);
            }
        }

        // Place targets
        for (const target of targets) {
            finalGrid[target] = TILES.TARGET;
        }

        // Place boxes
        for (const box of boxes) {
            const isOnTarget = targets.includes(box);
            finalGrid[box] = isOnTarget ? TILES.BOX_ON_TARGET : TILES.BOX;
        }

        // Mark player tile (keep target visible if on target)
        const playerOnTarget = targets.includes(playerPos);
        if (playerOnTarget) {
            finalGrid[playerPos] = TILES.TARGET;
        } else {
            finalGrid[playerPos] = TILES.PLAYER;
        }

        return {
            width: this.width,
            height: this.height,
            grid: finalGrid,
            playerX: playerPos % this.width,
            playerY: Math.floor(playerPos / this.width),
            solutionPath: solutionPath || new Set()
        };
    }

    createSimpleFallback() {
        // Generate a minimal playable level at the requested dimensions
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 ||
                    y === 0 || y === this.height - 1) {
                    grid.push(TILES.WALL);
                } else {
                    grid.push(TILES.FLOOR);
                }
            }
        }

        // Place 1 box and 1 target spread apart, with player nearby
        const midX = Math.floor(this.width / 2);
        const midY = Math.floor(this.height / 2);
        const targetIdx = midY * this.width + (midX + 2);
        const boxIdx = midY * this.width + (midX - 1);
        const playerX = Math.max(1, midX - 2);
        const playerY = Math.min(this.height - 2, midY + 1);
        const playerIdx = playerY * this.width + playerX;

        grid[targetIdx] = TILES.TARGET;
        grid[boxIdx] = TILES.BOX;
        grid[playerIdx] = TILES.PLAYER;

        // Fallback levels: mark all non-wall tiles as solution path (no decoration)
        const solutionPath = new Set();
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] !== TILES.WALL) solutionPath.add(i);
        }

        return {
            width: this.width,
            height: this.height,
            grid: grid,
            playerX: playerX,
            playerY: playerY,
            solutionPath
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

