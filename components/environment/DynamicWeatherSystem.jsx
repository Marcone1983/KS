import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudRain, Wind, Sun, CloudLightning, Thermometer, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';

const WEATHER_PATTERNS = {
  clear: { 
    icon: Sun, 
    color: 'text-yellow-400', 
    bg: 'from-blue-400 to-cyan-300',
    duration: [15000, 30000],
    waterImpact: -0.15,
    tempImpact: 2,
    growthBonus: 1.1
  },
  rain: { 
    icon: CloudRain, 
    color: 'text-blue-400', 
    bg: 'from-gray-600 to-blue-800',
    duration: [10000, 20000],
    waterImpact: 0.8,
    tempImpact: -3,
    growthBonus: 1.2,
    pestSpawnReduction: 0.6
  },
  storm: { 
    icon: CloudLightning, 
    color: 'text-purple-400', 
    bg: 'from-gray-900 to-purple-900',
    duration: [5000, 12000],
    waterImpact: 1.5,
    tempImpact: -5,
    damageChance: 0.15,
    pestSpawnReduction: 0.3,
    dramatic: true
  },
  drought: { 
    icon: Sun, 
    color: 'text-orange-500', 
    bg: 'from-orange-600 to-red-700',
    duration: [20000, 40000],
    waterImpact: -0.4,
    tempImpact: 8,
    growthPenalty: 0.7,
    pestSpawnIncrease: 1.4
  },
  wind: { 
    icon: Wind, 
    color: 'text-cyan-400', 
    bg: 'from-teal-500 to-cyan-600',
    duration: [8000, 15000],
    waterImpact: -0.2,
    tempImpact: -2,
    pestKnockback: true
  },
  heatwave: { 
    icon: Thermometer, 
    color: 'text-red-500', 
    bg: 'from-red-600 to-orange-700',
    duration: [12000, 25000],
    waterImpact: -0.5,
    tempImpact: 12,
    growthPenalty: 0.6,
    healthDrain: 0.3
  },
  fog: { 
    icon: Cloud, 
    color: 'text-gray-400', 
    bg: 'from-gray-500 to-gray-700',
    duration: [10000, 18000],
    waterImpact: 0.1,
    tempImpact: -1,
    visibilityReduction: 0.5
  },
  perfectWeather: {
    icon: Sparkles,
    color: 'text-green-400',
    bg: 'from-green-400 to-emerald-500',
    duration: [15000, 25000],
    waterImpact: 0.2,
    tempImpact: 0,
    growthBonus: 1.8,
    healthRegen: 0.5,
    rare: true
  }
};

const RANDOM_EVENTS = [
  {
    id: 'pest_outbreak',
    name: 'Pest Outbreak!',
    description: 'A swarm of pests is heading your way!',
    icon: '🐛',
    probability: 0.08,
    duration: 15000,
    effect: (state) => ({ pestSpawnRate: 3.0, pestHealth: 1.5 }),
    visual: 'bg-red-900/80 border-red-500',
    soundAlert: true
  },
  {
    id: 'nutrient_boost',
    name: 'Nutrient Rain',
    description: 'Nutrient-rich rain boosts plant growth!',
    icon: '🌿',
    probability: 0.12,
    duration: 20000,
    effect: (state) => ({ nutritionGain: 25, growthBoost: 1.5 }),
    visual: 'bg-green-900/80 border-green-500',
    positive: true
  },
  {
    id: 'equipment_malfunction',
    name: 'Equipment Malfunction',
    description: 'Your spray bottle is jammed!',
    icon: '⚠️',
    probability: 0.06,
    duration: 10000,
    effect: (state) => ({ sprayDisabled: true }),
    visual: 'bg-orange-900/80 border-orange-500',
    requiresSmartPot: true
  },
  {
    id: 'beneficial_bacteria',
    name: 'Beneficial Microbes',
    description: 'Good bacteria boost plant immunity!',
    icon: '🦠',
    probability: 0.10,
    duration: 30000,
    effect: (state) => ({ resistanceBonus: 30, pestDamageReduction: 0.5 }),
    visual: 'bg-blue-900/80 border-blue-500',
    positive: true
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    description: 'Intense sunlight accelerates photosynthesis!',
    icon: '☀️',
    probability: 0.07,
    duration: 12000,
    effect: (state) => ({ lightBonus: 40, growthBoost: 2.0, waterDrain: 1.3 }),
    visual: 'bg-yellow-900/80 border-yellow-500',
    positive: true
  },
  {
    id: 'frost_warning',
    name: 'Frost Warning',
    description: 'Temperatures dropping dangerously low!',
    icon: '❄️',
    probability: 0.05,
    duration: 18000,
    effect: (state) => ({ tempDrop: -15, growthPenalty: 0.4, healthDrain: 0.2 }),
    visual: 'bg-cyan-900/80 border-cyan-500',
    seasonRequired: 'winter'
  },
  {
    id: 'pollination_event',
    name: 'Pollination Boost',
    description: 'Ideal conditions for flowering!',
    icon: '🌸',
    probability: 0.09,
    duration: 25000,
    effect: (state) => ({ floweringBoost: 2.5, trichomeBonus: 0.3 }),
    visual: 'bg-pink-900/80 border-pink-500',
    positive: true,
    growthStageRequired: 0.6
  },
  {
    id: 'water_shortage',
    name: 'Water Shortage',
    description: 'Irrigation system failure!',
    icon: '💧',
    probability: 0.08,
    duration: 15000,
    effect: (state) => ({ waterDrainMultiplier: 2.5, wateringDisabled: true }),
    visual: 'bg-red-900/80 border-red-500'
  }
];

const SEASONAL_EFFECTS = {
  spring: {
    name: 'Spring',
    icon: '🌸',
    growthBonus: 1.3,
    pestActivity: 1.2,
    waterNeed: 1.0,
    tempRange: [15, 25],
    description: 'Optimal growth conditions'
  },
  summer: {
    name: 'Summer',
    icon: '☀️',
    growthBonus: 1.5,
    pestActivity: 1.6,
    waterNeed: 1.5,
    tempRange: [22, 35],
    description: 'High heat and pest activity'
  },
  autumn: {
    name: 'Autumn',
    icon: '🍂',
    growthBonus: 1.1,
    pestActivity: 1.3,
    waterNeed: 0.9,
    tempRange: [12, 22],
    description: 'Harvest season approaches'
  },
  winter: {
    name: 'Winter',
    icon: '❄️',
    growthBonus: 0.7,
    pestActivity: 0.6,
    waterNeed: 0.7,
    tempRange: [5, 15],
    description: 'Slow growth, fewer pests'
  }
};

export function DynamicWeatherSystem({
  currentSeason = 'spring',
  onWeatherChange,
  onRandomEvent,
  plantGrowthStage = 0,
  hasSmartPot = false
}) {
  const [currentWeather, setCurrentWeather] = useState('clear');
  const [weatherDuration, setWeatherDuration] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventEndTime, setEventEndTime] = useState(0);
  const weatherTimerRef = useRef(null);
  const eventTimerRef = useRef(null);

  useEffect(() => {
    const changeWeather = () => {
      const seasonData = SEASONAL_EFFECTS[currentSeason];
      let availableWeather = ['clear', 'rain', 'wind'];
      
      if (currentSeason === 'summer') {
        availableWeather.push('heatwave', 'drought');
      } else if (currentSeason === 'winter') {
        availableWeather.push('fog');
      } else if (currentSeason === 'spring') {
        availableWeather.push('perfectWeather');
      }
      
      if (Math.random() < 0.15) {
        availableWeather.push('storm');
      }
      
      const newWeather = availableWeather[Math.floor(Math.random() * availableWeather.length)];
      const pattern = WEATHER_PATTERNS[newWeather];
      
      if (pattern.rare && Math.random() > 0.2) {
        return changeWeather();
      }
      
      const duration = Math.floor(
        pattern.duration[0] + Math.random() * (pattern.duration[1] - pattern.duration[0])
      );
      
      setCurrentWeather(newWeather);
      setWeatherDuration(duration);
      
      if (onWeatherChange) {
        onWeatherChange(newWeather, pattern);
      }
      
      if (pattern.dramatic) {
        gsap.to(document.body, {
          duration: 0.3,
          backgroundColor: '#1a1a1a',
          yoyo: true,
          repeat: 1
        });
        toast.warning(`⚡ ${newWeather.toUpperCase()} approaching!`, {
          duration: 4000
        });
      }
      
      weatherTimerRef.current = setTimeout(changeWeather, duration);
    };
    
    changeWeather();
    
    return () => {
      if (weatherTimerRef.current) clearTimeout(weatherTimerRef.current);
    };
  }, [currentSeason, onWeatherChange]);

  useEffect(() => {
    const checkRandomEvent = () => {
      if (activeEvent) return;
      
      const eligibleEvents = RANDOM_EVENTS.filter(event => {
        if (event.seasonRequired && event.seasonRequired !== currentSeason) return false;
        if (event.growthStageRequired && plantGrowthStage < event.growthStageRequired) return false;
        if (event.requiresSmartPot && !hasSmartPot) return false;
        return Math.random() < event.probability;
      });
      
      if (eligibleEvents.length > 0) {
        const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
        const eventEffect = event.effect({});
        
        setActiveEvent({ ...event, ...eventEffect });
        setEventEndTime(Date.now() + event.duration);
        
        if (onRandomEvent) {
          onRandomEvent(event, eventEffect);
        }
        
        const toastType = event.positive ? toast.success : toast.warning;
        toastType(`${event.icon} ${event.name}`, {
          description: event.description,
          duration: 5000
        });
        
        if (event.soundAlert && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        
        eventTimerRef.current = setTimeout(() => {
          setActiveEvent(null);
          toast.info('Event ended');
        }, event.duration);
      }
    };
    
    const interval = setInterval(checkRandomEvent, 8000);
    
    return () => {
      clearInterval(interval);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    };
  }, [activeEvent, currentSeason, plantGrowthStage, hasSmartPot, onRandomEvent]);

  const WeatherIcon = WEATHER_PATTERNS[currentWeather]?.icon || Cloud;
  const seasonData = SEASONAL_EFFECTS[currentSeason];
  const SeasonIcon = seasonData ? () => <span className="text-2xl">{seasonData.icon}</span> : Sun;

  return (
    <div className="fixed top-4 right-4 z-30 space-y-3 pointer-events-auto">
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`bg-gradient-to-br ${WEATHER_PATTERNS[currentWeather]?.bg || 'from-gray-600 to-gray-800'} rounded-2xl p-4 shadow-2xl border-2 border-white/20 backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3 mb-2">
          <WeatherIcon className={`w-8 h-8 ${WEATHER_PATTERNS[currentWeather]?.color || 'text-white'}`} />
          <div>
            <div className="text-white font-bold text-lg capitalize">{currentWeather}</div>
            <div className="text-white/70 text-xs">
              {Math.ceil(weatherDuration / 1000)}s remaining
            </div>
          </div>
        </div>
        
        <div className="space-y-1 text-xs text-white/90">
          {WEATHER_PATTERNS[currentWeather]?.waterImpact && (
            <div className="flex items-center gap-2">
              <CloudRain className="w-3 h-3" />
              <span>Water: {WEATHER_PATTERNS[currentWeather].waterImpact > 0 ? '+' : ''}{(WEATHER_PATTERNS[currentWeather].waterImpact * 100).toFixed(0)}%</span>
            </div>
          )}
          {WEATHER_PATTERNS[currentWeather]?.tempImpact && (
            <div className="flex items-center gap-2">
              <Thermometer className="w-3 h-3" />
              <span>Temp: {WEATHER_PATTERNS[currentWeather].tempImpact > 0 ? '+' : ''}{WEATHER_PATTERNS[currentWeather].tempImpact}°C</span>
            </div>
          )}
          {WEATHER_PATTERNS[currentWeather]?.growthBonus && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-300" />
              <span>Growth: x{WEATHER_PATTERNS[currentWeather].growthBonus}</span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-4 shadow-2xl border-2 border-purple-400/30 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-2">
          <SeasonIcon />
          <div>
            <div className="text-white font-bold">{seasonData?.name}</div>
            <div className="text-white/70 text-xs">{seasonData?.description}</div>
          </div>
        </div>
        
        <div className="space-y-1 text-xs text-white/90">
          <div className="flex justify-between">
            <span>Growth:</span>
            <span className="font-bold text-green-300">x{seasonData?.growthBonus}</span>
          </div>
          <div className="flex justify-between">
            <span>Pest Activity:</span>
            <span className="font-bold text-red-300">x{seasonData?.pestActivity}</span>
          </div>
          <div className="flex justify-between">
            <span>Water Need:</span>
            <span className="font-bold text-cyan-300">x{seasonData?.waterNeed}</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ x: 100, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 100, opacity: 0, scale: 0.8 }}
            className={`${activeEvent.visual} rounded-2xl p-4 shadow-2xl border-2 backdrop-blur-sm`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{activeEvent.icon}</span>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">{activeEvent.name}</div>
                <div className="text-white/80 text-xs">{activeEvent.description}</div>
              </div>
            </div>
            
            <div className="h-1 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${activeEvent.positive ? 'bg-green-400' : 'bg-red-400'}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: activeEvent.duration / 1000, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useWeatherEffects(currentWeather, activeEvent) {
  const [effects, setEffects] = useState({
    waterModifier: 1.0,
    tempModifier: 0,
    growthModifier: 1.0,
    pestSpawnModifier: 1.0,
    damageMultiplier: 1.0,
    visibilityModifier: 1.0
  });

  useEffect(() => {
    const pattern = WEATHER_PATTERNS[currentWeather] || WEATHER_PATTERNS.clear;
    
    let newEffects = {
      waterModifier: 1.0 + (pattern.waterImpact || 0),
      tempModifier: pattern.tempImpact || 0,
      growthModifier: pattern.growthBonus || pattern.growthPenalty || 1.0,
      pestSpawnModifier: pattern.pestSpawnReduction ? 1 - pattern.pestSpawnReduction : pattern.pestSpawnIncrease || 1.0,
      damageMultiplier: 1.0,
      visibilityModifier: pattern.visibilityReduction ? 1 - pattern.visibilityReduction : 1.0
    };
    
    if (activeEvent) {
      if (activeEvent.nutritionGain) newEffects.nutritionBonus = activeEvent.nutritionGain;
      if (activeEvent.growthBoost) newEffects.growthModifier *= activeEvent.growthBoost;
      if (activeEvent.pestSpawnRate) newEffects.pestSpawnModifier *= activeEvent.pestSpawnRate;
      if (activeEvent.resistanceBonus) newEffects.resistanceBonus = activeEvent.resistanceBonus;
      if (activeEvent.waterDrain) newEffects.waterModifier *= activeEvent.waterDrain;
      if (activeEvent.tempDrop) newEffects.tempModifier += activeEvent.tempDrop;
      if (activeEvent.healthDrain) newEffects.healthDrainRate = activeEvent.healthDrain;
      if (activeEvent.sprayDisabled) newEffects.sprayDisabled = true;
    }
    
    setEffects(newEffects);
  }, [currentWeather, activeEvent]);

  return effects;
}

export default DynamicWeatherSystem;