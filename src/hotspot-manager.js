import * as THREE from 'three';
import { soundManager } from './sound-manager.js';

/**
 * Manages 3D Hotspot beacons and dynamic 2D Screen-space labels.
 * Integrates Raycasting, camera fly-to, pulsing visual rings, and click events.
 */
export class HotspotManager {
  constructor(scene, camera, renderer, container, onSelectHotspot) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.container = container;
    this.onSelectHotspot = onSelectHotspot;

    this.hotspotsData = [];
    this.hotspotObjects = []; // 3D Meshes in Three.js
    this.labelElements = []; // DOM overlay elements

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.beaconGroup = new THREE.Group();
    this.beaconGroup.name = 'HotspotsGroup';
    this.scene.add(this.beaconGroup);

    this.activeHotspotId = null;
    this.filterSystemId = 'all';

    this.initEventListeners();
  }

  initEventListeners() {
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  }

  setHotspots(hotspots) {
    this.hotspotsData = hotspots;
    this.rebuildBeacons();
  }

  setFilter(systemId) {
    this.filterSystemId = systemId;
    this.updateVisibility();
  }

  updateVisibility() {
    this.hotspotObjects.forEach((obj, idx) => {
      const data = this.hotspotsData[idx];
      const isVisible = this.filterSystemId === 'all' || data.systemId === this.filterSystemId;
      obj.visible = isVisible;
      if (this.labelElements[idx]) {
        this.labelElements[idx].style.display = isVisible ? 'flex' : 'none';
      }
    });
  }

  rebuildBeacons() {
    // Clear old
    while (this.beaconGroup.children.length > 0) {
      this.beaconGroup.remove(this.beaconGroup.children[0]);
    }
    this.labelElements.forEach((el) => el.remove());
    this.labelElements = [];
    this.hotspotObjects = [];

    // Build each hotspot
    this.hotspotsData.forEach((data, index) => {
      const beacon = new THREE.Group();
      beacon.position.set(data.position.x, data.position.y, data.position.z);
      beacon.userData = { id: data.id, index, data };

      const col = new THREE.Color(data.color || '#38bdf8');

      // Central glowing core sphere
      const coreGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.95
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      beacon.add(coreMesh);

      // Outer pulsing ring
      const ringGeo = new THREE.RingGeometry(0.06, 0.085, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.name = 'ring';
      beacon.add(ringMesh);

      // Second larger pulse ring
      const ring2Geo = new THREE.RingGeometry(0.085, 0.1, 32);
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2Mesh.name = 'ring2';
      beacon.add(ring2Mesh);

      this.beaconGroup.add(beacon);
      this.hotspotObjects.push(beacon);

      // Create 2D Overlay Label Element
      const label = document.createElement('div');
      label.className = 'hotspot-badge';
      label.dataset.id = data.id;
      label.innerHTML = `
        <div class="hotspot-pin" style="--pin-color: ${data.color}">
          <span class="hotspot-dot"></span>
        </div>
        <div class="hotspot-text">
          <div class="hotspot-title">${data.nameAr}</div>
          <div class="hotspot-sub">${data.nameEn}</div>
        </div>
      `;

      label.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectHotspot(data.id);
      });

      this.container.appendChild(label);
      this.labelElements.push(label);
    });

    this.updateVisibility();
  }

  onPointerDown(event) {
    // Only check if it was a primary click
    if (event.button !== 0) return;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.beaconGroup.children, true);

    if (intersects.length > 0) {
      let current = intersects[0].object;
      while (current && current.parent && !current.userData.id) {
        current = current.parent;
      }
      if (current && current.userData.id) {
        this.selectHotspot(current.userData.id);
      }
    }
  }

  selectHotspot(id) {
    this.activeHotspotId = id;
    const targetData = this.hotspotsData.find((h) => h.id === id);
    if (!targetData) return;

    soundManager.playUiBeep(750);

    // Update active style on 2D badges
    this.labelElements.forEach((el) => {
      if (el.dataset.id === id) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    if (this.onSelectHotspot) {
      this.onSelectHotspot(targetData);
    }
  }

  clearSelection() {
    this.activeHotspotId = null;
    this.labelElements.forEach((el) => el.classList.remove('active'));
  }

  update(time) {
    // Animate rings and project 3D positions to 2D screen coordinates
    const camera = this.camera;
    const rect = this.container.getBoundingClientRect();
    const tempV = new THREE.Vector3();

    this.hotspotObjects.forEach((beacon, idx) => {
      if (!beacon.visible) return;

      // Pulse rings
      const ring = beacon.getObjectByName('ring');
      const ring2 = beacon.getObjectByName('ring2');

      const s1 = 1.0 + Math.sin(time * 3.5 + idx) * 0.35;
      const s2 = 1.0 + Math.cos(time * 2.8 + idx) * 0.45;

      if (ring) {
        ring.scale.set(s1, s1, s1);
        ring.lookAt(camera.position);
      }
      if (ring2) {
        ring2.scale.set(s2, s2, s2);
        ring2.lookAt(camera.position);
      }

      // Project position to screen for 2D badge
      beacon.getWorldPosition(tempV);
      tempV.project(camera);

      // Check if behind camera
      const isBehind = tempV.z > 1;
      const label = this.labelElements[idx];

      if (label) {
        if (isBehind) {
          label.style.opacity = '0';
          label.style.pointerEvents = 'none';
        } else {
          const x = (tempV.x * 0.5 + 0.5) * rect.width;
          const y = (-(tempV.y * 0.5) + 0.5) * rect.height;

          label.style.left = `${x}px`;
          label.style.top = `${y}px`;
          label.style.opacity = '1';
          label.style.pointerEvents = 'auto';

          // Distance fading for depth realism
          const dist = camera.position.distanceTo(beacon.position);
          const scale = Math.max(0.7, Math.min(1.15, 3.5 / dist));
          label.style.transform = `translate(-50%, -100%) scale(${scale})`;
        }
      }
    });
  }
}
