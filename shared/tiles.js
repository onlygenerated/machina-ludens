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
    EXIT: 8         // Must reach after solving to complete level
};
