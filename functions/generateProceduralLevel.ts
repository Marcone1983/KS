import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { level, playerStats } = await req.json();

    const allPests = await base44.asServiceRole.entities.Pest.list();
    const allBosses = await base44.asServiceRole.entities.Boss.list();
    const allEnvBosses = await base44.asServiceRole.entities.EnvironmentalBoss.list();

    const difficultyMultiplier = 1 + (level - 1) * 0.15;
    const isBossLevel = level % 3 === 0;
    const currentSeason = playerStats.season || 'spring';

    const availablePests = allPests.filter(p => p.unlock_level <= level);
    
    const baseCount = 3;
    const scaledCount = Math.floor(baseCount + level * 0.5);
    const pestCount = Math.min(scaledCount, 20);

    const weatherOptions = ['clear', 'clear', 'rain', 'wind', 'heatwave', 'acid_rain', 'fog', 'storm'];
    const seasonalWeatherBoost = {
      spring: ['rain', 'clear'],
      summer: ['heatwave', 'clear'],
      autumn: ['wind', 'rain', 'fog'],
      winter: ['fog', 'storm', 'wind']
    };

    let randomWeather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    if (Math.random() > 0.6 && seasonalWeatherBoost[currentSeason]) {
      const seasonWeather = seasonalWeatherBoost[currentSeason];
      randomWeather = seasonWeather[Math.floor(Math.random() * seasonWeather.length)];
    }

    const timeOptions = [6, 9, 12, 15, 18, 21, 0, 3];
    const randomHour = timeOptions[Math.floor(Math.random() * timeOptions.length)];

    const environmentalVariations = [
      { type: 'dense_fog', visibility: 0.4, description: 'Nebbia densa riduce visibilità del 60%' },
      { type: 'acid_rain_damage', damage_rate: 0.5, description: 'Pioggia acida danneggia la pianta' },
      { type: 'strong_wind', pest_speed_mult: 0.7, spray_deviation: 1.5, description: 'Vento forte rallenta parassiti ma devia spray' },
      { type: 'drought', water_drain_mult: 2.0, description: 'Siccità raddoppia consumo acqua' },
      { type: 'pest_frenzy', spawn_rate_mult: 1.8, description: 'Frenesia parassiti: spawn rate +80%' }
    ];

    const activeEnvironmentalEffects = [];
    if (randomWeather === 'fog' && Math.random() > 0.5) {
      activeEnvironmentalEffects.push(environmentalVariations[0]);
    }
    if (randomWeather === 'acid_rain') {
      activeEnvironmentalEffects.push(environmentalVariations[1]);
    }
    if (randomWeather === 'storm') {
      activeEnvironmentalEffects.push(environmentalVariations[2]);
    }
    if (randomWeather === 'heatwave' && Math.random() > 0.6) {
      activeEnvironmentalEffects.push(environmentalVariations[3]);
    }
    if (Math.random() > 0.85) {
      activeEnvironmentalEffects.push(environmentalVariations[4]);
    }

    const spawnPests = [];
    for (let i = 0; i < pestCount; i++) {
      const randomPest = availablePests[Math.floor(Math.random() * availablePests.length)];
      
      const healthVariation = 0.8 + Math.random() * 0.4;
      const speedVariation = 0.9 + Math.random() * 0.2;
      
      spawnPests.push({
        pest_id: randomPest.id,
        type: randomPest.type,
        health: Math.floor(randomPest.health * difficultyMultiplier * healthVariation),
        speed: randomPest.speed * difficultyMultiplier * speedVariation,
        damage: randomPest.damage_per_second * difficultyMultiplier,
        spawn_delay: Math.random() * 5000
      });
    }

    let bossData = null;
    if (isBossLevel) {
      const eligibleEnvBosses = allEnvBosses.filter(b => 
        b.spawn_level <= level && 
        (b.required_season === currentSeason || b.required_season === 'any') &&
        (b.required_weather === randomWeather || b.required_weather === 'any')
      );

      if (eligibleEnvBosses.length > 0 && Math.random() > 0.5) {
        const envBoss = eligibleEnvBosses[Math.floor(Math.random() * eligibleEnvBosses.length)];
        bossData = {
          boss_id: envBoss.id,
          is_environmental: true,
          health_multiplier: 1 + (level - envBoss.spawn_level) * 0.3,
          speed_multiplier: 1 + Math.random() * 0.4,
          damage_multiplier: 1 + (level - envBoss.spawn_level) * 0.2,
          environmental_ability: envBoss.environmental_ability
        };
      } else {
        const eligibleBosses = allBosses.filter(b => b.level_appearance <= level);
        if (eligibleBosses.length > 0) {
          const randomBoss = eligibleBosses[Math.floor(Math.random() * eligibleBosses.length)];
          bossData = {
            boss_id: randomBoss.id,
            is_environmental: false,
            health_multiplier: 1 + (level - randomBoss.level_appearance) * 0.25,
            speed_multiplier: 1 + Math.random() * 0.3,
            damage_multiplier: 1 + (level - randomBoss.level_appearance) * 0.15
          };
        }
      }
    }

    const specialConditions = [];
    if (Math.random() > 0.7) {
      specialConditions.push({
        type: 'pest_spawn_boost',
        value: 1.5,
        description: 'Ondata parassiti: spawn rate aumentato del 50%'
      });
    }
    if (Math.random() > 0.8) {
      specialConditions.push({
        type: 'speed_boost',
        value: 1.3,
        description: 'Parassiti aggressivi: velocità aumentata del 30%'
      });
    }
    if (Math.random() > 0.85) {
      specialConditions.push({
        type: 'plant_stress',
        value: 0.8,
        description: 'Pianta stressata: salute iniziale ridotta del 20%'
      });
    }

    specialConditions.push(...activeEnvironmentalEffects);

    const leafReward = Math.floor(50 + level * 10 + (isBossLevel ? 200 : 0));
    
    const allLore = await base44.asServiceRole.entities.LoreElement.list();
    const eligibleLore = allLore.filter(l => l.discovery_level <= level);
    
    let loreToDiscover = null;
    if (eligibleLore.length > 0 && Math.random() > 0.7) {
      const rarityWeights = {
        common: 0.5,
        uncommon: 0.3,
        rare: 0.15,
        legendary: 0.05
      };
      
      const weightedLore = eligibleLore.filter(l => {
        const weight = rarityWeights[l.rarity] || 0.5;
        return Math.random() < weight;
      });
      
      if (weightedLore.length > 0) {
        loreToDiscover = weightedLore[Math.floor(Math.random() * weightedLore.length)];
      }
    }

    const proceduralLevel = {
      level_number: level,
      difficulty_rating: Math.min(10, 1 + level * 0.3),
      pests: spawnPests,
      boss: bossData,
      weather: randomWeather,
      time_of_day: randomHour,
      special_conditions: specialConditions,
      environmental_effects: activeEnvironmentalEffects,
      rewards: {
        base_leaf: leafReward,
        completion_bonus: Math.floor(leafReward * 0.5),
        perfect_bonus: Math.floor(leafReward * 0.3)
      },
      objectives: [
        { type: 'survive', duration: 120 + level * 5 },
        { type: 'eliminate_pests', count: Math.floor(pestCount * 0.7) },
        { type: 'maintain_health', threshold: 50 }
      ],
      lore_element: loreToDiscover
    };

    return Response.json({
      success: true,
      level: proceduralLevel,
      seed: Date.now(),
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating level:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});