import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sprout } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import GrowingSimulator3D from '../components/growing/GrowingSimulator3D';

export default function GrowingLab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      if (progressList.length === 0) {
        return await base44.entities.GameProgress.create({
          current_level: 1,
          total_score: 0,
          high_score: 0,
          has_premium: false,
          unlocked_skins: ['default'],
          active_skin: 'default',
          upgrades: {
            spray_speed: 1,
            spray_radius: 1,
            spray_potency: 1,
            refill_speed: 1,
            spray_duration: 1,
            slow_effect: 0,
            area_damage: 0
          },
          plant_stats: {
            growth_level: 1,
            nutrition_level: 100,
            light_exposure: 50,
            water_level: 100,
            pruned_leaves: 0,
            resistance_bonus: 0
          },
          day_night_cycle: {
            current_hour: 12,
            cycle_speed: 1
          },
          pests_encountered: [],
          leaf_currency: 0
        });
      }
      return progressList[0];
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const handleEnvironmentChange = async (environment) => {
    if (!progress) return;

    const updatedPlantStats = {
      ...progress.plant_stats,
      water_level: environment.water,
      light_exposure: environment.light,
      nutrition_level: environment.nutrients
    };

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: {
        ...progress,
        plant_stats: updatedPlantStats
      }
    });
  };

  const handleGrowthUpdate = async (growthStage) => {
    if (!progress) return;

    const updatedPlantStats = {
      ...progress.plant_stats,
      growth_level: growthStage * 10
    };

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: {
        ...progress,
        plant_stats: updatedPlantStats
      }
    });

    toast.success(`Pianta cresciuta al ${Math.round(growthStage * 100)}%!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      <div className="absolute top-6 left-6 z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Shop'))}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Indietro
        </Button>
      </div>

      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-3 bg-black/50 backdrop-blur rounded-lg px-6 py-3">
          <Sprout className="h-6 w-6 text-green-400" />
          <h1 className="text-2xl font-bold text-white">Growing Simulator 3D</h1>
        </div>
      </div>

      <GrowingSimulator3D
        initialGrowthStage={((progress?.plant_stats?.growth_level || 1) / 10)}
        initialEnvironment={{
          water: progress?.plant_stats?.water_level || 100,
          light: progress?.plant_stats?.light_exposure || 50,
          temperature: 24,
          humidity: 65,
          nutrients: progress?.plant_stats?.nutrition_level || 100
        }}
        onEnvironmentChange={handleEnvironmentChange}
        onGrowthUpdate={handleGrowthUpdate}
      />
    </div>
  );
}
