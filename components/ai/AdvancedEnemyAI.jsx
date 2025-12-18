import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const SPECIAL_ENEMY_TYPES = {
  healer: {
    name: 'Healer Aphid',
    healRange: 5,
    healAmount: 15,
    healCooldown: 5000,
    color: '#00ff88',
    size: 'small',
    health: 80,
    speed: 0.6,
    description: 'Guarisce gli altri nemici nelle vicinanze'
  },
  trapper: {
    name: 'Trap Layer',
    trapRange: 3,
    trapDuration: 8000,
    trapCooldown: 6000,
    color: '#ff8800',
    size: 'medium',
    health: 100,
    speed: 0.7,
    description: 'Piazza trappole che rallentano il giocatore'
  },
  berserker: {
    name: 'Berserker Beetle',
    rageThreshold: 0.3,
    rageDamageMultiplier: 2.5,
    rageSpeedMultiplier: 1.8,
    color: '#ff0000',
    size: 'large',
    health: 150,
    speed: 0.5,
    description: 'Si potenzia quando ha pochi HP'
  },
  summoner: {
    name: 'Summoner Moth',
    summonCount: 2,
    summonCooldown: 10000,
    minionHealth: 30,
    color: '#9966ff',
    size: 'medium',
    health: 120,
    speed: 0.6,
    description: 'Evoca piccoli parassiti'
  },
  tank: {
    name: 'Armored Tank',
    armor: 50,
    armorRegenRate: 5,
    color: '#666666',
    size: 'large',
    health: 200,
    speed: 0.3,
    description: 'Corazza rigenerante'
  },
  speedster: {
    name: 'Speed Demon',
    dashCooldown: 3000,
    dashSpeed: 3.0,
    dashDuration: 1000,
    color: '#00ffff',
    size: 'small',
    health: 60,
    speed: 1.5,
    description: 'Scatti rapidi imprevedibili'
  }
};

export const useEnemyAI = (enemies, setEnemies, plantPosition, playerPosition, gameTime) => {
  const lastUpdateTime = useRef(Date.now());
  const healerCooldowns = useRef({});
  const trapperCooldowns = useRef({});
  const summonerCooldowns = useRef({});
  const speedsterCooldowns = useRef({});

  useEffect(() => {
    if (!enemies || enemies.length === 0) return;

    const aiInterval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTime.current) / 1000;
      lastUpdateTime.current = now;

      setEnemies(prevEnemies => {
        const updatedEnemies = [];
        const activeTraps = [];

        prevEnemies.forEach(enemy => {
          if (!enemy || enemy.health <= 0) return;

          let newEnemy = { ...enemy };
          const enemyPos = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);

          if (enemy.specialType === 'healer') {
            if (!healerCooldowns.current[enemy.id] || now - healerCooldowns.current[enemy.id] > SPECIAL_ENEMY_TYPES.healer.healCooldown) {
              const nearbyEnemies = prevEnemies.filter(e => {
                if (e.id === enemy.id || e.health <= 0 || e.health >= e.maxHealth) return false;
                const dist = enemyPos.distanceTo(new THREE.Vector3(e.position.x, e.position.y, e.position.z));
                return dist < SPECIAL_ENEMY_TYPES.healer.healRange;
              });

              if (nearbyEnemies.length > 0) {
                nearbyEnemies.forEach(target => {
                  const targetIndex = prevEnemies.findIndex(e => e.id === target.id);
                  if (targetIndex !== -1) {
                    prevEnemies[targetIndex].health = Math.min(
                      prevEnemies[targetIndex].maxHealth,
                      prevEnemies[targetIndex].health + SPECIAL_ENEMY_TYPES.healer.healAmount
                    );
                    prevEnemies[targetIndex].justHealed = true;
                  }
                });
                
                newEnemy.isHealing = true;
                healerCooldowns.current[enemy.id] = now;
                
                setTimeout(() => {
                  setEnemies(prev => prev.map(e => 
                    e.id === enemy.id ? { ...e, isHealing: false } : e
                  ));
                }, 500);
              }
            }
          }

          if (enemy.specialType === 'trapper') {
            if (!trapperCooldowns.current[enemy.id] || now - trapperCooldowns.current[enemy.id] > SPECIAL_ENEMY_TYPES.trapper.trapCooldown) {
              const distToPlant = enemyPos.distanceTo(new THREE.Vector3(plantPosition[0], plantPosition[1], plantPosition[2]));
              
              if (distToPlant < 6 && distToPlant > 2) {
                const trapPosition = {
                  x: enemy.position.x + (Math.random() - 0.5) * 2,
                  y: 0.1,
                  z: enemy.position.z + (Math.random() - 0.5) * 2
                };

                activeTraps.push({
                  id: `trap_${enemy.id}_${now}`,
                  position: trapPosition,
                  createdAt: now,
                  duration: SPECIAL_ENEMY_TYPES.trapper.trapDuration,
                  range: SPECIAL_ENEMY_TYPES.trapper.trapRange,
                  ownerId: enemy.id
                });

                newEnemy.justPlacedTrap = true;
                trapperCooldowns.current[enemy.id] = now;

                setTimeout(() => {
                  setEnemies(prev => prev.map(e => 
                    e.id === enemy.id ? { ...e, justPlacedTrap: false } : e
                  ));
                }, 500);
              }
            }
          }

          if (enemy.specialType === 'berserker') {
            const healthPercent = enemy.health / enemy.maxHealth;
            
            if (healthPercent <= SPECIAL_ENEMY_TYPES.berserker.rageThreshold && !enemy.isEnraged) {
              newEnemy.isEnraged = true;
              newEnemy.damage = (enemy.baseDamage || enemy.damage) * SPECIAL_ENEMY_TYPES.berserker.rageDamageMultiplier;
              newEnemy.speed = (enemy.baseSpeed || enemy.speed) * SPECIAL_ENEMY_TYPES.berserker.rageSpeedMultiplier;
              newEnemy.color = '#ff0000';
              newEnemy.glowIntensity = 2.0;
            }
          }

          if (enemy.specialType === 'summoner') {
            if (!summonerCooldowns.current[enemy.id] || now - summonerCooldowns.current[enemy.id] > SPECIAL_ENEMY_TYPES.summoner.summonCooldown) {
              const distToPlant = enemyPos.distanceTo(new THREE.Vector3(plantPosition[0], plantPosition[1], plantPosition[2]));
              
              if (distToPlant < 8) {
                for (let i = 0; i < SPECIAL_ENEMY_TYPES.summoner.summonCount; i++) {
                  const angle = (Math.PI * 2 / SPECIAL_ENEMY_TYPES.summoner.summonCount) * i;
                  const distance = 1.5;
                  
                  const minion = {
                    id: `minion_${enemy.id}_${now}_${i}`,
                    type: 'summoned_minion',
                    name: 'Summoned Pest',
                    health: SPECIAL_ENEMY_TYPES.summoner.minionHealth,
                    maxHealth: SPECIAL_ENEMY_TYPES.summoner.minionHealth,
                    speed: 0.8,
                    damage: 0.3,
                    position: {
                      x: enemy.position.x + Math.cos(angle) * distance,
                      y: enemy.position.y,
                      z: enemy.position.z + Math.sin(angle) * distance
                    },
                    color: '#dd88ff',
                    size: 'tiny',
                    behavior: 'fast',
                    isMinion: true,
                    masterId: enemy.id
                  };

                  updatedEnemies.push(minion);
                }

                newEnemy.isSummoning = true;
                summonerCooldowns.current[enemy.id] = now;

                setTimeout(() => {
                  setEnemies(prev => prev.map(e => 
                    e.id === enemy.id ? { ...e, isSummoning: false } : e
                  ));
                }, 1000);
              }
            }
          }

          if (enemy.specialType === 'tank') {
            if (!enemy.currentArmor) {
              newEnemy.currentArmor = SPECIAL_ENEMY_TYPES.tank.armor;
            }

            if (newEnemy.currentArmor < SPECIAL_ENEMY_TYPES.tank.armor) {
              newEnemy.currentArmor = Math.min(
                SPECIAL_ENEMY_TYPES.tank.armor,
                newEnemy.currentArmor + SPECIAL_ENEMY_TYPES.tank.armorRegenRate * deltaTime
              );
            }
          }

          if (enemy.specialType === 'speedster') {
            if (!speedsterCooldowns.current[enemy.id] || now - speedsterCooldowns.current[enemy.id] > SPECIAL_ENEMY_TYPES.speedster.dashCooldown) {
              const distToPlant = enemyPos.distanceTo(new THREE.Vector3(plantPosition[0], plantPosition[1], plantPosition[2]));
              
              if (distToPlant < 10 && distToPlant > 3 && Math.random() > 0.7) {
                newEnemy.isDashing = true;
                newEnemy.dashEndTime = now + SPECIAL_ENEMY_TYPES.speedster.dashDuration;
                newEnemy.dashSpeed = SPECIAL_ENEMY_TYPES.speedster.dashSpeed;
                speedsterCooldowns.current[enemy.id] = now;

                setTimeout(() => {
                  setEnemies(prev => prev.map(e => 
                    e.id === enemy.id ? { ...e, isDashing: false, dashSpeed: undefined } : e
                  ));
                }, SPECIAL_ENEMY_TYPES.speedster.dashDuration);
              }
            }
          }

          if (newEnemy.justHealed) {
            setTimeout(() => {
              setEnemies(prev => prev.map(e => 
                e.id === enemy.id ? { ...e, justHealed: false } : e
              ));
            }, 1000);
          }

          updatedEnemies.push(newEnemy);
        });

        if (activeTraps.length > 0) {
          updatedEnemies.forEach(enemy => {
            if (!enemy.activeTraps) enemy.activeTraps = [];
            enemy.activeTraps = [...enemy.activeTraps, ...activeTraps];
          });
        }

        return updatedEnemies;
      });
    }, 100);

    return () => clearInterval(aiInterval);
  }, [enemies?.length, setEnemies, plantPosition, playerPosition, gameTime]);

  return null;
};

export const spawnSpecialEnemy = (specialType, position, level = 1) => {
  const config = SPECIAL_ENEMY_TYPES[specialType];
  if (!config) return null;

  const levelMultiplier = 1 + (level - 1) * 0.15;

  return {
    id: `special_${specialType}_${Date.now()}_${Math.random()}`,
    specialType,
    name: config.name,
    type: specialType,
    health: Math.floor(config.health * levelMultiplier),
    maxHealth: Math.floor(config.health * levelMultiplier),
    speed: config.speed,
    baseSpeed: config.speed,
    damage: 1.0,
    baseDamage: 1.0,
    position: position || { x: 0, y: 1, z: -10 },
    color: config.color,
    size: config.size,
    behavior: specialType,
    glowIntensity: 1.5,
    isSpecial: true,
    description: config.description,
    currentArmor: specialType === 'tank' ? config.armor : undefined
  };
};

export default useEnemyAI;