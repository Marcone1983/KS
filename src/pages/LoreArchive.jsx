import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, FileText, Radio, Package, Sparkles } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function LoreArchive() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: allLore } = useQuery({
    queryKey: ['loreElements'],
    queryFn: () => base44.entities.LoreElement.list('-discovery_level'),
    initialData: []
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const discoveredLore = allLore.filter(lore => 
    lore.discovered_by_users?.includes(progress?.created_by)
  );

  const filteredLore = selectedCategory === 'all' 
    ? discoveredLore 
    : discoveredLore.filter(l => l.category === selectedCategory);

  const getIcon = (type) => {
    switch(type) {
      case 'note': return FileText;
      case 'recording': return Radio;
      case 'artifact': return Package;
      case 'symbol': return Sparkles;
      default: return FileText;
    }
  };

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'legendary': return 'border-yellow-400 bg-yellow-900/20';
      case 'rare': return 'border-purple-400 bg-purple-900/20';
      case 'uncommon': return 'border-blue-400 bg-blue-900/20';
      default: return 'border-gray-400 bg-gray-900/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Encyclopedia'))}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Indietro
          </Button>
          <BookOpen className="h-8 w-8 text-indigo-400" />
          <h1 className="text-4xl font-bold text-white">Archivio Narrativo</h1>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="bg-black/40">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="origin">Origine</TabsTrigger>
            <TabsTrigger value="scientist">Scienziati</TabsTrigger>
            <TabsTrigger value="experiment">Esperimenti</TabsTrigger>
            <TabsTrigger value="outbreak">Fuga</TabsTrigger>
            <TabsTrigger value="resistance">Resistenza</TabsTrigger>
            <TabsTrigger value="future">Futuro</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLore.map((lore, idx) => {
            const Icon = getIcon(lore.type);
            
            return (
              <Card key={idx} className={`${getRarityColor(lore.rarity)} border-2`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {lore.title}
                    </CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {lore.rarity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/40 rounded-lg p-4 mb-3">
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {lore.content}
                    </p>
                  </div>
                  
                  {lore.symbol_code && (
                    <div className="text-center py-3 border-t border-gray-700">
                      <div className="text-xl font-mono text-yellow-400 tracking-widest">
                        {lore.symbol_code}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {lore.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {lore.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredLore.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nessun elemento narrativo scoperto in questa categoria</p>
            <p className="text-gray-500 text-sm mt-2">Continua a giocare per scoprire la storia...</p>
          </div>
        )}
      </div>
    </div>
  );
}