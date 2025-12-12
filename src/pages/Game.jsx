import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GameScene from '../components/game/GameScene';
import GameUI from '../components/game/GameUI';
import GameOver from '../components/game/GameOver';
import PauseMenu from '../components/game/PauseMenu';
import TutorPanel from '../components/game/TutorPanel';

export default function Game() {
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState('loading');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [plantHealth, setPlantHealth] = useState(100);
  const [sprayAmmo, setSprayAmmo] = useState(100);
  const [pestsEliminated, setPestsEliminated] = useState({});
  const [activePests, setActivePests] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const gameStartTime = useRef(null);

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      if (progressList.length === 0) {
        return await base44.entities.GameProgress.create({
          current_level: 1,
          total_score: 0,
          high_score: 0,
          has_premium: false,
          unlocked_skins: ['default'],
          active_skin: 'default',
          upgrades: {
            spray_speed: 1,
            spray_radius: 1,
            spray_potency: 1
          },
          pests_encountered: [],
          leaf_currency: 0
        });
      }
      return progressList[0];
    }
  });

  const { data: allPests } = useQuery({
    queryKey: ['pests'],
    queryFn: () => base44.entities.Pest.list(),
    initialData: []
  });

  const saveSessionMutation = useMutation({
    mutationFn: (sessionData) => base44.entities.GameSession.create(sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  useEffect(() => {
    if (progress && gameState === 'loading') {
      setLevel(progress.current_level);
      setGameState('playing');
      gameStartTime.current = Date.now();
    }
  }, [progress, gameState]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      const interval = setInterval(() => {
        setGameTime(Math.floor((Date.now() - gameStartTime.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, isPaused]);

  useEffect(() => {
    if (plantHealth <= 0 && gameState === 'playing') {
      endGame(false);
    }
  }, [plantHealth, gameState]);

  const getPestBehaviorType = (pestType) => {
    const behaviorMap = {
      'aphid': 'swarm',
      'thrip': 'fast',
      'spider_mite': 'zigzag',
      'whitefly': 'flying',
      'caterpillar': 'resistant',
      'grasshopper': 'jumper',
      'leafhopper': 'fast',
      'fungus_gnat': 'flying'
    };
    return behaviorMap[pestType] || 'normal';
  };

  const spawnPests = () => {
    if (!allPests || allPests.length === 0) return;
    
    const levelPests = allPests.filter(p => p.unlock_level <= level);
    if (levelPests.length === 0) return;
    
    const baseCount = 2;
    const levelScaling = Math.floor(level / 2);
    const pestCount = Math.min(baseCount + levelScaling, 15);
    
    const healthMultiplier = 1 + (level - 1) * 0.15;
    const speedMultiplier = 1 + (level - 1) * 0.08;
    const damageMultiplier = 1 + (level - 1) * 0.1;
    
    const newPests = [];
    for (let i = 0; i < pestCount; i++) {
      const pestType = levelPests[Math.floor(Math.random() * levelPests.length)];
      const behavior = getPestBehaviorType(pestType.type);
      
      const angle = (i / pestCount) * Math.PI * 2;
      const distance = 8 + Math.random() * 4;
      
      const behaviorModifiers = {
        flying: { speedMult: 0.7, healthMult: 0.8, yOffset: 2 },
        fast: { speedMult: 1.5, healthMult: 0.7, yOffset: 0 },
        resistant: { speedMult: 0.6, healthMult: 1.8, yOffset: 0 },
        zigzag: { speedMult: 1.0, healthMult: 1.0, yOffset: 0 },
        swarm: { speedMult: 0.9, healthMult: 0.9, yOffset: 0 },
        jumper: { speedMult: 1.2, healthMult: 1.1, yOffset: 0 },
        normal: { speedMult: 1.0, healthMult: 1.0, yOffset: 0 }
      };
      
      const mods = behaviorModifiers[behavior] || behaviorModifiers.normal;
      
      newPests.push({
        id: `pest_${Date.now()}_${i}`,
        type: pestType.type,
        name: pestType.name,
        health: Math.floor(pestType.health * healthMultiplier * mods.healthMult),
        maxHealth: Math.floor(pestType.health * healthMultiplier * mods.healthMult),
        speed: pestType.speed * speedMultiplier * mods.speedMult,
        damage: pestType.damage_per_second * damageMultiplier,
        position: {
          x: Math.cos(angle) * distance,
          y: 1 + Math.random() * 1.5 + mods.yOffset,
          z: Math.sin(angle) * distance
        },
        color: pestType.color || '#ff0000',
        size: pestType.size_category,
        behavior: behavior,
        alarmLevel: 0,
        movementPattern: Math.random(),
        pestData: pestType
      });
    }
    
    setActivePests(prev => [...prev, ...newPests]);
  };

  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      const spawnDelay = Math.max(3000 - (level * 100), 2000);
      const spawnInterval = setInterval(spawnPests, spawnDelay);
      spawnPests();
      return () => clearInterval(spawnInterval);
    }
  }, [gameState, isPaused, level, allPests]);

  const handlePestHit = (pestId, damage) => {
    setActivePests(prev => {
      const hitPest = prev.find(p => p.id === pestId);
      if (!hitPest) return prev;

      const hitPosition = hitPest.position;
      const alarmRadius = 4;

      const updated = prev.map(pest => {
        if (pest.id === pestId) {
          const resistanceMult = pest.behavior === 'resistant' ? 0.6 : 1.0;
          const alarmMult = Math.max(1.0, 1.0 - (pest.alarmLevel * 0.1));
          const finalDamage = damage * resistanceMult * alarmMult;
          const newHealth = pest.health - finalDamage;
          
          if (newHealth <= 0) {
            const pestType = pest.type;
            setPestsEliminated(prev => ({
              ...prev,
              [pestType]: (prev[pestType] || 0) + 1
            }));
            const behaviorBonus = pest.behavior === 'resistant' ? 5 : 
                                 pest.behavior === 'flying' ? 8 : 
                                 pest.behavior === 'fast' ? 6 : 0;
            setScore(s => s + 10 + behaviorBonus);
            return null;
          }
          return { ...pest, health: newHealth, alarmLevel: Math.min(5, pest.alarmLevel + 1) };
        }

        const distance = Math.sqrt(
          Math.pow(pest.position.x - hitPosition.x, 2) +
          Math.pow(pest.position.y - hitPosition.y, 2) +
          Math.pow(pest.position.z - hitPosition.z, 2)
        );

        if (distance < alarmRadius) {
          const newAlarmLevel = Math.min(5, pest.alarmLevel + 1);
          const speedBoost = 1 + (newAlarmLevel * 0.1);
          return { 
            ...pest, 
            alarmLevel: newAlarmLevel,
            speed: pest.speed * speedBoost,
            alerted: true,
            alertTarget: hitPosition
          };
        }

        return pest;
      }).filter(Boolean);

      if (Math.random() < 0.3 && updated.length < 20) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDistance = alarmRadius + 2;
        const newPestType = allPests.find(p => p.type === hitPest.type);
        
        if (newPestType) {
          const reinforcement = {
            id: `pest_alarm_${Date.now()}_${Math.random()}`,
            type: hitPest.type,
            name: hitPest.name,
            health: hitPest.maxHealth * 0.7,
            maxHealth: hitPest.maxHealth * 0.7,
            speed: hitPest.speed * 1.2,
            damage: hitPest.damage,
            position: {
              x: hitPosition.x + Math.cos(angle) * spawnDistance,
              y: hitPosition.y,
              z: hitPosition.z + Math.sin(angle) * spawnDistance
            },
            color: hitPest.color,
            size: hitPest.size,
            behavior: hitPest.behavior,
            alarmLevel: 2,
            movementPattern: Math.random(),
            alerted: true,
            alertTarget: hitPosition,
            pestData: newPestType
          };
          updated.push(reinforcement);
        }
      }

      return updated;
    });
  };

  const handleSpray = () => {
    if (sprayAmmo > 0) {
      setSprayAmmo(prev => Math.max(0, prev - 5));
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      const refillInterval = setInterval(() => {
        setSprayAmmo(prev => Math.min(100, prev + 1));
      }, 200);
      return () => clearInterval(refillInterval);
    }
  }, [gameState, isPaused]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && activePests.length > 0) {
      const damageInterval = setInterval(() => {
        const pestsNearPlant = activePests.filter(pest => {
          const distanceToCenter = Math.sqrt(
            Math.pow(pest.position.x, 2) + Math.pow(pest.position.z, 2)
          );
          return distanceToCenter < 2;
        });
        
        if (pestsNearPlant.length > 0) {
          const totalDamage = pestsNearPlant.reduce((sum, pest) => sum + (pest.damage || 0.5), 0);
          setPlantHealth(prev => Math.max(0, prev - totalDamage * 0.3));
        }
      }, 500);
      return () => clearInterval(damageInterval);
    }
  }, [gameState, isPaused, activePests]);

  const endGame = async (completed) => {
    setGameState('gameover');
    
    const sessionData = {
      level,
      score,
      pests_eliminated: pestsEliminated,
      duration_seconds: gameTime,
      plant_health_final: plantHealth,
      completed
    };
    
    await saveSessionMutation.mutateAsync(sessionData);
    
    if (progress) {
      const updates = {
        total_score: progress.total_score + score,
        high_score: Math.max(progress.high_score, score),
        leaf_currency: progress.leaf_currency + Math.floor(score / 10)
      };
      
      if (completed) {
        updates.current_level = Math.max(progress.current_level, level + 1);
      }
      
      const newEncountered = [...new Set([
        ...(progress.pests_encountered || []),
        ...Object.keys(pestsEliminated)
      ])];
      updates.pests_encountered = newEncountered;
      
      await updateProgressMutation.mutateAsync({ id: progress.id, data: updates });
    }
  };

  const restartGame = () => {
    setGameState('playing');
    setScore(0);
    setPlantHealth(100);
    setSprayAmmo(100);
    setPestsEliminated({});
    setActivePests([]);
    setGameTime(0);
    gameStartTime.current = Date.now();
  };



  if (gameState === 'loading' || !progress) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative overflow-hidden">
      <GameScene
        pests={activePests}
        onPestHit={handlePestHit}
        onSpray={handleSpray}
        spraySpeed={progress?.upgrades?.spray_speed || 1}
        sprayRadius={progress?.upgrades?.spray_radius || 1}
        sprayPotency={progress?.upgrades?.spray_potency || 1}
        isPaused={isPaused || gameState !== 'playing'}
        activeSkin={progress.active_skin}
        level={level}
      />
      
      <GameUI
        score={score}
        level={level}
        plantHealth={plantHealth}
        sprayAmmo={sprayAmmo}
        activeSkin={progress.active_skin}
        onPause={() => setIsPaused(true)}
      />
      
      {isPaused && gameState === 'playing' && (
        <PauseMenu
          onResume={() => setIsPaused(false)}
          onRestart={restartGame}
        />
      )}
      
      {gameState === 'gameover' && (
        <GameOver
          score={score}
          level={level}
          pestsEliminated={pestsEliminated}
          duration={gameTime}
          onRestart={restartGame}
        />
      )}
    </div>
  );
}