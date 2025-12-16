import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Sprout, Dna, Clock, Leaf, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Breeding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedParent1, setSelectedParent1] = useState(null);
  const [selectedParent2, setSelectedParent2] = useState(null);
  const [activeBreeding, setActiveBreeding] = useState(null);

  const { data: allSeeds } = useQuery({
    queryKey: ['seeds'],
    queryFn: () => base44.entities.Seed.list(),
    initialData: []
  });

  const { data: breedingCombinations } = useQuery({
    queryKey: ['breedingCombinations'],
    queryFn: () => base44.entities.BreedingCombination.list(),
    initialData: []
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const unlockedSeeds = progress?.unlocked_seeds || ['basic_strain'];
  const availableSeeds = allSeeds.filter(s => unlockedSeeds.includes(s.id));

  const calculateOffspring = (seed1, seed2) => {
    if (!seed1 || !seed2) return null;

    const hybridVigor = 1.0 + Math.random() * 0.3;
    const rarityBonus = Math.random() * 10;

    const offspring = {
      growth_speed: ((seed1.growth_speed + seed2.growth_speed) / 2) * hybridVigor,
      pest_resistance: Math.max(seed1.pest_resistance, seed2.pest_resistance) * 0.9 + rarityBonus,
      water_efficiency: (seed1.water_efficiency + seed2.water_efficiency) / 2,
      max_health_bonus: (seed1.max_health_bonus + seed2.max_health_bonus) / 2
    };

    const rarityTiers = { common: 0, rare: 1, legendary: 2 };
    const avgTier = (rarityTiers[seed1.rarity] + rarityTiers[seed2.rarity]) / 2;
    
    let resultRarity = 'common';
    if (avgTier >= 1.5) resultRarity = 'legendary';
    else if (avgTier >= 0.7) resultRarity = 'rare';

    const baseCost = 200;
    const cost = Math.floor(baseCost * (1 + avgTier));

    const baseTime = 300;
    const rarityMult = { common: 1.0, rare: 1.5, legendary: 2.0 }[resultRarity];
    const breedingTime = baseTime * rarityMult;

    const baseRate = 0.8;
    const rarityPenalty = { common: 0, rare: -0.1, legendary: -0.2 }[resultRarity];
    const successRate = baseRate + rarityPenalty;

    return {
      ...offspring,
      rarity: resultRarity,
      cost,
      breedingTime,
      successRate,
      strainName: `${seed1.strain_name.split(' ')[0]} x ${seed2.strain_name.split(' ')[0]}`
    };
  };

  const previewOffspring = calculateOffspring(
    availableSeeds.find(s => s.id === selectedParent1),
    availableSeeds.find(s => s.id === selectedParent2)
  );

  const startBreeding = async () => {
    if (!selectedParent1 || !selectedParent2 || !previewOffspring) {
      toast.error('Seleziona due semi per iniziare il breeding');
      return;
    }

    if (progress.leaf_currency < previewOffspring.cost) {
      toast.error('Leaf insufficienti!');
      return;
    }

    const existingCombo = breedingCombinations.find(
      c => (c.parent_seed_1 === selectedParent1 && c.parent_seed_2 === selectedParent2) ||
           (c.parent_seed_1 === selectedParent2 && c.parent_seed_2 === selectedParent1)
    );

    if (existingCombo) {
      toast.info('Questa combinazione esiste già!');
      return;
    }

    const breedingData = {
      parent_seed_1: selectedParent1,
      parent_seed_2: selectedParent2,
      offspring_strain: previewOffspring.strainName,
      growth_speed: previewOffspring.growth_speed,
      pest_resistance: previewOffspring.pest_resistance,
      water_efficiency: previewOffspring.water_efficiency,
      max_health_bonus: previewOffspring.max_health_bonus,
      rarity: previewOffspring.rarity,
      breeding_time: previewOffspring.breedingTime,
      breeding_cost: previewOffspring.cost,
      success_rate: previewOffspring.successRate,
      unlocked: true,
      times_bred: 1
    };

    try {
      await base44.entities.BreedingCombination.create(breedingData);
      
      await base44.entities.GameProgress.update(progress.id, {
        ...progress,
        leaf_currency: progress.leaf_currency - previewOffspring.cost
      });

      setActiveBreeding({
        ...breedingData,
        startTime: Date.now(),
        endTime: Date.now() + previewOffspring.breedingTime * 1000
      });

      toast.success('Breeding iniziato!');
      queryClient.invalidateQueries(['breedingCombinations']);
      queryClient.invalidateQueries(['gameProgress']);

      setTimeout(async () => {
        if (Math.random() <= previewOffspring.successRate) {
          const newSeed = {
            id: `hybrid_${Date.now()}`,
            strain_name: previewOffspring.strainName,
            price: previewOffspring.cost * 2,
            growth_speed: previewOffspring.growth_speed,
            pest_resistance: previewOffspring.pest_resistance,
            water_efficiency: previewOffspring.water_efficiency,
            max_health_bonus: previewOffspring.max_health_bonus,
            rarity: previewOffspring.rarity,
            description: `Ibrido generato da breeding di ${availableSeeds.find(s => s.id === selectedParent1)?.strain_name} e ${availableSeeds.find(s => s.id === selectedParent2)?.strain_name}`
          };

          await base44.entities.Seed.create(newSeed);
          
          await base44.entities.GameProgress.update(progress.id, {
            ...progress,
            unlocked_seeds: [...unlockedSeeds, newSeed.id]
          });

          toast.success(`Breeding completato! Creato: ${newSeed.strain_name}`);
          queryClient.invalidateQueries(['seeds']);
          queryClient.invalidateQueries(['gameProgress']);
        } else {
          toast.error('Breeding fallito. Riprova!');
        }
        
        setActiveBreeding(null);
        setSelectedParent1(null);
        setSelectedParent2(null);
      }, previewOffspring.breedingTime * 1000);

    } catch (error) {
      toast.error('Errore durante il breeding');
      console.error(error);
    }
  };

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'legendary': return 'text-yellow-400 border-yellow-400';
      case 'rare': return 'text-blue-400 border-blue-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Shop'))}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Indietro
          </Button>
          <Dna className="h-8 w-8 text-purple-400" />
          <h1 className="text-4xl font-bold text-white">Sistema Breeding</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-black/40 backdrop-blur border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-400" />
                Genitore 1
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableSeeds.map(seed => (
                  <Card
                    key={seed.id}
                    className={`cursor-pointer transition-all ${
                      selectedParent1 === seed.id
                        ? 'bg-purple-900/50 border-purple-400'
                        : 'bg-gray-900/50 border-gray-700 hover:border-purple-400/50'
                    }`}
                    onClick={() => setSelectedParent1(seed.id)}
                  >
                    <CardContent className="p-3">
                      <div className="font-semibold text-white text-sm mb-1">{seed.strain_name}</div>
                      <Badge variant="outline" className={`text-xs ${getRarityColor(seed.rarity)}`}>
                        {seed.rarity.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white text-center">
                <ArrowRight className="h-8 w-8 text-purple-400 mx-auto" />
                Risultato Previsto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewOffspring ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white mb-2">{previewOffspring.strainName}</div>
                    <Badge variant="outline" className={`${getRarityColor(previewOffspring.rarity)}`}>
                      {previewOffspring.rarity.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Crescita:</span>
                      <span className="text-green-400">x{previewOffspring.growth_speed.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Resistenza:</span>
                      <span className="text-purple-400">+{Math.round(previewOffspring.pest_resistance)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Efficienza H₂O:</span>
                      <span className="text-cyan-400">+{Math.round(previewOffspring.water_efficiency * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Salute Max:</span>
                      <span className="text-red-400">+{Math.round(previewOffspring.max_health_bonus)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Costo:</span>
                      <span className="text-yellow-400">{previewOffspring.cost} Leaf</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Tempo:</span>
                      <span className="text-white">{Math.round(previewOffspring.breedingTime / 60)}m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Successo:</span>
                      <span className="text-white">{Math.round(previewOffspring.successRate * 100)}%</span>
                    </div>
                  </div>

                  <Button
                    onClick={startBreeding}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                    disabled={activeBreeding !== null}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Inizia Breeding
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dna className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Seleziona due semi per vedere il risultato</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-400" />
                Genitore 2
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableSeeds.map(seed => (
                  <Card
                    key={seed.id}
                    className={`cursor-pointer transition-all ${
                      selectedParent2 === seed.id
                        ? 'bg-purple-900/50 border-purple-400'
                        : 'bg-gray-900/50 border-gray-700 hover:border-purple-400/50'
                    }`}
                    onClick={() => setSelectedParent2(seed.id)}
                  >
                    <CardContent className="p-3">
                      <div className="font-semibold text-white text-sm mb-1">{seed.strain_name}</div>
                      <Badge variant="outline" className={`text-xs ${getRarityColor(seed.rarity)}`}>
                        {seed.rarity.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {activeBreeding && (
          <Card className="bg-purple-900/30 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 animate-spin" />
                Breeding in Corso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-white font-semibold">{activeBreeding.offspring_strain}</div>
                <Progress 
                  value={((Date.now() - activeBreeding.startTime) / (activeBreeding.endTime - activeBreeding.startTime)) * 100}
                  className="h-2"
                />
                <p className="text-sm text-gray-400">
                  Tempo rimasto: {Math.max(0, Math.round((activeBreeding.endTime - Date.now()) / 1000))}s
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-black/40 backdrop-blur border-purple-500/30 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Combinazioni Completate</CardTitle>
          </CardHeader>
          <CardContent>
            {breedingCombinations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {breedingCombinations.map((combo, idx) => (
                  <Card key={idx} className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="font-semibold text-white mb-2">{combo.offspring_strain}</div>
                      <Badge variant="outline" className={`mb-3 ${getRarityColor(combo.rarity)}`}>
                        {combo.rarity}
                      </Badge>
                      <div className="text-xs text-gray-400">
                        Creato {combo.times_bred} {combo.times_bred === 1 ? 'volta' : 'volte'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Nessuna combinazione completata ancora</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}