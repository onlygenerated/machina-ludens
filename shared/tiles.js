// Tile type constants — single source of truth for client and server
export const TILES = {
    FLOOR: 0,
    WALL: 1,
    TARGET: 2,
    BOX: 3,
    PLAYER: 4,
    BOX_ON_TARGET: 5,
    // Overlay tile types (stored in overlays array, not main grid)
    COLLECTIBLE: 6, // DNA fragment pickup
    ICE: 7,         // Player-only ice (slides until hitting obstacle)
    EXIT: 8,        // Must reach after solving to complete level
    SPIKES: 9,      // Timed hazard — toggles safe/active every N moves
    TELEPORTER: 10, // Paired portal pad
    GATE_UP: 11,    // One-way gate (entry from below only)
    GATE_RIGHT: 12, // One-way gate (entry from left only)
    GATE_DOWN: 13,  // One-way gate (entry from above only)
    GATE_LEFT: 14,  // One-way gate (entry from right only)
    KEY: 15,        // Collectible key
    DOOR: 16        // Locked door
};
