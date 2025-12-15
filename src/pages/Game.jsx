import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HempSprayFPV_Realistic from '../components/game/HempSprayFPV_Realistic';
import GameUI from '../components/game/GameUI';
import GameOver from '../components/game/GameOver';
import PauseMenu from '../components/game/PauseMenu';
import TutorPanel from '../components/game/TutorPanel';
import BossHealthBar from '../components/game/BossHealthBar';
import LevelObjectives from '../components/game/LevelObjectives';
import LoreDiscovery from '../components/game/LoreDiscovery';
import StrategyAdvisor from '../components/advisor/StrategyAdvisor';
import InGameUpgradePanel from '../components/game/InGameUpgradePanel';
import { toast } from 'sonner';

export default function Game() {
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
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
  const gameStartTime = useRef(null);
  const bossSpawnTimerRef = useRef(null);
  const toxicCloudTimerRef = useRef(null);
  const weatherTimerRef = useRef(null);

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
    initialData: []
  });

  const { data: allBosses } = useQuery({
    queryKey: ['bosses'],
    queryFn: () => base44.entities.Boss.list(),
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

          if (response.data.success) {
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
  }, [progress, gameState]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress) {
      const weatherDuration = 30000;
      const weatherChangeInterval = setInterval(() => {
        const now = Date.now();
        if (now > (progress.weather_end_time || 0)) {
          const weatherTypes = ['clear', 'clear', 'rain', 'wind', 'heatwave'];
          const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
          setCurrentWeather(newWeather);
          
          updateProgressMutation.mutate({
            id: progress.id,
            data: {
              ...progress,
              current_weather: newWeather,
              weather_end_time: now + weatherDuration
            }
          });
        }
      }, 5000);

      return () => clearInterval(weatherChangeInterval);
    }
  }, [gameState, isPaused, progress]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress) {
      const cycleSpeed = progress.day_night_cycle?.cycle_speed || 1;
      const interval = setInterval(() => {
        setDayNightHour(prev => {
          const newHour = (prev + (0.1 * cycleSpeed)) % 24;
          return newHour;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, isPaused, progress]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress) {
      const plantDecayInterval = setInterval(() => {
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

        if (currentWeather === 'rain') {
          waterDecay = -0.5;
          const newWaterLevel = Math.min(100, progress.plant_stats.water_level - waterDecay);
          updateProgressMutation.mutate({
            id: progress.id,
            data: {
              ...progress,
              plant_stats: {
                ...progress.plant_stats,
                water_level: newWaterLevel
              }
            }
          });
          return;
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

          if (Math.random() < growthChance) {
            updates.plant_stats.growth_level = Math.min(10, progress.plant_stats.growth_level + 0.1);
          }
        }

        if (progress.plant_stats.water_level < 20 || progress.plant_stats.nutrition_level < 20) {
          setPlantHealth(prev => Math.max(0, prev - 0.2));
        }

        updateProgressMutation.mutate({ id: progress.id, data: updates });
      }, 3000);

      return () => clearInterval(plantDecayInterval);
    }
  }, [gameState, isPaused, progress, dayNightHour, currentSeason, currentWeather]);

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

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && !activeBoss && allBosses.length > 0) {
      if (proceduralLevelData && proceduralLevelData.boss) {
        const bossConfig = proceduralLevelData.boss;
        const bossData = allBosses.find(b => b.id === bossConfig.boss_id);
        if (bossData) {
          const enhancedBoss = {
            ...bossData,
            base_health: Math.floor(bossData.base_health * (bossConfig.health_multiplier || 1)),
            speed: bossData.speed * (bossConfig.speed_multiplier || 1),
            damage_per_second: bossData.damage_per_second * (bossConfig.damage_multiplier || 1)
          };
          spawnBoss(enhancedBoss);
        }
      } else if (level % 3 === 0) {
        const bossForLevel = allBosses.find(b => b.level_appearance === level);
        if (bossForLevel) {
          spawnBoss(bossForLevel);
        }
      }
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

  const spawnPests = () => {
    if (!allPests || allPests.length === 0) return;
    
    let pestsToSpawn = [];
    
    if (proceduralLevelData && proceduralLevelData.pests && proceduralLevelData.pests.length > 0) {
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
    
    const healthMultiplier = 1 + (level - 1) * 0.15;
    const speedMultiplier = 1 + (level - 1) * 0.08;
    const damageMultiplier = 1 + (level - 1) * 0.1;
    
    const speedBoost = proceduralLevelData?.special_conditions?.find(c => c.type === 'speed_boost')?.value || 1;
    
    const newPests = [];
    for (let i = 0; i < pestCount; i++) {
      const pestConfig = pestsToSpawn[i];
      const pestType = pestConfig.pestData;
      const behavior = getPestBehaviorType(pestType.type);
      const seasonalMods = getSeasonalPestModifiers(currentSeason, pestType.type);

      if (Math.random() > seasonalMods.spawnChance) continue;

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

      const finalHealth = pestConfig.health || Math.floor(pestType.health * healthMultiplier * mods.healthMult * seasonalMods.healthMult);
      const finalSpeed = (pestConfig.speed || pestType.speed * speedMultiplier) * mods.speedMult * speedBoost * seasonalMods.speedMult;
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
  };

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && !activeBoss) {
      const spawnDelay = Math.max(3000 - (level * 100), 2000);
      const spawnInterval = setInterval(spawnPests, spawnDelay);
      spawnPests();
      return () => clearInterval(spawnInterval);
    }
  }, [gameState, isPaused, level, allPests, activeBoss]);

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
    if (gameState === 'playing' && !isPaused && progress) {
      const refillSpeed = progress.upgrades?.refill_speed || 1;
      const refillAmount = 1 + (refillSpeed - 1) * 0.3;
      const refillDelay = Math.max(50, 200 - (refillSpeed - 1) * 15);
      
      const refillInterval = setInterval(() => {
        setSprayAmmo(prev => Math.min(100, prev + refillAmount));
      }, refillDelay);
      return () => clearInterval(refillInterval);
    }
  }, [gameState, isPaused, progress]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress) {
      let resistanceBonus = progress.plant_stats?.resistance_bonus || 0;
      const activeBuffs = (progress.plant_stats?.temporary_buffs || []).filter(buff => buff.expiresAt > Date.now());
      const tempResistance = activeBuffs.reduce((sum, buff) => sum + (buff.type === 'resistance' ? buff.value : 0), 0);
      resistanceBonus += tempResistance;
      
      const damageReduction = 1 - (Math.min(resistanceBonus, 75) / 100);
      
      const damageInterval = setInterval(() => {
        let totalDamage = 0;

        const pestsNearPlant = activePests.filter(pest => {
          const distanceToCenter = Math.sqrt(
            Math.pow(pest.position.x, 2) + Math.pow(pest.position.z, 2)
          );
          return distanceToCenter < 2;
        });
        
        if (pestsNearPlant.length > 0) {
          totalDamage += pestsNearPlant.reduce((sum, pest) => sum + (pest.damage || 0.5), 0);
        }

        if (activeBoss) {
          const bossDistToCenter = Math.sqrt(
            Math.pow(activeBoss.position.x, 2) + Math.pow(activeBoss.position.z, 2)
          );
          if (bossDistToCenter < 3) {
            totalDamage += activeBoss.damage_per_second || 2;
          }
        }

        toxicClouds.forEach(cloud => {
          const cloudAge = (Date.now() - cloud.timestamp) / 1000;
          if (cloudAge < 10) {
            totalDamage += cloud.damage;
          }
        });

        if (totalDamage > 0) {
          setPlantHealth(prev => Math.max(0, prev - totalDamage * 0.3 * damageReduction));
        }
      }, 500);
      return () => clearInterval(damageInterval);
    }
  }, [gameState, isPaused, activePests, activeBoss, toxicClouds, progress]);

  useEffect(() => {
    if (gameState === 'playing' && !isPaused && progress) {
      const sprayDuration = progress.upgrades?.spray_duration || 1;
      const slowEffect = progress.upgrades?.slow_effect || 0;
      const areaDamage = progress.upgrades?.area_damage || 0;

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
  }, [gameState, isPaused, activeSprayEffects, progress]);

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
    toast.success('Potenziamento acquistato!');
  };

  const restartGame = () => {
    setGameState('playing');
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
    gameStartTime.current = Date.now();
  };

  useEffect(() => {
    if (activeBoss && activeBoss.type === 'swarm' && gameState === 'playing' && !isPaused) {
      bossSpawnTimerRef.current = setInterval(() => {
        const now = Date.now();
        if (now - activeBoss.lastSpawnTime > 4000 && allPests.length > 0) {
          const minionPest = allPests[Math.floor(Math.random() * Math.allPests.length)];
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
  }, [activeBoss, gameState, isPaused, allPests]);

  useEffect(() => {
    if (activeBoss && activeBoss.type === 'toxic' && gameState === 'playing' && !isPaused) {
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
  }, [activeBoss, gameState, isPaused]);

  useEffect(() => {
    if (toxicClouds.length > 0) {
      const cleanupInterval = setInterval(() => {
        const now = Date.now();
        setToxicClouds(prev => prev.filter(cloud => now - cloud.timestamp < 10000));
      }, 1000);

      return () => clearInterval(cleanupInterval);
    }
  }, [toxicClouds]);



  if (gameState === 'loading' || !progress) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative overflow-hidden">
      <HempSprayFPV_Realistic 
        activePests={activePests}
        plantHealth={plantHealth}
        currentWeather={currentWeather}
        dayNightHour={dayNightHour}
        windStrength={currentWeather === 'wind' ? 0.5 : 0.2}
        rainIntensity={currentWeather === 'rain' ? 0.8 : 0}
        onPestKilled={(pestId) => handlePestHit(pestId, 100)}
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