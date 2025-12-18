import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Coins, Heart, Wind, Flame } from 'lucide-react';

export const PLANT_TYPES = {
  resilient: {
    id: 'resilient',
    name: 'Resilient Kush',
    description: 'Extremely hardy plant with enhanced damage resistance',
    icon: Shield,
    color: 'from-green-600 to-emerald-700',
    borderColor: 'border-green-500',
    passive: {
      type: 'damage_reduction',
      value: 0.3,
      description: 'Takes 30% less damage from all pest attacks'
    },
    stats: {
      baseHealth: 130,
      pestResistance: 1.3,
      growthSpeed: 0.9
    }
  },
  guardian: {
    id: 'guardian',
    name: 'Guardian Haze',
    description: 'Emits a protective aura that slows nearby pests',
    icon: Wind,
    color: 'from-blue-600 to-cyan-700',
    borderColor: 'border-blue-500',
    passive: {
      type: 'slow_aura',
      value: 0.4,
      radius: 3,
      description: 'Slows pests within 3m radius by 40%'
    },
    stats: {
      baseHealth: 100,
      pestResistance: 1.0,
      growthSpeed: 1.0
    }
  },
  bountiful: {
    id: 'bountiful',
    name: 'Bountiful Sativa',
    description: 'Generates bonus resources and attracts more power-ups',
    icon: Coins,
    color: 'from-yellow-600 to-amber-700',
    borderColor: 'border-yellow-500',
    passive: {
      type: 'resource_bonus',
      value: 0.5,
      description: '+50% Leaf currency and +25% power-up spawn rate'
    },
    stats: {
      baseHealth: 90,
      pestResistance: 0.9,
      growthSpeed: 1.2
    }
  },
  regenerative: {
    id: 'regenerative',
    name: 'Regenerative Indica',
    description: 'Slowly regenerates health over time',
    icon: Heart,
    color: 'from-pink-600 to-rose-700',
    borderColor: 'border-pink-500',
    passive: {
      type: 'health_regen',
      value: 0.5,
      description: 'Regenerates 0.5 HP per second'
    },
    stats: {
      baseHealth: 100,
      pestResistance: 1.0,
      growthSpeed: 1.1
    }
  },
  accelerated: {
    id: 'accelerated',
    name: 'Accelerated Hybrid',
    description: 'Grows rapidly and boosts spray effectiveness',
    icon: Zap,
    color: 'from-purple-600 to-violet-700',
    borderColor: 'border-purple-500',
    passive: {
      type: 'spray_boost',
      value: 0.25,
      description: '+25% spray damage and +20% growth speed'
    },
    stats: {
      baseHealth: 95,
      pestResistance: 1.0,
      growthSpeed: 1.3
    }
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno Strain',
    description: 'Burns pests that come too close',
    icon: Flame,
    color: 'from-red-600 to-orange-700',
    borderColor: 'border-red-500',
    passive: {
      type: 'damage_aura',
      value: 2,
      radius: 2.5,
      description: 'Deals 2 DPS to pests within 2.5m radius'
    },
    stats: {
      baseHealth: 85,
      pestResistance: 0.95,
      growthSpeed: 1.0
    }
  }
};

export default function PlantTypeSelector({ onSelectPlant, onClose }) {
  const [selectedPlant, setSelectedPlant] = useState(null);

  const handleConfirm = () => {
    if (selectedPlant && onSelectPlant) {
      onSelectPlant(PLANT_TYPES[selectedPlant]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent mb-4">
            Choose Your Plant
          </h1>
          <p className="text-gray-300 text-lg">Each plant has unique passive abilities that affect gameplay</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.values(PLANT_TYPES).map((plant) => {
            const Icon = plant.icon;
            const isSelected = selectedPlant === plant.id;

            return (
              <motion.div
                key={plant.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? `bg-gradient-to-br ${plant.color} border-4 ${plant.borderColor} shadow-2xl`
                      : 'bg-gray-800 border-2 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedPlant(plant.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-gray-700'}`}>
                        <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-gray-300'}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className={`text-xl ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                          {plant.name}
                        </CardTitle>
                      </div>
                    </div>
                    <p className={`text-sm ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>
                      {plant.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-lg ${isSelected ? 'bg-white/10' : 'bg-gray-900'}`}>
                        <div className="text-xs font-bold text-green-400 mb-1">PASSIVE ABILITY</div>
                        <div className={`text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {plant.passive.description}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2 rounded text-center ${isSelected ? 'bg-white/10' : 'bg-gray-900'}`}>
                          <div className="text-xs text-gray-400">Health</div>
                          <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {plant.stats.baseHealth}
                          </div>
                        </div>
                        <div className={`p-2 rounded text-center ${isSelected ? 'bg-white/10' : 'bg-gray-900'}`}>
                          <div className="text-xs text-gray-400">Resist</div>
                          <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {plant.stats.pestResistance}x
                          </div>
                        </div>
                        <div className={`p-2 rounded text-center ${isSelected ? 'bg-white/10' : 'bg-gray-900'}`}>
                          <div className="text-xs text-gray-400">Growth</div>
                          <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {plant.stats.growthSpeed}x
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white px-8"
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={!selectedPlant}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-12"
          >
            Start Game
          </Button>
        </div>
      </motion.div>
    </div>
  );
}