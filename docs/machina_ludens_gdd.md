# MACHINA LUDENS
### *The Playing Machine*

**Game Design Document — DRAFT**
February 2026

---

> *"Play is older than culture, for culture, however inadequately defined, always presupposes human society, and animals have not waited for man to teach them their playing."*
> — Johan Huizinga, *Homo Ludens* (1938)

---

## 1. Concept Overview

### 1.1 Elevator Pitch

Machina Ludens is a game about breeding AI creatures that learn what games you love and evolve new ones for you. Over many generations, your bots develop cultural taste — arbitrary, heritable preferences that shape what gets created next. The result is a co-evolutionary loop where the player and the AI population are jointly discovering play experiences neither could have produced alone.

### 1.2 Theoretical Foundation

The title references Johan Huizinga's *Homo Ludens* (1938), which argues that play is the foundation of culture itself. Huizinga's core thesis: culture doesn't produce play; play produces culture. Rituals, contests, art, and language all originate as forms of play that became formalized over time.

Machina Ludens asks: if play produces culture in humans, can it do the same in machines? The game is both an entertainment product and a living demonstration of this thesis. The bots' entire existence is play. They develop preferences (taste), those preferences propagate and mutate across generations (cultural transmission), and the resulting creative output grows in complexity over time (cultural evolution). The Huizinga framework is embedded in the structure but does not need to be understood to enjoy the experience.

### 1.3 Core Design Pillars

- **Emergent culture through play:** Bots develop heritable taste that constitutes a genuine micro-culture, shaped by the selective pressure of the player's preferences.
- **Co-evolution:** The player shapes the bot population, but the bots also reshape the player's sense of what they enjoy, surfacing experiences they wouldn't have sought out.
- **Legible complexity:** The system should be immediately approachable (breed cute creatures, play short puzzles) while supporting deep emergent behavior for players who look closely.
- **Surprise over optimization:** Bots are not a recommendation algorithm. They are a creative culture that explores adjacent possibilities, always pushing slightly beyond what the player has already approved.

### 1.4 Target Audience

Players who enjoy creature-breeding games (Creatures, Niche), procedural generation (Spelunky, Dwarf Fortress), puzzle games (Baba Is You, Patrick's Parabox), and the intersection of games and systems thinking. Secondary audience: people interested in AI, emergence, and digital culture as concepts.

### 1.5 Platform

`[TO BE DETERMINED]` — Desktop-first (PC/Mac) is assumed for PoC. Mobile could work for the core loop.

---

## 2. Core Game Loop

### 2.1 Loop Summary

The player tends a population of bots. Bots autonomously play and curate puzzle variants. The player evaluates what the bots found. Bots that surfaced enjoyable experiences reproduce. Over generations, the population evolves increasingly refined and surprising taste.

**Phase 1: Release**
The player sends their bot population into the puzzle space. Bots play autonomously, exploring variations based on their genome. They gravitate toward puzzles that match their encoded preferences, and they remix and mutate puzzles they find interesting.

**Phase 2: Curate**
Bots return with a curated selection of puzzle variants. The player is presented with a shortlist (perhaps 3–5 per generation cycle). Each puzzle is immediately playable — no tutorial, no onboarding, just drop in.

**Phase 3: Evaluate**
The player tries each puzzle and gives feedback. This could be as simple as thumbs up/down, or could incorporate implicit signals like play time, retry count, and completion. The evaluation should feel lightweight and natural, not like filling out a form.

**Phase 4: Breed**
The player selects which bots reproduce. Bots that surfaced enjoyable puzzles get to cross their genomes and produce offspring. Bots that missed the mark fade from the population. The player can also manually pair bots for deliberate crossbreeding.

**Phase 5: Observe**
Between cycles, the player can inspect their population: view family trees, notice lineage tendencies ("the descendants of Bot #7 keep finding amazing rhythm-puzzle hybrids"), name favorite bots, and track how the culture is evolving. This phase is optional but adds depth and emotional attachment.

### 2.2 Session Structure

`[TO BE DETERMINED]` — How many generations per session? How long is a generation cycle? Target: a satisfying session in 15–30 minutes, with visible cultural evolution within 3–5 sessions.

### 2.3 Progression

Early generations produce simple puzzle variants — small grids, few mechanics, obvious solutions. As the bot culture matures and genomes become more complex through accumulated crossover and mutation, the puzzles grow in sophistication. The player should literally see complexity emerging over time, not because it was scripted, but because the evolutionary process naturally builds on what came before.

---

## 3. Starting Game Type: Sokoban

### 3.1 Why Sokoban

The proof of concept uses Sokoban (box-pushing puzzles) as the base game type. Sokoban was selected for the following reasons:

- **Massive existing corpus:** Thousands of hand-designed levels are publicly available. The genre has been studied extensively in procedural content generation research.
- **Simple core, deep design space:** Every level is just a grid with walls, boxes, targets, and a player. But the difference between an elegant puzzle and a tedious one is profound and hard to articulate — exactly the kind of judgment bots should evolve.
- **Fast evaluation loop:** A player can attempt a Sokoban variant and give feedback in under a minute. Tight loops mean more generations per session.
- **Solvability is verifiable:** Existing solvers can confirm that generated levels are actually solvable, which is critical for player experience.
- **Natural complexity scaling:** The genre ranges from trivial 5×5 puzzles to mind-bending creations with dozens of mechanics (see: Baba Is You, Patrick's Parabox, Stephen's Sausage Roll).
- **Mechanic mutations drive the real innovation:** The most successful modern Sokoban games succeed not through clever room layouts but through radical rule changes. This means the genome should encode rule preferences, not just spatial parameters.

### 3.2 Reference Games

The following games define the poles of the Sokoban design space and should be studied as reference:

- **Classic Sokoban (1982):** The original. Push boxes onto targets. Pure spatial reasoning.
- **Baba Is You:** Rules are pushable objects. The game's logic is mutable. #1 rated Sokoban game on Steam.
- **Patrick's Parabox:** Recursive Sokoban — boxes contain other levels. Shows how a single mechanic twist creates an entirely new puzzle universe.
- **Stephen's Sausage Roll:** 3D Sokoban with rolling sausages. Hugely influential; spawned "Sausage-likes" as a subgenre.
- **gym-sokoban (GitHub):** OpenAI Gym Sokoban environment with procedural room generation and guaranteed solvability via reverse-play. Technical foundation to build on.

### 3.3 The Puzzle Grammar

Puzzles are generated from a compositional grammar of game elements. A puzzle is a specific combination drawn from these categories:

**Verbs (player actions):**
Push, pull, slide, rotate, swap, teleport, clone, transform, activate

**Nouns (objects):**
Boxes, walls, targets, keys, doors, holes, bridges, mirrors, switches

**Modifiers (physics/rules):**
Gravity (none/down/variable), ice (sliding), conveyor belts, one-way gates, crumbling floors, magnetic fields, wrapping edges

**Win conditions:**
All boxes on targets, reach exit, achieve pattern, clear all objects, survive N turns, match colors

`[TO BE DETERMINED]` — The exact grammar needs to be formally specified. Start minimal (classic Sokoban + 2–3 modifiers) and expand as the system matures.

---

## 4. The Bot Genome

### 4.1 Overview

Each bot carries a genome — a set of parameters that encode its preferences, play style, and creative tendencies. The genome determines which puzzles a bot gravitates toward, how it remixes them, and what it presents to the player. Genomes cross over during breeding and mutate at controlled rates.

### 4.2 Genome Layers

#### Layer 1: Base Mechanics Preferences

Continuous parameters encoding the bot's preference for fundamental puzzle properties:

| Parameter | Description |
|-----------|-------------|
| Grid type | Preference for square, hexagonal, or triangular grids |
| Push/pull rules | Push only, push and pull, directional constraints |
| Object physics | Stop on contact, slide until wall, bounce, wrap edges |
| Gravity model | None, downward, toward center, variable per zone |
| Object diversity | Single type vs. multiple object types with different behaviors |

#### Layer 2: Rule Mutation Preferences

Boolean and continuous parameters controlling which special mechanics the bot tends to introduce:

| Parameter | Description |
|-----------|-------------|
| Special tiles | Ice, conveyor, teleporter, one-way, crumbling, switches |
| Object interactions | Merge, chain-react, block, color-match |
| Player modification | Transform, leave trail, limited moves, size change |
| Win condition | Targets, exit, pattern, survival, color matching |

#### Layer 3: Aesthetic Preferences

| Parameter | Description |
|-----------|-------------|
| Visual theme | Abstract, organic, mechanical, cute, minimal |
| Spatial density | Tight corridors vs. open fields |
| Complexity curve | Ramps up, consistent, front-loaded difficulty |
| Level size | Micro (5×5), medium (8×8), large (12×12+) |

#### Layer 4: Compositional Tendencies

These are the "creativity" genes — they control how the bot combines and explores:

| Parameter | Description |
|-----------|-------------|
| Combination tendency | How aggressively the bot mixes mechanics from different rule families |
| Novelty seeking | How far from proven combinations the bot explores |
| Elegance preference | Few mechanics used deeply vs. many mechanics used lightly |
| Surprise quotient | Tendency to include mechanics not obvious from the starting state |

#### Layer 5: Social Genes

Parameters controlling how much a bot is influenced by other bots in the population:

- **Conformity:** High-conformity bots gravitate toward what popular bots prefer. High-independence bots explore the fringes.
- **Influence radius:** How many other bots this bot "observes" when calibrating its own preferences.

Social genes create natural diversity pressure, preventing the population from collapsing into a monoculture. You get mainstream tastes and avant-garde tastes coexisting.

### 4.3 Crossover and Mutation

When two bots breed, their genomes cross over at the layer level — offspring might inherit Bot A's base mechanics preferences with Bot B's rule mutations and a blend of their aesthetics. Mutation introduces small random changes: a new special tile type gets enabled, gravity shifts, win conditions change. Mutation rate should be tunable by the player (a "stability vs. exploration" slider).

`[TO BE DETERMINED]` — Exact crossover mechanics, mutation rates, and how genome parameters map to puzzle generation. This is the core technical challenge.

### 4.4 Solvability Constraint

Every generated puzzle must be validated as solvable before being presented to the player. For standard Sokoban, the gym-sokoban approach (generate forward from a solved state using reverse play) handles this. For mechanic mutations, a more general solver or simulation-based verification step is needed. Unsolvable puzzles are discarded silently — the player never sees them.

`[TO BE DETERMINED]` — Generalized solvability verification for non-standard mechanics is an open technical problem. May need per-mechanic solvers or brute-force search with depth limits.

---

## 5. Player Experience

### 5.1 Interface Metaphor

The interface should feel like tending a garden or running a kennel. Bots are visualized as small creatures with visual traits that reflect their genome. The player can see at a glance which bots prefer tight corridors vs. open spaces, which favor simplicity vs. complexity, which are mainstream vs. experimental.

`[TO BE DETERMINED]` — Visual design of bots. How do genome parameters map to creature appearance? Consider procedural creature generation tied to genome values.

### 5.2 Feedback Mechanisms

Player evaluation of puzzles should be multi-signal but low-friction:

- **Explicit:** Thumbs up/down, or a simple star rating after completing a puzzle.
- **Implicit:** Play time, number of retries, whether the player completed the puzzle or quit, how long they paused before each move (engagement proxy).
- **Comparative:** Occasionally present two puzzles side by side and ask the player which they preferred.

### 5.3 Emotional Hooks

The game needs to create emotional investment beyond puzzle-solving:

- **Lineage attachment:** Players develop favorites among bot families. "The descendants of Bot #7 always find incredible stuff."
- **Surprise and discovery:** The moment a bot surfaces a puzzle type the player has never seen before and it's delightful.
- **Cultural identity:** Over time, your bot population develops a recognizable aesthetic — your culture, co-created with your bots, distinct from anyone else's.
- **Loss and stakes:** Bots that don't reproduce are gone. Lineages can end. This gives breeding decisions weight.

### 5.4 Multiplayer / Social

The strongest expression of the Machina Ludens thesis is cultural contact between different bot populations:

- **Share bots:** Players can trade or gift bots from their population to others.
- **Cross-breed cultures:** Introduce bots from another player's population into yours. Your action-puzzle bots meet their contemplative-puzzle bots. What emerges?
- **Exhibition space:** A shared gallery where players can showcase their most evolved bots or the best puzzles their culture has produced.
- **Meta-competition:** Whose bot culture produces the most interesting play experiences? A competition about play about play.

`[TO BE DETERMINED]` — Multiplayer is post-PoC. Define the sharing protocol, how cross-breeding works technically, and how to prevent degenerate strategies.

---

## 6. Technical Architecture

### 6.1 Core Systems

**Puzzle Generation Engine**
A procedural system that takes a genome and produces a playable puzzle. Must support the full grammar of mechanics, validate solvability, and run fast enough to generate many puzzles per generation cycle.

`[TO BE DETERMINED]` — Architecture, language, performance targets.

**Genetic Algorithm Engine**
Manages the bot population: genome representation, crossover, mutation, selection, population dynamics. Straightforward genetic algorithm with player-driven fitness selection.

**Bot Simulation**
Bots need to "play" puzzles autonomously to develop preferences. This could be a lightweight solver/heuristic that evaluates puzzle properties without fully solving them, or a simple RL agent that plays and reports engagement metrics.

`[TO BE DETERMINED]` — How sophisticated does bot "play" need to be? Can we approximate it with heuristic evaluation, or do bots need to actually solve puzzles?

**Player-Facing Puzzle Runtime**
A renderer and input handler that lets the player actually play the generated puzzles. Must support all mechanics in the grammar and feel responsive and polished.

### 6.2 Technology Stack

`[TO BE DETERMINED]` — Candidates: Python (PyGame/Arcade) for rapid prototyping, Godot for a more polished product, web-based (React + Canvas) for accessibility. The genetic algorithm and puzzle generation could run server-side or locally.

### 6.3 Data and Persistence

The game needs to persist bot populations, family trees, puzzle history, and player preference data across sessions. Local save files for single-player; server-backed for multiplayer features.

---

## 7. Research Foundations

### 7.1 Theoretical Lineage

- **Johan Huizinga, *Homo Ludens* (1938):** Play as the foundation of culture. The magic circle. The agonistic principle.
- **Epstein & Axtell, *Growing Artificial Societies* (1996):** The Sugarscape model demonstrated that group formation, cultural transmission, and trade emerge from simple agent rules. Extended by Flentge et al. (2001) for norm formation through cultural diffusion.
- **OpenAI, Emergent Tool Use (2019):** Hide-and-seek agents developed six distinct strategies and counterstrategies through pure competitive play, with no direct incentives to interact with objects.
- **Baronchelli et al., *Science Advances* (2025):** LLM agent populations spontaneously develop shared social conventions, exhibit collective biases not traceable to individuals, and show tipping-point dynamics.
- **Lazaridou & Baroni (2020):** Survey of emergent communication in multi-agent systems. Agents develop proto-languages through interaction without predefined semantics.

### 7.2 Procedural Content Generation

- **gym-sokoban:** OpenAI Gym Sokoban environment with reverse-play solvability verification.
- **ANGELINA (Mike Cook):** Automated game design system that creates games from scratch.
- **Game-O-Matic (Georgia Tech):** Procedural game generation from conceptual relationships.
- **YASGen:** Genetic algorithm for generating difficult Sokoban puzzles.

### 7.3 Related Games

- **Creatures (1996):** Pioneered digital creature breeding with genetic algorithms and neural networks.
- **Niche (2017):** Genetics-based survival game with population management.
- **Baba Is You (2019):** Demonstrated that Sokoban mechanics can be radically mutated to create entirely new puzzle experiences.

---

## 8. Open Questions

The following questions need to be resolved before or during development. They are listed roughly in order of priority.

### 8.1 Core Design

- How does the genome map to puzzle generation concretely? This is the central technical and design challenge.
- How sophisticated does bot "play" need to be? Can bots evaluate puzzles heuristically, or must they actually solve them?
- What is the minimum viable grammar? How few mechanics can we start with and still produce interesting variation?
- How do we balance convergence and diversity in the population? Too much convergence = recommendation algorithm. Too much diversity = noise.
- What makes a generated puzzle feel "designed" rather than "random"? This is partly an aesthetic question and partly a technical one about generation constraints.

### 8.2 Player Experience

- Is the core loop fun? This is the existential question. Breed bots, play puzzles, repeat — does it hold up session after session?
- How many generations before interesting culture emerges? If it takes 50 generations and each takes 10 minutes, that's too slow.
- How do we communicate what a bot "likes" to the player without exposing raw parameters?
- What is the right feedback granularity? Too simple (thumbs up/down) might not give enough signal. Too complex might feel like work.

### 8.3 Technical

- Generalized solvability verification for non-standard Sokoban mechanics.
- Performance: how many puzzles can we generate and validate per second?
- How large can the population be before the genetic algorithm becomes unwieldy or the player can't meaningfully evaluate?
- Puzzle rendering for arbitrary mechanic combinations — how do we ensure every valid genome produces a visually coherent puzzle?

### 8.4 Scope

- Is Sokoban the right starting genre, or should we prototype with something simpler first?
- When and how do we expand the grammar beyond the initial mechanic set?
- At what point does this become a platform rather than a game? (Is that desirable?)

---

## 9. Development Roadmap

### Phase 0: Feasibility Spike

**Goal:** Prove that evolutionary selection on Sokoban variants produces interesting divergence.

- Implement classic Sokoban level generation with solvability verification (build on gym-sokoban).
- Define a minimal genome (grid size, box count, wall density, corridor width, solution length preference).
- Implement basic GA: crossover, mutation, player-driven selection.
- Run 20+ generations manually. Do different selection strategies produce noticeably different level "cultures"?

**Success criterion:** An outside observer can distinguish levels from two separately evolved populations.

### Phase 1: Mechanic Mutations

**Goal:** Expand the genome beyond layout to include rule variations.

- Add 2–3 mechanic modifiers to the grammar (e.g., ice tiles, one-way doors, colored box-target matching).
- Extend solvability verification to handle new mechanics.
- Bots now evolve preferences across both layout and rules.

**Success criterion:** Evolved populations produce puzzles that feel like coherent "genres" — not just random combinations of mechanics.

### Phase 2: Bot Identity and Player Experience

**Goal:** Build the creature-breeding layer and make the experience feel like a game.

- Visual bot design tied to genome.
- Family tree visualization.
- Polished puzzle player with feedback mechanisms.
- Session structure and pacing.

**Success criterion:** Playtesters report emotional attachment to bot lineages and surprise at evolved puzzle designs.

### Phase 3: Social and Multiplayer

**Goal:** Enable cultural contact between populations.

- Bot sharing and cross-breeding.
- Exhibition/gallery space.
- Meta-competition framing.

**Success criterion:** Cross-bred populations produce novel puzzle styles that neither parent culture would have generated alone.

`[TIMELINE: TO BE DETERMINED]`

---

## 10. Appendix

### A. Key References

- Huizinga, J. (1938). *Homo Ludens: A Study of the Play-Element in Culture.*
- Epstein, J.M. & Axtell, R.L. (1996). *Growing Artificial Societies: Social Science from the Bottom Up.* MIT Press.
- Baker, B. et al. (2019). Emergent Tool Use from Multi-Agent Autocurricula. OpenAI. Published at ICLR 2020.
- Baronchelli, A. et al. (2025). Emergent Social Conventions and Collective Bias in LLM Populations. *Science Advances.*
- Lazaridou, A. & Baroni, M. (2020). Emergent Multi-Agent Communication in the Deep Learning Era. arXiv:2006.02419.
- Schrader, M.P. (2018). gym-sokoban: Sokoban environment for OpenAI Gym. GitHub.

### B. Glossary

- **Agonistic principle:** Huizinga's concept that competition/contest is one of the fundamental forms of play and a driver of cultural development.
- **Autocurriculum:** A training regime where competing agents create progressively harder challenges for each other without external curriculum design.
- **Genome:** The set of heritable parameters that define a bot's preferences and creative tendencies.
- **Magic circle:** Huizinga's concept of the temporary, bounded space in which play occurs, with its own rules distinct from ordinary life.
- **Puzzle grammar:** The formal system of composable elements (verbs, nouns, modifiers, win conditions) from which puzzles are generated.

### C. Document Status

This is an incomplete working document. Sections marked `[TO BE DETERMINED]` require further design work, prototyping, or technical investigation. The document is intended to be iterated on in Claude Code or similar tools.

*Last updated: February 2026*
