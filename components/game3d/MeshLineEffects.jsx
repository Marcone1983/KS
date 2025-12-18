import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

extend({ MeshLineGeometry, MeshLineMaterial });

export function SprayTrail({ 
  points = [], 
  color = 0x80d4ff, 
  width = 0.05,
  opacity = 0.6 
}) {
  const lineRef = useRef();

  const geometry = useMemo(() => {
    const geo = new MeshLineGeometry();
    geo.setPoints(points.flat());
    return geo;
  }, [points]);

  return (
    <mesh geometry={geometry}>
      <meshLineMaterial
        color={color}
        lineWidth={width}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function EnergyBeam({ 
  start = [0, 0, 0], 
  end = [0, 0, -5],
  color = 0x00ffff,
  animated = true 
}) {
  const lineRef = useRef();
  const materialRef = useRef();

  const points = useMemo(() => {
    const segments = 20;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pts.push(
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
        start[2] + (end[2] - start[2]) * t
      );
    }
    return pts;
  }, [start, end]);

  useFrame((state) => {
    if (animated && materialRef.current) {
      materialRef.current.uniforms.dashOffset.value -= 0.01;
    }
  });

  const geometry = useMemo(() => {
    const geo = new MeshLineGeometry();
    geo.setPoints(points);
    return geo;
  }, [points]);

  return (
    <mesh geometry={geometry}>
      <meshLineMaterial
        ref={materialRef}
        color={color}
        lineWidth={0.1}
        transparent
        opacity={0.8}
        dashArray={0.1}
        dashRatio={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function PestPathLine({ 
  path = [], 
  color = 0xff0000,
  width = 0.02 
}) {
  const geometry = useMemo(() => {
    if (path.length < 2) return null;
    const geo = new MeshLineGeometry();
    geo.setPoints(path.flat());
    return geo;
  }, [path]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshLineMaterial
        color={color}
        lineWidth={width}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </mesh>
  );
}

export function DNAStrand({ 
  points = [], 
  color = 0x00ff00,
  animated = true 
}) {
  const materialRef = useRef();

  useFrame((state) => {
    if (animated && materialRef.current) {
      materialRef.current.uniforms.dashOffset.value = Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  const geometry = useMemo(() => {
    const geo = new MeshLineGeometry();
    geo.setPoints(points.flat());
    return geo;
  }, [points]);

  return (
    <mesh geometry={geometry}>
      <meshLineMaterial
        ref={materialRef}
        color={color}
        lineWidth={0.05}
        transparent
        opacity={0.9}
        dashArray={0.05}
        dashRatio={0.5}
        sizeAttenuation
      />
    </mesh>
  );
}

export function ElectricArc({ 
  start = [0, 0, 0], 
  end = [0, 0, 0],
  color = 0xffff00,
  segments = 15 
}) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const randomOffset = (Math.random() - 0.5) * 0.2;
      pts.push(
        start[0] + (end[0] - start[0]) * t + randomOffset,
        start[1] + (end[1] - start[1]) * t + randomOffset,
        start[2] + (end[2] - start[2]) * t + randomOffset
      );
    }
    return pts;
  }, [start, end, segments]);

  const geometry = useMemo(() => {
    const geo = new MeshLineGeometry();
    geo.setPoints(points);
    return geo;
  }, [points]);

  return (
    <mesh geometry={geometry}>
      <meshLineMaterial
        color={color}
        lineWidth={0.08}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
      <pointLight position={end} color={color} intensity={2} distance={2} />
    </mesh>
  );
}

export default {
  SprayTrail,
  EnergyBeam,
  PestPathLine,
  DNAStrand,
  ElectricArc,
  TroikaText3D,
  AnimatedScore,
  FloatingDamageNumber
};