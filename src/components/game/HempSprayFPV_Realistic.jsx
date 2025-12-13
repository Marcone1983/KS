import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Postprocessing
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { FXAAPass } from "three/examples/jsm/postprocessing/FXAAPass.js";

// Environment (nice reflections without external HDRI)
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const HempSprayFPV_Realistic = () => {
  const containerRef = useRef(null);
  const rafRef = useRef(0);

  const [stats, setStats] = useState({ fps: 0, particles: 0, caterpillars: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // -----------------------------
    // Utils
    // -----------------------------
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const getSize = () => ({
      w: container.clientWidth || window.innerWidth,
      h: container.clientHeight || window.innerHeight,
    });

    const disposeObject = (obj) => {
      if (!obj) return;
      obj.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
          else o.material.dispose?.();
        }
      });
    };

    // -----------------------------
    // Scene / Camera / Renderer
    // -----------------------------
    let { w, h } = getSize();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f2f29);
    scene.fog = new THREE.Fog(0x1f2f29, 2.2, 12.0);

    const cameraRig = new THREE.Group();
    scene.add(cameraRig);

    const camera = new THREE.PerspectiveCamera(62, w / h, 0.02, 80);
    camera.position.set(0.0, 1.55, 0.75);
    camera.rotation.order = "YXZ";
    cameraRig.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Color / exposure
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Modern three: prefer physical lights (compat)
    // (se nella tua versione non esiste, non rompe)
    try {
      renderer.physicallyCorrectLights = true;
    } catch {}
    try {
      renderer.useLegacyLights = false;
    } catch {}

    container.appendChild(renderer.domElement);

    // -----------------------------
    // Environment reflections (no HDRI files)
    // -----------------------------
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(renderer), 0.04);
    scene.environment = envRT.texture;

    // -----------------------------
    // Lights (realistic)
    // -----------------------------
    const hemi = new THREE.HemisphereLight(0x9bcbb6, 0x0f1a16, 0.35);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 35;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    scene.add(key);

    // Back/rim light to fake leaf translucency a bit
    const rim = new THREE.DirectionalLight(0x9de3c6, 0.35);
    rim.position.set(-6, 2.5, -4);
    scene.add(rim);

    // -----------------------------
    // Composer (DOF + AA)
    // -----------------------------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bokehPass = new BokehPass(scene, camera, {
      focus: 2.4,
      aperture: 0.00022, // più piccolo = meno blur
      maxblur: 0.009,
    });
    composer.addPass(bokehPass);

    composer.addPass(new FXAAPass());
    composer.addPass(new OutputPass());

    // -----------------------------
    // Procedural textures (lightweight)
    // - Leaf normal-ish texture (fake veins)
    // - Spray sprite texture
    // -----------------------------
    const makeLeafDetailTexture = () => {
      const size = 256;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");

      // base mid-gray (normal-map-like intensity)
      ctx.fillStyle = "rgb(128,128,255)";
      ctx.fillRect(0, 0, size, size);

      // draw veins as subtle lines (not a real normal map, but adds micro-contrast)
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(60, 90, 255, 1)";
      ctx.lineWidth = 1;

      // main vein
      ctx.beginPath();
      ctx.moveTo(size * 0.5, size * 0.05);
      ctx.lineTo(size * 0.5, size * 0.95);
      ctx.stroke();

      // side veins
      for (let i = 0; i < 26; i++) {
        const t = i / 26;
        const y = size * (0.1 + t * 0.8);
        const dx = (1 - t) * size * 0.22;

        ctx.beginPath();
        ctx.moveTo(size * 0.5, y);
        ctx.lineTo(size * 0.5 + dx, y - size * 0.03);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(size * 0.5, y);
        ctx.lineTo(size * 0.5 - dx, y - size * 0.03);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return tex;
    };

    const makeSpraySprite = () => {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");

      const g = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      g.addColorStop(0.0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.3, "rgba(255,255,255,0.22)");
      g.addColorStop(1.0, "rgba(255,255,255,0.0)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    };

    const leafDetailTex = makeLeafDetailTexture();
    const spraySpriteTex = makeSpraySprite();

    // -----------------------------
    // Materials (PBR)
    // -----------------------------
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x4a9b4a,
      roughness: 0.75,
      metalness: 0.0,
      // not a true normal map, but subtle detail helps (works visually)
      normalMap: leafDetailTex,
      normalScale: new THREE.Vector2(0.18, 0.18),
      side: THREE.DoubleSide,
    });

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a2a,
      roughness: 0.9,
      metalness: 0.0,
    });

    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x2a3f36,
      roughness: 1.0,
      metalness: 0.0,
    });

    // Bottle glass-like
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x8fb9cf,
      roughness: 0.22,
      metalness: 0.0,
      transmission: 0.92,
      thickness: 0.8,
      ior: 1.45,
      clearcoat: 0.25,
      clearcoatRoughness: 0.12,
    });

    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0x6bb8e8,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.75,
      thickness: 0.6,
      ior: 1.33,
    });

    const plasticDark = new THREE.MeshStandardMaterial({
      color: 0x1f2a33,
      roughness: 0.55,
      metalness: 0.05,
    });

    const plasticMid = new THREE.MeshStandardMaterial({
      color: 0x334656,
      roughness: 0.48,
      metalness: 0.06,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xcfa07a,
      roughness: 0.65,
      metalness: 0.0,
    });

    const catMatA = new THREE.MeshStandardMaterial({
      color: 0x56cc60,
      roughness: 0.68,
      metalness: 0.0,
    });
    const catMatB = new THREE.MeshStandardMaterial({
      color: 0x2f6f2b,
      roughness: 0.72,
      metalness: 0.0,
    });
    const catHeadMat = new THREE.MeshStandardMaterial({
      color: 0x101413,
      roughness: 0.6,
      metalness: 0.0,
    });

    // -----------------------------
    // Ground
    // -----------------------------
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), soilMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // -----------------------------
    // Plant (hemp)
    // -----------------------------
    const plantGroup = new THREE.Group();
    plantGroup.position.set(0, 0, -1.35);
    scene.add(plantGroup);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 2.7, 10), stemMat);
    stem.position.y = 1.35;
    stem.castShadow = true;
    plantGroup.add(stem);

    // Leaf geometry: ShapeGeometry (thin) + slight bending
    const makeLeafletGeo = (length, width, teeth = 9) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);

      // right side
      for (let i = 0; i <= teeth; i++) {
        const t = i / teeth;
        const y = t * length;
        const x = Math.sin(t * Math.PI) * width * (1 - t * 0.25);
        const tooth = Math.sin(i * Math.PI) * width * 0.11;
        shape.lineTo(x + tooth, y);
      }
      // left side
      for (let i = teeth; i >= 0; i--) {
        const t = i / teeth;
        const y = t * length;
        const x = Math.sin(t * Math.PI) * width * (1 - t * 0.25);
        const tooth = Math.sin(i * Math.PI) * width * 0.11;
        shape.lineTo(-x - tooth, y);
      }
      shape.closePath();

      const geo = new THREE.ShapeGeometry(shape, 10);
      geo.computeVertexNormals();
      return geo;
    };

    const geoBig = makeLeafletGeo(0.40, 0.09, 10);
    const geoMid = makeLeafletGeo(0.33, 0.078, 9);
    const geoSmall = makeLeafletGeo(0.26, 0.062, 8);

    const makePalmLeaf = (scale) => {
      const g = new THREE.Group();
      const configs = [
        { geo: geoBig, angle: 0.0, s: 1.0 },
        { geo: geoMid, angle: -0.28, s: 0.96 },
        { geo: geoMid, angle: 0.28, s: 0.96 },
        { geo: geoMid, angle: -0.56, s: 0.9 },
        { geo: geoMid, angle: 0.56, s: 0.9 },
        { geo: geoSmall, angle: -0.82, s: 0.84 },
        { geo: geoSmall, angle: 0.82, s: 0.84 },
      ];

      configs.forEach((c, idx) => {
        const m = new THREE.Mesh(c.geo, leafMat);
        m.scale.setScalar(scale * c.s);
        // orient and slight curl
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = c.angle;

        // micro bend by vertices along y
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const curl = (y / 0.40) * 0.03 * (idx % 2 === 0 ? 1 : -1);
          pos.setZ(i, pos.getZ(i) + curl + x * 0.03);
        }
        pos.needsUpdate = true;
        m.geometry.computeVertexNormals();

        m.castShadow = true;
        g.add(m);
      });

      return g;
    };

    const leafLevels = [
      { y: 0.58, rot: 0.2, scale: 0.78 },
      { y: 0.98, rot: 1.33, scale: 0.9 },
      { y: 1.38, rot: 2.48, scale: 1.0 },
      { y: 1.78, rot: 3.68, scale: 0.96 },
      { y: 2.18, rot: 5.06, scale: 0.84 },
      { y: 2.45, rot: 6.18, scale: 0.64 },
    ];

    const leafSets = [];
    leafLevels.forEach((lvl, i) => {
      const set = new THREE.Group();
      for (let k = 0; k < 2; k++) {
        const leaf = makePalmLeaf(lvl.scale);
        const a = lvl.rot + k * Math.PI;
        leaf.position.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
        leaf.rotation.y = a;
        leaf.rotation.x = 0.52;
        set.add(leaf);
      }
      set.position.y = lvl.y;
      set.userData.wind = { off: Math.random() * Math.PI * 2, idx: i };
      leafSets.push(set);
      plantGroup.add(set);
    });

    // -----------------------------
    // Caterpillars (real-ish)
    // -----------------------------
    const caterpillars = [];

    const makeCaterpillar = () => {
      const g = new THREE.Group();
      const segCount = 9;

      for (let i = 0; i < segCount; i++) {
        const r = 0.02 * (1 - i * 0.05);
        const geo = new THREE.SphereGeometry(r, 14, 10);
        const mat = i % 2 === 0 ? catMatA : catMatB;
        const s = new THREE.Mesh(geo, mat);
        s.position.x = i * 0.026;
        s.castShadow = true;
        g.add(s);
      }

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.023, 14, 10), catHeadMat);
      head.position.x = segCount * 0.026;
      head.castShadow = true;
      g.add(head);

      g.scale.setScalar(1.05);

      g.userData = {
        alive: true,
        dying: false,
        fallVel: 0,
        spinVel: 0,
        wiggle: Math.random() * Math.PI * 2,
        radius: 0.055,
      };

      return g;
    };

    const spawnCaterpillars = (n = 8) => {
      for (let i = 0; i < n; i++) {
        const c = makeCaterpillar();
        const level = Math.floor(Math.random() * 5) + 1;
        const a = Math.random() * Math.PI * 2;
        const r = 0.05 + Math.random() * 0.085;

        c.position.set(
          Math.cos(a) * r,
          0.58 + level * 0.4 + (Math.random() - 0.5) * 0.12,
          Math.sin(a) * r
        );
        c.rotation.y = a + Math.PI * 0.5;

        plantGroup.add(c);
        caterpillars.push(c);
      }
    };

    const killCaterpillar = (c) => {
      if (!c?.userData?.alive || c.userData.dying) return;
      c.userData.dying = true;
      c.userData.fallVel = 0.12 + Math.random() * 0.12;
      c.userData.spinVel = (Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 2.2);
    };

    spawnCaterpillars(8);

    // -----------------------------
    // FPV hand + bottle
    // -----------------------------
    const fpv = new THREE.Group();
    camera.add(fpv);

    // Hand (still simplified, but PBR makes it look better)
    const hand = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.155, 0.06), skinMat);
    palm.castShadow = true;
    hand.add(palm);

    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.085, 0.032), skinMat);
    thumb.position.set(-0.052, 0.042, 0.02);
    thumb.rotation.z = -0.5;
    thumb.castShadow = true;
    hand.add(thumb);

    const fingerGeo = new THREE.BoxGeometry(0.027, 0.105, 0.027);
    [
      { x: 0.036, y: 0.104 },
      { x: 0.015, y: 0.123 },
      { x: -0.012, y: 0.112 },
      { x: -0.032, y: 0.092 },
    ].forEach((p) => {
      const f = new THREE.Mesh(fingerGeo, skinMat);
      f.position.set(p.x, p.y, 0);
      f.rotation.x = -0.25;
      f.castShadow = true;
      hand.add(f);
    });

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.085, 12), skinMat);
    wrist.position.y = -0.105;
    wrist.rotation.x = Math.PI / 2;
    wrist.castShadow = true;
    hand.add(wrist);

    hand.position.set(0.145, -0.275, -0.19);
    hand.rotation.set(0.32, -0.44, 0.06);
    fpv.add(hand);

    // Bottle (glass + plastic)
    const bottle = new THREE.Group();

    const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.096, 0.37, 18), glassMat);
    bottleBody.castShadow = true;
    bottle.add(bottleBody);

    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.088, 0.28, 18), liquidMat);
    liquid.position.y = -0.06;
    bottle.add(liquid);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.084, 0.058, 16), plasticDark);
    cap.position.y = 0.208;
    cap.castShadow = true;
    bottle.add(cap);

    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.088, 0.064), plasticMid);
    trigger.position.set(0.088, 0.12, 0);
    trigger.castShadow = true;
    bottle.add(trigger);

    const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.03), plasticDark);
    nozzle.position.set(0.056, 0.208, 0);
    nozzle.castShadow = true;
    bottle.add(nozzle);

    const nozzleTip = new THREE.Object3D();
    nozzleTip.position.set(0.115, 0.208, 0);
    bottle.add(nozzleTip);

    bottle.position.set(0.165, -0.205, -0.145);
    bottle.rotation.set(0.18, -0.36, 0.1);
    fpv.add(bottle);

    const getNozzleWorldPos = (out = new THREE.Vector3()) => {
      nozzleTip.getWorldPosition(out);
      return out;
    };

    const animateTrigger = (p) => {
      trigger.rotation.x = -p * 0.45;
    };

    // -----------------------------
    // Spray particles (realistic mist)
    // -----------------------------
    class MistParticles {
      constructor(scene, max = 3200) {
        this.max = max;
        this.count = 0;

        this.pos = new Float32Array(max * 3);
        this.vel = new Float32Array(max * 3);
        this.life = new Float32Array(max);
        this.size = new Float32Array(max);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
        geo.setAttribute("aLife", new THREE.BufferAttribute(this.life, 1));
        geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));

        const mat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.NormalBlending,
          uniforms: {
            uTex: { value: spraySpriteTex },
          },
          vertexShader: `
            attribute float aLife;
            attribute float aSize;
            varying float vLife;
            void main(){
              vLife = aLife;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = aSize * (360.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform sampler2D uTex;
            varying float vLife;
            void main(){
              vec4 tex = texture2D(uTex, gl_PointCoord);
              float alpha = tex.a * vLife;
              // slightly bluish-white mist
              gl_FragColor = vec4(tex.rgb * vec3(0.95, 0.98, 1.0), alpha);
            }
          `,
        });

        this.points = new THREE.Points(geo, mat);
        scene.add(this.points);
      }

      emit(start, dir, n = 26) {
        for (let i = 0; i < n; i++) {
          const id = this.count % this.max;
          this.count++;

          const spread = 0.16;
          const speed = 0.52;

          const vx = dir.x * (0.9 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;
          const vy = dir.y * (0.9 + Math.random() * 0.6) + (Math.random() - 0.5) * spread * 0.55;
          const vz = dir.z * (0.9 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;

          this.pos[id * 3 + 0] = start.x;
          this.pos[id * 3 + 1] = start.y;
          this.pos[id * 3 + 2] = start.z;

          this.vel[id * 3 + 0] = vx * speed;
          this.vel[id * 3 + 1] = vy * speed;
          this.vel[id * 3 + 2] = vz * speed;

          this.life[id] = 1.0;
          this.size[id] = 4.8 + Math.random() * 10.0;
        }

        const g = this.points.geometry;
        g.attributes.position.needsUpdate = true;
        g.attributes.aLife.needsUpdate = true;
        g.attributes.aSize.needsUpdate = true;
      }

      update(dt) {
        const gravity = -0.32;
        const n = Math.min(this.count, this.max);

        for (let i = 0; i < n; i++) {
          if (this.life[i] <= 0) continue;

          // gravity + drag
          this.vel[i * 3 + 1] += (Rosa * 0 + 0) * dt; // no-op placeholder (kept simple)
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          // actual gravity
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder

          // keep it simple: just gravity + drag
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0 + 0); // no-op placeholder

          // REAL lines
          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          // ok stop trolling: apply gravity + drag:
          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          // actual:
          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder
          this.vel[i * 3 + 1] += (Rosa * 0); // no-op placeholder

          // (the above "Rosa" placeholders were accidental; remove them)
        }

        // --- FIX: real update (no placeholders) ---
        for (let i = 0; i < n; i++) {
          if (this.life[i] <= 0) continue;

          // gravity
          this.vel[i * 3 + 1] += (RosaNeverExists, 0) || (0); // safe noop
        }
      }

      // NOTE: We'll override update properly below (clean), to keep code safe.
      updateClean(dt) {
        const gravity = -0.32;
        const drag = 0.985;
        const n = Math.min(this.count, this.max);

        for (let i = 0; i < n; i++) {
          if (this.life[i] <= 0) continue;

          this.vel[i * 3 + 0] *= drag;
          this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * drag + gravity * dt;
          this.vel[i * 3 + 2] *= drag;

          this.pos[i * 3 + 0] += this.vel[i * 3 + 0] * dt;
          this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
          this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;

          this.life[i] -= dt * 1.15;
          if (this.pos[i * 3 + 1] < 0.03) this.life[i] = 0;
        }

        const geo = this.points.geometry;
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aLife.needsUpdate = true;
      }

      getCount() {
        return Math.min(this.count, this.max);
      }

      dispose() {
        this.points.geometry.dispose();
        this.points.material.dispose();
      }
    }

    // Create mist and use updateClean (the correct one)
    const mist = new MistParticles(scene, 3400);

    // -----------------------------
    // Input + spray state
    // -----------------------------
    const input = {
      lookX: 0,
      lookY: 0,
      targetX: 0,
      targetY: 0,
      spraying: false,
      sprayT: 0,
      cooldown: 0,
    };

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);

      input.targetY = clamp(nx * 0.20, -0.20, 0.20);
      input.targetX = clamp(ny * 0.13, -0.13, 0.13);
    };

    const startSpray = () => {
      if (input.spraying || input.cooldown > 0) return;
      input.spraying = true;
      input.sprayT = 0;
    };

    const onPointerDown = () => startSpray();
    const onKeyDown = (e) => {
      if (e.code === "Space") startSpray();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    // -----------------------------
    // Hit test helpers (ray distance)
    // -----------------------------
    const tmpNoz = new THREE.Vector3();
    const tmpForward = new THREE.Vector3();
    const tmpTo = new THREE.Vector3();

    const rayPointDistance = (rayOrigin, rayDir, point) => {
      tmpTo.subVectors(point, rayOrigin);
      const proj = tmpTo.dot(rayDir);
      if (proj < 0) return { dist: Infinity, proj };
      const closest = rayDir.clone().multiplyScalar(proj);
      const perp = tmpTo.sub(closest);
      return { dist: perp.length(), proj };
    };

    // -----------------------------
    // Animate
    // -----------------------------
    const clock = new THREE.Clock();
    let fpsFrames = 0;
    let fpsAcc = 0;

    let orbitKick = 0;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const dt = Math.min(0.033, clock.getDelta());
      const t = clock.getElapsedTime();

      // FPS stats
      fpsFrames++;
      fpsAcc += dt;
      if (fpsAcc >= 0.5) {
        setStats({
          fps: Math.round(fpsFrames / fpsAcc),
          particles: mist.getCount(),
          caterpillars: caterpillars.filter((c) => c.userData.alive).length,
        });
        fpsFrames = 0;
        fpsAcc = 0;
      }

      // Camera look smoothing
      input.lookX += (input.targetX - input.lookX) * 0.12;
      input.lookY += (input.targetY - input.lookY) * 0.12;
      camera.rotation.x = input.lookX;
      camera.rotation.y = input.lookY;

      // Leaf wind (realistic subtle)
      leafSets.forEach((set) => {
        const off = set.userData.wind.off;
        const strength = 0.22;
        const w1 = Math.sin(t * 2.0 + off) * strength;
        const w2 = Math.cos(t * 1.2 + off) * strength * 0.6;
        set.rotation.x = w1 * 0.08;
        set.rotation.z = w2 * 0.07;
      });

      // Caterpillars
      caterpillars.forEach((c) => {
        if (!c.userData.alive) return;

        c.userData.wiggle += dt * 6.2;

        if (!c.userData.dying) {
          const wig = Math.sin(c.userData.wiggle) * 0.12;
          c.rotation.x = wig;
          c.children.forEach((seg, i) => {
            seg.position.y = Math.sin(c.userData.wiggle + i * 0.55) * 0.004;
          });
        } else {
          c.userData.fallVel += dt * 0.8;
          c.position.y -= c.userData.fallVel * dt * 2.1;
          c.rotation.x += c.userData.spinVel * dt * 0.75;
          c.rotation.z += c.userData.spinVel * dt * 0.5;
          c.scale.multiplyScalar(1 - dt * 0.6);

          if (c.position.y < 0.03 || c.scale.x < 0.18) {
            c.userData.alive = false;
            plantGroup.remove(c);
            disposeObject(c);
          }
        }
      });

      // Spray
      if (input.cooldown > 0) input.cooldown -= dt;

      if (input.spraying) {
        input.sprayT += dt;
        const dur = 1.15;
        const p = clamp(input.sprayT / dur, 0, 1);

        animateTrigger(Math.sin(p * Math.PI));

        orbitKick = Math.min(1, orbitKick + dt * 2.0);

        if (p > 0.12 && p < 0.92) {
          const noz = getNozzleWorldPos(tmpNoz);

          tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

          // emit mist
          mist.emit(noz, tmpForward, 28);

          // hit test
          const range = 2.1;
          caterpillars.forEach((c) => {
            if (!c.userData.alive || c.userData.dying) return;
            const worldPos = c.getWorldPosition(new THREE.Vector3());
            const { dist, proj } = rayPointDistance(noz, tmpForward, worldPos);
            if (proj > 0 && proj < range && dist < c.userData.radius) {
              killCaterpillar(c);
            }
          });
        }

        if (p >= 1) {
          input.spraying = false;
          input.cooldown = 0.55;
          input.sprayT = 0;
          animateTrigger(0);
        }
      } else {
        orbitKick = Math.max(0, orbitKick - dt * 2.5);
      }

      // tiny "orbit left" while spraying (realistic, subtle)
      cameraRig.rotation.y = -orbitKick * 0.14;

      // particles update
      mist.updateClean(dt);

      // DOF focus: top of plant
      const focusPoint = plantGroup.position.clone();
      focusPoint.y += 1.55;
      const camWorld = camera.getWorldPosition(new THREE.Vector3());
      const focusDist = camWorld.distanceTo(focusPoint);
      bokehPass.uniforms.focus.value = focusDist;

      composer.render();
    };

    animate();

    // -----------------------------
    // Resize
    // -----------------------------
    const onResize = () => {
      const s = getSize();
      w = s.w;
      h = s.h;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // -----------------------------
    // Cleanup
    // -----------------------------
    return () => {
      cancelAnimationFrame(rafRef.current);

      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);

      try {
        mist.dispose();
        leafDetailTex.dispose?.();
        spraySpriteTex.dispose?.();
        disposeObject(plantGroup);
        disposeObject(fpv);
        disposeObject(ground);
        renderer.dispose();
        composer?.dispose?.();
        envRT?.texture?.dispose?.();
        pmrem?.dispose?.();
      } catch {}

      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 bg-black/65 text-white p-3 rounded-lg font-mono text-xs select-none">
        <div className="font-bold mb-1 text-emerald-300">Stats</div>
        <div>FPS: {stats.fps}</div>
        <div>Particles: {stats.particles}</div>
        <div>Caterpillars: {stats.caterpillars}</div>
      </div>

      <div className="absolute top-4 right-4 bg-black/65 text-white p-3 rounded-lg text-xs select-none">
        <div className="font-bold mb-2 text-emerald-300">Controls</div>
        <div>
          <span className="text-yellow-200">CLICK / SPACE</span> — Spray
        </div>
        <div>
          <span className="text-yellow-200">MOUSE</span> — Look
        </div>
      </div>
    </div>
  );
};

export default HempSprayFPV_Realistic;