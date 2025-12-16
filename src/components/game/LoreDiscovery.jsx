import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Radio, Package, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoreDiscovery({ loreElement, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (loreElement) {
      setIsVisible(true);
    }
  }, [loreElement]);

  if (!loreElement || !isVisible) return null;

  const getIcon = (type) => {
    switch(type) {
      case 'note': return FileText;
      case 'symbol': return Package;
      case 'recording': return Radio;
      case 'memory': return BookOpen;
      case 'artifact': return Package;
      default: return FileText;
    }
  };

  const Icon = getIcon(loreElement.type);

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'legendary': return 'border-yellow-400 bg-yellow-900/20';
      case 'rare': return 'border-purple-400 bg-purple-900/20';
      case 'uncommon': return 'border-blue-400 bg-blue-900/20';
      default: return 'border-gray-400 bg-gray-900/20';
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            exit={{ y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className={`max-w-2xl w-full ${getRarityColor(loreElement.rarity)} border-2`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-white" />
                    <CardTitle className="text-white">{loreElement.title}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleDismiss}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-white">
                    {loreElement.type}
                  </Badge>
                  <Badge variant="outline" className="text-white capitalize">
                    {loreElement.rarity}
                  </Badge>
                  <Badge variant="outline" className="text-white capitalize">
                    {loreElement.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-black/40 rounded-lg p-4 mb-4">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {loreElement.content}
                  </p>
                </div>

                {loreElement.symbol_code && (
                  <div className="text-center py-4">
                    <div className="text-2xl font-mono text-yellow-400 tracking-widest">
                      {loreElement.symbol_code}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Simbolo ricorrente</p>
                  </div>
                )}

                <div className="text-center mt-4">
                  <p className="text-sm text-gray-400 italic">
                    Nuovo elemento narrativo scoperto! Disponibile nell'archivio.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}