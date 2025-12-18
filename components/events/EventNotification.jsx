import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Sparkles, CloudRain, Sun, Snowflake, Bug, Dna, Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const EVENT_ICONS = {
  storm: CloudRain,
  heatwave: Sun,
  frost: Snowflake,
  drought: Sun,
  disease_outbreak: AlertTriangle,
  pest_swarm: Bug,
  beneficial_insects: Sparkles,
  genetic_mutation: Dna,
  soil_depletion: AlertTriangle,
  nutrient_surge: Droplets,
  rare_pest: Bug,
  pollination_event: Sparkles
};

const EVENT_COLORS = {
  storm: 'from-blue-900 to-gray-900',
  heatwave: 'from-orange-900 to-red-900',
  frost: 'from-cyan-900 to-blue-900',
  disease_outbreak: 'from-yellow-900 to-orange-900',
  beneficial_insects: 'from-green-900 to-emerald-900',
  genetic_mutation: 'from-purple-900 to-pink-900',
  nutrient_surge: 'from-teal-900 to-green-900',
  default: 'from-gray-900 to-gray-800'
};

export default function EventNotification({ activeEvent }) {
  const [timeRemaining, setTimeRemaining] = useState(100);

  useEffect(() => {
    if (!activeEvent) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - activeEvent.startTime;
      const duration = activeEvent.duration_seconds * 1000;
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeEvent]);

  if (!activeEvent) return null;

  const Icon = EVENT_ICONS[activeEvent.event_type] || AlertTriangle;
  const colorClass = EVENT_COLORS[activeEvent.event_type] || EVENT_COLORS.default;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-96"
      >
        <Card className={`bg-gradient-to-br ${colorClass} border-2 ${activeEvent.is_positive ? 'border-green-400' : 'border-red-400'} shadow-2xl`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Icon className={`h-6 w-6 ${activeEvent.is_positive ? 'text-green-300' : 'text-red-300'}`} />
              <span>{activeEvent.event_name}</span>
              <span className="ml-auto text-sm">Lv.{activeEvent.severity}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeEvent.effects?.plant_damage > 0 && (
                <div className="text-sm text-red-300">
                  ⚠️ Danno pianta: -{activeEvent.effects.plant_damage} HP
                </div>
              )}
              {activeEvent.effects?.growth_modifier && (
                <div className={`text-sm ${activeEvent.effects.growth_modifier > 0 ? 'text-green-300' : 'text-yellow-300'}`}>
                  {activeEvent.effects.growth_modifier > 0 ? '📈' : '📉'} Crescita: {activeEvent.effects.growth_modifier > 0 ? '+' : ''}{Math.round(activeEvent.effects.growth_modifier * 100)}%
                </div>
              )}
              {activeEvent.effects?.pest_spawn_multiplier !== 1.0 && (
                <div className={`text-sm ${activeEvent.effects.pest_spawn_multiplier < 1 ? 'text-green-300' : 'text-red-300'}`}>
                  🐛 Spawn parassiti: x{activeEvent.effects.pest_spawn_multiplier}
                </div>
              )}
              {activeEvent.effects?.mutation_chance > 0 && (
                <div className="text-sm text-purple-300">
                  🧬 Chance mutazione: +{Math.round(activeEvent.effects.mutation_chance * 100)}%
                </div>
              )}
              
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Tempo rimanente</span>
                  <span>{Math.floor((timeRemaining / 100) * activeEvent.duration_seconds)}s</span>
                </div>
                <Progress value={timeRemaining} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}