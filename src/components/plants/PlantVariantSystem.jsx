import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const PLANT_VARIANTS = {
  cannabis_indica: {
    modelPath: '/models/plant01.glb',
    stats: {
      baseHealth: 120,
      growthSpeed: 0.8,
      pestResistance: 25,
      waterNeeds: 'high',
      nutrientNeeds: 'high'
    },
    vulnerabilities: ['spider_mite', 'aphid'],
    resistances: ['whitefly'],
    visualTraits: {
      color: '#2d5016',
      leafShape: 'broad',
      height: 1.2,
      bushiness: 1.4
    },
    specialAbility: 'thick_stem',
    description: 'Resistente, crescita robusta ma lenta'
  },
  cannabis_sativa: {
    modelPath: '/models/plant02.glb',
    stats: {
      baseHealth: 100,
      growthSpeed: 1.2,
      pestResistance: 15,
      waterNeeds: 'medium',
      nutrientNeeds: 'medium'
    },
    vulnerabilities: ['caterpillar', 'grasshopper'],
    resistances: ['fungus_gnat'],
    visualTraits: {
      color: '#3a6020',
      leafShape: 'narrow',
      height: 1.8,
      bushiness: 0.9
    },
    specialAbility: 'fast_growth',
    description: 'Crescita rapida ma più fragile'
  },
  cannabis_ruderalis: {
    modelPath: '/models/plant03.glb',
    stats: {
      baseHealth: 90,
      growthSpeed: 1.0,
      pestResistance: 35,
      waterNeeds: 'low',
      nutrientNeeds: 'low'
    },
    vulnerabilities: ['thrip'],
    resistances: ['spider_mite', 'whitefly', 'aphid'],
    visualTraits: {
      color: '#4a7028',
      leafShape: 'small',
      height: 0.8,
      bushiness: 1.0
    },
    specialAbility: 'auto_flower',
    description: 'Compatta, molto resistente ai parassiti'
  },
  cannabis_hybrid: {
    modelPath: '/models/plant04.glb',
    stats: {
      baseHealth: 110,
      growthSpeed: 1.0,
      pestResistance: 20,
      waterNeeds: 'medium',
      nutrientNeeds: 'high'
    },
    vulnerabilities: ['fungal_spreader'],
    resistances: ['grasshopper'],
    visualTraits: {
      color: '#356018',
      leafShape: 'mixed',
      height: 1.4,
      bushiness: 1.2
    },
    specialAbility: 'balanced',
    description: 'Bilanciata, adatta a tutti gli stili'
  },
  cannabis_purple: {
    modelPath: '/models/plant01.glb',
    stats: {
      baseHealth: 95,
      growthSpeed: 0.9,
      pestResistance: 18,
      waterNeeds: 'high',
      nutrientNeeds: 'very_high'
    },
    vulnerabilities: ['aphid', 'whitefly'],
    resistances: ['caterpillar'],
    visualTraits: {
      color: '#6B2D5C',
      leafShape: 'broad',
      height: 1.1,
      bushiness: 1.3
    },
    specialAbility: 'anthocyanin_boost',
    description: 'Rara, richiede cure costanti'
  }
};

export function PlantVariant({ variantKey, position, scale = 1, onDamage, currentHealth, maxHealth }) {
  const groupRef = useRef();
  const glowRef = useRef();
  const variant = PLANT_VARIANTS[variantKey];
  
  const healthPercent = currentHealth / maxHealth;
  const isLowHealth = healthPercent < 0.3;

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    
    if (variant.specialAbility === 'fast_growth') {
      const growthPulse = Math.sin(time * 2) * 0.02;
      groupRef.current.scale.y = scale * (1 + growthPulse);
    }

    if (isLowHealth) {
      groupRef.current.rotation.z = Math.sin(time * 4) * 0.05;
    }

    if (glowRef.current && variant.specialAbility === 'anthocyanin_boost') {
      glowRef.current.material.opacity = 0.3 + Math.sin(time * 1.5) * 0.1;
    }
  });

  const leafMaterial = useMemo(() => {
    const color = new THREE.Color(variant.visualTraits.color);
    if (isLowHealth) {
      color.lerp(new THREE.Color('#8B4513'), 0.5);
    }

    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
  }, [variant.visualTraits.color, isLowHealth]);

  return (
    <group ref={groupRef} position={position}>
      <group scale={[scale * variant.visualTraits.bushiness, scale * variant.visualTraits.height, scale * variant.visualTraits.bushiness]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.08, 1.2, 8]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>

        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const height = 0.3 + (i * 0.12);
          const radius = 0.15 + Math.sin(i * 0.5) * 0.05;

          return (
            <group key={i} position={[0, height, 0]} rotation={[0, angle, Math.PI / 6]}>
              <mesh castShadow material={leafMaterial}>
                <planeGeometry args={[0.4, 0.25]} />
              </mesh>
              <mesh castShadow material={leafMaterial} rotation={[0, Math.PI / 5, 0]} position={[0.15, 0, 0]}>
                <planeGeometry args={[0.25, 0.18]} />
              </mesh>
              <mesh castShadow material={leafMaterial} rotation={[0, -Math.PI / 5, 0]} position={[-0.15, 0, 0]}>
                <planeGeometry args={[0.25, 0.18]} />
              </mesh>
            </group>
          );
        })}

        {variant.specialAbility === 'thick_stem' && (
          <mesh position={[0, 0.6, 0]} castShadow>
            <torusGeometry args={[0.12, 0.03, 8, 16]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.85} />
          </mesh>
        )}

        {variant.specialAbility === 'anthocyanin_boost' && (
          <mesh ref={glowRef} position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial color={variant.visualTraits.color} transparent opacity={0.2} />
          </mesh>
        )}
      </group>

      {isLowHealth && (
        <mesh position={[0, 0.3, 0]}>
          <ringGeometry args={[0.4, 0.5, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function getPlantTypeStats(variantKey) {
  return PLANT_VARIANTS[variantKey]?.stats || PLANT_VARIANTS.cannabis_hybrid.stats;
}

export function getPlantVulnerabilities(variantKey) {
  return PLANT_VARIANTS[variantKey]?.vulnerabilities || [];
}

export function getPlantResistances(variantKey) {
  return PLANT_VARIANTS[variantKey]?.resistances || [];
}

export function calculatePestDamageMultiplier(plantVariantKey, pestType) {
  const variant = PLANT_VARIANTS[plantVariantKey];
  if (!variant) return 1.0;

  if (variant.vulnerabilities.includes(pestType)) {
    return 1.5;
  }

  if (variant.resistances.includes(pestType)) {
    return 0.6;
  }

  return 1.0;
}

export function getAllPlantVariants() {
  return Object.keys(PLANT_VARIANTS).map(key => ({
    id: key,
    ...PLANT_VARIANTS[key]
  }));
}

export { PLANT_VARIANTS };