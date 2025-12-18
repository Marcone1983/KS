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
      const stressFactors = {
        pestPressure: recentPestAvg / 20,
        damageAccumulation: recentDamageAvg / 15,
        currentThreat: pestCount / 20
      };

      stressLevel = Math.min(
        (stressFactors.pestPressure * 0.3) + 
        (stressFactors.damageAccumulation * 0.4) + 
        (stressFactors.currentThreat * 0.3),
        1.0
      );

      growthState.current.stressLevel = stressLevel;

      let growthRate = plantType?.stats?.growthSpeed || 1.0;

      if (plantType?.passive?.type === 'health_regen') {
        growthRate *= (1.05 + (1 - stressLevel) * 0.15);
      } else if (plantType?.passive?.type === 'resource_bonus') {
        growthRate *= (1.1 + (1 - stressLevel) * 0.1);
      } else if (plantType?.passive?.type === 'spray_boost') {
        growthRate *= 1.08;
      } else if (plantType?.passive?.type === 'damage_reduction') {
        growthRate *= (1.0 + stressLevel * 0.05);
      } else if (plantType?.passive?.type === 'slow_aura') {
        growthRate *= (1.0 + pestCount * 0.01);
      } else if (plantType?.passive?.type === 'damage_aura') {
        growthRate *= (1.0 + Math.min(pestCount * 0.015, 0.3));
      }

      const weatherMultipliers = {
        'rain': 1.12 + (1 - stressLevel) * 0.08,
        'heatwave': 0.88 - stressLevel * 0.07,
        'fog': 0.96,
        'clear': 1.0,
        'wind': 0.98,
        'storm': 0.85
      };
      growthRate *= (weatherMultipliers[weather] || 1.0);

      const seasonalMultipliers = {
        'spring': 1.15 + (1 - stressLevel) * 0.1,
        'summer': 1.08 + (powerUpsActive > 0 ? 0.05 : 0),
        'autumn': 1.0,
        'winter': 0.75 + (plantType?.stats?.pestResistance || 1.0) * 0.05
      };
      growthRate *= (seasonalMultipliers[season] || 1.0);

      const timeMultiplier = timeOfDay === 'day' ? 1.08 : timeOfDay === 'sunset' ? 1.0 : 0.92;
      growthRate *= timeMultiplier;

      const stressReduction = Math.pow(1 - stressLevel, 1.5) * 0.25 + 0.75;
      growthRate *= stressReduction;

      if (powerUpsActive > 0) {
        const powerUpBoost = Math.min(powerUpsActive * 0.08, 0.3);
        growthRate *= (1 + powerUpBoost);
      }

      const playerEfficiency = (sprayFrequency * 0.5 + accuracy * 0.5);
      if (playerEfficiency > 0.6) {
        growthRate *= (1 + (playerEfficiency - 0.6) * 0.15);
      }

      if (idleTime > 10) {
        const idlePenalty = Math.min(idleTime / 60, 0.2);
        growthRate *= (1 - idlePenalty);
      }

      const synergy = (plantType?.stats?.growthSpeed || 1.0) * (plantType?.stats?.pestResistance || 1.0);
      if (synergy > 1.5) {
        growthRate *= 1.03;
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

      const adaptationGain = (1 - stressLevel) * 0.015 * deltaTime;
      const adaptationLoss = stressLevel * 0.01 * deltaTime;
      
      if (stressLevel < 0.3 && recentPestAvg < 8) {
        growthState.current.adaptationBonus += adaptationGain;
      } else if (stressLevel > 0.5) {
        growthState.current.adaptationBonus = Math.max(0, growthState.current.adaptationBonus - adaptationLoss);
      }

      const passiveAdaptation = (plantType?.stats?.pestResistance || 1.0) > 1.2 ? 0.02 : 0;
      growthState.current.adaptationBonus = Math.min(0.4 + passiveAdaptation, growthState.current.adaptationBonus);

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

export function useAIPestBehaviorPredictor({ difficultyMultipliers, playerPerformance, gameContext = {} }) {
  const predictionRef = useRef({
    aggressionLevel: 1.0,
    swarmTendency: 0.5,
    flankingProbability: 0.3,
    retreatThreshold: 0.2,
    adaptiveStrategy: 'balanced'
  });

  useEffect(() => {
    if (!difficultyMultipliers || !playerPerformance) return;

    const { pestHealth = 1.0, pestSpeed = 1.0, pestSpawnRate = 1.0 } = difficultyMultipliers;
    const { accuracy = 0.5, reactionTime = 1.0, survivalRate = 0.5 } = playerPerformance;
    const { currentWave = 1, plantHealth = 100, powerUpsActive = 0 } = gameContext;

    const skillScore = (accuracy * 0.4) + ((1 - reactionTime) * 0.3) + (survivalRate * 0.3);
    
    let aggression = 0.8 + (skillScore * 0.8);
    
    if (plantHealth < 30) {
      aggression *= 1.3;
    } else if (plantHealth > 80) {
      aggression *= 0.85;
    }

    if (powerUpsActive > 1) {
      aggression *= 0.7;
    }

    aggression = Math.min(Math.max(aggression, 0.6), 2.0);
    predictionRef.current.aggressionLevel = aggression;

    let swarmTendency = 0.4 + (1 - survivalRate) * 0.5;
    
    if (currentWave > 10) {
      swarmTendency += 0.15;
    }

    if (accuracy < 0.5) {
      swarmTendency += 0.2;
    }

    swarmTendency = Math.min(Math.max(swarmTendency, 0.2), 0.9);
    predictionRef.current.swarmTendency = swarmTendency;

    let flanking = 0.2 + (accuracy * 0.5);
    
    if (reactionTime < 0.6) {
      flanking += 0.2;
    }

    if (currentWave > 15) {
      flanking += 0.15;
    }

    flanking = Math.min(Math.max(flanking, 0.15), 0.75);
    predictionRef.current.flankingProbability = flanking;

    let retreat = 0.3 - (pestHealth - 1.0) * 0.2;
    
    if (plantHealth < 50) {
      retreat -= 0.1;
    }

    if (skillScore > 0.7) {
      retreat += 0.15;
    }

    retreat = Math.min(Math.max(retreat, 0.1), 0.5);
    predictionRef.current.retreatThreshold = retreat;

    if (skillScore > 0.7 && survivalRate > 0.6) {
      predictionRef.current.adaptiveStrategy = 'aggressive';
    } else if (skillScore < 0.4 || survivalRate < 0.3) {
      predictionRef.current.adaptiveStrategy = 'overwhelming';
    } else if (accuracy > 0.7 && reactionTime < 0.5) {
      predictionRef.current.adaptiveStrategy = 'tactical';
    } else {
      predictionRef.current.adaptiveStrategy = 'balanced';
    }

  }, [difficultyMultipliers, playerPerformance, gameContext]);

  return predictionRef.current;
}

export default useAIPlantGrowth;