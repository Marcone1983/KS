import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { parent1, parent2, playerLevel = 1, researchBonuses = {} } = await req.json();

    if (!parent1 || !parent2) {
      return Response.json({ error: 'Both parents required' }, { status: 400 });
    }

    const genetics1 = parent1.genetics || {
      growth_speed: parent1.growth_speed || 1.0,
      pest_resistance: parent1.pest_resistance || 0,
      water_efficiency: parent1.water_efficiency || 1.0,
      yield_potential: parent1.max_health_bonus || 0
    };

    const genetics2 = parent2.genetics || {
      growth_speed: parent2.growth_speed || 1.0,
      pest_resistance: parent2.pest_resistance || 0,
      water_efficiency: parent2.water_efficiency || 1.0,
      yield_potential: parent2.max_health_bonus || 0
    };

    const mutationChance = 0.15 + (playerLevel * 0.005) + (researchBonuses.genetics || 0);
    const hybridVigor = 0.08 + (researchBonuses.breeding || 0);

    const inheritTrait = (trait1, trait2) => {
      const roll = Math.random();
      if (roll < 0.35) return trait1;
      if (roll < 0.70) return trait2;
      const average = (trait1 + trait2) / 2;
      const variance = Math.random() * 0.15 - 0.075;
      return average * (1 + variance);
    };

    const applyMutation = (value, min, max) => {
      if (Math.random() < mutationChance) {
        const mutationStrength = (Math.random() * 0.25) - 0.1;
        return Math.min(max, Math.max(min, value * (1 + mutationStrength)));
      }
      return value;
    };

    let offspringGenes = {
      growth_speed: inheritTrait(genetics1.growth_speed, genetics2.growth_speed),
      pest_resistance: inheritTrait(genetics1.pest_resistance, genetics2.pest_resistance),
      water_efficiency: inheritTrait(genetics1.water_efficiency, genetics2.water_efficiency),
      yield_potential: inheritTrait(genetics1.yield_potential, genetics2.yield_potential)
    };

    offspringGenes.growth_speed = applyMutation(offspringGenes.growth_speed * (1 + hybridVigor), 0.5, 3.0);
    offspringGenes.pest_resistance = applyMutation(offspringGenes.pest_resistance * (1 + hybridVigor), 0, 100);
    offspringGenes.water_efficiency = applyMutation(offspringGenes.water_efficiency * (1 + hybridVigor), 0.5, 2.5);
    offspringGenes.yield_potential = applyMutation(offspringGenes.yield_potential * (1 + hybridVigor), 0, 150);

    const hasSpecialTrait = Math.random() < (0.12 + (researchBonuses.special_traits || 0));
    if (hasSpecialTrait) {
      const specialTraits = [
        { id: 'rapid_growth', bonus: { growth_speed: 0.3 } },
        { id: 'iron_defense', bonus: { pest_resistance: 15 } },
        { id: 'drought_master', bonus: { water_efficiency: 0.4 } },
        { id: 'bountiful_harvest', bonus: { yield_potential: 25 } },
        { id: 'adaptable', bonus: { growth_speed: 0.15, pest_resistance: 8 } },
        { id: 'resilient', bonus: { pest_resistance: 12, water_efficiency: 0.2 } }
      ];

      const selectedTrait = specialTraits[Math.floor(Math.random() * specialTraits.length)];
      offspringGenes.special_trait = selectedTrait.id;
      
      Object.keys(selectedTrait.bonus).forEach(key => {
        if (key === 'growth_speed' || key === 'water_efficiency') {
          offspringGenes[key] *= (1 + selectedTrait.bonus[key]);
        } else {
          offspringGenes[key] += selectedTrait.bonus[key];
        }
      });
    }

    const qualityScore = (
      (offspringGenes.growth_speed / 3.0) * 0.25 +
      (offspringGenes.pest_resistance / 100) * 0.25 +
      (offspringGenes.water_efficiency / 2.5) * 0.2 +
      (offspringGenes.yield_potential / 150) * 0.3
    );

    let rarity = 'common';
    if (qualityScore > 0.85) rarity = 'mythic';
    else if (qualityScore > 0.70) rarity = 'legendary';
    else if (qualityScore > 0.50) rarity = 'rare';

    if (offspringGenes.special_trait && rarity === 'common') {
      rarity = 'rare';
    }

    const parent1Name = parent1.strain_name || 'Plant1';
    const parent2Name = parent2.strain_name || 'Plant2';
    
    const nameFragments1 = parent1Name.split(/\s+/);
    const nameFragments2 = parent2Name.split(/\s+/);
    
    let hybridName;
    if (Math.random() < 0.5) {
      const part1 = nameFragments1[0].slice(0, Math.ceil(nameFragments1[0].length / 2));
      const part2 = nameFragments2[0].slice(Math.floor(nameFragments2[0].length / 2));
      hybridName = `${part1}${part2}`;
    } else {
      hybridName = `${nameFragments1[0]} x ${nameFragments2[0]}`;
    }

    if (offspringGenes.special_trait) {
      const traitNames = {
        rapid_growth: 'Veloce',
        iron_defense: 'Corazzato',
        drought_master: 'Desertico',
        bountiful_harvest: 'Abbondante',
        adaptable: 'Versatile',
        resilient: 'Resistente'
      };
      hybridName = `${traitNames[offspringGenes.special_trait] || ''} ${hybridName}`;
    }

    const offspring = {
      strain_name: hybridName.trim(),
      genes: offspringGenes,
      rarity: rarity,
      parents: {
        parent1_id: parent1.id,
        parent2_id: parent2.id,
        parent1_name: parent1Name,
        parent2_name: parent2Name
      },
      generation: Math.max(parent1.generation || 1, parent2.generation || 1) + 1,
      quality_score: qualityScore
    };

    return Response.json({
      success: true,
      offspring: offspring
    });

  } catch (error) {
    console.error('Breeding error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});