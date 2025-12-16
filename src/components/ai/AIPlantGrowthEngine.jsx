import { useEffect, useRef } from 'react';

export function useAIPlantGrowth({ 
  plantType, 
  gameEvents, 
  playerActions, 
  currentEnvironment,
  onGrowthUpdate 
}) {
  const growthState = useRef({
    baseGrowthRate: 1.0,
    healthModifier: 1.0,
    resourceModifier: 1.0,
    stressLevel: 0,
    adaptationBonus: 0
  });

  const eventHistory = useRef([]);
  const lastUpdate = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdate.current) / 1000;
      lastUpdate.current = now;

      const { pestCount = 0, powerUpsActive = 0, damageTaken = 0, healingReceived = 0 } = gameEvents || {};
      const { sprayFrequency = 0, accuracy = 0, idleTime = 0 } = playerActions || {};
      const { weather = 'clear', season = 'spring', timeOfDay = 'day' } = currentEnvironment || {};

      eventHistory.current.push({
        timestamp: now,
        pestCount,
        damageTaken,
        powerUpsActive
      });

      if (eventHistory.current.length > 20) {
        eventHistory.current.shift();
      }

      const recentPestAvg = eventHistory.current.reduce((sum, e) => sum + e.pestCount, 0) / eventHistory.current.length;
      const recentDamageAvg = eventHistory.current.reduce((sum, e) => sum + e.damageTaken, 0) / eventHistory.current.length;

      let stressLevel = 0;
      if (recentPestAvg > 10) stressLevel += 0.3;
      if (recentDamageAvg > 5) stressLevel += 0.4;
      if (pestCount > 15) stressLevel += 0.3;
      stressLevel = Math.min(stressLevel, 1.0);

      growthState.current.stressLevel = stressLevel;

      let growthRate = plantType?.stats?.growthSpeed || 1.0;

      if (plantType?.passive?.type === 'health_regen') {
        growthRate *= 1.1;
      } else if (plantType?.passive?.type === 'resource_bonus') {
        growthRate *= 1.15;
      } else if (plantType?.passive?.type === 'spray_boost') {
        growthRate *= 1.2;
      }

      if (weather === 'rain') {
        growthRate *= 1.15;
      } else if (weather === 'heatwave') {
        growthRate *= 0.85;
      } else if (weather === 'fog') {
        growthRate *= 0.95;
      }

      if (season === 'spring') {
        growthRate *= 1.2;
      } else if (season === 'summer') {
        growthRate *= 1.1;
      } else if (season === 'winter') {
        growthRate *= 0.7;
      }

      if (timeOfDay === 'day') {
        growthRate *= 1.1;
      } else if (timeOfDay === 'night') {
        growthRate *= 0.9;
      }

      growthRate *= (1 - stressLevel * 0.4);

      if (powerUpsActive > 0) {
        growthRate *= (1 + powerUpsActive * 0.1);
      }

      if (sprayFrequency > 0.5 && accuracy > 0.7) {
        growthRate *= 1.05;
      }

      if (idleTime > 10) {
        growthRate *= 0.9;
      }

      growthState.current.baseGrowthRate = growthRate;

      let healthMod = 1.0;
      if (plantType?.passive?.type === 'damage_reduction') {
        healthMod = 1 + plantType.passive.value;
      } else if (plantType?.passive?.type === 'health_regen') {
        healthMod = 1.3;
      }

      if (healingReceived > 0) {
        healthMod *= 1.2;
      }

      growthState.current.healthModifier = healthMod;

      let resourceMod = 1.0;
      if (plantType?.passive?.type === 'resource_bonus') {
        resourceMod = 1 + plantType.passive.value;
      }

      if (season === 'autumn') {
        resourceMod *= 1.15;
      }

      growthState.current.resourceModifier = resourceMod;

      if (stressLevel < 0.2 && recentPestAvg < 5) {
        growthState.current.adaptationBonus += 0.01 * deltaTime;
      } else if (stressLevel > 0.6) {
        growthState.current.adaptationBonus = Math.max(0, growthState.current.adaptationBonus - 0.02 * deltaTime);
      }

      growthState.current.adaptationBonus = Math.min(0.5, growthState.current.adaptationBonus);

      if (onGrowthUpdate) {
        onGrowthUpdate({
          growthRate: growthState.current.baseGrowthRate * (1 + growthState.current.adaptationBonus),
          healthModifier: growthState.current.healthModifier,
          resourceModifier: growthState.current.resourceModifier,
          stressLevel: growthState.current.stressLevel,
          adaptationBonus: growthState.current.adaptationBonus
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [plantType, gameEvents, playerActions, currentEnvironment, onGrowthUpdate]);

  return growthState.current;
}

export function useAIPestBehaviorPredictor({ difficultyMultipliers, playerPerformance }) {
  const predictionRef = useRef({
    aggressionLevel: 1.0,
    swarmTendency: 0.5,
    flankingProbability: 0.3,
    retreatThreshold: 0.2
  });

  useEffect(() => {
    if (!difficultyMultipliers || !playerPerformance) return;

    const { pestHealth, pestSpeed } = difficultyMultipliers;
    const { accuracy = 0.5, reactionTime = 1.0, survivalRate = 0.5 } = playerPerformance;

    let aggression = 1.0;
    if (accuracy > 0.8 && reactionTime < 0.5) {
      aggression = 1.4;
    } else if (accuracy < 0.4) {
      aggression = 0.8;
    }

    predictionRef.current.aggressionLevel = aggression;

    let swarmTendency = 0.5;
    if (survivalRate < 0.4) {
      swarmTendency = 0.8;
    } else if (survivalRate > 0.7) {
      swarmTendency = 0.3;
    }

    predictionRef.current.swarmTendency = swarmTendency;

    let flanking = 0.3;
    if (accuracy > 0.7) {
      flanking = 0.6;
    }

    predictionRef.current.flankingProbability = flanking;

    let retreat = 0.2;
    if (pestHealth < 1.2) {
      retreat = 0.4;
    }

    predictionRef.current.retreatThreshold = retreat;

  }, [difficultyMultipliers, playerPerformance]);

  return predictionRef.current;
}

export default useAIPlantGrowth;