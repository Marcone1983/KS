import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette, ChromaticAberration, SSAO, ToneMapping, BrightnessContrast, HueSaturation, Noise, SMAA, SSR } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode, SMAAPreset } from 'postprocessing';
import * as THREE from 'three';

const PostProcessingEffects = ({
  enableBloom = true,
  enableDOF = true,
  enableSSAO = true,
  enableVignette = true,
  enableChromaticAberration = true,
  enableToneMapping = true,
  enableColorGrading = true,
  enableSSR = true,
  enableSMAA = true,
  qualityPreset = 'high',
  focusTarget = [0, 0, 0],
  timeOfDay = 'day'
}) => {
  const composerRef = useRef();
  const { camera } = useThree();

  const qualitySettings = {
    low: { bloomLevels: 3, bloomIntensity: 0.5, ssaoSamples: 8, ssaoRadius: 0.1, dofBokehScale: 1, quality: 'low' },
    medium: { bloomLevels: 5, bloomIntensity: 0.8, ssaoSamples: 16, ssaoRadius: 0.2, dofBokehScale: 2, quality: 'medium' },
    high: { bloomLevels: 7, bloomIntensity: 1.0, ssaoSamples: 32, ssaoRadius: 0.3, dofBokehScale: 3, quality: 'high' },
    ultra: { bloomLevels: 9, bloomIntensity: 1.2, ssaoSamples: 64, ssaoRadius: 0.4, dofBokehScale: 4, quality: 'ultra' }
  };

  const quality = qualitySettings[qualityPreset] || qualitySettings.high;

  const colorGradingConfig = useMemo(() => {
    const configs = {
      day: { brightness: 0.05, contrast: 0.1, saturation: 0.2, hue: 0, vignetteOffset: 0.3, vignetteDarkness: 0.5 },
      sunset: { brightness: 0.0, contrast: 0.15, saturation: 0.3, hue: 0.05, vignetteOffset: 0.2, vignetteDarkness: 0.7 },
      night: { brightness: -0.1, contrast: 0.2, saturation: -0.1, hue: -0.02, vignetteOffset: 0.1, vignetteDarkness: 0.9 }
    };
    return configs[timeOfDay] || configs.day;
  }, [timeOfDay]);

  useFrame(() => {
    if (camera && focusTarget) {
      return camera.position.distanceTo(new THREE.Vector3(...focusTarget));
    }
  });

  return (
    <EffectComposer ref={composerRef} multisampling={qualityPreset === 'ultra' ? 8 : 4}>
      {enableSSAO && (
        <SSAO blendFunction={BlendFunction.MULTIPLY} samples={quality.ssaoSamples} radius={quality.ssaoRadius} intensity={30} luminanceInfluence={0.6} color={new THREE.Color(0x000000)} bias={0.01} distanceThreshold={0.6} distanceFalloff={0.1} rangeThreshold={0.0005} rangeFalloff={0.001} minRadiusScale={0.33} />
      )}

      {enableDOF && (
        <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={quality.dofBokehScale} height={480} blendFunction={BlendFunction.NORMAL} />
      )}

      {enableBloom && (
        <Bloom intensity={quality.bloomIntensity} luminanceThreshold={0.7} luminanceSmoothing={0.9} height={300} opacity={1} levels={quality.bloomLevels} mipmapBlur={true} blendFunction={BlendFunction.ADD} />
      )}

      {enableToneMapping && (
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} resolution={256} whitePoint={4.0} middleGrey={0.6} minLuminance={0.01} averageLuminance={1.0} adaptationRate={1.5} />
      )}

      {enableColorGrading && (
        <>
          <BrightnessContrast brightness={colorGradingConfig.brightness} contrast={colorGradingConfig.contrast} />
          <HueSaturation hue={colorGradingConfig.hue} saturation={colorGradingConfig.saturation} />
        </>
      )}

      {enableChromaticAberration && (
        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} radialModulation={true} modulationOffset={0.5} blendFunction={BlendFunction.NORMAL} />
      )}

      {enableVignette && (
        <Vignette offset={colorGradingConfig.vignetteOffset} darkness={colorGradingConfig.vignetteDarkness} eskil={false} blendFunction={BlendFunction.NORMAL} />
      )}

      <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />

      {enableSSR && quality.quality !== 'low' && (
        <SSR intensity={0.5} exponent={1} distance={5} fade={1} roughnessFade={1} thickness={5} ior={1.45} maxRoughness={0.8} maxDepthDifference={10} blend={0.9} correction={1} correctionRadius={1} blur={0.5} blurKernel={1} blurSharpness={10} jitter={0.75} jitterRoughness={1} steps={20} refineSteps={5} missedRays={true} useNormalMap={true} useRoughnessMap={true} resolutionScale={quality.quality === 'ultra' ? 1 : 0.5} />
      )}

      {enableSMAA && (
        <SMAA preset={quality.quality === 'ultra' ? SMAAPreset.ULTRA : quality.quality === 'high' ? SMAAPreset.HIGH : SMAAPreset.MEDIUM} />
      )}
    </EffectComposer>
  );
};

export const PostProcessingPresets = {
  cinematic: { enableBloom: true, enableDOF: true, enableSSAO: true, enableVignette: true, enableChromaticAberration: true, enableToneMapping: true, enableColorGrading: true, enableSSR: true, enableSMAA: true, qualityPreset: 'high' },
  performance: { enableBloom: true, enableDOF: false, enableSSAO: false, enableVignette: true, enableChromaticAberration: false, enableToneMapping: true, enableColorGrading: false, enableSSR: false, enableSMAA: false, qualityPreset: 'low' },
  realistic: { enableBloom: false, enableDOF: true, enableSSAO: true, enableVignette: false, enableChromaticAberration: false, enableToneMapping: true, enableColorGrading: true, enableSSR: true, enableSMAA: true, qualityPreset: 'high' },
  stylized: { enableBloom: true, enableDOF: true, enableSSAO: true, enableVignette: true, enableChromaticAberration: true, enableToneMapping: true, enableColorGrading: true, enableSSR: false, enableSMAA: true, qualityPreset: 'ultra' }
};

export default PostProcessingEffects;