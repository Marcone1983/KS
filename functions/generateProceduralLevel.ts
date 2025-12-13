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

    const difficultyMultiplier = 1 + (level - 1) * 0.15;
    const isBossLevel = level % 3 === 0;

    const availablePests = allPests.filter(p => p.unlock_level <= level);
    
    const baseCount = 3;
    const scaledCount = Math.floor(baseCount + level * 0.5);
    const pestCount = Math.min(scaledCount, 20);

    const weatherOptions = ['clear', 'clear', 'rain', 'wind', 'heatwave'];
    const randomWeather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];

    const timeOptions = [6, 9, 12, 15, 18, 21, 0, 3];
    const randomHour = timeOptions[Math.floor(Math.random() * timeOptions.length)];

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
      const eligibleBosses = allBosses.filter(b => b.level_appearance <= level);
      if (eligibleBosses.length > 0) {
        const randomBoss = eligibleBosses[Math.floor(Math.random() * eligibleBosses.length)];
        bossData = {
          boss_id: randomBoss.id,
          health_multiplier: 1 + (level - randomBoss.level_appearance) * 0.25,
          speed_multiplier: 1 + Math.random() * 0.3,
          damage_multiplier: 1 + (level - randomBoss.level_appearance) * 0.15
        };
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

    const leafReward = Math.floor(50 + level * 10 + (isBossLevel ? 200 : 0));
    
    const proceduralLevel = {
      level_number: level,
      difficulty_rating: Math.min(10, 1 + level * 0.3),
      pests: spawnPests,
      boss: bossData,
      weather: randomWeather,
      time_of_day: randomHour,
      special_conditions: specialConditions,
      rewards: {
        base_leaf: leafReward,
        completion_bonus: Math.floor(leafReward * 0.5),
        perfect_bonus: Math.floor(leafReward * 0.3)
      },
      objectives: [
        { type: 'survive', duration: 120 + level * 5 },
        { type: 'eliminate_pests', count: Math.floor(pestCount * 0.7) },
        { type: 'maintain_health', threshold: 50 }
      ]
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