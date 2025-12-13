import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Droplets, Sun, Scissors, Sprout, Leaf as LeafIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const NUTRIENTS = [
  { 
    id: 'basic_fertilizer', 
    name: 'Fertilizzante Base', 
    cost: 50, 
    nutrition: 30,
    icon: Sprout,
    description: 'Aumenta nutrizione +30',
    type: 'consumable'
  },
  { 
    id: 'advanced_fertilizer', 
    name: 'Fertilizzante Avanzato', 
    cost: 120, 
    nutrition: 50,
    resistance: 5,
    icon: Sparkles,
    description: 'Nutrizione +50, Resistenza +5%',
    type: 'temporary',
    duration: 180
  },
  { 
    id: 'super_fertilizer', 
    name: 'Super Fertilizzante', 
    cost: 250, 
    nutrition: 100,
    resistance: 15,
    growth: 1,
    icon: Sparkles,
    description: 'Nutrizione FULL, Resistenza +15%, Crescita +1',
    type: 'permanent'
  },
  {
    id: 'growth_booster',
    name: 'Booster Crescita',
    cost: 150,
    growth: 0.5,
    icon: Sparkles,
    description: 'Accelera crescita +0.5 livelli',
    type: 'consumable'
  },
  {
    id: 'pest_repellent',
    name: 'Repellente Naturale',
    cost: 180,
    resistance: 10,
    icon: Sparkles,
    description: 'Resistenza permanente +10%',
    type: 'permanent'
  }
];

export default function PlantCarePanel({ progress, onUpdate }) {
  const [processing, setProcessing] = useState(false);

  const handleWater = async () => {
    if (processing) return;
    if (progress.plant_stats.water_level >= 100) {
      toast.info('La pianta è già ben idratata');
      return;
    }

    setProcessing(true);
    const newWaterLevel = Math.min(100, progress.plant_stats.water_level + 50);
    await onUpdate({
      ...progress,
      plant_stats: {
        ...progress.plant_stats,
        water_level: newWaterLevel
      }
    });
    toast.success('Pianta annaffiata!');
    setProcessing(false);
  };

  const handleLightAdjust = async (adjustment) => {
    if (processing) return;
    setProcessing(true);
    const newExposure = Math.max(0, Math.min(100, progress.plant_stats.light_exposure + adjustment));
    await onUpdate({
      ...progress,
      plant_stats: {
        ...progress.plant_stats,
        light_exposure: newExposure
      }
    });
    toast.success(`Esposizione alla luce: ${newExposure}%`);
    setProcessing(false);
  };

  const handlePrune = async () => {
    if (processing) return;
    if (progress.leaf_currency < 30) {
      toast.error('Servono 30 Leaf per potare');
      return;
    }

    setProcessing(true);
    const resistanceGain = 2;
    await onUpdate({
      ...progress,
      leaf_currency: progress.leaf_currency - 30,
      plant_stats: {
        ...progress.plant_stats,
        pruned_leaves: progress.plant_stats.pruned_leaves + 1,
        resistance_bonus: progress.plant_stats.resistance_bonus + resistanceGain
      }
    });
    toast.success(`Potatura effettuata! Resistenza +${resistanceGain}%`);
    setProcessing(false);
  };

  const handleBuyNutrient = async (nutrient) => {
    if (processing) return;
    if (progress.leaf_currency < nutrient.cost) {
      toast.error('Leaf insufficienti!');
      return;
    }

    setProcessing(true);
    const newNutrition = Math.min(100, progress.plant_stats.nutrition_level + (nutrient.nutrition || 0));
    const newGrowth = progress.plant_stats.growth_level + (nutrient.growth || 0);

    const updates = {
      ...progress,
      leaf_currency: progress.leaf_currency - nutrient.cost,
      plant_stats: {
        ...progress.plant_stats,
        nutrition_level: newNutrition,
        growth_level: newGrowth
      }
    };

    if (nutrient.type === 'permanent') {
      updates.plant_stats.resistance_bonus = progress.plant_stats.resistance_bonus + (nutrient.resistance || 0);
      toast.success(`${nutrient.name} applicato! Effetto permanente.`);
    } else if (nutrient.type === 'temporary') {
      const tempBuffs = progress.plant_stats.temporary_buffs || [];
      tempBuffs.push({
        type: 'resistance',
        value: nutrient.resistance,
        expiresAt: Date.now() + (nutrient.duration * 1000)
      });
      updates.plant_stats.temporary_buffs = tempBuffs;
      toast.success(`${nutrient.name} applicato! Dura ${nutrient.duration}s.`);
    } else {
      toast.success(`${nutrient.name} applicato!`);
    }

    await onUpdate(updates);
    setProcessing(false);
  };

  const plantStats = progress?.plant_stats || {};
  const activeBuffs = (plantStats.temporary_buffs || []).filter(buff => buff.expiresAt > Date.now());
  const tempResistance = activeBuffs.reduce((sum, buff) => sum + (buff.type === 'resistance' ? buff.value : 0), 0);

  if (!progress || !progress.plant_stats) {
    return <div className="text-white text-center p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/40 backdrop-blur border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sprout className="h-6 w-6 text-green-400" />
            Stato Pianta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Livello Crescita</span>
              <span className="text-white font-bold">{plantStats.growth_level}</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Nutrizione</span>
              <span className="text-white font-bold">{plantStats.nutrition_level}%</span>
            </div>
            <Progress 
              value={plantStats.nutrition_level} 
              className="h-2 bg-gray-700"
              indicatorClassName={
                plantStats.nutrition_level > 70 ? "bg-green-500" :
                plantStats.nutrition_level > 30 ? "bg-yellow-500" : "bg-red-500"
              }
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Idratazione</span>
              <span className="text-white font-bold">{plantStats.water_level}%</span>
            </div>
            <Progress 
              value={plantStats.water_level} 
              className="h-2 bg-gray-700"
              indicatorClassName="bg-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Esposizione Luce</span>
              <span className="text-white font-bold">{plantStats.light_exposure}%</span>
            </div>
            <Progress 
              value={plantStats.light_exposure} 
              className="h-2 bg-gray-700"
              indicatorClassName="bg-yellow-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Resistenza Parassiti</span>
              <span className="text-white font-bold">
                +{plantStats.resistance_bonus}%
                {tempResistance > 0 && (
                  <span className="text-cyan-400 ml-2">(+{tempResistance}% temp)</span>
                )}
              </span>
            </div>
          </div>

          {activeBuffs.length > 0 && (
            <div className="mt-3 p-3 bg-cyan-900/30 rounded border border-cyan-500/30">
              <div className="text-xs text-cyan-400 font-semibold mb-2">Buff Attivi:</div>
              {activeBuffs.map((buff, idx) => {
                const remainingTime = Math.ceil((buff.expiresAt - Date.now()) / 1000);
                return (
                  <div key={idx} className="text-xs text-gray-300">
                    • Resistenza +{buff.value}% ({remainingTime}s rimasti)
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-sm text-gray-400">
            Foglie potate: {plantStats.pruned_leaves}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/40 backdrop-blur border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-400" />
            Azioni Rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={handleWater}
            disabled={processing || plantStats.water_level >= 100}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Droplets className="h-4 w-4 mr-2" />
            Annaffia (Gratis)
          </Button>

          <div className="flex gap-2">
            <Button 
              onClick={() => handleLightAdjust(10)}
              disabled={processing}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              size="sm"
            >
              <Sun className="h-4 w-4 mr-1" />
              + Luce
            </Button>
            <Button 
              onClick={() => handleLightAdjust(-10)}
              disabled={processing}
              className="flex-1 bg-gray-600 hover:bg-gray-700"
              size="sm"
            >
              - Luce
            </Button>
          </div>

          <Button 
            onClick={handlePrune}
            disabled={processing || progress.leaf_currency < 30}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Scissors className="h-4 w-4 mr-2" />
            Pota Foglie (30 Leaf)
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-black/40 backdrop-blur border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <LeafIcon className="h-6 w-6 text-green-400" />
            Nutrienti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {NUTRIENTS.map(nutrient => {
            const Icon = nutrient.icon;
            const canAfford = progress.leaf_currency >= nutrient.cost;
            
            return (
              <Card key={nutrient.id} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-green-400" />
                      <span className="text-white font-semibold">{nutrient.name}</span>
                    </div>
                    <span className="text-green-400 font-bold">{nutrient.cost} Leaf</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{nutrient.description}</p>
                  <Button 
                    onClick={() => handleBuyNutrient(nutrient)}
                    disabled={processing || !canAfford}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="sm"
                  >
                    {canAfford ? 'Acquista' : 'Leaf Insufficienti'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}