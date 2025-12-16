import React, { useMemo } from 'react';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  SSAO,
  ChromaticAberration,
  Vignette,
  ToneMapping,
  ColorGrading,
  Noise,
  SMAA,
  SSR,
  GodRays
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode, SSREffect, KernelSize } from 'postprocessing';
import * as THREE from 'three';

export const PostProcessingPresets = {
  cinematic: {
    bloom: { intensity: 1.2, luminanceThreshold: 0.4, luminanceSmoothing: 0.9, height: 512 },
    dof: { focusDistance: 0.025, focalLength: 0.08, bokehScale: 4, height: 600 },
    ssao: { samples: 32, radius: 0.15, intensity: 25, luminanceInfluence: 0.6 },
    chromatic: { offset: [0.001, 0.001] },
    vignette: { offset: 0.35, darkness: 0.6 },
    colorGrading: { brightness: 0.05, contrast: 0.1, saturation: 0.15, hue: 0 },
    toneMapping: { mode: ToneMappingMode.ACES_FILMIC, whitePoint: 4, middleGrey: 0.6 }
  },
  performance: {
    bloom: { intensity: 0.6, luminanceThreshold: 0.6, luminanceSmoothing: 0.7, height: 256 },
    dof: null,
    ssao: { samples: 8, radius: 0.1, intensity: 15 },
    chromatic: null,
    vignette: { offset: 0.3, darkness: 0.4 },
    colorGrading: null,
    toneMapping: { mode: ToneMappingMode.LINEAR }
  },
  realistic: {
    bloom: { intensity: 0.4, luminanceThreshold: 0.7, luminanceSmoothing: 0.85, height: 512 },
    dof: { focusDistance: 0.02, focalLength: 0.04, bokehScale: 2, height: 480 },
    ssao: { samples: 24, radius: 0.12, intensity: 30, luminanceInfluence: 0.7 },
    chromatic: { offset: [0.0003, 0.0003] },
    vignette: { offset: 0.25, darkness: 0.3 },
    colorGrading: { brightness: 0, contrast: 0.05, saturation: 0.05, hue: 0 },
    toneMapping: { mode: ToneMappingMode.REINHARD2, whitePoint: 3, middleGrey: 0.5 }
  },
  ultra: {
    bloom: { intensity: 1.5, luminanceThreshold: 0.3, luminanceSmoothing: 0.95, height: 1024 },
    dof: { focusDistance: 0.03, focalLength: 0.1, bokehScale: 5, height: 720 },
    ssao: { samples: 64, radius: 0.2, intensity: 35, luminanceInfluence: 0.5 },
    chromatic: { offset: [0.0015, 0.0015] },
    vignette: { offset: 0.4, darkness: 0.7 },
    colorGrading: { brightness: 0.08, contrast: 0.15, saturation: 0.2, hue: 0 },
    toneMapping: { mode: ToneMappingMode.ACES_FILMIC, whitePoint: 5, middleGrey: 0.65 },
    ssr: true,
    godRays: true
  },
  stylized: {
    bloom: { intensity: 2.0, luminanceThreshold: 0.2, luminanceSmoothing: 0.95, height: 512 },
    dof: { focusDistance: 0.015, focalLength: 0.05, bokehScale: 6, height: 480 },
    ssao: { samples: 16, radius: 0.08, intensity: 20 },
    chromatic: { offset: [0.002, 0.002] },
    vignette: { offset: 0.45, darkness: 0.8 },
    colorGrading: { brightness: 0.15, contrast: 0.25, saturation: 0.4, hue: 0.05 },
    toneMapping: { mode: ToneMappingMode.UNCHARTED2, whitePoint: 6, middleGrey: 0.7 }
  }
};

export default function PostProcessingEffects({
  preset = 'cinematic',
  qualityPreset = 'high',
  timeOfDay = 'day',
  customConfig = {}
}) {
  const config = useMemo(() => {
    const baseConfig = PostProcessingPresets[preset] || PostProcessingPresets.cinematic;
    
    const qualityMultipliers = {
      low: { samples: 0.25, resolution: 0.5 },
      medium: { samples: 0.5, resolution: 0.75 },
      high: { samples: 1, resolution: 1 },
      ultra: { samples: 2, resolution: 1.5 }
    };
    
    const mult = qualityMultipliers[qualityPreset] || qualityMultipliers.high;
    
    const adjusted = {
      ...baseConfig,
      ...customConfig
    };
    
    if (adjusted.bloom) {
      adjusted.bloom.height = Math.floor(adjusted.bloom.height * mult.resolution);
    }
    
    if (adjusted.ssao) {
      adjusted.ssao.samples = Math.floor(adjusted.ssao.samples * mult.samples);
    }
    
    if (adjusted.dof) {
      adjusted.dof.height = Math.floor(adjusted.dof.height * mult.resolution);
    }
    
    return adjusted;
  }, [preset, qualityPreset, customConfig]);

  const multisampling = {
    low: 0,
    medium: 4,
    high: 8,
    ultra: 16
  }[qualityPreset] || 8;

  return (
    <EffectComposer multisampling={multisampling} enableNormalPass>
      <SMAA />
      
      {config.bloom && (
        <Bloom
          intensity={config.bloom.intensity}
          luminanceThreshold={config.bloom.luminanceThreshold}
          luminanceSmoothing={config.bloom.luminanceSmoothing}
          height={config.bloom.height}
          kernelSize={KernelSize.LARGE}
          blendFunction={BlendFunction.SCREEN}
        />
      )}

      {config.dof && (
        <DepthOfField
          focusDistance={config.dof.focusDistance}
          focalLength={config.dof.focalLength}
          bokehScale={config.dof.bokehScale}
          height={config.dof.height}
        />
      )}

      {config.ssao && (
        <SSAO
          samples={config.ssao.samples}
          radius={config.ssao.radius}
          intensity={config.ssao.intensity}
          luminanceInfluence={config.ssao.luminanceInfluence}
          color="black"
          blendFunction={BlendFunction.MULTIPLY}
        />
      )}

      {config.chromatic && (
        <ChromaticAberration
          offset={new THREE.Vector2(...config.chromatic.offset)}
          blendFunction={BlendFunction.NORMAL}
        />
      )}

      {config.vignette && (
        <Vignette
          offset={config.vignette.offset}
          darkness={config.vignette.darkness}
          eskil={false}
          blendFunction={BlendFunction.NORMAL}
        />
      )}

      {config.colorGrading && (
        <ColorGrading
          brightness={config.colorGrading.brightness}
          contrast={config.colorGrading.contrast}
          saturation={config.colorGrading.saturation}
          hue={config.colorGrading.hue}
          blendFunction={BlendFunction.NORMAL}
        />
      )}

      {config.toneMapping && (
        <ToneMapping
          mode={config.toneMapping.mode}
          resolution={256}
          whitePoint={config.toneMapping.whitePoint}
          middleGrey={config.toneMapping.middleGrey}
          minLuminance={0.01}
          averageLuminance={1.0}
          adaptationRate={1.5}
        />
      )}

      <Noise opacity={0.015} premultiply blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
}

export { PostProcessingPresets };