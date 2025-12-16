import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GrowingSimulator3D from '../components/growing/GrowingSimulator3D';

export default function GrowingLab() {
  const queryClient = useQueryClient();

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: activeSeed } = useQuery({
    queryKey: ['activeSeed', progress?.active_seed],
    queryFn: async () => {
      if (!progress?.active_seed) return null;
      const seeds = await base44.entities.Seed.filter({ id: progress.active_seed });
      return seeds.length > 0 ? seeds[0] : null;
    },
    enabled: !!progress?.active_seed
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const handleUpdate = (updates) => {
    if (progress) {
      updateProgressMutation.mutate({
        id: progress.id,
        data: {
          ...progress,
          ...updates
        }
      });
    }
  };

  if (!progress) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <GrowingSimulator3D
      progress={progress}
      activeSeed={activeSeed}
      onUpdate={handleUpdate}
    />
  );
}