// ==========================================
// RotoCore - Playdate-Style Arcade Roguelike
// ==========================================

// Screen Elements
const gameContainer = document.getElementById('gameContainer');

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to Playdate resolution
canvas.width = 400;
canvas.height = 240;

// Game Constants
// Prototype tuning: a keyboard can't do what a crank does, so key rotation is
// faster than the device build's 0.06 d-pad fallback, and ramps up while held.
const ROTATION_SPEED = 0.105;      // was 0.06 — ~2s for a full sweep instead of ~3.5s
const ROTATION_RAMP_FRAMES = 12;   // 0.4s at 30fps to reach full speed
const ROTATION_RAMP_MAX = 1.6;     // ramps to ~1.25s for a full sweep
// NOTE: For Playdate port, replace keyboard input with crank rotation:
// rotation = playdate.getCrankChange() * CRANK_SENSITIVITY
let LASER_DAMAGE = 1.5; // Changed to variable to support ship stats
const DEFAULT_SUPER_LASER_DAMAGE_MULTIPLIER = 3;
const DEFAULT_SUPER_LASER_WIDTH_MULTIPLIER = 4;
const CENTER_DANGER_RADIUS = 14; // Reduced for 400x240
const POWERUP_CORE_INTERVAL_MIN = 15000; // Minimum 15 seconds between powerups
const POWERUP_CORE_INTERVAL_MAX = 25000; // Maximum 25 seconds between powerups
const EXPLOSION_PARTICLES = 8;
const GRID_SIZE = 25; // Grid cell size in pixels (set to 0 to disable grid)

// Burst Event Settings
// Configured in configs/enemies.js via BURST_INTERVALS

// Grid Ripple Constants
const RIPPLE_MAX_DISTANCE_DEFAULT = 225; // Scaled for 400x240
const RIPPLE_MAX_DISTANCE_BLAST_WAVE = 120; // Maximum distance for blast wave ripples
const RIPPLE_MAX_DISTANCE_POWERUP_CORE = 150; // Maximum distance for powerup core explosion ripples
const RIPPLE_WAVE_SPEED = 300; // Ripple wave speed in pixels per second
const RIPPLE_MAX_AGE = 3000; // Maximum age of ripples in milliseconds (fallback safety check)
const RIPPLE_WAVE_WIDTH = 60; // Thickness of the expanding ripple ring in pixels
const RIPPLE_AMPLITUDE = 8; // Base distortion amplitude for ripple effects in pixels

// Enemy Ripple Age Fallback (used if enemy type doesn't have rippleAge defined)
const RIPPLE_MIN_AGE_ENEMY = 500; // Minimum age fallback for smallest ships (ms)

// Score thresholds for game stage progression (5 phases)
const SCORE_THRESHOLDS = {
    phase2: 50,    // Transition to phase 2
    phase3: 250,    // Transition to phase 3
    phase4: 1000,    // Transition to phase 4
    phase5: 2500     // Transition to phase 5
};

// Config files are loaded separately:
// - configs/enemies.js (ENEMY_TYPES)
// - configs/powerups.js (NOVA_BLAST, SUPER_LASER)

// Game State
let gameState = {
    running: false,
    paused: false,
    menuMode: true, // Main menu mode - gameplay runs but enemies don't spawn
    score: 0,
    highscore: parseInt(localStorage.getItem('rotocoreHighScore')) || 0,
    startTime: 0,
    survivalTime: 0,
    lastPowerupCoreTime: 0,
    nextPowerupInterval: 0, // Random interval for next powerup spawn
    spawnIntervalId: null, // ID of the current spawn interval/timeout
    lastBurstEventTime: 0, // Time of last burst event
    lastBurstEventName: null, // Track the most recent burst event
    nextBurstEventInterval: 0, // Random interval for next burst event
    deathCause: null, // Track what killed the player
    initialHighScore: 0, // Track highscore at game start to detect new records
    poweredUpLaser: false, // Whether player has powered up laser
    poweredUpLaserEndTime: 0, // When the powered up laser expires
    powerupLaserDamage: LASER_DAMAGE,
    powerupLaserStartWidth: 0,
    powerupLaserEndWidth: 0,
    timeDilationActive: false, // Whether time dilation is active
    timeDilationEndTime: 0, // When time dilation expires
    deathAnimation: {
        active: false,
        enemy: null,
        phase: 'slowdown', // 'slowdown', 'zoom', 'explosion', 'complete'
        timeScale: 1.0,
        zoom: 1.0,
        cameraX: 0,
        cameraY: 0,
        startTime: 0,
        explosionTime: 0
    }
};

// Game Settings
let gameSettings = {
    screenShake: localStorage.getItem('rotocoreSettingScreenShake') !== 'false', // Default true
    grid: localStorage.getItem('rotocoreSettingGrid') !== 'false' // Default true
};

// Apply initial settings to UI
function updateSettingsUI() {
    const shakeValue = document.querySelector('#toggleShake .setting-value');
    const gridValue = document.querySelector('#toggleGrid .setting-value');

    if (shakeValue) shakeValue.textContent = gameSettings.screenShake ? 'ON' : 'OFF';
    if (gridValue) gridValue.textContent = gameSettings.grid ? 'ON' : 'OFF';

    // Update toggle active states
    const shakeToggle = document.getElementById('toggleShake');
    const gridToggle = document.getElementById('toggleGrid');

    if (shakeToggle) {
        if (gameSettings.screenShake) shakeToggle.classList.add('active');
        else shakeToggle.classList.remove('active');
    }

    if (gridToggle) {
        if (gameSettings.grid) gridToggle.classList.add('active');
        else gridToggle.classList.remove('active');
    }
}

// Player Stats for current run
let runStats = {
    enemiesDestroyed: 0,
    survivalTime: 0,
    powerupsCollected: 0,
    hexagonsDefeated: 0,
    maxScore: 0,
    lastDamageTime: 0,
    flawless60: false,
    diamondsDestroyed: 0,
    circlesDestroyed: 0,
    squaresDestroyed: 0,
    pentagonsDestroyed: 0,
    hexagonsDestroyed: 0
};

// All-time stats
let allTimeStats = {
    enemiesDestroyed: parseInt(localStorage.getItem('rotocoreEnemiesDestroyed')) || 0,
    survivalTime: parseInt(localStorage.getItem('rotocoreSurvivalTime')) || 0,
    powerupsCollected: parseInt(localStorage.getItem('rotocorePowerupsCollected')) || 0,
    hexagonsDefeated: parseInt(localStorage.getItem('rotocoreHexagonsDefeated')) || 0,
    maxScore: parseInt(localStorage.getItem('rotocoreHighScore')) || 0,
    flawless60: localStorage.getItem('rotocoreFlawless60') === 'true',
    
    // NEW STATS
    gamesPlayed: parseInt(localStorage.getItem('rotocoreGamesPlayed')) || 0,
    totalScore: parseInt(localStorage.getItem('rotocoreTotalScore')) || 0,
    
    // Enemy type breakdowns
    diamondsDestroyed: parseInt(localStorage.getItem('rotocoreDiamondsDestroyed')) || 0,
    circlesDestroyed: parseInt(localStorage.getItem('rotocoreCirclesDestroyed')) || 0,
    squaresDestroyed: parseInt(localStorage.getItem('rotocoreSquaresDestroyed')) || 0,
    pentagonsDestroyed: parseInt(localStorage.getItem('rotocorePentagonsDestroyed')) || 0,
    hexagonsDestroyedCount: parseInt(localStorage.getItem('rotocoreHexagonsDestroyedCount')) || 0,
    
    // Burst event deaths
    burstEventDeaths: JSON.parse(localStorage.getItem('rotocoreBurstEventDeaths') || '{}')
};

// Game Arrays
let enemies = [];
let powerupCores = [];
let particles = [];

// Player object (initialized in initGame)
let player = null;

// Powerup helpers
const POWERUP_LOOKUP = {};
const HAS_CONFIGURED_POWERUPS = (typeof POWERUP_POOL !== 'undefined') && Array.isArray(POWERUP_POOL);

if (HAS_CONFIGURED_POWERUPS) {
    POWERUP_POOL.forEach(powerup => {
        if (powerup && powerup.id) {
            POWERUP_LOOKUP[powerup.id] = powerup;
        }
    });
}

function getRandomPowerupConfig() {
    if (!HAS_CONFIGURED_POWERUPS || POWERUP_POOL.length === 0) {
        return null;
    }
    const index = Math.floor(Math.random() * POWERUP_POOL.length);
    return POWERUP_POOL[index];
}

function getPowerupConfigById(id) {
    if (!id) return null;
    return POWERUP_LOOKUP[id] || null;
}

// Visual Effects
let pulsePhase = 0;
let blastWaves = [];
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let playerTrail = [];
let gridRipples = []; // Array of { x, y, startTime, strength }
let starField = [];
let notification = { title: '', subtitle: '', timer: 0, active: false };

// Input State


// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function randomAngle() {
    return Math.random() * Math.PI * 2;
}

function getSpawnPosition() {
    const angle = randomAngle();
    const spawnDistance = canvas.width / 2 + 50;
    return {
        x: canvas.width / 2 + Math.cos(angle) * spawnDistance,
        y: canvas.height / 2 + Math.sin(angle) * spawnDistance
    };
}

function getRandomPowerupInterval() {
    return POWERUP_CORE_INTERVAL_MIN + Math.random() * (POWERUP_CORE_INTERVAL_MAX - POWERUP_CORE_INTERVAL_MIN);
}

function drawPolygon(x, y, radius, sides, rotation, color, fill = true, lineWidth = 2) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Handle circles (sides === 0)
    if (sides === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        if (fill) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    } else {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    ctx.restore();
    
    // Reset fillStyle after restore to prevent pattern objects from persisting
    // This is especially important when drawPolygon is called with a pattern (like in drawTrail)
    ctx.fillStyle = '#fff';
}

function fillPolygonArea(x, y, radius, sides, rotation, color) {
    if (radius <= 0) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (sides === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
    } else {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawStretchedDiamond(x, y, radius, rotation, color, lineWidth, scale = 1) {
    const widthRadius = radius * 0.65 * scale;
    const heightRadius = radius * 1.2 * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.beginPath();
    ctx.moveTo(0, -heightRadius);
    ctx.lineTo(widthRadius, 0);
    ctx.lineTo(0, heightRadius);
    ctx.lineTo(-widthRadius, 0);
    ctx.closePath();

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.restore();
}

function createExplosion(x, y, enemy = null) {
    // Scale explosion based on enemy size/health
    let scale = 1.0;
    let particleCount = EXPLOSION_PARTICLES;
    let blastWaveRadius = 100;
    let shakeIntensity = 0;
    let shakeDuration = 0;

    if (enemy && enemy.type) {
        // Scale based on enemy radius and health
        const baseRadius = enemy.type.radius;
        const healthMultiplier = enemy.healthMultiplier || 1;

        // Calculate scale factor (larger enemies = bigger explosions)
        scale = Math.max(0.5, Math.min(2.0, baseRadius / 16)); // Normalize to square's base radius

        // Scale particle count
        // Base range 8-14 particles, scaled by enemy size
        const minParticles = Math.floor(8 * scale);
        const maxParticles = Math.floor(14 * scale);
        particleCount = minParticles + Math.floor(Math.random() * (maxParticles - minParticles + 1));

        // Blast wave radius will be calculated from ripple age below (to sync with ripple size)

        // Use screen shake from enemy type config if available
        if (enemy.type.screenShake) {
            shakeIntensity = enemy.type.screenShake.intensity;
            shakeDuration = enemy.type.screenShake.duration;
        } else {
            // Fallback: Only shake for larger enemies (not circles - circles have sides: 0 or radius: 8)
            if (enemy.type.sides !== 0 && enemy.type.radius > 8) {
                // Shake intensity based on enemy size and health
                shakeIntensity = Math.max(1, Math.min(5, baseRadius / 10 + healthMultiplier));
                shakeDuration = Math.floor(5 + (baseRadius / 8));
            }
        }
    } else {
        // Default explosion (for powerups, etc.)
        particleCount = EXPLOSION_PARTICLES;
        blastWaveRadius = 100;
        shakeIntensity = 2;
        shakeDuration = 8;
    }

    // Create particles
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 6) * scale; // Random speed 2-8, scaled
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Math.floor(30 * scale),
            maxLife: Math.floor(30 * scale)
        });
    }

    // Add grid ripple for enemy explosions and sync blast wave radius
    // Use non-linear scaling to make small enemies much more subtle
    if (enemy && enemy.type) {
        const radius = enemy.type.radius;
        // Small enemies (radius < 15) get very subtle ripples
        // Larger enemies scale up more dramatically
        const strength = radius < 15
            ? 0.2 + (radius / 15) * 0.3  // Very subtle for small enemies (0.2-0.5)
            : 0.5 + ((radius - 15) / 20) * 1.5;  // Stronger for larger enemies (0.5-2.0+)

        // Get ripple age from enemy config (smaller ships = shorter lifetime, bigger ships = longer lifetime)
        // This makes smaller ship ripples die earlier (smaller size) and bigger ship ripples die later (larger size)
        const maxAgeMs = enemy.type.rippleAge || RIPPLE_MIN_AGE_ENEMY; // Fallback to minimum if not defined

        // Get blast wave age from enemy config (smaller ships = shorter lifetime, bigger ships = longer lifetime)
        const blastWaveAgeMs = enemy.type.blastWaveAge || 400; // Fallback to 400ms if not defined

        // Calculate blast wave radius to match ripple maxDistance (for reference, but wave will grow continuously)
        const rippleMaxDistance = (maxAgeMs / 1000) * RIPPLE_WAVE_SPEED;
        blastWaveRadius = Math.floor(rippleMaxDistance);

        addGridRipple(x, y, strength, maxAgeMs);

        // Create blast wave with age-based lifetime (will grow continuously until it fades)
        createBlastWave(x, y, blastWaveRadius, blastWaveAgeMs);
    } else {
        // Create blast wave on explosion (for non-enemy explosions like powerups)
        createBlastWave(x, y, blastWaveRadius);
    }

    // Trigger screen shake only if intensity > 0
    if (shakeIntensity > 0) {
        triggerScreenShake(shakeIntensity, shakeDuration);
    }
}

// ==========================================
// VISUAL EFFECTS
// ==========================================

function getPulseScale() {
    pulsePhase += 0.05;
    return 1 + Math.sin(pulsePhase) * 0.15; // Oscillates between 0.85 and 1.15
}

function createBlastWave(x, y, maxRadius = 100, maxAge = null) {
    // If maxAge is provided, use it; otherwise calculate from maxRadius
    let blastWaveAge;
    if (maxAge !== null) {
        // Age-based blast wave (for enemy explosions based on ship size)
        blastWaveAge = maxAge;
    } else {
        // Distance-based blast wave (for other effects like powerups)
        // Calculate age from maxRadius assuming it should reach maxRadius
        const growthRate = 8; // pixels per frame
        const framesToReachMax = Math.ceil(maxRadius / growthRate);
        const fadeFrames = 10; // Frames to fade out after reaching max
        blastWaveAge = (framesToReachMax + fadeFrames) * (1000 / 30); // Convert frames to ms (30fps)
    }

    // Convert age from milliseconds to frames (30fps)
    const totalLife = Math.ceil((blastWaveAge / 1000) * 30);

    blastWaves.push({
        x, y,
        radius: 0,
        maxRadius: maxRadius, // Keep for reference but don't enforce it
        lineWidth: 4,
        life: totalLife,
        maxLife: totalLife, // Store max life for alpha calculation
        startTime: Date.now() // Store start time for age-based updates
    });

    // Add grid ripple for blast waves (medium distance)
    addGridRipple(x, y, 0.8, null, RIPPLE_MAX_DISTANCE_BLAST_WAVE);
}

function updateBlastWaves() {
    blastWaves.forEach((wave, i) => {
        // Continue growing while fading away (dissipate effect)
        // All blast waves grow continuously, including nova blasts
        wave.radius += 8; // Doubled for 30fps

        // If this is a Nova blast, apply damage once when the expanding circle reaches enemies
        if (wave.isNovaBlast && wave.damage) {
            enemies.forEach(enemy => {
                // Skip if already dead or already hit by this Nova blast
                if (enemy.health <= 0 || wave.hitEnemies.has(enemy)) {
                    return;
                }

                // Calculate distance from Nova blast center to enemy
                const dx = enemy.x - wave.x;
                const dy = enemy.y - wave.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Check if enemy is within the current expanding circle radius
                // Account for enemy radius so the circle touches the enemy edge
                if (dist <= wave.radius + enemy.type.radius) {
                    // Apply damage when the expanding circle reaches the enemy
                    enemy.health -= wave.damage;
                    // Mark enemy as hit to avoid double-damage
                    wave.hitEnemies.add(enemy);
                }
            });
            // Clear damage after checking to ensure it only applies once
            // But keep checking until all enemies are hit or wave dies
            if (wave.radius >= wave.maxRadius) {
                wave.damage = 0; // Stop checking once we've passed max radius
            }
        }

        if (wave.lineWidth !== undefined) {
            wave.lineWidth = Math.max(0.5, wave.lineWidth - 0.1);
        }
        wave.life--;
        if (wave.life <= 0) blastWaves.splice(i, 1);
    });
}

function drawBlastWaves() {
    blastWaves.forEach((wave) => {
        const maxLife = wave.maxLife || 30;
        // Use line dash to simulate fading/breaking up
        const progress = wave.life / maxLife;

        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = wave.lineWidth || 2;

        if (progress < 0.5) {
            // Break up the line as it fades
            ctx.setLineDash([2, 4]);
        } else {
            ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]); // Reset
    });
}



function triggerScreenShake(intensity, duration) {
    if (!gameSettings.screenShake) return;
    screenShake.intensity = intensity;
    screenShake.duration = duration;
}

function updateScreenShake() {
    if (screenShake.duration > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.duration--;
    } else {
        screenShake.x = 0;
        screenShake.y = 0;
    }
}

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') {
        return { r: 255, g: 255, b: 255 };
    }

    let normalized = hex.replace('#', '');
    if (normalized.length === 3) {
        normalized = normalized.split('').map(ch => ch + ch).join('');
    }

    if (normalized.length !== 6 || /[^0-9a-f]/i.test(normalized)) {
        return { r: 255, g: 255, b: 255 };
    }

    return {
        r: parseInt(normalized.substring(0, 2), 16),
        g: parseInt(normalized.substring(2, 4), 16),
        b: parseInt(normalized.substring(4, 6), 16)
    };
}

function createDitherPattern(pattern, color = '#fff') {
    // Create a pattern from byte array
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(8, 8);
    const { r, g, b } = hexToRgb(color);

    for (let y = 0; y < 8; y++) {
        const byte = pattern[y];
        for (let x = 0; x < 8; x++) {
            const index = (y * 8 + x) * 4;
            const bit = (byte >> (7 - x)) & 1;
            // White pixels for 1, Transparent for 0 (so background shows through)
            imageData.data[index] = r;
            imageData.data[index + 1] = g;
            imageData.data[index + 2] = b;
            imageData.data[index + 3] = bit * 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return ctx.createPattern(canvas, 'repeat');
}

// Pre-defined dither patterns
const DITHER_50 = [0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55];
const DITHER_25 = [0x88, 0x22, 0x88, 0x22, 0x88, 0x22, 0x88, 0x22];
const DITHER_12 = [0x80, 0x00, 0x08, 0x00, 0x80, 0x00, 0x08, 0x00];
const DAMAGE_FILL_PATTERN = createDitherPattern(DITHER_50, '#000');

// ==========================================
// PLAYER UPGRADE SYSTEM
// ==========================================

// Player Upgrade System
let playerUpgrades = {
    rotationSpeed: parseInt(localStorage.getItem('rotocoreUpgradeRotation')) || 0, // 0-5
    laserDamage: parseInt(localStorage.getItem('rotocoreUpgradeDamage')) || 0, // 0-5
    laserWidth: parseInt(localStorage.getItem('rotocoreUpgradeWidth')) || 0, // 0-5
    novaBlast: parseInt(localStorage.getItem('rotocoreUpgradeNovaBlast')) || 0, // 0-5
    superLaser: parseInt(localStorage.getItem('rotocoreUpgradeSuperLaser')) || 0, // 0-5
    tokensCollected: parseInt(localStorage.getItem('rotocoreUpgradeTokens')) || 0 // Total tokens collected
};

// Upgrade screen selection state (0-4: ROTATION, DAMAGE, WIDTH, NOVA BLAST, SUPER LASER)
let selectedUpgradeIndex = 0;

// Upgrade stat calculations
function getRotationSpeed() {
    return 0.05 + (playerUpgrades.rotationSpeed * 0.01); // 0.05 to 0.10 (5 levels)
}

function getLaserDamage() {
    return 1.5 + (playerUpgrades.laserDamage * 0.1); // 1.5 to 2.0 (5 levels)
}

function getLaserWidth() {
    return 6 + (playerUpgrades.laserWidth * 1.2); // 6 to 12 (5 levels)
}

function getNovaBlastRadius() {
    return 125 + (playerUpgrades.novaBlast * 10); // 125 to 175 (5 levels)
}

function getSuperLaserDuration() {
    return 5000 + (playerUpgrades.superLaser * 1000); // 5000ms to 10000ms (5 levels)
}

// Upgrade Token Spawning Configuration
const UPGRADE_TOKEN_SPAWN_CHANCES = {
    0: 0.50,   1: 0.48,   2: 0.46,   3: 0.44,   4: 0.42,
    5: 0.40,   6: 0.38,   7: 0.36,   8: 0.34,   9: 0.32,
    10: 0.30,  11: 0.28,  12: 0.26,  13: 0.24,  14: 0.22,
    15: 0.20,  16: 0.18,  17: 0.16,  18: 0.14,  19: 0.12,
    20: 0.10,  21: 0.09,  22: 0.08,  23: 0.07,  24: 0.06,
    25: 0.05   // 5% chance with all 25 collected (5 categories × 5 levels)
};

const UPGRADE_TOKEN_SPEED = 0.8; // Configurable speed (pixels per frame at 30fps)

// Upgrade token state
let upgradeToken = null; // Only one token can exist at a time
let upgradeTokenSpawned = false; // Track if token spawned this game

// Check if upgrade token should spawn this game
function checkUpgradeTokenSpawn() {
    console.log('[TOKEN DEBUG] checkUpgradeTokenSpawn() called');
    
    if (upgradeTokenSpawned) {
        console.log('[TOKEN DEBUG] Already spawned this game, skipping check');
        return; // Already spawned this game
    }
    
    const tokensCollected = playerUpgrades.tokensCollected;
    const spawnChance = UPGRADE_TOKEN_SPAWN_CHANCES[Math.min(tokensCollected, 25)] || 0.05;
    const roll = Math.random();
    
    console.log('[TOKEN DEBUG] Spawn check:', {
        tokensCollected: tokensCollected,
        spawnChance: spawnChance,
        roll: roll,
        willSpawn: roll < spawnChance
    });
    
    if (roll < spawnChance) {
        console.log('[TOKEN DEBUG] ✓ SUCCESS - Spawning upgrade token!');
        spawnUpgradeToken();
        upgradeTokenSpawned = true;
    } else {
        console.log('[TOKEN DEBUG] ✗ FAILED - Roll was too high, no token this game');
    }
}

// Spawn upgrade token at random edge flying across screen
function spawnUpgradeToken() {
    console.log('[TOKEN DEBUG] spawnUpgradeToken() called');
    
    if (upgradeToken !== null) {
        console.log('[TOKEN DEBUG] Token already exists, aborting spawn');
        return; // Only one at a time
    }
    
    // Random spawn on one of 4 edges
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let x, y, vx, vy;
    
    if (side === 0) { // Top edge
        x = Math.random() * canvas.width;
        y = -20;
        vx = (Math.random() - 0.5) * UPGRADE_TOKEN_SPEED * 2; // Random horizontal component
        vy = UPGRADE_TOKEN_SPEED;
    } else if (side === 1) { // Right edge
        x = canvas.width + 20;
        y = Math.random() * canvas.height;
        vx = -UPGRADE_TOKEN_SPEED;
        vy = (Math.random() - 0.5) * UPGRADE_TOKEN_SPEED * 2; // Random vertical component
    } else if (side === 2) { // Bottom edge
        x = Math.random() * canvas.width;
        y = canvas.height + 20;
        vx = (Math.random() - 0.5) * UPGRADE_TOKEN_SPEED * 2;
        vy = -UPGRADE_TOKEN_SPEED;
    } else { // Left edge
        x = -20;
        y = Math.random() * canvas.height;
        vx = UPGRADE_TOKEN_SPEED;
        vy = (Math.random() - 0.5) * UPGRADE_TOKEN_SPEED * 2;
    }
    
    upgradeToken = { 
        x, 
        y, 
        vx, 
        vy, 
        radius: 8,
        health: 20, // Same health as powerups
        maxHealth: 20
    };
    
    console.log('[TOKEN DEBUG] Token created at:', {
        x: x,
        y: y,
        side: ['top', 'right', 'bottom', 'left'][side],
        vx: vx,
        vy: vy
    });
}

// Update upgrade token position and check for collection
function updateUpgradeToken() {
    if (!upgradeToken) return;
    
    // Apply time dilation if active
    const timeScale = gameState.timeDilationActive ? 0.05 : 1.0;
    
    upgradeToken.x += upgradeToken.vx * timeScale;
    upgradeToken.y += upgradeToken.vy * timeScale;
    
    // Check if off screen (despawn)
    if (upgradeToken.x < -30 || upgradeToken.x > canvas.width + 30 ||
        upgradeToken.y < -30 || upgradeToken.y > canvas.height + 30) {
        upgradeToken = null;
        return;
    }
    
    // Check if destroyed (health-based collection)
    if (upgradeToken.health <= 0) {
        collectUpgradeToken();
        return;
    }
    
    // Check collision with player (can also be collected by touching)
    const dist = distance(upgradeToken.x, upgradeToken.y, player.x, player.y);
    if (dist < upgradeToken.radius + player.size) {
        collectUpgradeToken();
    }
}

// Draw upgrade token as + symbol in circle
function drawUpgradeToken() {
    if (!upgradeToken) return;
    
    const scale = getPulseScale();
    const pulseSize = upgradeToken.radius * scale;
    const accentColor = '#fff';
    
    // Outer ring (matching powerup style)
    ctx.beginPath();
    ctx.arc(upgradeToken.x, upgradeToken.y, pulseSize + 4, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner filled circle
    ctx.beginPath();
    ctx.arc(upgradeToken.x, upgradeToken.y, pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
    
    // Draw + symbol on top (centered)
    const plusSize = pulseSize * 0.6; // Size relative to circle
    ctx.strokeStyle = '#000'; // Black on white circle
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Horizontal line
    ctx.moveTo(upgradeToken.x - plusSize, upgradeToken.y);
    ctx.lineTo(upgradeToken.x + plusSize, upgradeToken.y);
    // Vertical line
    ctx.moveTo(upgradeToken.x, upgradeToken.y - plusSize);
    ctx.lineTo(upgradeToken.x, upgradeToken.y + plusSize);
    ctx.stroke();
    
    // Draw damage effect (like powerups) - fills from outside in
    drawPowerupDamageEffect(upgradeToken, { radiusMultiplier: scale });
}

// Collect upgrade token
function collectUpgradeToken() {
    playerUpgrades.tokensCollected++;
    localStorage.setItem('rotocoreUpgradeTokens', playerUpgrades.tokensCollected);
    upgradeToken = null;
    
    // Visual feedback
    showNotification("UPGRADE TOKEN", "COLLECTED!");
    triggerScreenShake(4, 10);
    
    // Create explosion effect at collection point
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const speed = 2 + Math.random() * 3;
        particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20,
            maxLife: 20
        });
    }
}

// ==========================================
// TRAIL SYSTEM
// ==========================================

function updateTrail(object) {
    playerTrail.push({ x: object.x, y: object.y, angle: object.angle });
    if (playerTrail.length > 5) playerTrail.shift();
}

function drawTrail() {
    // CRITICAL: Clear any clipping paths before drawing trail
    // This prevents dither patterns from filling clipped areas
    ctx.beginPath();
    ctx.fillStyle = '#fff'; // Reset to solid color before drawing
    
    playerTrail.forEach((pos, i) => {
        // Use dither pattern for trail
        // Older items (lower i) are more faded
        // 0-1: DITHER_12 (faint)
        // 2-3: DITHER_25 (medium)
        // 4-5: DITHER_50 (strong)
        let pattern;
        if (i < 2) pattern = createDitherPattern(DITHER_12);
        else if (i < 4) pattern = createDitherPattern(DITHER_25);
        else pattern = createDitherPattern(DITHER_50);

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.angle);

        // Draw trail as filled polygon with dither pattern
        drawPolygon(0, 0, player.size * 0.8, 3, 0, pattern, true, 0);

        ctx.restore();
        
        // Reset fillStyle after restore to prevent dither pattern from persisting
        ctx.fillStyle = '#fff';
    });
    
    // Final reset of fillStyle and clear clipping paths after all trail segments are drawn
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.globalCompositeOperation = 'source-over';
    // Clear any clipping paths that might have been restored
    if (ctx.canvas) {
        const savedTransform = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.beginPath();
        ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.clip();
        ctx.beginPath(); // Clear the clipping path
        ctx.setTransform(savedTransform);
    }
}

// ==========================================
// STAR FIELD & NOTIFICATIONS
// ==========================================

function initStarField() {
    starField = [];
    // Increased count for visibility (less subtle)
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.05 + Math.random() * 0.1; // Slower drift
        starField.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() < 0.3 ? 2 : 1 // 30% chance of bigger star
        });
    }
}

function updateStarField() {
    // If time dilation is active, skip star movement
    if (gameState.timeDilationActive) {
        return;
    }

    starField.forEach(star => {
        // Move stars in their random directions
        star.x += star.vx;
        star.y += star.vy;

        // Wrap around screen edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
    });
}

function drawStarField() {
    ctx.fillStyle = '#fff';
    starField.forEach(star => {
        if (star.size === 1) {
            ctx.fillRect(star.x, star.y, 1, 1);
        } else {
            // Draw small cross for bigger stars
            ctx.fillRect(star.x, star.y, 1, 1);
            ctx.fillRect(star.x - 1, star.y, 3, 1);
            ctx.fillRect(star.x, star.y - 1, 1, 3);
        }
    });
}

function showNotification(title, subtitle) {
    notification.title = title;
    notification.subtitle = subtitle;
    notification.timer = 150; // 5 seconds at 30fps (was 3s)
    notification.active = true;
}

function updateNotification() {
    if (notification.active) {
        notification.timer--;
        if (notification.timer <= 0) {
            notification.active = false;
        }
    }
}

function drawNotification() {
    if (!notification.active) return;

    ctx.save();

    // Dither fade effect based on timer
    // > 60: Solid
    // 30-60: DITHER_50
    // 0-30: DITHER_25
    let fillStyle = '#fff';
    let shadowStyle = '#000';

    if (notification.timer < 30) {
        fillStyle = createDitherPattern(DITHER_25);
        shadowStyle = createDitherPattern(DITHER_25, '#000');
    } else if (notification.timer < 60) {
        fillStyle = createDitherPattern(DITHER_50);
        shadowStyle = createDitherPattern(DITHER_50, '#000');
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Draw Header "BURST EVENT"
    ctx.font = 'bold 10px "Courier Prime", monospace';
    ctx.fillStyle = shadowStyle;
    ctx.fillText(notification.title, canvas.width / 2 + 1, 11); // Higher up (was 21)
    ctx.fillStyle = fillStyle;
    ctx.fillText(notification.title, canvas.width / 2, 10); // Higher up (was 20)

    // Draw Event Name
    ctx.font = '12px "Courier Prime", monospace';
    ctx.fillStyle = shadowStyle;
    ctx.fillText(notification.subtitle, canvas.width / 2 + 1, 26); // Higher up (was 36)
    ctx.fillStyle = fillStyle;
    ctx.fillText(notification.subtitle, canvas.width / 2, 25); // Higher up (was 35)

    ctx.restore();
    
    // CRITICAL: Clear any clipping paths and reset fillStyle after drawing notification
    // This prevents dither patterns from persisting and filling clipped areas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();
    ctx.beginPath();
    ctx.restore();
    ctx.fillStyle = '#fff';
}

// ==========================================
// GRID RIPPLE SYSTEM
// ==========================================

function addGridRipple(x, y, strength, maxAge = null, maxDistance = null) {
    // If maxAge is provided, use it; otherwise calculate from maxDistance
    // If neither is provided, use default maxDistance and calculate age from it
    let rippleMaxAge;
    let rippleMaxDistance;

    if (maxAge !== null) {
        // Age-based ripple (for enemy explosions based on ship size)
        rippleMaxAge = maxAge;
        rippleMaxDistance = (maxAge / 1000) * RIPPLE_WAVE_SPEED; // Calculate distance from age
    } else if (maxDistance !== null) {
        // Distance-based ripple (for other effects like blast waves, powerups)
        rippleMaxDistance = maxDistance;
        rippleMaxAge = (maxDistance / RIPPLE_WAVE_SPEED) * 1000; // Calculate age from distance
    } else {
        // Default: use default distance and calculate age
        rippleMaxDistance = RIPPLE_MAX_DISTANCE_DEFAULT;
        rippleMaxAge = (RIPPLE_MAX_DISTANCE_DEFAULT / RIPPLE_WAVE_SPEED) * 1000;
    }

    gridRipples.push({
        x: x,
        y: y,
        startTime: Date.now(),
        strength: strength,
        maxAge: rippleMaxAge, // Maximum age in milliseconds
        maxDistance: rippleMaxDistance // Maximum distance the ripple can travel (calculated from age)
    });
}

function updateGridRipples() {
    const now = Date.now();

    // Remove ripples that have exceeded their maxAge or maxDistance
    gridRipples = gridRipples.filter(ripple => {
        const age = now - ripple.startTime;
        const elapsed = age / 1000; // seconds
        const distanceTraveled = elapsed * RIPPLE_WAVE_SPEED;

        // Remove if exceeded max age (with safety check) OR if traveled beyond maxDistance
        return age < Math.min(ripple.maxAge, RIPPLE_MAX_AGE) && distanceTraveled < ripple.maxDistance;
    });
}

function getGridOffsetAtPoint(x, y, currentTime) {
    let offsetX = 0;
    let offsetY = 0;

    gridRipples.forEach(ripple => {
        const elapsed = (currentTime - ripple.startTime) / 1000; // seconds
        const distance = Math.sqrt((x - ripple.x) ** 2 + (y - ripple.y) ** 2);
        const waveFront = elapsed * RIPPLE_WAVE_SPEED;

        if (waveFront > ripple.maxDistance) return;

        const distFromWave = Math.abs(distance - waveFront);

        if (distFromWave < RIPPLE_WAVE_WIDTH) {
            const distanceRemaining = ripple.maxDistance - waveFront;
            const fadeStart = RIPPLE_WAVE_WIDTH * 2;
            const fadeFactor = Math.min(1.0, distanceRemaining / fadeStart);

            const waveIntensity = (1 - (distFromWave / RIPPLE_WAVE_WIDTH)) * fadeFactor;
            const angle = Math.atan2(y - ripple.y, x - ripple.x);
            const wavePhase = (distance - waveFront) / RIPPLE_WAVE_WIDTH * Math.PI;
            const displacement = Math.sin(wavePhase) * RIPPLE_AMPLITUDE * ripple.strength * waveIntensity;

            offsetX += Math.cos(angle) * displacement;
            offsetY += Math.sin(angle) * displacement;
        }
    });

    return { offsetX, offsetY };
}

function drawBackgroundGrid() {
    if (GRID_SIZE === 0 || !gameSettings.grid) {
        return;
    }

    const gridSize = GRID_SIZE;
    const dotsPerSegment = 3;
    const dashLength = 2;
    const dashThickness = 0.3;
    const halfDashLength = dashLength / 2;
    const halfDashThickness = dashThickness / 2;
    const currentTime = Date.now();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const buildAlignedPositions = (max, center, spacing) => {
        const positions = [];
        for (let pos = center; pos <= max; pos += spacing) {
            positions.push(pos);
        }
        for (let pos = center - spacing; pos >= 0; pos -= spacing) {
            positions.push(pos);
        }
        if (!positions.some(p => Math.abs(p) < 0.001)) positions.push(0);
        if (!positions.some(p => Math.abs(p - max) < 0.001)) positions.push(max);
        positions.sort((a, b) => a - b);

        const unique = [];
        positions.forEach(pos => {
            if (unique.length === 0 || Math.abs(unique[unique.length - 1] - pos) > 0.001) {
                unique.push(pos);
            }
        });
        return unique;
    };

    const xPositions = buildAlignedPositions(canvas.width, centerX, gridSize);
    const yPositions = buildAlignedPositions(canvas.height, centerY, gridSize);

    ctx.fillStyle = '#fff';

    // Vertical line dashes (skip intersections, place 3 between each)
    xPositions.forEach(x => {
        for (let i = 0; i < yPositions.length - 1; i++) {
            const startY = yPositions[i];
            const endY = yPositions[i + 1];
            const segmentLength = endY - startY;
            if (segmentLength <= 0) continue;
            const spacing = segmentLength / (dotsPerSegment + 1);

            for (let j = 1; j <= dotsPerSegment; j++) {
                const dotY = startY + j * spacing;
                if (dotY < 0 || dotY > canvas.height) continue;
                const { offsetX, offsetY } = getGridOffsetAtPoint(x, dotY, currentTime);
                const drawX = x + offsetX;
                const drawY = dotY + offsetY;
                ctx.fillRect(drawX - halfDashLength, drawY - halfDashThickness, dashLength, dashThickness);
            }
        }
    });

    // Horizontal line dashes
    yPositions.forEach(y => {
        for (let i = 0; i < xPositions.length - 1; i++) {
            const startX = xPositions[i];
            const endX = xPositions[i + 1];
            const segmentLength = endX - startX;
            if (segmentLength <= 0) continue;
            const spacing = segmentLength / (dotsPerSegment + 1);

            for (let j = 1; j <= dotsPerSegment; j++) {
                const dotX = startX + j * spacing;
                if (dotX < 0 || dotX > canvas.width) continue;
                const { offsetX, offsetY } = getGridOffsetAtPoint(dotX, y, currentTime);
                const drawX = dotX + offsetX;
                const drawY = y + offsetY;
                ctx.fillRect(drawX - halfDashThickness, drawY - halfDashLength, dashThickness, dashLength);
            }
        }
    });
}

// MENU NAVIGATION
// ==========================================

function showScreen(screen) {
    const statsScreen = document.getElementById('statsScreen');
    [gameContainer, statsScreen].filter(s => s !== null).forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// ==========================================
// GAME INITIALIZATION
// ==========================================

function initGame() {
    // Clear any existing spawn interval
    if (gameState.spawnIntervalId !== null) {
        clearTimeout(gameState.spawnIntervalId);
        gameState.spawnIntervalId = null;
    }

    // Reset game state
    gameState.running = true;
    gameState.paused = false;
    gameState.menuMode = false; // Exit menu mode when starting game
    gameState.score = 0;
    gameState.initialHighScore = gameState.highscore; // Store initial highscore for comparison
    gameState.startTime = Date.now();
    gameState.lastPowerupCoreTime = Date.now();
    gameState.nextPowerupInterval = getRandomPowerupInterval();
    gameState.lastBurstEventTime = Date.now();
    gameState.lastBurstEventName = null;
    gameState.nextBurstEventInterval = getRandomBurstEventInterval();
    gameState.deathCause = null;
    gameState.poweredUpLaser = false;
    gameState.poweredUpLaserEndTime = 0;
    gameState.powerupLaserDamage = LASER_DAMAGE;
    gameState.powerupLaserStartWidth = 0;
    gameState.powerupLaserEndWidth = 0;
    gameState.timeDilationActive = false;
    gameState.timeDilationEndTime = 0;
    gameState.deathAnimation.active = false;
    gameState.deathAnimation.enemy = null;
    gameState.deathAnimation.phase = 'slowdown';
    gameState.deathAnimation.timeScale = 1.0;
    gameState.deathAnimation.zoom = 1.0;
    gameState.deathAnimation.playerExploded = false;

    // Reset run stats
    runStats = {
        enemiesDestroyed: 0,
        survivalTime: 0,
        powerupsCollected: 0,
        hexagonsDefeated: 0,
        maxScore: 0,
        lastDamageTime: Date.now(),
        flawless60: false,
        diamondsDestroyed: 0,
        circlesDestroyed: 0,
        squaresDestroyed: 0,
        pentagonsDestroyed: 0,
        hexagonsDestroyed: 0
    };

    // Reset upgrade token state
    upgradeToken = null;
    upgradeTokenSpawned = false;

    // Initialize player with upgraded stats
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: 0,
        size: 12,
        rotatingLeft: false,
        rotatingRight: false,
        rotationSpeed: getRotationSpeed(), // Use upgraded value
        laserStartWidth: getLaserWidth(), // Use upgraded value
        laserEndWidth: getLaserWidth() // Use upgraded value
    };
    
    // Set laser damage to upgraded value
    LASER_DAMAGE = getLaserDamage();

    // Clear arrays
    enemies = [];
    powerupCores = [];
    particles = [];

    // Reset visual effects
    pulsePhase = 0;
    blastWaves = [];
    screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    playerTrail = [];
    gridRipples = [];
    initStarField();
    notification = { title: '', subtitle: '', timer: 0, active: false };

    // Update HUD
    updateHUD();

    // Check if upgrade token should spawn this game
    checkUpgradeTokenSpawn();

    // Start game loop
    requestAnimationFrame(gameLoop);

    // Start enemy spawning with phase-based intervals
    scheduleNextEnemySpawn();
    // Spawn first enemy immediately
    spawnEnemy();
}

// Helper function to format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Function to determine rank and division from score
function getScoreRank(score) {
    // GOD (25,000+)
    if (score >= 30000) return { rank: 'GOD', division: 'III', class: 'rank-god' };
    if (score >= 27500) return { rank: 'GOD', division: 'II', class: 'rank-god' };
    if (score >= 25000) return { rank: 'GOD', division: 'I', class: 'rank-god' };
    
    // LEGENDARY (17,500-24,999)
    if (score >= 22500) return { rank: 'LEGENDARY', division: 'III', class: 'rank-legendary' };
    if (score >= 20000) return { rank: 'LEGENDARY', division: 'II', class: 'rank-legendary' };
    if (score >= 17500) return { rank: 'LEGENDARY', division: 'I', class: 'rank-legendary' };
    
    // CHAMPION (12,500-17,499)
    if (score >= 15500) return { rank: 'CHAMPION', division: 'III', class: 'rank-champion' };
    if (score >= 14000) return { rank: 'CHAMPION', division: 'II', class: 'rank-champion' };
    if (score >= 12500) return { rank: 'CHAMPION', division: 'I', class: 'rank-champion' };
    
    // ELITE (9,000-12,499)
    if (score >= 11000) return { rank: 'ELITE', division: 'III', class: 'rank-elite' };
    if (score >= 10000) return { rank: 'ELITE', division: 'II', class: 'rank-elite' };
    if (score >= 9000) return { rank: 'ELITE', division: 'I', class: 'rank-elite' };
    
    // DIAMOND (6,500-8,999)
    if (score >= 8000) return { rank: 'DIAMOND', division: 'III', class: 'rank-diamond' };
    if (score >= 7250) return { rank: 'DIAMOND', division: 'II', class: 'rank-diamond' };
    if (score >= 6500) return { rank: 'DIAMOND', division: 'I', class: 'rank-diamond' };
    
    // PLATINUM (4,500-6,499)
    if (score >= 5750) return { rank: 'PLATINUM', division: 'III', class: 'rank-platinum' };
    if (score >= 5125) return { rank: 'PLATINUM', division: 'II', class: 'rank-platinum' };
    if (score >= 4500) return { rank: 'PLATINUM', division: 'I', class: 'rank-platinum' };
    
    // GOLD (2,500-4,499)
    if (score >= 3750) return { rank: 'GOLD', division: 'III', class: 'rank-gold' };
    if (score >= 3125) return { rank: 'GOLD', division: 'II', class: 'rank-gold' };
    if (score >= 2500) return { rank: 'GOLD', division: 'I', class: 'rank-gold' };
    
    // SILVER (1,000-2,499)
    if (score >= 2000) return { rank: 'SILVER', division: 'III', class: 'rank-silver' };
    if (score >= 1500) return { rank: 'SILVER', division: 'II', class: 'rank-silver' };
    if (score >= 1000) return { rank: 'SILVER', division: 'I', class: 'rank-silver' };
    
    // BRONZE (0-999)
    if (score >= 500) return { rank: 'BRONZE', division: 'III', class: 'rank-bronze' };
    if (score >= 250) return { rank: 'BRONZE', division: 'II', class: 'rank-bronze' };
    return { rank: 'BRONZE', division: 'I', class: 'rank-bronze' };
}

// Helper function to get enemy type name
function getEnemyTypeName(enemyType) {
    if (enemyType === ENEMY_TYPES.DIAMOND) return 'DIAMOND';
    if (enemyType === ENEMY_TYPES.CIRCLE) return 'CIRCLE';
    if (enemyType === ENEMY_TYPES.SQUARE) return 'SQUARE';
    if (enemyType === ENEMY_TYPES.PENTAGON) return 'PENTAGON';
    if (enemyType === ENEMY_TYPES.HEXAGON) return 'HEXAGON';
    return 'ENEMY';
}

function updateHUD() {
    document.getElementById('score').textContent = formatNumber(gameState.score);
    document.getElementById('highscore').textContent = formatNumber(gameState.highscore);
}

// ==========================================
// ENEMY SPAWNING
// ==========================================

// Helper function to get current phase bracket based on score
function getCurrentPhase() {
    if (gameState.score < SCORE_THRESHOLDS.phase2) {
        return 'phase1';
    } else if (gameState.score < SCORE_THRESHOLDS.phase3) {
        return 'phase2';
    } else if (gameState.score < SCORE_THRESHOLDS.phase4) {
        return 'phase3';
    } else if (gameState.score < SCORE_THRESHOLDS.phase5) {
        return 'phase4';
    } else {
        return 'phase5';
    }
}

// Schedule next enemy spawn based on current phase
function scheduleNextEnemySpawn() {
    // Clear any existing spawn timer
    if (gameState.spawnIntervalId !== null) {
        clearTimeout(gameState.spawnIntervalId);
        gameState.spawnIntervalId = null;
    }

    if (!gameState.running || gameState.paused || gameState.menuMode) return;

    // Get current phase and corresponding spawn interval
    const currentPhase = getCurrentPhase();
    const spawnInterval = ENEMY_SPAWN_INTERVALS[currentPhase];

    // Schedule next spawn
    gameState.spawnIntervalId = setTimeout(() => {
        spawnEnemy();
        scheduleNextEnemySpawn(); // Schedule the next one
    }, spawnInterval);
}

function spawnEnemy() {
    if (!gameState.running || gameState.paused || gameState.menuMode) return;

    const difficulty = Math.min(gameState.score / 500, 3); // Scale up to 3x

    // Determine score bracket (5 phases)
    const bracket = getCurrentPhase();

    // Build weighted list of available enemy types for this bracket
    const availableTypes = [];
    Object.values(ENEMY_TYPES).forEach(type => {
        if (type.spawnWeight[bracket] > 0) {
            availableTypes.push({
                type: type,
                weight: type.spawnWeight[bracket]
            });
        }
    });

    // Calculate total weight
    const totalWeight = availableTypes.reduce((sum, item) => sum + item.weight, 0);

    // Select enemy type based on weighted random
    const rand = Math.random() * totalWeight;
    let accumulatedWeight = 0;
    let selectedType = availableTypes[0].type; // Fallback

    for (const item of availableTypes) {
        accumulatedWeight += item.weight;
        if (rand <= accumulatedWeight) {
            selectedType = item.type;
            break;
        }
    }

    // Get health multiplier from enemy type's healthScaling config
    const healthMultiplier = selectedType.healthScaling[bracket];
    const baseHealth = selectedType.health;
    const scaledHealth = Math.floor(baseHealth * healthMultiplier);

    const pos = getSpawnPosition();
    // Diamonds are squares rotated 45 degrees
    const initialRotation = selectedType === ENEMY_TYPES.DIAMOND ? Math.PI / 4 : 0;
    enemies.push({
        x: pos.x,
        y: pos.y,
        type: selectedType,
        health: scaledHealth,
        maxHealth: scaledHealth,
        healthMultiplier: healthMultiplier, // Store multiplier for border thickness
        rotation: initialRotation,
        lastSpawnTime: null // Used for hexagon periodic spawning
    });
}

// ==========================================
// BURST EVENT FUNCTIONS
// ==========================================

// Get random burst event interval (phase-based setting)
function getRandomBurstEventInterval() {
    // Prototype pacing: the first wave of a run comes early so every player sees one.
    // lastBurstEventName is null at the start of a run and set once a wave fires.
    if (!gameState.lastBurstEventName && typeof FIRST_BURST_DELAY !== 'undefined') {
        return FIRST_BURST_DELAY.min + Math.random() * (FIRST_BURST_DELAY.max - FIRST_BURST_DELAY.min);
    }
    const currentPhase = getCurrentPhase();
    const config = BURST_INTERVALS[currentPhase] || BURST_INTERVALS.phase1; // Fallback to phase1
    return config.min + Math.random() * (config.max - config.min);
}

// Get available burst events for current phase (weight > 0)
function getAvailableBurstEvents() {
    const currentPhase = getCurrentPhase();
    return ENEMY_BURST_EVENTS.filter(event => {
        // Get weight for current phase
        let weight;
        if (typeof event.weight === 'number') {
            // Single weight applies to all phases
            weight = event.weight;
        } else if (typeof event.weight === 'object' && event.weight[currentPhase] !== undefined) {
            // Phase-specific weight
            weight = event.weight[currentPhase];
        } else {
            // Default weight if not specified
            weight = 0;
        }
        // Only include events with weight > 0
        return weight > 0;
    });
}

// Select a burst event using weighted random selection
function selectWeightedBurstEvent(availableEvents) {
    const currentPhase = getCurrentPhase();
    
    // Calculate total weight for all available events
    let totalWeight = 0;
    const weights = availableEvents.map(event => {
        // Get weight for current phase
        let weight;
        if (typeof event.weight === 'number') {
            // Single weight applies to all phases
            weight = event.weight;
        } else if (typeof event.weight === 'object' && event.weight[currentPhase] !== undefined) {
            // Phase-specific weight
            weight = event.weight[currentPhase];
        } else {
            // Default weight if not specified
            weight = 1.0;
        }
        totalWeight += weight;
        return weight;
    });
    
    // If no weights or total is 0, fall back to uniform random
    if (totalWeight === 0) {
        return availableEvents[Math.floor(Math.random() * availableEvents.length)];
    }
    
    // Select random value between 0 and totalWeight
    let random = Math.random() * totalWeight;
    
    // Find which event this random value corresponds to
    for (let i = 0; i < availableEvents.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return availableEvents[i];
        }
    }
    
    // Fallback (shouldn't reach here, but just in case)
    return availableEvents[availableEvents.length - 1];
}

// Spawn a single enemy for burst events (helper function)
function spawnBurstEnemy(enemyTypeKey, bracket, position = null, index = 0, totalCount = 1) {
    const enemyType = ENEMY_TYPES[enemyTypeKey];
    if (!enemyType) return;

    // Get health multiplier from enemy type's healthScaling config
    const healthMultiplier = enemyType.healthScaling[bracket];
    const baseHealth = enemyType.health;
    const scaledHealth = Math.floor(baseHealth * healthMultiplier);

    let pos;
    if (position) {
        // Use relative position (0-1) mapped to canvas dimensions
        const baseX = position.rx * canvas.width;
        const baseY = position.ry * canvas.height;

        // Calculate offset to prevent stacking
        let offsetX = 0;
        let offsetY = 0;

        if (totalCount > 1) {
            const spread = 40; // Pixels between enemies
            const totalSpread = (totalCount - 1) * spread;
            const startOffset = -totalSpread / 2;
            const currentOffset = startOffset + (index * spread);

            // Determine spread direction based on spawn edge
            // If spawning on Left/Right edges (rx near 0 or 1), spread vertically
            // If spawning on Top/Bottom edges (ry near 0 or 1), spread horizontally
            const isVerticalEdge = position.rx < 0.2 || position.rx > 0.8;
            const isHorizontalEdge = position.ry < 0.2 || position.ry > 0.8;

            if (isVerticalEdge) {
                offsetY = currentOffset;
            } else if (isHorizontalEdge) {
                offsetX = currentOffset;
            } else {
                // Default to horizontal spread for center/other spawns
                offsetX = currentOffset;
            }
        }

        // Add slight randomness to avoid perfect lines
        offsetX += (Math.random() * 10 - 5);
        offsetY += (Math.random() * 10 - 5);

        pos = {
            x: baseX + offsetX,
            y: baseY + offsetY
        };
    } else {
        pos = getSpawnPosition();
    }

    // Diamonds are squares rotated 45 degrees
    const initialRotation = enemyType === ENEMY_TYPES.DIAMOND ? Math.PI / 4 : 0;
    enemies.push({
        x: pos.x,
        y: pos.y,
        type: enemyType,
        health: scaledHealth,
        maxHealth: scaledHealth,
        healthMultiplier: healthMultiplier,
        rotation: initialRotation,
        lastSpawnTime: null
    });
}

// Trigger a burst event
function triggerBurstEvent() {
    if (!gameState.running || gameState.paused) return;

    const availableEvents = getAvailableBurstEvents();
    if (availableEvents.length === 0) return;

    // Select a weighted random burst event from available ones
    const selectedEvent = selectWeightedBurstEvent(availableEvents);
    const bracket = getCurrentPhase();

    // Debug message for burst event
    const totalEnemies = selectedEvent.enemies.reduce((sum, group) => sum + group.count, 0);
    console.log(`[BURST EVENT] ${selectedEvent.name} - Phase: ${bracket} - Spawning ${totalEnemies} enemies`);

    // Use event name for notification with 1 second delay
    setTimeout(() => {
        if (gameState.running) {
            showNotification("BURST EVENT", selectedEvent.name.toUpperCase());
        }
    }, 500);

    // Spawn all enemies in the burst event
    selectedEvent.enemies.forEach(spawnGroup => {
        const enemyTypeKey = spawnGroup.type;
        const count = spawnGroup.count;
        const delay = spawnGroup.delay || 0;

        // Spawn each enemy with optional delay for wave patterns
        for (let i = 0; i < count; i++) {
            if (delay > 0) {
                setTimeout(() => {
                    spawnBurstEnemy(enemyTypeKey, bracket, spawnGroup.position, i, count);
                }, delay + (i * 50)); // Stagger spawns slightly even within same group
            } else {
                spawnBurstEnemy(enemyTypeKey, bracket, spawnGroup.position, i, count);
            }
        }
    });

    // Schedule next burst event
    gameState.lastBurstEventTime = Date.now();
    gameState.lastBurstEventName = selectedEvent.name;
    gameState.nextBurstEventInterval = getRandomBurstEventInterval();
}

function spawnCircle(x, y) {
    if (!gameState.running || gameState.paused) return;

    // Determine score bracket (5 phases)
    let bracket;
    if (gameState.score < SCORE_THRESHOLDS.phase2) {
        bracket = 'phase1';
    } else if (gameState.score < SCORE_THRESHOLDS.phase3) {
        bracket = 'phase2';
    } else if (gameState.score < SCORE_THRESHOLDS.phase4) {
        bracket = 'phase3';
    } else if (gameState.score < SCORE_THRESHOLDS.phase5) {
        bracket = 'phase4';
    } else {
        bracket = 'phase5';
    }

    // Get health multiplier from circle's healthScaling config
    const healthMultiplier = ENEMY_TYPES.CIRCLE.healthScaling[bracket];
    const baseHealth = ENEMY_TYPES.CIRCLE.health;
    const scaledHealth = Math.floor(baseHealth * healthMultiplier);

    enemies.push({
        x: x,
        y: y,
        type: ENEMY_TYPES.CIRCLE,
        health: scaledHealth,
        maxHealth: scaledHealth,
        healthMultiplier: healthMultiplier,
        rotation: 0
    });
}

function spawnDiamond(x, y) {
    if (!gameState.running || gameState.paused) return;

    // Determine score bracket (5 phases)
    let bracket;
    if (gameState.score < SCORE_THRESHOLDS.phase2) {
        bracket = 'phase1';
    } else if (gameState.score < SCORE_THRESHOLDS.phase3) {
        bracket = 'phase2';
    } else if (gameState.score < SCORE_THRESHOLDS.phase4) {
        bracket = 'phase3';
    } else if (gameState.score < SCORE_THRESHOLDS.phase5) {
        bracket = 'phase4';
    } else {
        bracket = 'phase5';
    }

    // Get health multiplier from diamond's healthScaling config
    const healthMultiplier = ENEMY_TYPES.DIAMOND.healthScaling[bracket];
    const baseHealth = ENEMY_TYPES.DIAMOND.health;
    const scaledHealth = Math.floor(baseHealth * healthMultiplier);

    // Diamonds are squares rotated 45 degrees
    enemies.push({
        x: x,
        y: y,
        type: ENEMY_TYPES.DIAMOND,
        health: scaledHealth,
        maxHealth: scaledHealth,
        healthMultiplier: healthMultiplier,
        rotation: Math.PI / 4
    });
}

function getPowerupSpawnPosition() {
    // Spawn powerup cores within the play area (canvas bounds)
    // Keep them away from edges and center for better gameplay
    const margin = 50;
    const minDistFromCenter = 100;
    const maxDistFromCenter = Math.min(canvas.width, canvas.height) / 2 - margin;

    // Try to find a valid position
    for (let attempts = 0; attempts < 50; attempts++) {
        const angle = randomAngle();
        const distance = minDistFromCenter + Math.random() * (maxDistFromCenter - minDistFromCenter);
        const x = canvas.width / 2 + Math.cos(angle) * distance;
        const y = canvas.height / 2 + Math.sin(angle) * distance;

        // Ensure it's within canvas bounds
        if (x >= margin && x <= canvas.width - margin &&
            y >= margin && y <= canvas.height - margin) {
            return { x, y };
        }
    }

    // Fallback: random position within bounds
    return {
        x: margin + Math.random() * (canvas.width - 2 * margin),
        y: margin + Math.random() * (canvas.height - 2 * margin)
    };
}

function spawnPowerupCore() {
    if (powerupCores.length > 0) return; // Only one at a time

    const selectedPowerup = getRandomPowerupConfig();
    if (!selectedPowerup) return;

    const pos = getPowerupSpawnPosition();
    powerupCores.push({
        x: pos.x,
        y: pos.y,
        radius: 8,
        health: 20, // Requires 10 hits to destroy
        maxHealth: 20,
        powerupId: selectedPowerup.id,
        animationOffset: Math.random() * Math.PI * 2
    });
}

// ==========================================
// POWERUP SYSTEM - Auto-Apply Nova Blast
// ==========================================

function createRadialPulse(x, y, maxRadius = 300) {
    // Create a big radial pulse effect
    blastWaves.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: maxRadius,
        life: 60, // Longer duration for bigger pulse
        maxLife: 60, // Store max life for alpha calculation
        lineWidth: 4
    });
}

function createLaserChargeBurst(x, y) {
    // Layered expanding rings
    for (let i = 0; i < 3; i++) {
        blastWaves.push({
            x,
            y,
            radius: 0,
            maxRadius: 120 + i * 30,
            life: 35,
            maxLife: 35,
            lineWidth: 2 + i
        });
    }

    // Radiating line particles to sell the laser charge-up
    for (let i = 0; i < 10; i++) {
        particles.push({
            type: 'line',
            x,
            y,
            angle: randomAngle(),
            length: 20 + Math.random() * 25,
            life: 20,
            maxLife: 20
        });
    }
}

function activateSuperLaserPowerup(powerupConfig, core) {
    const duration = getSuperLaserDuration(); // Use upgraded duration

    createLaserChargeBurst(core.x, core.y);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create big radial pulse from center to show the buff
    createRadialPulse(centerX, centerY, 400);

    gameState.poweredUpLaser = true;
    gameState.poweredUpLaserEndTime = Date.now() + duration;
    gameState.powerupLaserDamage = (powerupConfig && powerupConfig.laserDamage) || LASER_DAMAGE;
    gameState.powerupLaserStartWidth = (powerupConfig && powerupConfig.laserStartWidth) || player.laserStartWidth;
    gameState.powerupLaserEndWidth = (powerupConfig && powerupConfig.laserEndWidth) || player.laserEndWidth;

    // Screen shake
    triggerScreenShake(8, 20);
}

function activateTimeDilationPowerup(powerupConfig, core) {
    const duration = (powerupConfig && powerupConfig.duration) || 10000;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create big radial pulse from center to show the time freeze effect
    createRadialPulse(centerX, centerY, 400);

    gameState.timeDilationActive = true;
    gameState.timeDilationEndTime = Date.now() + duration;

    // Screen shake
    triggerScreenShake(8, 20);
}

function recordPowerupCollection() {
    runStats.powerupsCollected++;
    allTimeStats.powerupsCollected++;
    localStorage.setItem('rotocorePowerupsCollected', allTimeStats.powerupsCollected);
}

function handlePowerupCollection(core) {
    const config = getPowerupConfigById(core.powerupId);

    if (config && config.id === 'super_laser') {
        // Slightly tighter ripple to differentiate visually
        addGridRipple(core.x, core.y, 1.0, null, RIPPLE_MAX_DISTANCE_POWERUP_CORE * 0.75);
        activateSuperLaserPowerup(config, core);
    } else if (config && config.id === 'time_dilation') {
        // Time dilation ripple effect
        addGridRipple(core.x, core.y, 1.2, null, RIPPLE_MAX_DISTANCE_POWERUP_CORE);
        activateTimeDilationPowerup(config, core);
    } else {
        // Default to Nova blast visuals/damage
        addGridRipple(core.x, core.y, 1.5, null, RIPPLE_MAX_DISTANCE_POWERUP_CORE);
        applyNovaBlast(core.x, core.y);
    }

    recordPowerupCollection();
}

function applyNovaBlast(x, y) {
    // Use upgraded Nova Blast radius
    const radius = getNovaBlastRadius();
    const damage = NOVA_BLAST.damage;

    // Create particles for visual explosion effect (like enemy explosions)
    const scale = radius / 16; // Scale based on nova blast radius
    const particleCount = Math.floor(EXPLOSION_PARTICLES * scale * 2); // More particles for bigger explosion

    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i;
        const speed = (4 + Math.random() * 4) * scale;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Math.floor(30 * scale),
            maxLife: Math.floor(30 * scale)
        });
    }

    // Create expanding blast wave that starts at 0 and grows outward (like enemy explosions)
    // Calculate age from radius assuming it should reach maxRadius
    const growthRate = 8; // pixels per frame
    const framesToReachMax = Math.ceil(radius / growthRate);
    const fadeFrames = 10; // Frames to fade out after reaching max
    const blastWaveAge = (framesToReachMax + fadeFrames) * (1000 / 30); // Convert frames to ms (30fps)
    const totalLife = Math.ceil((blastWaveAge / 1000) * 30);

    blastWaves.push({
        x: x,
        y: y,
        radius: 0, // Start at 0 and grow outward like enemy explosions
        maxRadius: radius, // Keep for reference
        lineWidth: 6, // Thicker line for more impact
        life: totalLife,
        maxLife: totalLife, // Store max life for alpha calculation
        isNovaBlast: true, // Mark as Nova blast
        damage: damage, // Store damage amount
        hitEnemies: new Set() // Track which enemies have been hit to avoid double-damage
    });

    // Add grid ripple for Nova blast explosion - matches radius size
    addGridRipple(x, y, 2.0, null, radius); // Strong ripple matching the blast radius

    // Screen shake
    triggerScreenShake(6, 15);
}

// ==========================================
// PLAYER & RENDERING
// ==========================================

function drawCenter() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw danger radius indicator (subtle)
    ctx.beginPath();
    ctx.arc(centerX, centerY, CENTER_DANGER_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([2, 4]); // Dashed line for danger zone
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawPlayer() {
    // Don't draw player after it has exploded
    if (gameState.deathAnimation.active && gameState.deathAnimation.playerExploded) {
        return;
    }

    // Simple triangle ship (always the same - no visual variations)
    const size = player.size;
    
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Draw simple white triangle
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    
    // If powered up, draw with glow effect
    if (gameState.poweredUpLaser) {
        // Fill triangle
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        // Outer glow outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Center dot
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        
        // Outer outline (larger triangle)
        const outerSize = size + 5;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
            const px = Math.cos(angle) * outerSize;
            const py = Math.sin(angle) * outerSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        // Normal triangle outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    ctx.restore();
}

function drawLaser() {
    // Don't draw laser after player has exploded or when game is not running
    if (gameState.deathAnimation.playerExploded || !gameState.running) {
        return;
    }

    const laserLength = canvas.width;
    const tipOffset = player.size; // Distance from center to tip of triangle

    // Main laser - starts from the tip of the triangle
    // Triangle tip is at (0, +player.size) in rotated coordinate system (pointing downward)
    
    // CRITICAL: Reset fillStyle BEFORE save to prevent dither patterns from being saved
    // If fillStyle is already a dither pattern, it will be saved and could affect subsequent drawing
    ctx.fillStyle = '#fff';
    
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const time = Date.now();
    const animationSpeed = 8; // Speed of lines moving down the laser

    // Helper function to get width at a given y position in the cone
    const getWidthAtY = (y, startW, endW) => {
        const progress = (y - tipOffset) / laserLength;
        return startW + (endW - startW) * progress;
    };

    // Powered up laser - wider cone with DITHER_50 pattern
    if (gameState.poweredUpLaser) {
        const startWidth = gameState.powerupLaserStartWidth || player.laserStartWidth;
        const endWidth = gameState.powerupLaserEndWidth || player.laserEndWidth;

        // Draw cone shape (trapezoid) with DITHER_50 pattern
        const ditherPattern = createDitherPattern(DITHER_50);
        ctx.fillStyle = ditherPattern;
        ctx.beginPath();
        ctx.moveTo(-startWidth / 2, tipOffset); // Top left
        ctx.lineTo(startWidth / 2, tipOffset); // Top right
        ctx.lineTo(endWidth / 2, tipOffset + laserLength); // Bottom right
        ctx.lineTo(-endWidth / 2, tipOffset + laserLength); // Bottom left
        ctx.closePath();
        ctx.fill();

        // Enhanced animated lines shooting down the laser (faster and more frequent)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        const lineSpacing = 12;
        const lineSpeed = animationSpeed * 1.5; // Faster for super laser
        const lineOffset = (time / lineSpeed) % (lineSpacing * 2);

        for (let i = -lineSpacing * 2; i < laserLength + lineSpacing * 2; i += lineSpacing * 2) {
            const y = tipOffset + i + lineOffset;
            if (y >= tipOffset && y <= tipOffset + laserLength) {
                const widthAtY = getWidthAtY(y, startWidth, endWidth);
                ctx.beginPath();
                ctx.moveTo(-widthAtY / 2, y);
                ctx.lineTo(widthAtY / 2, y);
                ctx.stroke();
            }
        }

        // Additional diagonal energy lines for super laser effect
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        const diagonalSpacing = 20;
        const diagonalOffset = (time / (animationSpeed * 0.8)) % (diagonalSpacing * 2);

        for (let i = -diagonalSpacing * 2; i < laserLength + diagonalSpacing * 2; i += diagonalSpacing * 2) {
            const y = tipOffset + i + diagonalOffset;
            if (y >= tipOffset && y <= tipOffset + laserLength) {
                const widthAtY = getWidthAtY(y, startWidth, endWidth);
                ctx.beginPath();
                ctx.moveTo(-widthAtY / 2, y);
                ctx.lineTo(widthAtY / 2, y + diagonalSpacing * 0.5);
                ctx.stroke();
            }
        }
    } else {
        // Normal laser with cone shape (start/end width)
        const startWidth = player.laserStartWidth;
        const endWidth = player.laserEndWidth;

        // Draw cone shape (trapezoid) with dithering pattern
        const baseDither = createDitherPattern(DITHER_25);
        ctx.fillStyle = baseDither;
        ctx.beginPath();
        ctx.moveTo(-startWidth / 2, tipOffset); // Top left
        ctx.lineTo(startWidth / 2, tipOffset); // Top right
        ctx.lineTo(endWidth / 2, tipOffset + laserLength); // Bottom right
        ctx.lineTo(-endWidth / 2, tipOffset + laserLength); // Bottom left
        ctx.closePath();
        ctx.fill();

        // Animated lines shooting down the laser
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        const lineSpacing = 16;
        const lineOffset = (time / animationSpeed) % (lineSpacing * 2);

        for (let i = -lineSpacing * 2; i < laserLength + lineSpacing * 2; i += lineSpacing * 2) {
            const y = tipOffset + i + lineOffset;
            if (y >= tipOffset && y <= tipOffset + laserLength) {
                const widthAtY = getWidthAtY(y, startWidth, endWidth);
                ctx.beginPath();
                ctx.moveTo(-widthAtY / 2, y);
                ctx.lineTo(widthAtY / 2, y);
                ctx.stroke();
            }
        }

        // Additional energy streaks
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        const streakSpacing = 24;
        const streakOffset = (time / (animationSpeed * 1.2)) % (streakSpacing * 2);

        for (let i = -streakSpacing * 2; i < laserLength + streakSpacing * 2; i += streakSpacing * 2) {
            const y = tipOffset + i + streakOffset;
            if (y >= tipOffset && y <= tipOffset + laserLength) {
                const widthAtY = getWidthAtY(y, startWidth, endWidth);
                // Draw short diagonal streaks
                const streakLength = widthAtY * 0.3;
                ctx.beginPath();
                ctx.moveTo(-widthAtY / 2 + streakLength, y);
                ctx.lineTo(-widthAtY / 2, y + streakLength);
                ctx.moveTo(widthAtY / 2 - streakLength, y);
                ctx.lineTo(widthAtY / 2, y + streakLength);
                ctx.stroke();
            }
        }
    }

    ctx.restore();
    
    // Reset fillStyle after restore to prevent dither pattern from persisting
    // This ensures that subsequent drawing operations (like drawPlayer) start with a clean fillStyle
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); // Clear any clipping paths that might persist
}

function drawEnemies() {
    // Dither patterns for different states
    const ditherPatterns = {
        damage: [0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55], // Checkerboard
        lowHealth: [0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00], // Horizontal lines
        shield: [0x88, 0x44, 0x22, 0x11, 0x88, 0x44, 0x22, 0x11]  // Diagonal pattern
    };

    enemies.forEach(enemy => {
        const healthPercent = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));

        // Calculate border thickness based on health multiplier
        // Base: 2px, 3x health: 4px, 5x+ health: 6px
        const multiplier = enemy.healthMultiplier || 1; // Fallback for old enemies
        const borderThickness = multiplier === 1 ? 2 :
            multiplier === 3 ? 4 : 6;

        const isDiamond = enemy.type === ENEMY_TYPES.DIAMOND;

        // Determine fill style based on enemy type (dither patterns)
        let bodyFillStyle = '#fff';
        if (enemy.type === ENEMY_TYPES.SQUARE) {
            // Use a lighter dither so the interior remains obviously hollow
            bodyFillStyle = createDitherPattern(DITHER_25);
        } else if (enemy.type === ENEMY_TYPES.PENTAGON) {
            bodyFillStyle = createDitherPattern(DITHER_25);
        } else if (enemy.type === ENEMY_TYPES.HEXAGON) {
            bodyFillStyle = createDitherPattern(DITHER_50);
        }

        const usesDamageFill = enemy.type === ENEMY_TYPES.SQUARE ||
            enemy.type === ENEMY_TYPES.PENTAGON ||
            enemy.type === ENEMY_TYPES.HEXAGON;

        if (isDiamond) {
            drawStretchedDiamond(enemy.x, enemy.y, enemy.type.radius, enemy.rotation, bodyFillStyle, borderThickness);
        } else if (usesDamageFill) {
            drawPolygon(enemy.x, enemy.y, enemy.type.radius, enemy.type.sides, enemy.rotation, '#fff', false, borderThickness);

            const fillRatio = 1 - healthPercent;
            if (fillRatio > 0) {
                const fillRadius = enemy.type.radius * fillRatio;
                fillPolygonArea(enemy.x, enemy.y, fillRadius, enemy.type.sides, enemy.rotation, bodyFillStyle);
            }
        } else {
            // Circles (sides === 0) should not be filled, other polygons should be filled
            const shouldFill = enemy.type.sides !== 0;
            drawPolygon(enemy.x, enemy.y, enemy.type.radius, enemy.type.sides, enemy.rotation, bodyFillStyle, shouldFill, borderThickness);
        }

        // Apply flashing effect for low health enemies
        if (healthPercent < 0.3) {
            // Flash effect - alternate between visible and invisible based on time
            const flashRate = Math.floor(Date.now() / 100) % 2;
            if (flashRate === 0) {
                // Draw additional inner outline to show damage
                ctx.save();
                // No alpha, just draw outline
                if (isDiamond) {
                    drawStretchedDiamond(enemy.x, enemy.y, enemy.type.radius, enemy.rotation, '#fff', 1, 0.7);
                } else {
                    drawPolygon(enemy.x, enemy.y, enemy.type.radius * 0.7, enemy.type.sides, enemy.rotation, '#fff', false, 1);
                }
                ctx.restore();
            }
        }
    });
}

function drawPowerupCores() {
    powerupCores.forEach(core => {
        const config = getPowerupConfigById(core.powerupId);
        const accentColor = (config && config.color) || '#fff';

        if (config && config.id === 'super_laser') {
            drawSuperLaserPowerupCore(core, accentColor);
        } else if (config && config.id === 'time_dilation') {
            drawTimeDilationPowerupCore(core, accentColor);
        } else {
            drawNovaBlastPowerupCore(core, accentColor);
        }
    });
}

function drawPowerupDamageEffect(core, options = {}) {
    if (!core || core.maxHealth <= 0) return;

    const healthPercent = Math.max(0, Math.min(1, core.health / core.maxHealth));
    if (healthPercent >= 1) return;

    const fillRatio = 1 - healthPercent;
    if (fillRatio <= 0) return;

    const radiusMultiplier = options.radiusMultiplier || 1;
    const sides = options.sides !== undefined ? options.sides : 0;
    const rotation = options.rotation || 0;
    const fillStyle = options.fillStyle || DAMAGE_FILL_PATTERN;

    fillPolygonArea(
        core.x,
        core.y,
        core.radius * radiusMultiplier * fillRatio,
        sides,
        rotation,
        fillStyle
    );
}

function drawNovaBlastPowerupCore(core, accentColor) {
    const scale = getPulseScale();
    const pulseSize = core.radius * scale;

    // Outer ring
    ctx.beginPath();
    ctx.arc(core.x, core.y, pulseSize + 4, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Crosshair lines to sell it as an explosive charge
    ctx.beginPath();
    ctx.moveTo(core.x - (pulseSize + 6), core.y);
    ctx.lineTo(core.x + (pulseSize + 6), core.y);
    ctx.moveTo(core.x, core.y - (pulseSize + 6));
    ctx.lineTo(core.x, core.y + (pulseSize + 6));
    ctx.stroke();

    // Inner filled circle
    ctx.beginPath();
    ctx.arc(core.x, core.y, pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    // Overlay damage fill matching enemy visual language
    drawPowerupDamageEffect(core, { radiusMultiplier: scale });

    // Center dot
    ctx.beginPath();
    ctx.arc(core.x, core.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
}

function drawSuperLaserPowerupCore(core, accentColor) {
    const scale = getPulseScale();
    const baseSize = core.radius * 1.4 * scale; // Slightly smaller than before to account for solid mass

    // Outer ring (matching Nova Blast style)
    ctx.beginPath();
    ctx.arc(core.x, core.y, baseSize + 4, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(core.x, core.y);

    // Solid filled triangle
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI / 2) + i * (Math.PI * 2 / 3);
        const x = Math.cos(angle) * baseSize;
        const y = Math.sin(angle) * baseSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Fill with accent color
    ctx.fillStyle = accentColor;
    ctx.fill();

    // Add a small black dot in center for contrast (like Nova Blast)
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();

    ctx.restore();

    // Damage fill overlay (matches triangle geometry)
    drawPowerupDamageEffect(core, {
        sides: 3,
        rotation: Math.PI, // Rotated to match the drawing above
        radiusMultiplier: 1.4 * scale
    });
}

function drawTimeDilationPowerupCore(core, accentColor) {
    const scale = getPulseScale();
    const clockRadius = core.radius * 1.2 * scale; // Clock face radius, similar size to other powerups

    // Outer ring (matching other powerup styles)
    ctx.beginPath();
    ctx.arc(core.x, core.y, clockRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(core.x, core.y);

    // Draw small ticks around the outside (12 hour positions)
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    const tickCount = 12;
    const tickDistance = clockRadius * 0.9;
    const tickLength = 3;
    
    for (let i = 0; i < tickCount; i++) {
        const angle = (i * Math.PI * 2 / tickCount) - Math.PI / 2; // Start at top (12 o'clock)
        const startX = Math.cos(angle) * tickDistance;
        const startY = Math.sin(angle) * tickDistance;
        const endX = Math.cos(angle) * (tickDistance + tickLength);
        const endY = Math.sin(angle) * (tickDistance + tickLength);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Draw clock hands (pointing to 3 o'clock)
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Hour hand (shorter, pointing to 3)
    const hourHandLength = clockRadius * 0.4;
    const hourAngle = 0; // 3 o'clock = 0 radians
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hourAngle) * hourHandLength, Math.sin(hourAngle) * hourHandLength);
    ctx.stroke();

    // Minute hand (longer, pointing to 12)
    const minuteHandLength = clockRadius * 0.6;
    const minuteAngle = -Math.PI / 2; // 12 o'clock = -90 degrees
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(minuteAngle) * minuteHandLength, Math.sin(minuteAngle) * minuteHandLength);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.restore();

    // Damage fill overlay (matches circle geometry)
    drawPowerupDamageEffect(core, { radiusMultiplier: 1.2 * scale });
}

function drawParticles() {
    particles.forEach(particle => {
        // Blink particles near end of life
        if (particle.life < 10 && particle.life % 2 === 0) return;

        // Handle line-type particles (impact lines)
        if (particle.type === 'line') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            const endX = particle.x + Math.cos(particle.angle) * particle.length;
            const endY = particle.y + Math.sin(particle.angle) * particle.length;
            ctx.lineTo(endX, endY);
            ctx.stroke();
        } else {
            // Regular particle
            ctx.fillStyle = '#fff';
            ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
        }
    });
}

// ==========================================
// GAME LOGIC
// ==========================================

function updatePlayer() {
    // Apply death animation time scale
    const timeScale = gameState.deathAnimation.active ? gameState.deathAnimation.timeScale : 1.0;

    // Hold-to-accelerate: a tap is precise, a hold sweeps quickly.
    if (player.rotatingLeft || player.rotatingRight) {
        player.rotHold = Math.min((player.rotHold || 0) + 1, ROTATION_RAMP_FRAMES);
    } else {
        player.rotHold = 0;
    }
    const rotRamp = 1 + (ROTATION_RAMP_MAX - 1) * ((player.rotHold || 0) / ROTATION_RAMP_FRAMES);

    if (player.rotatingLeft) {
        player.angle -= player.rotationSpeed * rotRamp * timeScale;
    }
    if (player.rotatingRight) {
        player.angle += player.rotationSpeed * rotRamp * timeScale;
    }
    // Update trail for player
    updateTrail(player);
}

function updateEnemies() {
    const timeScale = gameState.deathAnimation.active ? gameState.deathAnimation.timeScale : 1.0;

    enemies.forEach(enemy => {
        // If time dilation is active, allow very slow movement (5% speed) toward center
        if (gameState.timeDilationActive) {
            enemy.rotation += 0.02 * timeScale;
            
            // Move toward center at 2.5% speed
            const dx = canvas.width / 2 - enemy.x;
            const dy = canvas.height / 2 - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > CENTER_DANGER_RADIUS) {
                const slowSpeed = enemy.type.speed * 0.15; // 15% of normal speed
                enemy.x += (dx / dist) * slowSpeed;
                enemy.y += (dy / dist) * slowSpeed;
            }
            return;
        }

        // Apply fire damage over time
        if (enemy.onFire && enemy.fireUntil) {
            if (Date.now() < enemy.fireUntil) {
                // Apply fire damage every 100ms
                if (!enemy.lastFireDamage || Date.now() - enemy.lastFireDamage >= 100) {
                    enemy.health -= enemy.fireDPS * 0.1; // DPS per 100ms
                    enemy.lastFireDamage = Date.now();
                }
            } else {
                // Fire expired
                enemy.onFire = false;
                enemy.fireUntil = null;
                enemy.fireDPS = null;
            }
        }

        // Update impact slowdown effect
        if (enemy.impactSlowdown !== undefined && enemy.impactSlowdownUntil) {
            if (Date.now() < enemy.impactSlowdownUntil) {
                // Gradually recover speed over the duration
                const elapsed = Date.now() - (enemy.impactSlowdownUntil - 200);
                const progress = Math.min(elapsed / 200, 1.0);
                // Interpolate from 0.4 (40% speed) to 1.0 (100% speed)
                enemy.impactSlowdown = 0.4 + (0.6 * progress);
            } else {
                // Slowdown expired, remove it
                enemy.impactSlowdown = undefined;
                enemy.impactSlowdownUntil = undefined;
            }
        }

        // Check if enemy is frozen
        if (enemy.frozen && enemy.frozenUntil && Date.now() < enemy.frozenUntil) {
            // Enemy is frozen, don't move
            enemy.rotation += 0.02 * timeScale;
            return;
        } else if (enemy.frozen) {
            // Unfreeze
            enemy.frozen = false;
        }

        // Move toward center
        const dx = canvas.width / 2 - enemy.x;
        const dy = canvas.height / 2 - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > CENTER_DANGER_RADIUS) {
            // Apply slow field if active
            let speed = enemy.type.speed;

            // Apply impact slowdown if active
            if (enemy.impactSlowdown !== undefined) {
                speed *= enemy.impactSlowdown;
            }

            // Apply death animation time scale if active
            if (gameState.deathAnimation.active) {
                speed *= gameState.deathAnimation.timeScale;
            }

            enemy.x += (dx / dist) * speed;
            enemy.y += (dy / dist) * speed;
        } else {
            // Enemy reached center - trigger death animation
            if (!gameState.deathAnimation.active) {
                triggerDeathAnimation(enemy);
            }

            // During death animation, allow enemy to continue moving slowly toward center
            if (gameState.deathAnimation.active && gameState.deathAnimation.enemy === enemy) {
                const animSpeed = enemy.type.speed * gameState.deathAnimation.timeScale * 0.5;
                enemy.x += (dx / dist) * animSpeed;
                enemy.y += (dy / dist) * animSpeed;
            }
        }

        enemy.rotation += 0.02 * timeScale;

        // Hexagon spawns circles to the side at intervals
        if (enemy.type === ENEMY_TYPES.HEXAGON) {
            const now = Date.now();
            const spawnInterval = 3000; // 3 seconds

            // Initialize lastSpawnTime if not set
            if (!enemy.lastSpawnTime) {
                enemy.lastSpawnTime = now;
            }

            if (now - enemy.lastSpawnTime >= spawnInterval) {
                enemy.lastSpawnTime = now;

                // Calculate perpendicular direction for side spawning
                if (dist > 0) {
                    const perpX = -dy / dist; // Perpendicular to movement direction
                    const perpY = dx / dist;
                    const sideOffset = 25; // Distance to the side

                    // Spawn circle to the left side
                    const leftX = enemy.x + perpX * sideOffset;
                    const leftY = enemy.y + perpY * sideOffset;
                    spawnCircle(leftX, leftY);
                }
            }
        }
    });
}

function checkPowerupCoreCollection() {
    let damage = gameState.poweredUpLaser 
        ? (gameState.powerupLaserDamage || LASER_DAMAGE)
        : LASER_DAMAGE;

    powerupCores.forEach((core, index) => {
        // Check if laser hits the powerup core (checkLaserHit now calculates cone width internally)
        if (checkLaserHit(core, player.angle)) {
            core.health -= damage;
        }

        // Check if destroyed
        if (core.health <= 0) {
            // Resolve the specific powerup effect
            handlePowerupCollection(core);

            // Remove the powerup core
            powerupCores.splice(index, 1);

            // Reset timer so next powerup spawns after random interval (15-25s) after this one is collected
            gameState.lastPowerupCoreTime = Date.now();
            gameState.nextPowerupInterval = getRandomPowerupInterval();
        }
    });
}

function checkUpgradeTokenDamage() {
    if (!upgradeToken) return;
    
    let damage = gameState.poweredUpLaser 
        ? (gameState.powerupLaserDamage || LASER_DAMAGE)
        : LASER_DAMAGE;

    // Check if laser hits the upgrade token
    if (checkLaserHit(upgradeToken, player.angle)) {
        upgradeToken.health -= damage;
    }
}

function updateParticles() {
    const timeScale = gameState.deathAnimation.active ? gameState.deathAnimation.timeScale : 1.0;
    particles.forEach(particle => {
        particle.x += particle.vx * timeScale;
        particle.y += particle.vy * timeScale;
        particle.life--;
    });
    particles = particles.filter(p => p.life > 0);
}


function checkLaserCollisions() {
    // Don't allow damage during death animation - enemy is invulnerable
    if (gameState.deathAnimation.active) {
        return;
    }

    // Powered up laser uses configured damage
    let damage = gameState.poweredUpLaser 
        ? (gameState.powerupLaserDamage || LASER_DAMAGE)
        : LASER_DAMAGE;

    enemies.forEach(enemy => {
        // Skip the death animation enemy - it's invulnerable
        if (gameState.deathAnimation.active && gameState.deathAnimation.enemy === enemy) {
            return;
        }

        let hit = false;
        let hitAngle = player.angle;

        // Check main laser only (checkLaserHit now calculates cone width internally)
        if (checkLaserHit(enemy, player.angle)) {
            enemy.health -= damage;
            hit = true;
            hitAngle = player.angle;

            // Apply impact slowdown effect
            enemy.impactSlowdown = 0.4; // Slow down to 40% speed
            enemy.impactSlowdownUntil = Date.now() + 200; // Lasts 200ms
        }

        // Create impact effect when hit
        if (hit) {
            // Impact effect removed for optimization
        }
    });
}

function isInPlayArea(x, y) {
    // Check if a point is within the canvas bounds (play area)
    return x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height;
}

function isEnemyVisible(target) {
    // Check if any part of the enemy is visible on screen
    // Get target radius (enemies have type.radius, powerup cores have radius directly)
    const targetRadius = target.type ? target.type.radius : (target.radius || 0);

    // Check if the enemy's bounding box intersects with the canvas bounds
    // Enemy is visible if any part of it (center Â± radius) is within or overlaps the canvas
    const minX = target.x - targetRadius;
    const maxX = target.x + targetRadius;
    const minY = target.y - targetRadius;
    const maxY = target.y + targetRadius;

    // Check if bounding box overlaps with canvas (0 to canvas.width/height)
    return maxX >= 0 && minX <= canvas.width && maxY >= 0 && minY <= canvas.height;
}

function checkLaserHit(target, laserAngle, maxDistance = null) {
    // Don't damage targets that are completely outside the play area
    // But allow damage if any part of the enemy is visible
    if (!isEnemyVisible(target)) {
        return false;
    }

    // Calculate tip position (triangle tip is at angle laserAngle + Math.PI/2 from center, pointing downward)
    const tipX = player.x + Math.cos(laserAngle + Math.PI / 2) * player.size;
    const tipY = player.y + Math.sin(laserAngle + Math.PI / 2) * player.size;

    // Laser direction vector
    const laserDirection = laserAngle + Math.PI / 2;
    const laserDirX = Math.cos(laserDirection);
    const laserDirY = Math.sin(laserDirection);

    // Get target radius (enemies have type.radius, powerup cores have radius directly)
    const targetRadius = target.type ? target.type.radius : (target.radius || 0);

    // Vector from laser tip to target center
    const dx = target.x - tipX;
    const dy = target.y - tipY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Laser starts at the tip of the triangle
    if (dist < 1) return false; // Target is at or behind the laser start point

    // Check if target is within laser range (account for target radius)
    const range = maxDistance || canvas.width;
    if (dist - targetRadius >= range) return false;

    // Calculate perpendicular distance from target center to laser line
    // Project target vector onto laser direction to get distance along laser
    const dotProduct = dx * laserDirX + dy * laserDirY;

    // If dot product is negative, target center is behind the laser start point
    // But we still need to check if the target's radius extends into the laser
    if (dotProduct < -targetRadius) return false;

    // Calculate the actual laser width at the target's distance using cone shape
    // Get base start and end widths
    let startWidth = player.laserStartWidth;
    let endWidth = player.laserEndWidth;
    
    // If powered up, use direct values
    if (gameState.poweredUpLaser) {
        startWidth = gameState.powerupLaserStartWidth || player.laserStartWidth;
        endWidth = gameState.powerupLaserEndWidth || player.laserEndWidth;
    }
    
    const laserLength = range;
    const distanceAlongLaser = dotProduct;
    
    // Calculate width at this distance (linear interpolation)
    let actualLaserWidth = startWidth;
    if (distanceAlongLaser > 0 && laserLength > 0) {
        const progress = Math.min(distanceAlongLaser / laserLength, 1);
        actualLaserWidth = startWidth + (endWidth - startWidth) * progress;
    }

    // Calculate perpendicular distance from target center to laser line
    // This is the distance from the target point to the laser line
    const perpDist = Math.abs(dx * laserDirY - dy * laserDirX);

    // Check if target intersects with laser beam
    // Target is hit if its closest point to the laser is within the laser width
    return perpDist < (actualLaserWidth / 2 + targetRadius);
}

function removeDeadEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
            const enemy = enemies[i];

            // Award points
            gameState.score += enemy.type.points;
            runStats.enemiesDestroyed++;
            allTimeStats.enemiesDestroyed++;

            // Track enemy types
            if (enemy.type === ENEMY_TYPES.DIAMOND) {
                runStats.diamondsDestroyed++;
                allTimeStats.diamondsDestroyed++;
                localStorage.setItem('rotocoreDiamondsDestroyed', allTimeStats.diamondsDestroyed);
            } else if (enemy.type === ENEMY_TYPES.CIRCLE) {
                runStats.circlesDestroyed++;
                allTimeStats.circlesDestroyed++;
                localStorage.setItem('rotocoreCirclesDestroyed', allTimeStats.circlesDestroyed);
            } else if (enemy.type === ENEMY_TYPES.SQUARE) {
                runStats.squaresDestroyed++;
                allTimeStats.squaresDestroyed++;
                localStorage.setItem('rotocoreSquaresDestroyed', allTimeStats.squaresDestroyed);
            } else if (enemy.type === ENEMY_TYPES.PENTAGON) {
                runStats.pentagonsDestroyed++;
                allTimeStats.pentagonsDestroyed++;
                localStorage.setItem('rotocorePentagonsDestroyed', allTimeStats.pentagonsDestroyed);
            } else if (enemy.type === ENEMY_TYPES.HEXAGON) {
                runStats.hexagonsDefeated++;
                runStats.hexagonsDestroyed++;
                allTimeStats.hexagonsDefeated++;
                allTimeStats.hexagonsDestroyedCount++;
                localStorage.setItem('rotocoreHexagonsDefeated', allTimeStats.hexagonsDefeated);
                localStorage.setItem('rotocoreHexagonsDestroyedCount', allTimeStats.hexagonsDestroyedCount);
            }

            // Pentagon spawns two diamonds on death
            if (enemy.type === ENEMY_TYPES.PENTAGON) {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const dx = centerX - enemy.x;
                const dy = centerY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    // Calculate perpendicular vectors for left and right sides
                    const perpX = -dy / dist; // Perpendicular to movement direction
                    const perpY = dx / dist;
                    const sideOffset = 30; // Distance to the sides
                    const backOffset = 20; // Distance back from kill spot

                    // Calculate spawn positions: sides + back from kill spot
                    const leftX = enemy.x + perpX * sideOffset - (dx / dist) * backOffset;
                    const leftY = enemy.y + perpY * sideOffset - (dy / dist) * backOffset;
                    const rightX = enemy.x - perpX * sideOffset - (dx / dist) * backOffset;
                    const rightY = enemy.y - perpY * sideOffset - (dy / dist) * backOffset;

                    setTimeout(() => spawnDiamond(leftX, leftY), 0);
                    setTimeout(() => spawnDiamond(rightX, rightY), 100);
                } else {
                    // Fallback to original position if at center
                    setTimeout(() => spawnDiamond(enemy.x - 30, enemy.y), 0);
                    setTimeout(() => spawnDiamond(enemy.x + 30, enemy.y), 100);
                }
            }

            // Explosion effect (scaled based on enemy)
            createExplosion(enemy.x, enemy.y, enemy);

            enemies.splice(i, 1);
            updateHUD();
        }
    }
}

// ==========================================
// GAME LOOP
// ==========================================

// FPS Limiter
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastFrameTime = 0;

function gameLoop(timestamp) {
    // Run loop even in menu mode to show gameplay preview
    if (!gameState.running && !gameState.menuMode) return;

    // Calculate elapsed time since last frame
    const elapsed = timestamp - lastFrameTime;

    // If enough time has passed, render the next frame
    if (elapsed < FRAME_INTERVAL) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Adjust lastFrameTime to target interval (to avoid drift)
    lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

    // Always clear screen and ensure clean context state
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Reset fillStyle to solid color and clear any clipping paths
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#fff';
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); // Clear any clipping paths

    // Always update and draw starfield (for dynamic background)
    updateStarField();
    drawStarField();

    // In menu mode, render gameplay preview with clipping
    if (gameState.menuMode) {
        renderMenuMode();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!gameState.running) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameState.paused) {
        // Draw game state frozen
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);

        drawBackgroundGrid();
        drawCenter();
        // TEST: Disabled trail drawing
        // if (!gameState.deathAnimation.active || !gameState.deathAnimation.playerExploded) {
        //     drawTrail();
        // }
        drawLaser();
        drawEnemies();
        drawPowerupCores();
        drawBlastWaves();
        drawParticles();
        drawPlayer();
        drawNotification();

        ctx.restore();

        requestAnimationFrame(gameLoop);
        return;
    }

    // Update survival time
    runStats.survivalTime = Math.floor((Date.now() - gameState.startTime) / 1000);

    // Check if powered up laser expired
    if (gameState.poweredUpLaser && Date.now() >= gameState.poweredUpLaserEndTime) {
        gameState.poweredUpLaser = false;
        gameState.powerupLaserDamage = LASER_DAMAGE;
        gameState.powerupLaserStartWidth = 0;
        gameState.powerupLaserEndWidth = 0;
    }

    // Check if time dilation expired
    if (gameState.timeDilationActive && Date.now() >= gameState.timeDilationEndTime) {
        gameState.timeDilationActive = false;
        gameState.timeDilationEndTime = 0;
    }

    // Check flawless achievement
    if (runStats.survivalTime >= 60 && Date.now() - runStats.lastDamageTime >= 60000) {
        runStats.flawless60 = true;
        allTimeStats.flawless60 = true;
        localStorage.setItem('rotocoreFlawless60', 'true');
    }

    // Spawn powerup cores periodically with random interval
    if (Date.now() - gameState.lastPowerupCoreTime > gameState.nextPowerupInterval) {
        spawnPowerupCore();
        gameState.lastPowerupCoreTime = Date.now();
        gameState.nextPowerupInterval = getRandomPowerupInterval();
    }

    // Check for burst events
    if (Date.now() - gameState.lastBurstEventTime > gameState.nextBurstEventInterval) {
        triggerBurstEvent();
    }

    // Update death animation
    updateDeathAnimation();

    // Update game objects (with time scale applied if in death animation)
    if (!gameState.deathAnimation.active || gameState.deathAnimation.timeScale > 0) {
        updatePlayer();
        updateEnemies();
        updateParticles();
        updateBlastWaves();
        updateGridRipples();
        updateStarField();
        updateNotification();
        updateScreenShake();
        updateUpgradeToken();
        checkLaserCollisions();
        checkPowerupCoreCollection(); // Check if player collects powerup cores
        checkUpgradeTokenDamage(); // Check if laser hits upgrade token
        removeDeadEnemies();
    }

    // Update high score
    if (gameState.score > gameState.highscore) {
        gameState.highscore = gameState.score;
        localStorage.setItem('rotocoreHighScore', gameState.highscore);
        updateHUD();
    }

    runStats.maxScore = Math.max(runStats.maxScore, gameState.score);
    allTimeStats.maxScore = Math.max(allTimeStats.maxScore, gameState.score);

    // Render with screen shake and death animation camera
    ctx.save();

    // Apply death animation camera transform (zoom and pan)
    if (gameState.deathAnimation.active) {
        const anim = gameState.deathAnimation;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Translate to center, scale, then translate back
        ctx.translate(centerX, centerY);
        ctx.scale(anim.zoom, anim.zoom);
        ctx.translate(-anim.cameraX, -anim.cameraY);
    }

    // Apply screen shake
    ctx.translate(screenShake.x, screenShake.y);

    // Draw background grid with ripples
    // Starfield is drawn at the start of the loop now
    drawBackgroundGrid();

    drawCenter();
    // Don't draw player trail after player has exploded
    // TEST: Disabled trail drawing
    // if (!gameState.deathAnimation.active || !gameState.deathAnimation.playerExploded) {
    //     drawTrail(); // Draw player trail first
    // }
    drawLaser();
    drawEnemies();
    drawPowerupCores();
    drawBlastWaves(); // Draw blast waves
    drawParticles();
    drawUpgradeToken();
    
    drawPlayer();
    
    drawNotification();



    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// MAIN MENU MODE
// ==========================================

// Menu viewport dimensions (clipping area for gameplay)
const MENU_VIEWPORT = {
    top: 40,      // Top margin for title
    bottom: 40,    // Bottom margin for button labels
    left: 0,
    right: 0
};

// Initialize menu mode - sets up gameplay preview
function initMenuMode() {
    gameState.menuMode = true;
    gameState.running = true; // Keep running for gameplay preview
    gameState.paused = false;
    
    // Hide HUD in menu mode
    const hud = document.querySelector('.hud');
    if (hud) {
        hud.classList.add('hidden');
    }
    
    // CRITICAL: Clear canvas context state to prevent dither patterns from persisting
    // This ensures clean state when switching to menu mode
    if (ctx && ctx.canvas) {
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#fff';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        // Clear any clipping paths
        const savedTransform = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.beginPath();
        ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.clip();
        ctx.beginPath(); // Clear the clipping path
        ctx.setTransform(savedTransform);
    }
    
    // Don't reset score or other stats - keep them as-is
    // Reset or create player with upgraded stats
    if (!player) {
        player = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            angle: 0,
            size: 12,
            rotatingLeft: false,
            rotatingRight: false,
            rotationSpeed: getRotationSpeed(),
            laserStartWidth: getLaserWidth(),
            laserEndWidth: getLaserWidth()
        };
    } else {
        // Reset player stats to upgraded values
        player.rotationSpeed = getRotationSpeed();
        player.laserStartWidth = getLaserWidth();
        player.laserEndWidth = getLaserWidth();
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.angle = 0;
        player.rotatingLeft = false;
        player.rotatingRight = false;
    }
    
    // Set laser damage
    LASER_DAMAGE = getLaserDamage();
    
    // Clear all game arrays
    enemies = [];
    particles = [];
    blastWaves = [];
    powerupCores = [];
    gridRipples = [];
    playerTrail = [];
    
    // Reset death animation state
    gameState.deathAnimation.active = false;
    gameState.deathAnimation.enemy = null;
    gameState.deathAnimation.phase = 'slowdown';
    gameState.deathAnimation.timeScale = 1.0;
    gameState.deathAnimation.zoom = 1.0;
    gameState.deathAnimation.playerExploded = false;
    
    // Reset screen shake
    screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    
    // Reset powerup states
    gameState.poweredUpLaser = false;
    gameState.poweredUpLaserEndTime = 0;
    gameState.timeDilationActive = false;
    gameState.timeDilationEndTime = 0;
    
    // Clear spawn timer
    if (gameState.spawnIntervalId !== null) {
        clearTimeout(gameState.spawnIntervalId);
        gameState.spawnIntervalId = null;
    }
    
    // Initialize starfield if needed
    if (!starField || starField.length === 0) {
        initStarField();
    }
}

// Render menu mode - gameplay preview with UI overlay on top
function renderMenuMode() {
    // Update gameplay elements (player only - no enemies in menu)
    updatePlayer();
    updateStarField();
    
    // Save context for screen shake
    ctx.save();
    
    // Apply screen shake
    ctx.translate(screenShake.x, screenShake.y);
    
    // Draw gameplay (full screen, no clipping)
    drawBackgroundGrid();
    drawCenter();
    // TEST: Disabled trail drawing
    // drawTrail();
    drawLaser();
    // Don't draw enemies, powerups, particles, or blast waves in menu mode
    drawPlayer();
    
    // Restore screen shake transform
    ctx.restore();
    
    // Draw UI overlay on top of gameplay
    drawMenuUI();
}

// Draw menu UI elements (title and button labels)
function drawMenuUI() {
    ctx.save();
    
    // Draw title at top
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.font = 'bold 32px "Courier Prime", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 2;
    
    // Draw title with outline
    const titleY = 8;
    ctx.strokeText('ROTOCORE', canvas.width / 2, titleY);
    ctx.fillText('ROTOCORE', canvas.width / 2, titleY);
    
    // Draw button instructions at bottom
    ctx.font = 'bold 14px "Courier Prime", "Courier New", monospace';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    const buttonY = canvas.height - 8;
    
    // Draw button labels - left half and right half
    const leftHalfCenter = canvas.width / 4;
    const rightHalfCenter = 3 * canvas.width / 4;
    
    ctx.strokeText('Ⓐ PLAY', leftHalfCenter, buttonY);
    ctx.fillText('Ⓐ PLAY', leftHalfCenter, buttonY);
    
    ctx.strokeText('Ⓑ UPGRADE SHIP', rightHalfCenter, buttonY);
    ctx.fillText('Ⓑ UPGRADE SHIP', rightHalfCenter, buttonY);
    
    ctx.restore();
}

// Exit menu mode and start full gameplay
function startGameplay() {
    gameState.menuMode = false;
    gameState.running = true;
    gameState.paused = false;
    
    // Show HUD when starting gameplay
    const hud = document.querySelector('.hud');
    if (hud) {
        hud.classList.remove('hidden');
    }
    
    // Reset game state for new game
    gameState.score = 0;
    gameState.initialHighScore = gameState.highscore; // Store initial highscore for comparison
    gameState.startTime = Date.now();
    gameState.lastPowerupCoreTime = Date.now();
    gameState.nextPowerupInterval = getRandomPowerupInterval();
    gameState.lastBurstEventTime = Date.now();
    gameState.lastBurstEventName = null;
    gameState.nextBurstEventInterval = getRandomBurstEventInterval();
    gameState.deathCause = null;
    gameState.poweredUpLaser = false;
    gameState.poweredUpLaserEndTime = 0;
    gameState.timeDilationActive = false;
    gameState.timeDilationEndTime = 0;
    gameState.deathAnimation.active = false;
    
    // Reset run stats
    runStats = {
        enemiesDestroyed: 0,
        survivalTime: 0,
        powerupsCollected: 0,
        hexagonsDefeated: 0,
        maxScore: 0,
        lastDamageTime: Date.now(),
        flawless60: false,
        diamondsDestroyed: 0,
        circlesDestroyed: 0,
        squaresDestroyed: 0,
        pentagonsDestroyed: 0,
        hexagonsDestroyed: 0
    };
    
    // Reset upgrade token state
    upgradeToken = null;
    upgradeTokenSpawned = false;
    
    // Clear enemies
    enemies = [];
    powerupCores = [];
    particles = [];
    blastWaves = [];
    gridRipples = [];
    
    // Update HUD
    updateHUD();
    
    // Check if upgrade token should spawn this game
    checkUpgradeTokenSpawn();
    
    // Start enemy spawning
    scheduleNextEnemySpawn();
    // Spawn first enemy immediately
    spawnEnemy();
}

// ==========================================
// DEATH ANIMATION
// ==========================================

function triggerDeathAnimation(enemy) {
    // Determine death cause before triggering death animation
    if (gameState.lastBurstEventName) {
        // Death occurred during or after a burst event - attribute to burst
        gameState.deathCause = gameState.lastBurstEventName;
    } else {
        // Regular collision death - attribute to enemy type
        gameState.deathCause = getEnemyTypeName(enemy.type) + ' COLLISION';
    }
    
    gameState.deathAnimation.active = true;
    gameState.deathAnimation.enemy = enemy;
    gameState.deathAnimation.phase = 'slowdown';
    gameState.deathAnimation.timeScale = 1.0;
    gameState.deathAnimation.zoom = 1.0;
    gameState.deathAnimation.cameraX = canvas.width / 2;
    gameState.deathAnimation.cameraY = canvas.height / 2;
    gameState.deathAnimation.startTime = Date.now();
    gameState.deathAnimation.explosionTime = 0;
    gameState.deathAnimation.playerExploded = false; // Track if player has exploded
}

function updateDeathAnimation() {
    if (!gameState.deathAnimation.active) return;

    const anim = gameState.deathAnimation;
    const now = Date.now();
    const elapsed = now - anim.startTime;

    if (anim.phase === 'slowdown') {
        // Slow down time over 500ms
        const slowdownDuration = 500;
        const progress = Math.min(elapsed / slowdownDuration, 1.0);
        anim.timeScale = 1.0 - (progress * 0.9); // Slow to 10% speed

        if (progress >= 1.0) {
            anim.phase = 'zoom';
            anim.startTime = now;
        }
    } else if (anim.phase === 'zoom') {
        // Zoom in on enemy over 800ms
        const zoomDuration = 800;
        const progress = Math.min(elapsed / zoomDuration, 1.0);

        // Ease out zoom (starts fast, ends slow)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        anim.zoom = 1.0 + (easeProgress * 2.5); // Zoom to 3.5x

        // Move camera toward enemy
        const targetX = anim.enemy.x;
        const targetY = anim.enemy.y;
        const startX = canvas.width / 2;
        const startY = canvas.height / 2;
        anim.cameraX = startX + (targetX - startX) * easeProgress;
        anim.cameraY = startY + (targetY - startY) * easeProgress;

        if (progress >= 1.0) {
            anim.phase = 'explosion';
            anim.startTime = now;
            anim.playerExploded = true; // Mark player as exploded

            // Create spectacular death explosion with enhanced effects
            const enemy = anim.enemy;
            const baseRadius = enemy.type.radius;
            const healthMultiplier = enemy.healthMultiplier || 1;

            // Enhanced explosion scale for death moment
            const deathScale = Math.max(1.5, Math.min(3.0, baseRadius / 12 + healthMultiplier * 0.5));
            const particleCount = Math.floor(EXPLOSION_PARTICLES * deathScale * 2); // Double particles
            const blastWaveRadius = Math.floor(100 + (baseRadius * 3) * healthMultiplier);

            // Create multiple layers of particles for spectacular effect
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.5;
                const speed = (6 + Math.random() * 8) * deathScale; // Doubled for 30fps
                particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: Math.floor(40 * deathScale),
                    maxLife: Math.floor(40 * deathScale)
                });
            }

            // Create multiple blast waves for layered effect
            createBlastWave(enemy.x, enemy.y, blastWaveRadius);
            setTimeout(() => createBlastWave(enemy.x, enemy.y, blastWaveRadius * 0.7), 50);
            setTimeout(() => createBlastWave(enemy.x, enemy.y, blastWaveRadius * 0.4), 100);

            // Destroy player ship at the same time - create explosion at player position
            const playerExplosionScale = 1.2;
            const playerParticleCount = Math.floor(EXPLOSION_PARTICLES * playerExplosionScale);

            // Create player explosion particles
            for (let i = 0; i < playerParticleCount; i++) {
                const angle = (Math.PI * 2 / playerParticleCount) * i + (Math.random() - 0.5) * 0.5;
                const speed = (4 + Math.random() * 6) * playerExplosionScale; // Doubled for 30fps
                particles.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: Math.floor(30 * playerExplosionScale),
                    maxLife: Math.floor(30 * playerExplosionScale)
                });
            }

            // Create player explosion blast wave
            createBlastWave(player.x, player.y, 80);

            // Massive screen shake for death moment (combines both explosions)
            const shakeIntensity = Math.max(12, Math.min(20, 8 + baseRadius / 8 + healthMultiplier * 2));
            const shakeDuration = Math.floor(30 + baseRadius / 4 + healthMultiplier * 5);
            triggerScreenShake(shakeIntensity, shakeDuration);

            // Remove the enemy from the enemies array so it doesn't render
            const enemyIndex = enemies.indexOf(enemy);
            if (enemyIndex !== -1) {
                enemies.splice(enemyIndex, 1);
            }
        }
    } else if (anim.phase === 'explosion') {
        // Hold explosion for 600ms
        const explosionDuration = 600;
        const progress = Math.min(elapsed / explosionDuration, 1.0);

        // Slight zoom out during explosion
        anim.zoom = 3.5 - (progress * 0.5); // Zoom out slightly to 3.0x

        if (progress >= 1.0) {
            anim.phase = 'complete';
            anim.startTime = now;
        }
    } else if (anim.phase === 'complete') {
        // Brief pause before showing game over (200ms)
        if (elapsed >= 200) {
            // Only call endGame once - set phase to prevent further calls
            anim.phase = 'ended'; // Mark as ended to prevent re-entry
            endGame();
        }
    } else if (anim.phase === 'ended') {
        // Game has ended, don't update further
        return;
    }
}

// ==========================================
// UPGRADE SCREEN FUNCTIONS
// ==========================================

function showUpgradeShipScreen() {
    const screen = document.getElementById('upgradeShipScreen');
    if (!screen) return;
    
    // Hide other screens
    const statsScreen = document.getElementById('statsScreen');
    const gameContainerEl = document.getElementById('gameContainer');
    
    if (statsScreen) statsScreen.classList.remove('active');
    if (gameContainerEl) gameContainerEl.classList.remove('active');
    
    screen.classList.add('active');
    
    // Initialize selection to first stat (ROTATION)
    selectedUpgradeIndex = 0;
    updateUpgradeUI();
    updateUpgradeSelection();
}

function hideUpgradeShipScreen() {
    const screen = document.getElementById('upgradeShipScreen');
    if (screen) {
        screen.classList.remove('active');
    }
    
    // Return to menu mode - always ensure menu mode is active
    showScreen(gameContainer);
    gameState.menuMode = true;
    initMenuMode(); // Ensure menu mode is properly initialized
    
    // Apply any new upgrades to player
    if (player) {
        player.rotationSpeed = getRotationSpeed();
        player.laserStartWidth = getLaserWidth();
        player.laserEndWidth = getLaserWidth();
        LASER_DAMAGE = getLaserDamage();
    }
}

function updateUpgradeUI() {
    // Calculate available tokens
    const totalCollected = playerUpgrades.tokensCollected;
    const totalSpent = playerUpgrades.rotationSpeed + 
                       playerUpgrades.laserDamage + 
                       playerUpgrades.laserWidth + 
                       playerUpgrades.novaBlast + 
                       playerUpgrades.superLaser;
    const available = totalCollected - totalSpent;
    
    document.getElementById('tokensAvailable').textContent = available;
    
    // Update bubbles for each stat
    updateUpgradeBubbles('upgradeRotationBubbles', playerUpgrades.rotationSpeed);
    updateUpgradeBubbles('upgradeDamageBubbles', playerUpgrades.laserDamage);
    updateUpgradeBubbles('upgradeWidthBubbles', playerUpgrades.laserWidth);
    updateUpgradeBubbles('upgradeNovaBlastBubbles', playerUpgrades.novaBlast);
    updateUpgradeBubbles('upgradeSuperLaserBubbles', playerUpgrades.superLaser);
    
    // Enable/disable upgrade buttons
    const noTokens = available === 0;
    document.getElementById('upgradeRotationBtn').disabled = (noTokens || playerUpgrades.rotationSpeed >= 5);
    document.getElementById('upgradeDamageBtn').disabled = (noTokens || playerUpgrades.laserDamage >= 5);
    document.getElementById('upgradeWidthBtn').disabled = (noTokens || playerUpgrades.laserWidth >= 5);
    document.getElementById('upgradeNovaBlastBtn').disabled = (noTokens || playerUpgrades.novaBlast >= 5);
    document.getElementById('upgradeSuperLaserBtn').disabled = (noTokens || playerUpgrades.superLaser >= 5);
}

function updateUpgradeSelection() {
    // Remove selected class from all upgrade stat rows
    const statRows = document.querySelectorAll('.upgrade-stat-row');
    statRows.forEach(row => row.classList.remove('selected'));
    
    // Add selected class to currently selected row
    if (statRows[selectedUpgradeIndex]) {
        statRows[selectedUpgradeIndex].classList.add('selected');
    }
}

function updateUpgradeBubbles(elementId, level) {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'upgrade-bubble';
        if (i < level) {
            bubble.classList.add('filled');
        }
        container.appendChild(bubble);
    }
}

function upgradeRotationSpeed() {
    if (playerUpgrades.rotationSpeed >= 5) return;
    const totalSpent = playerUpgrades.rotationSpeed + 
                       playerUpgrades.laserDamage + 
                       playerUpgrades.laserWidth + 
                       playerUpgrades.novaBlast + 
                       playerUpgrades.superLaser;
    const available = playerUpgrades.tokensCollected - totalSpent;
    if (available <= 0) return;
    
    playerUpgrades.rotationSpeed++;
    localStorage.setItem('rotocoreUpgradeRotation', playerUpgrades.rotationSpeed);
    if (player) {
        player.rotationSpeed = getRotationSpeed();
    }
    updateUpgradeUI();
}

function upgradeLaserDamage() {
    if (playerUpgrades.laserDamage >= 5) return;
    const totalSpent = playerUpgrades.rotationSpeed + 
                       playerUpgrades.laserDamage + 
                       playerUpgrades.laserWidth + 
                       playerUpgrades.novaBlast + 
                       playerUpgrades.superLaser;
    const available = playerUpgrades.tokensCollected - totalSpent;
    if (available <= 0) return;
    
    playerUpgrades.laserDamage++;
    localStorage.setItem('rotocoreUpgradeDamage', playerUpgrades.laserDamage);
    LASER_DAMAGE = getLaserDamage();
    updateUpgradeUI();
}

function upgradeLaserWidth() {
    if (playerUpgrades.laserWidth >= 5) return;
    const totalSpent = playerUpgrades.rotationSpeed + 
                       playerUpgrades.laserDamage + 
                       playerUpgrades.laserWidth + 
                       playerUpgrades.novaBlast + 
                       playerUpgrades.superLaser;
    const available = playerUpgrades.tokensCollected - totalSpent;
    if (available <= 0) return;
    
    playerUpgrades.laserWidth++;
    localStorage.setItem('rotocoreUpgradeWidth', playerUpgrades.laserWidth);
    const width = getLaserWidth();
    if (player) {
        player.laserStartWidth = width;
        player.laserEndWidth = width;
    }
    updateUpgradeUI();
}

function upgradeNovaBlast() {
    if (playerUpgrades.novaBlast >= 5) return;
    const totalSpent = playerUpgrades.rotationSpeed + 
                       playerUpgrades.laserDamage + 
                       playerUpgrades.laserWidth + 
                       playerUpgrades.novaBlast + 
                       playerUpgrades.superLaser;
    const available = playerUpgrades.tokensCollected - totalSpent;
    if (available <= 0) return;
    
    playerUpgrades.novaBlast++;
    localStorage.setItem('rotocoreUpgradeNovaBlast', playerUpgrades.novaBlast);
    updateUpgradeUI();
}

function upgradeSuperLaser() {
    if (playerUpgrades.superLaser >= 5) return;
    const totalSpent = playerUpgrades.rotationSpeed + 
                       playerUpgrades.laserDamage + 
                       playerUpgrades.laserWidth + 
                       playerUpgrades.novaBlast + 
                       playerUpgrades.superLaser;
    const available = playerUpgrades.tokensCollected - totalSpent;
    if (available <= 0) return;
    
    playerUpgrades.superLaser++;
    localStorage.setItem('rotocoreUpgradeSuperLaser', playerUpgrades.superLaser);
    updateUpgradeUI();
}

// Per-ship statistics removed - now using only global stats

// ==========================================
// GAME OVER
// ==========================================

function endGame() {
    // Prevent multiple calls to endGame
    if (!gameState.running && gameState.deathAnimation.active === false) {
        return;
    }
    
    gameState.running = false;
    gameState.deathAnimation.active = false;

    // Clear spawn interval
    if (gameState.spawnIntervalId !== null) {
        clearTimeout(gameState.spawnIntervalId);
        gameState.spawnIntervalId = null;
    }

    // Track games played and total score
    allTimeStats.gamesPlayed++;
    allTimeStats.totalScore += gameState.score;
    localStorage.setItem('rotocoreGamesPlayed', allTimeStats.gamesPlayed);
    localStorage.setItem('rotocoreTotalScore', allTimeStats.totalScore);

    // Track burst event deaths - whatever the last burst event was before death
    if (gameState.lastBurstEventName) {
        if (!allTimeStats.burstEventDeaths[gameState.lastBurstEventName]) {
            allTimeStats.burstEventDeaths[gameState.lastBurstEventName] = 0;
        }
        allTimeStats.burstEventDeaths[gameState.lastBurstEventName]++;
        localStorage.setItem('rotocoreBurstEventDeaths', JSON.stringify(allTimeStats.burstEventDeaths));
    }

    // Save all-time stats
    localStorage.setItem('rotocoreEnemiesDestroyed', allTimeStats.enemiesDestroyed);
    localStorage.setItem('rotocoreSurvivalTime', Math.floor(allTimeStats.survivalTime));

    // Check if this is a new high score (compare with initial highscore at game start)
    // Only show badge if score is strictly greater than the highscore that was stored at game start
    // IMPORTANT: initialHighScore should be set in initGame() or startGameplay() to the highscore value at game start
    // If it wasn't set for some reason, we need to infer it. If highscore was updated during gameplay,
    // it means the score exceeded the old highscore. We can't reliably determine the old value, so we
    // check if the current highscore equals the score (meaning it was just updated).
    let initialHighScore = gameState.initialHighScore;
    if (typeof initialHighScore !== 'number' || initialHighScore < 0) {
        // If initialHighScore wasn't set, check if highscore was just updated
        // If highscore equals score, it means this was a new record, so we can't determine the old value
        // In this case, we'll assume there was no previous highscore (0) to be safe
        initialHighScore = (gameState.highscore === gameState.score) ? 0 : gameState.highscore;
    }
    const isNewHighScore = gameState.score > initialHighScore;
    
    // Show/hide "NEW" badge
    const newBadge = document.getElementById('newBadge');
    if (newBadge) {
        // Always hide first, then show only if it's actually a new record
        newBadge.classList.add('hidden');
        
        // Only show if:
        // 1. Score is strictly greater than initial highscore
        // 2. initialHighScore is greater than 0 (meaning there was a previous highscore to beat)
        //    This prevents showing "new best" on the very first game when there's no previous highscore
        // 3. Score is greater than 0 (don't show for zero scores)
        if (isNewHighScore && initialHighScore > 0 && gameState.score > 0) {
            newBadge.classList.remove('hidden');
        }
    }

    // Show final score
    const finalScoreElement = document.getElementById('finalScore');
    if (finalScoreElement) {
        finalScoreElement.textContent = formatNumber(gameState.score);
    }

    // Display death cause
    const deathCauseElement = document.getElementById('deathCause');
    if (deathCauseElement) {
        if (gameState.deathCause) {
            deathCauseElement.textContent = gameState.deathCause.toUpperCase();
        } else {
            deathCauseElement.textContent = 'COLLISION';
        }
    }
    
    // Show game over screen
    const gameOverElement = document.getElementById('gameOver');
    if (gameOverElement) {
        gameOverElement.classList.remove('hidden');
    }
}

// Unlock celebration and progress meter functions removed - now using upgrade system

// Ship selection screen functions removed - now using upgrade system

// ==========================================
// INPUT HANDLING
// ==========================================



// Keyboard Controls
document.addEventListener('keydown', (e) => {
    // Handle game over screen input first
    const gameOverElement = document.getElementById('gameOver');
    if (gameOverElement && !gameOverElement.classList.contains('hidden')) {
        // A Button - Continue (returns to main menu)
        if (e.key === 'x' || e.key === 'X') {
            gameOverElement.classList.add('hidden');
            // Clear all game state before returning to main menu
            enemies = [];
            particles = [];
            blastWaves = [];
            powerupCores = [];
            gridRipples = [];
            playerTrail = [];
            // Reset game state
            gameState.score = 0;
            gameState.deathCause = null;
            gameState.lastPowerupCoreTime = Date.now();
            gameState.nextPowerupInterval = getRandomPowerupInterval();
            gameState.lastBurstEventTime = Date.now();
            gameState.lastBurstEventName = null;
            gameState.nextBurstEventInterval = getRandomBurstEventInterval();
            // Reset run stats
            runStats = {
                enemiesDestroyed: 0,
                survivalTime: 0,
                powerupsCollected: 0,
                hexagonsDefeated: 0,
                maxScore: 0,
                lastDamageTime: Date.now(),
                flawless60: false,
                diamondsDestroyed: 0,
                circlesDestroyed: 0,
                squaresDestroyed: 0,
                pentagonsDestroyed: 0,
                hexagonsDestroyed: 0
            };
            // Reset upgrade token state
            upgradeToken = null;
            upgradeTokenSpawned = false;
            // Reset visual effects
            pulsePhase = 0;
            notification = { title: '', subtitle: '', timer: 0, active: false };
            // Clear canvas immediately
            if (ctx && ctx.canvas) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            // Return to menu mode
            showScreen(gameContainer);
            initMenuMode();
            // Ensure game loop continues running
            requestAnimationFrame(gameLoop);
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        // Other keys ignored on game over screen
        return;
    }
    
    // Upgrade screen navigation (check before menu mode to take priority)
    const upgradeShipScreen = document.getElementById('upgradeShipScreen');
    if (upgradeShipScreen && upgradeShipScreen.classList.contains('active')) {
        // B Button - Back to menu
        if (e.key === 'z' || e.key === 'Z' || e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            hideUpgradeShipScreen();
            return;
        }
        
        // D-Pad Up - Move selection up
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            selectedUpgradeIndex = (selectedUpgradeIndex - 1 + 5) % 5; // Wrap from 0 to 4
            updateUpgradeSelection();
            return;
        }
        
        // D-Pad Down - Move selection down
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
            selectedUpgradeIndex = (selectedUpgradeIndex + 1) % 5; // Wrap from 4 to 0
            updateUpgradeSelection();
            return;
        }
        
        // A Button - Upgrade selected stat
        if (e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            const upgradeFunctions = [
                upgradeRotationSpeed,
                upgradeLaserDamage,
                upgradeLaserWidth,
                upgradeNovaBlast,
                upgradeSuperLaser
            ];
            const upgradeButtonIds = [
                'upgradeRotationBtn',
                'upgradeDamageBtn',
                'upgradeWidthBtn',
                'upgradeNovaBlastBtn',
                'upgradeSuperLaserBtn'
            ];
            
            // Only upgrade if button is not disabled
            const button = document.getElementById(upgradeButtonIds[selectedUpgradeIndex]);
            if (button && !button.disabled && upgradeFunctions[selectedUpgradeIndex]) {
                upgradeFunctions[selectedUpgradeIndex]();
                updateUpgradeSelection(); // Refresh selection after upgrade
            }
            return;
        }
        
        return;
    }
    
    // Handle menu mode input
    if (gameState.menuMode) {
        // Crank simulation keys - rotate ship in menu (use flags for continuous rotation)
        if (e.key === '.' || e.key === '>') {
            if (player) {
                player.rotatingRight = true; // Clockwise
            }
            e.preventDefault();
            return;
        }
        if (e.key === ',' || e.key === '<') {
            if (player) {
                player.rotatingLeft = true; // Counter-clockwise
            }
            e.preventDefault();
            return;
        }
        
        // Arrow keys - rotate ship in menu (D-pad support)
        if (e.key === 'ArrowLeft') {
            if (player) {
                player.rotatingLeft = true;
            }
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowRight') {
            if (player) {
                player.rotatingRight = true;
            }
            e.preventDefault();
            return;
        }
        
        // A Button - Start game
        if (e.key === 'x' || e.key === 'X') {
            startGameplay();
            showScreen(gameContainer);
            e.preventDefault();
            return;
        }
        
        // B Button - Open upgrades screen
        if (e.key === 'z' || e.key === 'Z' || e.key === 'b' || e.key === 'B') {
            showUpgradeShipScreen();
            e.preventDefault();
            return;
        }
        
        // Other keys ignored in menu mode
        return;
    }
    
    // Stats screen navigation
    const statsScreen = document.getElementById('statsScreen');
    if (statsScreen && statsScreen.classList.contains('active')) {
        if (e.key === 'z' || e.key === 'Z' || e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            statsScreen.classList.remove('active');
            // Return to pause menu if game is paused, otherwise return to menu mode
            if (gameState.paused) {
                document.getElementById('pauseMenu').classList.remove('hidden');
            } else {
                showScreen(gameContainer);
                initMenuMode();
            }
        }
        return;
    }
    
    // Normal gameplay input
    if (!gameState.running || !player) return;

    // Crank simulation keys
    if (e.key === '.' || e.key === '>') {
        player.angle += ROTATION_SPEED * 2; // Clockwise
    }
    if (e.key === ',' || e.key === '<') {
        player.angle -= ROTATION_SPEED * 2; // Counter-clockwise
    }

    // A/B Buttons
    if (e.key === 'x' || e.key === 'X') {
        // A Button Action (Select / Fire if applicable)
        // Currently just logs or could trigger special ability
        console.log('A Button Pressed');
    }
    if (e.key === 'z' || e.key === 'Z') {
        // B Button Action (Back / Cancel)
        console.log('B Button Pressed');
    }

    // Keep arrow keys for D-Pad support (optional)
    if (e.key === 'ArrowLeft') player.rotatingLeft = true;
    if (e.key === 'ArrowRight') player.rotatingRight = true;

    // Pause
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    if (!player) return;
    
    // Handle menu mode rotation release
    if (gameState.menuMode) {
        if (e.key === '.' || e.key === '>') {
            player.rotatingRight = false;
            e.preventDefault();
            return;
        }
        if (e.key === ',' || e.key === '<') {
            player.rotatingLeft = false;
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowLeft') {
            player.rotatingLeft = false;
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowRight') {
            player.rotatingRight = false;
            e.preventDefault();
            return;
        }
    }
    
    // Normal gameplay rotation release
    if (e.key === 'ArrowLeft') player.rotatingLeft = false;
    if (e.key === 'ArrowRight') player.rotatingRight = false;
});



// ==========================================
// INITIALIZATION
// ==========================================

document.getElementById('highscore').textContent = formatNumber(gameState.highscore);

// Pause Functionality
function togglePause() {
    if (!gameState.running || gameState.deathAnimation.active) return;

    gameState.paused = !gameState.paused;

    const pauseMenu = document.getElementById('pauseMenu');
    if (gameState.paused) {
        pauseMenu.classList.remove('hidden');
        updateSettingsUI();
    } else {
        pauseMenu.classList.add('hidden');
        // Restart enemy spawning when resuming
        scheduleNextEnemySpawn();
    }
}

function toggleSetting(setting) {
    gameSettings[setting] = !gameSettings[setting];

    // Save to localStorage
    if (setting === 'screenShake') localStorage.setItem('rotocoreSettingScreenShake', gameSettings.screenShake);
    if (setting === 'grid') localStorage.setItem('rotocoreSettingGrid', gameSettings.grid);

    updateSettingsUI();
}

// Event Listeners for Menus
document.getElementById('resumeBtn').addEventListener('click', togglePause);

document.getElementById('toggleShake').addEventListener('click', () => toggleSetting('screenShake'));
document.getElementById('toggleGrid').addEventListener('click', () => toggleSetting('grid'));

document.getElementById('quitBtn').addEventListener('click', () => {
    gameState.paused = false;
    gameState.running = false;
    document.getElementById('pauseMenu').classList.add('hidden');
    
    // Clear game state
    enemies = [];
    particles = [];
    blastWaves = [];
    powerupCores = [];
    gridRipples = [];
    playerTrail = [];
    
    // Return to menu mode
    showScreen(gameContainer);
    initMenuMode();
});

// Stats Screen Navigation
const statsScreen = document.getElementById('statsScreen');

// Stats button from pause menu
const pauseStatsBtn = document.getElementById('pauseStatsBtn');
if (pauseStatsBtn) {
    pauseStatsBtn.addEventListener('click', () => {
        document.getElementById('pauseMenu').classList.add('hidden');
        statsScreen.classList.add('active');
        updateStatsScreen();
    });
}

// Upgrade Screen Event Listeners
document.getElementById('upgradeRotationBtn')?.addEventListener('click', upgradeRotationSpeed);
document.getElementById('upgradeDamageBtn')?.addEventListener('click', upgradeLaserDamage);
document.getElementById('upgradeWidthBtn')?.addEventListener('click', upgradeLaserWidth);
document.getElementById('upgradeNovaBlastBtn')?.addEventListener('click', upgradeNovaBlast);
document.getElementById('upgradeSuperLaserBtn')?.addEventListener('click', upgradeSuperLaser);

document.addEventListener('keyup', (e) => {
    if (!player) return;
    
    // Handle menu mode rotation release
    if (gameState.menuMode) {
        if (e.key === '.' || e.key === '>') {
            player.rotatingRight = false;
            e.preventDefault();
            return;
        }
        if (e.key === ',' || e.key === '<') {
            player.rotatingLeft = false;
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowLeft') {
            player.rotatingLeft = false;
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowRight') {
            player.rotatingRight = false;
            e.preventDefault();
            return;
        }
    }
    
    // Normal gameplay rotation release
    if (e.key === 'ArrowLeft') player.rotatingLeft = false;
    if (e.key === 'ArrowRight') player.rotatingRight = false;
});

// Update Stats Screen (simplified to only show global stats)
function updateStatsScreen() {
    // Always use allTimeStats
    const stats = {
        highScore: allTimeStats.maxScore,
        gamesPlayed: allTimeStats.gamesPlayed,
        avgScore: allTimeStats.gamesPlayed > 0 
            ? Math.floor(allTimeStats.totalScore / allTimeStats.gamesPlayed)
            : 0,
        survivalTime: allTimeStats.survivalTime,
        diamondsDestroyed: allTimeStats.diamondsDestroyed,
        circlesDestroyed: allTimeStats.circlesDestroyed,
        squaresDestroyed: allTimeStats.squaresDestroyed,
        pentagonsDestroyed: allTimeStats.pentagonsDestroyed,
        hexagonsDestroyed: allTimeStats.hexagonsDestroyedCount,
        burstEventDeaths: allTimeStats.burstEventDeaths
    };
    
    // Core stats
    document.getElementById('statsHighScore').textContent = formatNumber(stats.highScore || 0);
    document.getElementById('statsGamesPlayed').textContent = formatNumber(stats.gamesPlayed || 0);
    document.getElementById('statsAvgScore').textContent = formatNumber(stats.avgScore || 0);
    
    // Survival time (format as H:MM:SS)
    const totalSeconds = Math.floor(stats.survivalTime || 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    document.getElementById('statsSurvivalTime').textContent = 
        `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Enemy breakdowns
    document.getElementById('statsDiamond').textContent = formatNumber(stats.diamondsDestroyed || 0);
    document.getElementById('statsCircle').textContent = formatNumber(stats.circlesDestroyed || 0);
    document.getElementById('statsSquare').textContent = formatNumber(stats.squaresDestroyed || 0);
    document.getElementById('statsPentagon').textContent = formatNumber(stats.pentagonsDestroyed || 0);
    document.getElementById('statsHexagon').textContent = formatNumber(stats.hexagonsDestroyed || 0);
}

// Initialize menu mode on page load
initMenuMode();
showScreen(gameContainer);

// Start the game loop immediately for the menu gameplay preview
requestAnimationFrame(gameLoop);