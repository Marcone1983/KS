// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Aggiungi supporto per file GLB, GLTF e altri asset 3D
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
  'ktx',
  'ktx2',
  'basis',
  // Other
  'bin'
);

// Assicurati che i file GLB non vengano trattati come source files
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  ext => !['glb', 'gltf', 'obj', 'mtl', 'fbx', 'hdr', 'exr', 'ktx', 'ktx2', 'basis', 'bin'].includes(ext)
);

module.exports = config;
