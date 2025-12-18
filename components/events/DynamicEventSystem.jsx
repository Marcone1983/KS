import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useDynamicEvents({ 
  gameLevel, 
  currentSeason, 
  currentWeather, 
  playerPerformance,
  onEventTriggered,
  onEventEnded
}) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const eventCheckTimerRef = useRef(null);
  const eventEndTimerRef = useRef(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const events = await base44.entities.DynamicEvent.list();
        setAllEvents(events);
      } catch (error) {
        console.error('Failed to load dynamic events:', error);
      }
    };
    fetchEvents();
  }, []);

  const checkEventSpawn = useCallback(() => {
    if (activeEvent || allEvents.length === 0) return;

    const eligibleEvents = allEvents.filter(event => {
      const conditions = event.spawn_conditions || {};
      
      if (conditions.min_level && gameLevel < conditions.min_level) return false;
      
      if (conditions.season_requirements?.length > 0) {
        if (!conditions.season_requirements.includes(currentSeason)) return false;
      }
      
      if (conditions.weather_requirements?.length > 0) {
        if (!conditions.weather_requirements.includes(currentWeather)) return false;
      }
      
      return true;
    });

    if (eligibleEvents.length === 0) return;

    const performanceModifier = playerPerformance?.accuracy > 0.8 ? 1.2 : playerPerformance?.accuracy < 0.5 ? 0.8 : 1.0;
    
    eligibleEvents.forEach(event => {
      const spawnChance = (event.spawn_probability || 0.1) * performanceModifier;
      
      if (Math.random() < spawnChance) {
        triggerEvent(event);
      }
    });
  }, [activeEvent, allEvents, gameLevel, currentSeason, currentWeather, playerPerformance]);

  const triggerEvent = useCallback((event) => {
    const eventInstance = {
      ...event,
      startTime: Date.now(),
      endTime: Date.now() + (event.duration_seconds * 1000),
      appliedEffects: { ...event.effects }
    };

    setActiveEvent(eventInstance);

    const eventIcon = event.is_positive ? '✨' : '⚠️';
    const eventStyle = event.is_positive ? 'success' : 'warning';
    
    toast[eventStyle](`${eventIcon} Evento: ${event.event_name}`, {
      description: `Severità: ${event.severity}/5`,
      duration: 5000
    });

    if (onEventTriggered) {
      onEventTriggered(eventInstance);
    }

    eventEndTimerRef.current = setTimeout(() => {
      endEvent(eventInstance);
    }, event.duration_seconds * 1000);
  }, [onEventTriggered]);

  const endEvent = useCallback((event) => {
    setActiveEvent(null);
    
    if (onEventEnded) {
      onEventEnded(event);
    }

    toast.info(`Evento "${event.event_name}" terminato`);
  }, [onEventEnded]);

  useEffect(() => {
    const checkInterval = 45000;
    
    eventCheckTimerRef.current = setInterval(() => {
      checkEventSpawn();
    }, checkInterval);

    return () => {
      if (eventCheckTimerRef.current) {
        clearInterval(eventCheckTimerRef.current);
      }
      if (eventEndTimerRef.current) {
        clearTimeout(eventEndTimerRef.current);
      }
    };
  }, [checkEventSpawn]);

  return { 
    activeEvent,
    triggerEvent,
    endEvent
  };
}

export function applyEventEffects(event, gameState) {
  if (!event || !event.appliedEffects) return gameState;

  const effects = event.appliedEffects;
  const modifiedState = { ...gameState };

  if (effects.plant_damage && effects.plant_damage > 0) {
    modifiedState.plantHealth = Math.max(0, (modifiedState.plantHealth || 100) - effects.plant_damage);
  }

  if (effects.growth_modifier) {
    modifiedState.growthRate = (modifiedState.growthRate || 1.0) * (1 + effects.growth_modifier);
  }

  if (effects.pest_spawn_multiplier && effects.pest_spawn_multiplier !== 1.0) {
    modifiedState.pestSpawnRate = (modifiedState.pestSpawnRate || 1.0) * effects.pest_spawn_multiplier;
  }

  if (effects.resource_drain) {
    Object.keys(effects.resource_drain).forEach(resource => {
      if (modifiedState[resource] !== undefined) {
        modifiedState[resource] = Math.max(0, modifiedState[resource] - effects.resource_drain[resource]);
      }
    });
  }

  if (effects.mutation_chance && effects.mutation_chance > 0) {
    modifiedState.mutationChanceBonus = (modifiedState.mutationChanceBonus || 0) + effects.mutation_chance;
  }

  return modifiedState;
}