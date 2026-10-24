import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HeartViewer } from './heart-viewer.js';
import { DigestiveSystemBuilder } from './digestive-system.js';

export class AnatomyScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = canvasContainer.clientWidth;
    this.height = canvasContainer.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.8, 4.6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls for mouse navigation
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 8.0;
    this.controls.target.set(0, 0.5, 0);

    // Camera animation targets
    this.cameraAnimating = false;
    this.camTargetPos = new THREE.Vector3();
    this.camTargetLook = new THREE.Vector3();
    this.camAnimDuration = 1.2;
    this.camAnimStart = 0;
    this.camStartPos = new THREE.Vector3();
    this.camStartLook = new THREE.Vector3();

    // Scene groups
    this.bodyGroup = new THREE.Group();
    this.scene.add(this.bodyGroup);

    this.setupLighting();
    this.setupEnvironment();
    this.buildBodySilhouette();
    this.buildBrain();
    this.buildLungs();

    // Handcrafted systems
    this.heartViewer = new HeartViewer();
    this.scene.add(this.heartViewer.group);

    this.digestiveBuilder = new DigestiveSystemBuilder();
    this.scene.add(this.digestiveBuilder.group);

    this.initResize();
    this.clock = new THREE.Clock();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Cyan rim key light
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    keyLight.position.set(3, 4, 3);
    this.scene.add(keyLight);

    // Warm fill light
    const fillLight = new THREE.DirectionalLight(0xf43f5e, 1.2);
    fillLight.position.set(-3, 1, 2);
    this.scene.add(fillLight);

    // Rim back light for holographic silhouette glow
    const backLight = new THREE.DirectionalLight(0x818cf8, 2.2);
    backLight.position.set(0, 3, -4);
    this.scene.add(backLight);
  }

  setupEnvironment() {
    // Subtle cyber grid floor
    const grid = new THREE.GridHelper(8, 24, 0x0284c7, 0x0f172a);
    grid.position.y = -2.2;
    this.scene.add(grid);

    // Ambient floating star/dust particles
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 8;
      pos[i + 1] = (Math.random() - 0.5) * 6;
      pos[i + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.025,
      transparent: true,
      opacity: 0.4
    });
    this.ambientParticles = new THREE.Points(geo, mat);
    this.scene.add(this.ambientParticles);
  }

  buildBodySilhouette() {
    // Glassmorphic translucent body outline
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      emissive: 0x0284c7,
      emissiveIntensity: 0.15,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.85,
      thickness: 0.8,
      transparent: true,
      opacity: 0.28,
      wireframe: false
    });

    const torsoGeo = new THREE.CylinderGeometry(0.48, 0.42, 1.7, 32, 16);
    const torsoMesh = new THREE.Mesh(torsoGeo, bodyMat);
    torsoMesh.position.set(0, 0.45, 0);
    this.bodyGroup.add(torsoMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.32, 32, 32);
    headGeo.scale(0.85, 1.15, 0.95);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.position.set(0, 1.8, 0);
    this.bodyGroup.add(headMesh);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 24);
    const neckMesh = new THREE.Mesh(neckGeo, bodyMat);
    neckMesh.position.set(0, 1.4, 0);
    this.bodyGroup.add(neckMesh);

    // Shoulders & Pelvis
    const pelvisGeo = new THREE.CylinderGeometry(0.42, 0.38, 0.6, 24);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, bodyMat);
    pelvisMesh.position.set(0, -0.65, 0);
    this.bodyGroup.add(pelvisMesh);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.16, 0.12, 1.4, 16);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(0.22, -1.5, 0);
    this.bodyGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(-0.22, -1.5, 0);
    this.bodyGroup.add(legR);

    // Rib cage stylized rings
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.6,
      transparent: true,
      opacity: 0.35
    });
    for (let i = 0; i < 7; i++) {
      const ringGeo = new THREE.TorusGeometry(0.44 - i * 0.02, 0.015, 8, 32, Math.PI * 1.5);
      const ringMesh = new THREE.Mesh(ringGeo, ribMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.rotation.z = Math.PI * 0.25;
      ringMesh.position.set(0, 1.0 - i * 0.12, 0.05);
      this.bodyGroup.add(ringMesh);
    }
  }

  buildBrain() {
    const brainGroup = new THREE.Group();
    brainGroup.position.set(0, 1.78, 0.02);

    const brainMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.7
    });

    // Left hemisphere
    const hemiGeoL = new THREE.SphereGeometry(0.18, 24, 24);
    hemiGeoL.scale(0.85, 1.0, 1.15);
    const hemiL = new THREE.Mesh(hemiGeoL, brainMat);
    hemiL.position.x = 0.08;
    brainGroup.add(hemiL);

    // Right hemisphere
    const hemiGeoR = new THREE.SphereGeometry(0.18, 24, 24);
    hemiGeoR.scale(0.85, 1.0, 1.15);
    const hemiR = new THREE.Mesh(hemiGeoR, brainMat);
    hemiR.position.x = -0.08;
    brainGroup.add(hemiR);

    // Cerebellum
    const cereGeo = new THREE.SphereGeometry(0.1, 16, 16);
    cereGeo.scale(1.2, 0.8, 0.9);
    const cere = new THREE.Mesh(cereGeo, brainMat);
    cere.position.set(0, -0.12, -0.1);
    brainGroup.add(cere);

    // Brain stem / Spinal cord
    const cordPoints = [
      new THREE.Vector3(0, -0.12, -0.05),
      new THREE.Vector3(0, -0.5, -0.05),
      new THREE.Vector3(0, -1.2, -0.05),
      new THREE.Vector3(0, -2.0, -0.05)
    ];
    const cordCurve = new THREE.CatmullRomCurve3(cordPoints);
    const cordGeo = new THREE.TubeGeometry(cordCurve, 32, 0.025, 8, false);
    const cordMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const cordMesh = new THREE.Mesh(cordGeo, cordMat);
    brainGroup.add(cordMesh);

    this.scene.add(brainGroup);
    this.brainGroup = brainGroup;
  }

  buildLungs() {
    const lungsGroup = new THREE.Group();
    lungsGroup.position.set(0, 0.75, 0.1);

    const lungMat = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.25,
      roughness: 0.45,
      transparent: true,
      opacity: 0.75
    });

    // Trachea
    const tracheaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, 0.08),
      new THREE.Vector3(0, 0.25, 0.08),
      new THREE.Vector3(0, 0.1, 0.08)
    ]);
    const tracheaGeo = new THREE.TubeGeometry(tracheaCurve, 16, 0.035, 12, false);
    const tracheaMesh = new THREE.Mesh(tracheaGeo, lungMat);
    lungsGroup.add(tracheaMesh);

    // Left Lung (slighter smaller to accommodate heart)
    const lungGeoL = new THREE.ConeGeometry(0.18, 0.52, 24);
    lungGeoL.scale(1.0, 1.0, 0.85);
    const lungL = new THREE.Mesh(lungGeoL, lungMat);
    lungL.position.set(0.24, 0.02, 0.08);
    lungL.rotation.z = -0.15;
    lungsGroup.add(lungL);

    // Right Lung
    const lungGeoR = new THREE.ConeGeometry(0.21, 0.56, 24);
    lungGeoR.scale(1.0, 1.0, 0.9);
    const lungR = new THREE.Mesh(lungGeoR, lungMat);
    lungR.position.set(-0.25, 0.04, 0.08);
    lungR.rotation.z = 0.15;
    lungsGroup.add(lungR);

    this.scene.add(lungsGroup);
    this.lungsGroup = lungsGroup;
  }

  animateCameraTo(targetPos, lookTarget, duration = 1.2) {
    this.cameraAnimating = true;
    this.camAnimDuration = duration;
    this.camAnimStart = this.clock.getElapsedTime();

    this.camStartPos.copy(this.camera.position);
    this.camStartLook.copy(this.controls.target);

    this.camTargetPos.copy(targetPos);
    this.camTargetLook.copy(lookTarget);
  }

  resetView() {
    this.animateCameraTo(
      new THREE.Vector3(0, 0.8, 4.6),
      new THREE.Vector3(0, 0.5, 0),
      1.2
    );
    this.heartViewer.setInsideMode(false);
  }

  focusHeart(inside = false) {
    if (inside) {
      this.heartViewer.setInsideMode(true);
      // Zoom right into heart interior
      this.animateCameraTo(
        new THREE.Vector3(0.14, 0.72, 1.0),
        new THREE.Vector3(0.12, 0.68, 0.45),
        1.4
      );
    } else {
      this.heartViewer.setInsideMode(false);
      // Detailed cardiac view
      this.animateCameraTo(
        new THREE.Vector3(0.35, 0.85, 2.0),
        new THREE.Vector3(0.12, 0.68, 0.45),
        1.2
      );
    }
  }

  focusDigestive() {
    this.heartViewer.setInsideMode(false);
    this.animateCameraTo(
      new THREE.Vector3(0, 0.2, 2.4),
      new THREE.Vector3(0, 0.1, 0.3),
      1.2
    );
  }

  setPresetView(angle) {
    let pos = new THREE.Vector3(0, 0.8, 4.6);
    let target = new THREE.Vector3(0, 0.5, 0);

    if (angle === 'front') {
      pos.set(0, 0.6, 4.4);
    } else if (angle === 'side_right') {
      pos.set(4.2, 0.6, 0.5);
    } else if (angle === 'side_left') {
      pos.set(-4.2, 0.6, 0.5);
    } else if (angle === 'top') {
      pos.set(0, 5.0, 1.2);
    } else if (angle === 'back') {
      pos.set(0, 0.6, -4.4);
    }

    this.animateCameraTo(pos, target, 1.0);
  }

  setSystemVisibility(systemId) {
    const showAll = systemId === 'all';

    // Heart / Circulatory
    this.heartViewer.group.visible = showAll || systemId === 'circulatory';

    // Digestive
    this.digestiveBuilder.group.visible = showAll || systemId === 'digestive';

    // Nervous
    if (this.brainGroup) {
      this.brainGroup.visible = showAll || systemId === 'nervous';
    }

    // Respiratory
    if (this.lungsGroup) {
      this.lungsGroup.visible = showAll || systemId === 'respiratory';
    }
  }

  initResize() {
    window.addEventListener('resize', () => {
      this.width = this.container.clientWidth;
      this.height = this.container.clientHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    });
  }

  update() {
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Camera animation tween
    if (this.cameraAnimating) {
      const elapsed = time - this.camAnimStart;
      const t = Math.min(1.0, elapsed / this.camAnimDuration);

      // Smooth ease-in-out quint
      const ease = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

      this.camera.position.lerpVectors(this.camStartPos, this.camTargetPos, ease);
      this.controls.target.lerpVectors(this.camStartLook, this.camTargetLook, ease);

      if (t >= 1.0) {
        this.cameraAnimating = false;
      }
    }

    this.controls.update();

    // Update organs
    this.heartViewer.update(time, delta);
    this.digestiveBuilder.update(time, delta);

    // Subtle lung breathing
    if (this.lungsGroup) {
      const breath = 1.0 + Math.sin(time * 1.5) * 0.04;
      this.lungsGroup.scale.set(breath, breath, breath);
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}
