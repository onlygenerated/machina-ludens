import { SokobanGenerator } from './generator.js';

// Genome for Sokoban Level Generation
// Represents the "DNA" of a level generator that can evolve through selection

export class Genome {
    constructor(genes = null, id = null) {
        if (genes) {
            this.genes = { ...genes };
            // Backward compatibility: backfill style genes for old genomes
            if (this.genes.styleClusters === undefined) {
                this.genes.styleClusters = 25;
                this.genes.styleMaze = 25;
                this.genes.styleCaves = 25;
                this.genes.styleClusteredRooms = 25;
            }
            // Backward compatibility: backfill visual genes for old genomes
            if (this.genes.palette === undefined) {
                this.genes.palette = ((this.genes.gridSize - 7) / 73);
                this.genes.tileStyle = Math.min(1, this.genes.wallDensity / 0.3);
                this.genes.decoration = Math.min(1, (this.genes.complexity - 20) / 180);
            }
        } else {
            // Initialize with random genes
            this.genes = Genome.randomGenes();
        }
        // Unique ID for lineage tracking (preserved through clone/serialize)
        this._id = id || Genome._newId();
    }

    static _newId() {
        return Math.random().toString(36).slice(2, 8);
    }

    // Generate random genes within valid ranges
    static randomGenes() {
        return {
            // Grid dimensions (9-50) - wide range for variety
            gridSize: 9 + Math.floor(Math.random() * 42),

            // Number of boxes/targets (3-8)
            boxCount: 3 + Math.floor(Math.random() * 6),

            // Complexity: number of reverse-play moves (30-80)
            complexity: 30 + Math.floor(Math.random() * 51),

            // Wall density: probability of internal walls (0.05-0.25)
            wallDensity: 0.05 + Math.random() * 0.2,

            // Style weights (0-100 each) — relative weights for generation algorithm selection
            styleClusters: Math.floor(Math.random() * 101),
            styleMaze: Math.floor(Math.random() * 101),
            styleCaves: Math.floor(Math.random() * 101),
            styleClusteredRooms: Math.floor(Math.random() * 101),

            // Visual genes
            palette: Math.random(),       // 0-1 circular, controls HSL hue
            tileStyle: Math.random(),     // 0-1 clamped, angular→organic
            decoration: Math.random()     // 0-1 clamped, minimal→rich
        };
    }

    // Create a level generator from this genome
    createGenerator() {
        // Scale complexity with grid size so larger grids get more reverse-play moves
        const effectiveComplexity = Math.max(this.genes.complexity,
            Math.min(500, Math.round(this.genes.complexity * (this.genes.gridSize / 10)))
        );

        // Cap box count based on playable area so small grids aren't overloaded
        const playableArea = (this.genes.gridSize - 2) * (this.genes.gridSize - 2);
        const maxBoxes = Math.max(2, Math.floor(playableArea / 12));
        const effectiveBoxCount = Math.min(this.genes.boxCount, maxBoxes);

        const styleWeights = {
            clusters: this.genes.styleClusters,
            maze: this.genes.styleMaze,
            caves: this.genes.styleCaves,
            clusteredRooms: this.genes.styleClusteredRooms
        };

        return new SokobanGenerator(
            this.genes.gridSize,      // width
            this.genes.gridSize,      // height (square grids for now)
            effectiveBoxCount,
            effectiveComplexity,
            this.genes.wallDensity,
            styleWeights
        );
    }

    // Generate a level from this genome
    generateLevel() {
        const generator = this.createGenerator();
        return generator.generate();
    }

    // Crossover: create a child genome by mixing two parents
    static crossover(parent1, parent2) {
        const childGenes = {};

        // For each gene, randomly pick from either parent
        for (const gene in parent1.genes) {
            childGenes[gene] = Math.random() < 0.5
                ? parent1.genes[gene]
                : parent2.genes[gene];
        }

        return new Genome(childGenes);
    }

    // Mutation: randomly tweak genes
    mutate(mutationRate = 0.2) {
        const mutated = { ...this.genes };

        // Each gene has a chance to mutate
        if (Math.random() < mutationRate) {
            // Mutate grid size (±3, clamped to 7-80)
            mutated.gridSize = Math.max(7, Math.min(80,
                mutated.gridSize + Math.floor((Math.random() - 0.5) * 6 + 0.5)
            ));
        }

        if (Math.random() < mutationRate) {
            // Mutate box count (±1, clamped to 2-15)
            mutated.boxCount = Math.max(2, Math.min(15,
                mutated.boxCount + (Math.random() < 0.5 ? -1 : 1)
            ));
        }

        if (Math.random() < mutationRate) {
            // Mutate complexity (±10, clamped to 20-200)
            mutated.complexity = Math.max(20, Math.min(200,
                mutated.complexity + Math.floor((Math.random() - 0.5) * 20 + 0.5)
            ));
        }

        if (Math.random() < mutationRate) {
            // Mutate wall density (±0.03, clamped to 0.02-0.3)
            mutated.wallDensity = Math.max(0.02, Math.min(0.3,
                mutated.wallDensity + (Math.random() - 0.5) * 0.06
            ));
        }

        // Mutate style weights (each 20% chance, ±15, clamped 0-100)
        for (const styleGene of ['styleClusters', 'styleMaze', 'styleCaves', 'styleClusteredRooms']) {
            if (Math.random() < 0.2) {
                mutated[styleGene] = Math.max(0, Math.min(100,
                    mutated[styleGene] + Math.floor((Math.random() - 0.5) * 30 + 0.5)
                ));
            }
        }

        // Mutate visual genes
        if (Math.random() < mutationRate) {
            // Palette: circular wrapping (±0.08)
            mutated.palette = mutated.palette + (Math.random() - 0.5) * 0.16;
            mutated.palette = mutated.palette - Math.floor(mutated.palette); // wrap to [0,1)
        }

        if (Math.random() < mutationRate) {
            // Tile style: clamped (±0.1)
            mutated.tileStyle = Math.max(0, Math.min(1,
                mutated.tileStyle + (Math.random() - 0.5) * 0.2
            ));
        }

        if (Math.random() < mutationRate) {
            // Decoration: clamped (±0.08)
            mutated.decoration = Math.max(0, Math.min(1,
                mutated.decoration + (Math.random() - 0.5) * 0.16
            ));
        }

        return new Genome(mutated);
    }

    // Create a copy of this genome
    clone() {
        return new Genome(this.genes, this._id);
    }

    // Get a human-readable summary of this genome
    describe() {
        const total = this.genes.styleClusters + this.genes.styleMaze +
                      this.genes.styleCaves + this.genes.styleClusteredRooms;
        const pct = (v) => total > 0 ? Math.round(v / total * 100) : 25;
        const ts = this.genes.tileStyle;
        const dec = this.genes.decoration;
        return {
            'Grid Size': `${this.genes.gridSize}x${this.genes.gridSize}`,
            'Boxes': this.genes.boxCount,
            'Complexity': this.genes.complexity,
            'Wall Density': `${(this.genes.wallDensity * 100).toFixed(1)}%`,
            'Style': `Clusters ${pct(this.genes.styleClusters)}% / Maze ${pct(this.genes.styleMaze)}% / Caves ${pct(this.genes.styleCaves)}% / Rooms ${pct(this.genes.styleClusteredRooms)}%`,
            'Palette': `${Math.round(this.genes.palette * 360)} deg`,
            'Tile Style': ts < 0.33 ? 'Angular' : ts < 0.66 ? 'Balanced' : 'Organic',
            'Decoration': dec < 0.33 ? 'Minimal' : dec < 0.66 ? 'Moderate' : 'Rich'
        };
    }

    // Get the dominant style name from this genome
    getDominantStyle() {
        const styles = [
            { name: 'Clusters', weight: this.genes.styleClusters },
            { name: 'Maze', weight: this.genes.styleMaze },
            { name: 'Caves', weight: this.genes.styleCaves },
            { name: 'Rooms', weight: this.genes.styleClusteredRooms }
        ];
        styles.sort((a, b) => b.weight - a.weight);
        return styles[0].name;
    }

    // Serialize to JSON
    toJSON() {
        return {
            genes: this.genes,
            _id: this._id
        };
    }

    // Deserialize from JSON
    static fromJSON(json) {
        return new Genome(json.genes, json._id || null);
    }
}

// Population manager for genetic algorithm
export class Population {
    constructor(size = 10) {
        this.genomes = [];
        this.generation = 0;
        this.history = [];
        this.lineage = []; // Array of lineage records for family tree

        // Initialize with random genomes, record as Gen 0
        for (let i = 0; i < size; i++) {
            const g = new Genome();
            this.genomes.push(g);
            this.lineage.push({
                id: g._id,
                generation: 0,
                parentIds: [],
                isWildCard: false,
                isElite: false
            });
        }
    }

    // Get current generation of genomes
    getCurrentGeneration() {
        return this.genomes;
    }

    // Evolve to next generation based on fitness scores
    // fitness is an array of numbers (one per genome, higher is better)
    evolve(fitnessScores) {
        if (fitnessScores.length !== this.genomes.length) {
            throw new Error('Fitness scores must match genome count');
        }

        // Record this generation's stats
        this.history.push({
            generation: this.generation,
            avgFitness: fitnessScores.reduce((a, b) => a + b, 0) / fitnessScores.length,
            maxFitness: Math.max(...fitnessScores),
            genomes: this.genomes.map(g => g.toJSON())
        });

        // Create fitness-genome pairs and sort by fitness
        const pairs = this.genomes.map((genome, i) => ({
            genome,
            fitness: fitnessScores[i]
        })).sort((a, b) => b.fitness - a.fitness);

        // Select top 50% as parents
        const parents = pairs.slice(0, Math.ceil(pairs.length / 2)).map(p => p.genome);

        // Capture eliminated genomes (bottom half)
        const eliminated = pairs.slice(Math.ceil(pairs.length / 2)).map(p => p.genome);

        // Create next generation
        const nextGen = [];

        // Keep the best genome (elitism)
        const eliteParent = parents[0];
        nextGen.push(eliteParent.clone());

        // Fill rest with crossover + mutation, tracking parentage
        const offspringRecords = [];
        while (nextGen.length < this.genomes.length) {
            // Pick two random parents
            const parent1 = parents[Math.floor(Math.random() * parents.length)];
            const parent2 = parents[Math.floor(Math.random() * parents.length)];

            // Create child through crossover
            const child = Genome.crossover(parent1, parent2);

            // Mutate
            const mutated = child.mutate(0.2);

            nextGen.push(mutated);
            offspringRecords.push({
                genome: mutated,
                parent1Genome: parent1,
                parent2Genome: parent2
            });
        }

        this.genomes = nextGen;
        this.generation++;

        // Return breeding report
        return {
            generation: this.generation,
            elite: { genome: nextGen[0], parentGenome: eliteParent },
            offspring: offspringRecords,
            eliminated
        };
    }

    // Evolve from tournament winners (array of 5 winning Genome refs, may contain duplicates)
    evolveFromWinners(winnerGenomes) {
        // Record history entry
        this.history.push({
            generation: this.generation,
            avgFitness: null,
            maxFitness: null,
            genomes: this.genomes.map(g => g.toJSON())
        });

        // Count wins per genome
        const winCounts = new Map();
        for (const g of winnerGenomes) {
            winCounts.set(g, (winCounts.get(g) || 0) + 1);
        }

        // Find champion (most wins, random tiebreaker)
        let maxWins = 0;
        const champions = [];
        for (const [genome, count] of winCounts) {
            if (count > maxWins) {
                maxWins = count;
                champions.length = 0;
                champions.push(genome);
            } else if (count === maxWins) {
                champions.push(genome);
            }
        }
        const champion = champions[Math.floor(Math.random() * champions.length)];

        // Deduplicate winners into breeding pool
        const breedingPool = [...winCounts.keys()];

        // Build next generation: 1 elite clone + 3 offspring + 1 fresh random
        const nextGen = [];
        const eliteClone = champion.clone();
        nextGen.push(eliteClone);

        const offspringRecords = [];
        while (nextGen.length < 4) {
            const parent1 = breedingPool[Math.floor(Math.random() * breedingPool.length)];
            const parent2 = breedingPool[Math.floor(Math.random() * breedingPool.length)];
            const child = Genome.crossover(parent1, parent2);
            const mutated = child.mutate(0.2);
            nextGen.push(mutated);
            offspringRecords.push({
                genome: mutated,
                parent1Genome: parent1,
                parent2Genome: parent2
            });
        }

        // 1 fresh random genome
        const freshGenome = new Genome();
        nextGen.push(freshGenome);
        offspringRecords.push({
            genome: freshGenome,
            parent1Genome: null,
            parent2Genome: null
        });

        // Determine eliminated = old population genomes not in breeding pool
        const eliminated = this.genomes.filter(g => !breedingPool.includes(g));

        this.genomes = nextGen;
        this.generation++;

        // Record lineage for family tree
        const nextGenNum = this.generation;
        this.lineage.push({
            id: eliteClone._id,
            generation: nextGenNum,
            parentIds: [champion._id],
            isWildCard: false,
            isElite: true
        });
        for (const rec of offspringRecords) {
            if (rec.parent1Genome === null) {
                this.lineage.push({
                    id: rec.genome._id,
                    generation: nextGenNum,
                    parentIds: [],
                    isWildCard: true,
                    isElite: false
                });
            } else {
                this.lineage.push({
                    id: rec.genome._id,
                    generation: nextGenNum,
                    parentIds: [rec.parent1Genome._id, rec.parent2Genome._id].filter((v, i, a) => a.indexOf(v) === i),
                    isWildCard: false,
                    isElite: false
                });
            }
        }

        return {
            generation: this.generation,
            elite: { genome: eliteClone, parentGenome: champion },
            offspring: offspringRecords,
            eliminated
        };
    }

    // Get statistics about current population
    getStats() {
        const avgGenes = {
            gridSize: 0,
            boxCount: 0,
            complexity: 0,
            wallDensity: 0,
            styleClusters: 0,
            styleMaze: 0,
            styleCaves: 0,
            styleClusteredRooms: 0,
            palette: 0,
            tileStyle: 0,
            decoration: 0
        };

        for (const genome of this.genomes) {
            avgGenes.gridSize += genome.genes.gridSize;
            avgGenes.boxCount += genome.genes.boxCount;
            avgGenes.complexity += genome.genes.complexity;
            avgGenes.wallDensity += genome.genes.wallDensity;
            avgGenes.styleClusters += genome.genes.styleClusters;
            avgGenes.styleMaze += genome.genes.styleMaze;
            avgGenes.styleCaves += genome.genes.styleCaves;
            avgGenes.styleClusteredRooms += genome.genes.styleClusteredRooms;
            avgGenes.palette += genome.genes.palette;
            avgGenes.tileStyle += genome.genes.tileStyle;
            avgGenes.decoration += genome.genes.decoration;
        }

        const count = this.genomes.length;
        const totalStyle = avgGenes.styleClusters + avgGenes.styleMaze +
                           avgGenes.styleCaves + avgGenes.styleClusteredRooms;
        const stylePct = (v) => totalStyle > 0 ? Math.round(v / totalStyle * 100) : 25;

        return {
            generation: this.generation,
            populationSize: count,
            averages: {
                gridSize: (avgGenes.gridSize / count).toFixed(1),
                boxCount: (avgGenes.boxCount / count).toFixed(1),
                complexity: (avgGenes.complexity / count).toFixed(1),
                wallDensity: ((avgGenes.wallDensity / count) * 100).toFixed(1) + '%'
            },
            styleWeights: {
                clusters: stylePct(avgGenes.styleClusters),
                maze: stylePct(avgGenes.styleMaze),
                caves: stylePct(avgGenes.styleCaves),
                clusteredRooms: stylePct(avgGenes.styleClusteredRooms)
            },
            visualAverages: {
                palette: Math.round((avgGenes.palette / count) * 360),
                tileStyle: (avgGenes.tileStyle / count).toFixed(2),
                decoration: (avgGenes.decoration / count).toFixed(2)
            }
        };
    }

    // Serialize to JSON
    toJSON() {
        return {
            genomes: this.genomes.map(g => g.toJSON()),
            generation: this.generation,
            history: this.history,
            lineage: this.lineage
        };
    }

    // Deserialize from JSON
    static fromJSON(json) {
        const pop = new Population(0);
        pop.genomes = json.genomes.map(g => Genome.fromJSON(g));
        pop.generation = json.generation;
        pop.history = json.history;
        pop.lineage = json.lineage || [];
        return pop;
    }
}

// Bot class - wraps a Genome with personality and visual identity
export class Bot {
    constructor(genome) {
        this.genome = genome;
        this.id = Bot.generateId(genome);
        this.name = Bot.generateName(genome);
        this.personality = Bot.generatePersonality(genome);
        this.colors = Bot.generateColors(genome);
    }

    // Generate a unique ID from genome
    static generateId(genome) {
        const genes = genome.genes;
        const hash = (genes.gridSize * 1000 + genes.boxCount * 100 + genes.complexity + genes.wallDensity * 10000);
        return Math.floor(hash) % 100000;
    }

    // Generate bot name from genome
    static generateName(genome) {
        const genes = genome.genes;

        // Pool of mixed adjectives (not locked to a single trait dimension)
        const adjectives = [
            'Tiny', 'Small', 'Big', 'Large', 'Huge', 'Giant',
            'Simple', 'Plain', 'Clever', 'Tricky', 'Complex', 'Intricate',
            'Sparse', 'Open', 'Busy', 'Dense', 'Packed', 'Wild',
            'Calm', 'Sharp', 'Smooth', 'Bright', 'Dark', 'Swift',
            'Steady', 'Bold', 'Shy', 'Eager', 'Wise', 'Lucky'
        ];

        const names = [
            'Alice', 'Bob', 'Charlie', 'Dana', 'Eve', 'Frank',
            'Grace', 'Hank', 'Ivy', 'Jack', 'Kelly', 'Leo',
            'Maya', 'Nina', 'Oscar', 'Penny', 'Quinn', 'Rex',
            'Sara', 'Tom', 'Uma', 'Vince', 'Wendy', 'Xena',
            'Yuki', 'Zara', 'Betty', 'Max', 'Sam', 'Ruby'
        ];

        // Hash all 11 genes with prime multipliers so small mutations
        // (e.g. boxCount ±1) produce very different names
        const h = Math.abs(
            genes.gridSize * 7919 +
            genes.boxCount * 4391 +
            genes.complexity * 6571 +
            Math.round(genes.wallDensity * 10000) * 3571 +
            genes.styleClusters * 2903 +
            genes.styleMaze * 5381 +
            genes.styleCaves * 4729 +
            genes.styleClusteredRooms * 6197 +
            Math.round(genes.palette * 10000) * 8537 +
            Math.round(genes.tileStyle * 10000) * 7331 +
            Math.round(genes.decoration * 10000) * 9173
        );

        // Use different bits for adjective vs name to decorrelate them
        const adjIdx = h % adjectives.length;
        const nameIdx = Math.floor(h / adjectives.length) % names.length;

        return `${adjectives[adjIdx]} ${names[nameIdx]}`;
    }

    // Generate personality description
    static generatePersonality(genome) {
        const genes = genome.genes;
        const traits = [];

        // Size-based traits
        if (genes.gridSize >= 40) {
            traits.push('loves expansive spaces');
        } else if (genes.gridSize <= 12) {
            traits.push('prefers cozy environments');
        }

        // Complexity-based traits
        if (genes.complexity >= 100) {
            traits.push('enjoys intricate challenges');
        } else if (genes.complexity <= 40) {
            traits.push('appreciates elegant simplicity');
        }

        // Density-based traits
        if (genes.wallDensity >= 0.2) {
            traits.push('creates elaborate mazes');
        } else if (genes.wallDensity <= 0.06) {
            traits.push('favors open layouts');
        }

        // Box count traits
        if (genes.boxCount >= 8) {
            traits.push('ambitious with puzzles');
        } else if (genes.boxCount <= 3) {
            traits.push('believes in minimalism');
        }

        // Style-based traits (based on dominant style)
        const styleWeights = [
            { name: 'clusters', weight: genes.styleClusters },
            { name: 'maze', weight: genes.styleMaze },
            { name: 'caves', weight: genes.styleCaves },
            { name: 'clusteredRooms', weight: genes.styleClusteredRooms }
        ].sort((a, b) => b.weight - a.weight);
        const dominant = styleWeights[0];
        if (dominant.weight > 40) {
            switch (dominant.name) {
                case 'clusters': traits.push('scatters wall islands across arenas'); break;
                case 'maze': traits.push('loves labyrinthine corridors'); break;
                case 'caves': traits.push('carves organic caverns'); break;
                case 'clusteredRooms': traits.push('builds furnished rooms'); break;
            }
        }

        // Visual gene traits
        if (genes.tileStyle < 0.25) {
            traits.push('has a sharp geometric eye');
        } else if (genes.tileStyle > 0.75) {
            traits.push('sees the world in soft curves');
        }

        if (genes.decoration > 0.7) {
            traits.push('obsessed with details');
        } else if (genes.decoration < 0.2) {
            traits.push('a minimalist at heart');
        }

        if (genes.palette < 0.2) {
            traits.push('draws in warm colors');
        } else if (genes.palette >= 0.4 && genes.palette <= 0.6) {
            traits.push('favors cool tones');
        }

        // Return personality string
        if (traits.length === 0) {
            return 'A balanced puzzle designer';
        } else if (traits.length === 1) {
            return traits[0].charAt(0).toUpperCase() + traits[0].slice(1);
        } else if (traits.length === 2) {
            return traits.map((t, i) => i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t).join(' and ');
        } else {
            const last = traits.pop();
            return traits.map((t, i) => i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t).join(', ') + ', and ' + last;
        }
    }

    // Generate color scheme from genome
    static generateColors(genome) {
        const genes = genome.genes;

        // Use palette gene for hue (with fallback for old genomes)
        const hue = Math.round((genes.palette !== undefined ? genes.palette : (genes.gridSize - 7) / 73) * 360) % 360;

        // Saturation based on complexity (30-90%), mapped from 20-200
        const saturation = 30 + Math.min(60, ((genes.complexity - 20) / 180) * 60);

        // Lightness based on wall density (35-65%), mapped from 0-0.3
        const lightness = 65 - Math.min(30, (genes.wallDensity / 0.3) * 30);

        const primary = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const secondary = `hsl(${(hue + 30) % 360}, ${saturation * 0.8}%, ${lightness * 0.9}%)`;
        const accent = `hsl(${(hue + 180) % 360}, ${saturation}%, ${lightness}%)`;

        return { primary, secondary, accent };
    }

    // Draw bot sprite to canvas
    drawSprite(ctx, x, y, size = 60) {
        const genes = this.genome.genes;

        // Body size based on gridSize (7-80 → 0.6-1.1)
        const bodyScale = 0.6 + Math.min(0.5, (genes.gridSize - 7) / 73 * 0.5);
        const bodyRadius = (size / 2) * bodyScale;

        // Draw body (circle)
        ctx.fillStyle = this.colors.primary;
        ctx.beginPath();
        ctx.arc(x, y, bodyRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw outline
        ctx.strokeStyle = this.colors.secondary;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw eyes (number based on boxCount)
        const eyeCount = Math.min(genes.boxCount, 3); // Max 3 eyes
        const eyeSize = bodyRadius * 0.15;
        ctx.fillStyle = '#ffffff';

        for (let i = 0; i < eyeCount; i++) {
            const angle = (Math.PI * 2 / eyeCount) * i - Math.PI / 2;
            const eyeX = x + Math.cos(angle) * bodyRadius * 0.5;
            const eyeY = y + Math.sin(angle) * bodyRadius * 0.5;

            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Pupil
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw pattern/spikes based on complexity and density (20-200 → 3-8 spikes)
        const spikeCount = Math.max(3, Math.min(8, Math.floor(genes.complexity / 25)));
        const spikeLength = bodyRadius * (0.2 + genes.wallDensity);

        ctx.fillStyle = this.colors.accent;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (Math.PI * 2 / spikeCount) * i;
            const x1 = x + Math.cos(angle) * bodyRadius;
            const y1 = y + Math.sin(angle) * bodyRadius;
            const x2 = x + Math.cos(angle) * (bodyRadius + spikeLength);
            const y2 = y + Math.sin(angle) * (bodyRadius + spikeLength);

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x1, y1);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Generate a level using this bot's genome
    generateLevel() {
        return this.genome.generateLevel();
    }

    // Calculate affinity (preference) for another genome
    // Returns a score 0-1 indicating how much this bot "likes" the other genome
    calculateAffinity(otherGenome) {
        const myGenes = this.genome.genes;
        const theirGenes = otherGenome.genes;

        // Calculate normalized distance for each trait
        // Closer values = higher affinity

        // Grid size: 7-80 range (span of 73)
        const gridDiff = Math.abs(myGenes.gridSize - theirGenes.gridSize) / 73;

        // Box count: 2-15 range (span of 13)
        const boxDiff = Math.abs(myGenes.boxCount - theirGenes.boxCount) / 13;

        // Complexity: 20-200 range (span of 180)
        const complexDiff = Math.abs(myGenes.complexity - theirGenes.complexity) / 180;

        // Wall density: 0.02-0.3 range (span of 0.28)
        const densityDiff = Math.abs(myGenes.wallDensity - theirGenes.wallDensity) / 0.28;

        // Style weight dimensions (each 0-100, span of 100)
        const clustersDiff = Math.abs(myGenes.styleClusters - theirGenes.styleClusters) / 100;
        const mazeDiff = Math.abs(myGenes.styleMaze - theirGenes.styleMaze) / 100;
        const cavesDiff = Math.abs(myGenes.styleCaves - theirGenes.styleCaves) / 100;
        const roomsDiff = Math.abs(myGenes.styleClusteredRooms - theirGenes.styleClusteredRooms) / 100;

        // Visual gene dimensions (each 0-1)
        // Palette uses circular distance
        const paletteDiff = Math.min(
            Math.abs(myGenes.palette - theirGenes.palette),
            1 - Math.abs(myGenes.palette - theirGenes.palette)
        );
        const tileStyleDiff = Math.abs(myGenes.tileStyle - theirGenes.tileStyle);
        const decorationDiff = Math.abs(myGenes.decoration - theirGenes.decoration);

        // Average over 11 dimensions
        const avgDiff = (gridDiff + boxDiff + complexDiff + densityDiff +
                         clustersDiff + mazeDiff + cavesDiff + roomsDiff +
                         paletteDiff + tileStyleDiff + decorationDiff) / 11;

        // Convert to affinity score (1 = perfect match, 0 = completely different)
        const affinity = 1 - avgDiff;

        return affinity;
    }

    // Curate: select favorite level from multiple candidates
    // Returns the genome this bot prefers most
    curate(candidateGenomes) {
        let bestGenome = candidateGenomes[0];
        let bestAffinity = this.calculateAffinity(candidateGenomes[0]);

        for (let i = 1; i < candidateGenomes.length; i++) {
            const affinity = this.calculateAffinity(candidateGenomes[i]);
            if (affinity > bestAffinity) {
                bestAffinity = affinity;
                bestGenome = candidateGenomes[i];
            }
        }

        return {
            genome: bestGenome,
            affinity: bestAffinity
        };
    }

    // Serialize to JSON
    toJSON() {
        return {
            genome: this.genome.toJSON(),
            id: this.id,
            name: this.name,
            personality: this.personality,
            colors: this.colors
        };
    }

    // Deserialize from JSON
    static fromJSON(json) {
        const genome = Genome.fromJSON(json.genome);
        const bot = new Bot(genome);
        // Override generated values with saved ones for consistency
        bot.id = json.id;
        bot.name = json.name;
        bot.personality = json.personality;
        bot.colors = json.colors;
        return bot;
    }
}

