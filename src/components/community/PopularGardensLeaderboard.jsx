import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Eye, Star, Medal } from 'lucide-react';

export default function PopularGardensLeaderboard({ onVisitGarden }) {
  const { data: topGardens } = useQuery({
    queryKey: ['topGardens'],
    queryFn: async () => {
      return await base44.entities.CommunityGarden.filter(
        { is_public: true },
        '-popularity_score',
        10
      );
    },
    initialData: []
  });

  const getMedalIcon = (rank) => {
    if (rank === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-orange-400" />;
    return <span className="text-gray-400 font-bold">#{rank + 1}</span>;
  };

  return (
    <Card className="bg-black/40 backdrop-blur border-yellow-500/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Most Popular Gardens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topGardens.map((garden, idx) => (
          <div
            key={garden.id}
            className="bg-black/30 p-4 rounded-lg hover:bg-black/50 transition-all cursor-pointer"
            onClick={() => onVisitGarden && onVisitGarden(garden)}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {getMedalIcon(idx)}
              </div>
              
              <div className="flex-1">
                <div className="text-white font-bold">{garden.garden_name}</div>
                <div className="text-xs text-gray-400">by {garden.owner_name}</div>
                
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{Math.floor(garden.popularity_score / 100)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-cyan-400">
                    <Eye className="w-4 h-4" />
                    <span>{garden.visit_count || 0}</span>
                  </div>
                  
                  <Badge className="bg-green-600 text-xs">
                    {garden.aesthetic_theme}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}

        {topGardens.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No gardens yet. Be the first to create one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}