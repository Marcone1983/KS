import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCw, Save, Plus, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

function DecorationModel({ decoration, position, rotation, scale, isSelected, onClick, onDrag }) {
  const meshRef = useRef();
  const [isDragging, setIsDragging] = useState(false);

  const geometries = {
    fence: <boxGeometry args={[2, 0.8, 0.1]} />,
    statue: <coneGeometry args={[0.3, 1.2, 8]} />,
    fountain: <cylinderGeometry args={[0.5, 0.6, 0.8, 16]} />,
    rock: <dodecahedronGeometry args={[0.4]} />,
    flower_bed: <boxGeometry args={[1.5, 0.2, 0.8]} />,
    lamp: <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />,
    bench: <boxGeometry args={[1.2, 0.4, 0.5]} />,
    path: <boxGeometry args={[1, 0.05, 1]} />
  };

  const colors = {
    fence: '#8B4513',
    statue: '#A9A9A9',
    fountain: '#4682B4',
    rock: '#696969',
    flower_bed: '#228B22',
    lamp: '#FFD700',
    bench: '#CD853F',
    path: '#D2691E'
  };

  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    onClick?.();
  };

  const handlePointerMove = (e) => {
    if (isDragging && onDrag) {
      const newPos = [e.point.x, position[1], e.point.z];
      onDrag(newPos);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
      onClick={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      castShadow
      receiveShadow
    >
      {geometries[decoration.decoration_type] || <boxGeometry args={[1, 1, 1]} />}
      <meshStandardMaterial
        color={colors[decoration.decoration_type] || '#888888'}
        emissive={isSelected ? '#ffffff' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
        roughness={0.7}
        metalness={decoration.decoration_type === 'statue' ? 0.8 : 0.2}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[geometries[decoration.decoration_type]?.args || [1, 1, 1]]} />
          <lineBasicMaterial attach="material" color="#ffff00" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}

function TerrainWithSoil({ soilType, decorations }) {
  const meshRef = useRef();

  const soilColors = {
    default: '#8B7355',
    sandy: '#C2B280',
    clay: '#B87333',
    loamy: '#6B4423',
    peaty: '#3E2723',
    chalky: '#E0DDD5',
    enriched: '#654321'
  };

  return (
    <>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={soilType?.texture_color || soilColors.default}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>
      <Grid args={[50, 50]} cellSize={1} cellColor="#666666" sectionColor="#888888" fadeDistance={25} />
    </>
  );
}

function GardenScene({ decorations, soilType, selectedId, onSelectDecoration, onDragDecoration }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={60} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={30}
      />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <hemisphereLight args={['#87ceeb', '#8B7355', 0.5]} />

      <TerrainWithSoil soilType={soilType} decorations={decorations} />

      {decorations.map((placed) => (
        <DecorationModel
          key={placed.id}
          decoration={placed.decorationData}
          position={[placed.position.x, placed.position.y, placed.position.z]}
          rotation={placed.rotation}
          scale={placed.scale}
          isSelected={placed.id === selectedId}
          onClick={() => onSelectDecoration(placed.id)}
          onDrag={(newPos) => onDragDecoration(placed.id, newPos)}
        />
      ))}

      <fog attach="fog" args={['#87ceeb', 15, 40]} />
    </>
  );
}

export default function GardenBuilder3D() {
  const queryClient = useQueryClient();
  const [selectedDecorationId, setSelectedDecorationId] = useState(null);
  const [previewDecoration, setPreviewDecoration] = useState(null);
  const [currentSoilType, setCurrentSoilType] = useState(null);

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const list = await base44.entities.GameProgress.list();
      return list[0] || null;
    }
  });

  const { data: allDecorations } = useQuery({
    queryKey: ['gardenDecorations'],
    queryFn: () => base44.entities.GardenDecoration.list(),
    initialData: []
  });

  const { data: allSoils } = useQuery({
    queryKey: ['soilTypes'],
    queryFn: () => base44.entities.SoilType.list(),
    initialData: []
  });

  const { data: placedDecorations } = useQuery({
    queryKey: ['placedDecorations'],
    queryFn: async () => {
      const placed = await base44.entities.PlacedDecoration.list();
      const withData = await Promise.all(
        placed.map(async (p) => {
          const decor = allDecorations.find(d => d.id === p.decoration_id);
          return { ...p, decorationData: decor };
        })
      );
      return withData.filter(p => p.decorationData);
    },
    enabled: allDecorations.length > 0,
    initialData: []
  });

  const placeDecorationMutation = useMutation({
    mutationFn: (data) => base44.entities.PlacedDecoration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placedDecorations'] });
      toast.success('Decorazione posizionata!');
    }
  });

  const updateDecorationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlacedDecoration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placedDecorations'] });
    }
  });

  const deleteDecorationMutation = useMutation({
    mutationFn: (id) => base44.entities.PlacedDecoration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placedDecorations'] });
      setSelectedDecorationId(null);
      toast.success('Decorazione rimossa!');
    }
  });

  const applySoilMutation = useMutation({
    mutationFn: async ({ soilId }) => {
      if (!progress?.id) return;
      return base44.entities.GameProgress.update(progress.id, {
        active_soil: soilId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
      toast.success('Terreno applicato!');
    }
  });

  useEffect(() => {
    if (progress?.active_soil && allSoils.length > 0) {
      const soil = allSoils.find(s => s.id === progress.active_soil);
      setCurrentSoilType(soil);
    }
  }, [progress?.active_soil, allSoils]);

  const handlePlaceDecoration = (decorationId) => {
    const decoration = allDecorations.find(d => d.id === decorationId);
    if (!decoration) return;

    if (progress?.leaf_currency < decoration.price) {
      toast.error('Leaf insufficienti!');
      return;
    }

    const randomX = (Math.random() - 0.5) * 15;
    const randomZ = (Math.random() - 0.5) * 15;

    placeDecorationMutation.mutate({
      decoration_id: decorationId,
      position: { x: randomX, y: 0, z: randomZ },
      rotation: 0,
      scale: 1.0
    });
  };

  const handleDragDecoration = (id, newPosition) => {
    const decoration = placedDecorations.find(d => d.id === id);
    if (!decoration) return;

    updateDecorationMutation.mutate({
      id,
      data: {
        ...decoration,
        position: { x: newPosition[0], y: newPosition[1], z: newPosition[2] }
      }
    });
  };

  const handleRotateSelected = () => {
    const decoration = placedDecorations.find(d => d.id === selectedDecorationId);
    if (!decoration) return;

    updateDecorationMutation.mutate({
      id: selectedDecorationId,
      data: {
        ...decoration,
        rotation: (decoration.rotation + Math.PI / 4) % (Math.PI * 2)
      }
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedDecorationId) return;
    deleteDecorationMutation.mutate(selectedDecorationId);
  };

  const handleApplySoil = (soilId) => {
    const soil = allSoils.find(s => s.id === soilId);
    if (!soil || !progress) return;

    if (progress.leaf_currency < soil.price) {
      toast.error('Leaf insufficienti!');
      return;
    }

    applySoilMutation.mutate({ soilId });
  };

  return (
    <div className="h-screen w-full flex">
      <div className="flex-1 relative">
        <Canvas shadows>
          <GardenScene
            decorations={placedDecorations}
            soilType={currentSoilType}
            selectedId={selectedDecorationId}
            onSelectDecoration={setSelectedDecorationId}
            onDragDecoration={handleDragDecoration}
          />
        </Canvas>

        {selectedDecorationId && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            <Button onClick={handleRotateSelected} size="sm">
              <RotateCw className="h-4 w-4 mr-2" />
              Ruota
            </Button>
            <Button onClick={handleDeleteSelected} size="sm" variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Rimuovi
            </Button>
          </div>
        )}
      </div>

      <div className="w-80 bg-gray-900 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Garden Builder</h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Terreno</h3>
          <div className="space-y-2">
            {allSoils.map(soil => (
              <Card
                key={soil.id}
                className={`cursor-pointer transition-all ${
                  currentSoilType?.id === soil.id
                    ? 'border-green-500 border-2'
                    : 'border-gray-700'
                }`}
                onClick={() => handleApplySoil(soil.id)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-white font-semibold text-sm">{soil.soil_name}</span>
                    <span className="text-green-400 text-xs">{soil.price} Leaf</span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Crescita: x{soil.growth_rate_multiplier}</div>
                    <div>Ritenzione H2O: x{soil.water_retention}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Decorazioni</h3>
          <div className="space-y-2">
            {allDecorations.map(decoration => (
              <Card
                key={decoration.id}
                className="cursor-pointer hover:border-blue-500 transition-all border-gray-700"
                onClick={() => handlePlaceDecoration(decoration.id)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-white font-semibold text-sm">{decoration.decoration_name}</span>
                    <span className="text-green-400 text-xs">{decoration.price} Leaf</span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    {decoration.defense_bonus > 0 && (
                      <div>Difesa: +{decoration.defense_bonus}%</div>
                    )}
                    {decoration.growth_bonus > 0 && (
                      <div>Crescita: +{decoration.growth_bonus}%</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}