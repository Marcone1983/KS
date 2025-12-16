import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

export const SubsurfaceScatteringShader = {
  uniforms: {
    time: { value: 0 },
    thickness: { value: 0.5 },
    scatterColor: { value: new THREE.Color(0x3a7d3a) },
    lightPosition: { value: new THREE.Vector3(10, 15, 5) },
    power: { value: 2.0 },
    distortion: { value: 0.1 },
    scale: { value: 8.0 },
    ambient: { value: 0.4 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vPosition = position;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float thickness;
    uniform vec3 scatterColor;
    uniform vec3 lightPosition;
    uniform float power;
    uniform float distortion;
    uniform float scale;
    uniform float ambient;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(lightPosition - vWorldPosition);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      float diffuse = max(dot(normal, lightDir), 0.0);
      
      vec3 H = normalize(lightDir + normal * distortion);
      float I = pow(clamp(dot(viewDir, -H), 0.0, 1.0), power) * scale;
      vec3 subsurface = scatterColor * (I + ambient) * thickness;
      
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      vec3 rim = scatterColor * fresnel * 0.3;
      
      vec3 finalColor = scatterColor * diffuse * 0.6 + subsurface + rim;
      
      csm_DiffuseColor = vec4(finalColor, 0.95);
    }
  `
};

export const WetnessShader = {
  uniforms: {
    time: { value: 0 },
    wetness: { value: 0.0 },
    dropletScale: { value: 20.0 },
    roughness: { value: 0.7 },
    baseRoughness: { value: 0.7 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float wetness;
    uniform float dropletScale;
    uniform float roughness;
    uniform float baseRoughness;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    void main() {
      float droplets = noise(vUv * dropletScale + time * 0.1);
      droplets = smoothstep(0.4, 0.6, droplets);
      
      float wetPattern = droplets * wetness;
      
      float finalRoughness = baseRoughness * (1.0 - wetPattern * 0.7);
      float metalness = wetPattern * 0.2;
      
      csm_Roughness = finalRoughness;
      csm_Metalness = metalness;
    }
  `
};

export const CrystalTrichomeShader = {
  uniforms: {
    time: { value: 0 },
    maturity: { value: 0.5 },
    ior: { value: 1.45 },
    chromaticAberration: { value: 0.02 },
    reflectivity: { value: 0.9 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vReflect;
    varying vec3 vRefract;
    
    uniform float ior;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vPosition = position;
      
      vec3 cameraToVertex = normalize(vWorldPosition - cameraPosition);
      vReflect = reflect(cameraToVertex, vNormal);
      vRefract = refract(cameraToVertex, vNormal, 1.0 / ior);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float maturity;
    uniform float chromaticAberration;
    uniform float reflectivity;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vReflect;
    varying vec3 vRefract;
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 4.0);
      
      vec3 clearColor = vec3(0.95, 0.98, 1.0);
      vec3 cloudyColor = vec3(0.88, 0.90, 0.93);
      vec3 amberColor = vec3(1.0, 0.68, 0.25);
      
      vec3 trichomeColor;
      if (maturity < 0.5) {
        trichomeColor = mix(clearColor, cloudyColor, maturity * 2.0);
      } else {
        trichomeColor = mix(cloudyColor, amberColor, (maturity - 0.5) * 2.0);
      }
      
      float sparkle = sin(time * 15.0 + vPosition.x * 100.0 + vPosition.y * 100.0);
      sparkle = smoothstep(0.92, 1.0, sparkle);
      
      vec3 refractColor = trichomeColor * 0.8;
      vec3 reflectColor = mix(trichomeColor, vec3(1.0), fresnel);
      
      vec3 finalColor = mix(refractColor, reflectColor, fresnel * reflectivity);
      finalColor += vec3(sparkle * 0.6);
      
      float opacity = 0.25 + maturity * 0.55 + fresnel * 0.2;
      
      csm_DiffuseColor = vec4(finalColor, opacity);
    }
  `
};

export const WindAnimationShader = {
  uniforms: {
    time: { value: 0 },
    windStrength: { value: 0.2 },
    windDirection: { value: new THREE.Vector3(1, 0, 0.3) },
    turbulence: { value: 0.5 },
    flexibility: { value: 1.0 }
  },
  vertexShader: `
    uniform float time;
    uniform float windStrength;
    uniform vec3 windDirection;
    uniform float turbulence;
    uniform float flexibility;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    }
    
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    
    void main() {
      vNormal = normal;
      vPosition = position;
      
      vec3 pos = position;
      
      float heightFactor = (pos.y + 1.0) * flexibility;
      
      float mainWind = sin(time * 1.2 + pos.x * 2.0) * windStrength;
      float detailWind = sin(time * 2.5 + pos.y * 3.0) * windStrength * 0.5;
      float microWind = noise(pos * 5.0 + time * 0.5) * windStrength * turbulence * 0.3;
      
      vec3 windOffset = windDirection * (mainWind + detailWind + microWind) * heightFactor;
      
      pos += windOffset;
      
      csm_Position = pos;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
    }
  `
};

export const DiseaseInfectionShader = {
  uniforms: {
    time: { value: 0 },
    infectionLevel: { value: 0.0 },
    diseaseColor: { value: new THREE.Color(0x6a5a2a) },
    spreadRadius: { value: 0.2 },
    baseColor: { value: new THREE.Color(0x3a7d3a) }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float infectionLevel;
    uniform vec3 diseaseColor;
    uniform float spreadRadius;
    uniform vec3 baseColor;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float cellular(vec2 p, float scale) {
      vec2 i = floor(p * scale);
      vec2 f = fract(p * scale);
      
      float minDist = 1.0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 point = vec2(hash(i + neighbor), hash(i + neighbor + 100.0));
          point = 0.5 + 0.5 * sin(time * 0.5 + 6.2831 * point);
          
          vec2 diff = neighbor + point - f;
          float dist = length(diff);
          minDist = min(minDist, dist);
        }
      }
      
      return minDist;
    }
    
    void main() {
      float spots = cellular(vUv, 10.0);
      spots = smoothstep(spreadRadius - 0.05, spreadRadius + 0.05, spots);
      
      float diseasePattern = (1.0 - spots) * infectionLevel;
      
      float pulsate = sin(time * 2.0) * 0.1 + 0.9;
      diseasePattern *= pulsate;
      
      vec3 color = mix(baseColor, diseaseColor, diseasePattern);
      
      float darken = diseasePattern * 0.3;
      color *= (1.0 - darken);
      
      csm_DiffuseColor = vec4(color, 1.0);
    }
  `
};

export const HolographicShader = {
  uniforms: {
    time: { value: 0 },
    intensity: { value: 1.0 },
    scanlineFrequency: { value: 100.0 },
    glitchAmount: { value: 0.1 },
    baseColor: { value: new THREE.Color(0x00ffff) }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float intensity;
    uniform float scanlineFrequency;
    uniform float glitchAmount;
    uniform vec3 baseColor;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    void main() {
      vec2 uv = vUv;
      
      float scanline = sin(uv.y * scanlineFrequency + time * 2.0) * 0.5 + 0.5;
      scanline = smoothstep(0.3, 0.7, scanline);
      
      float glitch = random(vec2(floor(time * 10.0), floor(uv.y * 10.0)));
      uv.x += (glitch - 0.5) * glitchAmount * step(0.95, glitch);
      
      float edge = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x) *
                   smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
      
      vec3 color = baseColor * scanline * edge * intensity;
      color += vec3(0.0, 0.5, 1.0) * (1.0 - scanline) * 0.2;
      
      float flicker = sin(time * 20.0 + random(uv) * 10.0) * 0.05 + 0.95;
      color *= flicker;
      
      float opacity = edge * 0.6;
      
      csm_DiffuseColor = vec4(color, opacity);
      csm_Emissive = color * 0.5;
    }
  `
};

export const EnergyFieldShader = {
  uniforms: {
    time: { value: 0 },
    power: { value: 1.0 },
    color1: { value: new THREE.Color(0x00ffff) },
    color2: { value: new THREE.Color(0xff00ff) },
    frequency: { value: 5.0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float power;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float frequency;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
      
      float wave = sin(vPosition.y * frequency + time * 3.0) * 0.5 + 0.5;
      vec3 energyColor = mix(color1, color2, wave);
      
      float pulse = sin(time * 5.0) * 0.2 + 0.8;
      
      vec3 finalColor = energyColor * fresnel * power * pulse;
      float opacity = fresnel * power * 0.7;
      
      csm_DiffuseColor = vec4(finalColor, opacity);
      csm_Emissive = finalColor;
    }
  `
};

export const createSubsurfaceLeafMaterial = (baseColor = 0x3a7d3a, thickness = 0.5) => {
  return new CustomShaderMaterial({
    baseMaterial: THREE.MeshStandardMaterial,
    uniforms: SubsurfaceScatteringShader.uniforms,
    vertexShader: SubsurfaceScatteringShader.vertexShader,
    fragmentShader: SubsurfaceScatteringShader.fragmentShader,
    silent: true,
    color: baseColor,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true
  });
};

export const createWetnessMaterial = (baseColor = 0x3a7d3a, wetness = 0) => {
  const material = new CustomShaderMaterial({
    baseMaterial: THREE.MeshStandardMaterial,
    uniforms: {
      ...WetnessShader.uniforms,
      wetness: { value: wetness }
    },
    vertexShader: WetnessShader.vertexShader,
    fragmentShader: WetnessShader.fragmentShader,
    silent: true,
    color: baseColor,
    roughness: 0.7,
    metalness: 0.0
  });
  
  return material;
};

export const createCrystalTrichomeMaterial = (maturity = 0.5) => {
  return new CustomShaderMaterial({
    baseMaterial: THREE.MeshPhysicalMaterial,
    uniforms: {
      ...CrystalTrichomeShader.uniforms,
      maturity: { value: maturity }
    },
    vertexShader: CrystalTrichomeShader.vertexShader,
    fragmentShader: CrystalTrichomeShader.fragmentShader,
    silent: true,
    transmission: 0.9,
    thickness: 0.5,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    ior: 1.45,
    transparent: true,
    side: THREE.DoubleSide
  });
};

export default {
  SubsurfaceScatteringShader,
  WetnessShader,
  CrystalTrichomeShader,
  HolographicShader,
  EnergyFieldShader,
  createSubsurfaceLeafMaterial,
  createWetnessMaterial,
  createCrystalTrichomeMaterial
};