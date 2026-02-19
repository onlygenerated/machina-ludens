/**
 * Gene Registry — single source of truth for all gene definitions,
 * tier thresholds, and tier-gated access.
 */

export const TIER_THRESHOLDS = [
    { tier: 1, name: 'Primordial', dna: 0 },
    { tier: 2, name: 'Awakening',  dna: 50 },
    { tier: 3, name: 'Flourishing', dna: 150 }
];

export function getTierForDNA(dnaBank) {
    let tier = 1;
    for (const t of TIER_THRESHOLDS) {
        if (dnaBank >= t.dna) tier = t.tier;
    }
    return tier;
}

export function getTierInfo(dnaBank) {
    let info = TIER_THRESHOLDS[0];
    for (const t of TIER_THRESHOLDS) {
        if (dnaBank >= t.dna) info = t;
    }
    return info;
}

export function getNextTierInfo(dnaBank) {
    const current = getTierForDNA(dnaBank);
    return TIER_THRESHOLDS.find(t => t.tier > current) || null;
}

// Gene types:
//   'int'     — integer, mutated by ±delta (rounded), clamped to [min, max]
//   'float'   — float, mutated by ±delta, clamped to [min, max]
//   'circular'— float 0-1, mutated by ±delta, wraps around
//   'binary'  — 0 or 1, flips with mutationRate
//   'weight'  — integer 0-100, mutated by ±delta

export const GENE_REGISTRY = [
    // --- Tier 1: Structural ---
    {
        name: 'gridSize', tier: 1, type: 'int',
        min: 9, max: 80, defaultValue: 9,
        mutationRate: 0.2, mutationDelta: 3,
        randomFn: () => 9 + Math.floor(Math.random() * 42)
    },
    {
        name: 'boxCount', tier: 1, type: 'int',
        min: 2, max: 15, defaultValue: 3,
        mutationRate: 0.2, mutationDelta: 1,
        randomFn: () => 3 + Math.floor(Math.random() * 6)
    },
    {
        name: 'complexity', tier: 1, type: 'int',
        min: 20, max: 200, defaultValue: 30,
        mutationRate: 0.2, mutationDelta: 10,
        randomFn: () => 30 + Math.floor(Math.random() * 51)
    },
    {
        name: 'wallDensity', tier: 1, type: 'float',
        min: 0.02, max: 0.3, defaultValue: 0.05,
        mutationRate: 0.2, mutationDelta: 0.03,
        randomFn: () => 0.05 + Math.random() * 0.2
    },

    // --- Tier 1: Style weights ---
    {
        name: 'styleClusters', tier: 1, type: 'weight',
        min: 0, max: 100, defaultValue: 25,
        mutationRate: 0.2, mutationDelta: 15,
        randomFn: () => Math.floor(Math.random() * 101)
    },
    {
        name: 'styleMaze', tier: 1, type: 'weight',
        min: 0, max: 100, defaultValue: 25,
        mutationRate: 0.2, mutationDelta: 15,
        randomFn: () => Math.floor(Math.random() * 101)
    },
    {
        name: 'styleCaves', tier: 1, type: 'weight',
        min: 0, max: 100, defaultValue: 25,
        mutationRate: 0.2, mutationDelta: 15,
        randomFn: () => Math.floor(Math.random() * 101)
    },
    {
        name: 'styleClusteredRooms', tier: 1, type: 'weight',
        min: 0, max: 100, defaultValue: 25,
        mutationRate: 0.2, mutationDelta: 15,
        randomFn: () => Math.floor(Math.random() * 101)
    },

    // --- Tier 1: Visual ---
    {
        name: 'palette', tier: 1, type: 'circular',
        min: 0, max: 1, defaultValue: 0.5,
        mutationRate: 0.2, mutationDelta: 0.08,
        randomFn: () => Math.random()
    },
    {
        name: 'tileStyle', tier: 1, type: 'float',
        min: 0, max: 1, defaultValue: 0.5,
        mutationRate: 0.2, mutationDelta: 0.1,
        randomFn: () => Math.random()
    },
    {
        name: 'decoration', tier: 1, type: 'float',
        min: 0, max: 1, defaultValue: 0.5,
        mutationRate: 0.2, mutationDelta: 0.08,
        randomFn: () => Math.random()
    },

    // --- Tier 1: Collectibles ---
    {
        name: 'collectibleDensity', tier: 1, type: 'float',
        min: 0, max: 1, defaultValue: 0.5,
        mutationRate: 0.2, mutationDelta: 0.15,
        randomFn: () => 0.3 + Math.random() * 0.5
    },

    // --- Tier 2: Ice & Exit ---
    {
        name: 'iceEnabled', tier: 2, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.5 ? 1 : 0
    },
    {
        name: 'iceDensity', tier: 2, type: 'float',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.2, mutationDelta: 0.1,
        randomFn: () => Math.random() * 0.3
    },
    {
        name: 'boxIceEnabled', tier: 2, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.3 ? 1 : 0
    },
    {
        name: 'exitEnabled', tier: 2, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.5 ? 1 : 0
    },
    {
        name: 'teleporterEnabled', tier: 2, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.5 ? 1 : 0
    },
    {
        name: 'teleporterCount', tier: 2, type: 'int',
        min: 1, max: 3, defaultValue: 1,
        mutationRate: 0.2, mutationDelta: 1,
        randomFn: () => 1 + Math.floor(Math.random() * 3)
    },

    // --- Tier 3: Spikes ---
    {
        name: 'spikeEnabled', tier: 3, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.5 ? 1 : 0
    },
    {
        name: 'spikeDensity', tier: 3, type: 'float',
        min: 0, max: 0.25, defaultValue: 0,
        mutationRate: 0.2, mutationDelta: 0.05,
        randomFn: () => Math.random() * 0.25
    },

    // --- Tier 3: Patrol enemies ---
    {
        name: 'patrolEnabled', tier: 3, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.5 ? 1 : 0
    },
    {
        name: 'patrolCount', tier: 3, type: 'int',
        min: 1, max: 3, defaultValue: 1,
        mutationRate: 0.2, mutationDelta: 1,
        randomFn: () => 1 + Math.floor(Math.random() * 3)
    },

    // --- Tier 3: One-way gates ---
    {
        name: 'gateEnabled', tier: 3, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.5 ? 1 : 0
    },
    {
        name: 'gateDensity', tier: 3, type: 'float',
        min: 0, max: 0.15, defaultValue: 0,
        mutationRate: 0.2, mutationDelta: 0.03,
        randomFn: () => Math.random() * 0.15
    },

    // --- Tier 3: Keys & Doors ---
    {
        name: 'keyDoorEnabled', tier: 3, type: 'binary',
        min: 0, max: 1, defaultValue: 0,
        mutationRate: 0.05, mutationDelta: 0,
        randomFn: () => Math.random() < 0.5 ? 1 : 0
    },
    {
        name: 'keyDoorCount', tier: 3, type: 'int',
        min: 1, max: 2, defaultValue: 1,
        mutationRate: 0.2, mutationDelta: 1,
        randomFn: () => 1 + Math.floor(Math.random() * 2)
    }
];

// O(1) lookup by gene name
export const GENE_MAP = new Map(GENE_REGISTRY.map(g => [g.name, g]));

export function getAvailableGenes(tier) {
    return GENE_REGISTRY.filter(g => g.tier <= tier);
}

export function getLockedGenes(tier) {
    return GENE_REGISTRY.filter(g => g.tier > tier);
}
