import * as THREE from 'three';

export function createEnvironment(scene, options = {}) {
  const {
    timeOfDay = 'day',
    weatherEffect = 'clear'
  } = options;

  const envGroup = new THREE.Group();
  scene.add(envGroup);

  // Configurazione luci per ora del giorno
  const lightConfigs = {
    day: {
      sunColor: 0xfff5e1,
      sunIntensity: 1.8,
      ambientColor: 0x87ceeb,
      ambientIntensity: 0.6,
      fogColor: 0x87ceeb,
      fogNear: 15,
      fogFar: 35
    },
    sunset: {
      sunColor: 0xff8844,
      sunIntensity: 1.3,
      ambientColor: 0xff7733,
      ambientIntensity: 0.45,
      fogColor: 0xff9966,
      fogNear: 12,
      fogFar: 30
    },
    night: {
      sunColor: 0x4a6b9f,
      sunIntensity: 0.35,
      ambientColor: 0x1a2a4a,
      ambientIntensity: 0.25,
      fogColor: 0x1a1a2e,
      fogNear: 8,
      fogFar: 25
    }
  };

  const config = lightConfigs[timeOfDay] || lightConfigs.day;

  // Illuminazione principale
  const sunLight = new THREE.DirectionalLight(config.sunColor, config.sunIntensity);
  sunLight.position.set(12, 18, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 35;
  sunLight.shadow.camera.left = -12;
  sunLight.shadow.camera.right = 12;
  sunLight.shadow.camera.top = 12;
  sunLight.shadow.camera.bottom = -12;
  sunLight.shadow.bias = -0.0002;
  sunLight.shadow.radius = 2.5;
  scene.add(sunLight);

  // Luce ambientale
  const ambientLight = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
  scene.add(ambientLight);

  // Luce emisferica (cielo/terra)
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d5016, 0.55);
  scene.add(hemiLight);

  // Luci di riempimento
  const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.25);
  fillLight1.position.set(-10, 8, -10);
  scene.add(fillLight1);

  const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.25);
  fillLight2.position.set(10, 8, -10);
  scene.add(fillLight2);

  // Nebbia
  scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);

  // Terreno procedurale
  const terrainSize = 60;
  const terrainSegments = 80;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
  
  const positions = terrainGeo.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    
    let height = 0;
    height += Math.sin(x * 0.15) * Math.cos(y * 0.15) * 0.2;
    height += Math.sin(x * 0.35) * Math.cos(y * 0.35) * 0.08;
    height += Math.sin(x * 0.6) * Math.cos(y * 0.6) * 0.04;
    
    positions[i + 2] = height;
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a2a,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: false
  });

  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  envGroup.add(terrain);

  // Campo erba (istanze ottimizzate)
  const grassCount = 3000;
  const grassGeometry = new THREE.ConeGeometry(0.025, 0.35, 4, 1);
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a5a2a,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: true
  });

  const grassInstances = [];
  for (let i = 0; i < grassCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * 15;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    const terrainHeight = 
      Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.2 +
      Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.08;

    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.position.set(x, terrainHeight, z);
    grass.rotation.y = Math.random() * Math.PI * 2;
    grass.scale.setScalar(0.8 + Math.random() * 0.5);
    grass.castShadow = true;
    grass.userData.windOffset = Math.random() * Math.PI * 2;
    grassInstances.push(grass);
    envGroup.add(grass);
  }

  // Alberi di sfondo
  const treeCount = 25;
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.92 });
  const foliageMats = [
    new THREE.MeshStandardMaterial({ color: 0x2d5016, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x3a6020, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x4a7028, roughness: 0.75 })
  ];

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const distance = 18 + Math.random() * 8;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const treeScale = 0.7 + Math.random() * 0.7;

    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);
    treeGroup.scale.setScalar(treeScale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 3.2, 10),
      treeMat
    );
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const foliage1 = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 3.2, 10),
      foliageMats[0]
    );
    foliage1.position.y = 3.8;
    foliage1.castShadow = true;
    treeGroup.add(foliage1);

    const foliage2 = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 2.7, 10),
      foliageMats[1]
    );
    foliage2.position.y = 5.3;
    foliage2.castShadow = true;
    treeGroup.add(foliage2);

    const foliage3 = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.2, 10),
      foliageMats[2]
    );
    foliage3.position.y = 6.6;
    foliage3.castShadow = true;
    treeGroup.add(foliage3);

    envGroup.add(treeGroup);
  }

  // Particelle atmosferiche
  const particleCount = 250;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 35;
    particlePositions[i * 3 + 1] = Math.random() * 12;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 35;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.025,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });

  const atmosphericParticles = new THREE.Points(particleGeo, particleMat);
  scene.add(atmosphericParticles);

  return {
    group: envGroup,
    sunLight,
    grassInstances,
    atmosphericParticles,
    
    update: (time, windStrength = 0.2) => {
      // Animazione erba
      grassInstances.forEach((grass, i) => {
        const offset = grass.userData.windOffset;
        grass.rotation.x = Math.sin(time * 2 + offset) * windStrength * 0.15;
      });

      // Animazione particelle
      const positions = atmosphericParticles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += Math.sin(time + i) * 0.015;
        positions[i * 3 + 1] += Math.cos(time * 0.5 + i) * 0.015;
        positions[i * 3 + 2] += Math.sin(time * 0.3 + i) * 0.015;

        if (positions[i * 3] > 17.5) positions[i * 3] = -17.5;
        if (positions[i * 3] < -17.5) positions[i * 3] = 17.5;
        if (positions[i * 3 + 1] > 12) positions[i * 3 + 1] = 0;
        if (positions[i * 3 + 2] > 17.5) positions[i * 3 + 2] = -17.5;
        if (positions[i * 3 + 2] < -17.5) positions[i * 3 + 2] = 17.5;
      }
      atmosphericParticles.geometry.attributes.position.needsUpdate = true;

      // Movimento sottile del sole
      sunLight.position.x = 12 + Math.sin(time * 0.1) * 3;
      sunLight.position.z = 8 + Math.cos(time * 0.1) * 3;
    },

    setTimeOfDay: (newTimeOfDay) => {
      const newConfig = lightConfigs[newTimeOfDay] || lightConfigs.day;
      sunLight.color.setHex(newConfig.sunColor);
      sunLight.intensity = newConfig.sunIntensity;
      ambientLight.color.setHex(newConfig.ambientColor);
      ambientLight.intensity = newConfig.ambientIntensity;
      scene.fog.color.setHex(newConfig.fogColor);
      scene.fog.near = newConfig.fogNear;
      scene.fog.far = newConfig.fogFar;
      scene.background = new THREE.Color(newConfig.fogColor);
    }
  };
}