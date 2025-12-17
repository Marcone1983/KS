import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { createPageUrl } from '../utils';
import GardenBuilder3D from '../components/garden/GardenBuilder3D';

export default function GardenBuilder() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-gray-900 relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          onClick={() => navigate(createPageUrl('Home'))}
          variant="outline"
          className="bg-black/50 backdrop-blur border-white/20 text-white hover:bg-black/70"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur rounded-lg p-4 text-white max-w-xs">
        <h3 className="font-bold mb-2">Garden Builder</h3>
        <ul className="text-sm space-y-1">
          <li>• Click per selezionare decorazione</li>
          <li>• Drag per spostare</li>
          <li>• Rotazione con pulsante</li>
          <li>• Decorazioni danno bonus difesa/crescita</li>
          <li>• Terreni influenzano statistiche pianta</li>
        </ul>
      </div>

      <GardenBuilder3D />
    </div>
  );
}