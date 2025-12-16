import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Check, Trophy, Award, TrendingUp, Sparkles, Cloud, Zap, Target, Flame, Snowflake, Rainbow, Waves } from 'lucide-react';

export const TERRAIN_THEMES = [
  { id: 'forest', name: 'Forest Meadow', price: 0, description: 'Classic forest environment', unlockType: 'default', color: '#2a5a1a' },
  { id: 'desert', name: 'Desert Oasis', price: 400, description: 'Sandy dunes with cacti', unlockType: 'purchase', color: '#c2a666' },
  { id: 'zen', name: 'Zen Garden', price: 500, description: 'Peaceful Japanese garden', unlockType: 'purchase', color: '#6b8e6b' },
  { id: 'fortress', name: 'Stone Fortress', price: 0, description: 'Fortified battleground', unlockType: 'challenge', unlockId: 'terrain_theme_fortress', color: '#5a5a5a' },
  { id: 'crystal', name: 'Crystal Realm', price: 0, description: 'Mystical crystalline terrain', unlockType: 'challenge', unlockId: 'terrain_theme_crystal', color: '#88ccff' },
  { id: 'cyber', name: 'Cyberpunk City', price: 800, description: 'Neon-lit futuristic city', unlockType: 'purchase', color: '#ff00ff' }
];

export const AMBIENT_EFFECTS = [
  { id: 'fireflies', name: 'Fireflies', price: 200, description: 'Gentle glowing fireflies', unlockType: 'purchase', icon: Sparkles },
  { id: 'fireflies_gold', name: 'Golden Fireflies', price: 0, description: 'Rare golden fireflies', unlockType: 'challenge', unlockId: 'ambient_fireflies_gold', icon: Sparkles },
  { id: 'butterflies', name: 'Butterflies', price: 150, description: 'Colorful butterflies', unlockType: 'purchase', icon: Sparkles },
  { id: 'fog_mystical', name: 'Mystical Fog', price: 300, description: 'Ethereal fog effect', unlockType: 'purchase', icon: Cloud },
  { id: 'auroras', name: 'Northern Lights', price: 600, description: 'Aurora borealis', unlockType: 'achievement', unlockId: 'master_survivor', icon: Rainbow },
  { id: 'petals', name: 'Cherry Blossoms', price: 250, description: 'Falling cherry blossom petals', unlockType: 'purchase', icon: Sparkles }
];

export const SPRAY_EFFECTS = [
  { id: 'default', name: 'Classic Spray', price: 0, description: 'Standard spray effect', unlockType: 'default', color: '#00bfff', trail: 'normal' },
  { id: 'precision', name: 'Precision Beam', price: 0, description: 'Focused laser-like spray', unlockType: 'challenge', unlockId: 'spray_effect_precision', color: '#ff0000', trail: 'thin' },
  { id: 'sniper', name: 'Sniper Trail', price: 0, description: 'Long-range targeting trail', unlockType: 'challenge', unlockId: 'spray_effect_sniper', color: '#ffff00', trail: 'long' },
  { id: 'boss_killer', name: 'Boss Slayer', price: 0, description: 'Intimidating dark energy', unlockType: 'challenge', unlockId: 'spray_effect_boss_killer', color: '#9900ff', trail: 'heavy' },
  { id: 'rainbow', name: 'Rainbow Blast', price: 500, description: 'Multi-colored spray', unlockType: 'purchase', color: 'rainbow', trail: 'rainbow' },
  { id: 'lightning', name: 'Lightning Strike', price: 400, description: 'Electric blue bolts', unlockType: 'purchase', color: '#00ffff', trail: 'electric' },
  { id: 'fire', name: 'Inferno', price: 450, description: 'Blazing fire effect', unlockType: 'purchase', color: '#ff4400', trail: 'fire' },
  { id: 'ice', name: 'Frost Nova', price: 400, description: 'Freezing ice crystals', unlockType: 'purchase', color: '#aaddff', trail: 'ice' },
  { id: 'legendary', name: 'Celestial Ray', price: 0, description: 'Divine golden light', unlockType: 'progression', unlockLevel: 50, color: '#ffd700', trail: 'celestial' }
];

export const WEATHER_PATTERNS = [
  { id: 'clear_preference', name: 'Clear Skies', price: 100, description: 'More sunny days', unlockType: 'purchase' },
  { id: 'rain_preference', name: 'Rainy Season', price: 100, description: 'More rainy weather', unlockType: 'purchase' },
  { id: 'storm_master', name: 'Storm Control', price: 400, description: 'Command storms', unlockType: 'achievement', unlockId: 'weather_master' },
  { id: 'aurora_nights', name: 'Aurora Nights', price: 0, description: 'Beautiful night skies', unlockType: 'progression', unlockLevel: 30 }
];

export default function CosmeticShop({ 
  category, 
  customization, 
  progress, 
  progression,
  onPurchase, 
  onEquip 
}) {
  const canUnlock = (item) => {
    if (item.unlockType === 'default') return true;
    if (item.unlockType === 'purchase') return true;
    if (item.unlockType === 'challenge' && customization?.cosmetics_earned_from_challenges?.includes(item.unlockId)) return true;
    if (item.unlockType === 'achievement' && customization?.cosmetics_earned_from_achievements?.includes(item.unlockId)) return true;
    if (item.unlockType === 'progression' && (progression?.player_level || 1) >= (item.unlockLevel || 999)) return true;
    return false;
  };

  const isUnlocked = (item, field) => {
    return customization?.[field]?.includes(item.id) || canUnlock(item);
  };

  const getUnlockText = (item) => {
    if (item.unlockType === 'challenge') return 'Complete Challenge';
    if (item.unlockType === 'achievement') return 'Unlock Achievement';
    if (item.unlockType === 'progression') return `Reach Level ${item.unlockLevel}`;
    return 'Unknown';
  };

  const renderItems = (items, unlockedField, activeField) => {
    return items.map(item => {
      const unlocked = isUnlocked(item, unlockedField);
      const active = customization?.[activeField] === item.id || 
                     customization?.[activeField]?.includes?.(item.id);
      const canAfford = (progress?.leaf_currency || 0) >= item.price;

      return (
        <Card key={item.id} className="bg-black/40 backdrop-blur border-purple-500/30 hover:border-purple-500/60 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                {item.icon && React.createElement(item.icon, { className: 'w-5 h-5' })}
                {item.name}
              </CardTitle>
              {active && <Badge className="bg-green-600">Active</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {item.color && (
              <div 
                className="w-full h-24 rounded-lg mb-3"
                style={{ background: item.color === 'rainbow' ? 'linear-gradient(45deg, red, yellow, green, cyan, blue, magenta)' : item.color }}
              />
            )}
            <p className="text-gray-300 text-sm mb-4">{item.description}</p>

            {unlocked ? (
              <Button
                onClick={() => onEquip?.(item, activeField)}
                className="w-full"
                variant={active ? 'outline' : 'default'}
                disabled={active}
              >
                {active ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Equipped
                  </>
                ) : 'Equip'}
              </Button>
            ) : item.unlockType === 'purchase' ? (
              <Button
                onClick={() => onPurchase?.(item, unlockedField, activeField)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                disabled={!canAfford}
              >
                {canAfford ? `${item.price} Leaf` : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    {item.price} Leaf
                  </>
                )}
              </Button>
            ) : (
              <Button className="w-full" disabled variant="outline">
                <Lock className="w-4 h-4 mr-2" />
                {getUnlockText(item)}
              </Button>
            )}
          </CardContent>
        </Card>
      );
    });
  };

  if (category === 'terrain') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderItems(TERRAIN_THEMES, 'unlocked_terrain_themes', 'active_terrain_theme')}
      </div>
    );
  }

  if (category === 'ambient') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderItems(AMBIENT_EFFECTS, 'unlocked_ambient_effects', 'active_ambient_effects')}
      </div>
    );
  }

  if (category === 'spray') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderItems(SPRAY_EFFECTS, 'unlocked_spray_effects', 'active_spray_effect')}
      </div>
    );
  }

  if (category === 'weather') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderItems(WEATHER_PATTERNS, 'unlocked_weather_patterns', 'favorite_weather')}
      </div>
    );
  }

  return null;
}