# Machina Ludens - Development Roadmap

## Current Status
✅ Minimal playable Sokoban prototype (web-based, mobile-friendly)
✅ 5 hand-crafted levels
✅ Touch controls and swipe gestures

## Vision
AI bots that evolve cultural preferences for puzzle design through genetic algorithms, creating a co-evolutionary loop between player and AI population.

---

## Phase 0: Foundation (Current - Week 1)
**Goal:** Get basic procedural generation working

### Milestone 0.1: Level Representation ✅
- [x] Grid-based level format
- [x] Tile types (wall, floor, box, target, player)
- [x] Win condition detection

### Milestone 0.2: Procedural Level Generation (NEXT)
- [ ] Simple random level generator
- [ ] Solvability verification (reverse-play algorithm)
- [ ] Parameter controls (grid size, box count, wall density)
- [ ] Generate button in UI to test variations

**Success Criteria:** Can generate 10+ solvable levels on demand with varying difficulty

### Milestone 0.3: Level Quality Metrics
- [ ] Calculate solution length (min moves)
- [ ] Measure puzzle complexity (branching factor, dead ends)
- [ ] Difficulty estimation heuristic
- [ ] Display metrics in UI for generated levels

---

## Phase 1: Genetic Algorithm (Week 2-3)
**Goal:** Evolve level parameters without AI "bots" yet

### Milestone 1.1: Genome Definition
- [ ] Define genome parameters (grid size, box count, wall density, corridor width, etc.)
- [ ] Crossover function (combine two genomes)
- [ ] Mutation function (random parameter tweaks)

### Milestone 1.2: Manual Selection Loop
- [ ] Generate 5 levels from different genomes
- [ ] Player rates each level (thumbs up/down or 1-5 stars)
- [ ] Breed new generation from top-rated levels
- [ ] Visualize genome parameters for each level

### Milestone 1.3: Cultural Divergence Test
- [ ] Run 20+ generations with different selection strategies
- [ ] Track genome evolution over time
- [ ] Can outside observer distinguish "cultures"?

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

**This Week:**
1. Build simple procedural level generator (Milestone 0.2)
2. Implement reverse-play solvability check
3. Add "Generate" button to test variations

**Success Metric:** Can generate 10 different solvable Sokoban levels with varying parameters

**After That:**
- Add quality metrics (solution length, complexity)
- Start Phase 1: Define genome and implement breeding

---

*Last Updated: 2026-02-13*
