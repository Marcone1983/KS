import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

interface WeatherState {
  current: WeatherType;
  intensity: number; // 0-1
  timeOfDay: TimeOfDay;
  temperature: number; // Celsius
  humidity: number; // 0-100
  windSpeed: number; // km/h
}

interface WeatherEffects {
  growthMultiplier: number;
  pestSpawnRate: number;
  waterConsumption: number;
  visibility: number;
  particleCount: number;
}

interface WeatherColors {
  sky: [string, string, string];
  ambient: string;
  fog: string;
}

const WEATHER_COLORS: Record<WeatherType, Record<TimeOfDay, WeatherColors>> = {
  sunny: {
    dawn: { sky: ['#ff9a9e', '#fecfef', '#fecfef'], ambient: '#ffcc80', fog: '#fff5e6' },
    day: { sky: ['#56ccf2', '#2f80ed', '#56ccf2'], ambient: '#ffffff', fog: '#e3f2fd' },
    dusk: { sky: ['#ff6b6b', '#feca57', '#ff9ff3'], ambient: '#ffab91', fog: '#ffecb3' },
    night: { sky: ['#0c0c3d', '#1a1a5e', '#2d2d7f'], ambient: '#3949ab', fog: '#1a237e' },
  },
  cloudy: {
    dawn: { sky: ['#bdc3c7', '#95a5a6', '#7f8c8d'], ambient: '#b0bec5', fog: '#cfd8dc' },
    day: { sky: ['#bdc3c7', '#95a5a6', '#7f8c8d'], ambient: '#90a4ae', fog: '#b0bec5' },
    dusk: { sky: ['#636e72', '#2d3436', '#636e72'], ambient: '#78909c', fog: '#90a4ae' },
    night: { sky: ['#2c3e50', '#34495e', '#2c3e50'], ambient: '#455a64', fog: '#37474f' },
  },
  rainy: {
    dawn: { sky: ['#636e72', '#2d3436', '#636e72'], ambient: '#78909c', fog: '#90a4ae' },
    day: { sky: ['#636e72', '#2d3436', '#636e72'], ambient: '#607d8b', fog: '#78909c' },
    dusk: { sky: ['#2d3436', '#636e72', '#2d3436'], ambient: '#546e7a', fog: '#607d8b' },
    night: { sky: ['#1a1a2e', '#16213e', '#0f3460'], ambient: '#37474f', fog: '#263238' },
  },
  stormy: {
    dawn: { sky: ['#2d3436', '#636e72', '#2d3436'], ambient: '#455a64', fog: '#37474f' },
    day: { sky: ['#2d3436', '#1e272e', '#2d3436'], ambient: '#37474f', fog: '#263238' },
    dusk: { sky: ['#1e272e', '#2d3436', '#1e272e'], ambient: '#263238', fog: '#1a237e' },
    night: { sky: ['#0d0d0d', '#1a1a1a', '#0d0d0d'], ambient: '#212121', fog: '#0d0d0d' },
  },
  snowy: {
    dawn: { sky: ['#e8f4f8', '#b8d4e3', '#e8f4f8'], ambient: '#e3f2fd', fog: '#ffffff' },
    day: { sky: ['#e3f2fd', '#bbdefb', '#e3f2fd'], ambient: '#ffffff', fog: '#e8f4f8' },
    dusk: { sky: ['#b0bec5', '#90a4ae', '#b0bec5'], ambient: '#cfd8dc', fog: '#eceff1' },
    night: { sky: ['#1a237e', '#283593', '#1a237e'], ambient: '#3949ab', fog: '#303f9f' },
  },
  foggy: {
    dawn: { sky: ['#cfd8dc', '#b0bec5', '#cfd8dc'], ambient: '#eceff1', fog: '#ffffff' },
    day: { sky: ['#eceff1', '#cfd8dc', '#eceff1'], ambient: '#f5f5f5', fog: '#fafafa' },
    dusk: { sky: ['#90a4ae', '#78909c', '#90a4ae'], ambient: '#b0bec5', fog: '#cfd8dc' },
    night: { sky: ['#37474f', '#455a64', '#37474f'], ambient: '#546e7a', fog: '#607d8b' },
  },
  windy: {
    dawn: { sky: ['#81d4fa', '#4fc3f7', '#81d4fa'], ambient: '#b3e5fc', fog: '#e1f5fe' },
    day: { sky: ['#4fc3f7', '#29b6f6', '#4fc3f7'], ambient: '#81d4fa', fog: '#b3e5fc' },
    dusk: { sky: ['#ff8a65', '#ff7043', '#ff8a65'], ambient: '#ffab91', fog: '#ffccbc' },
    night: { sky: ['#1a237e', '#283593', '#1a237e'], ambient: '#3949ab', fog: '#303f9f' },
  },
};

const WEATHER_EFFECTS: Record<WeatherType, WeatherEffects> = {
  sunny: { growthMultiplier: 1.2, pestSpawnRate: 1.0, waterConsumption: 1.3, visibility: 1.0, particleCount: 0 },
  cloudy: { growthMultiplier: 1.0, pestSpawnRate: 0.8, waterConsumption: 0.9, visibility: 0.9, particleCount: 0 },
  rainy: { growthMultiplier: 1.3, pestSpawnRate: 0.5, waterConsumption: 0.3, visibility: 0.7, particleCount: 200 },
  stormy: { growthMultiplier: 0.8, pestSpawnRate: 0.3, waterConsumption: 0.2, visibility: 0.4, particleCount: 300 },
  snowy: { growthMultiplier: 0.5, pestSpawnRate: 0.2, waterConsumption: 0.5, visibility: 0.6, particleCount: 150 },
  foggy: { growthMultiplier: 0.9, pestSpawnRate: 0.6, waterConsumption: 0.7, visibility: 0.3, particleCount: 50 },
  windy: { growthMultiplier: 1.0, pestSpawnRate: 1.2, waterConsumption: 1.1, visibility: 0.8, particleCount: 100 },
};

const WEATHER_TRANSITIONS: Record<WeatherType, WeatherType[]> = {
  sunny: ['sunny', 'sunny', 'cloudy', 'windy'],
  cloudy: ['cloudy', 'sunny', 'rainy', 'foggy'],
  rainy: ['rainy', 'cloudy', 'stormy', 'foggy'],
  stormy: ['stormy', 'rainy', 'cloudy'],
  snowy: ['snowy', 'snowy', 'cloudy', 'foggy'],
  foggy: ['foggy', 'cloudy', 'sunny'],
  windy: ['windy', 'sunny', 'cloudy'],
};

export function useWeather() {
  const [weather, setWeather] = useState<WeatherState>({
    current: 'sunny',
    intensity: 0.5,
    timeOfDay: 'day',
    temperature: 22,
    humidity: 50,
    windSpeed: 10,
  });
  
  const [effects, setEffects] = useState<WeatherEffects>(WEATHER_EFFECTS.sunny);
  const [colors, setColors] = useState<WeatherColors>(WEATHER_COLORS.sunny.day);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const weatherInterval = useRef<NodeJS.Timeout | null>(null);

  // Calculate time of day based on real time
  const getTimeOfDay = useCallback((): TimeOfDay => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 18) return 'day';
    if (hour >= 18 && hour < 21) return 'dusk';
    return 'night';
  }, []);

  // Generate random weather based on current weather
  const generateNextWeather = useCallback((current: WeatherType): WeatherType => {
    const possibleWeathers = WEATHER_TRANSITIONS[current];
    const randomIndex = Math.floor(Math.random() * possibleWeathers.length);
    return possibleWeathers[randomIndex];
  }, []);

  // Update weather state
  const updateWeather = useCallback(async () => {
    const timeOfDay = getTimeOfDay();
    const nextWeather = generateNextWeather(weather.current);
    
    setIsTransitioning(true);
    
    // Smooth transition
    setTimeout(() => {
      const newWeather: WeatherState = {
        current: nextWeather,
        intensity: 0.3 + Math.random() * 0.7,
        timeOfDay,
        temperature: getTemperatureForWeather(nextWeather, timeOfDay),
        humidity: getHumidityForWeather(nextWeather),
        windSpeed: getWindSpeedForWeather(nextWeather),
      };
      
      setWeather(newWeather);
      setEffects(WEATHER_EFFECTS[nextWeather]);
      setColors(WEATHER_COLORS[nextWeather][timeOfDay]);
      
      // Save to storage
      AsyncStorage.setItem('currentWeather', JSON.stringify(newWeather));
      
      setIsTransitioning(false);
    }, 1000);
  }, [weather.current, getTimeOfDay, generateNextWeather]);

  // Force specific weather (for events or testing)
  const setWeatherType = useCallback((type: WeatherType, intensity?: number) => {
    const timeOfDay = getTimeOfDay();
    const newWeather: WeatherState = {
      current: type,
      intensity: intensity ?? 0.5,
      timeOfDay,
      temperature: getTemperatureForWeather(type, timeOfDay),
      humidity: getHumidityForWeather(type),
      windSpeed: getWindSpeedForWeather(type),
    };
    
    setWeather(newWeather);
    setEffects(WEATHER_EFFECTS[type]);
    setColors(WEATHER_COLORS[type][timeOfDay]);
    AsyncStorage.setItem('currentWeather', JSON.stringify(newWeather));
  }, [getTimeOfDay]);

  // Load saved weather on mount
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const saved = await AsyncStorage.getItem('currentWeather');
        if (saved) {
          const parsed: WeatherState = JSON.parse(saved);
          const timeOfDay = getTimeOfDay();
          
          // Update time of day but keep weather
          setWeather({ ...parsed, timeOfDay });
          setEffects(WEATHER_EFFECTS[parsed.current]);
          setColors(WEATHER_COLORS[parsed.current][timeOfDay]);
        }
      } catch (error) {
        console.error('Error loading weather:', error);
      }
    };
    
    loadWeather();
    
    // Update weather every 5 minutes
    weatherInterval.current = setInterval(updateWeather, 5 * 60 * 1000);
    
    // Update time of day every minute
    const timeInterval = setInterval(() => {
      const timeOfDay = getTimeOfDay();
      setWeather(prev => ({ ...prev, timeOfDay }));
      setColors(WEATHER_COLORS[weather.current][timeOfDay]);
    }, 60 * 1000);
    
    return () => {
      if (weatherInterval.current) clearInterval(weatherInterval.current);
      clearInterval(timeInterval);
    };
  }, []);

  // Get particle system config for current weather
  const getParticleConfig = useCallback(() => {
    const { current, intensity } = weather;
    const baseCount = effects.particleCount;
    
    switch (current) {
      case 'rainy':
        return {
          type: 'rain',
          count: Math.floor(baseCount * intensity),
          speed: 15 + intensity * 10,
          size: 0.02,
          color: '#a0d2db',
          direction: { x: 0, y: -1, z: 0.1 },
        };
      case 'stormy':
        return {
          type: 'rain',
          count: Math.floor(baseCount * intensity),
          speed: 25 + intensity * 15,
          size: 0.03,
          color: '#7fb3d5',
          direction: { x: 0.3, y: -1, z: 0.2 },
          lightning: true,
        };
      case 'snowy':
        return {
          type: 'snow',
          count: Math.floor(baseCount * intensity),
          speed: 2 + intensity * 3,
          size: 0.05,
          color: '#ffffff',
          direction: { x: 0.1, y: -1, z: 0 },
        };
      case 'foggy':
        return {
          type: 'fog',
          count: Math.floor(baseCount * intensity),
          speed: 0.5,
          size: 0.5,
          color: '#ffffff',
          opacity: 0.3 + intensity * 0.4,
        };
      case 'windy':
        return {
          type: 'leaves',
          count: Math.floor(baseCount * intensity),
          speed: 8 + intensity * 12,
          size: 0.08,
          color: '#8bc34a',
          direction: { x: 1, y: -0.2, z: 0.5 },
        };
      default:
        return null;
    }
  }, [weather, effects]);

  return {
    weather,
    effects,
    colors,
    isTransitioning,
    updateWeather,
    setWeatherType,
    getParticleConfig,
  };
}

// Helper functions
function getTemperatureForWeather(weather: WeatherType, timeOfDay: TimeOfDay): number {
  const baseTemps: Record<WeatherType, number> = {
    sunny: 25,
    cloudy: 20,
    rainy: 18,
    stormy: 16,
    snowy: -2,
    foggy: 15,
    windy: 18,
  };
  
  const timeModifiers: Record<TimeOfDay, number> = {
    dawn: -3,
    day: 0,
    dusk: -2,
    night: -8,
  };
  
  return baseTemps[weather] + timeModifiers[timeOfDay] + (Math.random() * 4 - 2);
}

function getHumidityForWeather(weather: WeatherType): number {
  const baseHumidity: Record<WeatherType, number> = {
    sunny: 40,
    cloudy: 60,
    rainy: 90,
    stormy: 95,
    snowy: 70,
    foggy: 95,
    windy: 45,
  };
  
  return baseHumidity[weather] + (Math.random() * 10 - 5);
}

function getWindSpeedForWeather(weather: WeatherType): number {
  const baseWind: Record<WeatherType, number> = {
    sunny: 5,
    cloudy: 10,
    rainy: 15,
    stormy: 40,
    snowy: 8,
    foggy: 2,
    windy: 35,
  };
  
  return baseWind[weather] + (Math.random() * 10 - 5);
}

export default useWeather;
