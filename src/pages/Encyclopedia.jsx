import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bug, BookOpen, Shield, Flame, Search, Lock, BookMarked } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function Encyclopedia() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPest, setSelectedPest] = useState(null);

  const { data: allPests } = useQuery({
    queryKey: ['pests'],
    queryFn: () => base44.entities.Pest.list(),
    initialData: []
  });

  const { data: encyclopediaEntries } = useQuery({
    queryKey: ['encyclopediaEntries'],
    queryFn: () => base44.entities.PestEncyclopediaEntry.list(),
    initialData: []
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const discoveredPests = progress?.pests_encountered || [];

  const filteredPests = allPests.filter(pest => {
    const matchesSearch = pest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pest.scientific_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getEntry = (pestId) => {
    return encyclopediaEntries.find(e => e.pest_id === pestId);
  };

  const isDiscovered = (pestType) => {
    return discoveredPests.includes(pestType);
  };

  const getBtkColor = (effectiveness) => {
    switch(effectiveness) {
      case 'very_high': return 'text-green-400';
      case 'high': return 'text-lime-400';
      case 'moderate': return 'text-yellow-400';
      case 'low': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const renderPestCard = (pest) => {
    const discovered = isDiscovered(pest.type);
    const entry = getEntry(pest.id);

    return (
      <Card
        key={pest.id}
        className={`cursor-pointer transition-all hover:scale-105 ${
          discovered ? 'bg-black/40 border-green-500/30' : 'bg-black/20 border-gray-700'
        }`}
        onClick={() => discovered && setSelectedPest(pest)}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {discovered ? (
              <span className="text-white">{pest.name}</span>
            ) : (
              <span className="text-gray-500 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                ???
              </span>
            )}
            <Bug className={`h-5 w-5 ${discovered ? 'text-green-400' : 'text-gray-600'}`} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {discovered ? (
            <>
              <p className="text-sm text-gray-400 italic mb-2">{pest.scientific_name}</p>
              <div className="flex gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {pest.size_category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Lvl {pest.unlock_level}+
                </Badge>
              </div>
              {entry && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Incontri:</span>
                    <span className="text-white">{entry.times_encountered || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Eliminati:</span>
                    <span className="text-white">{entry.times_eliminated || 0}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <Lock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Non ancora scoperto</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDetailView = () => {
    if (!selectedPest) return null;

    const entry = getEntry(selectedPest.id);

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-6">
        <div className="max-w-full md:max-w-4xl mx-auto">
          <Card className="bg-gray-900 border-green-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-white mb-1">{selectedPest.name}</CardTitle>
                  <p className="text-gray-400 italic">{selectedPest.scientific_name}</p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedPest(null)}>
                  Chiudi
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-green-400 mb-2">CARATTERISTICHE</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dimensione:</span>
                      <span className="text-white capitalize">{selectedPest.size_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Salute:</span>
                      <span className="text-white">{selectedPest.health} HP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Velocità:</span>
                      <span className="text-white">{selectedPest.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Danno/sec:</span>
                      <span className="text-white">{selectedPest.damage_per_second}</span>
                    </div>
                  </div>
                </div>
                
                {entry && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-2">EFFICACIA BTK</h3>
                    <div className={`text-3xl font-bold ${getBtkColor(entry.btk_effectiveness)}`}>
                      {entry.btk_effectiveness === 'very_high' && '95-100%'}
                      {entry.btk_effectiveness === 'high' && '80-95%'}
                      {entry.btk_effectiveness === 'moderate' && '60-80%'}
                      {entry.btk_effectiveness === 'low' && '40-60%'}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Efficacia Bacillus thuringiensis kurstaki
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-green-400 mb-2">DESCRIZIONE</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {entry?.description || selectedPest.description}
                </p>
              </div>

              {entry && (
                <>
                  {entry.taxonomy && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">TASSONOMIA</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {entry.taxonomy.kingdom && (
                          <div><span className="text-gray-400">Regno:</span> <span className="text-white">{entry.taxonomy.kingdom}</span></div>
                        )}
                        {entry.taxonomy.phylum && (
                          <div><span className="text-gray-400">Phylum:</span> <span className="text-white">{entry.taxonomy.phylum}</span></div>
                        )}
                        {entry.taxonomy.class && (
                          <div><span className="text-gray-400">Classe:</span> <span className="text-white">{entry.taxonomy.class}</span></div>
                        )}
                        {entry.taxonomy.order && (
                          <div><span className="text-gray-400">Ordine:</span> <span className="text-white">{entry.taxonomy.order}</span></div>
                        )}
                        {entry.taxonomy.family && (
                          <div><span className="text-gray-400">Famiglia:</span> <span className="text-white">{entry.taxonomy.family}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                  {entry.behavior_analysis && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">ANALISI COMPORTAMENTO</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{entry.behavior_analysis}</p>
                    </div>
                  )}

                  {entry.weaknesses && entry.weaknesses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">PUNTI DEBOLI</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {entry.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-gray-300 text-sm">{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.prevention_methods && entry.prevention_methods.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">PREVENZIONE</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {entry.prevention_methods.map((method, idx) => (
                          <li key={idx} className="text-gray-300 text-sm">{method}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.treatment_strategies && entry.treatment_strategies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">STRATEGIE TRATTAMENTO</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {entry.treatment_strategies.map((strategy, idx) => (
                          <li key={idx} className="text-gray-300 text-sm">{strategy}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.ecological_impact && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">IMPATTO ECOLOGICO</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{entry.ecological_impact}</p>
                    </div>
                  )}
                </>
              )}

              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">INFORMAZIONI REALI</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{selectedPest.real_world_info}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 p-4 md:p-6 w-full overflow-x-hidden">
      <div className="max-w-full md:max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Home'))}
              className="text-white hover:bg-white/10"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
              <span className="hidden md:inline">Indietro</span>
            </Button>
            <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
            <h1 className="text-2xl md:text-4xl font-bold text-white">Enciclopedia</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap w-full md:w-auto">
            <Button
              onClick={() => navigate(createPageUrl('LoreArchive'))}
              variant="outline"
              size="sm"
              className="border-indigo-500 text-white hover:bg-indigo-500/20 text-xs md:text-sm"
            >
              <BookMarked className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
              <span className="hidden sm:inline">Archivio</span>
            </Button>
            <Badge className="bg-green-600 text-sm md:text-lg px-3 md:px-4 py-1 md:py-2">
              {discoveredPests.length} / {allPests.length}
            </Badge>
          </div>
        </div>

        <div className="mb-4 md:mb-6 w-full">
          <div className="relative max-w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            <Input
              placeholder="Cerca parassita..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 md:pl-10 bg-black/40 border-green-500/30 text-white text-sm md:text-base w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 w-full">
          {filteredPests.map(pest => renderPestCard(pest))}
        </div>

        {filteredPests.length === 0 && (
          <div className="text-center py-16">
            <Bug className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nessun parassita trovato</p>
          </div>
        )}
      </div>

      {renderDetailView()}
    </div>
  );
}