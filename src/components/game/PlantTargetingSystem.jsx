import React, { useState, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SprayablePlant, { PLANT_MODELS } from './SprayablePlant';

export default function PlantTargetingSystem({ plantCount = 10, onPlantSprayed, debugMode = false }) {
  const { camera, scene } = useThree();
  const [plants, setPlants] = useState([]);
  const [targetedPlantId, setTargetedPlantId] = useState(null);
  const [sprayedPlants, setSprayedPlants] = useState(new Set());
  const raycaster = useRef(new THREE.Raycaster());
  const centerPoint = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const plantInstances = [];
    
    plantInstances.push({
      id: 'debug-plant',
      modelPath: PLANT_MODELS[0],
      position: [0, 0, 0],
      scale: 3
    });

    for (let i = 0; i < plantCount; i++) {
      const angle = (i / plantCount) * Math.PI * 2;
      const distance = 5 + Math.random() * 8;
      const modelPath = PLANT_MODELS[Math.floor(Math.random() * PLANT_MODELS.length)];
      
      plantInstances.push({
        id: `plant-${i}`,
        modelPath,
        position: [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ],
        scale: 0.8 + Math.random() * 0.4
      });
    }
    
    setPlants(plantInstances);
    console.log(`Total plants spawned: ${plantInstances.length} (1 debug + ${plantCount} gameplay)`);
  }, [plantCount]);

  useFrame(() => {
    raycaster.current.setFromCamera(centerPoint.current, camera);
    
    const allObjects = [];
    scene.traverse((obj) => {
      if (obj.userData.isPlant && obj.isMesh) {
        allObjects.push(obj);
      }
    });

    const intersects = raycaster.current.intersectObjects(allObjects, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const plantId = hit.object.userData.plantId;
      if (plantId && !sprayedPlants.has(plantId)) {
        setTargetedPlantId(plantId);
      } else {
        setTargetedPlantId(null);
      }
    } else {
      setTargetedPlantId(null);
    }
  });

  const handlePlantSpray = (plantId) => {
    setSprayedPlants(prev => new Set([...prev, plantId]));
    if (onPlantSprayed) {
      onPlantSprayed(plantId);
    }
  };

  return (
    <group>
      {plants.map((plant) => (
        <SprayablePlant
          key={plant.id}
          id={plant.id}
          modelPath={plant.modelPath}
          position={plant.position}
          scale={plant.scale}
          onSpray={handlePlantSpray}
          isTargeted={targetedPlantId === plant.id}
          debugMode={debugMode}
        />
      ))}
    </group>
  );
}