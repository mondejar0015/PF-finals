// Game variables
let game = {
    isRunning: false,
    score: 0,
    level: 1,
    health: 100,
    maxHealth: 100,
    fuel: 100,
    maxFuel: 100,
    fuelConsumption: 0.1,
    speed: 3,
    scoreToNextLevel: 100,
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
        width: 40,
        height: 50,
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: false,
        speedBoost: 1,
        invulnerable: false
    },
    spawnRates: {
        asteroid: 0.02,
        fuel: 0.005,
        health: 0.003,
        point: 0.01
    },
    controls: {
        keyboard: true,
        touch: false
    },
    animations: {
        stars: [],
        explosions: []
    }
};

// DOM Elements
const gameArea = document.getElementById('game-area');
const player = document.getElementById('player');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const healthFill = document.getElementById('health-fill');
const fuelFill = document.getElementById('fuel-fill');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameOverModal = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const gameMessages = document.getElementById('game-messages');
const levelUpModal = document.getElementById('level-up');
const newLevelElement = document.getElementById('new-level');
const upgradeButtons = document.querySelectorAll('.upgrade-btn');

// Touch control buttons
const upBtn = document.getElementById('up-btn');
const downBtn = document.getElementById('down-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');

// Game dimensions
let gameWidth = gameArea.clientWidth;
let gameHeight = gameArea.clientHeight;

// Initialize the game
function initGame() {
    game.player.x = gameWidth / 2 - game.player.width / 2;
    game.player.y = gameHeight - game.player.height - 20;
    updatePlayerPosition();
    createStarfield();
    
    // Reset game state
    game.score = 0;
    game.level = 1;
    game.health = game.maxHealth;
    game.fuel = game.maxFuel;
    game.scoreToNextLevel = 100;
    
    // Clear all game elements
    clearGameElements();
    
    // Update UI
    updateUI();
}

function startGame() {
    if (!game.isRunning) {
        game.isRunning = true;
        gameLoop();
        startBtn.style.display = 'none';
        
        // Check if on mobile
        if (window.innerWidth <= 800) {
            game.controls.touch = true;
            document.querySelector('.mobile-controls').style.display = 'flex';
        }
    }
}

function endGame() {
    game.isRunning = false;
    showMessage('Game Over!', 2000);
    gameOverModal.style.display = 'flex';
    finalScoreElement.textContent = game.score;
}

function restartGame() {
    gameOverModal.style.display = 'none';
    initGame();
    startGame();
}

// Game loop
function gameLoop() {
    if (!game.isRunning) return;
    
    movePlayer();
    moveGameElements();
    checkCollisions();
    spawnGameElements();
    updateStarfield();
    consumeFuel();
    
    requestAnimationFrame(gameLoop);
}

// Player movement
function movePlayer() {
    // Calculate movement based on key presses
    if (game.player.moveUp && game.player.y > 0) {
        game.player.y -= game.speed * game.player.speedBoost;
    }
    if (game.player.moveDown && game.player.y < gameHeight - game.player.height) {
        game.player.y += game.speed * game.player.speedBoost;
    }
    if (game.player.moveLeft && game.player.x > 0) {
        game.player.x -= game.speed * game.player.speedBoost;
        player.style.transform = 'rotate(-15deg)';
    } else if (game.player.moveRight && game.player.x < gameWidth - game.player.width) {
        game.player.x += game.speed * game.player.speedBoost;
        player.style.transform = 'rotate(15deg)';
    } else {
        player.style.transform = 'rotate(0deg)';
    }
    
    // Keep player within boundaries
    if (game.player.x < 0) game.player.x = 0;
    if (game.player.x > gameWidth - game.player.width) game.player.x = gameWidth - game.player.width;
    if (game.player.y < 0) game.player.y = 0;
    if (game.player.y > gameHeight - game.player.height) game.player.y = gameHeight - game.player.height;
    
    updatePlayerPosition();
}

function updatePlayerPosition() {
    player.style.left = game.player.x + 'px';
    player.style.top = game.player.y + 'px';
}

// Fuel consumption
function consumeFuel() {
    if (game.player.moveUp || game.player.moveDown || game.player.moveLeft || game.player.moveRight) {
        game.fuel -= game.fuelConsumption;
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
    for (let i = 0; i < 100; i++) {
        createStar();
    }
}

function createStar() {
    const star = document.createElement('div');
    star.classList.add('star');
    
    // Random size between 1-3px
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    
    // Random position
    const x = Math.random() * gameWidth;
    const y = Math.random() * gameHeight;
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    
    // Random speed (for parallax effect)
    const speed = Math.random() * 2 + 0.5;
    
    // Add to DOM and track
    gameArea.appendChild(star);
    game.animations.stars.push({
        element: star,
        x: x,
        y: y,
        speed: speed
    });
}

function updateStarfield() {
    for (let i = 0; i < game.animations.stars.length; i++) {
        const star = game.animations.stars[i];
        star.y += star.speed;
        
        // Reset star position if it goes off screen
        if (star.y > gameHeight) {
            star.y = -5;
            star.x = Math.random() * gameWidth;
        }
        
        star.element.style.top = star.y + 'px';
        star.element.style.left = star.x + 'px';
    }
}

// Game elements
function spawnGameElements() {
    // Spawn elements based on probability
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
    
    // Random size between 20-50px
    const size = Math.random() * 30 + 20;
    asteroid.style.width = size + 'px';
    asteroid.style.height = size + 'px';
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - size);
    asteroid.style.left = x + 'px';
    asteroid.style.top = '-50px';
    
    gameArea.appendChild(asteroid);
    game.elements.asteroids.push({
        element: asteroid,
        x: x,
        y: -50,
        size: size,
        speed: Math.random() * 2 + 2
    });
}

function createFuelPickup() {
    const fuel = document.createElement('div');
    fuel.classList.add('fuel-pickup');
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - 30);
    fuel.style.left = x + 'px';
    fuel.style.top = '-50px';
    
    gameArea.appendChild(fuel);
    game.elements.fuelPickups.push({
        element: fuel,
        x: x,
        y: -50,
        width: 30,
        height: 30,
        speed: Math.random() * 1.5 + 2
    });
}

function createHealthPickup() {
    const health = document.createElement('div');
    health.classList.add('health-pickup');
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - 25);
    health.style.left = x + 'px';
    health.style.top = '-50px';
    
    gameArea.appendChild(health);
    game.elements.healthPickups.push({
        element: health,
        x: x,
        y: -50,
        width: 25,
        height: 25,
        speed: Math.random() * 1.5 + 1.5
    });
}

function createPointPickup() {
    const point = document.createElement('div');
    point.classList.add('point-pickup');
    
    // Spawn at random x position at the top of the screen
    const x = Math.random() * (gameWidth - 20);
    point.style.left = x + 'px';
    point.style.top = '-50px';
    
    gameArea.appendChild(point);
    game.elements.pointPickups.push({
        element: point,
        x: x,
        y: -50,
        width: 20,
        height: 20,
        speed: Math.random() * 2 + 2
    });
}

function moveGameElements() {
    // Move asteroids
    for (let i = 0; i < game.elements.asteroids.length; i++) {
        const asteroid = game.elements.asteroids[i];
        asteroid.y += asteroid.speed;
        asteroid.element.style.top = asteroid.y + 'px';
        
        // Remove if out of screen
        if (asteroid.y > gameHeight) {
            gameArea.removeChild(asteroid.element);
            game.elements.asteroids.splice(i, 1);
            i--;
        }
    }
    
    // Move fuel pickups
    for (let i = 0; i < game.elements.fuelPickups.length; i++) {
        const fuel = game.elements.fuelPickups[i];
        fuel.y += fuel.speed;
        fuel.element.style.top = fuel.y + 'px';
        
        // Remove if out of screen
        if (fuel.y > gameHeight) {
            gameArea.removeChild(fuel.element);
            game.elements.fuelPickups.splice(i, 1);
            i--;
        }
    }
    
    // Move health pickups
    for (let i = 0; i < game.elements.healthPickups.length; i++) {
        const health = game.elements.healthPickups[i];
        health.y += health.speed;
        health.element.style.top = health.y + 'px';
        
        // Remove if out of screen
        if (health.y > gameHeight) {
            gameArea.removeChild(health.element);
            game.elements.healthPickups.splice(i, 1);
            i--;
        }
    }
    
    // Move point pickups
    for (let i = 0; i < game.elements.pointPickups.length; i++) {
        const point = game.elements.pointPickups[i];
        point.y += point.speed;
        point.element.style.top = point.y + 'px';
        
        // Remove if out of screen
        if (point.y > gameHeight) {
            gameArea.removeChild(point.element);
            game.elements.pointPickups.splice(i, 1);
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
                gameArea.removeChild(asteroid.element);
                game.elements.asteroids.splice(i, 1);
                i--;
                
                // Reduce health
                game.health -= 20;
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
    for (let i = 0; i < game.elements.fuelPickups.length; i++) {
        const fuel = game.elements.fuelPickups[i];
        if (checkCollision(
            game.player.x, game.player.y, game.player.width, game.player.height,
            fuel.x, fuel.y, fuel.width, fuel.height
        )) {
            // Player picked up fuel
            gameArea.removeChild(fuel.element);
            game.elements.fuelPickups.splice(i, 1);
            i--;
            
            // Increase fuel
            game.fuel = Math.min(game.fuel + 25, game.maxFuel);
            updateUI();
            showMessage('+25 Fuel', 1000);
        }
    }
    
    // Check health pickup collisions
    for (let i = 0; i < game.elements.healthPickups.length; i++) {
        const health = game.elements.healthPickups[i];
        if (checkCollision(
            game.player.x, game.player.y, game.player.width, game.player.height,
            health.x, health.y, health.width, health.height
        )) {
            // Player picked up health
            gameArea.removeChild(health.element);
            game.elements.healthPickups.splice(i, 1);
            i--;
            
            // Increase health
            game.health = Math.min(game.health + 20, game.maxHealth);
            updateUI();
            showMessage('+20 Health', 1000);
        }
    }
    
    // Check point pickup collisions
    for (let i = 0; i < game.elements.pointPickups.length; i++) {
        const point = game.elements.pointPickups[i];
        if (checkCollision(
            game.player.x, game.player.y, game.player.width, game.player.height,
            point.x, point.y, point.width, point.height
        )) {
            // Player picked up points
            gameArea.removeChild(point.element);
            game.elements.pointPickups.splice(i, 1);
            i--;
            
            // Increase score
            const pointsGained = 10 * game.level;
            game.score += pointsGained;
            updateUI();
            showMessage(`+${pointsGained} Points`, 1000);
            
            // Check for level up
            checkLevelUp();
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
    player.style.opacity = '0.5';
    
    setTimeout(() => {
        game.player.invulnerable = false;
        player.style.opacity = '1';
    }, 1500);
}

function createExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.classList.add('explosion');
    explosion.style.left = (x - 25) + 'px';
    explosion.style.top = (y - 25) + 'px';
    
    gameArea.appendChild(explosion);
    
    // Remove explosion element after animation completes
    setTimeout(() => {
        gameArea.removeChild(explosion);
    }, 500);
}

// Leveling system
function checkLevelUp() {
    if (game.score >= game.scoreToNextLevel) {
        game.level++;
        game.scoreToNextLevel = Math.floor(game.scoreToNextLevel * 1.5);
        updateUI();
        showLevelUpModal();
        
        // Increase difficulty
        game.spawnRates.asteroid += 0.005;
        game.fuelConsumption += 0.02;
    }
}

function showLevelUpModal() {
    game.isRunning = false;
    levelUpModal.style.display = 'flex';
    newLevelElement.textContent = game.level;
}

function applyUpgrade(upgradeType) {
    switch (upgradeType) {
        case 'speed':
            game.player.speedBoost += 0.2;
            showMessage('Speed Boosted!', 2000);
            break;
        case 'health':
            game.maxHealth += 25;
            game.health = game.maxHealth;
            showMessage('Health Increased!', 2000);
            break;
        case 'fuel':
            game.maxFuel += 25;
            game.fuel = game.maxFuel;
            game.fuelConsumption *= 0.9; // Reduce fuel consumption
            showMessage('Fuel Efficiency Increased!', 2000);
            break;
    }
    
    levelUpModal.style.display = 'none';
    game.isRunning = true;
    updateUI();
}

// UI Updates
function updateUI() {
    scoreElement.textContent = game.score;
    levelElement.textContent = game.level;
    healthFill.style.width = (game.health / game.maxHealth * 100) + '%';
    fuelFill.style.width = (game.fuel / game.maxFuel * 100) + '%';
}

function showMessage(text, duration) {
    gameMessages.textContent = text;
    gameMessages.style.opacity = '1';
    gameMessages.style.transform = 'translateY(-20px) translateX(-50%)';
    
    setTimeout(() => {
        gameMessages.style.opacity = '0';
        gameMessages.style.transform = 'translateY(0) translateX(-50%)';
    }, duration);
}

function clearGameElements() {
    // Remove all game elements from the DOM
    for (const category in game.elements) {
        if (game.elements.hasOwnProperty(category)) {
            for (const element of game.elements[category]) {
                if (element.element && element.element.parentNode) {
                    element.element.parentNode.removeChild(element.element);
                }
            }
            game.elements[category] = [];
        }
    }
    
    // Clear all animations except stars
    for (const explosion of game.animations.explosions) {
        if (explosion.element && explosion.element.parentNode) {
            explosion.element.parentNode.removeChild(explosion.element);
        }
    }
    game.animations.explosions = [];
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

upgradeButtons.forEach(button => {
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

// Touch controls
upBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.player.moveUp = true;
});

upBtn.addEventListener('touchend', () => {
    game.player.moveUp = false;
});

downBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.player.moveDown = true;
});

downBtn.addEventListener('touchend', () => {
    game.player.moveDown = false;
});

leftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.player.moveLeft = true;
});

leftBtn.addEventListener('touchend', () => {
    game.player.moveLeft = false;
});

rightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.player.moveRight = true;
});

rightBtn.addEventListener('touchend', () => {
    game.player.moveRight = false;
});

// Mouse/touch events for mobile buttons
upBtn.addEventListener('mousedown', () => {
    game.player.moveUp = true;
});

upBtn.addEventListener('mouseup', () => {
    game.player.moveUp = false;
});

downBtn.addEventListener('mousedown', () => {
    game.player.moveDown = true;
});

downBtn.addEventListener('mouseup', () => {
    game.player.moveDown = false;
});

leftBtn.addEventListener('mousedown', () => {
    game.player.moveLeft = true;
});

leftBtn.addEventListener('mouseup', () => {
    game.player.moveLeft = false;
});

rightBtn.addEventListener('mousedown', () => {
    game.player.moveRight = true;
});

rightBtn.addEventListener('mouseup', () => {
    game.player.moveRight = false;
});

// Window resize event
window.addEventListener('resize', () => {
    gameWidth = gameArea.clientWidth;
    gameHeight = gameArea.clientHeight;
    
    // Update mobile controls display
    if (window.innerWidth <= 800) {
        game.controls.touch = true;
        document.querySelector('.mobile-controls').style.display = 'flex';
    } else {
        game.controls.touch = false;
        document.querySelector('.mobile-controls').style.display = 'none';
    }
});

// Initialize the game when the page loads
window.addEventListener('load', () => {
    initGame();
});