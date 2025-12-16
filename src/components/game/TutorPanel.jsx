import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Bug, Info, Shield } from 'lucide-react';

export default function TutorPanel({ pest, onClose }) {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-auto" onClick={onClose}>
      <Card 
        className="w-full max-w-2xl mx-4 bg-gradient-to-br from-green-900 to-green-800 border-green-400/50 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-green-400/20 p-3 rounded-full">
                <Bug className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">{pest.name}</CardTitle>
                <div className="text-green-300 italic text-sm mt-1">{pest.scientific_name}</div>
              </div>
            </div>
            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {pest.description && (
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-400" />
                <div className="font-semibold">Descrizione</div>
              </div>
              <p className="text-green-100 leading-relaxed">{pest.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-sm text-green-300">Tipo</div>
              <div className="text-lg font-bold capitalize">{pest.type.replace('_', ' ')}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-sm text-green-300">Dimensione</div>
              <div className="text-lg font-bold capitalize">{pest.size_category}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-sm text-green-300">Resistenza</div>
              <div className="text-lg font-bold">{pest.health} HP</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-sm text-green-300">Velocità</div>
              <div className="text-lg font-bold">{pest.speed.toFixed(1)}</div>
            </div>
          </div>

          {pest.real_world_info && (
            <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-400" />
                <div className="font-semibold text-green-400">Come Combatterlo</div>
              </div>
              <p className="text-green-100 leading-relaxed">{pest.real_world_info}</p>
            </div>
          )}

          <div className="bg-purple-900/30 border border-purple-400/30 rounded-lg p-4">
            <div className="font-semibold text-purple-300 mb-2">💡 Bacillus thuringiensis kurstaki (Btk)</div>
            <p className="text-sm text-purple-100">
              Il Btk è un batterio naturale che produce tossine specifiche per i parassiti degli insetti. 
              È completamente sicuro per le piante, gli animali e gli esseri umani, ma letale per i parassiti della cannabis.
              Spruzza con precisione per massimizzare l'efficacia!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}