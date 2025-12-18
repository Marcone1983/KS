import React, { useState, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SprayablePlant, { PLANT_MODELS } from './SprayablePlant';

export default function PlantTargetingSystem({ plantCount = 10, onPlantSprayed, onTargetChange, debugMode = false }) {
  const { camera, scene } = useThree();
  const [plants, setPlants] = useState([]);
  const [targetedPlantId, setTargetedPlantId] = useState(null);
  const [targetedPlantState, setTargetedPlantState] = useState(null);
  const [sprayedPlants, setSprayedPlants] = useState(new Set());
  const raycaster = useRef(new THREE.Raycaster());
  const centerPoint = useRef(new THREE.Vector2(0, 0));
  const plantStatesRef = useRef(new Map());

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
        if (obj.userData.plantId && obj.userData.state) {
          plantStatesRef.current.set(obj.userData.plantId, obj.userData.state);
        }
      }
    });

    const intersects = raycaster.current.intersectObjects(allObjects, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const plantId = hit.object.userData.plantId;
      const plantState = plantStatesRef.current.get(plantId);
      
      if (plantId) {
        setTargetedPlantId(plantId);
        setTargetedPlantState(plantState);
        if (onTargetChange) {
          onTargetChange(plantId, plantState);
        }
      } else {
        setTargetedPlantId(null);
        setTargetedPlantState(null);
        if (onTargetChange) {
          onTargetChange(null, null);
        }
      }
    } else {
      setTargetedPlantId(null);
      setTargetedPlantState(null);
      if (onTargetChange) {
        onTargetChange(null, null);
      }
    }
  });

  const handlePlantSpray = (plantId, previousState) => {
    console.log(`💧 Plant sprayed: ${plantId}, was in state: ${previousState}`);
    setSprayedPlants(prev => new Set([...prev, plantId]));
    if (onPlantSprayed) {
      onPlantSprayed(plantId, previousState);
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