import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle, X } from 'lucide-react';

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
          <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border-green-500/30 text-white">
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
                  <CardTitle className="text-2xl">Benvenuto in Ku