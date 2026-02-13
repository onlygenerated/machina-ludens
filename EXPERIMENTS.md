# Cultural Divergence Experiments

## Overview

This document explains how to conduct cultural divergence experiments with Machina Ludens. The goal is to demonstrate that different selection pressures (player preferences) lead to different evolved "cultures" of level designs.

## Phase 1.3: Cultural Divergence Test

### Success Criteria

By the end of these experiments, you should be able to:
1. Show that 3+ distinct cultures evolved with different characteristics
2. Provide statistical evidence (generation history data) of divergence
3. Describe qualitative differences between cultures

### New Features (Phase 1.3)

The game now includes:
- **Genome Display**: See the parameters of each level you're rating (grid size, box count, complexity, wall density)
- **Population Stats**: View average genome parameters for the current generation
- **Generation History**: Track how parameters evolve over 20+ generations
- **Save/Load**: Save experiments to continue later or compare multiple lineages
- **Export Data**: Download history as JSON for analysis

## Running the Experiments

### Experiment Setup

You'll run **3 separate experiments**, each with a different rating strategy. Each experiment should run for **20+ generations** (about 60-100 rated levels per experiment).

**Important**: Use the "Save Experiment" button to save each culture separately so you can compare them later!

### Experiment 1: Large Board Culture

**Goal**: Evolve levels that favor large grids

**Rating Strategy**:
- ⭐⭐⭐⭐⭐ (5 stars): Grid size ≥ 13
- ⭐⭐⭐⭐ (4 stars): Grid size = 12
- ⭐⭐⭐ (3 stars): Grid size = 11
- ⭐⭐ (2 stars): Grid size = 10
- ⭐ (1 star): Grid size ≤ 9

**What to Ignore**: Box count, complexity, and wall density don't matter - only rate based on grid size.

**Hypothesis**: Over 20 generations, average grid size should increase toward the maximum (14).

**Steps**:
1. Start fresh: Click "Clear & Restart" if you have existing data
2. Click "🎲 Generate" to create a level
3. Look at the "Current Level Genome" display
4. Rate based on grid size only
5. After rating 3-5 levels, click "🧬 Breed Next Generation"
6. Repeat for 20+ generations
7. Click "💾 Save Experiment" and name it "Large-Board-Culture"
8. Click "📊 View History" to see the evolution
9. Click "💾 Export Data" to save statistics

### Experiment 2: Dense Maze Culture

**Goal**: Evolve levels that favor high wall density

**Rating Strategy**:
- ⭐⭐⭐⭐⭐ (5 stars): Wall Density ≥ 18%
- ⭐⭐⭐⭐ (4 stars): Wall Density 14-17%
- ⭐⭐⭐ (3 stars): Wall Density 10-13%
- ⭐⭐ (2 stars): Wall Density 6-9%
- ⭐ (1 star): Wall Density ≤ 5%

**What to Ignore**: Grid size, box count, and complexity don't matter.

**Hypothesis**: Average wall density should increase, creating maze-like levels.

**Steps**:
1. Click "Clear & Restart" to start fresh
2. Follow same process as Experiment 1
3. Rate based on wall density only
4. Save as "Dense-Maze-Culture"

### Experiment 3: Simple Puzzle Culture

**Goal**: Evolve levels that favor simplicity

**Rating Strategy**:
- ⭐⭐⭐⭐⭐ (5 stars): Complexity ≤ 35 AND Box Count ≤ 4
- ⭐⭐⭐⭐ (4 stars): Complexity ≤ 40 AND Box Count ≤ 4
- ⭐⭐⭐ (3 stars): Complexity ≤ 45 OR Box Count = 5
- ⭐⭐ (2 stars): Complexity > 45 OR Box Count = 5
- ⭐ (1 star): Complexity > 50 OR Box Count = 6

**What to Ignore**: Grid size and wall density don't matter.

**Hypothesis**: Complexity and box count should decrease, creating simpler puzzles.

**Steps**:
1. Click "Clear & Restart" to start fresh
2. Follow same process as Experiment 1
3. Rate based on complexity and box count
4. Save as "Simple-Puzzle-Culture"

## Analyzing Results

### During the Experiment

- Watch the "Population Averages" display after each breeding cycle
- Notice how the highlighted parameter (the one you're selecting for) changes over generations
- Click "📊 View History" periodically to see trends

### After 20+ Generations

For each experiment, record:

1. **Starting Stats** (Generation 1, from first breed):
   - Average Grid Size
   - Average Box Count
   - Average Complexity
   - Average Wall Density

2. **Ending Stats** (Generation 20+):
   - Same metrics

3. **Trend Observations**:
   - Did the target parameter increase/decrease as expected?
   - Did other parameters change as side effects?
   - How quickly did evolution occur? (Fast in first 5 gens? Slow convergence?)

4. **Qualitative Observations**:
   - How do levels from Culture A *look* different from Culture B?
   - Are they noticeably easier/harder?
   - Do they have different "personalities"?

### Comparing Cultures

Use the "📂 Load Experiment" button to switch between saved cultures and compare:

1. Load "Large-Board-Culture"
   - Generate 5-10 levels, note their characteristics

2. Load "Dense-Maze-Culture"
   - Generate 5-10 levels, compare to Large-Board

3. Load "Simple-Puzzle-Culture"
   - Generate 5-10 levels, compare to both

**Question**: Can you visually distinguish which culture a level came from?

## Expected Results

### Culture 1: Large Board
- Higher grid sizes (avg 12-13)
- More open space
- Longer solutions
- Feels "expansive"

### Culture 2: Dense Maze
- Higher wall density (15-20%)
- Tight corridors
- More obstacles
- Feels "claustrophobic"

### Culture 3: Simple Puzzle
- Lower complexity (30-35)
- Fewer boxes (3-4)
- Shorter solutions
- Feels "accessible"

## Tips

1. **Be Consistent**: Stick to your rating strategy for each experiment
2. **Take Breaks**: Each experiment takes 1-2 hours. Spread them across multiple sessions using Save/Load.
3. **Document**: Take screenshots of interesting levels from each culture
4. **Export Data**: Save the JSON exports - you can analyze them later or share them
5. **Watch for Convergence**: After 15-20 generations, evolution often slows. This is normal.

## Troubleshooting

**"Evolution is too slow"**
- Make sure you're rating 3-5 levels per generation before breeding
- Be more extreme in your ratings (more 1s and 5s, fewer 3s)

**"I accidentally mixed strategies"**
- That's okay! Real evolution has mixed selection pressures. Note it in your observations.

**"My experiment crashed / I lost data"**
- All data is auto-saved to localStorage
- Refresh the page - your latest generation should load automatically
- Use "Save Experiment" frequently as backup

**"I want to restart mid-experiment"**
- Use "Clear & Restart" to begin fresh
- Or save current progress first, then clear

## Next Steps

Once you've completed these experiments and documented the results:
- **Phase 2.1**: Add visual bot representations (creatures with procedural appearance based on genome)
- **Phase 2.2**: Add bot curation simulation (bots "explore" and present puzzles)
- **Phase 2.3**: Implement full game loop (Release → Curate → Evaluate → Breed → Observe)

## Research Questions

As you experiment, consider:
1. How many generations are needed for noticeable divergence?
2. Do some parameters evolve faster than others?
3. What happens if you change selection strategy mid-experiment?
4. Can you create a "balanced" culture by rating for multiple traits?
5. Do populations eventually stagnate, or continue evolving?

---

**Remember**: The goal isn't to create "perfect" levels, but to demonstrate that **play-driven selection produces cultural evolution**. Different preferences = different cultures.
