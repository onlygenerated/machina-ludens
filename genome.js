// Genome for Sokoban Level Generation
// Represents the "DNA" of a level generator that can evolve through selection

class Genome {
    constructor(genes = null) {
        if (genes) {
            this.genes = { ...genes };
        } else {
            // Initialize with random genes
            this.genes = Genome.randomGenes();
        }
    }

    // Generate random genes within valid ranges
    static randomGenes() {
        return {
            // Grid dimensions (9-14) - larger boards on average
            gridSize: 9 + Math.floor(Math.random() * 6),

            // Number of boxes/targets (3-6) - more boxes
            boxCount: 3 + Math.floor(Math.random() * 4),

            // Complexity: number of reverse-play moves (30-60) - more complex
            complexity: 30 + Math.floor(Math.random() * 31),

            // Wall density: probability of internal walls (0.05-0.25) - more obstacles
            wallDensity: 0.05 + Math.random() * 0.2
        };
    }

    // Create a level generator from this genome
    createGenerator() {
        return new SokobanGenerator(
            this.genes.gridSize,      // width
            this.genes.gridSize,      // height (square grids for now)
            this.genes.boxCount,
            this.genes.complexity,
            this.genes.wallDensity
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
            // Mutate grid size (±1, clamped to 7-10)
            mutated.gridSize = Math.max(7, Math.min(10,
                mutated.gridSize + (Math.random() < 0.5 ? -1 : 1)
            ));
        }

        if (Math.random() < mutationRate) {
            // Mutate box count (±1, clamped to 2-5)
            mutated.boxCount = Math.max(2, Math.min(5,
                mutated.boxCount + (Math.random() < 0.5 ? -1 : 1)
            ));
        }

        if (Math.random() < mutationRate) {
            // Mutate complexity (±5, clamped to 20-50)
            mutated.complexity = Math.max(20, Math.min(50,
                mutated.complexity + (Math.random() < 0.5 ? -5 : 5)
            ));
        }

        if (Math.random() < mutationRate) {
            // Mutate wall density (±0.02, clamped to 0-0.15)
            mutated.wallDensity = Math.max(0, Math.min(0.15,
                mutated.wallDensity + (Math.random() - 0.5) * 0.04
            ));
        }

        return new Genome(mutated);
    }

    // Create a copy of this genome
    clone() {
        return new Genome(this.genes);
    }

    // Get a human-readable summary of this genome
    describe() {
        return {
            'Grid Size': `${this.genes.gridSize}x${this.genes.gridSize}`,
            'Boxes': this.genes.boxCount,
            'Complexity': this.genes.complexity,
            'Wall Density': `${(this.genes.wallDensity * 100).toFixed(1)}%`
        };
    }

    // Serialize to JSON
    toJSON() {
        return {
            genes: this.genes
        };
    }

    // Deserialize from JSON
    static fromJSON(json) {
        return new Genome(json.genes);
    }
}

// Population manager for genetic algorithm
class Population {
    constructor(size = 10) {
        this.genomes = [];
        this.generation = 0;
        this.history = [];

        // Initialize with random genomes
        for (let i = 0; i < size; i++) {
            this.genomes.push(new Genome());
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

        // Create next generation
        const nextGen = [];

        // Keep the best genome (elitism)
        nextGen.push(parents[0].clone());

        // Fill rest with crossover + mutation
        while (nextGen.length < this.genomes.length) {
            // Pick two random parents
            const parent1 = parents[Math.floor(Math.random() * parents.length)];
            const parent2 = parents[Math.floor(Math.random() * parents.length)];

            // Create child through crossover
            const child = Genome.crossover(parent1, parent2);

            // Mutate
            const mutated = child.mutate(0.2);

            nextGen.push(mutated);
        }

        this.genomes = nextGen;
        this.generation++;
    }

    // Get statistics about current population
    getStats() {
        const avgGenes = {
            gridSize: 0,
            boxCount: 0,
            complexity: 0,
            wallDensity: 0
        };

        for (const genome of this.genomes) {
            avgGenes.gridSize += genome.genes.gridSize;
            avgGenes.boxCount += genome.genes.boxCount;
            avgGenes.complexity += genome.genes.complexity;
            avgGenes.wallDensity += genome.genes.wallDensity;
        }

        const count = this.genomes.length;
        return {
            generation: this.generation,
            populationSize: count,
            averages: {
                gridSize: (avgGenes.gridSize / count).toFixed(1),
                boxCount: (avgGenes.boxCount / count).toFixed(1),
                complexity: (avgGenes.complexity / count).toFixed(1),
                wallDensity: ((avgGenes.wallDensity / count) * 100).toFixed(1) + '%'
            }
        };
    }

    // Serialize to JSON
    toJSON() {
        return {
            genomes: this.genomes.map(g => g.toJSON()),
            generation: this.generation,
            history: this.history
        };
    }

    // Deserialize from JSON
    static fromJSON(json) {
        const pop = new Population(0);
        pop.genomes = json.genomes.map(g => Genome.fromJSON(g));
        pop.generation = json.generation;
        pop.history = json.history;
        return pop;
    }
}

// Bot class - wraps a Genome with personality and visual identity
class Bot {
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

        // Adjectives based on traits
        const sizeAdjectives = ['Tiny', 'Small', 'Big', 'Large', 'Huge', 'Giant'];
        const complexityAdjectives = ['Simple', 'Plain', 'Clever', 'Tricky', 'Complex', 'Intricate'];
        const densityAdjectives = ['Sparse', 'Open', 'Busy', 'Dense', 'Packed', 'Maze'];

        // Names (alliterative when possible)
        const names = [
            'Alice', 'Bob', 'Charlie', 'Dana', 'Eve', 'Frank',
            'Grace', 'Hank', 'Ivy', 'Jack', 'Kelly', 'Leo',
            'Maya', 'Nina', 'Oscar', 'Penny', 'Quinn', 'Rex',
            'Sara', 'Tom', 'Uma', 'Vince', 'Wendy', 'Xena',
            'Yuki', 'Zara', 'Betty', 'Max', 'Sam', 'Ruby'
        ];

        // Pick adjective based on dominant trait
        const sizeIdx = Math.floor((genes.gridSize - 9) / 1); // 9-14 -> 0-5
        const complexIdx = Math.floor((genes.complexity - 30) / 6); // 30-60 -> 0-5
        const densityIdx = Math.floor(genes.wallDensity * 20); // 0-0.25 -> 0-5

        let adjective;
        const maxTrait = Math.max(sizeIdx, complexIdx, densityIdx);
        if (maxTrait === sizeIdx) {
            adjective = sizeAdjectives[Math.min(5, Math.max(0, sizeIdx))];
        } else if (maxTrait === complexIdx) {
            adjective = complexityAdjectives[Math.min(5, Math.max(0, complexIdx))];
        } else {
            adjective = densityAdjectives[Math.min(5, Math.max(0, densityIdx))];
        }

        // Pick name based on genome hash
        const nameIdx = (genes.gridSize * genes.boxCount + genes.complexity) % names.length;
        const name = names[nameIdx];

        return `${adjective} ${name}`;
    }

    // Generate personality description
    static generatePersonality(genome) {
        const genes = genome.genes;
        const traits = [];

        // Size-based traits
        if (genes.gridSize >= 13) {
            traits.push('loves expansive spaces');
        } else if (genes.gridSize <= 10) {
            traits.push('prefers cozy environments');
        }

        // Complexity-based traits
        if (genes.complexity >= 50) {
            traits.push('enjoys intricate challenges');
        } else if (genes.complexity <= 35) {
            traits.push('appreciates elegant simplicity');
        }

        // Density-based traits
        if (genes.wallDensity >= 0.18) {
            traits.push('creates elaborate mazes');
        } else if (genes.wallDensity <= 0.08) {
            traits.push('favors open layouts');
        }

        // Box count traits
        if (genes.boxCount >= 5) {
            traits.push('ambitious with puzzles');
        } else if (genes.boxCount <= 3) {
            traits.push('believes in minimalism');
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

        // Hue based on grid size (0-360)
        const hue = (genes.gridSize - 9) * 60; // 9->0°, 14->300°

        // Saturation based on complexity (30-90%)
        const saturation = 30 + (genes.complexity - 30) / 30 * 60;

        // Lightness based on wall density (35-65%)
        const lightness = 65 - (genes.wallDensity * 120);

        const primary = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const secondary = `hsl(${(hue + 30) % 360}, ${saturation * 0.8}%, ${lightness * 0.9}%)`;
        const accent = `hsl(${(hue + 180) % 360}, ${saturation}%, ${lightness}%)`;

        return { primary, secondary, accent };
    }

    // Draw bot sprite to canvas
    drawSprite(ctx, x, y, size = 60) {
        const genes = this.genome.genes;

        // Body size based on gridSize
        const bodyScale = 0.6 + (genes.gridSize - 9) / 10; // 0.6-1.1
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

        // Draw pattern/spikes based on complexity and density
        const spikeCount = Math.floor(genes.complexity / 10); // 3-6 spikes
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

        // Grid size: 9-14 range (span of 5)
        const gridDiff = Math.abs(myGenes.gridSize - theirGenes.gridSize) / 5;

        // Box count: 3-6 range (span of 3)
        const boxDiff = Math.abs(myGenes.boxCount - theirGenes.boxCount) / 3;

        // Complexity: 30-60 range (span of 30)
        const complexDiff = Math.abs(myGenes.complexity - theirGenes.complexity) / 30;

        // Wall density: 0-0.25 range (span of 0.25)
        const densityDiff = Math.abs(myGenes.wallDensity - theirGenes.wallDensity) / 0.25;

        // Average the differences (0 = identical, 1 = maximally different)
        const avgDiff = (gridDiff + boxDiff + complexDiff + densityDiff) / 4;

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

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Genome, Population, Bot };
}
