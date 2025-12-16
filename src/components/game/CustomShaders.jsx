import * as THREE from 'three';

// Subsurface Scattering Shader for realistic plant leaves
export const SubsurfaceScatteringShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0x2d5016) },
    lightPosition: { value: new THREE.Vector3(10, 10, 10) },
    thickness: { value: 0.5 },
    scatteringPower: { value: 2.0 },
    scatteringColor: { value: new THREE.Color(0x88cc44) },
    ambient: { value: 0.3 }
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLightDir;
    varying vec2 vUv;

    uniform vec3 lightPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vPosition = worldPosition.xyz;
      vLightDir = normalize(lightPosition - vPosition);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLightDir;
    varying vec2 vUv;

    uniform vec3 color;
    uniform float thickness;
    uniform float scatteringPower;
    uniform vec3 scatteringColor;
    uniform float ambient;
    uniform float time;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(vLightDir);
      vec3 viewDir = normalize(cameraPosition - vPosition);

      // Front lighting
      float diffuse = max(dot(normal, lightDir), 0.0);

      // Subsurface scattering (back lighting)
      float backLit = max(dot(-normal, lightDir), 0.0);
      float scatter = pow(backLit, scatteringPower) * thickness;

      // Combine lighting
      vec3 scatteredLight = scatteringColor * scatter;
      vec3 diffuseLight = color * diffuse;

      // Add subtle noise for organic look
      float noise = fract(sin(dot(vUv * 10.0, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 finalColor = diffuseLight + scatteredLight + ambient * color + noise * 0.02;

      // Fresnel rim lighting
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      finalColor += fresnel * 0.2 * scatteringColor;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Wetness Shader for plants after spraying
export const WetnessShader = {
  uniforms: {
    time: { value: 0 },
    baseColor: { value: new THREE.Color(0x2d5016) },
    wetness: { value: 0.0 },
    dropletScale: { value: 20.0 },
    reflectionIntensity: { value: 0.8 },
    lightPosition: { value: new THREE.Vector3(10, 10, 10) }
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    uniform vec3 baseColor;
    uniform float wetness;
    uniform float dropletScale;
    uniform float reflectionIntensity;
    uniform vec3 lightPosition;
    uniform float time;

    // Noise function for water droplets
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(lightPosition - vPosition);
      vec3 viewDir = normalize(cameraPosition - vPosition);

      // Base diffuse lighting
      float diffuse = max(dot(normal, lightDir), 0.0);
      vec3 color = baseColor * (0.3 + diffuse * 0.7);

      // Water droplet pattern
      vec2 dropletUV = vUv * dropletScale + vec2(time * 0.1, 0.0);
      float droplets = noise(dropletUV);
      droplets = smoothstep(0.4, 0.6, droplets);

      // Darken wet areas
      color *= mix(1.0, 0.7, wetness * droplets);

      // Add specular highlights on wet areas
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);
      color += specular * wetness * droplets * reflectionIntensity;

      // Water film reflection
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 5.0);
      color += fresnel * wetness * 0.3;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// Crystal/Trichome Shader for resinous glands
export const CrystalShader = {
  uniforms: {
    time: { value: 0 },
    crystalColor: { value: new THREE.Color(0xffffff) },
    refractionRatio: { value: 0.98 },
    fresnelBias: { value: 0.1 },
    fresnelScale: { value: 1.0 },
    fresnelPower: { value: 2.0 },
    sparkleIntensity: { value: 1.0 }
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vReflect;
    varying vec3 vRefract;

    uniform float refractionRatio;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vPosition = worldPosition.xyz;

      vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
      vNormal = worldNormal;

      vec3 viewDir = normalize(vPosition - cameraPosition);

      vReflect = reflect(viewDir, worldNormal);
      vRefract = refract(viewDir, worldNormal, refractionRatio);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vReflect;
    varying vec3 vRefract;

    uniform vec3 crystalColor;
    uniform float fresnelBias;
    uniform float fresnelScale;
    uniform float fresnelPower;
    uniform float sparkleIntensity;
    uniform float time;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      vec3 normal = normalize(vNormal);

      // Fresnel effect
      float fresnel = fresnelBias + fresnelScale * pow(1.0 + dot(viewDir, normal), fresnelPower);

      // Sparkle effect
      float sparkle = sin(time * 10.0 + vPosition.x * 100.0) *
                      sin(time * 15.0 + vPosition.y * 100.0) *
                      sin(time * 12.0 + vPosition.z * 100.0);
      sparkle = max(sparkle, 0.0) * sparkleIntensity;

      // Combine effects
      vec3 color = crystalColor * (fresnel + sparkle);

      // Add rainbow iridescence
      vec3 iridescence = vec3(
        sin(fresnel * 3.0 + time) * 0.5 + 0.5,
        sin(fresnel * 3.0 + time + 2.0) * 0.5 + 0.5,
        sin(fresnel * 3.0 + time + 4.0) * 0.5 + 0.5
      );
      color += iridescence * 0.3 * fresnel;

      gl_FragColor = vec4(color, 0.9);
    }
  `
};

// Wind Animation Shader for natural plant movement
export const WindShader = {
  uniforms: {
    time: { value: 0 },
    windStrength: { value: 0.5 },
    windDirection: { value: new THREE.Vector2(1.0, 0.5) },
    turbulence: { value: 1.0 },
    baseColor: { value: new THREE.Color(0x2d5016) }
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vDisplacement;

    uniform float time;
    uniform float windStrength;
    uniform vec2 windDirection;
    uniform float turbulence;

    // Noise function
    float noise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
    }

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec3 pos = position;

      // Wind effect increases with height
      float heightFactor = pos.y * 2.0;

      // Main wind wave
      float windWave = sin(time * 2.0 + pos.x * windDirection.x + pos.z * windDirection.y) * windStrength;

      // Turbulence
      float turb = noise(pos + time * 0.5) * turbulence * 0.5;

      // Apply displacement
      float displacement = (windWave + turb) * heightFactor;
      pos.x += displacement * 0.3;
      pos.z += displacement * 0.3;
      pos.y += abs(displacement) * 0.1; // Slight vertical movement

      vDisplacement = displacement;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vDisplacement;

    uniform vec3 baseColor;

    void main() {
      vec3 normal = normalize(vNormal);

      // Lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(dot(normal, lightDir), 0.0);

      // Color variation based on movement
      vec3 color = baseColor * (0.5 + diffuse * 0.5);

      // Subtle color shift from wind movement
      color += abs(vDisplacement) * 0.1;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// Disease/Damage Shader for infected plants
export const DiseaseShader = {
  uniforms: {
    time: { value: 0 },
    healthyColor: { value: new THREE.Color(0x2d5016) },
    diseaseColor: { value: new THREE.Color(0x8b7d3a) },
    diseaseProgress: { value: 0.0 },
    infectionPattern: { value: null },
    spotScale: { value: 10.0 }
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vPosition;

    uniform vec3 healthyColor;
    uniform vec3 diseaseColor;
    uniform float diseaseProgress;
    uniform float spotScale;
    uniform float time;

    // Noise for disease spots
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for(int i = 0; i < 4; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      // Disease spot pattern
      vec2 spotUV = vUv * spotScale + time * 0.01;
      float spotPattern = fbm(spotUV);

      // Threshold for disease spots
      float diseaseThreshold = 1.0 - diseaseProgress;
      float diseaseSpots = step(diseaseThreshold, spotPattern);

      // Mix colors based on disease
      vec3 color = mix(healthyColor, diseaseColor, diseaseSpots * diseaseProgress);

      // Add brown/dead edges to disease spots
      float edgeDarkness = smoothstep(diseaseThreshold - 0.1, diseaseThreshold, spotPattern);
      color *= 1.0 - edgeDarkness * diseaseProgress * 0.5;

      // Wilting effect (reduce saturation)
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(color, vec3(gray), diseaseProgress * 0.3);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// Helper function to create shader material from shader definition
export const createShaderMaterial = (shaderDef, additionalUniforms = {}) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shaderDef.uniforms,
      ...additionalUniforms
    },
    vertexShader: shaderDef.vertexShader,
    fragmentShader: shaderDef.fragmentShader,
    side: THREE.DoubleSide,
    transparent: true
  });
};

// Export all shaders
export const CustomShaders = {
  SubsurfaceScattering: SubsurfaceScatteringShader,
  Wetness: WetnessShader,
  Crystal: CrystalShader,
  Wind: WindShader,
  Disease: DiseaseShader
};

export default CustomShaders;
