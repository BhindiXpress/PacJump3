import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const DoodleJumpGame = () => {
  const canvasRef = React.useRef(null);
  const gameStateRef = React.useRef(null);
  const gameOverTriggered = React.useRef(false); // Guard for collision sound triggers
  const [score, setScore] = React.useState(0);
  const [gameOver, setGameOver] = React.useState(false);
  const [highScore, setHighScore] = React.useState(0);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Audio objects – created once and persist via useRef.
  const gameOverSound = React.useRef(new Audio(process.env.PUBLIC_URL + '/sounds/gameover.mp3'));
  const winSound = React.useRef(new Audio(process.env.PUBLIC_URL + '/sounds/gamewin.mp3'));

  // Add error handling for audio loading
  React.useEffect(() => {
    const handleAudioError = (e) => {
      console.error('Audio loading error:', e);
    };

    gameOverSound.current.addEventListener('error', handleAudioError);
    winSound.current.addEventListener('error', handleAudioError);

    return () => {
      gameOverSound.current.removeEventListener('error', handleAudioError);
      winSound.current.removeEventListener('error', handleAudioError);
    };
  }, []);

  // Game Constants
  const GRAVITY = 0.25;
  const JUMP_FORCE = -12;
  const PLAYER_SIZE = 40;
  const PLATFORM_WIDTH = 150;
  const PLATFORM_HEIGHT = 15;
  const PLATFORM_SPACING = 60;
  const SCREEN_WIDTH = window.innerWidth;
  const SCREEN_HEIGHT = window.innerHeight;
  const WINNING_SCORE = 1000;
  const ghostColors = ['#FF0000', '#FFC0CB', '#00FFFF', '#FFA500'];

  // Drawing Functions
  const drawPacman = (ctx, x, y, size) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2;
    const mouthAngle = Math.PI / 8;
    
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, mouthAngle, 2 * Math.PI - mouthAngle, false);
    ctx.closePath();
    ctx.fill();

    const eyeRadius = size * 0.1;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX - size * 0.15, centerY - size * 0.25, eyeRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + size * 0.05, centerY - size * 0.25, eyeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'black';
    const pupilRadius = eyeRadius * 0.5;
    ctx.beginPath();
    ctx.arc(centerX - size * 0.15, centerY - size * 0.25, pupilRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + size * 0.05, centerY - size * 0.25, pupilRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const legStartY = y + size * 0.85;
    const leftLegX = x + size * 0.35;
    const rightLegX = x + size * 0.65;
    const legEndY = y + size * 1.1;
    ctx.beginPath();
    ctx.moveTo(leftLegX, legStartY);
    ctx.lineTo(leftLegX, legEndY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rightLegX, legStartY);
    ctx.lineTo(rightLegX, legEndY);
    ctx.stroke();

    const footRadius = size * 0.1;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(leftLegX, legEndY + footRadius, footRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightLegX, legEndY + footRadius, footRadius, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawGhost = (ctx, x, y, size, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, Math.PI, 0, false);
    ctx.lineTo(x + size, y + size);
    const waveCount = 3;
    const waveWidth = size / waveCount;
    for (let i = 0; i < waveCount; i++) {
      let currentX = x + size - i * waveWidth;
      let nextX = currentX - waveWidth;
      let midX = (currentX + nextX) / 2;
      ctx.quadraticCurveTo(midX, y + size - 5, nextX, y + size);
    }
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.fill();

    const eyeRadius = size * 0.15;
    const eyeOffsetX = size * 0.25;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX, y + size / 2, eyeRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size - eyeOffsetX, y + size / 2, eyeRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'black';
    const pupilRadius = eyeRadius * 0.5;
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX, y + size / 2, pupilRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size - eyeOffsetX, y + size / 2, pupilRadius, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Game Initialization Functions
  const initPlatforms = () => {
    const platforms = [];
    const numPlatforms = Math.ceil(((WINNING_SCORE + 200) * 10) / PLATFORM_SPACING);
    for (let i = 0; i < numPlatforms; i++) {
      const x = Math.random() * (SCREEN_WIDTH - PLATFORM_WIDTH);
      const y = SCREEN_HEIGHT - i * PLATFORM_SPACING;
      const type = Math.random() < 0.2 ? 'bouncy' : 'static';
      platforms.push({ x, y, type });
    }
    return platforms;
  };

  const initEnemies = (platforms) => {
    return platforms
      .filter((_, i) => i % 10 === 0 && i !== 0)
      .map(platform => ({
        x: platform.x + PLATFORM_WIDTH / 2 - 15,
        y: platform.y - 30,
        width: 30,
        height: 30,
        direction: Math.random() < 0.5 ? -1 : 1,
        color: ghostColors[Math.floor(Math.random() * ghostColors.length)]
      }));
  };

  const initGameState = () => {
    const platforms = initPlatforms();
    const enemies = initEnemies(platforms);
    const firstPlatform = platforms[0];
    return {
      player: {
        x: firstPlatform.x + (PLATFORM_WIDTH - PLAYER_SIZE) / 2,
        y: firstPlatform.y - PLAYER_SIZE - 30,
        velocityY: 0,
        velocityX: 0,
        isJumping: false
      },
      platforms,
      enemies,
      cameraY: 0,
      maxHeight: 0
    };
  };

  // Input handling.
  React.useEffect(() => {
    if (!isInitialized) return;
    const handleKeyDown = (e) => {
      if (gameOver) return;
      const speed = 3.5;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        gameStateRef.current.player.velocityX = -speed;
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        gameStateRef.current.player.velocityX = speed;
      }
    };
    const handleKeyUp = (e) => {
      if (gameOver) return;
      if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) {
        gameStateRef.current.player.velocityX = 0;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver, isInitialized]);

  // Main game loop.
  React.useEffect(() => {
    if (gameOver || !isInitialized) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastTime = 0;

    const gameLoop = (currentTime) => {
      if (!lastTime) lastTime = currentTime;
      lastTime = currentTime;
      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      const state = gameStateRef.current;
      if (!state) return;

      // Update player physics.
      state.player.x += state.player.velocityX;
      state.player.y += state.player.velocityY;
      state.player.velocityY += GRAVITY;
      if (state.player.x < 0) state.player.x = SCREEN_WIDTH;
      if (state.player.x > SCREEN_WIDTH) state.player.x = 0;

      // Enemy collision detection using for–of loop.
      for (let enemy of state.enemies) {
        enemy.x += enemy.direction * 1.5;
        if (enemy.x <= 0 || enemy.x + enemy.width >= SCREEN_WIDTH) {
          enemy.direction *= -1;
        }
        if (
          !gameOverTriggered.current &&
          state.player.x < enemy.x + enemy.width &&
          state.player.x + PLAYER_SIZE > enemy.x &&
          state.player.y < enemy.y + enemy.height &&
          state.player.y + PLAYER_SIZE > enemy.y
        ) {
          gameOverTriggered.current = true;
          setGameOver(true);
          // Immediately set and play game-over sound from 0.7 sec.
          gameOverSound.current.currentTime = 0.7;
          gameOverSound.current.play().catch(error => {
            console.error('Failed to play game over sound:', error);
          });
          break; // Exit loop after handling collision.
        }
      }

      // Platform collision.
      state.platforms.forEach(platform => {
        if (
          state.player.y + PLAYER_SIZE >= platform.y &&
          state.player.y + PLAYER_SIZE <= platform.y + PLATFORM_HEIGHT + 5 &&
          state.player.x + PLAYER_SIZE > platform.x &&
          state.player.x < platform.x + PLATFORM_WIDTH &&
          state.player.velocityY > 0
        ) {
          state.player.velocityY = platform.type === 'bouncy' ? JUMP_FORCE * 1.5 : JUMP_FORCE;
          state.player.isJumping = true;
        }
      });

      // Update camera and score.
      if (state.player.y < SCREEN_HEIGHT / 2) {
        const cameraOffset = SCREEN_HEIGHT / 2 - state.player.y;
        state.cameraY = cameraOffset;
        const newMaxHeight = Math.max(0, SCREEN_HEIGHT - state.player.y);
        if (newMaxHeight > state.maxHeight) {
          state.maxHeight = newMaxHeight;
          const currentScore = Math.floor(state.maxHeight / 10);
          setScore(currentScore);
          if (currentScore > highScore) {
            setHighScore(currentScore);
          }
          // Win condition.
          if (!gameOverTriggered.current && currentScore >= WINNING_SCORE) {
            gameOverTriggered.current = true;
            setGameOver(true);
            // Immediately set and play win sound at 1 sec.
            winSound.current.currentTime = 1;
            winSound.current.play().catch(() => {});
            alert('🎉 You Win! Score: ' + currentScore);
          }
        }
      }

      // Check if player falls off screen.
      if (!gameOverTriggered.current && state.player.y > SCREEN_HEIGHT + 100) {
        gameOverTriggered.current = true;
        setGameOver(true);
        gameOverSound.current.currentTime = 0.7;
        gameOverSound.current.play().catch(error => {
          console.error('Failed to play game over sound:', error);
        });
      }

      // Draw game elements.
      ctx.save();
      ctx.translate(0, state.cameraY);
      state.platforms.forEach(platform => {
        ctx.fillStyle = platform.type === 'bouncy' ? '#FFD700' : '#4CAF50';
        ctx.fillRect(platform.x, platform.y, PLATFORM_WIDTH, PLATFORM_HEIGHT);
      });
      state.enemies.forEach(enemy => {
        drawGhost(ctx, enemy.x, enemy.y, enemy.width, enemy.color);
      });
      drawPacman(ctx, state.player.x, state.player.y, PLAYER_SIZE);
      ctx.restore();

      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText(`Score: ${score}`, 20, 30);
      ctx.fillText(`High Score: ${highScore}`, 20, 60);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop(0);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, highScore, isInitialized]);

  // Initialize game state.
  React.useEffect(() => {
    gameStateRef.current = initGameState();
    setIsInitialized(true);
  }, []);

  // Restart the game.
  const handleRestart = () => {
    gameStateRef.current = initGameState();
    gameOverTriggered.current = false;
    setScore(0);
    setGameOver(false);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#87CEEB'
    }}>
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
      {gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '2rem',
          borderRadius: '10px',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '2.5rem' }}>Game Over!</h2>
          <p style={{ margin: '0.5rem 0', fontSize: '1.2rem' }}>Score: {score}</p>
          <p style={{ margin: '0.5rem 0', fontSize: '1.2rem' }}>High Score: {highScore}</p>
          <button
            onClick={handleRestart}
            style={{
              marginTop: '1rem',
              padding: '0.8rem 1.5rem',
              fontSize: '1.1rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#45a049'}
            onMouseOut={e => e.target.style.backgroundColor = '#4CAF50'}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DoodleJumpGame />
  </React.StrictMode>
);
