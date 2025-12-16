import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Beaker, Droplets, Zap, Shield, Clock, CheckCircle } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

const CRAFTING_RECIPES = [
  {
    id: 'toxic_spray',
    name: 'Spray Tossico',
    category: 'spray',
    icon: Droplets,
    description: 'Spray potenziato che infligge danno nel tempo',
    effect: { poison_damage: 5, duration: 10 },
    resources: { pest_essence: 5, toxic_leaf: 2 },
    crafting_time: 30,
    unlock_level: 3
  },
  {
    id: 'rapid_spray',
    name: 'Spray Rapido',
    category: 'spray',
    icon: Zap,
    description: 'Ricarica istantanea spray per 60 secondi',
    effect: { instant_refill: true, duration: 60 },
    resources: { pest_wings: 3, energy_crystal: 1 },
    crafting_time: 20,
    unlock_level: 5
  },
  {
    id: 'growth_booster',
    name: 'Booster Crescita',
    category: 'consumable',
    icon: Shield,
    description: 'Aumenta resistenza pianta +30% per 5 minuti',
    effect: { resistance_boost: 30, duration: 300 },
    resources: { special_leaf: 4, nutrient_drop: 2 },
    crafting_time: 45,
    unlock_level: 4
  },
  {
    id: 'pest_repellent',
    name: 'Repellente Universale',
    category: 'spray',
    icon: Shield,
    description: 'Rallenta tutti i parassiti del 50% per 2 minuti',
    effect: { slow_all: 0.5, duration: 120 },
    resources: { pest_essence: 8, rare_petal: 3 },
    crafting_time: 60,
    unlock_level: 6
  }
];

export default function Crafting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [craftingQueue, setCraftingQueue] = useState([]);

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const invList = await base44.entities.PlayerInventory.list();
      if (invList.length === 0) {
        return await base44.entities.PlayerInventory.create({
          resources: {
            pest_essence: 10,
            toxic_leaf: 5,
            pest_wings: 3,
            energy_crystal: 2,
            special_leaf: 6,
            nutrient_drop: 3,
            rare_petal: 4
          },
          crafted_items: {},
          active_spray: 'basic'
        });
      }
      return invList[0];
    }
  });

  const updateInventoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayerInventory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const handleCraft = async (recipe) => {
    if (!inventory || !progress) return;

    if (progress.current_level < recipe.unlock_level) {
      toast.error(`Sblocca al livello ${recipe.unlock_level}`);
      return;
    }

    const hasResources = Object.entries(recipe.resources).every(([res, qty]) => {
      return (inventory.resources[res] || 0) >= qty;
    });

    if (!hasResources) {
      toast.error('Risorse insufficienti!');
      return;
    }

    const newResources = { ...inventory.resources };
    Object.entries(recipe.resources).forEach(([res, qty]) => {
      newResources[res] = (newResources[res] || 0) - qty;
    });

    const newItems = { ...inventory.crafted_items };
    newItems[recipe.id] = (newItems[recipe.id] || 0) + 1;

    await updateInventoryMutation.mutateAsync({
      id: inventory.id,
      data: {
        ...inventory,
        resources: newResources,
        crafted_items: newItems
      }
    });

    setCraftingQueue([...craftingQueue, { recipe, startTime: Date.now() }]);
    toast.success(`Crafting ${recipe.name} avviato!`);

    setTimeout(() => {
      setCraftingQueue(q => q.filter(item => item.recipe.id !== recipe.id));
      toast.success(`${recipe.name} completato!`);
    }, recipe.crafting_time * 1000);
  };

  const canCraft = (recipe) => {
    if (!inventory || !progress) return false;
    if (progress.current_level < recipe.unlock_level) return false;
    return Object.entries(recipe.resources).every(([res, qty]) => {
      return (inventory.resources[res] || 0) >= qty;
    });
  };

  const availableRecipes = CRAFTING_RECIPES.filter(r => 
    !progress || progress.current_level >= r.unlock_level - 2
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Home'))}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Indietro
            </Button>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Beaker className="h-10 w-10 text-purple-400" />
              Crafting Lab
            </h1>
          </div>
        </div>

        {craftingQueue.length > 0 && (
          <Card className="mb-6 bg-black/50 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-400" />
                In Crafting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {craftingQueue.map((item, idx) => {
                  const elapsed = (Date.now() - item.startTime) / 1000;
                  const progress = (elapsed / item.recipe.crafting_time) * 100;
                  return (
                    <div key={idx} className="bg-purple-900/20 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold">{item.recipe.name}</span>
                        <span className="text-sm text-gray-400">
                          {Math.max(0, item.recipe.crafting_time - Math.floor(elapsed))}s
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 bg-black/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-white">Inventario Risorse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {inventory && Object.entries(inventory.resources).map(([res, qty]) => (
                <div key={res} className="bg-cyan-900/20 p-3 rounded-lg border border-cyan-500/20">
                  <div className="text-cyan-400 text-sm capitalize">{res.replace(/_/g, ' ')}</div>
                  <div className="text-white font-bold text-xl">{qty}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableRecipes.map(recipe => {
            const Icon = recipe.icon;
            const craftable = canCraft(recipe);
            const unlocked = !progress || progress.current_level >= recipe.unlock_level;
            const owned = inventory?.crafted_items?.[recipe.id] || 0;

            return (
              <Card key={recipe.id} className="bg-black/40 border-purple-500/30 hover:border-purple-500/60 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Icon className="h-5 w-5 text-purple-400" />
                      {recipe.name}
                    </CardTitle>
                    {owned > 0 && (
                      <Badge className="bg-green-600">x{owned}</Badge>
                    )}
                  </div>
                  {!unlocked && (
                    <Badge variant="outline" className="w-fit">
                      Livello {recipe.unlock_level}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-sm">{recipe.description}</p>

                  <div>
                    <div className="text-xs text-gray-400 mb-2">Risorse Richieste:</div>
                    <div className="space-y-1">
                      {Object.entries(recipe.resources).map(([res, qty]) => {
                        const has = inventory?.resources?.[res] || 0;
                        const enough = has >= qty;
                        return (
                          <div key={res} className="flex items-center justify-between text-sm">
                            <span className={enough ? 'text-green-400' : 'text-red-400'}>
                              {res.replace(/_/g, ' ')}
                            </span>
                            <span className={enough ? 'text-white' : 'text-red-400'}>
                              {has}/{qty}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{recipe.crafting_time}s crafting</span>
                  </div>

                  <Button
                    onClick={() => handleCraft(recipe)}
                    disabled={!craftable || !unlocked}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                  >
                    {!unlocked ? `Sblocca Liv. ${recipe.unlock_level}` : craftable ? 'Crafta' : 'Risorse Insufficienti'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}