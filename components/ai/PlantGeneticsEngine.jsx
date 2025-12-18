import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useGeneticMutations({ plantId, plantGenetics, environmentalStress, onMutation }) {
  const mutationTimerRef = useRef(null);
  const [currentGenetics, setCurrentGenetics] = useState(plantGenetics);

  const calculateMutationChance = useCallback((genetics, stress) => {
    let baseChance = genetics?.mutation_rate || 0.05;
    
    if (stress?.radiation > 0) baseChance += stress.radiation * 0.02;
    if (stress?.toxicity > 0) baseChance += stress.toxicity * 0.015;
    if (stress?.extremeWeather) baseChance += 0.01;
    if (stress?.diseasePresent) baseChance += 0.008;
    
    const stabilityReduction = 1 - (genetics?.stability || 0.8);
    baseChance += stabilityReduction * 0.03;
    
    return Math.min(baseChance, 0.5);
  }, []);

  const generateMutation = useCallback((existingGenetics) => {
    const mutationType = Math.random();
    const mutation = {
      timestamp: new Date().toISOString(),
      type: '',
      changes: {},
      visual_impact: false
    };

    if (mutationType < 0.25) {
      mutation.type = 'trait_boost';
      const traits = Object.keys(existingGenetics.base_traits || {});
      const trait = traits[Math.floor(Math.random() * traits.length)];
      const change = (Math.random() - 0.3) * 0.25;
      mutation.changes[trait] = Math.max(0.5, Math.min(2.0, (existingGenetics.base_traits[trait] || 1.0) + change));
    } else if (mutationType < 0.45) {
      mutation.type = 'resistance_change';
      const resistances = Object.keys(existingGenetics.resistance_genes || {});
      const resist = resistances[Math.floor(Math.random() * resistances.length)];
      const change = (Math.random() - 0.4) * 15;
      mutation.changes[resist] = Math.max(-10, Math.min(50, (existingGenetics.resistance_genes[resist] || 0) + change));
    } else if (mutationType < 0.65) {
      mutation.type = 'color_mutation';
      mutation.visual_impact = true;
      const colorTypes = ['leaf_color_hex', 'stem_color_hex', 'pistil_color_hex'];
      const colorType = colorTypes[Math.floor(Math.random() * colorTypes.length)];
      
      const currentColor = existingGenetics.visual_genes?.[colorType] || '#3a7d3a';
      const rgb = currentColor.match(/\w\w/g).map(x => parseInt(x, 16));
      const mutatedRgb = rgb.map(c => Math.max(0, Math.min(255, c + (Math.random() - 0.5) * 60)));
      const newColor = '#' + mutatedRgb.map(c => c.toString(16).padStart(2, '0')).join('');
      
      mutation.changes[colorType] = newColor;
    } else if (mutationType < 0.80) {
      mutation.type = 'special_trait';
      mutation.visual_impact = Math.random() < 0.6;
      const specialTraits = ['has_purple_trait', 'variegation'];
      const trait = specialTraits[Math.floor(Math.random() * specialTraits.length)];
      mutation.changes[trait] = Math.random() < 0.7;
    } else {
      mutation.type = 'finger_count_change';
      mutation.visual_impact = true;
      const currentCount = existingGenetics.base_traits?.finger_count || 7;
      const change = Math.random() < 0.5 ? -2 : 2;
      mutation.changes.finger_count = Math.max(3, Math.min(11, currentCount + change));
    }

    return mutation;
  }, []);

  const applyMutation = useCallback(async (mutation) => {
    if (!currentGenetics?.id) return;

    const updatedGenetics = { ...currentGenetics };
    
    if (mutation.type === 'trait_boost') {
      Object.assign(updatedGenetics.base_traits, mutation.changes);
    } else if (mutation.type === 'resistance_change') {
      Object.assign(updatedGenetics.resistance_genes, mutation.changes);
    } else if (mutation.type === 'color_mutation' || mutation.type === 'special_trait') {
      Object.assign(updatedGenetics.visual_genes, mutation.changes);
    } else if (mutation.type === 'finger_count_change') {
      Object.assign(updatedGenetics.base_traits, mutation.changes);
    }

    updatedGenetics.mutation_history = [
      ...(updatedGenetics.mutation_history || []),
      mutation
    ];

    try {
      await base44.entities.PlantGenetics.update(currentGenetics.id, updatedGenetics);
      setCurrentGenetics(updatedGenetics);
      
      if (onMutation) {
        onMutation(mutation, updatedGenetics);
      }
    } catch (error) {
      console.error('Failed to save mutation:', error);
    }
  }, [currentGenetics, onMutation]);

  useEffect(() => {
    const checkInterval = 30000;
    
    mutationTimerRef.current = setInterval(() => {
      const mutationChance = calculateMutationChance(currentGenetics, environmentalStress);
      
      if (Math.random() < mutationChance) {
        const mutation = generateMutation(currentGenetics);
        applyMutation(mutation);
      }
    }, checkInterval);

    return () => {
      if (mutationTimerRef.current) {
        clearInterval(mutationTimerRef.current);
      }
    };
  }, [currentGenetics, environmentalStress, calculateMutationChance, generateMutation, applyMutation]);

  return { currentGenetics, applyMutation };
}

export function usePlantInteractions({ plants, onInteractionDetected }) {
  const [activeInteractions, setActiveInteractions] = useState([]);
  const interactionCheckInterval = useRef(null);

  const detectProximityInteractions = useCallback((plantList) => {
    const interactions = [];
    
    for (let i = 0; i < plantList.length; i++) {
      for (let j = i + 1; j < plantList.length; j++) {
        const plantA = plantList[i];
        const plantB = plantList[j];
        
        if (!plantA.position || !plantB.position) continue;
        
        const distance = Math.sqrt(
          Math.pow(plantA.position.x - plantB.position.x, 2) +
          Math.pow(plantA.position.z - plantB.position.z, 2)
        );
        
        if (distance < 3.0) {
          let interactionType;
          let intensity = 1.0;
          let affectedResources = [];
          let statModifiers = {
            growth_modifier: 0,
            health_modifier: 0,
            resistance_modifier: 0
          };

          if (distance < 1.0) {
            interactionType = 'competition_resources';
            intensity = 2.0 - distance;
            affectedResources = ['water', 'nutrients', 'light'];
            statModifiers.growth_modifier = -0.15 * intensity;
            statModifiers.health_modifier = -0.1 * intensity;
          } else if (distance < 1.8 && plantA.genetics?.allelopathy && plantB.genetics?.allelopathy) {
            const compatible = plantA.genetics.allelopathy.compatible_strains?.includes(plantB.genetics.genome_id);
            interactionType = compatible ? 'allelopathy_positive' : 'allelopathy_negative';
            intensity = 1.5;
            affectedResources = compatible ? ['nutrients'] : ['water', 'nutrients'];
            statModifiers.growth_modifier = compatible ? 0.08 : -0.12;
            statModifiers.resistance_modifier = compatible ? 5 : -3;
          } else if (distance < 2.2) {
            interactionType = 'canopy_shading';
            const tallerPlant = (plantA.genetics?.base_traits?.height_multiplier || 1) > (plantB.genetics?.base_traits?.height_multiplier || 1) ? plantA : plantB;
            const shorterPlant = tallerPlant === plantA ? plantB : plantA;
            intensity = 1.2;
            affectedResources = ['light'];
            statModifiers.growth_modifier = -0.08;
          } else if (distance < 2.8 && Math.random() < 0.15) {
            interactionType = 'symbiosis';
            intensity = 0.8;
            affectedResources = ['water'];
            statModifiers.growth_modifier = 0.05;
            statModifiers.health_modifier = 0.05;
            statModifiers.resistance_modifier = 3;
          } else {
            interactionType = 'root_entanglement';
            intensity = 0.5;
            affectedResources = ['water', 'nutrients'];
            statModifiers.growth_modifier = -0.03;
          }

          interactions.push({
            plant_a_id: plantA.id,
            plant_b_id: plantB.id,
            interaction_type: interactionType,
            distance,
            intensity,
            resource_affected: affectedResources,
            stat_modifiers: statModifiers,
            started_at: new Date().toISOString(),
            is_active: true
          });
        }
      }
    }
    
    return interactions;
  }, []);

  useEffect(() => {
    if (!plants || plants.length === 0) return;

    interactionCheckInterval.current = setInterval(() => {
      const detectedInteractions = detectProximityInteractions(plants);
      
      detectedInteractions.forEach(interaction => {
        const exists = activeInteractions.find(
          ai => ai.plant_a_id === interaction.plant_a_id && ai.plant_b_id === interaction.plant_b_id
        );
        
        if (!exists && onInteractionDetected) {
          onInteractionDetected(interaction);
        }
      });
      
      setActiveInteractions(detectedInteractions);
    }, 5000);

    return () => {
      if (interactionCheckInterval.current) {
        clearInterval(interactionCheckInterval.current);
      }
    };
  }, [plants, detectProximityInteractions, onInteractionDetected, activeInteractions]);

  return { activeInteractions };
}

export function calculateTreatmentEffectiveness({ 
  plantHealth, 
  pestType, 
  diseaseType, 
  treatmentType, 
  plantGenetics 
}) {
  let baseEffectiveness = 1.0;
  
  const healthModifier = plantHealth / 100;
  baseEffectiveness *= (0.6 + healthModifier * 0.4);

  if (plantGenetics?.resistance_genes) {
    if (pestType && plantGenetics.resistance_genes.pest_resistance) {
      baseEffectiveness *= (1.0 + plantGenetics.resistance_genes.pest_resistance * 0.01);
    }
    if (diseaseType && plantGenetics.resistance_genes.disease_resistance) {
      baseEffectiveness *= (1.0 + plantGenetics.resistance_genes.disease_resistance * 0.01);
    }
  }

  const treatmentMatch = {
    'organic_spray': { aphid: 1.3, spider_mite: 1.2, whitefly: 1.1 },
    'chemical_spray': { thrip: 1.4, caterpillar: 1.3, grasshopper: 1.2 },
    'biological_control': { fungus_gnat: 1.5, leafhopper: 1.3 },
    'systemic': { root_borer: 1.6, fungal_spreader: 1.4 }
  };

  if (treatmentMatch[treatmentType] && treatmentMatch[treatmentType][pestType]) {
    baseEffectiveness *= treatmentMatch[treatmentType][pestType];
  }

  if (plantHealth < 30) {
    baseEffectiveness *= 0.7;
  } else if (plantHealth < 50) {
    baseEffectiveness *= 0.85;
  }

  return Math.min(baseEffectiveness, 2.5);
}