# Machina Ludens - Development Roadmap

## Current Status
✅ Minimal playable Sokoban prototype (web-based, mobile-friendly)
✅ Touch controls and swipe gestures (D-pad + swipe)
✅ Procedural level generation with reverse-play algorithm
✅ Genome-based evolution system with crossover and mutation
✅ Inline rating system with 5-star reviews
✅ Population breeding based on player ratings
✅ Auto-generated levels on page load
✅ Larger, more complex boards with internal obstacles

**Current Phase:** Phase 1 - Genetic Algorithm (ready for cultural divergence testing)

## Vision
AI bots that evolve cultural preferences for puzzle design through genetic algorithms, creating a co-evolutionary loop between player and AI population.

---

## Phase 0: Foundation ✅ COMPLETE
**Goal:** Get basic procedural generation working

### Milestone 0.1: Level Representation ✅
- [x] Grid-based level format
- [x] Tile types (wall, floor, box, target, player)
- [x] Win condition detection

### Milestone 0.2: Procedural Level Generation ✅
- [x] Procedural level generator using reverse-play algorithm (Taylor & Parberry 2011)
- [x] Solvability verification (reverse moves guarantee solvability)
- [x] Parameter controls (grid size 9-14, box count 3-6, complexity 30-60 moves, wall density 5-25%)
- [x] Generate button in UI to test variations
- [x] Validation: corner deadlock, freeze deadlock, wall-adjacency, accessibility checks
- [x] Structured obstacle patterns (singles, horizontal/vertical pairs, L-shapes)
- [x] Boxes never start on targets (fully unsolved puzzles)

**Success Criteria:** ✅ Can generate unlimited solvable levels with varying difficulty

### Milestone 0.3: Level Quality Metrics
- [ ] Calculate solution length (min moves)
- [ ] Measure puzzle complexity (branching factor, dead ends)
- [ ] Difficulty estimation heuristic
- [ ] Display metrics in UI for generated levels

**Status:** Deferred - not blocking for Phase 1 evolution testing

---

## Phase 1: Genetic Algorithm (CURRENT)
**Goal:** Evolve level parameters without AI "bots" yet

### Milestone 1.1: Genome Definition ✅
- [x] Define genome parameters (gridSize: 9-14, boxCount: 3-6, complexity: 30-60, wallDensity: 0.05-0.25)
- [x] Crossover function (randomly pick genes from either parent)
- [x] Mutation function (±1 for sizes, ±5 for complexity, ±0.02 for density, 20% mutation rate)
- [x] Genome serialization (toJSON/fromJSON)

### Milestone 1.2: Manual Selection Loop ✅
- [x] Generate levels from population genomes
- [x] Player rates each level with 5-star system
- [x] Breed new generation from top-rated levels (top 50% selection + elitism)
- [x] Inline rating UI integrated into gameplay
- [x] Generation counter tracks evolution progress
- [x] Streamlined workflow: Generate → Play → Rate → Breed (when 3+ rated)

### Milestone 1.3: Cultural Divergence Test (NEXT)
- [ ] Run 20+ generations with different selection strategies
- [ ] Track genome evolution over time (population stats already available)
- [ ] Can outside observer distinguish "cultures"?
- [ ] Document evolved preferences (e.g., "prefers large sparse boards" vs "small dense mazes")

**Success Criteria:** Different selection preferences produce noticeably different level styles

---

## Phase 2: Bot Population (Week 4-5)
**Goal:** Add the "bots" layer - agents that explore and curate

### Milestone 2.1: Bot Identity
- [ ] Visual bot representation (procedurally generated from genome)
- [ ] Bot carries genome parameters
- [ ] Display bot "family tree"
- [ ] Name/ID system for bots

### Milestone 2.2: Bot Curation Simulation
- [ ] Bots "explore" puzzle space (generate variations based on genome)
- [ ] Bots evaluate puzzles (heuristic scoring based on preferences)
- [ ] Bots present top picks to player
- [ ] Player selects which bots reproduce

### Milestone 2.3: Core Game Loop
- [ ] Release phase: bots generate puzzles
- [ ] Curate phase: player plays bot selections
- [ ] Evaluate phase: player rates experiences
- [ ] Breed phase: successful bots reproduce
- [ ] Observe phase: view population stats

**Success Criteria:** Full breeding loop feels like "tending a garden" of bot cultures

---

## Phase 3: Mechanic Mutations (Week 6-7)
**Goal:** Expand beyond classic Sokoban to rule variations

### Milestone 3.1: Grammar Expansion
- [ ] Add 2-3 special tiles (ice, teleporter, one-way)
- [ ] Genome includes mechanic preferences (boolean flags)
- [ ] Solvability verification for new mechanics
- [ ] Rendering for new tile types

### Milestone 3.2: Rule Mutations
- [ ] Gravity variations (none, down, pull)
- [ ] Win condition variations (targets, exit, pattern)
- [ ] Object interaction rules (merge, chain-react)

### Milestone 3.3: Genre Emergence
- [ ] Track which mechanic combinations emerge in evolved populations
- [ ] Detect "genre clusters" (bots that prefer similar rule sets)
- [ ] Display genre labels ("ice puzzlers", "teleport chaos", etc.)

**Success Criteria:** Evolved populations develop coherent mechanic preferences that feel like distinct genres

---

## Phase 4: Polish & UX (Week 8)
**Goal:** Make it feel like a real game

### Milestone 4.1: Emotional Hooks
- [ ] Bot attachment mechanics (favorites, naming)
- [ ] Lineage storytelling ("descendants of Bot #7")
- [ ] Surprise moments (new mechanic combos)
- [ ] Stakes (lineages can end)

### Milestone 4.2: Visual Polish
- [ ] Better bot creature design
- [ ] Smooth animations for moves/transitions
- [ ] Particle effects for wins
- [ ] Sound effects (optional)

### Milestone 4.3: Session Structure
- [ ] Target session length: 15-30 minutes
- [ ] Visible cultural evolution within 3-5 sessions
- [ ] Progress persistence (save populations)

---

## Phase 5: Social/Multiplayer (Future)
**Goal:** Cultural contact between players

- [ ] Bot sharing/trading
- [ ] Cross-breeding cultures
- [ ] Exhibition gallery
- [ ] Meta-competition

---

## Open Technical Questions

### High Priority (Blockers for Phase 1)
1. **Solvability verification:** How do we verify non-standard mechanics? Per-mechanic solvers? Brute-force search with depth limits?
2. **Generation speed:** How many puzzles can we generate/validate per second? Need performance targets.
3. **Genome-to-generation mapping:** Exact formula for how genome parameters produce levels.

### Medium Priority (Needed for Phase 2)
4. **Bot "play" sophistication:** Do bots actually solve puzzles, or just heuristically evaluate them?
5. **Population size:** How many bots can player meaningfully track? 10? 20? 50?
6. **Convergence vs diversity:** How do we prevent monoculture while still allowing evolution?

### Low Priority (Nice to have)
7. **Platform expansion:** Mobile app? Desktop? Stay web-only?
8. **Mechanic grammar formalism:** Can we define a formal grammar for valid mechanic combinations?

---

## Next Immediate Steps

**Current Focus (Milestone 1.3):**
1. Run cultural divergence experiments
   - Generate 20+ generations with consistent rating strategy
   - Try different strategies (prefer large boards, prefer small dense, prefer simple, etc.)
   - Track how population averages shift over generations
   - Document observable "cultures" that emerge

2. Optional quality improvements:
   - Add solution length calculation (could inform ratings)
   - Display genome parameters during gameplay
   - Save/load population states for long-term evolution
   - Generation history visualization

**Success Metric:** Can demonstrate 3+ distinct evolved "cultures" with different level characteristics

**After Phase 1:**
- Phase 2: Add bot layer (visual representations, curation simulation)
- Phase 3: Introduce mechanic mutations (special tiles, rule variations)

---

## Implementation Notes

### Current Architecture
- `generator.js`: SokobanGenerator class with reverse-play algorithm
- `genome.js`: Genome and Population classes for evolution
- `index.html`: Single-file web app with game logic and inline rating UI
- Population size: 5 genomes per generation
- Selection: Top 50% become parents, best genome preserved (elitism)
- Mutation rate: 20% per gene

### Key Design Decisions
1. **Reverse-play generation**: Start with solved state, pull boxes away from targets
2. **Validation layers**: Multiple checks prevent unsolvable/deadlocked levels
3. **Inline rating**: Streamlined UX keeps player in flow state
4. **No pre-solved boxes**: All levels start fully unsolved for consistent difficulty
5. **Structured obstacles**: Small wall clusters create interesting navigation challenges

### Known Limitations
- Square grids only (width = height)
- No solution length metric yet
- No genome parameter visualization during play
- No population save/load

---

*Last Updated: 2026-02-13*
