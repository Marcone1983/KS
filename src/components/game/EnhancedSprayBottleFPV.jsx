import React, { useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const EnhancedSprayBottleFPV = forwardRef(({ camera, activePowerUps = [] }, ref) => {
  const bottleGroupRef = useRef();
  const triggerRef = useRef();
  const handGroupRef = useRef();
  const fingerRefs = useRef([]);
  const animationProgress = useRef(0);
  const recoilRef = useRef(0);
  const swayRef = useRef({ x: 0, y: 0 });
  const prevMousePos = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    triggerAnimation: (isActive) => {
      animationProgress.current = isActive ? Math.min(1, animationProgress.current + 0.15) : Math.max(0, animationProgress.current - 0.2);
      if (isActive) {
        recoilRef.current = 1.0;
      }
    }
  }));

  const { gl } = useThree();

  useFrame((state, delta) => {
    if (!bottleGroupRef.current || !handGroupRef.current) return;

    const hasRage = activePowerUps.some(p => p.type === 'rage');
    const hasSpeed = activePowerUps.some(p => p.type === 'speed');
    const hasMultishot = activePowerUps.some(p => p.type === 'multishot');

    recoilRef.current = Math.max(0, recoilRef.current - delta * 3);
    
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