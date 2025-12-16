import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Check, X, Sprout } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Trading() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const withEmail = params.get('with');
    if (withEmail) {
      setTargetEmail(withEmail);
    }
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

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

  const { data: incomingTrades } = useQuery({
    queryKey: ['incomingTrades'],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.SeedTrade.filter({
        to_player_email: currentUser.email,
        trade_status: 'pending'
      }, '-created_date');
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: outgoingTrades } = useQuery({
    queryKey: ['outgoingTrades'],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.SeedTrade.filter({
        from_player_email: currentUser.email
      }, '-created_date');
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createTradeMutation = useMutation({
    mutationFn: (tradeData) => base44.entities.SeedTrade.create(tradeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoingTrades'] });
      toast.success('Trade offer sent!');
      setSelectedOffer(null);
      setSelectedRequest(null);
      setTargetEmail('');
      setMessage('');
    }
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SeedTrade.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingTrades'] });
      queryClient.invalidateQueries({ queryKey: ['outgoingTrades'] });
    }
  });

  const handleSendTrade = async () => {
    if (!currentUser || !selectedOffer || !targetEmail) {
      toast.error('Select seed and target player');
      return;
    }

    const offeredSeed = allSeeds.find(s => s.id === selectedOffer);
    const requestedSeed = selectedRequest ? allSeeds.find(s => s.id === selectedRequest) : null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await createTradeMutation.mutateAsync({
      from_player_email: currentUser.email,
      to_player_email: targetEmail,
      offered_seed_id: offeredSeed.id,
      offered_seed_name: offeredSeed.strain_name,
      offered_genetics: {
        growth_speed: offeredSeed.growth_speed,
        pest_resistance: offeredSeed.pest_resistance,
        rarity: offeredSeed.rarity
      },
      requested_seed_id: requestedSeed?.id || null,
      requested_seed_name: requestedSeed?.strain_name || 'Any',
      trade_status: 'pending',
      message: message,
      expires_at: expiresAt.toISOString()
    });
  };

  const handleAcceptTrade = async (trade) => {
    if (!currentUser || !progress) return;

    await updateTradeMutation.mutateAsync({
      id: trade.id,
      data: {
        trade_status: 'completed',
        target_result: {
          accepted_at: new Date().toISOString(),
          receiver_email: currentUser.email
        }
      }
    });

    const updatedSeeds = [...new Set([...(progress.unlocked_seeds || []), trade.offered_seed_id])];
    await base44.entities.GameProgress.update(progress.id, {
      unlocked_seeds: updatedSeeds
    });

    await base44.entities.PlayerMessage.create({
      from_email: currentUser.email,
      from_name: currentUser.full_name || currentUser.email,
      to_email: trade.from_player_email,
      message: `Trade accepted! ${currentUser.full_name} now has ${trade.offered_seed_name}.`,
      message_type: 'trade_offer'
    });
    
    queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    toast.success('Trade completed! Seed unlocked.');
  };

  const handleDeclineTrade = async (trade) => {
    await updateTradeMutation.mutateAsync({
      id: trade.id,
      data: {
        trade_status: 'declined'
      }
    });

    await base44.entities.PlayerMessage.create({
      from_email: currentUser.email,
      from_name: currentUser.full_name || currentUser.email,
      to_email: trade.from_player_email,
      message: `Trade declined: ${trade.offered_seed_name}`,
      message_type: 'trade_offer'
    });

    toast.info('Trade declined');
  };

  const mySeeds = allSeeds.filter(s => progress?.unlocked_seeds?.includes(s.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('CommunityHub'))}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <Sprout className="h-8 w-8 text-white" />
          <h1 className="text-4xl font-bold text-white">Seed Trading</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-black/40 backdrop-blur border-green-500/50">
            <CardHeader>
              <CardTitle className="text-white">Create Trade Offer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Target Player Email</label>
                <Input
                  type="email"
                  placeholder="player@example.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="bg-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Your Seed to Offer</label>
                <div className="grid grid-cols-2 gap-2">
                  {mySeeds.map(seed => (
                    <Button
                      key={seed.id}
                      onClick={() => setSelectedOffer(seed.id)}
                      variant={selectedOffer === seed.id ? 'default' : 'outline'}
                      className={selectedOffer === seed.id ? 'bg-green-600' : 'border-white text-white'}
                    >
                      {seed.strain_name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Requested Seed (Optional)</label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {allSeeds.map(seed => (
                    <Button
                      key={seed.id}
                      onClick={() => setSelectedRequest(seed.id)}
                      variant={selectedRequest === seed.id ? 'default' : 'outline'}
                      size="sm"
                      className={selectedRequest === seed.id ? 'bg-purple-600' : 'border-white text-white'}
                    >
                      <div className="truncate">{seed.strain_name}</div>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Message</label>
                <Textarea
                  placeholder="Add a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white/10 text-white"
                />
              </div>

              <Button
                onClick={handleSendTrade}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!selectedOffer || !targetEmail}
              >
                <Send className="w-5 h-5 mr-2" />
                Send Trade Offer
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-black/40 backdrop-blur border-yellow-500/50">
              <CardHeader>
                <CardTitle className="text-white">
                  Incoming Offers ({incomingTrades.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {incomingTrades.map(trade => (
                  <div key={trade.id} className="bg-black/40 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-white font-bold">{trade.offered_seed_name}</div>
                        <div className="text-xs text-gray-400">from {trade.from_player_email}</div>
                      </div>
                      <Badge className="bg-green-600">{trade.offered_genetics?.rarity || 'common'}</Badge>
                    </div>

                    {trade.message && (
                      <p className="text-gray-300 text-sm mb-3 italic">"{trade.message}"</p>
                    )}

                    {trade.requested_seed_name && (
                      <div className="text-xs text-gray-400 mb-2">
                        Wants: {trade.requested_seed_name}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-3">
                      Growth: ×{trade.offered_genetics?.growth_speed || 1} | 
                      Resistance: {trade.offered_genetics?.pest_resistance || 0}%
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptTrade(trade)}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDeclineTrade(trade)}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500 text-white hover:bg-red-500/20"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}

                {incomingTrades.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No pending trade offers
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur border-cyan-500/50">
              <CardHeader>
                <CardTitle className="text-white">
                  Your Offers ({outgoingTrades.filter(t => t.trade_status === 'pending').length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {outgoingTrades.filter(t => t.trade_status === 'pending').map(trade => (
                  <div key={trade.id} className="bg-black/40 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">{trade.offered_seed_name}</div>
                        <div className="text-xs text-gray-400">to {trade.to_player_email}</div>
                      </div>
                      <Badge className="bg-yellow-600">Pending</Badge>
                    </div>
                  </div>
                ))}

                {outgoingTrades.filter(t => t.trade_status === 'pending').length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No active offers
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}