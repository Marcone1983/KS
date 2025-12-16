import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserPlus, MessageCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function FriendsManager({ currentUser }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [friendEmail, setFriendEmail] = useState('');

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const friendships = await base44.entities.Friendship.filter({ status: 'accepted' });
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
      return await base44.entities.Friendship.filter({
        receiver_email: currentUser.email,
        status: 'pending'
      });
    },
    enabled: !!currentUser,
    initialData: []
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

  const handleAddFriend = async () => {
    if (!friendEmail) {
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
    toast.success('Friend added!');
  };

  const getFriendData = (friendship) => {
    const isRequester = friendship.requester_email === currentUser.email;
    return {
      email: isRequester ? friendship.receiver_email : friendship.requester_email,
      name: isRequester ? friendship.receiver_name : friendship.requester_name
    };
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/40 backdrop-blur border-green-500/50">
        <CardHeader>
          <CardTitle className="text-white">Add Friend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Friend's email..."
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              className="bg-white/10 text-white"
            />
            <Button
              onClick={handleAddFriend}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {friendRequests.length > 0 && (
        <Card className="bg-black/40 backdrop-blur border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-white">Friend Requests ({friendRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {friendRequests.map(req => (
              <div key={req.id} className="bg-black/30 p-3 rounded-lg flex items-center justify-between">
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
          </CardContent>
        </Card>
      )}

      <Card className="bg-black/40 backdrop-blur border-cyan-500/50">
        <CardHeader>
          <CardTitle className="text-white">Friends ({friends.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {friends.map(friendship => {
            const friend = getFriendData(friendship);
            return (
              <div
                key={friendship.id}
                className="bg-black/30 p-3 rounded-lg flex items-center justify-between"
              >
                <span className="text-white">{friend.name}</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(createPageUrl('CommunityHub'))}
                    size="sm"
                    variant="outline"
                    className="border-cyan-500 text-white"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      navigate(createPageUrl('Trading') + `?with=${friend.email}`);
                    }}
                    size="sm"
                    className="bg-green-600"
                  >
                    Trade
                  </Button>
                </div>
              </div>
            );
          })}

          {friends.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No friends yet. Add friends to trade and compete!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}