import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Bug, Sparkles, Leaf, Lock, BookOpen, Target, Shield, Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { POWERUP_EFFECTS } from '../components/game/PowerUps';
import { PLANT_TYPES } from '../components/game/PlantTypeSelector';

export default function Codex() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('pests');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList[0] || null;
    }
  });

  const { data: allPests } = useQuery({
    queryKey: ['pests'],
    queryFn: () => base44.entities.Pest.list(),
    initialData: []
  });

  const encounteredPests = useMemo(() => {
    if (!progress?.pests_encountered || !allPests) return [];
    return allPests.filter(p => progress.pests_encountered.includes(p.type));
  }, [progress?.pests_encountered, allPests]);

  const unencounteredPests = useMemo(() => {
    if (!progress?.pests_encountered || !allPests) return allPests;
    return allPests.filter(p => !progress.pests_encountered.includes(p.type));
  }, [progress?.pests_encountered, allPests]);

  const powerUpsList = useMemo(() => {
    return Object.entries(POWERUP_EFFECTS).map(([type, data]) => ({
      id: type,
      type,
      ...data
    }));
  }, []);

  const plantTypesList = useMemo(() => {
    return Object.values(PLANT_TYPES);
  }, []);

  const filteredPests = useMemo(() => {
    const pests = [...encounteredPests, ...unencounteredPests];
    if (!searchTerm) return pests;
    return pests.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [encounteredPests, unencounteredPests, searchTerm]);

  const filteredPowerUps = useMemo(() => {
    if (!searchTerm) return powerUpsList;
    return powerUpsList.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [powerUpsList, searchTerm]);

  const filteredPlants = useMemo(() => {
    if (!searchTerm) return plantTypesList;
    return plantTypesList.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [plantTypesList, searchTerm]);

  const renderPestCard = (pest, isLocked) => {
    const Icon = isLocked ? Lock : Bug;
    
    return (
      <Card
        key={pest.id}
        className={`cursor-pointer transition-all hover:shadow-xl ${
          isLocked ? 'opacity-50 bg-gray-900' : 'bg-gray-800'
        } border-gray-700 hover:border-green-500`}
        onClick={() => !isLocked && setSelectedEntry({ type: 'pest', data: pest })}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isLocked ? 'bg-gray-800' : 'bg-green-600/20'}`}>
                <Icon className={`w-6 h-6 ${isLocked ? 'text-gray-500' : 'text-green-400'}`} />
              </div>
              <div>
                <CardTitle className={isLocked ? 'text-gray-500' : 'text-white'}>
                  {isLocked ? '???' : pest.name}
                </CardTitle>
                <p className="text-xs text-gray-400">
                  {isLocked ? 'Not yet encountered' : pest.scientific_name}
                </p>
              </div>
            </div>
            {!isLocked && (
              <Badge className={`${
                pest.size_category === 'tiny' ? 'bg-blue-600' :
                pest.size_category === 'small' ? 'bg-green-600' :
                pest.size_category === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
              }`}>
                {pest.size_category}
              </Badge>
            )}
          </div>
        </CardHeader>
        {!isLocked && (
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div>
                <div className="text-gray-400">HP</div>
                <div className="text-white font-bold">{pest.health}</div>
              </div>
              <div>
                <div className="text-gray-400">Speed</div>
                <div className="text-white font-bold">{pest.speed.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-gray-400">Damage</div>
                <div className="text-white font-bold">{pest.damage_per_second.toFixed(1)}/s</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderPowerUpCard = (powerup) => {
    return (
      <Card
        key={powerup.id}
        className="cursor-pointer transition-all hover:shadow-xl bg-gray-800 border-gray-700 hover:border-purple-500"
        onClick={() => setSelectedEntry({ type: 'powerup', data: powerup })}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600/20">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white">{powerup.name}</CardTitle>
              <Badge className="mt-1" style={{ backgroundColor: powerup.color }}>
                {powerup.icon}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-400">
            {powerup.duration > 0 ? `Duration: ${powerup.duration}s` : 'Instant effect'}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPlantCard = (plant) => {
    const Icon = plant.icon;
    
    return (
      <Card
        key={plant.id}
        className="cursor-pointer transition-all hover:shadow-xl bg-gray-800 border-gray-700 hover:border-green-500"
        onClick={() => setSelectedEntry({ type: 'plant', data: plant })}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${plant.color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">{plant.name}</CardTitle>
              <p className="text-xs text-gray-400">{plant.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-400">HP</div>
              <div className="text-white font-bold">{plant.stats.baseHealth}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Resist</div>
              <div className="text-white font-bold">{plant.stats.pestResistance}x</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Growth</div>
              <div className="text-white font-bold">{plant.stats.growthSpeed}x</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedEntry) return null;

    if (selectedEntry.type === 'pest') {
      const pest = selectedEntry.data;
      return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
          <Card className="w-full max-w-2xl bg-gray-900 border-green-500" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-600/20">
                    <Bug className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl text-white">{pest.name}</CardTitle>
                    <p className="text-sm text-gray-400 italic">{pest.scientific_name}</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedEntry(null)}>✕</Button>
              </div>
              <Badge className={`${
                pest.size_category === 'tiny' ? 'bg-blue-600' :
                pest.size_category === 'small' ? 'bg-green-600' :
                pest.size_category === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
              }`}>
                {pest.type} - {pest.size_category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" /> Description
                </h3>
                <p className="text-gray-300">{pest.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-gray-400 text-sm">Health</div>
                  <div className="text-2xl font-bold text-white">{pest.health}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-gray-400 text-sm">Speed</div>
                  <div className="text-2xl font-bold text-white">{pest.speed.toFixed(1)}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-gray-400 text-sm">Damage/s</div>
                  <div className="text-2xl font-bold text-white">{pest.damage_per_second.toFixed(1)}</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5" /> Combat Strategy
                </h3>
                <p className="text-gray-300">{pest.real_world_info}</p>
              </div>

              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                <div className="text-sm text-green-400 font-bold mb-1">WEAKNESS</div>
                <div className="text-white">Bacillus thuringiensis kurstaki (