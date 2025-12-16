import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Eye, TrendingUp, Sprout, Trophy, MessageCircle, Share2, UserPlus, Star } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import PopularGardensLeaderboard from '../components/community/PopularGardensLeaderboard';

export default function CommunityHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);

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

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      if (!currentUser) return [];
      const friendships = await base44.entities.Friendship.filter({
        status: 'accepted'
      });
      return friendships.filter(f => 
        f.requester_email === currentUser.email || f.receiver_email === currentUser.email
      );
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: friendRequests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Friendship.filter({
        receiver_email: currentUser.email,
        status: 'pending'
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedFriend],
    queryFn: async () => {
      if (!currentUser || !selectedFriend) return [];
      return await base44.entities.PlayerMessage.filter({
        or: [
          { from_email: currentUser.email, to_email: selectedFriend },
          { from_email: selectedFriend, to_email: currentUser.email }
        ]
      }, '-created_date');
    },
    enabled: !!currentUser && !!selectedFriend,
    initialData: []
  });

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
      queryClient.invalidateQueries({ queryKey: ['topGardens'] });
    }
  });

  const addFriendMutation = useMutation({
    mutationFn: (friendData) => base44.entities.Friendship.create(friendData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend request sent!');
      setFriendEmail('');
    }
  });

  const updateFriendshipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Friendship.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.PlayerMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText('');
    }
  });

  const rateGardenMutation = useMutation({
    mutationFn: (ratingData) => base44.entities.GardenRating.create(ratingData),
    onSuccess: () => {
      toast.success('Rating submitted!');
      queryClient.invalidateQueries({ queryKey: ['communityGardens'] });
    }
  });

  const handleVisitGarden = async (garden) => {
    setSelectedGarden(garden);
    
    await visitGardenMutation.mutateAsync({
      id: garden.id,
      data: {
        visit_count: (garden.visit_count || 0) + 1,
        popularity_score: (garden.popularity_score || 0) + 5
      }
    });
  };

  const handleAddFriend = async () => {
    if (!currentUser || !friendEmail) {
      toast.error('Enter email');
      return;
    }

    await addFriendMutation.mutateAsync({
      requester_email: currentUser.email,
      requester_name: currentUser.full_name || currentUser.email,
      receiver_email: friendEmail,
      status: 'pending'
    });
  };

  const handleAcceptFriend = async (request) => {
    await updateFriendshipMutation.mutateAsync({
      id: request.id,
      data: { status: 'accepted', receiver_name: currentUser.full_name || currentUser.email }
    });
    toast.success('Friend request accepted!');
  };

  const handleSendMessage = async () => {
    if (!currentUser || !selectedFriend || !messageText) return;

    await sendMessageMutation.mutateAsync({
      from_email: currentUser.email,
      from_name: currentUser.full_name || currentUser.email,
      to_email: selectedFriend,
      message: messageText,
      message_type: 'chat'
    });
  };

  const handleRateGarden = async (gardenId, rating) => {
    if (!currentUser) return;

    await rateGardenMutation.mutateAsync({
      garden_id: gardenId,
      rater_email: currentUser.email,
      rating
    });

    await visitGardenMutation.mutateAsync({
      id: gardenId,
      data: {
        popularity_score: (selectedGarden.popularity_score || 0) + rating * 10
      }
    });
  };

  const getFriendsList = () => {
    if (!currentUser) return [];
    return friends.map(f => {
      const isRequester = f.requester_email === currentUser.email;
      return {
        email: isRequester ? f.receiver_email : f.requester_email,
        name: isRequester ? f.receiver_name : f.requester_name
      };
    }).filter(f => f.email);
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
              Explore
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="w-4 h-4 mr-2" />
              Top Gardens
            </TabsTrigger>
            <TabsTrigger value="friends">
              <Users className="w-4 h-4 mr-2" />
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



          <TabsContent value="leaderboard">
            <PopularGardensLeaderboard onVisitGarden={handleVisitGarden} />
          </TabsContent>

          <TabsContent value="friends">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-black/40 backdrop-blur border-green-500/50">
                <CardHeader>
                  <CardTitle className="text-white">Add Friend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Friend's email..."
                      value={friendEmail}
                      onChange={(e) => setFriendEmail(e.target.value)}
                      className="flex-1 bg-white/10 text-white"
                    />
                    <Button
                      onClick={handleAddFriend}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="w-5 h-5" />
                    </Button>
                  </div>

                  {friendRequests.length > 0 && (
                    <div>
                      <div className="text-white font-bold mb-3">Pending Requests</div>
                      {friendRequests.map(req => (
                        <div key={req.id} className="bg-black/30 p-3 rounded-lg mb-2 flex items-center justify-between">
                          <span className="text-white">{req.requester_name}</span>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAcceptFriend(req)}
                              size="sm"
                              className="bg-green-600"
                            >
                              Accept
                            </Button>
                            <Button
                              onClick={() => updateFriendshipMutation.mutate({
                                id: req.id,
                                data: { status: 'declined' }
                              })}
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-white"
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className="text-white font-bold mb-3">Your Friends ({getFriendsList().length})</div>
                    <div className="space-y-2">
                      {getFriendsList().map((friend, idx) => (
                        <div
                          key={idx}
                          className="bg-black/30 p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-black/50"
                          onClick={() => setSelectedFriend(friend.email)}
                        >
                          <span className="text-white">{friend.name}</span>
                          <MessageCircle className="w-5 h-5 text-cyan-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 backdrop-blur border-cyan-500/50">
                <CardHeader>
                  <CardTitle className="text-white">
                    {selectedFriend ? `Chat with ${getFriendsList().find(f => f.email === selectedFriend)?.name}` : 'Select a friend to chat'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedFriend ? (
                    <div className="space-y-4">
                      <div className="bg-black/30 rounded-lg p-4 h-[300px] overflow-y-auto space-y-2">
                        {messages.map(msg => {
                          const isMine = msg.from_email === currentUser.email;
                          return (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-lg max-w-[80%] ${
                                isMine
                                  ? 'ml-auto bg-green-600 text-white'
                                  : 'mr-auto bg-gray-700 text-white'
                              }`}
                            >
                              <div className="text-xs opacity-70 mb-1">{msg.from_name}</div>
                              <div>{msg.message}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="bg-white/10 text-white"
                        />
                        <Button
                          onClick={handleSendMessage}
                          className="bg-cyan-600"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-12">
                      Select a friend to start chatting
                    </div>
                  )}
                </CardContent>
              </Card>
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

                <div>
                  <div className="text-sm text-gray-400 mb-2">Rate this Garden</div>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <Button
                        key={rating}
                        onClick={() => handleRateGarden(selectedGarden.id, rating)}
                        size="sm"
                        variant="outline"
                        className="border-yellow-500 text-white hover:bg-yellow-500/20"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(createPageUrl('Trading') + `?with=${selectedGarden.owner_email}`)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Share2 className="w-5 w-5 mr-2" />
                    Propose Trade
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedFriend(selectedGarden.owner_email);
                      setSelectedGarden(null);
                    }}
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