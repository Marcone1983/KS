// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for GLB and other 3D model files
config.resolver.assetExts.push(
  // 3D models
  'glb',
  'gltf',
  'obj',
  'mtl',
  'fbx',
  // Textures
  'hdr',
  'exr',
);

// Add support for source extensions
config.resolver.sourceExts.push('cjs');

module.exports = config;
