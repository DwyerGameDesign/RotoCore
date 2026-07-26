// ==========================================
// ENEMY TYPES CONFIGURATION
// ==========================================

// Enemy Spawn Rate Configuration (milliseconds between spawns)
// Lower values = faster spawning (more enemies)
// Higher values = slower spawning (fewer enemies)
const ENEMY_SPAWN_INTERVALS = {
    // Retuned to match the shipping Playdate build's "standard" curve.
    // Was: 1000 / 800 / 750 / 700 / 650 — the old opening was twice as slow as the real game.
    phase1: 500,
    phase2: 750,
    phase3: 750,
    phase4: 700,
    phase5: 650
};

// Burst Event Interval Configuration (milliseconds between burst events)
// Defines the min and max time between burst events for each phase
const BURST_INTERVALS = {
    // Shipping build uses 15-20s / 10-15s / 10-15s / 15-20s / 15-22.5s. A prototype
    // session is short, so these are compressed ~30% — waves are the thing worth showing.
    phase1: { min: 10000, max: 14000 },
    phase2: { min: 8000,  max: 12000 },
    phase3: { min: 8000,  max: 12000 },
    phase4: { min: 10000, max: 14000 },
    phase5: { min: 10000, max: 15000 }
};

// The first wave of a run ignores the table above, so nobody quits before seeing one.
const FIRST_BURST_DELAY = { min: 6000, max: 8000 };

// Enemy Types Configuration (geometric shapes)
// spawnWeight: Probability weight for each score bracket
//   phase1: score < SCORE_THRESHOLDS.phase2 (defined in game.js)
//   phase2: score SCORE_THRESHOLDS.phase2 to SCORE_THRESHOLDS.phase3
//   phase3: score SCORE_THRESHOLDS.phase3 to SCORE_THRESHOLDS.phase4
//   phase4: score SCORE_THRESHOLDS.phase4 to SCORE_THRESHOLDS.phase5
//   phase5: score >= SCORE_THRESHOLDS.phase5
// healthScaling: Health multiplier for each score bracket
//   phase1: score < SCORE_THRESHOLDS.phase2
//   phase2: score SCORE_THRESHOLDS.phase2 to SCORE_THRESHOLDS.phase3
//   phase3: score SCORE_THRESHOLDS.phase3 to SCORE_THRESHOLDS.phase4
//   phase4: score SCORE_THRESHOLDS.phase4 to SCORE_THRESHOLDS.phase5
//   phase5: score >= SCORE_THRESHOLDS.phase5
const ENEMY_TYPES = {
    DIAMOND: {
        sides: 4,
        radius: 8,
        speed: 0.45,
        health: 1,
        color: '#fff',
        points: 10,
        rippleAge: 400, // Ripple lifetime in milliseconds (smaller ships = shorter lifetime) = ~60px
        blastWaveAge: 400, // Blast wave lifetime in milliseconds (smaller ships = shorter lifetime)
        screenShake: {
            intensity: 0,  // Moderate screen shake
            duration: 0
        },
        spawnWeight: {
            phase1: 1.0,  // 30% chance in phase 1
            phase2: 0.6,   // 40% chance in phase 2
            phase3: 0.3,   // 30% chance in phase 3
            phase4: 0.25,  // 25% chance in phase 4
            phase5: 0.25    // 20% chance in phase 5
        },
        healthScaling: {
            phase1: 1,  // Base health in phase 1
            phase2: 1, // 1.5x health in phase 2
            phase3: 1,   // 2x health in phase 3
            phase4: 1, // 2.5x health in phase 4
            phase5: 1    // 3x health in phase 5
        }
    },
    CIRCLE: {
        sides: 0, // Special value for circle
        radius: 6,
        speed: 0.7,
        health: 1,
        color: '#fff',
        points: 5,
        rippleAge: 200, // Ripple lifetime in milliseconds (smallest ships = shortest lifetime) = ~30px
        blastWaveAge: 200, // Blast wave lifetime in milliseconds (smallest ships = shortest lifetime)
        screenShake: {
            intensity: 0,  // No screen shake for circles
            duration: 0
        },
        spawnWeight: {
            phase1: 0.0,  // 70% chance in phase 1
            phase2: 0.3,   // 60% chance in phase 2
            phase3: 0.3,   // 40% chance in phase 3
            phase4: 0.25,   // 30% chance in phase 4
            phase5: 0.25    // 20% chance in phase 5
        },
        healthScaling: {
            phase1: 1,  // Base health in phase 1
            phase2: 1, // 1.5x health in phase 2
            phase3: 1,   // 2x health in phase 3
            phase4: 1, // 2.5x health in phase 4
            phase5: 1    // 3x health in phase 5
        }
    },
    SQUARE: {
        sides: 4,
        radius: 14,
        speed: 0.45,
        health: 15,
        color: '#fff',
        points: 10,
        rippleAge: 500, // Ripple lifetime in milliseconds (medium ships = medium lifetime) = ~150px
        blastWaveAge: 600, // Blast wave lifetime in milliseconds (medium ships = medium lifetime)
        screenShake: {
            intensity: 0,  // Moderate screen shake
            duration: 0
        },
        spawnWeight: {
            phase1: 0.0,  // 30% chance in phase 1
            phase2: 0.1,   // 40% chance in phase 2
            phase3: 0.3,   // 30% chance in phase 3
            phase4: 0.25,  // 25% chance in phase 4
            phase5: 0.25    // 20% chance in phase 5
        },
        healthScaling: {
            phase1: 1,  // Base health in phase 1
            phase2: 1, // 1.5x health in phase 2
            phase3: 1,   // 2x health in phase 3
            phase4: 1, // 2.5x health in phase 4
            phase5: 1    // 3x health in phase 5
        }
    },
    PENTAGON: {
        sides: 5,
        radius: 18,
        speed: 0.35,
        health: 50,
        color: '#ccc',
        points: 25,
        rippleAge: 1000, // Ripple lifetime in milliseconds (large ships = longer lifetime) = ~300px
        blastWaveAge: 1200, // Blast wave lifetime in milliseconds (large ships = longer lifetime)
        screenShake: {
            intensity: 3,  // Strong screen shake
            duration: 10
        },
        spawnWeight: {
            phase1: 0.0,  // 0% chance in phase 1
            phase2: 0.0,   // 0% chance in phase 2
            phase3: 0.1,   // 30% chance in phase 3
            phase4: 0.15,  // 35% chance in phase 4
            phase5: 0.15    // 40% chance in phase 5
        },
        healthScaling: {
            phase1: 1,  // Base health in phase 1
            phase2: 1, // 1.5x health in phase 2
            phase3: 1,   // 2x health in phase 3
            phase4: 1, // 2.5x health in phase 4
            phase5: 1    // 3x health in phase 5
        }
    },
    HEXAGON: {
        sides: 6,
        radius: 24,
        speed: 0.25,
        health: 150,
        color: '#aaa',
        points: 50,
        rippleAge: 1500, // Ripple lifetime in milliseconds (largest ships = longest lifetime) = ~450px
        blastWaveAge: 1800, // Blast wave lifetime in milliseconds (largest ships = longest lifetime)
        screenShake: {
            intensity: 5,  // Very strong screen shake
            duration: 12
        },
        spawnWeight: {
            phase1: 0.0,  // 0% chance in phase 1
            phase2: 0.0,   // 0% chance in phase 2
            phase3: 0.0,   // 0% chance in phase 3
            phase4: 0.05,   // 10% chance in phase 4
            phase5: 0.1    // 20% chance in phase 5
        },
        healthScaling: {
            phase1: 1,  // Base health in phase 1
            phase2: 1, // 1.5x health in phase 2
            phase3: 1,   // 2x health in phase 3
            phase4: 1, // 2.5x health in phase 4
            phase5: 1    // 3x health in phase 5
        }
    }
};

// ==========================================
// ENEMY BURST EVENTS CONFIGURATION
// ==========================================

// Burst events spawn multiple enemies at once to break up gameplay
// Each burst event has:
//   name: Identifier for the burst event
//   weight: Weight for weighted random selection (higher = more likely)
//     Can be a number (applies to all phases) or an object with phase-specific weights
//     Weight of 0 means the event is not available for that phase
//     Example: weight: 1.0 or weight: { phase1: 1.0, phase2: 0.5, phase3: 0 }
//   enemies: Array of enemy spawns in this burst
//     Each spawn has:
//       type: Enemy type key (e.g., 'DIAMOND', 'CIRCLE')
//       count: Number of this enemy type to spawn
//       delay: Optional delay in ms before spawning (for wave patterns)
//       position: Optional relative position {rx, ry} (0-1)
const ENEMY_BURST_EVENTS = [
    // PHASE 1 (Target: 10-30 HP)
    {
        name: 'Diamond Swarm',
        weight: { phase1: 1.0, phase2: 0.5, phase3: 0, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'DIAMOND', count: 2, delay: 0, position: { rx: 0, ry: 0.33 }},
            { type: 'DIAMOND', count: 2, delay: 0, position: { rx: 0, ry: 0.66 }},
            { type: 'DIAMOND', count: 2, delay: 0, position: { rx: 1, ry: 0.33 }},
            { type: 'DIAMOND', count: 2, delay: 0, position: { rx: 1, ry: 0.66 }},
            //
            { type: 'DIAMOND', count: 2, delay: 1200, position: { rx: 0, ry: 0.43 }},
            { type: 'DIAMOND', count: 2, delay: 1200, position: { rx: 0, ry: 0.76 }},
            { type: 'DIAMOND', count: 2, delay: 1200, position: { rx: 1, ry: 0.43 }},
            { type: 'DIAMOND', count: 2, delay: 1200, position: { rx: 1, ry: 0.76 }}

        ] // 15 HP
    },
    {
        name: 'Drill Down',
        weight: { phase1: 1.0, phase2: 0.5, phase3: 0, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.2, ry: 0 } },    // Top-Mid
            { type: 'CIRCLE', count: 3, delay: 0, position: { rx: 0.4, ry: 0 } },    // Top-Mid
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.6, ry: 0 } },    // Top-Mid
            { type: 'CIRCLE', count: 3, delay: 0, position: { rx: 0.8, ry: 0 } },    // Top-Mid            
        ] // 7 + 7 = 14 HP
    },
    {
        name: 'Bubble Up',
        weight: { phase1: 1.0, phase2: 0.5, phase3: 0, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'CIRCLE', count: 4, delay: 0, position: { rx: 0.25, ry: 1 }},
            { type: 'CIRCLE', count: 4, delay: 300, position: { rx: 0.5, ry: 1 }},
            { type: 'CIRCLE', count: 4, delay: 0, position: { rx: 0.75, ry: 1 }}                        
        ] // 12 HP
    },

    // PHASE 2 (Target: 30-80 HP)
    {
        name: 'Diamond Cutters',
        weight: { phase1: 0.3, phase2: 1.0, phase3: 0.5, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'DIAMOND', count: 4, delay: 0, position: { rx: 0.5, ry: 0 } },
            { type: 'DIAMOND', count: 4, delay: 0, position: { rx: 1, ry: 0.5 } },
            { type: 'DIAMOND', count: 4, delay: 0, position: { rx: 0.5, ry: 1 } },
            { type: 'DIAMOND', count: 4, delay: 0, position: { rx: 0, ry: 0.5 } }
        ] // 8 * 4 = 32 HP (Low threat, but positional challenge)
    },
    {
        name: 'Circle Rush',
        weight: { phase1: 0, phase2: 1.0, phase3: 0.5, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'CIRCLE', count: 10, delay: 100, position: { rx: 0.5, ry: 0 } },     // Top
            { type: 'CIRCLE', count: 10, delay: 0, position: { rx: 1, ry: 0.5 } },   // Right
            { type: 'CIRCLE', count: 10, delay: 200, position: { rx: 0.5, ry: 1 } }    // Bottom
        ] // 30 HP
    },
    {
        name: 'Four Square',
        weight: { phase1: 0, phase2: 0.8, phase3: 0.6, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 0, ry: 0 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 0.9, ry: 0 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 0, ry: 0.9 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 0.9, ry: 1 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 0.1, ry: 0 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 1, ry: 0.1 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 0.1, ry: 1 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 1, ry: 0.9 } },            
        ] // 5 * 15 = 75 HP
    },
    {
        name: 'Tri-Vector',
        weight: { phase1: 0, phase2: 0.4, phase3: 0.3, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'SQUARE', count: 4, delay: 400, position: { rx: 0.5, ry: 1 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.9, ry: 0 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0, ry: 0.1 } },            
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 1, ry: 0.1 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.1, ry: 0 } }
        ] // 4 * 15 + 8 * 1 = 60 + 8 = 68 HP
    },
    {
        name: 'Tri-Vector',
        weight: { phase1: 0, phase2: 0.4, phase3: 0.3, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'SQUARE', count: 4, delay: 400, position: { rx: 0.5, ry: 0 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.9, ry: 1 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0, ry: 0.9 } },            
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 1, ry: 0.9 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.1, ry: 1 } }
        ] // 4 * 15 + 8 * 1 = 60 + 8 = 68 HP
    },    
    {
        name: 'Closing In',
        weight: { phase1: 0, phase2: 0.8, phase3: 0.6, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'DIAMOND', count: 5, delay: 0, position: { rx: 0, ry: 0.5 } },
            { type: 'DIAMOND', count: 5, delay: 0, position: { rx: 1, ry: 0.5 } },
            { type: 'CIRCLE', count: 10, delay: 100, position: { rx: 0.5, ry: 1 } },
            { type: 'SQUARE', count: 2, delay: 150, position: { rx: 0.5, ry: 1 } }
        ] // 10 * 1 + 10 * 1 + 2 * 15 = 10 + 10 + 30 = 50 HP
    },

    // PHASE 3 (Target: 80-200 HP)
    {
        name: 'Fire Hose',
        weight: { phase1: 0, phase2: 0.3, phase3: 1.0, phase4: 0.5, phase5: 0 },
        enemies: [
            { type: 'CIRCLE', count: 2, delay: 0, position: { rx: 0, ry: 0.5 } },
            { type: 'CIRCLE', count: 2, delay: 500, position: { rx: 0, ry: 0.5 } },
            { type: 'CIRCLE', count: 2, delay: 1000, position: { rx: 0, ry: 0.45 } },
            { type: 'CIRCLE', count: 2, delay: 1500, position: { rx: 0, ry: 0.5 } },
            { type: 'CIRCLE', count: 2, delay: 2000, position: { rx: 0, ry: 0.55 } },
            { type: 'CIRCLE', count: 2, delay: 2500, position: { rx: 0, ry: 0.5 } },
            { type: 'CIRCLE', count: 2, delay: 3000, position: { rx: 0, ry: 0.45 } },
            { type: 'CIRCLE', count: 2, delay: 3500, position: { rx: 0, ry: 0.4 } },
            { type: 'CIRCLE', count: 2, delay: 4000, position: { rx: 0, ry: 0.45 } },
            { type: 'CIRCLE', count: 2, delay: 4500, position: { rx: 0, ry: 0.5 } },
            { type: 'CIRCLE', count: 2, delay: 5000, position: { rx: 0, ry: 0.55 } },
            { type: 'CIRCLE', count: 2, delay: 5500, position: { rx: 0, ry: 0.6 } },
            { type: 'CIRCLE', count: 2, delay: 6000, position: { rx: 0, ry: 0.55 } },
            { type: 'CIRCLE', count: 2, delay: 6500, position: { rx: 0, ry: 0.5 } },
            { type: 'CIRCLE', count: 2, delay: 7000, position: { rx: 0, ry: 0.45 } },
            { type: 'CIRCLE', count: 2, delay: 7500, position: { rx: 0, ry: 0.4 } },                                             
        ] // 6 * 15 = 90 HP
    },
    {
        name: 'Crossfire',
        weight: { phase1: 0, phase2: 0.3, phase3: 1.0, phase4: 0.5, phase5: 0 },
        enemies: [
            { type: 'DIAMOND', count: 2, delay: 0, position: { rx: 0.35, ry: 0 } },
            { type: 'CIRCLE', count: 4, delay: 0, position: { rx: 0.2, ry: 0 } },
            { type: 'SQUARE', count: 1, delay: 0, position: { rx: 0.05, ry: 0 } },      
            { type: 'DIAMOND', count: 2, delay: 500, position: { rx: 0.65, ry: 1 } },     
            { type: 'CIRCLE', count: 4, delay: 500, position: { rx: 0.8, ry: 1 } },      
            { type: 'SQUARE', count: 1, delay: 500, position: { rx: 0.95, ry: 1 } },
            //
            { type: 'DIAMOND', count: 2, delay: 2000, position: { rx: 0.35, ry: 1 } },
            { type: 'CIRCLE', count: 4, delay: 2000, position: { rx: 0.2, ry: 1 } },
            { type: 'SQUARE', count: 1, delay: 2000, position: { rx: 0.05, ry: 1 } },      
            { type: 'DIAMOND', count: 2, delay: 2500, position: { rx: 0.65, ry: 0 } },     
            { type: 'CIRCLE', count: 4, delay: 2500, position: { rx: 0.8, ry: 0 } },      
            { type: 'SQUARE', count: 1, delay: 2500, position: { rx: 0.95, ry: 0 } }                       
        ] // 5 + 8 + 30 = 43 HP
    },        
    {
        name: 'Pincer Attack',
        weight: { phase1: 0, phase2: 0, phase3: 0.8, phase4: 0.6, phase5: 0 },
        enemies: [
            { type: 'SQUARE', count: 3, delay: 0, position: { rx: 0.5, ry: 0 } },    // Top-Mid
            { type: 'SQUARE', count: 3, delay: 0, position: { rx: 0.5, ry: 1 } }     // Bottom-Mid
        ] // 6 * 15 = 90 HP
    },
    {
        name: 'Square Squeeze',
        weight: { phase1: 0, phase2: 0, phase3: 0.8, phase4: 0.6, phase5: 0 },
        enemies: [
            { type: 'SQUARE', count: 2, delay: 0, position: { rx: 0, ry: 0.3 } },    // Left-Mid
            { type: 'SQUARE', count: 2, delay: 0, position: { rx: 1, ry: 0.3 } },     // Right-Mid
            { type: 'SQUARE', count: 2, delay: 0, position: { rx: 0, ry: 0.7 } },    // Left-Mid
            { type: 'SQUARE', count: 2, delay: 0, position: { rx: 1, ry: 0.7 } },
            { type: 'SQUARE', count: 2, delay: 1500, position: { rx: 0, ry: 0.35 } },    // Left-Mid
            { type: 'SQUARE', count: 2, delay: 1500, position: { rx: 1, ry: 0.35 } },     // Right-Mid
            { type: 'SQUARE', count: 2, delay: 1500, position: { rx: 0, ry: 0.65 } },    // Left-Mid
            { type: 'SQUARE', count: 2, delay: 1500, position: { rx: 1, ry: 0.65 } }     // Right-Mid // Right-Mid            
        ] // 6 * 15 = 90 HP
    },
    {
        name: 'Pentagon Escort',
        weight: { phase1: 0, phase2: 0, phase3: 0.7, phase4: 0.8, phase5: 0 },
        enemies: [
            // Pentagons in center-right
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.5 } },
            // Diamonds above and below pentagons
            { type: 'DIAMOND', count: 3, delay: 50, position: { rx: 1, ry: 0.1 } },
            { type: 'DIAMOND', count: 3, delay: 50, position: { rx: 1, ry: 0.9 } },
            // Squares close to pentagons
            { type: 'SQUARE', count: 1, delay: 150, position: { rx: 1, ry: 0.3 } },
            { type: 'SQUARE', count: 1, delay: 150, position: { rx: 1, ry: 0.7 } }
        ] // 2 * 50 + 6 * 1 + 4 * 1 + 2 * 15 = 100 + 6 + 4 + 30 = 140 HP
    },
    {
        name: 'Take Five',
        weight: { phase1: 0, phase2: 0, phase3: 0.25, phase4: 0.35, phase5: 0.4 },
        enemies: [
            // Diagonal wave pattern from top-left to bottom-right
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.1 } },      // Top-Left
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.3 } }, // Diagonal
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.5 } }, // Diagonal            
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.7 } },   // Center
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.9 } }        // Bottom-Right
        ] // 10 * 15 = 150 HP
    },
    {
        name: 'Take Five',
        weight: { phase1: 0, phase2: 0, phase3: 0.25, phase4: 0.35, phase5: 0.4 },
        enemies: [
            // Diagonal wave pattern from top-left to bottom-right
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.1 } },      // Top-Left
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.3 } }, // Diagonal
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.5 } }, // Diagonal            
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.7 } },   // Center
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.9 } }        // Bottom-Right
        ] // 10 * 15 = 150 HP
    },    
    {
        name: 'Vortex Cluster',
        weight: { phase1: 0, phase2: 0, phase3: 0.5, phase4: 0.7, phase5: 0.8 },
        enemies: [
            { type: 'DIAMOND', count: 10, delay: 0, position: { rx: 0.5, ry: 0 } },
            { type: 'CIRCLE', count: 10, delay: 120, position: { rx: 1, ry: 0.5 } },
            { type: 'DIAMOND', count: 10, delay: 240, position: { rx: 0.5, ry: 1 } },
            { type: 'CIRCLE', count: 10, delay: 360, position: { rx: 0, ry: 0.5 } },
            { type: 'SQUARE', count: 3, delay: 480, position: { rx: 0, ry: 0.5 } },
            { type: 'SQUARE', count: 3, delay: 480, position: { rx: 1, ry: 0.5 } },
            { type: 'SQUARE', count: 3, delay: 480, position: { rx: 0.5, ry: 1 } }
        ] // 40 * 1 + 3 * 15 = 40 + 45 = 85 HP
    },


    // PHASE 4 (Target: 200-400 HP)
    {
        name: 'Penta Gone',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 1.0, phase5: 0.6 },
        enemies: [
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0.5, ry: 0 } },    // Top
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.3 } },    // Right
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.3 } },
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0.3, ry: 1 } },    // Top
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0.7, ry: 1 } }    // Right
        ] // 6 * 50 = 300 HP
    },
    {
        name: 'Guardian Advance',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 1.0, phase5: 0.6 },
        enemies: [
            { type: 'SQUARE', count: 8, delay: 0, position: { rx: 0.5, ry: 0 } },      // Top
            { type: 'PENTAGON', count: 1, delay: 100, position: { rx: 0, ry: 0.5 } },  // Left
            { type: 'PENTAGON', count: 1, delay: 100, position: { rx: 1, ry: 0.5 } },  // Right
            { type: 'SQUARE', count: 4, delay: 200, position: { rx: 0.5, ry: 1 } }      // Bottom
        ] // 120 + 100 + 60 = 280 HP
    },

    // PHASE 5 (Target: 400+ HP)
    {
        name: 'Elite Wave',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.5 },
        enemies: [
            { type: 'PENTAGON', count: 4, delay: 0, position: { rx: 0.5, ry: 0 } },    // Top
            { type: 'HEXAGON', count: 1, delay: 50, position: { rx: 0.7, ry: 1 } },  // Center
            { type: 'HEXAGON', count: 1, delay: 50, position: { rx: 0.3, ry: 1 } },  // Center            
            { type: 'SQUARE', count: 3, delay: 100, position: { rx: 0, ry: 0.5 } },   // Left
            { type: 'SQUARE', count: 3, delay: 100, position: { rx: 1, ry: 0.5 } }      // Right
        ] // 200 + 300 + 90 = 590 HP
    },
    {
        name: 'Elite Wave',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.5 },
        enemies: [
            { type: 'PENTAGON', count: 4, delay: 0, position: { rx: 0.5, ry: 1 } },    // Top
            { type: 'HEXAGON', count: 1, delay: 50, position: { rx: 0.7, ry: 0 } },  // Center
            { type: 'HEXAGON', count: 1, delay: 50, position: { rx: 0.3, ry: 0 } },  // Center            
            { type: 'SQUARE', count: 3, delay: 100, position: { rx: 0, ry: 0.5 } },   // Left
            { type: 'SQUARE', count: 3, delay: 100, position: { rx: 1, ry: 0.5 } }      // Right
        ] // 200 + 300 + 90 = 590 HP
    },    
    {
        name: 'Hexagon Armada',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.4 },
        enemies: [
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.75 } },        // Top center - flagships
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.75 } },
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.5, ry: 1 } },            
            { type: 'PENTAGON', count: 2, delay: 50, position: { rx: 0.25, ry: 1 } },    // Top left - escorts
            { type: 'PENTAGON', count: 2, delay: 50, position: { rx: 0.75, ry: 1 } },    // Top right - escorts
            { type: 'SQUARE', count: 4, delay: 100, position: { rx: 0.25, ry: 1 } },     // Left support
            { type: 'SQUARE', count: 4, delay: 100, position: { rx: 0.75, ry: 1 } },      // Right support
            { type: 'CIRCLE', count: 5, delay: 150, position: { rx: 0.25, ry: 1 } },      // Left scouts
            { type: 'CIRCLE', count: 5, delay: 150, position: { rx: 0.75, ry: 1 } }        // Right scouts
        ] // 300 + 200 + 120 + 10 = 630 HP
    },
    {
        name: 'Hexagon Armada',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.4 },
        enemies: [
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0, ry: 0.25 } },        // Top center - flagships
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 1, ry: 0.25 } },
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.5, ry: 0 } },            
            { type: 'PENTAGON', count: 2, delay: 50, position: { rx: 0.25, ry: 0 } },    // Top left - escorts
            { type: 'PENTAGON', count: 2, delay: 50, position: { rx: 0.75, ry: 0 } },    // Top right - escorts
            { type: 'SQUARE', count: 4, delay: 100, position: { rx: 0.25, ry: 0 } },     // Left support
            { type: 'SQUARE', count: 4, delay: 100, position: { rx: 0.75, ry: 0 } },      // Right support
            { type: 'CIRCLE', count: 5, delay: 150, position: { rx: 0.25, ry: 0 } },      // Left scouts
            { type: 'CIRCLE', count: 5, delay: 150, position: { rx: 0.75, ry: 0 } }        // Right scouts
        ] // 300 + 200 + 120 + 10 = 630 HP
    },    

    // NEW EVENTS (Phase 4/5)
    {
        name: 'Speed Demon',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0.7, phase5: 0.8 },
        enemies: [
            // Rapid fire from all cardinal directions
            { type: 'SQUARE', count: 4, delay: 0, position: { rx: 0.5, ry: 0 } },    // Top
            { type: 'CIRCLE', count: 4, delay: 0, position: { rx: 0.5, ry: 0 } },

            { type: 'SQUARE', count: 4, delay: 200, position: { rx: 1, ry: 0.5 } },  // Right
            { type: 'CIRCLE', count: 4, delay: 200, position: { rx: 1, ry: 0.5 } },

            { type: 'SQUARE', count: 4, delay: 400, position: { rx: 0.5, ry: 1 } }, // Bottom
            { type: 'CIRCLE', count: 4, delay: 400, position: { rx: 0.5, ry: 1 } },

            { type: 'SQUARE', count: 4, delay: 600, position: { rx: 0, ry: 0.5 } }, // Left
            { type: 'CIRCLE', count: 4, delay: 600, position: { rx: 0, ry: 0.5 } }
        ] // 16 Squares (240) + 16 Circles (16) = 256 HP
    },
    {
        name: 'Heavy Phalanx',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.35 },
        enemies: [
            // A wall of heavy units spreading horizontally from the top
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.5, ry: 1 } },   // 450 HP
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.75, ry: 1 } },   // 450 HP    
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.25, ry: 1 } },   // 450 HP        
            { type: 'PENTAGON', count: 1, delay: 100, position: { rx: 0, ry: 0.65 } }, // 100 HP
            { type: 'PENTAGON', count: 1, delay: 100, position: { rx: 1, ry: 0.65 } } // 100 HP            
        ] // Total 550 HP
    },
    {
        name: 'Heavy Phalanx',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.35 },
        enemies: [
            // A wall of heavy units spreading horizontally from the top
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.5, ry: 0 } },   // 450 HP
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.75, ry: 0 } },   // 450 HP    
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.25, ry: 0 } },   // 450 HP        
            { type: 'PENTAGON', count: 1, delay: 100, position: { rx: 0, ry: 0.35 } }, // 100 HP
            { type: 'PENTAGON', count: 1, delay: 100, position: { rx: 1, ry: 0.35 } } // 100 HP            
        ] // Total 550 HP
    },    
    {
        name: 'Corner Crush',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0.7, phase5: 0.8 },
        enemies: [
            // Spiral spawn from corners
            { type: 'PENTAGON', count: 1, delay: 0, position: { rx: 0, ry: 0 } },    // Top-Left
            { type: 'SQUARE', count: 3, delay: 0, position: { rx: 0, ry: 0 } },

            { type: 'PENTAGON', count: 1, delay: 200, position: { rx: 1, ry: 0 } },  // Top-Right
            { type: 'SQUARE', count: 3, delay: 200, position: { rx: 1, ry: 0 } },

            { type: 'PENTAGON', count: 1, delay: 400, position: { rx: 1, ry: 1 } },  // Bottom-Right
            { type: 'SQUARE', count: 3, delay: 400, position: { rx: 1, ry: 1 } },

            { type: 'PENTAGON', count: 1, delay: 600, position: { rx: 0, ry: 1 } }, // Bottom-Left
            { type: 'SQUARE', count: 3, delay: 600, position: { rx: 0, ry: 1 } }
        ] // 4 * (50 + 45) = 380 HP
    },
    {
        name: 'The Gauntlet',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.6 },
        enemies: [
            { type: 'PENTAGON', count: 2, delay: 0, position: { rx: 0.35, ry: 1 } },
            { type: 'PENTAGON', count: 2, delay: 0, position: { rx: 0.65, ry: 0 } },
            { type: 'HEXAGON', count: 1, delay: 200, position: { rx: 0.35, ry: 0 } },
            { type: 'HEXAGON', count: 1, delay: 200, position: { rx: 0.65, ry: 1 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.5, ry: 0 } },
            { type: 'DIAMOND', count: 3, delay: 0, position: { rx: 0.5, ry: 1 } }                         
        ] // 4 * 50 + 2 * 150 = 200 + 300 = 500 HP
    },
    {
        name: 'Hexagon Blitz',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.3 },
        enemies: [
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.5, ry: 0 } },
            { type: 'HEXAGON', count: 1, delay: 250, position: { rx: 0.2, ry: 0 } },
            { type: 'HEXAGON', count: 1, delay: 250, position: { rx: 0.8, ry: 0 } },
            { type: 'CIRCLE', count: 3, delay: 500, position: { rx: 1, ry: 0.2 } },
            { type: 'CIRCLE', count: 3, delay: 500, position: { rx: 0, ry: 0.2 } },            
        ] // 3 * 150 = 450 HP
    },
    {
        name: 'Hexagon Blitz',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.3 },
        enemies: [
            { type: 'HEXAGON', count: 1, delay: 0, position: { rx: 0.5, ry: 1 } },
            { type: 'HEXAGON', count: 1, delay: 250, position: { rx: 0.2, ry: 1 } },
            { type: 'HEXAGON', count: 1, delay: 250, position: { rx: 0.8, ry: 1 } },
            { type: 'CIRCLE', count: 3, delay: 500, position: { rx: 1, ry: 0.8 } },
            { type: 'CIRCLE', count: 3, delay: 500, position: { rx: 0, ry: 0.8 } },            
        ] // 3 * 150 = 450 HP
    },    
    {
        name: 'Death Spiral',
        weight: { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0.6 },
        enemies: [
            { type: 'CIRCLE', count: 10, delay: 0, position: { rx: 0.5, ry: 0 } },
            { type: 'SQUARE', count: 8, delay: 50, position: { rx: 1, ry: 0.5 } },
            { type: 'DIAMOND', count: 4, delay: 100, position: { rx: 0.25, ry: 1 } },
            { type: 'DIAMOND', count: 4, delay: 100, position: { rx: 0.75, ry: 1 } },            
            { type: 'SQUARE', count: 8, delay: 150, position: { rx: 0, ry: 0.5 } },
            { type: 'HEXAGON', count: 1, delay: 200, position: { rx: 0.5, ry: 1 } }
        ] // 10 * 1 + 16 * 15 + 8 * 1 + 1 * 150 = 10 + 240 + 8 + 150 = 408 HP
    },
];

// ==========================================
// Waves ported from the shipping Playdate build (enemyTypes.lua).
// Same schema, phase6 weights dropped since the prototype only has five phases.
// ==========================================
const PORTED_BURST_EVENTS = [
    {
        name: 'Raindown',
        weight: { phase1: 1.0, phase2: 1.0, phase3: 0, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'CIRCLE', count: 4, delay: 0,   position: { rx: 0.25, ry: 0 }},
            { type: 'CIRCLE', count: 4, delay: 300, position: { rx: 0.5,  ry: 0 }},
            { type: 'CIRCLE', count: 4, delay: 0,   position: { rx: 0.75, ry: 0 }}
        ]
    },
    {
        name: 'Side Swipers',
        weight: { phase1: 1.0, phase2: 1.0, phase3: 0, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'DIAMOND', count: 3, delay: 0,    position: { rx: 0, ry: 0.4 }},
            { type: 'DIAMOND', count: 3, delay: 500,  position: { rx: 1, ry: 0.6 }},
            { type: 'DIAMOND', count: 4, delay: 1000, position: { rx: 0, ry: 0.6 }},
            { type: 'DIAMOND', count: 4, delay: 1500, position: { rx: 1, ry: 0.4 }}
        ]
    },
    {
        name: 'The Sprinkler',
        weight: { phase1: 0.5, phase2: 0.5, phase3: 0, phase4: 0, phase5: 0 },
        enemies: [
            { type: 'CIRCLE', count: 2, delay: 0,    position: { rx: 0, ry: 0.2 }},
            { type: 'CIRCLE', count: 2, delay: 400,  position: { rx: 0, ry: 0.4 }},
            { type: 'CIRCLE', count: 2, delay: 800,  position: { rx: 0, ry: 0.6 }},
            { type: 'CIRCLE', count: 2, delay: 1200, position: { rx: 0, ry: 0.8 }},
            { type: 'CIRCLE', count: 2, delay: 1600, position: { rx: 0, ry: 0.6 }},
            { type: 'CIRCLE', count: 2, delay: 2000, position: { rx: 0, ry: 0.4 }},
            { type: 'CIRCLE', count: 2, delay: 2400, position: { rx: 0, ry: 0.2 }},
            { type: 'CIRCLE', count: 2, delay: 2800, position: { rx: 0, ry: 0.5 }}
        ]
    },
    {
        name: 'Wide Net',
        weight: { phase1: 0, phase2: 0.6, phase3: 0.3, phase4: 0.1, phase5: 0 },
        enemies: [
            { type: 'DIAMOND', count: 2, delay: 0,   position: { rx: 0.15, ry: 0 }},
            { type: 'DIAMOND', count: 2, delay: 0,   position: { rx: 0.35, ry: 0 }},
            { type: 'DIAMOND', count: 2, delay: 0,   position: { rx: 0.5,  ry: 0 }},
            { type: 'DIAMOND', count: 2, delay: 0,   position: { rx: 0.65, ry: 0 }},
            { type: 'DIAMOND', count: 2, delay: 0,   position: { rx: 0.85, ry: 0 }},
            { type: 'SQUARE',  count: 1, delay: 500, position: { rx: 0,    ry: 0.2 }},
            { type: 'SQUARE',  count: 1, delay: 500, position: { rx: 1,    ry: 0.2 }}
        ]
    },
    {
        name: 'Circle Carousel',
        weight: { phase1: 0, phase2: 1.25, phase3: 0.5, phase4: 0.25, phase5: 0 },
        enemies: [
            { type: 'CIRCLE', count: 8, delay: 0,    position: { rx: 0.5, ry: 0 }},
            { type: 'CIRCLE', count: 8, delay: 600,  position: { rx: 1,   ry: 0.5 }},
            { type: 'CIRCLE', count: 8, delay: 1200, position: { rx: 0.5, ry: 1 }},
            { type: 'CIRCLE', count: 6, delay: 1800, position: { rx: 0,   ry: 0.5 }}
        ]
    },
    {
        name: 'Zigzag Assault',
        weight: { phase1: 0, phase2: 0, phase3: 1.25, phase4: 0.5, phase5: 0.25 },
        enemies: [
            { type: 'CIRCLE',   count: 2, delay: 0,    position: { rx: 0, ry: 0.25 }},
            { type: 'PENTAGON', count: 1, delay: 0,    position: { rx: 0, ry: 0.25 }},
            { type: 'CIRCLE',   count: 2, delay: 1000, position: { rx: 1, ry: 0.5 }},
            { type: 'PENTAGON', count: 1, delay: 1000, position: { rx: 1, ry: 0.5 }},
            { type: 'CIRCLE',   count: 2, delay: 2000, position: { rx: 0, ry: 0.75 }},
            { type: 'PENTAGON', count: 1, delay: 2000, position: { rx: 0, ry: 0.75 }}
        ]
    }
];

ENEMY_BURST_EVENTS.push.apply(ENEMY_BURST_EVENTS, PORTED_BURST_EVENTS);
