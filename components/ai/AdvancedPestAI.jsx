import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function useAdvancedPestAI({
  pests,
  environment,
  plantHealth,
  playerAccuracy,
  decorations = [],
  onPestBehaviorUpdate
}) {
  const behaviorStateRef = useRef(new Map());

  useEffect(() => {
    if (!pests || pests.length === 0) return;

    const interval = setInterval(() => {
      const { currentWeather, dayNightHour, currentSeason } = environment;
      const isNight = dayNightHour < 6 || dayNightHour >= 20;
      const isDawn = dayNightHour >= 5 && dayNightHour < 7;
      const isDusk = dayNightHour >= 18 && dayNightHour < 20;

      pests.forEach(pest => {
        if (!pest || pest.health <= 0) return;

        let behaviorState = behaviorStateRef.current.get(pest.id) || {
          strategy: 'direct_attack',
          nextStrategyChange: Date.now() + 5000,
          groupId: null,
          targetPosition: null,
          flanking: false,
          retreating: false,
          waitingForOpening: false
        };

        const now = Date.now();
        if (now >= behaviorState.nextStrategyChange) {
          behaviorState.strategy = decideStrategy(pest, {
            weather: currentWeather,
            isNight,
            isDawn,
            isDusk,
            season: currentSeason,
            plantHealth,
            playerAccuracy,
            pestType: pest.type,
            behaviorType: pest.behavior
          });
          behaviorState.nextStrategyChange = now + (3000 + Math.random() * 4000);
        }

        switch (behaviorState.strategy) {
          case 'flank':
            applyFlankingBehavior(pest, behaviorState);
            break;
          case 'retreat_heal':
            applyRetreatBehavior(pest, behaviorState);
            break;
          case 'wait_ambush':
            applyAmbushBehavior(pest, behaviorState, isNight);
            break;
          case 'swarm_coordinate':
            applySwarmBehavior(pest, pests, behaviorState);
            break;
          case 'hit_and_run':
            applyHitAndRunBehavior(pest, behaviorState);
            break;
          case 'circle_strafe':
            applyCircleStrafeB behavior(pest, behaviorState);
            break;
          case 'underground_emerge':
            applyUndergroundBehavior(pest, behaviorState);
            break;
          default:
            applyDirectAttackBehavior(pest, behaviorState);
        }

        applyEnvironmentalModifiers(pest, {
          weather: currentWeather,
          isNight,
          isDawn,
          isDusk,
          season: currentSeason,
          decorations
        });

        behaviorStateRef.current.set(pest.id, behaviorState);

        if (onPestBehaviorUpdate) {
          onPestBehaviorUpdate(pest.id, behaviorState);
        }
      });
    }, 100);

    return () => clearInterval(interval);
  }, [pests, environment, plantHealth, playerAccuracy, decorations, onPestBehaviorUpdate]);

  return behaviorStateRef.current;
}

function decideStrategy(pest, context) {
  const { weather, isNight, season, plantHealth, playerAccuracy, pestType, behaviorType } = context;

  if (pest.health < pest.maxHealth * 0.3) {
    return Math.random() < 0.7 ? 'retreat_heal' : 'hit_and_run';
  }

  if (playerAccuracy > 0.75) {
    const strategies = ['flank', 'circle_strafe', 'hit_and_run', 'wait_ambush'];
    return strategies[Math.floor(Math.random() * strategies.length)];
  }

  if (behaviorType === 'swarm' || behaviorType === 'spreading') {
    return 'swarm_coordinate';
  }

  if (behaviorType === 'burrowing' || (isNight && behaviorType === 'camouflaged')) {
    return 'underground_emerge';
  }

  if ((weather === 'fog' || isNight) && Math.random() < 0.6) {
    return 'wait_ambush';
  }

  if (behaviorType === 'fast' || behaviorType === 'flying') {
    return Math.random() < 0.5 ? 'hit_and_run' : 'circle_strafe';
  }

  if (season === 'winter' && pestType === 'spider_mite') {
    return 'swarm_coordinate';
  }

  if (plantHealth < 50) {
    return 'direct_attack';
  }

  const strategies = ['direct_attack', 'flank', 'circle_strafe', 'hit_and_run'];
  return strategies[Math.floor(Math.random() * strategies.length)];
}

function applyFlankingBehavior(pest, state) {
  if (!state.targetPosition) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 3;
    state.targetPosition = {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance
    };
    state.flanking = true;
  }

  const toTarget = new THREE.Vector2(
    state.targetPosition.x - pest.position.x,
    state.targetPosition.z - pest.position.z
  );

  if (toTarget.length() < 0.5) {
    state.targetPosition = null;
    state.flanking = false;
  }

  pest.aiHint = 'flanking';
}

function applyRetreatBehavior(pest, state) {
  state.retreating = true;
  const retreatAngle = Math.atan2(pest.position.z, pest.position.x) + Math.PI;
  const retreatDistance = 8;

  if (!state.targetPosition) {
    state.targetPosition = {
      x: Math.cos(retreatAngle) * retreatDistance,
      z: Math.sin(retreatAngle) * retreatDistance
    };
  }

  pest.speed = pest.speed * 1.3;
  pest.aiHint = 'retreating';
}

function applyAmbushBehavior(pest, state, isNight) {
  state.waitingForOpening = true;
  pest.speed = pest.speed * 0.2;

  if (isNight) {
    pest.opacity = Math.min(pest.opacity || 1.0, 0.4);
  }

  if (Math.random() < 0.05) {
    state.waitingForOpening = false;
    pest.speed = pest.speed * 5;
  }

  pest.aiHint = 'ambush';
}

function applySwarmBehavior(pest, allPests, state) {
  const nearbyPests = allPests.filter(p => {
    if (!p || p.id === pest.id) return false;
    const dist = Math.sqrt(
      Math.pow(p.position.x - pest.position.x, 2) +
      Math.pow(p.position.z - pest.position.z, 2)
    );
    return dist < 3;
  });

  if (nearbyPests.length >= 2) {
    const avgX = nearbyPests.reduce((sum, p) => sum + p.position.x, pest.position.x) / (nearbyPests.length + 1);
    const avgZ = nearbyPests.reduce((sum, p) => sum + p.position.z, pest.position.z) / (nearbyPests.length + 1);

    state.targetPosition = { x: avgX * 0.7, z: avgZ * 0.7 };
    pest.speed = pest.speed * 1.1;
  }

  pest.aiHint = 'swarming';
}

function applyHitAndRunBehavior(pest, state) {
  if (!state.attackPhase) {
    state.attackPhase = 'approach';
    state.phaseTimer = Date.now() + 2000;
  }

  const now = Date.now();

  if (state.attackPhase === 'approach' && now >= state.phaseTimer) {
    state.attackPhase = 'retreat';
    state.phaseTimer = now + 1500;
    pest.speed = pest.speed * 1.5;
  } else if (state.attackPhase === 'retreat' && now >= state.phaseTimer) {
    state.attackPhase = 'approach';
    state.phaseTimer = now + 2000;
    pest.speed = pest.speed * 0.8;
  }

  pest.aiHint = 'hit_and_run';
}

function applyCircleStrafeBehavior(pest, state) {
  if (!state.circleAngle) {
    state.circleAngle = Math.atan2(pest.position.z, pest.position.x);
    state.circleRadius = Math.sqrt(pest.position.x ** 2 + pest.position.z ** 2);
  }

  state.circleAngle += 0.02;
  state.targetPosition = {
    x: Math.cos(state.circleAngle) * state.circleRadius,
    z: Math.sin(state.circleAngle) * state.circleRadius
  };

  pest.aiHint = 'circling';
}

function applyUndergroundBehavior(pest, state) {
  if (!pest.underground && Math.random() < 0.1) {
    pest.underground = true;
    pest.emergeTime = Date.now() + 3000 + Math.random() * 3000;
    pest.aiHint = 'burrowing';
  } else if (pest.underground && Date.now() >= pest.emergeTime) {
    pest.underground = false;

    const angle = Math.random() * Math.PI * 2;
    const distance = 1 + Math.random() * 2;
    pest.position.x += Math.cos(angle) * distance;
    pest.position.z += Math.sin(angle) * distance;
    pest.aiHint = 'emerging';
  }
}

function applyDirectAttackBehavior(pest, state) {
  state.targetPosition = { x: 0, z: 0 };
  pest.aiHint = 'direct_attack';
}

function applyEnvironmentalModifiers(pest, context) {
  const { weather, isNight, isDawn, isDusk, season, decorations } = context;

  if (weather === 'rain') {
    if (pest.type === 'whitefly' || pest.type === 'flying') {
      pest.speed *= 0.7;
      pest.position.y = Math.max(pest.position.y - 0.05, 0.5);
    } else if (pest.type === 'spider_mite') {
      pest.speed *= 1.1;
    }
  }

  if (weather === 'wind') {
    if (pest.type === 'aphid' || pest.size === 'tiny') {
      const windForce = Math.sin(Date.now() * 0.002) * 0.03;
      pest.position.x += windForce;
    }
  }

  if (weather === 'fog') {
    pest.opacity = Math.min(pest.opacity || 1.0, 0.6);
    pest.speed *= 1.15;
  }

  if (isNight) {
    if (pest.type === 'fungus_gnat' || pest.type === 'leafhopper') {
      pest.speed *= 1.3;
      pest.damage *= 1.2;
    } else {
      pest.speed *= 0.85;
    }
  }

  if (isDawn || isDusk) {
    if (pest.type === 'grasshopper' || pest.type === 'caterpillar') {
      pest.speed *= 1.1;
    }
  }

  if (season === 'winter') {
    if (pest.type === 'spider_mite') {
      pest.health = Math.min(pest.health + 0.05, pest.maxHealth);
    } else {
      pest.speed *= 0.9;
    }
  } else if (season === 'summer') {
    if (pest.type === 'whitefly' || pest.type === 'grasshopper') {
      pest.speed *= 1.15;
      pest.damage *= 1.1;
    }
  }

  decorations.forEach(decoration => {
    if (!decoration.decorationData) return;

    const distance = Math.sqrt(
      Math.pow(pest.position.x - decoration.position.x, 2) +
      Math.pow(pest.position.z - decoration.position.z, 2)
    );

    if (distance < 3 && decoration.decorationData.defense_bonus > 0) {
      pest.speed *= (1 - decoration.decorationData.defense_bonus * 0.01);
    }
  });
}

export function getPestEnvironmentalSpawnChance(pestType, environment) {
  const { weather, isNight, season } = environment;
  let spawnChance = 1.0;

  if (weather === 'rain') {
    if (pestType === 'spider_mite') spawnChance *= 1.5;
    if (pestType === 'whitefly') spawnChance *= 0.6;
  }

  if (weather === 'fog') {
    if (pestType === 'fungus_gnat') spawnChance *= 1.8;
  }

  if (isNight) {
    if (pestType === 'fungus_gnat' || pestType === 'leafhopper') spawnChance *= 1.6;
    else spawnChance *= 0.7;
  }

  if (season === 'winter') {
    if (pestType === 'spider_mite') spawnChance *= 1.4;
    else spawnChance *= 0.8;
  } else if (season === 'summer') {
    if (pestType === 'whitefly' || pestType === 'grasshopper') spawnChance *= 1.7;
  } else if (season === 'spring') {
    if (pestType === 'aphid') spawnChance *= 1.5;
  }

  return spawnChance;
}