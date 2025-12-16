import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Heart, Zap, Sparkles, Shield, Target, Clock, TrendingUp, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function ContextualHints({ gameState, onDismiss }) {
  const [currentHint, setCurrentHint] = useState(null);
  const [dismissedHints, setDismissedHints] = useState([]);

  useEffect(() => {
    if (!gameState) return;

    const hints = [];

    if (gameState.plantHealth < 30 && !dismissedHints.includes('low_health')) {
      hints.push({
        id: 'low_health',
        type: 'warning',
        icon: Heart,
        title: 'Salute Critica!',
        message: 'La tua pianta sta per morire! Cerca power-up di salute o elimina i parassiti rapidamente.',
        color: 'red',
        priority: 10
      });
    }

    if (gameState.sprayAmmo < 20 && !dismissedHints.includes('low_ammo')) {
      hints.push({
        id: 'low_ammo',
        type: 'warning',
        icon: Zap,
        title: 'Munizioni Basse',
        message: 'Lo spray si sta esaurendo. Risparmia i colpi e mira con precisione.',
        color: 'yellow',
        priority: 7
      });
    }

    if (gameState.activePests > 15 && !dismissedHints.includes('too_many_pests')) {
      hints.push({
        id: 'too_many_pests',
        type: 'tactical',
        icon: Target,
        title: 'Troppi Parassiti!',
        message: 'Concentrati sui parassiti più vicini alla pianta. Cerca power-up Area Damage.',
        color: 'orange',
        priority: 8
      });
    }

    if (gameState.powerUpNearby && !dismissedHints.includes('powerup_available')) {
      hints.push({
        id: 'powerup_available',
        type: 'info',
        icon: Sparkles,
        title: 'Power-up Disponibile',
        message: 'C\'è un power-up nelle vicinanze! Muoviti per raccoglierlo.',
        color: 'purple',
        priority: 6
      });
    }

    if (gameState.bossActive && !dismissedHints.includes('boss_strategy')) {
      hints.push({
        id: 'boss_strategy',
        type: 'tactical',
        icon: Shield,
        title: 'Boss Attivo!',
        message: 'Questo boss ha abilità speciali. Studia i suoi pattern e usa power-up strategicamente.',
        color: 'red',
        priority: 9
      });
    }

    if (gameState.accuracyLow && gameState.waveNumber >= 3 && !dismissedHints.includes('improve_accuracy')) {
      hints.push({
        id: 'improve_accuracy',
        type: 'tip',
        icon: Target,
        title: 'Migliora la Precisione',
        message: 'La tua precisione è bassa. Prova a mirare con calma prima di spruzzare.',
        color: 'blue',
        priority: 5
      });
    }

    if (gameState.plantGrowthStage < 0.3 && gameState.gameTime > 120 && !dismissedHints.includes('plant_care')) {
      hints.push({
        id: 'plant_care',
        type: 'info',
        icon: TrendingUp,
        title: 'Crescita Lenta',
        message: 'La pianta cresce lentamente. Controlla acqua e nutrienti nel menu pausa.',
        color: 'green',
        priority: 4,
        linkText: 'Vai al Codex',
        linkUrl: 'Codex'
      });
    }

    if (hints.length > 0) {
      hints.sort((a, b) => b.priority - a.priority);
      const topHint = hints[0];
      
      if (!currentHint || currentHint.id !== topHint.id) {
        setCurrentHint(topHint);
      }
    } else {
      setCurrentHint(null);
    }
  }, [gameState, dismissedHints]);

  const handleDismiss = () => {
    if (currentHint) {
      setDismissedHints(prev => [...prev, currentHint.id]);
      setCurrentHint(null);
      onDismiss?.(currentHint.id);
    }
  };

  if (!currentHint) return null;

  const Icon = currentHint.icon;
  const colorClasses = {
    red: 'border-red-500 bg-red-900/40',
    yellow: 'border-yellow-500 bg-yellow-900/40',
    orange: 'border-orange-500 bg-orange-900/40',
    purple: 'border-purple-500 bg-purple-900/40',
    blue: 'border-blue-500 bg-blue-900/40',
    green: 'border-green-500 bg-green-900/40'
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-24 right-6 max-w-sm z-30 border-2 ${colorClasses[currentHint.color]} backdrop-blur-md rounded-xl p-4 text-white shadow-2xl`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-${currentHint.color}-500/20`}>
            <Icon className={`w-5 h-5 text-${currentHint.color}-400`} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm mb-1">{currentHint.title}</div>
            <div className="text-xs text-gray-300 mb-3">{currentHint.message}</div>
            <div className="flex gap-2">
              {currentHint.linkUrl && (
                <Link to={createPageUrl(currentHint.linkUrl)}>
                  <button className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {currentHint.linkText}
                  </button>
                </Link>
              )}
              <button 
                onClick={handleDismiss}
                className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors ml-auto"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}