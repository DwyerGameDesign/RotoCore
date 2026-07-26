// ==========================================
// POWERUP CONFIGURATION
// ==========================================

// Nova Blast Definition (radius will be overridden by getNovaBlastRadius())
const NOVA_BLAST = {
    id: 'nova_blast',
    name: 'Nova Blast',
    icon: '💥',
    color: '#fff',
    description: 'Destroys all nearby enemies',
    radius: 175, // Default/max value (will be overridden)
    damage: 150
};

// Super Laser Definition (duration will be overridden by getSuperLaserDuration())
const SUPER_LASER = {
    id: 'super_laser',
    name: 'Super Laser',
    icon: '⚡',
    color: '#fff',
    description: 'Supercharged beam for a short time',
    duration: 10000, // Default/max value (will be overridden)
    laserDamage: 4.5,        // Direct damage value
    laserStartWidth: 33.6,   // Direct start width
    laserEndWidth: 89.6      // Direct end width
};

// Time Dilation Definition (Freeze Enemies and Background)
const TIME_DILATION = {
    id: 'time_dilation',
    name: 'Time Dilation',
    icon: '🕐',
    color: '#fff',
    description: 'Freezes enemies and background',
    duration: 8000 // milliseconds (8 seconds, configurable)
};

// Export for compatibility
const POWERUP_POOL = [NOVA_BLAST, SUPER_LASER, TIME_DILATION];