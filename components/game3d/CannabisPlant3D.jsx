import * as THREE from 'three';

export function createCannabisPlant(scene, options = {}) {
  const {
    position = [0, 0, -1.5],
    scale = 1.0,
    growthStage = 0.5,
    health = 100,
    pestInfestation = 0
  } = options;

  const plantGroup = new THREE.Group();
  plantGroup.position.set(...position);
  plantGroup.scale.setScalar(scale);

  // Materiali avanzati
  const healthFactor = health / 100;
  const infestationFactor = pestInfestation / 100;
  
  const leafColor = new THREE.Color(0x4a9d4a).lerp(
    new THREE.Color(0x8b7d3a), 
    infestationFactor * 0.5
  );
  
  const leafMat = new THREE.MeshStandardMaterial({
    color: leafColor,
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92 + healthFactor * 0.08,
    emissive: new THREE.Color(0x1a3a1a),
    emissiveIntensity: 0.08
  });

  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x5a7d4a,
    roughness: 0.82,
    metalness: 0.02,
    emissive: 0x2a3a2a,
    emissiveIntensity: 0.05
  });

  // Fusto principale
  const stemHeight = 2.5 * growthStage;
  const mainStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, stemHeight, 12),
    stemMat
  );
  mainStem.position.y = stemHeight / 2;
  mainStem.castShadow = true;
  mainStem.receiveShadow = true;
  plantGroup.add(mainStem);

  // Funzione per creare foglia seghettata
  function createSerratedLeaf(length, width) {
    const shape = new THREE.Shape();
    const teeth = 7;
    
    shape.moveTo(0, 0);
    for (let i = 0; i <= teeth; i++) {
      const t = i / teeth;
      const y = t * length;
      const w = Math.sin(t * Math.PI) * width * (1 - t * 0.2);
      const tooth = (i % 2 === 0) ? w * 0.15 : 0;
      shape.lineTo(w + tooth, y);
    }
    for (let i = teeth; i >= 0; i--) {
      const t = i / teeth;
      const y = t * length;
      const w = Math.sin(t * Math.PI) * width * (1 - t * 0.2);
      const tooth = (i % 2 === 0) ? w * 0.15 : 0;
      shape.lineTo(-w - tooth, y);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, (y / length) * 0.018 + Math.abs(x) * 0.012);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    
    return geo;
  }

  // Foglia palmata (7 dita)
  function createPalmLeaf(leafScale) {
    const group = new THREE.Group();
    
    const mainGeo = createSerratedLeaf(0.5 * leafScale, 0.12 * leafScale);
    const main = new THREE.Mesh(mainGeo, leafMat);
    main.rotation.x = -Math.PI / 2;
    main.castShadow = true;
    group.add(main);

    const fingers = [
      { a: -0.5, l: 0.48, w: 0.11, y: 0.1 },
      { a: 0.5, l: 0.48, w: 0.11, y: 0.1 },
      { a: -0.85, l: 0.42, w: 0.1, y: 0.18 },
      { a: 0.85, l: 0.42, w: 0.1, y: 0.18 },
      { a: -1.15, l: 0.36, w: 0.09, y: 0.26 },
      { a: 1.15, l: 0.36, w: 0.09, y: 0.26 }
    ];

    fingers.forEach(cfg => {
      const geo = createSerratedLeaf(cfg.l * leafScale, cfg.w * leafScale);
      const mesh = new THREE.Mesh(geo, leafMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = cfg.a;
      mesh.position.y = cfg.y * leafScale;
      mesh.castShadow = true;
      group.add(mesh);
    });

    return group;
  }

  // Nodi con rami e foglie
  const nodeCount = Math.floor(4 + growthStage * 3);
  const nodeLevels = [];
  
  for (let i = 0; i < nodeCount; i++) {
    const t = (i + 1) / (nodeCount + 1);
    nodeLevels.push({
      y: stemHeight * t,
      rot: (i * Math.PI * 0.6),
      len: 0.35 + Math.random() * 0.15,
      sc: 0.7 + t * 0.4,
      leafCount: i < 2 ? 2 : 3
    });
  }

  nodeLevels.forEach((node, idx) => {
    const nodeGrp = new THREE.Group();
    nodeGrp.position.y = node.y;
    nodeGrp.rotation.y = node.rot;

    [-1, 1].forEach(dir => {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.024, node.len, 8),
        stemMat
      );
      branch.position.x = dir * node.len / 2;
      branch.rotation.z = dir * Math.PI / 2;
      branch.castShadow = true;
      nodeGrp.add(branch);

      for (let l = 0; l < node.leafCount; l++) {
        const leaf = createPalmLeaf(node.sc);
        const t = 0.5 + (l / Math.max(1, node.leafCount - 1)) * 0.45;
        leaf.position.x = dir * node.len * t;
        leaf.position.y = (Math.random() - 0.5) * 0.05;
        leaf.rotation.y = dir * (Math.PI / 2 + (Math.random() - 0.5) * 0.4);
        leaf.rotation.x = (Math.random() - 0.5) * 0.3;
        leaf.userData.windOffset = Math.random() * Math.PI * 2;
        nodeGrp.add(leaf);
      }
    });

    nodeGrp.userData.windOffset = Math.random() * Math.PI * 2;
    plantGroup.add(nodeGrp);
  });

  // Cima con foglie
  if (growthStage > 0.4) {
    const topGroup = new THREE.Group();
    topGroup.position.y = stemHeight * 0.95;
    
    for (let i = 0; i < 6; i++) {
      const leaf = createPalmLeaf(0.75 + (i === 0 ? 0.25 : 0));
      const ang = (i / 6) * Math.PI * 2;
      const rad = i === 0 ? 0 : 0.1;
      leaf.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      leaf.rotation.y = ang;
      leaf.rotation.x = i === 0 ? 0 : Math.PI / 3.5;
      topGroup.add(leaf);
    }
    
    plantGroup.add(topGroup);
  }

  // Fiori/Cime con pistilli
  if (growthStage > 0.6) {
    const budMat = new THREE.MeshStandardMaterial({
      color: 0x9b8355,
      roughness: 0.55,
      emissive: 0x4a3a2a,
      emissiveIntensity: 0.12
    });

    const pistilMat = new THREE.MeshBasicMaterial({
      color: 0xff9944,
      transparent: true,
      opacity: 0.95
    });

    const budCount = Math.floor(2 + growthStage * 4);
    for (let b = 0; b < budCount; b++) {
      const budGroup = new THREE.Group();
      const t = (b + 1) / (budCount + 1);
      budGroup.position.y = stemHeight * (0.5 + t * 0.4);
      budGroup.position.x = (Math.random() - 0.5) * 0.15;
      budGroup.position.z = (Math.random() - 0.5) * 0.15;

      const bud = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 6),
        budMat
      );
      budGroup.add(bud);

      for (let p = 0; p < 12; p++) {
        const pistil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.002, 0.002, 0.04, 4),
          pistilMat
        );
        const ang = (p / 12) * Math.PI * 2;
        pistil.position.set(
          Math.cos(ang) * 0.028,
          0.015,
          Math.sin(ang) * 0.028
        );
        pistil.rotation.z = Math.cos(ang) * 0.35;
        pistil.rotation.x = Math.sin(ang) * 0.35;
        budGroup.add(pistil);
      }

      plantGroup.add(budGroup);
    }
  }

  // Tricomi (cristalli) sulla superficie
  if (growthStage > 0.75) {
    const trichomeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });

    const trichomeCount = Math.floor(growthStage * 50);
    for (let t = 0; t < trichomeCount; t++) {
      const trichome = new THREE.Mesh(
        new THREE.SphereGeometry(0.003, 4, 3),
        trichomeMat
      );
      const height = Math.random() * stemHeight * 0.7 + stemHeight * 0.2;
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.05 + Math.random() * 0.15;
      trichome.position.set(
        Math.cos(ang) * rad,
        height,
        Math.sin(ang) * rad
      );
      plantGroup.add(trichome);
    }
  }

  // Radici visibili
  if (growthStage > 0.3) {
    const rootMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.95
    });

    for (let r = 0; r < 5; r++) {
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.008, 0.15, 6),
        rootMat
      );
      const ang = (r / 5) * Math.PI * 2;
      root.position.set(Math.cos(ang) * 0.08, -0.05, Math.sin(ang) * 0.08);
      root.rotation.z = Math.cos(ang) * 0.5;
      root.rotation.x = Math.sin(ang) * 0.5;
      plantGroup.add(root);
    }
  }

  scene.add(plantGroup);
  
  return {
    group: plantGroup,
    update: (time, windStrength = 0.2) => {
      plantGroup.traverse((child) => {
        if (child.userData.windOffset !== undefined) {
          const offset = child.userData.windOffset;
          const sway = Math.sin(time * 1.5 + offset) * windStrength * 0.08;
          const twist = Math.cos(time * 1.2 + offset * 1.3) * windStrength * 0.05;
          
          if (child.rotation) {
            child.rotation.z += sway;
            child.rotation.x += twist;
          }
        }
      });
    }
  };
}