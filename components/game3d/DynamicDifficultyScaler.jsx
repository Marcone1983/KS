import { useEffect, useRef } from 'react';

export function useDynamicDifficulty(gameContext) {
  const performanceHistory = useRef([]);
  const lastAdjustment = useRef(Date.now());
  const difficultyMultipliers = useRef({
    pestHealth: 1.0,
    pestSpeed: 1.0,
    pestSpawnRate: 1.0,
    powerUpSpawnRate: 1.0
  });

  useEffect(() => {
    if (!gameContext) return;

    const { 
      plantHealth, 
      score, 
      pestsKilled, 
      damageTaken, 
      gameTime,
      currentWave 
    } = gameContext;

    const now = Date.now();
    const timeSinceLastAdjust = now - lastAdjustment.current;

    if (timeSinceLastAdjust < 15000) return;

    const killRate = pestsKilled / Math.max(gameTime, 1);
    const survivalRate = plantHealth / 100;
    const efficiency = score / Math.max(gameTime, 1);

    const performanceScore = (
      (killRate * 30) +
      (survivalRate * 40) +
      (efficiency * 30)
    );

    performanceHistory.current.push(performanceScore);
    if (performanceHistory.current.length > 5) {
      performanceHistory.current.shift();
    }

    const avgPerformance = performanceHistory.current.reduce((a, b) => a + b, 0) / performanceHistory.current.length;

    if (avgPerformance > 70) {
      difficultyMultipliers.current.pestHealth = Math.min(1.5, difficultyMultipliers.current.pestHealth + 0.08);
      difficultyMultipliers.current.pestSpeed = Math.min(1.4, difficultyMultipliers.current.pestSpeed + 0.05);
      difficultyMultipliers.current.pestSpawnRate = Math.min(1.6, difficultyMultipliers.current.pestSpawnRate + 0.1);
      difficultyMultipliers.current.powerUpSpawnRate = Math.max(0.7, difficultyMultipliers.current.powerUpSpawnRate - 0.05);
    } else if (avgPerformance < 30) {
      difficultyMultipliers.current.pestHealth = Math.max(0.7, difficultyMultipliers.current.pestHealth - 0.06);
      difficultyMultipliers.current.pestSpeed = Math.max(0.8, difficultyMultipliers.current.pestSpeed - 0.04);
      difficultyMultipliers.current.pestSpawnRate = Math.max(0.6, difficultyMultipliers.current.pestSpawnRate - 0.08);
      difficultyMultipliers.current.powerUpSpawnRate = Math.min(1.5, difficultyMultipliers.current.powerUpSpawnRate + 0.1);
    } else {
      difficultyMultipliers.current.pestHealth = 0.95 * difficultyMultipliers.current.pestHealth + 0.05 * 1.0;
      difficultyMultipliers.current.pestSpeed = 0.95 * difficultyMultipliers.current.pestSpeed + 0.05 * 1.0;
      difficultyMultipliers.current.pestSpawnRate = 0.95 * difficultyMultipliers.current.pestSpawnRate + 0.05 * 1.0;
      difficultyMultipliers.current.powerUpSpawnRate = 0.95 * difficultyMultipliers.current.powerUpSpawnRate + 0.05 * 1.0;
    }

    lastAdjustment.current = now;
  }, [gameContext]);

  return difficultyMultipliers.current;
}

export default useDynamicDifficulty;