// Game configuration and state
const CONFIG = {
    SPAWN_RATES: {
        BASE: {
            asteroid: 0.02,
            fuel: 0.005,
            health: 0.003,
            point: 0.01
        },
        LEVEL_MULTIPLIER: {
            asteroid: 0.005
        }
    },
    PICKUPS: {
        fuel: { value: 25, size: 30 },
        health: { value: 20, size: 25 },
        point: { baseValue: 10, size: 20 }
    },
    PLAYER: {
        width: 40,
        height: 50,
        invulnerabilityTime: 1500
    },
    FUEL: {
        baseConsumption: 0.1,
        consumptionIncrease: 0.02,
        efficiencyUpgrade: 0.9
    },
    ASTEROIDS: {
        damage: 20,
        minSize: 20,
        maxSize: 50
    },
    UPGRADES: {
        speed: 0.2,
        health: 25,
        fuel: 25
    },
    LEVEL_UP: {
        scoreMultiplier: 1.5
    },
    PERFORMANCE: {
        starCount: 100,
        cleanupInterval: 10000 // Milliseconds
    }
};

// Game state
const game = {
    isRunning: false,
    isPaused: false,
    score: 0,
    level: 1,
    health: 100,
    maxHealth: 100,
    fuel: 100,
    maxFuel: 100,
    fuelConsumption: CONFIG.FUEL.baseConsumption,
    speed: 3,
    scoreToNextLevel: 100,
    lastTime: 0,
    elements: {
        stars: [],
        asteroids: [],
        fuelPickups: [],
        healthPickups: [],
        pointPickups: []
    },
    player: {
        x: 0,
        y: 0,
        width: CONFIG.PLAYER.width,
        height: CONFIG.PLAYER.height,
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: false,
        speedBoost: 1,
        invulnerable: false
    },
    spawnRates: { ...CONFIG.SPAWN_RATES.BASE },
    controls: {
        keyboard: true,
        touch: false
    },
    animations: {
        stars: [],
        explosions: []
    },
    frameCount: 0
};

// Cache DOM Elements
const DOM = {
    gameArea: document.getElementById('game-area'),
    player: document.getElementById('player'),
    scoreElement: document.getElementById('score'),
    levelElement: document.getElementById('level'),
    healthFill: document.getElementById('health-fill'),
    fuelFill: document.getElementById('fuel-fill'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    gameOverModal: document.getElementById('game-over'),
    finalScoreElement: document.getElementById('final-score'),
    gameMessages: document.getElementById('game-messages'),
    levelUpModal: document.getElementById('level-up'),
    newLevelElement: document.getElementById('new-level'),
    upgradeButtons: document.querySelectorAll('.upgrade-btn'),
    upBtn: document.getElementById('up-btn'),
    downBtn: document.getElementById('down-btn'),
    leftBtn: document.getElementById('left-btn'),
    rightBtn: document.getElementById('right-btn'),
    mobileControls: document.querySelector('.mobile-controls'),
    // New UI elements
    pauseBtn: createPauseButton(),
    fpsCounter: createFPSCounter()
};

// Game dimensions
let gameWidth = DOM.gameArea.clientWidth;
let gameHeight = DOM.gameArea.clientHeight;

// Initialize the game
function initGame() {
    // Reset game state
    resetGameState();
    
    // Position player
    updatePlayerPosition();
    
    // Create initial stars
    createStarfield();
    
    // Update UI
    updateUI();
    
    // Schedule periodic cleanup to improve performance
    schedulePeriodicCleanup();
}

function resetGameState() {
    game.score = 0;
    game.level = 1;
    game.health = game.maxHealth;
    game.fuel = game.maxFuel;
    game.scoreToNextLevel = 100;
    game.fuelConsumption = CONFIG.FUEL.baseConsumption;
    game.spawnRates = { ...CONFIG.SPAWN_RATES.BASE };
    game.frameCount = 0;
    
    // Position player at the bottom center
    game.player.x = gameWidth / 2 - game.player.width / 2;
    game.player.y = gameHeight - game.player.height - 20;
    
    // Clear all game elements
    clearGameElements();
}

function startGame() {
    if (!game.isRunning) {
        game.isRunning = true;
        game.isPaused = false;
        game.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
        DOM.startBtn.style.display = 'none';
        DOM.pauseBtn.style.display = 'block';
        
        // Check if on mobile and show appropriate controls
        checkDeviceType();
    }
}

function pauseGame() {
    if (game.isRunning) {
        game.isPaused = !game.isPaused;
        
        if (game.isPaused) {
            showMessage('Game Paused', 1000);
            DOM.pauseBtn.classList.add('paused');
            DOM.pauseBtn.textContent = '▶';
        } else {
            showMessage('Game Resumed', 1000);
            game.lastTime = performance.now();
            DOM.pauseBtn.classList.remove('paused');
            DOM.pauseBtn.textContent = '❚❚';
            requestAnimationFrame(gameLoop);
        }
    }
}

function endGame() {
    game.isRunning = false;
    showMessage('Game Over!', 2000);
    DOM.gameOverModal.style.display = 'flex';
    DOM.finalScoreElement.textContent = game.score;
    DOM.pauseBtn.style.display = 'none';
    
    // Save high score
    saveHighScore(game.score);
}

function restartGame() {
    DOM.gameOverModal.style.display = 'none';
    initGame();
    startGame();
}

// Create new UI elements
function createPauseButton() {
    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'pause-btn';
    pauseBtn.textContent = '❚❚';
    pauseBtn.className = 'game-button';
    pauseBtn.style.position = 'absolute';
    pauseBtn.style.top = '10px';
    pauseBtn.style.right = '10px';
    pauseBtn.style.zIndex = '100';
    pauseBtn.style.display = 'none';
    pauseBtn.addEventListener('click', pauseGame);
    document.body.appendChild(pauseBtn);
    return pauseBtn;
}

function createFPSCounter() {
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fps-counter';
    fpsCounter.style.position = 'absolute';
    fpsCounter.style.bottom = '10px';
    fpsCounter.style.right = '10px';
    fpsCounter.style.color = 'white';
    fpsCounter.style.fontSize = '12px';
    fpsCounter.style.opacity = '0.7';
    document.body.appendChild(fpsCounter);
    return fpsCounter;
}

// Game loop with time-based movement
function gameLoop(timestamp) {
    if (!game.isRunning) return;
    if (game.isPaused) return;
    
    // Calculate delta time for smooth animation
    const deltaTime = timestamp - game.lastTime;
    game.lastTime = timestamp;
    
    // Update game state
    updateGameState(deltaTime / 16.67); // Normalize to ~60fps
    
    // Calculate and display FPS
    updateFPS(deltaTime);
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

function updateGameState(deltaTime) {
    movePlayer(deltaTime);
    moveGameElements(deltaTime);
    checkCollisions();
    
    // Increment frame counter and only spawn on some frames to improve performance
    game.frameCount++;
    if (game.frameCount % 2 === 0) {
        spawnGameElements();
    }
    
    updateStarfield(deltaTime);
    consumeFuel(deltaTime);
}

// Player movement with delta time for consistent speed
function movePlayer(deltaTime) {
    const moveSpeed = game.speed * game.player.speedBoost * deltaTime;
    
    // Calculate movement based on key presses
    if (game.player.moveUp && game.player.y > 0) {
        game.player.y -= moveSpeed;
    }
    if (game.player.moveDown && game.player.y < gameHeight - game.player.height) {
        game.player.y += moveSpeed;
    }
    if (game.player.moveLeft && game.player.x > 0) {
        game.player.x -= moveSpeed;
        DOM.player.style.transform = 'rotate(-15deg)';
    } else if (game.player.moveRight && game.player.x < gameWidth - game.player.width) {
        game.player.x += moveSpeed;
        DOM.player.style.transform = 'rotate(15deg)';
    } else {
        DOM.player.style.transform = 'rotate(0deg)';
    }
    
    // Keep player within boundaries
    game.player.x = Math.max(0, Math.min(game.player.x, gameWidth - game.player.width));
    game.player.y = Math.max(0, Math.min(game.player.y, gameHeight - game.player.height));
    
    updatePlayerPosition();
}

function updatePlayerPosition() {
    DOM.player.style.left = `${game.player.x}px`;
    DOM.player.style.top = `${game.player.y}px`;
}

// Fuel consumption based on delta time
function consumeFuel(deltaTime) {
    if (game.player.moveUp || game.player.moveDown || game.player.moveLeft || game.player.moveRight) {
        game.fuel -= game.fuelConsumption * deltaTime;
        if (game.fuel <= 0) {
            game.fuel = 0;
            endGame();
        }
        updateUI();
    }
}

// Starfield background
function createStarfield() {
    // Create stars
    for (let i = 0; i < CONFIG.PERFORMANCE.starCount; i++) {
        createStar();
    }
}

function createStar() {
    const star = document.createElement('div');
    star.classList.add('star');
    
    // Random size between 1-3px
    const size = Math.random() * 2 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    
    // Random position
    const x = Math.random() * gameWidth;
    const y = Math.random() * gameHeight;
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    
    // Random speed (for parallax effect)
    const speed = Math.random() * 2 + 0.5;
    
    // Add to DOM and track
    DOM.gameArea.appendChild(star);
    game.animations.stars.push({
        element: star,
        x: x,
        y: y,
        speed: speed
    });
}

function updateStarfield(deltaTime) {
    for (const star of game.animations.stars) {
        star.y += star.speed * deltaTime;
        
        // Reset star position if it goes off screen
        if (star.y > gameHeight) {
            star.y = -5;
            star.x = Math.random() * gameWidth;
        }
        
        star.element.style.top = `${star.y}px`;
        star.element.style.left = `${star.x}px`;
    }
}

// Game elements
function spawnGameElements() {
    // Spawn elements based on probability and level
    if (Math.random() < game.spawnRates.asteroid * game.level) {
        createAsteroid();
    }
    
    if (Math.random() < game.spawnRates.fuel) {
        createFuelPickup();
    }
    
    if (Math.random() < game.spawnRates.health) {
        createHealthPickup();
    }
    
    if (Math.random() < game.spawnRates.point) {
        createPointPickup();
    }
}

function createAsteroid() {
    const asteroid = document.createElement('div');
    asteroid.classList.add('asteroid');
    
    // Random size between min and max
    const size = Math.random() * (CONFIG.ASTEROIDS.maxSize - CONFIG.ASTEROIDS.minSize) + CONFIG.ASTEROIDS.minSize;
    asteroid.style.width = `${size}px`;
    asteroid.style.height = `${size}px`;
    
    // Random rotation for visual variety
    const rotation = Math.random() * 360;
    asteroid.style.transform = `rotate(${rotation}deg)`;
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - size);
    asteroid.style.left = `${x}px`;
    asteroid.style.top = '-50px';
    
    DOM.gameArea.appendChild(asteroid);
    game.elements.asteroids.push({
        element: asteroid,
        x: x,
        y: -50,
        size: size,
        speed: Math.random() * 2 + 2,
        rotation: rotation,
        rotationSpeed: Math.random() * 2 - 1 // Random rotation speed
    });
}

function createFuelPickup() {
    const fuel = document.createElement('div');
    fuel.classList.add('fuel-pickup');
    
    const size = CONFIG.PICKUPS.fuel.size;
    fuel.style.width = `${size}px`;
    fuel.style.height = `${size}px`;
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - size);
    fuel.style.left = `${x}px`;
    fuel.style.top = '-50px';
    
    DOM.gameArea.appendChild(fuel);
    game.elements.fuelPickups.push({
        element: fuel,
        x: x,
        y: -50,
        width: size,
        height: size,
        speed: Math.random() * 1.5 + 2
    });
}

function createHealthPickup() {
    const health = document.createElement('div');
    health.classList.add('health-pickup');
    
    const size = CONFIG.PICKUPS.health.size;
    health.style.width = `${size}px`;
    health.style.height = `${size}px`;
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - size);
    health.style.left = `${x}px`;
    health.style.top = '-50px';
    
    DOM.gameArea.appendChild(health);
    game.elements.healthPickups.push({
        element: health,
        x: x,
        y: -50,
        width: size,
        height: size,
        speed: Math.random() * 1.5 + 1.5
    });
}

function createPointPickup() {
    const point = document.createElement('div');
    point.classList.add('point-pickup');
    
    const size = CONFIG.PICKUPS.point.size;
    point.style.width = `${size}px`;
    point.style.height = `${size}px`;
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - size);
    point.style.left = `${x}px`;
    point.style.top = '-50px';
    
    DOM.gameArea.appendChild(point);
    game.elements.pointPickups.push({
        element: point,
        x: x,
        y: -50,
        width: size,
        height: size,
        speed: Math.random() * 2 + 2
    });
}

function moveGameElements(deltaTime) {
    // Move asteroids with rotation
    for (let i = 0; i < game.elements.asteroids.length; i++) {
        const asteroid = game.elements.asteroids[i];
        asteroid.y += asteroid.speed * deltaTime;
        asteroid.rotation += asteroid.rotationSpeed * deltaTime;
        asteroid.element.style.top = `${asteroid.y}px`;
        asteroid.element.style.transform = `rotate(${asteroid.rotation}deg)`;
        
        // Update collision coordinates
        asteroid.x = parseFloat(asteroid.element.style.left);
        
        // Remove if out of screen
        if (asteroid.y > gameHeight) {
            safeRemoveElement(asteroid.element);
            game.elements.asteroids.splice(i, 1);
            i--;
        }
    }
    
    // Move fuel pickups
    movePickups(game.elements.fuelPickups, deltaTime);
    
    // Move health pickups
    movePickups(game.elements.healthPickups, deltaTime);
    
    // Move point pickups
    movePickups(game.elements.pointPickups, deltaTime);
}

function movePickups(pickups, deltaTime) {
    for (let i = 0; i < pickups.length; i++) {
        const pickup = pickups[i];
        pickup.y += pickup.speed * deltaTime;
        pickup.element.style.top = `${pickup.y}px`;
        
        // Remove if out of screen
        if (pickup.y > gameHeight) {
            safeRemoveElement(pickup.element);
            pickups.splice(i, 1);
            i--;
        }
    }
}

function checkCollisions() {
    // Only check collisions if player is not invulnerable
    if (!game.player.invulnerable) {
        // Check asteroid collisions
        for (let i = 0; i < game.elements.asteroids.length; i++) {
            const asteroid = game.elements.asteroids[i];
            if (checkCollision(
                game.player.x, game.player.y, game.player.width, game.player.height,
                asteroid.x, asteroid.y, asteroid.size, asteroid.size
            )) {
                // Player hit by asteroid
                createExplosion(asteroid.x + asteroid.size / 2, asteroid.y + asteroid.size / 2);
                safeRemoveElement(asteroid.element);
                game.elements.asteroids.splice(i, 1);
                i--;
                
                // Reduce health
                game.health -= CONFIG.ASTEROIDS.damage;
                if (game.health <= 0) {
                    game.health = 0;
                    endGame();
                }
                
                // Make player briefly invulnerable
                makePlayerInvulnerable();
                
                updateUI();
            }
        }
    }
    
    // Check fuel pickup collisions
    checkPickupCollisions(game.elements.fuelPickups, (pickup) => {
        game.fuel = Math.min(game.fuel + CONFIG.PICKUPS.fuel.value, game.maxFuel);
        showMessage(`+${CONFIG.PICKUPS.fuel.value} Fuel`, 1000);
    });
    
    // Check health pickup collisions
    checkPickupCollisions(game.elements.healthPickups, (pickup) => {
        game.health = Math.min(game.health + CONFIG.PICKUPS.health.value, game.maxHealth);
        showMessage(`+${CONFIG.PICKUPS.health.value} Health`, 1000);
    });
    
    // Check point pickup collisions
    checkPickupCollisions(game.elements.pointPickups, (pickup) => {
        const pointsGained = CONFIG.PICKUPS.point.baseValue * game.level;
        game.score += pointsGained;
        showMessage(`+${pointsGained} Points`, 1000);
        
        // Check for level up
        checkLevelUp();
    });
}

function checkPickupCollisions(pickups, callback) {
    for (let i = 0; i < pickups.length; i++) {
        const pickup = pickups[i];
        if (checkCollision(
            game.player.x, game.player.y, game.player.width, game.player.height,
            pickup.x, pickup.y, pickup.width, pickup.height
        )) {
            // Player picked up item
            safeRemoveElement(pickup.element);
            pickups.splice(i, 1);
            i--;
            
            // Execute callback to apply pickup effect
            callback(pickup);
            
            // Update UI
            updateUI();
        }
    }
}

function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
}

function makePlayerInvulnerable() {
    game.player.invulnerable = true;
    DOM.player.style.opacity = '0.5';
    
    // Add a visual effect to the player
    DOM.player.classList.add('invulnerable');
    
    setTimeout(() => {
        game.player.invulnerable = false;
        DOM.player.style.opacity = '1';
        DOM.player.classList.remove('invulnerable');
    }, CONFIG.PLAYER.invulnerabilityTime);
}

function createExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.classList.add('explosion');
    explosion.style.left = `${x - 25}px`;
    explosion.style.top = `${y - 25}px`;
    
    DOM.gameArea.appendChild(explosion);
    
    // Remove explosion element after animation completes
    setTimeout(() => {
        safeRemoveElement(explosion);
    }, 500);
}

// Leveling system
function checkLevelUp() {
    if (game.score >= game.scoreToNextLevel) {
        game.level++;
        game.scoreToNextLevel = Math.floor(game.scoreToNextLevel * CONFIG.LEVEL_UP.scoreMultiplier);
        updateUI();
        showLevelUpModal();
        
        // Increase difficulty
        game.spawnRates.asteroid += CONFIG.SPAWN_RATES.LEVEL_MULTIPLIER.asteroid;
        game.fuelConsumption += CONFIG.FUEL.consumptionIncrease;
    }
}

function showLevelUpModal() {
    game.isPaused = true;
    DOM.levelUpModal.style.display = 'flex';
    DOM.newLevelElement.textContent = game.level;
}

function applyUpgrade(upgradeType) {
    switch (upgradeType) {
        case 'speed':
            game.player.speedBoost += CONFIG.UPGRADES.speed;
            showMessage('Speed Boosted!', 2000);
            break;
        case 'health':
            game.maxHealth += CONFIG.UPGRADES.health;
            game.health = game.maxHealth;
            showMessage('Health Increased!', 2000);
            break;
        case 'fuel':
            game.maxFuel += CONFIG.UPGRADES.fuel;
            game.fuel = game.maxFuel;
            game.fuelConsumption *= CONFIG.FUEL.efficiencyUpgrade; // Reduce fuel consumption
            showMessage('Fuel Efficiency Increased!', 2000);
            break;
    }
    
    DOM.levelUpModal.style.display = 'none';
    game.isPaused = false;
    game.lastTime = performance.now();
    updateUI();
}

// UI Updates
function updateUI() {
    DOM.scoreElement.textContent = game.score;
    DOM.levelElement.textContent = game.level;
    DOM.healthFill.style.width = `${(game.health / game.maxHealth * 100)}%`;
    DOM.fuelFill.style.width = `${(game.fuel / game.maxFuel * 100)}%`;
    
    // Update health bar color based on health percentage
    const healthPercent = game.health / game.maxHealth;
    if (healthPercent < 0.2) {
        DOM.healthFill.style.backgroundColor = 'red';
    } else if (healthPercent < 0.5) {
        DOM.healthFill.style.backgroundColor = 'orange';
    } else {
        DOM.healthFill.style.backgroundColor = 'green';
    }
    
    // Update fuel bar color based on fuel percentage
    const fuelPercent = game.fuel / game.maxFuel;
    if (fuelPercent < 0.2) {
        DOM.fuelFill.style.backgroundColor = 'red';
    } else if (fuelPercent < 0.5) {
        DOM.fuelFill.style.backgroundColor = 'orange';
    } else {
        DOM.fuelFill.style.backgroundColor = 'blue';
    }
}

function showMessage(text, duration) {
    DOM.gameMessages.textContent = text;
    DOM.gameMessages.style.opacity = '1';
    DOM.gameMessages.style.transform = 'translateY(-20px) translateX(-50%)';
    
    // Clear any existing timeout
    if (DOM.gameMessages.timeoutId) {
        clearTimeout(DOM.gameMessages.timeoutId);
    }
    
    // Set new timeout
    DOM.gameMessages.timeoutId = setTimeout(() => {
        DOM.gameMessages.style.opacity = '0';
        DOM.gameMessages.style.transform = 'translateY(0) translateX(-50%)';
    }, duration);
}

function clearGameElements() {
    // More efficiently remove all game elements from the DOM
    for (const category in game.elements) {
        if (game.elements.hasOwnProperty(category)) {
            for (const element of game.elements[category]) {
                safeRemoveElement(element.element);
            }
            game.elements[category] = [];
        }
    }
    
    // Clear all animations except stars
    for (const explosion of game.animations.explosions) {
        safeRemoveElement(explosion.element);
    }
    game.animations.explosions = [];
}

// Helper function to safely remove DOM elements
function safeRemoveElement(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

// Performance monitoring
function updateFPS(deltaTime) {
    // Update every 10 frames to avoid excessive DOM updates
    if (game.frameCount % 10 === 0) {
        const fps = Math.round(1000 / deltaTime);
        DOM.fpsCounter.textContent = `FPS: ${fps}`;
    }
}

// Periodic cleanup to prevent memory leaks
function schedulePeriodicCleanup() {
    setInterval(() => {
        if (game.isRunning && !game.isPaused) {
            performCleanup();
        }
    }, CONFIG.PERFORMANCE.cleanupInterval);
}

function performCleanup() {
    // Remove off-screen elements
    for (const category in game.elements) {
        if (game.elements.hasOwnProperty(category)) {
            game.elements[category] = game.elements[category].filter(element => {
                if (element.y > gameHeight + 100) {
                    safeRemoveElement(element.element);
                    return false;
                }
                return true;
            });
        }
    }
}

// Check device type and set appropriate controls
function checkDeviceType() {
    if (window.innerWidth <= 800 || 'ontouchstart' in window) {
        game.controls.touch = true;
        DOM.mobileControls.style.display = 'flex';
    } else {
        game.controls.touch = false;
        DOM.mobileControls.style.display = 'none';
    }
}

// Save high score to local storage
function saveHighScore(score) {
    const highScore = localStorage.getItem('spaceGameHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('spaceGameHighScore', score);
        showMessage('New High Score!', 3000);
    }
}

// Event Listeners
DOM.startBtn.addEventListener('click', startGame);
DOM.restartBtn.addEventListener('click', restartGame);

DOM.upgradeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const upgradeType = button.getAttribute('data-upgrade');
        applyUpgrade(upgradeType);
    });
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!game.controls.keyboard) return;
    
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
            game.player.moveUp = true;
            break;
        case 'ArrowDown':
        case 's':
            game.player.moveDown = true;
            break;
        case 'ArrowLeft':
        case 'a':
            game.player.moveLeft = true;
            break;
        case 'ArrowRight':
        case 'd':
            game.player.moveRight = true;
            break;
        case 'p':
        case 'P':
        case 'Escape':
            pauseGame();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    if (!game.controls.keyboard) return;
    
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
            game.player.moveUp = false;
            break;
        case 'ArrowDown':
        case 's':
            game.player.moveDown = false;
            break;
        case 'ArrowLeft':
        case 'a':
            game.player.moveLeft = false;
            break;
        case 'ArrowRight':
        case 'd':
            game.player.moveRight = false;
            break;
    }
});

// Touch controls with improved event handling
function setupTouchControls() {
    const touchButtons = [
        { button: DOM.upBtn, action: 'moveUp' },
        { button: DOM.downBtn, action: 'moveDown' },
        { button: DOM.leftBtn, action: 'moveLeft' },
        { button: DOM.rightBtn, action: 'moveRight' }
    ];
    
    // Add touch and mouse events to each direction button
    touchButtons.forEach(({button, action}) => {
        // Touch events
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.player[action] = true;
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.player[action] = false;
        });
        
        // Mouse events (for testing on desktop)
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            game.player[action] = true;
        });
        
        button.addEventListener('mouseup', (e) => {
            e.preventDefault();
            game.player[action] = false;
        });
        
        // Handle case where cursor leaves button while pressed
        button.addEventListener('mouseleave', (e) => {
            game.player[action] = false;
        });
    });
}

// Window resize event with debouncing
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        gameWidth = DOM.gameArea.clientWidth;
        gameHeight = DOM.gameArea.clientHeight;
        
        // Keep player within new boundaries
        game.player.x = Math.min(game.player.x, gameWidth - game.player.width);
        game.player.y = Math.min(game.player.y, gameHeight - game.player.height);
        updatePlayerPosition();
        
        // Check and update mobile controls display
        checkDeviceType();
    }, 250); // Debounce resize events
});

// Advanced features
// Power-up system
const POWER_UPS = {
    types: [
        { 
            name: 'shield', 
            duration: 5000, 
            class: 'shield-pickup',
            effect: activateShield,
            size: 35
        },
        { 
            name: 'magnet', 
            duration: 8000, 
            class: 'magnet-pickup',
            effect: activateMagnet,
            size: 30
        },
        { 
            name: 'blaster', 
            duration: 6000, 
            class: 'blaster-pickup',
            effect: activateBlaster,
            size: 32
        }
    ],
    active: {
        shield: false,
        magnet: false,
        blaster: false
    },
    spawnRate: 0.003
};

// Add power-ups to game elements
game.elements.powerUps = [];

// Function to spawn power-ups
function spawnPowerUps() {
    if (Math.random() < POWER_UPS.spawnRate) {
        // Randomly select a power-up type
        const typeIndex = Math.floor(Math.random() * POWER_UPS.types.length);
        const powerUpType = POWER_UPS.types[typeIndex];
        
        createPowerUp(powerUpType);
    }
}

function createPowerUp(powerUpType) {
    const powerUp = document.createElement('div');
    powerUp.classList.add('power-up', powerUpType.class);
    
    const size = powerUpType.size;
    powerUp.style.width = `${size}px`;
    powerUp.style.height = `${size}px`;
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - size);
    powerUp.style.left = `${x}px`;
    powerUp.style.top = '-50px';
    
    DOM.gameArea.appendChild(powerUp);
    game.elements.powerUps.push({
        element: powerUp,
        x: x,
        y: -50,
        width: size,
        height: size,
        speed: Math.random() * 1.5 + 1,
        type: powerUpType.name,
        effect: powerUpType.effect,
        duration: powerUpType.duration
    });
}

function movePowerUps(deltaTime) {
    for (let i = 0; i < game.elements.powerUps.length; i++) {
        const powerUp = game.elements.powerUps[i];
        powerUp.y += powerUp.speed * deltaTime;
        powerUp.element.style.top = `${powerUp.y}px`;
        
        // Remove if out of screen
        if (powerUp.y > gameHeight) {
            safeRemoveElement(powerUp.element);
            game.elements.powerUps.splice(i, 1);
            i--;
        }
    }
}

function checkPowerUpCollisions() {
    for (let i = 0; i < game.elements.powerUps.length; i++) {
        const powerUp = game.elements.powerUps[i];
        if (checkCollision(
            game.player.x, game.player.y, game.player.width, game.player.height,
            powerUp.x, powerUp.y, powerUp.width, powerUp.height
        )) {
            // Player picked up power-up
            safeRemoveElement(powerUp.element);
            
            // Apply power-up effect
            powerUp.effect(powerUp.duration);
            
            // Remove from array
            game.elements.powerUps.splice(i, 1);
            i--;
            
            showMessage(`${powerUp.type.toUpperCase()} activated!`, 2000);
        }
    }
}

// Power-up effects
function activateShield(duration) {
    if (POWER_UPS.active.shield) {
        // If already active, just extend the duration
        clearTimeout(game.shieldTimeout);
    } else {
        POWER_UPS.active.shield = true;
        game.player.invulnerable = true;
        
        // Add visual effect
        DOM.player.classList.add('shield-active');
    }
    
    // Set timeout to deactivate
    game.shieldTimeout = setTimeout(() => {
        POWER_UPS.active.shield = false;
        game.player.invulnerable = false;
        DOM.player.classList.remove('shield-active');
        showMessage('Shield deactivated', 1500);
    }, duration);
}

function activateMagnet(duration) {
    if (POWER_UPS.active.magnet) {
        // If already active, just extend the duration
        clearTimeout(game.magnetTimeout);
    } else {
        POWER_UPS.active.magnet = true;
        
        // Add visual effect
        DOM.player.classList.add('magnet-active');
    }
    
    // Set timeout to deactivate
    game.magnetTimeout = setTimeout(() => {
        POWER_UPS.active.magnet = false;
        DOM.player.classList.remove('magnet-active');
        showMessage('Magnet deactivated', 1500);
    }, duration);
}

function activateBlaster(duration) {
    if (POWER_UPS.active.blaster) {
        // If already active, just extend the duration
        clearTimeout(game.blasterTimeout);
    } else {
        POWER_UPS.active.blaster = true;
        
        // Add visual effect
        DOM.player.classList.add('blaster-active');
        
        // Start blaster shooting
        game.blasterInterval = setInterval(shootBlaster, 500);
    }
    
    // Set timeout to deactivate
    game.blasterTimeout = setTimeout(() => {
        POWER_UPS.active.blaster = false;
        DOM.player.classList.remove('blaster-active');
        clearInterval(game.blasterInterval);
        showMessage('Blaster deactivated', 1500);
    }, duration);
}

function shootBlaster() {
    if (!game.isRunning || game.isPaused) return;
    
    const blaster = document.createElement('div');
    blaster.classList.add('blaster-shot');
    
    // Position at player's position
    const x = game.player.x + game.player.width / 2 - 5;
    const y = game.player.y;
    
    blaster.style.left = `${x}px`;
    blaster.style.top = `${y}px`;
    
    DOM.gameArea.appendChild(blaster);
    
    // Add to game elements
    if (!game.elements.blasterShots) {
        game.elements.blasterShots = [];
    }
    
    game.elements.blasterShots.push({
        element: blaster,
        x: x,
        y: y,
        width: 10,
        height: 20,
        speed: 8
    });
}

function moveBlasterShots(deltaTime) {
    if (!game.elements.blasterShots) return;
    
    for (let i = 0; i < game.elements.blasterShots.length; i++) {
        const shot = game.elements.blasterShots[i];
        shot.y -= shot.speed * deltaTime;
        shot.element.style.top = `${shot.y}px`;
        
        // Check collisions with asteroids
        let hitAsteroid = false;
        for (let j = 0; j < game.elements.asteroids.length; j++) {
            const asteroid = game.elements.asteroids[j];
            if (checkCollision(
                shot.x, shot.y, shot.width, shot.height,
                asteroid.x, asteroid.y, asteroid.size, asteroid.size
            )) {
                // Blaster hit asteroid
                createExplosion(asteroid.x + asteroid.size / 2, asteroid.y + asteroid.size / 2);
                safeRemoveElement(asteroid.element);
                game.elements.asteroids.splice(j, 1);
                
                // Add points
                game.score += 5 * game.level;
                updateUI();
                
                hitAsteroid = true;
                break;
            }
        }
        
        // Remove shot if it hit an asteroid or went off screen
        if (hitAsteroid || shot.y < -50) {
            safeRemoveElement(shot.element);
            game.elements.blasterShots.splice(i, 1);
            i--;
        }
    }
}

// Magnet effect - attract pickups
function applyMagnetEffect(deltaTime) {
    if (!POWER_UPS.active.magnet) return;
    
    // Attract point pickups
    attractPickups(game.elements.pointPickups, deltaTime);
    
    // Attract fuel pickups
    attractPickups(game.elements.fuelPickups, deltaTime);
    
    // Attract health pickups
    attractPickups(game.elements.healthPickups, deltaTime);
}

function attractPickups(pickups, deltaTime) {
    const magnetStrength = 5 * deltaTime;
    const playerCenterX = game.player.x + game.player.width / 2;
    const playerCenterY = game.player.y + game.player.height / 2;
    
    for (const pickup of pickups) {
        const pickupCenterX = pickup.x + pickup.width / 2;
        const pickupCenterY = pickup.y + pickup.height / 2;
        
        // Calculate direction to player
        const dx = playerCenterX - pickupCenterX;
        const dy = playerCenterY - pickupCenterY;
        
        // Calculate distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only attract if within range
        if (distance < 200) {
            // Move pickup toward player with strength inversely proportional to distance
            const strength = (magnetStrength * 100) / Math.max(50, distance);
            
            pickup.x += dx * strength / distance;
            pickup.y += dy * strength / distance;
            
            pickup.element.style.left = `${pickup.x}px`;
            pickup.element.style.top = `${pickup.y}px`;
        }
    }
}

// Update game functions to include new features
// Update moveGameElements
function moveGameElements(deltaTime) {
    // Move asteroids with rotation
    for (let i = 0; i < game.elements.asteroids.length; i++) {
        const asteroid = game.elements.asteroids[i];
        asteroid.y += asteroid.speed * deltaTime;
        asteroid.rotation += asteroid.rotationSpeed * deltaTime;
        asteroid.element.style.top = `${asteroid.y}px`;
        asteroid.element.style.transform = `rotate(${asteroid.rotation}deg)`;
        
        // Update collision coordinates
        asteroid.x = parseFloat(asteroid.element.style.left);
        
        // Remove if out of screen
        if (asteroid.y > gameHeight) {
            safeRemoveElement(asteroid.element);
            game.elements.asteroids.splice(i, 1);
            i--;
        }
    }
    
    // Move pickups
    movePickups(game.elements.fuelPickups, deltaTime);
    movePickups(game.elements.healthPickups, deltaTime);
    movePickups(game.elements.pointPickups, deltaTime);
    
    // Move power-ups
    movePowerUps(deltaTime);
    
    // Move blaster shots
    moveBlasterShots(deltaTime);
    
    // Apply magnet effect
    applyMagnetEffect(deltaTime);
}

// Update spawnGameElements
function spawnGameElements() {
    // Spawn elements based on probability and level
    if (Math.random() < game.spawnRates.asteroid * game.level) {
        createAsteroid();
    }
    
    if (Math.random() < game.spawnRates.fuel) {
        createFuelPickup();
    }
    
    if (Math.random() < game.spawnRates.health) {
        createHealthPickup();
    }
    
    if (Math.random() < game.spawnRates.point) {
        createPointPickup();
    }
    
    // Spawn power-ups
    spawnPowerUps();
}

// Update checkCollisions
function checkCollisions() {
    // Only check collisions if player is not invulnerable
    if (!game.player.invulnerable) {
        // Check asteroid collisions
        for (let i = 0; i < game.elements.asteroids.length; i++) {
            const asteroid = game.elements.asteroids[i];
            if (checkCollision(
                game.player.x, game.player.y, game.player.width, game.player.height,
                asteroid.x, asteroid.y, asteroid.size, asteroid.size
            )) {
                // Player hit by asteroid
                createExplosion(asteroid.x + asteroid.size / 2, asteroid.y + asteroid.size / 2);
                safeRemoveElement(asteroid.element);
                game.elements.asteroids.splice(i, 1);
                i--;
                
                // Reduce health
                game.health -= CONFIG.ASTEROIDS.damage;
                if (game.health <= 0) {
                    game.health = 0;
                    endGame();
                }
                
                // Make player briefly invulnerable
                makePlayerInvulnerable();
                
                updateUI();
            }
        }
    }
    
    // Check fuel pickup collisions
    checkPickupCollisions(game.elements.fuelPickups, (pickup) => {
        game.fuel = Math.min(game.fuel + CONFIG.PICKUPS.fuel.value, game.maxFuel);
        showMessage(`+${CONFIG.PICKUPS.fuel.value} Fuel`, 1000);
    });
    
    // Check health pickup collisions
    checkPickupCollisions(game.elements.healthPickups, (pickup) => {
        game.health = Math.min(game.health + CONFIG.PICKUPS.health.value, game.maxHealth);
        showMessage(`+${CONFIG.PICKUPS.health.value} Health`, 1000);
    });
    
    // Check point pickup collisions
    checkPickupCollisions(game.elements.pointPickups, (pickup) => {
        const pointsGained = CONFIG.PICKUPS.point.baseValue * game.level;
        game.score += pointsGained;
        showMessage(`+${pointsGained} Points`, 1000);
        
        // Check for level up
        checkLevelUp();
    });
    
    // Check power-up collisions
    checkPowerUpCollisions();
}

// Update game loop
function updateGameState(deltaTime) {
    movePlayer(deltaTime);
    moveGameElements(deltaTime);
    checkCollisions();
    
    // Increment frame counter and only spawn on some frames to improve performance
    game.frameCount++;
    if (game.frameCount % 2 === 0) {
        spawnGameElements();
    }
    
    updateStarfield(deltaTime);
    consumeFuel(deltaTime);
}

// Add sound effects - these can be enabled/disabled by the player
const sounds = {
    enabled: false,
    explosion: new Audio('explosion.mp3'),  // These files would need to be provided
    pickup: new Audio('pickup.mp3'),
    levelUp: new Audio('levelup.mp3'),
    gameOver: new Audio('gameover.mp3'),
    blaster: new Audio('blaster.mp3')
};

function playSound(sound) {
    if (sounds.enabled && sounds[sound]) {
        // Clone the audio to allow overlapping sounds
        const audioClone = sounds[sound].cloneNode();
        audioClone.volume = 0.3;  // Lower volume
        audioClone.play();
    }
}

// Create sound toggle button
function createSoundToggleButton() {
    const soundBtn = document.createElement('button');
    soundBtn.id = 'sound-btn';
    soundBtn.textContent = '🔇';  // Start muted
    soundBtn.className = 'game-button';
    soundBtn.style.position = 'absolute';
    soundBtn.style.top = '10px';
    soundBtn.style.right = '60px';  // Position next to pause button
    soundBtn.style.zIndex = '100';
    
    soundBtn.addEventListener('click', () => {
        sounds.enabled = !sounds.enabled;
        soundBtn.textContent = sounds.enabled ? '🔊' : '🔇';
    });
    
    document.body.appendChild(soundBtn);
    return soundBtn;
}

// Add to DOM object
DOM.soundBtn = createSoundToggleButton();

// Add difficulty settings
const DIFFICULTY = {
    current: 'normal',
    settings: {
        easy: {
            asteroidDamage: 15,
            fuelConsumption: 0.08,
            scoreMultiplier: 0.8
        },
        normal: {
            asteroidDamage: 20,
            fuelConsumption: 0.1,
            scoreMultiplier: 1.0
        },
        hard: {
            asteroidDamage: 30,
            fuelConsumption: 0.15,
            scoreMultiplier: 1.2
        }
    }
};

function createDifficultySelector() {
    const container = document.createElement('div');
    container.id = 'difficulty-selector';
    container.style.position = 'absolute';
    container.style.top = '50px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '100';
    container.style.display = 'flex';
    container.style.gap = '10px';
    
    const difficulties = ['easy', 'normal', 'hard'];
    
    difficulties.forEach(diff => {
        const btn = document.createElement('button');
        btn.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
        btn.className = 'difficulty-btn';
        if (diff === DIFFICULTY.current) {
            btn.classList.add('active');
        }
        
        btn.addEventListener('click', () => {
            // Only allow changing difficulty before game starts
            if (!game.isRunning) {
                DIFFICULTY.current = diff;
                
                // Update button styles
                document.querySelectorAll('.difficulty-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                // Apply difficulty settings
                applyDifficultySettings();
            }
        });
        
        container.appendChild(btn);
    });
    
    // Only show before game starts
    DOM.startBtn.addEventListener('click', () => {
        container.style.display = 'none';
    });
    
    document.body.appendChild(container);
    return container;
}

function applyDifficultySettings() {
    const settings = DIFFICULTY.settings[DIFFICULTY.current];
    
    // Apply settings to game config
    CONFIG.ASTEROIDS.damage = settings.asteroidDamage;
    CONFIG.FUEL.baseConsumption = settings.fuelConsumption;
    game.fuelConsumption = settings.fuelConsumption;
    
    // Show message
    showMessage(`Difficulty: ${DIFFICULTY.current}`, 2000);
}

// Add to DOM object
DOM.difficultySelector = createDifficultySelector();

// Initialize and start the game
function init() {
    // Apply CSS for new elements
    applyAdditionalStyles();
    
    // Set up touch controls
    setupTouchControls();
    
    // Initialize the game
    initGame();
    
    // Apply selected difficulty
    applyDifficultySettings();
}

function applyAdditionalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .shield-active {
            box-shadow: 0 0 15px 5px rgba(0, 255, 255, 0.7);
            border-radius: 50%;
        }
        
        .magnet-active {
            box-shadow: 0 0 15px 5px rgba(255, 0, 255, 0.7);
        }
        
        .blaster-active::before, .blaster-active::after {
            content: '';
            position: absolute;
            top: 0;
            width: 8px;
            height: 15px;
            background-color: red;
            border-radius: 2px;
        }
        
        .blaster-active::before {
            left: 5px;
        }
        
        .blaster-active::after {
            right: 5px;
        }
        
        .blaster-shot {
            position: absolute;
            width: 6px;
            height: 15px;
            background-color: red;
            border-radius: 3px;
            z-index: 5;
        }
        
        .shield-pickup {
            position: absolute;
            width: 35px;
            height: 35px;
            background-color: cyan;
            border-radius: 50%;
            z-index: 5;
            animation: pulse 1s infinite alternate;
        }
        
        .magnet-pickup {
            position: absolute;
            width: 30px;
            height: 30px;
            background-color: magenta;
            border-radius: 5px;
            z-index: 5;
            animation: rotate 2s linear infinite;
        }
        
        .blaster-pickup {
            position: absolute;
            width: 32px;
            height: 32px;
            background-color: red;
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
            z-index: 5;
            animation: blink 0.5s infinite alternate;
        }
        
        @keyframes pulse {
            from { transform: scale(0.9); opacity: 0.8; }
            to { transform: scale(1.1); opacity: 1; }
        }
        
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes blink {
            from { opacity: 0.5; }
            to { opacity: 1; }
        }
        
        .difficulty-btn {
            padding: 5px 10px;
            background-color: #444;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .difficulty-btn.active {
            background-color: #8a2be2;
        }
        
        .invulnerable {
            animation: blink 0.2s infinite alternate;
        }
        
        #fps-counter {
            background-color: rgba(0, 0, 0, 0.5);
            padding: 2px 5px;
            border-radius: 3px;
        }
        
        .game-button {
            background-color: #333;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .game-button:hover {
            background-color: #555;
        }
        
        .paused {
            background-color: #8a2be2;
        }
    `;
    document.head.appendChild(style);
}

// Initialize on window load
window.addEventListener('load', init);