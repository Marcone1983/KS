import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Zap, Target, Droplets, Clock, Timer, Snowflake, Flame, Leaf, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InGameUpgradePanel({ progress, onUpgrade, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('spray');

  const sprayUpgrades = [
    { id: 'spray_speed', name: 'Velocità', icon: Zap, maxLevel: 10, cost: 50, multiplier: 1.5 },
    { id: 'spray_radius', name: 'Raggio', icon: Target, maxLevel: 10, cost: 75, multiplier: 1.6 },
    { id: 'spray_potency', name: 'Potenza', icon: Droplets, maxLevel: 10, cost: 80, multiplier: 1.7 },
    { id: 'refill_speed', name: 'Ricarica', icon: Clock, maxLevel: 10, cost: 60, multiplier: 1.5 },
    { id: 'spray_duration', name: 'Durata', icon: Timer, maxLevel: 10, cost: 70, multiplier: 1.6 },
    { id: 'slow_effect', name: 'Gelo', icon: Snowflake, maxLevel: 5, cost: 150, multiplier: 2.0 },
    { id: 'area_damage', name: 'Area', icon: Flame, maxLevel: 5, cost: 180, multiplier: 2.2 }
  ];

  const plantUpgrades = [
    { id: 'resistance_bonus', name: 'Resistenza', icon: TrendingUp, stat: 'resistance_bonus', cost: 100 },
    { id: 'growth_speed', name: 'Crescita', icon: Leaf, stat: 'growth_level', cost: 120 }
  ];

  const getUpgradeCost = (upgrade) => {
    const currentLevel = progress?.upgrades?.[upgrade.id] || 1;
    return Math.floor(upgrade.cost * Math.pow(upgrade.multiplier, currentLevel - 1));
  };

  const canAfford = (cost) => (progress?.leaf_currency || 0) >= cost;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900/95 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              Potenziamenti Veloci
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                variant={selectedCategory === 'spray' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('spray')}
                className={selectedCategory === 'spray' ? 'bg-purple-600' : 'border-purple-400 text-white'}
                size="sm"
              >
                Spray
              </Button>
              <Button
                variant={selectedCategory === 'plant' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('plant')}
                className={selectedCategory === 'plant' ? 'bg-green-600' : 'border-green-400 text-white'}
                size="sm"
              >
                Pianta
              </Button>
            </div>

            <div className="mb-4 bg-black/40 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">I tuoi Leaf</span>
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-green-400" />
                  <span className="text-white font-bold text-lg">{progress?.leaf_currency || 0}</span>
                </div>
              </div>
            </div>

            {selectedCategory === 'spray' && (
              <div className="grid grid-cols-1 gap-3">
                {sprayUpgrades.map(upgrade => {
                  const currentLevel = progress?.upgrades?.[upgrade.id] || 1;
                  const cost = getUpgradeCost(upgrade);
                  const isMaxLevel = currentLevel >= upgrade.maxLevel;
                  const Icon = upgrade.icon;

                  return (
                    <div key={upgrade.id} className="bg-black/40 rounded-lg p-3 border border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-purple-400" />
                          <span className="text-white font-semibold text-sm">{upgrade.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Lv {currentLevel}/{upgrade.maxLevel}
                        </Badge>
                      </div>
                      
                      <Progress 
                        value={(currentLevel / upgrade.maxLevel) * 100} 
                        className="h-1 mb-2"
                      />

                      <Button
                        onClick={() => onUpgrade('spray', upgrade.id, cost)}
                        disabled={isMaxLevel || !canAfford(cost)}
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isMaxLevel ? 'MAX' : `Potenzia (${cost} Leaf)`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedCategory === 'plant' && (
              <div className="grid grid-cols-1 gap-3">
                {plantUpgrades.map(upgrade => {
                  const Icon = upgrade.icon;
                  const affordable = canAfford(upgrade.cost);

                  return (
                    <div key={upgrade.id} className="bg-black/40 rounded-lg p-3 border border-green-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-green-400" />
                          <span className="text-white font-semibold text-sm">{upgrade.name}</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => onUpgrade('plant', upgrade.stat, upgrade.cost)}
                        disabled={!affordable}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        Potenzia (+10%) - {upgrade.cost} Leaf
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}