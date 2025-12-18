/**
 * Hook per ottimizzazione performance 3D
 * Implementa LOD (Level of Detail), frustum culling, e gestione memoria
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as THREE from 'three';

interface PerformanceSettings {
  maxFPS: number;
  shadowsEnabled: boolean;
  particleCount: number;
  lodDistance: number;
  antialias: boolean;
  pixelRatio: number;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
}

const DEFAULT_SETTINGS: PerformanceSettings = {
  maxFPS: 60,
  shadowsEnabled: true,
  particleCount: 100,
  lodDistance: 10,
  antialias: true,
  pixelRatio: Platform.OS === 'ios' ? 2 : 1.5,
};

const LOW_PERFORMANCE_SETTINGS: PerformanceSettings = {
  maxFPS: 30,
  shadowsEnabled: false,
  particleCount: 30,
  lodDistance: 5,
  antialias: false,
  pixelRatio: 1,
};

export function use3DPerformance() {
  const [settings, setSettings] = useState<PerformanceSettings>(DEFAULT_SETTINGS);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: 0,
  });
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const appStateRef = useRef<AppStateStatus>('active');

  // Monitor app state for background optimization
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Reduce performance when app is in background
        setIsLowPowerMode(true);
      } else if (nextAppState === 'active') {
        setIsLowPowerMode(false);
      }
    });

    return () => subscription.remove();
  }, []);

  // Auto-adjust settings based on performance
  useEffect(() => {
    if (isLowPowerMode) {
      setSettings(LOW_PERFORMANCE_SETTINGS);
    } else if (metrics.fps < 30) {
      // Auto-reduce quality if FPS drops below 30
      setSettings(prev => ({
        ...prev,
        shadowsEnabled: false,
        particleCount: Math.max(20, prev.particleCount - 20),
        pixelRatio: Math.max(1, prev.pixelRatio - 0.5),
      }));
    } else if (metrics.fps > 55 && settings.pixelRatio < DEFAULT_SETTINGS.pixelRatio) {
      // Restore quality if FPS is stable
      setSettings(prev => ({
        ...prev,
        pixelRatio: Math.min(DEFAULT_SETTINGS.pixelRatio, prev.pixelRatio + 0.25),
      }));
    }
  }, [metrics.fps, isLowPowerMode]);

  // Calculate FPS
  const trackFrame = useCallback(() => {
    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
    const fps = Math.round(1000 / avgFrameTime);

    setMetrics(prev => ({
      ...prev,
      fps,
      frameTime: avgFrameTime,
    }));
  }, []);

  // Optimize geometry for LOD
  const createLODMesh = useCallback((
    highDetail: THREE.BufferGeometry,
    mediumDetail: THREE.BufferGeometry,
    lowDetail: THREE.BufferGeometry,
    material: THREE.Material
  ): THREE.LOD => {
    const lod = new THREE.LOD();
    
    const highMesh = new THREE.Mesh(highDetail, material);
    const mediumMesh = new THREE.Mesh(mediumDetail, material);
    const lowMesh = new THREE.Mesh(lowDetail, material);
    
    lod.addLevel(highMesh, 0);
    lod.addLevel(mediumMesh, settings.lodDistance);
    lod.addLevel(lowMesh, settings.lodDistance * 2);
    
    return lod;
  }, [settings.lodDistance]);

  // Dispose of Three.js resources
  const disposeObject = useCallback((object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }, []);

  // Optimize texture loading
  const loadOptimizedTexture = useCallback(async (
    url: string,
    maxSize: number = 1024
  ): Promise<THREE.Texture> => {
    const loader = new THREE.TextureLoader();
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    // Optimize texture settings
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = settings.antialias ? 4 : 1;

    return texture;
  }, [settings.antialias]);

  // Get optimized particle count
  const getParticleCount = useCallback((baseCount: number): number => {
    return Math.round(baseCount * (settings.particleCount / 100));
  }, [settings.particleCount]);

  // Check if shadows should be rendered
  const shouldRenderShadows = useCallback((): boolean => {
    return settings.shadowsEnabled && !isLowPowerMode;
  }, [settings.shadowsEnabled, isLowPowerMode]);

  // Force low power mode (for battery saving)
  const enableLowPowerMode = useCallback(() => {
    setIsLowPowerMode(true);
    setSettings(LOW_PERFORMANCE_SETTINGS);
  }, []);

  // Restore normal performance
  const disableLowPowerMode = useCallback(() => {
    setIsLowPowerMode(false);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Get canvas props for optimal performance
  const getCanvasProps = useCallback(() => ({
    gl: {
      antialias: settings.antialias,
      alpha: true,
      powerPreference: isLowPowerMode ? 'low-power' : 'high-performance',
      preserveDrawingBuffer: false,
    },
    dpr: settings.pixelRatio,
    frameloop: isLowPowerMode ? 'demand' : 'always',
  }), [settings, isLowPowerMode]);

  return {
    settings,
    metrics,
    isLowPowerMode,
    trackFrame,
    createLODMesh,
    disposeObject,
    loadOptimizedTexture,
    getParticleCount,
    shouldRenderShadows,
    enableLowPowerMode,
    disableLowPowerMode,
    getCanvasProps,
  };
}

// Utility: Simplified geometry generators for LOD
export const LODGeometries = {
  sphere: {
    high: () => new THREE.SphereGeometry(1, 32, 32),
    medium: () => new THREE.SphereGeometry(1, 16, 16),
    low: () => new THREE.SphereGeometry(1, 8, 8),
  },
  box: {
    high: () => new THREE.BoxGeometry(1, 1, 1, 4, 4, 4),
    medium: () => new THREE.BoxGeometry(1, 1, 1, 2, 2, 2),
    low: () => new THREE.BoxGeometry(1, 1, 1, 1, 1, 1),
  },
  cylinder: {
    high: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
    medium: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    low: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  },
};

// Utility: Object pooling for particles
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  clear(): void {
    this.pool = [];
  }

  get size(): number {
    return this.pool.length;
  }
}
