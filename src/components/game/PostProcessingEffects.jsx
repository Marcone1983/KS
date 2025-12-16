import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  ChromaticAberration,
  SSAO,
  ToneMapping,
  ColorAverage,
  BrightnessContrast,
  HueSaturation,
  Noise,
  Pixelation
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

const PostProcessingEffects = ({
  enableBloom = true,
  enableDOF = true,
  enableSSAO = true,
  enableVignette = true,
  enableChromaticAberration = true,
  enableToneMapping = true,
  enableColorGrading = true,
  qualityPreset = 'high', // 'low', 'medium', 'high', 'ultra'
  focusTarget = [0, 0, 0],
  timeOfDay = 'day'
}) => {
  const composerRef = useRef();
  const { camera } = useThree();

  // Quality presets
  const qualitySettings = {
    low: {
      bloomLevels: 3,
      bloomIntensity: 0.5,
      ssaoSamples: 8,
      ssaoRadius: 0.1,
      dofBokehScale: 1,
      smaaPreset: 0
    },
    medium: {
      bloomLevels: 5,
      bloomIntensity: 0.8,
      ssaoSamples: 16,
      ssaoRadius: 0.2,
      dofBokehScale: 2,
      smaaPreset: 1
    },
    high: {
      bloomLevels: 7,
      bloomIntensity: 1.0,
      ssaoSamples: 32,
      ssaoRadius: 0.3,
      dofBokehScale: 3,
      smaaPreset: 2
    },
    ultra: {
      bloomLevels: 9,
      bloomIntensity: 1.2,
      ssaoSamples: 64,
      ssaoRadius: 0.4,
      dofBokehScale: 4,
      smaaPreset: 3
    }
  };

  const quality = qualitySettings[qualityPreset] || qualitySettings.high;

  // Time-of-day based color grading
  const colorGradingConfig = useMemo(() => {
    const configs = {
      day: {
        brightness: 0.05,
        contrast: 0.1,
        saturation: 0.2,
        hue: 0,
        vignetteOffset: 0.3,
        vignetteDarkness: 0.5
      },
      sunset: {
        brightness: 0.0,
        contrast: 0.15,
        saturation: 0.3,
        hue: 0.05,
        vignetteOffset: 0.2,
        vignetteDarkness: 0.7
      },
      night: {
        brightness: -0.1,
        contrast: 0.2,
        saturation: -0.1,
        hue: -0.02,
        vignetteOffset: 0.1,
        vignetteDarkness: 0.9
      }
    };

    return configs[timeOfDay] || configs.day;
  }, [timeOfDay]);

  // Dynamic focus based on target
  useFrame(() => {
    if (camera && focusTarget) {
      const distance = camera.position.distanceTo(new THREE.Vector3(...focusTarget));
      // Auto-adjust DOF focus distance
      return distance;
    }
  });

  return (
    <EffectComposer ref={composerRef} multisampling={qualityPreset === 'ultra' ? 8 : 4}>
      {/* SSAO - Screen Space Ambient Occlusion for realistic shadows */}
      {enableSSAO && (
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={quality.ssaoSamples}
          radius={quality.ssaoRadius}
          intensity={30}
          luminanceInfluence={0.6}
          color={new THREE.Color(0x000000)}
          bias={0.01}
          distanceThreshold={0.6}
          distanceFalloff={0.1}
          rangeThreshold={0.0005}
          rangeFalloff={0.001}
          minRadiusScale={0.33}
        />
      )}

      {/* Depth of Field - Cinematic focus effect */}
      {enableDOF && (
        <DepthOfField
          focusDistance={0.02}
          focalLength={0.05}
          bokehScale={quality.dofBokehScale}
          height={480}
          blendFunction={BlendFunction.NORMAL}
        />
      )}

      {/* Bloom - Glow effect for bright areas */}
      {enableBloom && (
        <Bloom
          intensity={quality.bloomIntensity}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.9}
          height={300}
          opacity={1}
          levels={quality.bloomLevels}
          mipmapBlur={true}
          blendFunction={BlendFunction.ADD}
        />
      )}

      {/* Tone Mapping - HDR to LDR conversion */}
      {enableToneMapping && (
        <ToneMapping
          mode={ToneMappingMode.ACES_FILMIC}
          resolution={256}
          whitePoint={4.0}
          middleGrey={0.6}
          minLuminance={0.01}
          averageLuminance={1.0}
          adaptationRate={1.5}
        />
      )}

      {/* Color Grading */}
      {enableColorGrading && (
        <>
          <BrightnessContrast
            brightness={colorGradingConfig.brightness}
            contrast={colorGradingConfig.contrast}
          />

          <HueSaturation
            hue={colorGradingConfig.hue}
            saturation={colorGradingConfig.saturation}
          />
        </>
      )}

      {/* Chromatic Aberration - Lens distortion effect */}
      {enableChromaticAberration && (
        <ChromaticAberration
          offset={new THREE.Vector2(0.002, 0.002)}
          radialModulation={true}
          modulationOffset={0.5}
          blendFunction={BlendFunction.NORMAL}
        />
      )}

      {/* Vignette - Darkened edges for cinematic look */}
      {enableVignette && (
        <Vignette
          offset={colorGradingConfig.vignetteOffset}
          darkness={colorGradingConfig.vignetteDarkness}
          eskil={false}
          blendFunction={BlendFunction.NORMAL}
        />
      )}

      {/* Subtle film grain for organic look */}
      <Noise
        opacity={0.03}
        blendFunction={BlendFunction.OVERLAY}
      />
    </EffectComposer>
  );
};

// Preset configurations for different scenarios
export const PostProcessingPresets = {
  // Cinematic preset - Strong DOF, bloom, color grading
  cinematic: {
    enableBloom: true,
    enableDOF: true,
    enableSSAO: true,
    enableVignette: true,
    enableChromaticAberration: true,
    enableToneMapping: true,
    enableColorGrading: true,
    qualityPreset: 'high'
  },

  // Performance preset - Minimal effects
  performance: {
    enableBloom: true,
    enableDOF: false,
    enableSSAO: false,
    enableVignette: true,
    enableChromaticAberration: false,
    enableToneMapping: true,
    enableColorGrading: false,
    qualityPreset: 'low'
  },

  // Realistic preset - Natural look
  realistic: {
    enableBloom: false,
    enableDOF: true,
    enableSSAO: true,
    enableVignette: false,
    enableChromaticAberration: false,
    enableToneMapping: true,
    enableColorGrading: true,
    qualityPreset: 'high'
  },

  // Stylized preset - Strong effects for artistic look
  stylized: {
    enableBloom: true,
    enableDOF: true,
    enableSSAO: true,
    enableVignette: true,
    enableChromaticAberration: true,
    enableToneMapping: true,
    enableColorGrading: true,
    qualityPreset: 'ultra'
  }
};

export default PostProcessingEffects;