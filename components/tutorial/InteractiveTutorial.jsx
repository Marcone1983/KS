import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, CheckCircle } from 'lucide-react';

export default function InteractiveTutorial({ onComplete, onSkip }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => onComplete?.(), 500);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => onSkip?.(), 500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border-green-500/30 text-white shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-green-500/20 text-green-400 border-green-400">
                  Tutorial
                </Badge>
                <Button variant="ghost" size="icon" onClick={handleSkip} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-500/20 rounded-xl">
                  <Trophy className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Benvenuto in Kurstaki Strike!</CardTitle>
                  <p className="text-gray-400 mt-1">Difendi la tua pianta dai parassiti</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 text-gray-300 text-base leading-relaxed bg-black/20 p-6 rounded-lg border border-white/10">
                <p className="text-white font-semibold text-lg mb-4">Come Giocare:</p>
                <p><span className="text-green-400 font-bold">🎮 Obiettivo:</span> Proteggi la tua pianta di cannabis eliminando i parassiti prima che la danneggino.</p>
                <p><span className="text-cyan-400 font-bold">🖱️ Controlli:</span> Muovi il mouse per mirare, CLICK o SPACE per spruzzare il Btk.</p>
                <p><span className="text-purple-400 font-bold">⚡ Power-ups:</span> Raccogli power-up colorati per abilità speciali che ti aiuteranno in battaglia.</p>
                <p><span className="text-red-400 font-bold">🐛 Parassiti:</span> Ogni parassita ha abilità uniche - studia i loro comportamenti!</p>
                <p><span className="text-yellow-400 font-bold">💰 Leaf Token:</span> Guadagna Leaf giocando per sbloccare skin, vasi e potenziamenti nello shop.</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="flex-1 border-gray-500 text-white hover:bg-gray-800"
                >
                  Salta Tutorial
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Ho Capito, Iniziamo!
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}