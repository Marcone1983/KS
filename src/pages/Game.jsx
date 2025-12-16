import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AAA_GameScene3D from '../components/game/AAA_GameScene3D';
import GameUI from '../components/game/GameUI';
import GameOver from '../components/game/GameOver';
import PauseMenu from '../components/game/PauseMenu';
import WaveSystem from '../components/game/WaveSystem';
import PowerUpSystem, { usePowerUpSpawner, POWERUP_EFFECTS, ActivePowerUpHUD } from '../components/game/PowerUps';
import TutorPanel from '../components/game/TutorPanel';
import BossHealthBar from '../components/game/BossHealthBar';
import LevelObjectives from '../components/game/LevelObjectives';
import LoreDiscovery from '../components/game/LoreDiscovery';
import StrategyAdvisor from '../components/advisor/StrategyAdvisor';
import InGameUpgradePanel from '../components/game/InGameUpgradePanel';
import DynamicWeatherSystem, { useWeatherEffects } from '../components/environment/DynamicWeatherSystem';
import PlantCareAI from '../components/ai/PlantCareAI';
import PlantTypeSelector from '../components/game/PlantTypeSelector';
import { useDynamicDifficulty } from '../components/game/DynamicDifficultyScaler';
import { toast } from 'sonner';

export default function Game() {
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const [selectedPlantType, setSelectedPlantType] = useState(null);
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState('plant_selection');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [plantHealth, setPlantHealth] = useState(100);
  const [sprayAmmo, setSprayAmmo] = useState(100);
  const [pestsEliminated, setPestsEliminated] = useState({});
  const [activePests, setActivePests] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [dayNightHour, setDayNightHour] = useState(12);
  const [activeSprayEffects, setActiveSprayEffects] = useState([]);
  const [activeBoss, setActiveBoss] = useState(null);
  const [bossHealth, setBossHealth] = useState(0);
  const [bossMaxHealth, setBossMaxHealth] = useState(0);
  const [bossArmorSegments, setBossArmorSegments] = useState(0);
  const [toxicClouds, setToxicClouds] = useState([]);
  const [currentWeather, setCurrentWeather] = useState('clear');
  const [weatherEffectStrength, setWeatherEffectStrength] = useState(0);
  const [proceduralLevelData, setProceduralLevelData] = useState(null);
  const [levelObjectives, setLevelObjectives] = useState([]);
  const [discoveredLore, setDiscoveredLore] = useState(null);
  const [currentSeason, setCurrentSeason] = useState('spring');
  const [waveState, setWaveState] = useState('active');
  const [currentWave, setCurrentWave] = useState(1);
  const [spawnedPowerUps, setSpawnedPowerUps] = useState([]);
  const [activePowerUps, setActivePowerUps] = useState([]);
  const [activeRandomEvent, setActiveRandomEvent] = useState(null);
  const [specialEnemies, setSpecialEnemies] = useState([]);
  const gameStartTime = useRef(null);
  const bossSpawnTimerRef = useRef(null);
  const toxicCloudTimerRef = useRef(null);
  const weatherTimerRef = useRef(null);
  
  const weatherEffects = useWeatherEffects(currentWeather, activeRandomEvent);
  
  const difficultyMultipliers = useDynamicDifficulty({
    plantHealth,
    score,
    pestsKilled: Object.values(pestsEliminated).reduce((a, b) => a + b, 0),
    damageTaken: 100 - plantHealth,
    gameTime,
    currentWave
  });

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
            spray_potency: 1,
            refill_speed: 1,
            spray_duration: 1,
            slow_effect: 0,
            area_damage: 0
          },
          plant_stats: {
            growth_level: 1,
            nutrition_level: 100,
            light_exposure: 50,
            water_level: 100,
            pruned_leaves: 0,
            resistance_bonus: 0
          },
          day_night_cycle: {
            current_hour: 12,
            cycle_speed: 1
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
    initialData: [],
    staleTime: 5 * 60 * 1000
  });

  const { data: allBosses } = useQuery({
    queryKey: ['bosses'],
    queryFn: () => base44.entities.Boss.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000
  });

  const saveSessionMutation = useMutation({
    mutationFn: (sessionData) => base44.entities.GameSession.create(sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data)
  });

  const levelLoadedRef = useRef(false);
  
  useEffect(() => {
    if (progress?.id && gameState === 'loading' && !levelLoadedRef.current && selectedPlantType) {
      levelLoadedRef.current = true;
      
      const loadLevel = async () => {
        setCurrentSeason(progress.current_season || 'spring');

        try {
          const response = await base44.functions.invoke('generateProceduralLevel', {
            level: progress.current_level,
            playerStats: {
              high_score: progress.high_score,
              upgrades: progress.upgrades,
              season: progress.current_season || 'spring'
            }
          });

          if (response?.data?.success) {
            const levelData = response.data.level;
            setProceduralLevelData(levelData);
            setLevel(levelData.level_number);
            setDayNightHour(levelData.time_of_day);
            setCurrentWeather(levelData.weather);
            setLevelObjectives(levelData.objectives || []);
            
            if (levelData.special_conditions) {
              levelData.special_conditions.forEach(condition => {
                if (condition.type === 'plant_stress') {
                  setPlantHealth(100 * condition.value);
                }
              });
            }

            if (levelData.lore_element) {
              setTimeout(() => {
                setDiscoveredLore(levelData.lore_element);
              }, 5000);
            }
          }
        } catch (error) {
          console.error('Error loading procedural level:', error);
          setLevel(progress.current_level);
          setDayNightHour(progress.day_night_cycle?.current_hour || 12);
          setCurrentWeather(progress.current_weather || 'clear');
        }
        
        setGameState('playing');
        gameStartTime.current = Date.now();
      };

      loadLevel();
    }
    
    if (gameState === 'loading') {
      levelLoadedRef.current = false;
    }
  }, [progress?.id, gameState]);

  const handleWeatherChange = (weather, pattern) => {
    setCurrentWeather(weather);
  };

  const handleRandomEvent = (event, effects) => {
    setActiveRandomEvent({ ...event, ...effects });
    
    if (event.id === 'pest_outbreak') {
      setTimeout(() => {
        spawnPests();
        spawnPests();
      }, 1000);
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress?.day_night_cycle) {
      const cycleSpeed = progress.day_night_cycle.cycle_speed || 1;
      const interval = setInterval(() => {
        setDayNightHour(prev => {
          const newHour = (prev + (0.1 * cycleSpeed)) % 24;
          return newHour;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, isPaused, progress?.day_night_cycle?.cycle_speed]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress?.id) {
      const plantDecayInterval = setInterval(() => {
        if (!progress?.plant_stats) return;

        const isDay = dayNightHour >= 6 && dayNightHour < 18;
        let waterDecay = 0.1;
        let nutritionDecay = 0.05;

        if (currentSeason === 'summer') {
          waterDecay += 0.05;
        } else if (currentSeason === 'winter') {
          waterDecay += 0.03;
          nutritionDecay += 0.02;
        } else if (currentSeason === 'spring') {
          nutritionDecay -= 0.02;
        }
        
        waterDecay *= (weatherEffects.waterModifier || 1.0);
        
        const tempChange = weatherEffects.tempModifier || 0;
        if (tempChange !== 0) {
          setDayNightHour(prev => Math.max(0, Math.min(24, prev + tempChange * 0.01)));
        }

        if (currentWeather === 'rain') {
          waterDecay = -0.5;
        } else if (currentWeather === 'heatwave') {
          waterDecay = 0.25;
        } else if (currentWeather === 'wind') {
          waterDecay += 0.08;
        }

        const updates = {
          plant_stats: {
            ...progress.plant_stats,
            water_level: Math.max(0, progress.plant_stats.water_level - waterDecay),
            nutrition_level: Math.max(0, progress.plant_stats.nutrition_level - nutritionDecay)
          }
        };

        if (isDay && progress.plant_stats.light_exposure > 60 && progress.plant_stats.water_level > 30) {
          let growthChance = 0.02;
          if (currentSeason === 'spring') growthChance += 0.01;
          if (currentSeason === 'summer') growthChance += 0.005;
          if (currentSeason === 'winter') growthChance -= 0.01;
          
          growthChance *= (weatherEffects.growthModifier || 1.0);

          if (Math.random() < growthChance) {
            updates.plant_stats.growth_level = Math.min(10, progress.plant_stats.growth_level + 0.1);
          }
        }

        if (progress.plant_stats.water_level < 20 || progress.plant_stats.nutrition_level < 20) {
          setPlantHealth(prev => Math.max(0, prev - 0.2));
        }
      }, 3000);

      return () => clearInterval(plantDecayInterval);
    }
  }, [gameState, isPaused, progress?.id, dayNightHour, currentSeason, currentWeather, weatherEffects]);

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

  const bossSpawnedRef = useRef(false);
  
  useEffect(() => {
    if (gameState === 'playing' && !isPaused && !activeBoss && allBosses?.length > 0 && level > 0 && !bossSpawnedRef.current) {
      if (proceduralLevelData?.boss) {
        const bossConfig = proceduralLevelData.boss;
        const bossData = allBosses.find(b => b.id === bossConfig.boss_id);
        if (bossData) {
          const enhancedBoss = {
            ...bossData,
            base_health: Math.floor(bossData.base_health * (bossConfig.health_multiplier || 1) * difficultyMultipliers.pestHealth),
            speed: bossData.speed * (bossConfig.speed_multiplier || 1) * difficultyMultipliers.pestSpeed,
            damage_per_second: bossData.damage_per_second * (bossConfig.damage_multiplier || 1)
          };
          spawnBoss(enhancedBoss);
          bossSpawnedRef.current = true;
        }
      } else if (level % 3 === 0) {
        const bossForLevel = allBosses.find(b => b.level_appearance === level);
        if (bossForLevel) {
          spawnBoss(bossForLevel);
          bossSpawnedRef.current = true;
        }
      }
    }
    
    if (activeBoss) {
      bossSpawnedRef.current = true;
    } else {
      bossSpawnedRef.current = false;
    }
  }, [level, gameState, isPaused, activeBoss, allBosses, proceduralLevelData]);

  const spawnBoss = (bossData) => {
    const healthMultiplier = 1 + (level - bossData.level_appearance) * 0.2;
    const maxHp = Math.floor(bossData.base_health * healthMultiplier);
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 10;

    const boss = {
      id: `boss_${Date.now()}`,
      ...bossData,
      health: maxHp,
      maxHealth: maxHp,
      position: {
        x: Math.cos(angle) * distance,
        y: 2,
        z: Math.sin(angle) * distance
      },
      currentArmorSegments: bossData.armor_segments || 0,
      lastSpawnTime: Date.now(),
      lastToxicTime: Date.now()
    };

    setActiveBoss(boss);
    setBossHealth(maxHp);
    setBossMaxHealth(maxHp);
    setBossArmorSegments(bossData.armor_segments || 0);
    setActivePests([]);
  };

  const getPestBehaviorType = (pestType) => {
    const behaviorMap = {
      'aphid': 'swarm',
      'thrip': 'fast',
      'spider_mite': 'zigzag',
      'whitefly': 'flying',
      'caterpillar': 'resistant',
      'grasshopper': 'jumper',
      'leafhopper': 'fast',
      'fungus_gnat': 'flying',
      'root_borer': 'burrowing',
      'fungal_spreader': 'spreading',
      'leaf_mimic': 'camouflaged'
    };
    return behaviorMap[pestType] || 'normal';
  };

  const getSeasonalPestModifiers = (season, pestType) => {
    const modifiers = { speedMult: 1.0, healthMult: 1.0, damageMult: 1.0, spawnChance: 1.0 };

    if (season === 'winter') {
      if (pestType === 'spider_mite') {
        modifiers.spawnChance = 1.5;
        modifiers.healthMult = 1.2;
      } else {
        modifiers.speedMult = 0.7;
      }
    } else if (season === 'summer') {
      if (pestType === 'grasshopper' || pestType === 'whitefly') {
        modifiers.spawnChance = 1.8;
        modifiers.damageMult = 1.3;
      }
      modifiers.speedMult = 1.2;
    } else if (season === 'spring') {
      if (pestType === 'aphid' || pestType === 'thrip') {
        modifiers.spawnChance = 1.6;
      }
    } else if (season === 'autumn') {
      if (pestType === 'fungal_spreader') {
        modifiers.spawnChance = 2.0;
        modifiers.damageMult = 1.4;
      }
    }

    return modifiers;
  };

  usePowerUpSpawner(currentWave, (powerup) => {
    setSpawnedPowerUps(prev => [...prev, powerup]);
  }, {
    plantHealth,
    pestCount: activePests.length,
    score,
    difficulty: level,
    spawnRateMultiplier: difficultyMultipliers.powerUpSpawnRate
  });

  const handlePowerUpCollect = (powerup) => {
    setSpawnedPowerUps(prev => prev.filter(p => p.id !== powerup.id));
    
    const effect = POWERUP_EFFECTS[powerup.type];
    if (effect) {
      if (effect.duration > 0) {
        setActivePowerUps(prev => [...prev, {
          ...powerup,
          startTime: Date.now(),
          duration: effect.duration
        }]);
        
        setTimeout(() => {
          setActivePowerUps(prev => prev.filter(p => p.id !== powerup.id));
        }, effect.duration * 1000);
      }
      
      if (powerup.type === 'nuke') {
        setActivePests([]);
        setScore(s => s + 200);
        toast.success('💣 NUKE! Tutti i parassiti eliminati!');
      } else if (powerup.type === 'health') {
        setPlantHealth(prev => Math.min(100, prev + 50));
        toast.success('❤️ +50 HP alla pianta!');
      } else if (powerup.type === 'freeze') {
        setActivePests(prev => prev.map(p => ({
          ...p,
          speed: p.speed * 0.1,
          frozen: true
        })));
        setTimeout(() => {
          setActivePests(prev => prev.map(p => ({
            ...p,
            speed: p.baseSpeed || p.speed * 10,
            frozen: false
          })));
        }, 5000);
        toast.success('❄️ Nemici congelati!');
      } else if (powerup.type === 'slow') {
        setActivePests(prev => prev.map(p => ({
          ...p,
          slowed: true,
          slowedUntil: Date.now() + 12000
        })));
        toast.success('🧊 Nemici rallentati!');
      } else if (powerup.type === 'defense') {
        toast.success('💎 Difesa temporanea attiva!');
      } else if (powerup.type === 'rage') {
        toast.success('😡 RAGE MODE!');
      } else if (powerup.type === 'lifesteal') {
        toast.success('🩸 Life Steal attivo!');
      }
    }
    
    toast.success(`Power-up: ${effect?.name || powerup.type}!`);
  };

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setActivePowerUps(prev => prev.filter(p => 
        now - p.startTime < p.duration * 1000
      ));
    }, 100);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  const spawnPests = React.useCallback(() => {
    if (!allPests || allPests?.length === 0 || !progress) return;
    
    const difficultyMultiplier = 1 + (level - 1) * 0.1;
    const healthScaling = plantHealth < 50 ? 0.8 : plantHealth > 80 ? 1.2 : 1.0;
    
    let pestsToSpawn = [];
    
    if (proceduralLevelData?.pests && proceduralLevelData.pests.length > 0) {
      pestsToSpawn = proceduralLevelData.pests.map(pestConfig => {
        const basePest = allPests.find(p => p.id === pestConfig.pest_id || p.type === pestConfig.type);
        return {
          ...pestConfig,
          pestData: basePest
        };
      }).filter(p => p.pestData);
      
      const spawnBoost = proceduralLevelData.special_conditions?.find(c => c.type === 'pest_spawn_boost')?.value || 1;
      if (spawnBoost > 1 && Math.random() > 0.5) {
        const extraCount = Math.floor(pestsToSpawn.length * (spawnBoost - 1));
        for (let i = 0; i < extraCount; i++) {
          const randomPest = pestsToSpawn[Math.floor(Math.random() * pestsToSpawn.length)];
          pestsToSpawn.push({ ...randomPest });
        }
      }
    } else {
      const levelPests = allPests.filter(p => p.unlock_level <= level);
      if (levelPests.length === 0) return;
      
      const baseCount = 2;
      const levelScaling = Math.floor(level / 2);
      const pestCount = Math.min(baseCount + levelScaling, 15);
      
      for (let i = 0; i < pestCount; i++) {
        const pestType = levelPests[Math.floor(Math.random() * levelPests.length)];
        pestsToSpawn.push({ pestData: pestType });
      }
    }
    
    const pestCount = pestsToSpawn.length;
    
    const healthMultiplier = (1 + (level - 1) * 0.15) * difficultyMultiplier * healthScaling;
    const speedMultiplier = (1 + (level - 1) * 0.08) * difficultyMultiplier;
    const damageMultiplier = (1 + (level - 1) * 0.1) * difficultyMultiplier;
    
    const speedBoost = proceduralLevelData?.special_conditions?.find(c => c.type === 'speed_boost')?.value || 1;
    
    const newPests = [];
    for (let i = 0; i < pestCount; i++) {
      const pestConfig = pestsToSpawn[i];
      const pestType = pestConfig.pestData;
      const behavior = getPestBehaviorType(pestType.type);
      const seasonalMods = getSeasonalPestModifiers(currentSeason, pestType.type);
      
      const finalSpawnChance = seasonalMods.spawnChance * (weatherEffects.pestSpawnModifier || 1.0);

      if (Math.random() > finalSpawnChance) continue;

      const angle = (i / pestCount) * Math.PI * 2;
      const distance = 8 + Math.random() * 4;

      const behaviorModifiers = {
        flying: { speedMult: 0.7, healthMult: 0.8, yOffset: 2 },
        fast: { speedMult: 1.5, healthMult: 0.7, yOffset: 0 },
        resistant: { speedMult: 0.6, healthMult: 1.8, yOffset: 0 },
        zigzag: { speedMult: 1.0, healthMult: 1.0, yOffset: 0 },
        swarm: { speedMult: 0.9, healthMult: 0.9, yOffset: 0 },
        jumper: { speedMult: 1.2, healthMult: 1.1, yOffset: 0 },
        camouflaged: { speedMult: 0.8, healthMult: 1.3, yOffset: 0 },
        burrowing: { speedMult: 0.7, healthMult: 1.5, yOffset: 0 },
        spreading: { speedMult: 0.9, healthMult: 1.2, yOffset: 0 },
        normal: { speedMult: 1.0, healthMult: 1.0, yOffset: 0 }
      };

      const mods = behaviorModifiers[behavior] || behaviorModifiers.normal;

      const finalHealth = Math.floor((pestConfig.health || pestType.health * healthMultiplier * mods.healthMult * seasonalMods.healthMult) * difficultyMultipliers.pestHealth);
      const finalSpeed = (pestConfig.speed || pestType.speed * speedMultiplier) * mods.speedMult * speedBoost * seasonalMods.speedMult * difficultyMultipliers.pestSpeed;
      const finalDamage = (pestConfig.damage || pestType.damage_per_second * damageMultiplier) * seasonalMods.damageMult;

      const pest = {
        id: `pest_${Date.now()}_${i}`,
        type: pestType.type,
        name: pestType.name,
        health: finalHealth,
        maxHealth: finalHealth,
        speed: finalSpeed,
        damage: finalDamage,
        position: {
          x: Math.cos(angle) * distance,
          y: behavior === 'burrowing' ? -1 : 1 + Math.random() * 1.5 + mods.yOffset,
          z: Math.sin(angle) * distance
        },
        color: pestType.color || '#ff0000',
        size: pestType.size_category,
        behavior: behavior,
        alarmLevel: 0,
        movementPattern: Math.random(),
        pestData: pestType
      };

      if (behavior === 'burrowing') {
        pest.underground = true;
        pest.emergeTime = Date.now() + Math.random() * 5000 + 3000;
      } else if (behavior === 'camouflaged') {
        pest.opacity = 0.3;
        pest.detectionRadius = 1.5;
      } else if (behavior === 'spreading') {
        pest.lastSpreadTime = Date.now();
        pest.spreadCooldown = 8000;
      }

      newPests.push(pest);
    }
    
    setActivePests(prev => [...prev, ...newPests]);
  }, [allPests, progress, level, plantHealth, proceduralLevelData, currentSeason, weatherEffects]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && !activeBoss && allPests?.length > 0) {
      const spawnDelay = Math.max(3000 - (level * 100), 2000);
      const spawnInterval = setInterval(spawnPests, spawnDelay);
      spawnPests();
      return () => clearInterval(spawnInterval);
    }
  }, [gameState, isPaused, activeBoss, allPests?.length, spawnPests]);

  const handleBossHit = (damage) => {
    if (!activeBoss) return;

    if (activeBoss.type === 'colossus' && bossArmorSegments > 0) {
      const armorDamage = damage * 0.3;
      setBossHealth(prev => {
        const newHealth = prev - armorDamage;
        if (newHealth <= activeBoss.maxHealth * (1 - (activeBoss.currentArmorSegments / activeBoss.armor_segments))) {
          setBossArmorSegments(seg => Math.max(0, seg - 1));
          setActiveBoss(b => ({ ...b, currentArmorSegments: Math.max(0, b.currentArmorSegments - 1) }));
        }
        return newHealth;
      });
    } else {
      setBossHealth(prev => {
        const newHealth = prev - damage;
        if (newHealth <= 0) {
          setScore(s => s + 500);
          setActiveBoss(null);
          setBossHealth(0);
          setBossArmorSegments(0);
          if (level % 3 === 0) {
            setTimeout(() => {
              endGame(true);
            }, 1000);
          }
        }
        return newHealth;
      });
    }
  };

  const handlePestHit = (pestId, damage) => {
    if (activeBoss && pestId === activeBoss.id) {
      handleBossHit(damage);
      return;
    }

    setActivePests(prev => {
      const hitPest = prev.find(p => p.id === pestId);
      if (!hitPest) return prev;

      if (hitPest.underground) {
        return prev;
      }

      const hitPosition = hitPest.position;
      const alarmRadius = 4;

      if (hitPest.behavior === 'spreading' && Date.now() - hitPest.lastSpreadTime > hitPest.spreadCooldown) {
        const spreadCount = 2;
        const newSpores = [];
        
        for (let i = 0; i < spreadCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 1 + Math.random();
          
          newSpores.push({
            id: `spore_${Date.now()}_${i}`,
            type: hitPest.type,
            name: hitPest.name,
            health: hitPest.maxHealth * 0.4,
            maxHealth: hitPest.maxHealth * 0.4,
            speed: hitPest.speed * 0.8,
            damage: hitPest.damage * 0.6,
            position: {
              x: hitPosition.x + Math.cos(angle) * distance,
              y: hitPosition.y,
              z: hitPosition.z + Math.sin(angle) * distance
            },
            color: hitPest.color,
            size: 'tiny',
            behavior: 'spreading',
            alarmLevel: 0,
            lastSpreadTime: Date.now(),
            spreadCooldown: 8000,
            pestData: hitPest.pestData
          });
        }
        
        hitPest.lastSpreadTime = Date.now();
        prev.push(...newSpores);
      }

      const slowEffect = progress?.upgrades?.slow_effect || 0;
      
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
          
          const slowedSpeed = slowEffect > 0 ? pest.speed * (1 - slowEffect * 0.08) : pest.speed;
          
          return { 
            ...pest, 
            health: newHealth, 
            alarmLevel: Math.min(5, pest.alarmLevel + 1),
            speed: slowedSpeed,
            slowed: slowEffect > 0,
            slowedUntil: slowEffect > 0 ? Date.now() + 3000 : 0
          };
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
    if (gameState === 'playing' && !isPaused && progress?.upgrades) {
      const refillSpeed = progress.upgrades.refill_speed || 1;
      const refillAmount = 1 + (refillSpeed - 1) * 0.3;
      const refillDelay = Math.max(50, 200 - (refillSpeed - 1) * 15);
      
      const refillInterval = setInterval(() => {
        setSprayAmmo(prev => Math.min(100, prev + refillAmount));
      }, refillDelay);
      return () => clearInterval(refillInterval);
    }
  }, [gameState, isPaused, progress?.upgrades?.refill_speed]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress?.plant_stats) {
      const resistanceBonus = progress.plant_stats.resistance_bonus || 0;
      const damageReduction = 1 - (Math.min(resistanceBonus, 75) / 100);
      
      const damageInterval = setInterval(() => {
        setActivePests(currentPests => {
          let totalDamage = 0;

          const pestsNearPlant = currentPests.filter(pest => {
            const distanceToCenter = Math.sqrt(
              Math.pow(pest.position.x, 2) + Math.pow(pest.position.z, 2)
            );
            return distanceToCenter < 2;
          });
          
          if (pestsNearPlant.length > 0) {
            totalDamage += pestsNearPlant.reduce((sum, pest) => sum + (pest.damage || 0.5), 0);
          }
          
          return currentPests;
        });
        
        setActiveBoss(currentBoss => {
          if (currentBoss) {
            const bossDistToCenter = Math.sqrt(
              Math.pow(currentBoss.position.x, 2) + Math.pow(currentBoss.position.z, 2)
            );
            if (bossDistToCenter < 3) {
              setPlantHealth(prev => Math.max(0, prev - (currentBoss.damage_per_second || 2) * 0.3 * damageReduction));
            }
          }
          return currentBoss;
        });

        setToxicClouds(currentClouds => {
          let toxicDamage = 0;
          currentClouds.forEach(cloud => {
            const cloudAge = (Date.now() - cloud.timestamp) / 1000;
            if (cloudAge < 10) {
              toxicDamage += cloud.damage;
            }
          });
          
          if (toxicDamage > 0) {
            setPlantHealth(prev => Math.max(0, prev - toxicDamage * 0.3 * damageReduction));
          }
          
          return currentClouds;
        });
      }, 500);
      return () => clearInterval(damageInterval);
    }
  }, [gameState, isPaused, progress?.plant_stats?.resistance_bonus]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress?.upgrades) {
      const sprayDuration = progress.upgrades.spray_duration || 1;
      const slowEffect = progress.upgrades.slow_effect || 0;
      const areaDamage = progress.upgrades.area_damage || 0;

      if (activeSprayEffects.length > 0) {
        const effectInterval = setInterval(() => {
          setActiveSprayEffects(prev => {
            const now = Date.now();
            return prev.filter(effect => now - effect.timestamp < 3000 + sprayDuration * 500);
          });

          if (areaDamage > 0) {
            setActivePests(prev => prev.map(pest => {
              const inEffectArea = activeSprayEffects.some(effect => {
                const dist = Math.sqrt(
                  Math.pow(pest.position.x - effect.position.x, 2) +
                  Math.pow(pest.position.y - effect.position.y, 2) +
                  Math.pow(pest.position.z - effect.position.z, 2)
                );
                return dist < 1.5;
              });

              if (inEffectArea) {
                const dotDamage = areaDamage * 2;
                const newHealth = pest.health - dotDamage;
                if (newHealth <= 0) {
                  setPestsEliminated(prevElim => ({
                    ...prevElim,
                    [pest.type]: (prevElim[pest.type] || 0) + 1
                  }));
                  setScore(s => s + 5);
                  return null;
                }
                return { ...pest, health: newHealth };
              }
              return pest;
            }).filter(Boolean));
          }
        }, 500);
        return () => clearInterval(effectInterval);
      }
    }
  }, [gameState, isPaused, activeSprayEffects.length, progress?.upgrades?.spray_duration, progress?.upgrades?.slow_effect, progress?.upgrades?.area_damage]);

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

    const researchPointsEarned = completed ? Math.floor(level * 2 + score / 50) : Math.floor(score / 100);
    
    let skillPointsEarned = 0;
    if (completed) {
      skillPointsEarned = 1;
      if (plantHealth >= 90) skillPointsEarned += 2;
      if (score > 1000) skillPointsEarned += 1;
      const totalPestsKilled = Object.values(pestsEliminated).reduce((sum, count) => sum + count, 0);
      if (totalPestsKilled >= 50) skillPointsEarned += 1;
    }
    
    if (skillPointsEarned > 0) {
      const skillTrees = await base44.entities.PlayerSkillTree.list();
      if (skillTrees.length > 0) {
        const skillTree = skillTrees[0];
        await base44.entities.PlayerSkillTree.update(skillTree.id, {
          skill_points: skillTree.skill_points + skillPointsEarned,
          total_points_earned: (skillTree.total_points_earned || 0) + skillPointsEarned
        });
        toast.success(`+${skillPointsEarned} Skill Points earned!`);
      }
    }

    if (proceduralLevelData && completed) {
      let bonusLeaf = proceduralLevelData.rewards.base_leaf;
      
      if (plantHealth >= 80) {
        bonusLeaf += proceduralLevelData.rewards.perfect_bonus;
      }
      
      const totalPestsKilled = Object.values(pestsEliminated).reduce((sum, count) => sum + count, 0);
      if (totalPestsKilled >= (proceduralLevelData.pests?.length || 0)) {
        bonusLeaf += proceduralLevelData.rewards.completion_bonus;
      }
      
      if (progress) {
        await updateProgressMutation.mutateAsync({
          id: progress.id,
          data: {
            ...progress,
            leaf_currency: progress.leaf_currency + bonusLeaf
          }
        });
      }
    }
    
    if (progress) {
      const nutritionDecay = 5;
      const waterDecay = 10;

      const newSeasonDay = (progress.season_day || 0) + 1;
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      const currentSeasonIndex = seasons.indexOf(progress.current_season || 'spring');
      const nextSeason = newSeasonDay >= 30 ? seasons[(currentSeasonIndex + 1) % 4] : progress.current_season;

      const updates = {
        total_score: progress.total_score + score,
        high_score: Math.max(progress.high_score, score),
        leaf_currency: progress.leaf_currency + Math.floor(score / 10),
        research_points: (progress.research_points || 0) + researchPointsEarned,
        current_season: nextSeason,
        season_day: newSeasonDay >= 30 ? 0 : newSeasonDay,
        plant_stats: {
          ...progress.plant_stats,
          nutrition_level: Math.max(0, progress.plant_stats.nutrition_level - nutritionDecay),
          water_level: Math.max(0, progress.plant_stats.water_level - waterDecay)
        },
        day_night_cycle: {
          ...progress.day_night_cycle,
          current_hour: dayNightHour
        }
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
    
    queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    queryClient.invalidateQueries({ queryKey: ['playerSkillTree'] });
  };

  const handleQuickUpgrade = async (category, upgradeId, cost) => {
    if (!progress || progress.leaf_currency < cost) {
      toast.error('Leaf insufficienti!');
      return;
    }

    let updates = { ...progress };
    
    if (category === 'spray') {
      const currentLevel = progress.upgrades[upgradeId] || 1;
      updates.upgrades = {
        ...progress.upgrades,
        [upgradeId]: currentLevel + 1
      };
    } else if (category === 'plant') {
      const currentValue = progress.plant_stats[upgradeId] || 0;
      updates.plant_stats = {
        ...progress.plant_stats,
        [upgradeId]: currentValue + 10
      };
    }
    
    updates.leaf_currency = progress.leaf_currency - cost;
    
    await updateProgressMutation.mutateAsync({ id: progress.id, data: updates });
    queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    toast.success('Potenziamento acquistato!');
  };

  const restartGame = () => {
    levelLoadedRef.current = false;
    bossSpawnedRef.current = false;
    setGameState('plant_selection');
    setScore(0);
    setPlantHealth(100);
    setSprayAmmo(100);
    setPestsEliminated({});
    setActivePests([]);
    setActiveBoss(null);
    setBossHealth(0);
    setBossMaxHealth(0);
    setBossArmorSegments(0);
    setToxicClouds([]);
    setDiscoveredLore(null);
    setProceduralLevelData(null);
    setGameTime(0);
    setWaveState('preparing');
    setCurrentWave(1);
    setSelectedPlantType(null);
    gameStartTime.current = Date.now();
  };

  useEffect(() => {
    if (activeBoss?.type === 'swarm' && gameState === 'playing' && !isPaused && allPests?.length > 0) {
      bossSpawnTimerRef.current = setInterval(() => {
        const now = Date.now();
        if (now - activeBoss.lastSpawnTime > 4000 && allPests?.length > 0) {
          const minionPest = allPests[Math.floor(Math.random() * allPests.length)];
          const angle = Math.random() * Math.PI * 2;
          const distance = 2;
          
          const minion = {
            id: `minion_${Date.now()}_${Math.random()}`,
            type: minionPest.type,
            name: minionPest.name,
            health: minionPest.health * 0.5,
            maxHealth: minionPest.health * 0.5,
            speed: minionPest.speed * 1.2,
            damage: minionPest.damage_per_second * 0.7,
            position: {
              x: activeBoss.position.x + Math.cos(angle) * distance,
              y: activeBoss.position.y,
              z: activeBoss.position.z + Math.sin(angle) * distance
            },
            color: minionPest.color,
            size: 'tiny',
            behavior: 'swarm',
            alarmLevel: 0,
            pestData: minionPest
          };

          setActivePests(prev => [...prev, minion]);
          setActiveBoss(b => ({ ...b, lastSpawnTime: now }));
        }
      }, 1000);

      return () => {
        if (bossSpawnTimerRef.current) {
          clearInterval(bossSpawnTimerRef.current);
        }
      };
    }
  }, [activeBoss?.id, activeBoss?.type, gameState, isPaused, allPests?.length]);

  useEffect(() => {
    if (activeBoss?.type === 'toxic' && gameState === 'playing' && !isPaused) {
      toxicCloudTimerRef.current = setInterval(() => {
        const now = Date.now();
        if (now - activeBoss.lastToxicTime > 6000) {
          const cloud = {
            id: `toxic_${Date.now()}`,
            position: { ...activeBoss.position },
            damage: activeBoss.toxic_cloud_damage || 1,
            timestamp: now
          };
          
          setToxicClouds(prev => [...prev, cloud]);
          setActiveBoss(b => ({ ...b, lastToxicTime: now }));
        }
      }, 1000);

      return () => {
        if (toxicCloudTimerRef.current) {
          clearInterval(toxicCloudTimerRef.current);
        }
      };
    }
  }, [activeBoss?.id, activeBoss?.type, gameState, isPaused]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setToxicClouds(prev => prev.filter(cloud => now - cloud.timestamp < 10000));
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);



  if (gameState === 'plant_selection') {
    return (
      <PlantTypeSelector
        onSelectPlant={(plant) => {
          setSelectedPlantType(plant);
          setPlantHealth(plant.stats.baseHealth);
          setGameState('loading');
        }}
        onClose={() => {}}
      />
    );
  }

  if (gameState === 'loading' || !progress) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative overflow-hidden">
      <DynamicWeatherSystem
        currentSeason={currentSeason}
        onWeatherChange={handleWeatherChange}
        onRandomEvent={handleRandomEvent}
        plantGrowthStage={progress?.plant_stats?.growth_level / 10 || 0}
        hasSmartPot={progress?.active_pot === 'smart'}
      />
      
      <PlantCareAI
        plantStats={progress?.plant_stats}
        environment={{ temperature: 22, humidity: 55 }}
        currentWeather={currentWeather}
        currentSeason={currentSeason}
        pestCount={activePests.length}
        activePests={activePests}
        growthStage={progress?.plant_stats?.growth_level / 10 || 0}
        position="bottom-left"
      />
      
      {waveState !== 'hidden' && (
        <WaveSystem
          currentWave={currentWave}
          totalWaves={20}
          waveProgress={(Object.values(pestsEliminated).reduce((a, b) => a + b, 0) / Math.max(1, activePests.length + Object.values(pestsEliminated).reduce((a, b) => a + b, 0)))}
          pestsRemaining={activePests.length}
          totalPests={activePests.length + Object.values(pestsEliminated).reduce((a, b) => a + b, 0)}
          waveState={waveState}
          onWaveStart={() => setWaveState('active')}
          onWaveComplete={() => {
            setCurrentWave(w => w + 1);
            setWaveState('active');
          }}
          rewards={{ leaves: level * 50, experience: level * 100 }}
        />
      )}
      
      <ActivePowerUpHUD activePowerUps={activePowerUps} />
      
      <AAA_GameScene3D
        gameLevel={level}
        plantHealth={plantHealth}
        plantGrowthStage={progress?.plant_stats?.growth_level / 10 || 0.5}
        pestInfestation={Math.min((activePests.length / 20) * 100, 100)}
        activePests={activePests}
        activePowerUps={activePowerUps}
        currentWeather={currentWeather}
        dayNightHour={dayNightHour}
        windStrength={0.2}
        rainIntensity={currentWeather === 'rain' ? 0.8 : 0}
        spawnedPowerUps={spawnedPowerUps}
        onPestKilled={(pestId, damage) => {
          const hasLifesteal = activePowerUps.some(p => p.type === 'lifesteal');
          if (hasLifesteal) {
            setPlantHealth(prev => Math.min(100, prev + damage * 0.2));
          }
          handlePestHit(pestId, damage);
        }}
        onPlantDamaged={(damage) => {
          const hasDefense = activePowerUps.some(p => p.type === 'defense');
          const finalDamage = hasDefense ? damage * 0.3 : damage;
          setPlantHealth(prev => Math.max(0, prev - finalDamage));
        }}
        onPowerUpCollect={handlePowerUpCollect}
      />

      {activeBoss && (
        <BossHealthBar 
          boss={activeBoss}
          health={bossHealth}
          maxHealth={bossMaxHealth}
          armorSegments={bossArmorSegments}
        />
      )}

      {levelObjectives.length > 0 && (
        <LevelObjectives
          objectives={levelObjectives}
          currentStats={{
            timeElapsed: gameTime,
            pestsKilled: Object.values(pestsEliminated).reduce((sum, count) => sum + count, 0),
            plantHealth: plantHealth
          }}
        />
      )}

      {discoveredLore && (
        <LoreDiscovery
          loreElement={discoveredLore}
          onDismiss={() => setDiscoveredLore(null)}
        />
      )}
      
      <GameUI
        score={score}
        level={level}
        plantHealth={plantHealth}
        sprayAmmo={sprayAmmo}
        activeSkin={progress.active_skin}
        onPause={() => setIsPaused(true)}
        onOpenUpgrades={() => setShowUpgradePanel(true)}
        dayNightHour={dayNightHour}
        plantStats={progress?.plant_stats}
        currentWeather={currentWeather}
        currentSeason={currentSeason}
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

      {showUpgradePanel && (
        <InGameUpgradePanel
          progress={progress}
          onUpgrade={handleQuickUpgrade}
          onClose={() => setShowUpgradePanel(false)}
        />
      )}

      {gameState === 'playing' && !isPaused && (
        <StrategyAdvisor
          gameContext={{
            current_pests: activePests.map(p => p.type),
            current_weather: currentWeather,
            current_season: currentSeason,
            plant_health: plantHealth,
            active_boss: activeBoss?.type,
            level: level,
            score: score
          }}
          onNavigate={(page, param) => {
            setIsPaused(true);
          }}
        />
      )}
    </div>
  );
}