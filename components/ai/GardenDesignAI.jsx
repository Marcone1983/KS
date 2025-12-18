import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GardenDesignAI({ 
  currentProgress, 
  availableSeeds = [],
  onApplyDesign 
}) {
  const [loading, setLoading] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [designSuggestion, setDesignSuggestion] = useState(null);

  const AESTHETIC_PRESETS = [
    { id: 'zen', name: 'Zen Garden', description: 'Minimalista e rilassante' },
    { id: 'tropical', name: 'Tropical Paradise', description: 'Lussureggiante e colorato' },
    { id: 'desert', name: 'Desert Oasis', description: 'Resistente e essenziale' },
    { id: 'forest', name: 'Forest Grove', description: 'Naturale e organico' },
    { id: 'modern', name: 'Modern Minimalist', description: 'Pulito e geometrico' },
    { id: 'rustic', name: 'Rustic Farm', description: 'Tradizionale e accogliente' }
  ];

  const handleGenerateDesign = async (aesthetic) => {
    setLoading(true);
    
    const prompt = userPrompt || `Design a ${aesthetic.name} style virtual cannabis garden. 
    Consider these available strains: ${availableSeeds.map(s => s.strain_name).join(', ')}.
    Current environmental conditions: temperature 22°C, humidity 55%.
    Player level: ${currentProgress?.current_level || 1}.
    
    Provide a JSON design with:
    - plant_arrangement: array of {strain_id, position: {x, y, z}, pot_type}
    - decorations: array of {type, position: {x, y, z}, color}
    - lighting_scheme: {ambient_color, accent_lights: array}
    - color_palette: {primary, secondary, accent}
    - layout_description: string explaining the design philosophy`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plant_arrangement: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strain_id: { type: "string" },
                position: { 
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    z: { type: "number" }
                  }
                },
                pot_type: { type: "string" }
              }
            }
          },
          decorations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                position: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    z: { type: "number" }
                  }
                },
                color: { type: "string" }
              }
            }
          },
          lighting_scheme: {
            type: "object",
            properties: {
              ambient_color: { type: "string" },
              accent_lights: {
                type: "array",
                items: {
                  type: "object"
                }
              }
            }
          },
          color_palette: {
            type: "object",
            properties: {
              primary: { type: "string" },
              secondary: { type: "string" },
              accent: { type: "string" }
            }
          },
          layout_description: { type: "string" }
        }
      }
    });

    setDesignSuggestion({
      ...response,
      aesthetic: aesthetic.id
    });
    setLoading(false);
    toast.success('Design generated!');
  };

  const handleApplyDesign = () => {
    if (designSuggestion && onApplyDesign) {
      onApplyDesign(designSuggestion);
      toast.success('Design applied to your garden!');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/40 backdrop-blur border-purple-500/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            AI Garden Designer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-white text-sm mb-2 block">Custom Instructions (Optional)</label>
            <Textarea
              placeholder="e.g., I want lots of purple plants, symmetrical layout, focus on medicinal strains..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="bg-white/10 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          <div>
            <label className="text-white text-sm mb-3 block">Choose Aesthetic</label>
            <div className="grid grid-cols-2 gap-3">
              {AESTHETIC_PRESETS.map(aesthetic => (
                <Button
                  key={aesthetic.id}
                  onClick={() => handleGenerateDesign(aesthetic)}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-auto py-4 flex-col items-start"
                >
                  <div className="font-bold text-left">{aesthetic.name}</div>
                  <div className="text-xs text-gray-200 text-left">{aesthetic.description}</div>
                </Button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <span className="ml-3 text-white">Generating design...</span>
            </div>
          )}

          {designSuggestion && !loading && (
            <div className="bg-black/30 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-600">{designSuggestion.aesthetic} Style</Badge>
                <Button
                  onClick={handleApplyDesign}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Apply Design
                </Button>
              </div>

              <div>
                <div className="text-white font-bold mb-2">Layout Description</div>
                <p className="text-gray-300 text-sm">{designSuggestion.layout_description}</p>
              </div>

              <div>
                <div className="text-white font-bold mb-2">Color Palette</div>
                <div className="flex gap-2">
                  <div
                    className="w-16 h-16 rounded-lg border-2 border-white"
                    style={{ backgroundColor: designSuggestion.color_palette?.primary }}
                    title="Primary"
                  />
                  <div
                    className="w-16 h-16 rounded-lg border-2 border-white"
                    style={{ backgroundColor: designSuggestion.color_palette?.secondary }}
                    title="Secondary"
                  />
                  <div
                    className="w-16 h-16 rounded-lg border-2 border-white"
                    style={{ backgroundColor: designSuggestion.color_palette?.accent }}
                    title="Accent"
                  />
                </div>
              </div>

              <div>
                <div className="text-white font-bold mb-2">Plants: {designSuggestion.plant_arrangement?.length || 0}</div>
                <div className="text-white font-bold mb-2">Decorations: {designSuggestion.decorations?.length || 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}