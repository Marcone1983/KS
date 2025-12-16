import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, MousePointer, Zap, Trophy, CheckCircle, ArrowRight, Bug, Shield, Sparkles, AlertTriangle, Brain, X, Droplets, Move, Crosshair, Heart, Flame, Wind, Skull } from 'lucide-react';

const TUTORIAL_STEPS = [
  { id: 'welcome', title: 'Benvenuto', description: 'Difendi la tua pianta dai parassiti!', icon: Trophy, task: null },
  { id: 'movement', title: 'Controlli Base', description: 'Muovi il mouse per mirare, click o SPACE per spruzzare', icon: MousePointer, task: 'spray' },
  { id: 'pests', title: 'I Parassiti', description: 'Elimina i parassiti prima che danneggino la pianta', icon: Bug, task: 'kill_pest' },
  { id: 'powerups', title: 'Power-up', description: 'Raccogli power-up per abilità speciali', icon: Sparkles, task: 'collect_powerup' },
  { id: 'special_enemies', title: 'Nemici Speciali', description: 'Attenzione ai nemici con abilità uniche!', icon: Skull, task: null },
  { id: 'complete', title: 'Completato!', description: 'Ora sei pronto per giocare', icon: CheckCircle, task: null }
];

export default function InteractiveTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [taskProgress, setTaskProgress] = useState({});
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const step = TUTORIAL_STEPS[currentStep];
    if (step.task && taskProgress[step.task]) {
      const timer = setTimeout(() => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          handleComplete();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [taskProgress, currentStep]);

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => onComplete?.(), 500);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => onSkip?.(), 500);
  };

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border-green-500/30 text-white">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-green-500/20 text-green-400 border-green-400">
                  Tutorial {currentStep + 1}/{TUTORIAL_STEPS.length}
                </Badge>
                <Button variant="ghost" size="icon" onClick={handleSkip} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <Progress value={progress} className="h-2 mb-4" />
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-500/20 rounded-xl">
                  <Icon className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                  <p className="text-gray-400 mt-1">{step.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === 0 && (
                <div className="space-y-3 text-gray-300">
                  <p>Kurstaki Strike è un gioco di difesa dove proteggi la tua pianta di cannabis dai parassiti.</p>
                  <p>Usa il Bacillus thuringiensis kurstaki (Btk) per eliminare i nem