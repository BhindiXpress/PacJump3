import React, { useRef, useEffect, useState } from 'react';
import './DoodleJumpGame.css';

const DoodleJumpGame = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // Game constants
  const GRAVITY = 0.5;
  const JUMP_FORCE = -12;
  const PLAYER_WIDTH = 40;
  const PLAYER_HEIGHT = 40;
  const PLATFORM_WIDTH = 85;
  const PLATFORM_HEIGHT = 15;
  const PLATFORM_SPACING = 100;
  const SCREEN_WIDTH = window.innerWidth;
  const SCREEN_HEIGHT = window.innerHeight;

  // Game state
  const [gameState, setGameState] = useState({
    player: {
      x: SCREEN_WIDTH / 2,
      y: SCREEN_HEIGHT - 100,
      velocityY: 0,
      velocityX: 0,
      isJumping: false
    },
    platforms: [],
    cameraY: 0
  });

  // Initialize platforms
  const initPlatforms = () => {
    const platforms = [];
    const numPlatforms = Math.ceil(SCREEN_HEIGHT / PLATFORM_SPACING) + 5;

    for (let i = 0; i < numPlatforms; i++) {
      platforms.push({
        x: Math.random() * (SCREEN_WIDTH - PLATFORM_WIDTH),
        y: SCREEN_HEIGHT - (i * PLATFORM_SPACING),
        type: 'static'
      });
    }

    return platforms;
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      
      const speed = 5;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          setGameState(prev => ({
            ...prev,
            player: { ...prev.player, velocityX: -speed }
          }));
          break;
        case 'ArrowRight':
        case 'd':
          setGameState(prev => ({
            ...prev,
            player: { ...prev.player, velocityX: speed }
          }));
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (gameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'ArrowRight':
        case 'd':
          setGameState(prev => ({
            ...prev,
            player: { ...prev.player, velocityX: 0 }
          }));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver]);

  // Game loop
  useEffect(() => {
    if (gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const gameLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // Update game state
      setGameState(prev => {
        const newState = { ...prev };
        
        // Update player position
        newState.player.x += newState.player.velocityX;
        newState.player.y += newState.player.velocityY;
        newState.player.velocityY += GRAVITY;

        // Screen wrap
        if (newState.player.x < 0) newState.player.x = SCREEN_WIDTH;
        if (newState.player.x > SCREEN_WIDTH) newState.player.x = 0;

        // Check for platform collisions
        newState.platforms.forEach(platform => {
          if (newState.player.y + PLAYER_HEIGHT > platform.y &&
              newState.player.y + PLAYER_HEIGHT < platform.y + PLATFORM_HEIGHT &&
              newState.player.x + PLAYER_WIDTH > platform.x &&
              newState.player.x < platform.x + PLATFORM_WIDTH &&
              newState.player.velocityY > 0) {
            newState.player.velocityY = JUMP_FORCE;
            newState.player.isJumping = true;
          }
        });

        // Update camera
        if (newState.player.y < SCREEN_HEIGHT / 2) {
          newState.cameraY = SCREEN_HEIGHT / 2 - newState.player.y;
        }

        // Update score
        const currentScore = Math.floor(-newState.cameraY / 10);
        setScore(currentScore);
        if (currentScore > highScore) {
          setHighScore(currentScore);
        }

        // Check for game over
        if (newState.player.y > SCREEN_HEIGHT + 100) {
          setGameOver(true);
        }

        return newState;
      });

      // Draw game elements
      const draw = () => {
        // Save context state
        ctx.save();
        
        // Apply camera transform
        ctx.translate(0, gameState.cameraY);

        // Draw platforms
        ctx.fillStyle = '#4CAF50';
        gameState.platforms.forEach(platform => {
          ctx.fillRect(platform.x, platform.y, PLATFORM_WIDTH, PLATFORM_HEIGHT);
        });

        // Draw player
        ctx.fillStyle = '#FF5722';
        ctx.fillRect(
          gameState.player.x,
          gameState.player.y,
          PLAYER_WIDTH,
          PLAYER_HEIGHT
        );

        // Restore context state
        ctx.restore();

        // Draw UI
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 20, 30);
        ctx.fillText(`High Score: ${highScore}`, 20, 60);
      };

      draw();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, highScore, score]);

  // Initialize game
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      platforms: initPlatforms()
    }));
  }, []);

  const handleRestart = () => {
    setGameState({
      player: {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT - 100,
        velocityY: 0,
        velocityX: 0,
        isJumping: false
      },
      platforms: initPlatforms(),
      cameraY: 0
    });
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        className="game-canvas"
      />
      {gameOver && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>Score: {score}</p>
          <p>High Score: {highScore}</p>
          <button onClick={handleRestart}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default DoodleJumpGame; 