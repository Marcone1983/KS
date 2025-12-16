import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Eye, TrendingUp, Sprout, Trophy, MessageCircle, Share2 } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function CommunityHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: communityGardens } = useQuery({
    queryKey: ['communityGardens', searchQuery],
    queryFn: async () => {
      const query = searchQuery 
        ? { garden_name: { $regex: searchQuery, $options: 'i' }, is_public: true }
        : { is_public: true };
      return await base44.entities.CommunityGarden.filter(query, '-popularity_score', 50);
    },
    initialData: []
  });

  const { data: myGarden } = useQuery({
    queryKey: ['myGarden'],
    queryFn: async () => {
      if (!currentUser) return null;
      const gardens = await base44.entities.CommunityGarden.filter({ owner_email: currentUser.email });
      return gardens.length > 0 ? gardens[0] : null;
    },
    enabled: !!currentUser
  });

  const { data: pendingTrades } = useQuery({
    queryKey: ['pendingTrades'],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.SeedTrade.filter({
        to_player_email: currentUser.email,
        trade_status: 'pending'
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createGardenMutation = useMutation({
    mutationFn: (gardenData) => base44.entities.CommunityGarden.create(gardenData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGarden'] });
      toast.success('Giardino creato!');
    }
  });

  const visitGardenMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunityGarden.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityGardens'] });
    }
  });

  const handleVisitGarden = async (garden) => {
    setSelectedGarden(garden);
    
    await visitGardenMutation.mutateAsync({
      id: garden.id,
      data: {
        ...garden,
        visit_count: (garden.visit_count || 0) + 1
      }
    });
  };

  const handleCreateGarden = async () => {
    if (!currentUser || myGarden) return;

    const { data: progress } = await queryClient.fetchQuery({
      queryKey: ['gameProgress'],
      queryFn: async () => {
        const progressList = await base44.entities.GameProgress.list();
        return progressList.length > 0 ? progressList[0] : null;
      }
    });

    await createGardenMutation.mutateAsync({
      owner_email: currentUser.email,
      owner_name: currentUser.full_name || currentUser.email,
      garden_name: `${currentUser.full_name}'s Garden`,
      description: 'Il mio giardino personale',
      showcase_strain: progress?.active_seed || 'basic_strain',
      showcase_stats: {
        growth_level: progress?.plant_stats?.growth_level || 1,
        health: 100
      },
      aesthetic_theme: 'forest',
      active_pot_skin: progress?.active_pot || 'classic',
      active_plant_skin: 'default',
      best_score: progress?.high_score || 0,
      is_public: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-800 to-cyan-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Home'))}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Home
            </Button>
            <Users className="h-8 w-8 text-white" />
            <h1 className="text-4xl font-bold text-white">Community Hub</h1>
          </div>

          {!myGarden && currentUser && (
            <Button
              onClick={handleCreateGarden}
              className="bg-green-600 hover:bg-green-700"
            >
              <Sprout className="h-5 w-5 mr-2" />
              Create My Garden
            </Button>
          )}
        </div>

        {myGarden && (
          <Card className="mb-8 bg-black/40 backdrop-blur border-green-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Il Tuo Giardino</span>
                <Button
                  onClick={() => navigate(createPageUrl('GardenCustomization'))}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Customize
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-white">
                <div>
                  <div className="text-sm text-gray-400">Visite</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    {myGarden.visit_count || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Popolarità</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    {myGarden.popularity_score || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Best Score</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-400" />
                    {myGarden.best_score || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {pendingTrades.length > 0 && (
          <Card className="mb-8 bg-yellow-900/40 backdrop-blur border-yellow-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Pending Trade Offers ({pendingTrades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingTrades.slice(0, 3).map(trade => (
                  <div key={trade.id} className="flex items-center justify-between bg-black/30 p-3 rounded-lg">
                    <div className="text-white">
                      <div className="font-bold">{trade.from_player_email}</div>
                      <div className="text-sm text-gray-400">Offers: {trade.offered_seed_name}</div>
                    </div>
                    <Button
                      onClick={() => navigate(createPageUrl('Trading'))}
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="popular" className="mb-8">
          <TabsList className="bg-black/40 backdrop-blur">
            <TabsTrigger value="popular">
              <TrendingUp className="w-4 h-4 mr-2" />
              Most Popular
            </TabsTrigger>
            <TabsTrigger value="recent">
              Recent Gardens
            </TabsTrigger>
            <TabsTrigger value="friends">
              Friends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="mt-6">
            <Input
              placeholder="Cerca giardini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-6 bg-white/10 text-white placeholder-gray-400"
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityGardens.map(garden => (
                <Card
                  key={garden.id}
                  className="bg-black/40 backdrop-blur border-cyan-500/30 hover:border-cyan-500/60 transition-all cursor-pointer"
                  onClick={() => handleVisitGarden(garden)}
                >
                  <CardHeader>
                    <CardTitle className="text-white">{garden.garden_name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-green-600">{garden.aesthetic_theme}</Badge>
                      <Badge variant="outline" className="text-white">{garden.showcase_strain}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-sm mb-4">{garden.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Eye className="w-4 h-4" />
                        {garden.visit_count || 0} visits
                      </div>
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Trophy className="w-4 h-4" />
                        {garden.best_score || 0}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      by {garden.owner_name}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent">
            <div className="text-center text-gray-400 py-12">
              Feature coming soon
            </div>
          </TabsContent>

          <TabsContent value="friends">
            <div className="text-center text-gray-400 py-12">
              Feature coming soon
            </div>
          </TabsContent>
        </Tabs>

        {selectedGarden && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-gray-800 border-cyan-500/50 text-white max-h-[90vh] overflow-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl">{selectedGarden.garden_name}</CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedGarden(null)}
                    className="text-white"
                  >
                    ✕
                  </Button>
                </div>
                <div className="text-gray-400">by {selectedGarden.owner_name}</div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="text-sm text-gray-400 mb-2">Theme</div>
                  <Badge className="bg-green-600 text-lg px-4 py-1">{selectedGarden.aesthetic_theme}</Badge>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-2">Showcase Strain</div>
                  <div className="bg-black/40 p-4 rounded-lg">
                    <div className="text-xl font-bold mb-2">{selectedGarden.showcase_strain}</div>
                    {selectedGarden.showcase_stats && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Growth: </span>
                          <span className="text-green-400">{selectedGarden.showcase_stats.growth_level || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Health: </span>
                          <span className="text-green-400">{selectedGarden.showcase_stats.health || 'N/A'}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-black/40 p-4 rounded-lg text-center">
                    <Eye className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{selectedGarden.visit_count || 0}</div>
                    <div className="text-xs text-gray-400">Visits</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-lg text-center">
                    <TrendingUp className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{selectedGarden.popularity_score || 0}</div>
                    <div className="text-xs text-gray-400">Popularity</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-lg text-center">
                    <Trophy className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{selectedGarden.best_score || 0}</div>
                    <div className="text-xs text-gray-400">Best Score</div>
                  </div>
                </div>

                {selectedGarden.achievements_displayed?.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-400 mb-3">Achievements</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedGarden.achievements_displayed.map((achievement, idx) => (
                        <Badge key={idx} className="bg-yellow-600">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(createPageUrl('Trading') + `?with=${selectedGarden.owner_email}`)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Share2 className="w-5 w-5 mr-2" />
                    Propose Trade
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-cyan-500 text-white hover:bg-cyan-500/20"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Message Owner
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}