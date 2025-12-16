import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export class EnemyAIController {
  constructor() {
    this.heatmap = new Map();
    this.sprayZones = [];
    this.playerPatterns = {
      sprayFrequency: 0,
      preferredAngles: [],
      reactionTime: 0,
      defenseZones: []
    };
    this.swarmGroups = new Map();
    this.specialAbilityCooldowns = new Map();
  }

  updateHeatmap(sprayPosition, timestamp) {
    const key = `${Math.floor(sprayPosition.x)}_${Math.floor(sprayPosition.z)}`;
    const existing = this.heatmap.get(key) || { count: 0, lastTime: 0 };
    this.heatmap.set(key, {
      count: existing.count + 1,
      lastTime: timestamp
    });

    this.sprayZones = Array.from(this.heatmap.entries())
      .filter(([_, data]) => timestamp - data.lastTime < 10000)
      .map(([key, data]) => {
        const [x, z] = key.split('_').map(Number);
        return { x, z, intensity: data.count };
      });
  }

  analyzePlayerBehavior(playerActions) {
    if (playerActions.length < 10) return;

    const recent = playerActions.slice(-20);
    this.playerPatterns.sprayFrequency = recent.filter(a => a.type === 'spray').length / 20;

    const angles = recent
      .filter(a => a.angle !== undefined)
      .map(a => a.angle);
    
    if (angles.length > 5) {
      const angleGroups = {};
      angles.forEach(angle => {
        const bucket = Math.floor(angle / 30) * 30;
        angleGroups[bucket] = (angleGroups[bucket] || 0) + 1;
      });
      
      this.playerPatterns.preferredAngles = Object.entries(angleGroups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([angle]) => Number(angle));
    }
  }

  shouldAvoidZone(position) {
    return this.sprayZones.some(zone => {
      const dist = Math.sqrt(
        Math.pow(position.x - zone.x, 2) + 
        Math.pow(position.z - zone.z, 2)
      );
      return dist < 2 && zone.intensity > 3;
    });
  }

  calculateSwarmBehavior(pest, allPests, plantPosition) {
    const groupId = pest.swarmGroupId || 'default';
    let group = this.swarmGroups.get(groupId);

    if (!group) {
      group = {
        members: [],
        leader: null,
        formation: 'wedge',
        targetAngle: Math.random() * Math.PI * 2
      };
      this.swarmGroups.set(groupId, group);
    }

    const nearbyPests = allPests.filter(p => {
      if (!p.position) return false;
      const dist = Math.sqrt(
        Math.pow(p.position.x - pest.position.x, 2) +
        Math.pow(p.position.z - pest.position.z, 2)
      );
      return dist < 4 && p.id !== pest.id;
    });

    group.members = [pest, ...nearbyPests];

    if (!group.leader || !group.members.find(m => m.id === group.leader.id)) {
      group.leader = group.members.reduce((strongest, current) => 
        (current.health > strongest.health) ? current : strongest
      );
    }

    const isLeader = pest.id === group.leader.id;

    if (isLeader) {
      const toPlant = new THREE.Vector2(
        plantPosition.x - pest.position.x,
        plantPosition.z - pest.position.z
      ).normalize();

      if (this.shouldAvoidZone(pest.position)) {
        const avoidAngle = group.targetAngle + Math.PI / 2;
        return {
          x: Math.cos(avoidAngle),
          z: Math.sin(avoidAngle),
          coordinated: true,
          role: 'leader'
        };
      }

      group.targetAngle = Math.atan2(toPlant.y, toPlant.x);
      return { x: toPlant.x, z: toPlant.y, coordinated: true, role: 'leader' };
    } else {
      const formations = {
        wedge: (index, total) => ({
          offsetAngle: (index / total) * Math.PI / 3 - Math.PI / 6,
          distance: 1.5
        }),
        circle: (index, total) => ({
          offsetAngle: (index / total) * Math.PI * 2,
          distance: 2
        }),
        line: (index, total) => ({
          offsetAngle: 0,
          distance: 1 * index
        })
      };

      const memberIndex = group.members.findIndex(m => m.id === pest.id);
      const formation = formations[group.formation](memberIndex, group.members.length);

      const targetAngle = group.targetAngle + formation.offsetAngle;
      const leaderPos = group.leader.position;

      const targetX = leaderPos.x + Math.cos(targetAngle) * formation.distance;
      const targetZ = leaderPos.z + Math.sin(targetAngle) * formation.distance;

      const toTarget = new THREE.Vector2(
        targetX - pest.position.x,
        targetZ - pest.position.z
      ).normalize();

      return { x: toTarget.x, z: toTarget.y, coordinated: true, role: 'follower' };
    }
  }

  executeSpecialAbility(pest, allPests, timestamp) {
    const cooldownKey = `${pest.id}_${pest.specialAbility}`;
    const lastUse = this.specialAbilityCooldowns.get(cooldownKey) || 0;

    if (timestamp - lastUse < pest.abilityCooldown) {
      return null;
    }

    let abilityResult = null;

    switch (pest.specialAbility) {
      case 'healer':
        const injured = allPests
          .filter(p => p.health < p.maxHealth * 0.5 && p.id !== pest.id)
          .sort((a, b) => a.health - b.health)[0];

        if (injured) {
          const dist = Math.sqrt(
            Math.pow(injured.position.x - pest.position.x, 2) +
            Math.pow(injured.position.z - pest.position.z, 2)
          );

          if (dist < 3) {
            abilityResult = {
              type: 'heal',
              targetId: injured.id,
              amount: pest.maxHealth * 0.2,
              castTime: 2000
            };
          }
        }
        break;

      case 'trapper':
        const playerApproachZone = this.sprayZones
          .sort((a, b) => b.intensity - a.intensity)[0];

        if (playerApproachZone) {
          abilityResult = {
            type: 'trap',
            position: { x: playerApproachZone.x, z: playerApproachZone.z },
            duration: 8000,
            effect: 'slow',
            radius: 2
          };
        }
        break;

      case 'berserker':
        if (pest.health < pest.maxHealth * 0.3) {
          abilityResult = {
            type: 'berserker',
            targetId: pest.id,
            speedMultiplier: 2.0,
            damageMultiplier: 1.5,
            duration: 5000
          };
        }
        break;

      case 'spawner':
        if (allPests.length < 15) {
          abilityResult = {
            type: 'spawn',
            count: 2,
            position: pest.position,
            spawnType: 'minion'
          };
        }
        break;

      case 'teleporter':
        if (this.shouldAvoidZone(pest.position)) {
          const safeZones = [];
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const testPos = {
              x: Math.cos(angle) * 6,
              z: Math.sin(angle) * 6
            };
            if (!this.shouldAvoidZone(testPos)) {
              safeZones.push(testPos);
            }
          }

          if (safeZones.length > 0) {
            abilityResult = {
              type: 'teleport',
              targetId: pest.id,
              position: safeZones[Math.floor(Math.random() * safeZones.length)]
            };
          }
        }
        break;

      case 'shield':
        const nearbyAllies = allPests.filter(p => {
          const dist = Math.sqrt(
            Math.pow(p.position.x - pest.position.x, 2) +
            Math.pow(p.position.z - pest.position.z, 2)
          );
          return dist < 4 && p.id !== pest.id;
        });

        if (nearbyAllies.length >= 2) {
          abilityResult = {
            type: 'shield',
            targetIds: nearbyAllies.map(p => p.id),
            damageReduction: 0.5,
            duration: 6000
          };
        }
        break;
    }

    if (abilityResult) {
      this.specialAbilityCooldowns.set(cooldownKey, timestamp);
    }

    return abilityResult;
  }

  calculateAdaptiveMovement(pest, plantPosition, cameraPosition, allPests, timestamp) {
    const baseDirection = new THREE.Vector2(
      plantPosition.x - pest.position.x,
      plantPosition.z - pest.position.z
    ).normalize();

    if (this.shouldAvoidZone(pest.position)) {
      const avoidVector = new THREE.Vector2();
      
      this.sprayZones.forEach(zone => {
        const toZone = new THREE.Vector2(
          pest.position.x - zone.x,
          pest.position.z - zone.z
        );
        const dist = toZone.length();
        if (dist < 3) {
          toZone.normalize().multiplyScalar(1 / (dist + 0.1));
          avoidVector.add(toZone);
        }
      });

      baseDirection.add(avoidVector.normalize().multiplyScalar(0.7));
      baseDirection.normalize();

      return {
        direction: baseDirection,
        speedMultiplier: 1.3,
        behavior: 'avoiding',
        isAdaptive: true
      };
    }

    if (pest.behavior === 'coordinated' || pest.type === 'swarm_coordinator') {
      const swarmDir = this.calculateSwarmBehavior(pest, allPests, plantPosition);
      return {
        direction: new THREE.Vector2(swarmDir.x, swarmDir.z),
        speedMultiplier: 1.0,
        behavior: 'coordinated',
        role: swarmDir.role,
        isAdaptive: true
      };
    }

    const toCameraAngle = Math.atan2(
      cameraPosition.z - pest.position.z,
      cameraPosition.x - pest.position.x
    );

    if (this.playerPatterns.preferredAngles.length > 0) {
      const preferredAngle = this.playerPatterns.preferredAngles[0] * (Math.PI / 180);
      const angleDiff = Math.abs(toCameraAngle - preferredAngle);
      
      if (angleDiff < Math.PI / 4) {
        const flanking = toCameraAngle + Math.PI / 2;
        baseDirection.x = Math.cos(flanking) * 0.6 + baseDirection.x * 0.4;
        baseDirection.y = Math.sin(flanking) * 0.6 + baseDirection.y * 0.4;
        baseDirection.normalize();

        return {
          direction: baseDirection,
          speedMultiplier: 1.1,
          behavior: 'flanking',
          isAdaptive: true
        };
      }
    }

    if (pest.behavior === 'zigzag') {
      const zigzagAngle = Math.sin(timestamp / 500) * Math.PI / 4;
      const rotated = new THREE.Vector2(
        baseDirection.x * Math.cos(zigzagAngle) - baseDirection.y * Math.sin(zigzagAngle),
        baseDirection.x * Math.sin(zigzagAngle) + baseDirection.y * Math.cos(zigzagAngle)
      );
      return {
        direction: rotated,
        speedMultiplier: 1.0,
        behavior: 'zigzag',
        isAdaptive: false
      };
    }

    return {
      direction: baseDirection,
      speedMultiplier: 1.0,
      behavior: 'normal',
      isAdaptive: false
    };
  }

  reset() {
    this.heatmap.clear();
    this.sprayZones = [];
    this.playerPatterns = {
      sprayFrequency: 0,
      preferredAngles: [],
      reactionTime: 0,
      defenseZones: []
    };
    this.swarmGroups.clear();
    this.specialAbilityCooldowns.clear();
  }
}

export function useAdvancedEnemyAI() {
  const aiController = useRef(new EnemyAIController());
  const playerActions = useRef([]);

  const trackPlayerAction = (action) => {
    playerActions.current.push({
      ...action,
      timestamp: Date.now()
    });

    if (playerActions.current.length > 100) {
      playerActions.current = playerActions.current.slice(-50);
    }

    if (action.type === 'spray' && action.position) {
      aiController.current.updateHeatmap(action.position, Date.now());
    }

    aiController.current.analyzePlayerBehavior(playerActions.current);
  };

  const getMovementForPest = (pest, plantPosition, cameraPosition, allPests) => {
    return aiController.current.calculateAdaptiveMovement(
      pest,
      plantPosition,
      cameraPosition,
      allPests,
      Date.now()
    );
  };

  const checkSpecialAbility = (pest, allPests) => {
    return aiController.current.executeSpecialAbility(pest, allPests, Date.now());
  };

  const resetAI = () => {
    aiController.current.reset();
    playerActions.current = [];
  };

  return {
    trackPlayerAction,
    getMovementForPest,
    checkSpecialAbility,
    resetAI
  };
}