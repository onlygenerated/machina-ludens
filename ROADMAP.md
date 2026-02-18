# Machina Ludens - Development Roadmap

## Current Status
✅ Minimal playable Sokoban prototype (web-based, mobile-friendly)
✅ Touch controls and swipe gestures (D-pad + swipe)
✅ Procedural level generation with reverse-play algorithm (4 style algorithms)
✅ Genome-based evolution system with crossover and mutation
✅ Auto-generated levels on page load
✅ Larger, more complex boards with internal obstacles
✅ Cultural divergence validated (Phase 1.3 complete)
✅ Visual bot representations with procedural personalities (Phase 2.1)
✅ Bot curation system (Phase 2.2)
✅ Evolvable visual genes (palette, tileStyle, decoration)
✅ Consistent game piece rendering across phenotypes (fixed colors independent of genome)
✅ Tournament-based selection: Choose → Breed → Observe (Phase 2.4)

**Current Phase:** Phase 2 - Bot Population (2.1, 2.2, 2.3, 2.4 complete)

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

## Phase 1: Genetic Algorithm ✅ COMPLETE
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

### Milestone 1.3: Cultural Divergence Test ✅
- [x] Run 20+ generations with different selection strategies
- [x] Track genome evolution over time (population stats already available)
- [x] Can outside observer distinguish "cultures"?
- [x] Document evolved preferences (e.g., "prefers large sparse boards" vs "small dense mazes")

**Success Criteria:** ✅ Different selection preferences produce noticeably different level styles

---

## Phase 2: Bot Population (IN PROGRESS)
**Goal:** Add the "bots" layer - agents that explore and curate

### Milestone 2.1: Bot Identity ✅
- [x] Visual bot representation (procedurally generated from genome)
- [x] Bot carries genome parameters
- [ ] Display bot "family tree"
- [x] Name/ID system for bots

### Milestone 2.2: Bot Curation Simulation ✅
- [x] Bots "explore" puzzle space (generate variations based on genome)
- [x] Bots evaluate puzzles (heuristic scoring based on preferences)
- [x] Bots present top picks to player
- [x] Player selects which bots reproduce

### Milestone 2.3: Core Game Loop ✅ (replaced by 2.4)
- [x] Release phase: bot presents puzzle with sprite, name, and personality overlay
- [x] Play phase: player solves puzzle with input guards (only active during Play)
- [x] Rate phase: player rates experience with 5-star system after win or Give Up
- [x] Breed phase: successful bots reproduce (transient, triggers evolution)
- [x] Observe phase: parent lineage view (champion, offspring with parents, retired bots)
- [x] Phase bar UI with active/completed step indicators
- [x] Full loop: Release → Play → Rate → (Next Puzzle or Breed) → Observe → Release

### Milestone 2.4: Tournament Selection System ✅
- [x] Tournament-based "pick best of 3" replacing star ratings
- [x] 5 rounds per generation, 3 candidates per round (population genomes only, each appears 3x)
- [x] Comparison view: 3 side-by-side preview cards with bot names and traits
- [x] Play view: expand any level to full-size with Back/Undo/Reset/Choose controls
- [x] Winner breeding: top 3 by wins survive → champion elite + 3 crossover offspring + 1 wild card
- [x] `Population.evolveFromWinners()` method for tournament-based breeding
- [x] Extracted `renderGrid()` for reuse at both preview (180px) and play (600px) scales
- [x] Simplified phase bar: Choose → Breed → Observe (3 phases, down from 5)

**Success Criteria:** ✅ Full breeding loop feels like "tending a garden" of bot cultures

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

**Phase 2 complete (including tournament selection).** Next steps:
- Phase 2 polish: Improve family tree visual (layout, readability, interaction)
- Phase 3: Introduce mechanic mutations (special tiles, rule variations)
- Phase 4: Polish & UX (animations, sound, session structure)

---

## Implementation Notes

### Current Architecture
- `shared/generator.js`: SokobanGenerator class with reverse-play algorithm
- `shared/genome.js`: Genome, Population, and Bot classes for evolution
- `client/game.js`: Game class with tournament loop, canvas rendering, input handling
- `client/main.js`: Entry point, creates Game instance
- `index.html`: HTML/CSS structure with comparison, play, and observe views
- Population size: 5 genomes per generation
- Selection: Tournament (pick best of 3, 5 rounds, population-only pool) → top 3 survive → champion elite + 3 offspring from top 3 + 1 wild card
- Mutation rate: 20% per gene

### Key Design Decisions
1. **Reverse-play generation**: Start with solved state, pull boxes away from targets
2. **Validation layers**: Multiple checks prevent unsolvable/deadlocked levels
3. **Tournament selection**: Comparative judgment (pick best of 3) replaces absolute rating (5 stars)
4. **No pre-solved boxes**: All levels start fully unsolved for consistent difficulty
5. **Structured obstacles**: Small wall clusters create interesting navigation challenges
6. **Wild card injection**: 1 fresh random genome per generation prevents monoculture

### Known Limitations
- Square grids only (width = height)
- No solution length metric yet
- No genome parameter visualization during play

---

*Last Updated: 2026-02-18*
