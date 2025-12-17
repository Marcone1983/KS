import React, { useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('https://raw.githubusercontent.com/base44dev/kurstaki-strikev1/main/public/models/spray.glb');

const EnhancedSprayBottleFPV = forwardRef(({ camera, activePowerUps = [], useGLBModel = true }, ref) => {
  const bottleGroupRef = useRef();
  const triggerRef = useRef();
  const handGroupRef = useRef();
  const fingerRefs = useRef([]);
  const animationProgress = useRef(0);
  const recoilRef = useRef(0);
  const swayRef = useRef({ x: 0, y: 0 });
  const prevMousePos = useRef({ x: 0, y: 0 });
  const pulseRef = useRef(0);
  
  let sprayGLB = null;
  try {
    const loaded = useGLTF('https://raw.githubusercontent.com/base44dev/

  useImperativeHandle(ref, () => ({
    triggerAnimation: (isActive) => {
      animationProgress.current = isActive ? Math.min(1, animationProgress.current + 0.15) : Math.max(0, animationProgress.current - 0.2);
      if (isActive) {
        recoilRef.current = 1.0;
      }
    }
  }));

  useFrame((state, delta) => {
    if (!bottleGroupRef.current || !handGroupRef.current) return;

    const hasRage = activePowerUps.some(p => p.type === 'rage');
    const hasSpeed = activePowerUps.some(p => p.type === 'speed');
    const hasMultishot = activePowerUps.some(p => p.type === 'multishot');
    const hasPierce = activePowerUps.some(p => p.type === 'pierce');

    recoilRef.current = Math.max(0, recoilRef.current - delta * 3.5);
    pulseRef.current += delta * (hasSpeed ? 8 : 4);
    
    const progress = animationProgress.current;
    if (triggerRef.current) {
      triggerRef.current.rotation.x = -Math.sin(progress * Math.PI) * 0.75;
    }

    bottleGroupRef.current.rotation.x = 0.18 - progress * 0.2 - recoilRef.current * 0.12;
    bottleGroupRef.current.position.z = -0.02 + recoilRef.current * 0.08;

    fingerRefs.current.forEach((finger, i) => {
      if (finger) {
        if (i === 0) {
          finger.rotation.z = -0.6 - progress * 0.3;
        } else {
          finger.rotation.x = -0.25 - progress * 0.4;
        }
      }
    });

    const mouseX = (state.mouse.x - prevMousePos.current.x) * 0.5;
    const mouseY = (state.mouse.y - prevMousePos.current.y) * 0.5;
    prevMousePos.current = { x: state.mouse.x, y: state.mouse.y };

    swayRef.current.x += (mouseX * 0.02 - swayRef.current.x) * 0.1;
    swayRef.current.y += (mouseY * 0.02 - swayRef.current.y) * 0.1;

    handGroupRef.current.position.x = 0.48 + swayRef.current.x + Math.sin(state.clock.elapsedTime * 2) * 0.002;
    handGroupRef.current.position.y = -0.52 + swayRef.current.y + Math.cos(state.clock.elapsedTime * 2) * 0.003;
    handGroupRef.current.rotation.y = -0.32 + swayRef.current.x * 0.3;
    handGroupRef.current.rotation.x = 0.18 + swayRef.current.y * 0.2;

    if (hasRage) {
      handGroupRef.current.position.y += Math.sin(state.clock.elapsedTime * 10) * 0.01;
      handGroupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.05;
    }

    if (hasSpeed) {
      handGroupRef.current.scale.setScalar(1.0 + Math.sin(state.clock.elapsedTime * 15) * 0.02);
    }

    if (hasMultishot) {
      bottleGroupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.08;
    }

    if (hasPierce) {
      bottleGroupRef.current.scale.setScalar(1.0 + Math.sin(pulseRef.current) * 0.03);
    }
  });

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xe8f5ff,
    roughness: 0.03,
    transmission: 0.98,
    thickness: 0.9,
    ior: 1.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.95,
    transparent: true,
    opacity: 0.12
  }), []);

  const liquidMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x70c4ff,
    roughness: 0.05,
    transmission: 0.92,
    thickness: 0.7,
    ior: 1.38,
    metalness: 0.0,
    transparent: true,
    opacity: 0.75,
    emissive: 0x4488ff,
    emissiveIntensity: 0.2
  }), []);

  const plasticMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.2,
    metalness: 0.6,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.2
  }), []);

  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xd4a589,
    roughness: 0.7,
    metalness: 0.0,
    normalScale: new THREE.Vector2(0.5, 0.5)
  }), []);

  const nailMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffd4c4,
    roughness: 0.3,
    metalness: 0.1
  }), []);

  return (
    <group ref={handGroupRef} position={[0.48, -0.52, -0.7]} rotation={[0.18, -0.32, 0.05]} scale={1.4}>
      <mesh material={skinMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.22, 0.08]} />
      </mesh>

      <mesh position={[0, -0.02, 0.04]} material={skinMaterial} castShadow>
        <sphereGeometry args={[0.065, 16, 16]} />
      </mesh>
      
      <mesh 
        ref={(el) => (fingerRefs.current[0] = el)}
        position={[-0.07, 0.06, 0.03]} 
        rotation={[0, 0, -0.6]} 
        material={skinMaterial} 
        castShadow
      >
        <boxGeometry args={[0.04, 0.11, 0.04]} />
        <mesh position={[0, 0.06, 0]} material={skinMaterial} castShadow>
          <boxGeometry args={[0.038, 0.05, 0.038]} />
        </mesh>
        <mesh position={[0, 0.09, 0.002]} material={nailMaterial} castShadow>
          <sphereGeometry args={[0.022, 12, 12]} />
        </mesh>
      </mesh>

      {[
        { x: 0.045, y: 0.14, baseRot: -0.15 },
        { x: 0.02, y: 0.16, baseRot: -0.2 },
        { x: -0.01, y: 0.15, baseRot: -0.25 },
        { x: -0.038, y: 0.13, baseRot: -0.2 }
      ].map((finger, i) => (
        <mesh 
          key={i}
          ref={(el) => (fingerRefs.current[i + 1] = el)}
          position={[finger.x, finger.y, 0]} 
          rotation={[-0.25, 0, finger.baseRot]} 
          material={skinMaterial} 
          castShadow
        >
          <boxGeometry args={[0.032, 0.13, 0.032]} />
          <mesh position={[0, 0.07, 0]} rotation-x={-0.1} material={skinMaterial} castShadow>
            <boxGeometry args={[0.03, 0.06, 0.03]} />
          </mesh>
          <mesh position={[0, 0.11, 0.002]} material={nailMaterial} castShadow>
            <sphereGeometry args={[0.018, 12, 12]} />
          </mesh>
        </mesh>
      ))}

      <group ref={bottleGroupRef} position={[0, 0.06, 0.07]} rotation={[0.18, 0.05, 0]}>
        {useGLBModel && sprayGLB ? (
          <primitive object={sprayGLB.clone()} scale={0.15} />
        ) : (
          <>
            <mesh material={glassMaterial} castShadow receiveShadow>
              <cylinderGeometry args={[0.1, 0.11, 0.45, 24]} />
            </mesh>
        
        <mesh position-y={-0.06} material={liquidMaterial}>
          <cylinderGeometry args={[0.095, 0.105, 0.35, 24]} />
        </mesh>

        <mesh position-y={-0.24} material={glassMaterial} castShadow>
          <sphereGeometry args={[0.105, 24, 24]} />
        </mesh>
        
        <mesh ref={triggerRef} position={[0.115, 0.14, 0]} material={plasticMaterial} castShadow>
          <boxGeometry args={[0.06, 0.13, 0.1]} />
          <mesh position={[-0.015, -0.04, 0]} material={plasticMaterial}>
            <cylinderGeometry args={[0.02, 0.025, 0.08, 16]} />
          </mesh>
        </mesh>

        <mesh position-y={0.27} material={plasticMaterial} castShadow>
          <cylinderGeometry args={[0.085, 0.1, 0.09, 24]} />
        </mesh>

        <mesh position={[0.09, 0.27, 0]} rotation-z={Math.PI / 2} material={plasticMaterial} castShadow>
          <cylinderGeometry args={[0.025, 0.032, 0.05, 18]} />
        </mesh>

        <mesh position={[0.16, 0.27, 0]} rotation-z={-Math.PI / 2} material={plasticMaterial} castShadow>
          <coneGeometry args={[0.018, 0.05, 16]} />
        </mesh>

        <mesh position={[0.2, 0.27, 0]} material={plasticMaterial} castShadow>
          <sphereGeometry args={[0.012, 12, 12]} />
        </mesh>

        <mesh position={[0, 0.15, 0.08]} rotation-x={Math.PI / 2} material={plasticMaterial}>
          <cylinderGeometry args={[0.035, 0.03, 0.12, 16]} />
        </mesh>

        {activePowerUps.some(p => p.type === 'rage') && (
          <pointLight position={[0, 0, 0]} intensity={1.5} distance={2} color="#ff0000" />
        )}
        {activePowerUps.some(p => p.type === 'speed') && (
          <pointLight position={[0, 0, 0]} intensity={1.2} distance={2} color="#00ffff" />
        )}
        {activePowerUps.some(p => p.type === 'multishot') && (
          <pointLight position={[0, 0, 0]} intensity={1.3} distance={2} color="#ff00ff" />
        )}
          </>
        )}
      </group>

      <pointLight position={[0.1, 0.2, 0.1]} intensity={0.3} distance={1.5} color="#ffd4c4" />
    </group>
  );
});

export default EnhancedSprayBottleFPV;