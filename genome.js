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
            // Grid dimensions (7-10)
            gridSize: 7 + Math.floor(Math.random() * 4),

            // Number of boxes/targets (2-5)
            boxCount: 2 + Math.floor(Math.random() * 4),

            // Complexity: number of reverse-play moves (20-50)
            complexity: 20 + Math.floor(Math.random() * 31),

            // Wall density: probability of internal walls (0-0.15)
            wallDensity: Math.random() * 0.15
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

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Genome, Population };
}
