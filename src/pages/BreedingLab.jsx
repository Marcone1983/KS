import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Dna, Beaker, Sparkles, TrendingUp, Leaf, Award, Lock, Loader2 } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import AdvancedGeneticsSystem, { GeneticTraitBadge, GENETIC_TRAITS } from '../components/genetics/AdvancedGeneticsSystem';
import { motion } from 'framer-motion';

export default function BreedingLab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [parent1, setParent1] = useState(null);
  const [parent2, setParent2] = useState(null);
  const [selectedTab, setSelectedTab] = useState('breeding');
  const [breeding, setBreeding] = useState(false);
  const [predictedOffspring, setPredictedOffspring] = useState(null);

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: allSeeds } = useQuery({
    queryKey: ['seeds'],
    queryFn: () => base44.entities.Seed.list(),
    initialData: []
  });

  const { data: breedingHistory } = useQuery({
    queryKey: ['breedingCombinations'],
    queryFn: () => base44.entities.BreedingCombination.list('-created_date', 20),
    initialData: []
  });

  const createSeedMutation = useMutation({
    mutationFn: (seedData) => base44.entities.Seed.create(seedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeds'] });
    }
  });

  const createBreedingRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.BreedingCombination.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breedingCombinations'] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const handleBreedPlants = async () => {
    if (!parent1 || !parent2 || !progress) return;

    setBreeding(true);

    try {
      const response = await base44.functions.invoke('breedPlants', {
        parent1,
        parent2,
        playerLevel: progression?.player_level || 1,
        researchBonuses: progress?.research_bonuses || {}
      });

      if (response.data?.success) {
        setPredictedOffspring(response.data.offspring);
        toast.success('Breeding complete! Review your new plant.');
      } else {
        toast.error('Breeding failed');
      }
    } catch (error) {
      toast.error('Breeding error: ' + error.message);
    } finally {
      setBreeding(false);
    }
  };

  const handleConfirmBreeding = async () => {
    if (!progress || !predictedOffspring) return;
    
    const breedingCost = 150;
    
    if ((progress.leaf_currency || 0) < breedingCost) {
      toast.error('Not enough Leaf for breeding!');
      return;
    }

    try {
      const offspring = predictedOffspring;

      const newSeed = await createSeedMutation.mutateAsync({
        strain_name: offspring.strain_name,
        price: offspring.rarity === 'mythic' ? 1000 : 
               offspring.rarity === 'legendary' ? 500 : 
               offspring.rarity === 'rare' ? 250 : 100,
        growth_speed: offspring.genes.growth_speed || 1.0,
        pest_resistance: offspring.genes.pest_resistance || 0,
        water_efficiency: offspring.genes.water_efficiency || 1.0,
        max_health_bonus: offspring.genes.yield_potential ? offspring.genes.yield_potential * 0.2 : 0,
        rarity: offspring.rarity,
        description: `Hybrid strain with ${offspring.rarity} genetics`,
        genetics: offspring.genes
      });

    await createBreedingRecordMutation.mutateAsync({
      parent_seed_1: parent1.id,
      parent_seed_2: parent2.id,
      offspring_strain: offspring.strain_name,
      growth_speed: offspring.genes.growth_speed,
      pest_resistance: offspring.genes.pest_resistance,
      water_efficiency: offspring.genes.water_efficiency,
      max_health_bonus: offspring.genes.yield_potential * 0.2,
      rarity: offspring.rarity,
      breeding_time: 300,
      breeding_cost: breedingCost,
      unlocked: true,
      times_bred: 1,
      success_rate: 1.0,
      genetic_traits: Object.keys(offspring.genes)
    });

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: {
        ...progress,
        leaf_currency: progress.leaf_currency - breedingCost,
        unlocked_seeds: [...(progress.unlocked_seeds || []), newSeed.id]
      }
    });

      toast.success(`🧬 New strain "${offspring.strain_name}" added to your collection!`);
      setParent1(null);
      setParent2(null);
      setPredictedOffspring(null);
    } catch (error) {
      console.error('Breeding error:', error);
      toast.error('Failed to complete breeding');
    }
  };

  const unlockedSeeds = allSeeds.filter(s => progress?.unlocked_seeds?.includes(s.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4 md:p-6 w-full overflow-x-hidden">
      <div className="max-w-full md:max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4 w-full">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Shop'))}
              className="text-white hover:bg-white/10"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
              <span className="hidden md:inline">Back</span>
            </Button>
            <Dna className="w-8 h-8 md:w-12 md:h-12 text-purple-400" />
            <h1 className="text-2xl md:text-5xl font-black text-white">Breeding Lab</h1>
          </div>

          <div className="bg-black/50 backdrop-blur rounded-lg px-4 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-3">
            <Leaf className="h-5 w-5 md:h-6 md:w-6 text-green-400" />
            <div>
              <div className="text-xs md:text-sm text-gray-400">Leaf</div>
              <div className="text-lg md:text-2xl font-bold text-white">{progress?.leaf_currency || 0}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 md:gap-3 mb-4 md:mb-6 flex-wrap">
          <Button
            onClick={() => setSelectedTab('breeding')}
            variant={selectedTab === 'breeding' ? 'default' : 'outline'}
            className={selectedTab === 'breeding' ? 'bg-purple-600' : 'border-purple-600 text-white text-xs md:text-sm'}
            size="sm"
          >
            <Beaker className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Breeding</span>
          </Button>
          <Button
            onClick={() => setSelectedTab('history')}
            variant={selectedTab === 'history' ? 'default' : 'outline'}
            className={selectedTab === 'history' ? 'bg-cyan-600' : 'border-cyan-600 text-white text-xs md:text-sm'}
            size="sm"
          >
            <Award className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>

        {selectedTab === 'breeding' && (
          <div className="space-y-4 md:space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
              <Card className="bg-black/40 backdrop-blur border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <span className="text-2xl">🧬</span>
                    Parent 1
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parent1 ? (
                    <div className="space-y-3">
                      <div className="text-xl font-bold text-white">{parent1.strain_name}</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(GENETIC_TRAITS).map(trait => {
                          const value = parent1[trait] || parent1.genes?.[trait];
                          if (!value) return null;
                          return <GeneticTraitBadge key={trait} trait={trait} value={value} />;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setParent1(null)}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {unlockedSeeds.map(seed => (
                        <button
                          key={seed.id}
                          onClick={() => setParent1(seed)}
                          className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-left transition-all"
                        >
                          <div className="text-white font-bold">{seed.strain_name}</div>
                          <div className="text-xs text-gray-400">{seed.rarity}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-black/40 backdrop-blur border-pink-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <span className="text-2xl">🧬</span>
                    Parent 2
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parent2 ? (
                    <div className="space-y-3">
                      <div className="text-xl font-bold text-white">{parent2.strain_name}</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(GENETIC_TRAITS).map(trait => {
                          const value = parent2[trait] || parent2.genes?.[trait];
                          if (!value) return null;
                          return <GeneticTraitBadge key={trait} trait={trait} value={value} />;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setParent2(null)}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {unlockedSeeds.filter(s => s.id !== parent1?.id).map(seed => (
                        <button
                          key={seed.id}
                          onClick={() => setParent2(seed)}
                          className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-left transition-all"
                        >
                          <div className="text-white font-bold">{seed.strain_name}</div>
                          <div className="text-xs text-gray-400">{seed.rarity}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {parent1 && parent2 && !predictedOffspring && (
              <Card className="bg-black/40 backdrop-blur border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Beaker className="w-6 h-6 text-purple-400" />
                    Ready to Breed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Parent 1</div>
                        <div className="text-white font-bold">{parent1.strain_name}</div>
                        <div className="text-xs text-purple-400">{parent1.rarity}</div>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Parent 2</div>
                        <div className="text-white font-bold">{parent2.strain_name}</div>
                        <div className="text-xs text-pink-400">{parent2.rarity}</div>
                      </div>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                      <div className="text-sm text-yellow-200">
                        <div className="font-bold mb-2">Breeding Cost: 150 Leaf</div>
                        <div className="text-xs">The AI will analyze both parents and generate a unique offspring with combined traits.</div>
                      </div>
                    </div>

                    <Button
                      onClick={handleBreedPlants}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      disabled={breeding || (progress?.leaf_currency || 0) < 150}
                    >
                      {breeding ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Breeding in Progress...
                        </>
                      ) : (
                        <>
                          <Dna className="w-4 h-4 mr-2" />
                          Start AI Breeding
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {predictedOffspring && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-yellow-400" />
                      New Strain Discovered!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-black text-white mb-2">{predictedOffspring.strain_name}</div>
                      <Badge className={`${
                        predictedOffspring.rarity === 'mythic' ? 'bg-purple-600' :
                        predictedOffspring.rarity === 'legendary' ? 'bg-yellow-600' :
                        predictedOffspring.rarity === 'rare' ? 'bg-blue-600' :
                        'bg-gray-600'
                      } text-lg px-4 py-1`}>
                        {predictedOffspring.rarity?.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="bg-black/30 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Growth Speed:</span>
                        <span className="text-green-400 font-bold">×{predictedOffspring.genes.growth_speed?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Pest Resistance:</span>
                        <span className="text-purple-400 font-bold">+{predictedOffspring.genes.pest_resistance?.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Water Efficiency:</span>
                        <span className="text-cyan-400 font-bold">×{predictedOffspring.genes.water_efficiency?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Yield Potential:</span>
                        <span className="text-yellow-400 font-bold">+{predictedOffspring.genes.yield_potential?.toFixed(0)}</span>
                      </div>
                      {predictedOffspring.genes.special_trait && (
                        <div className="pt-2 border-t border-white/10">
                          <div className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 font-bold">Special Trait: {predictedOffspring.genes.special_trait}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => {
                          setPredictedOffspring(null);
                          setParent1(null);
                          setParent2(null);
                        }}
                        variant="outline"
                        className="border-gray-500"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConfirmBreeding}
                        className="bg-gradient-to-r from-green-600 to-emerald-600"
                      >
                        <Leaf className="w-4 h-4 mr-2" />
                        Confirm (150 Leaf)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {selectedTab === 'history' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full">
            {breedingHistory.map((record) => (
              <Card key={record.id} className="bg-black/40 backdrop-blur border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white text-lg">{record.offspring_strain}</CardTitle>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    record.rarity === 'mythic' ? 'bg-purple-600' :
                    record.rarity === 'legendary' ? 'bg-yellow-600' :
                    record.rarity === 'rare' ? 'bg-blue-600' :
                    'bg-gray-600'
                  }`}>
                    {record.rarity}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-300">
                  <div>Growth Speed: <span className="text-green-400 font-bold">x{record.growth_speed?.toFixed(1)}</span></div>
                  <div>Pest Resistance: <span className="text-purple-400 font-bold">+{record.pest_resistance?.toFixed(0)}%</span></div>
                  <div>Water Efficiency: <span className="text-cyan-400 font-bold">x{record.water_efficiency?.toFixed(1)}</span></div>
                  <div className="text-xs text-gray-500 pt-2">Bred {record.times_bred} times</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}