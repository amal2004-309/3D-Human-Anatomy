import { AnatomyScene } from './src/anatomy-scene.js';
import { HotspotManager } from './src/hotspot-manager.js';
import { soundManager } from './src/sound-manager.js';

class AnatomyApp {
  constructor() {
    this.scene = null;
    this.hotspotManager = null;
    this.anatomyData = null;
    this.activeHotspot = null;
    this.isInsideHeart = false;
    this.soundActive = false;

    // EKG Monitor state
    this.ekgCanvas = document.getElementById('ekgCanvas');
    this.ekgCtx = this.ekgCanvas ? this.ekgCanvas.getContext('2d') : null;
    this.ekgPoints = [];
    this.ekgIndex = 0;

    this.init();
  }

  async init() {
    try {
      // 1. Load initial anatomy JSON data
      const response = await fetch('./src/data/anatomy-data.json');
      this.anatomyData = await response.json();

      // 2. Setup 3D Scene
      const canvasContainer = document.getElementById('canvas-container');
      this.scene = new AnatomyScene(canvasContainer);

      // 3. Setup Hotspot Manager
      this.hotspotManager = new HotspotManager(
        this.scene.scene,
        this.scene.camera,
        this.scene.renderer,
        canvasContainer,
        (hotspotData) => this.onHotspotSelected(hotspotData)
      );
      this.hotspotManager.setHotspots(this.anatomyData.hotspots);

      // 4. Setup EKG Graph and Event Listeners
      this.setupEkgMonitor();
      this.setupUiEvents();

      // 6. Start Render & Animation Loop
      this.startLoop();
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  setupUiEvents() {
    // Top System Filter Chips
    const navChips = document.querySelectorAll('.nav-chip');
    navChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        navChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const systemId = chip.dataset.system;
        this.filterSystem(systemId);
      });
    });

    // Sound toggle button
    const btnSound = document.getElementById('btnSoundToggle');
    const iconSound = btnSound ? btnSound.querySelector('.action-icon') : null;

    if (btnSound) {
      btnSound.addEventListener('click', () => {
        this.soundActive = soundManager.toggleSound();
        if (this.soundActive) {
          btnSound.classList.add('active-sound');
          if (iconSound) iconSound.textContent = '🔊';
          soundManager.startHeartbeat(72);
        } else {
          btnSound.classList.remove('active-sound');
          if (iconSound) iconSound.textContent = '🔈';
          soundManager.stopHeartbeat();
        }
      });
    }

    // Auto rotate toggle
    const btnAutoRotate = document.getElementById('btnAutoRotate');
    if (btnAutoRotate) {
      btnAutoRotate.addEventListener('click', () => {
        this.scene.controls.autoRotate = !this.scene.controls.autoRotate;
        btnAutoRotate.classList.toggle('active-rotate', this.scene.controls.autoRotate);
      });
    }

    // Reset Camera
    const btnReset = document.getElementById('btnResetCamera');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.scene.resetView();
        this.closeDrawer();
      });
    }

    // Mouse Guide card toggle
    const btnMouseGuide = document.getElementById('btnMouseGuide');
    const mouseGuideCard = document.getElementById('mouseGuideCard');
    const btnCloseGuide = document.getElementById('btnCloseGuide');

    btnMouseGuide.addEventListener('click', () => {
      mouseGuideCard.style.display =
        mouseGuideCard.style.display === 'none' ? 'block' : 'none';
    });
    if (btnCloseGuide) {
      btnCloseGuide.addEventListener('click', () => {
        mouseGuideCard.style.display = 'none';
      });
    }

    // View Angle Buttons
    const viewBtns = document.querySelectorAll('.btn-view[data-view]');
    viewBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.scene.setPresetView(btn.dataset.view);
      });
    });

    // Quick dock buttons
    const dockHeart = document.getElementById('dockBtnHeart');
    dockHeart.addEventListener('click', () => {
      const heartData = this.anatomyData.hotspots.find((h) => h.id === 'heart');
      if (heartData) {
        this.hotspotManager.selectHotspot('heart');
      }
    });

    const dockDigestive = document.getElementById('dockBtnDigestive');
    dockDigestive.addEventListener('click', () => {
      this.filterSystem('digestive');
      const stomachData = this.anatomyData.hotspots.find((h) => h.id === 'digestive_stomach');
      if (stomachData) {
        this.hotspotManager.selectHotspot('digestive_stomach');
      }
    });

    // Side Drawer close button
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    btnCloseDrawer.addEventListener('click', () => {
      this.closeDrawer();
    });

    // Drawer Tabs
    const drawerTabs = document.querySelectorAll('.drawer-tab');
    drawerTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        drawerTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const tabType = tab.dataset.tab;
        document.getElementById('tabPaneOverview').classList.toggle('active', tabType === 'overview');
        document.getElementById('tabPaneFacts').classList.toggle('active', tabType === 'facts');
      });
    });

    // Inside Heart Toggle Button
    const btnToggleInside = document.getElementById('btnToggleInsideHeart');
    const btnEnterHeartText = document.getElementById('btnEnterHeartText');
    btnToggleInside.addEventListener('click', () => {
      this.isInsideHeart = !this.isInsideHeart;
      this.scene.focusHeart(this.isInsideHeart);

      const chambersContainer = document.getElementById('chambersContainer');

      if (this.isInsideHeart) {
        btnEnterHeartText.textContent = '⮌ الرجوع للمظهر الخارجي للقلب';
        chambersContainer.style.display = 'flex';
      } else {
        btnEnterHeartText.textContent = '🔍 ادخل لداخل القلب ثلاثي الأبعاد';
        chambersContainer.style.display = 'none';
      }
    });
  }

  filterSystem(systemId) {
    this.scene.setSystemVisibility(systemId);
    this.hotspotManager.setFilter(systemId);

    // If digestive selected, move camera to abdomen
    if (systemId === 'digestive') {
      this.scene.focusDigestive();
    } else if (systemId === 'circulatory') {
      this.scene.focusHeart(false);
    } else if (systemId === 'all') {
      this.scene.resetView();
    }
  }

  onHotspotSelected(hotspotData) {
    this.activeHotspot = hotspotData;

    // Highlight in 3D digestive model if applicable
    if (hotspotData.id.startsWith('digestive_')) {
      this.scene.digestiveBuilder.highlightOrgan(hotspotData.id);
    }

    // Animate camera to focus on this organ
    if (hotspotData.id === 'heart') {
      this.scene.focusHeart(false);
      this.isInsideHeart = false;
      document.getElementById('btnEnterHeartText').textContent = '🔍 ادخل لداخل القلب ثلاثي الأبعاد';
      document.getElementById('chambersContainer').style.display = 'none';
    } else if (hotspotData.cameraFocus) {
      const t = hotspotData.cameraFocus.target;
      const p = hotspotData.cameraFocus.position;
      this.scene.animateCameraTo(
        new (window.THREE || this.scene.camera.position.constructor)(p.x, p.y, p.z),
        new (window.THREE || this.scene.camera.position.constructor)(t.x, t.y, t.z),
        1.2
      );
    }

    this.openDrawer(hotspotData);
  }

  openDrawer(data) {
    const drawer = document.getElementById('organDrawer');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');

    // Populate data
    document.getElementById('drawerOrganTag').textContent = data.tag || 'عضو حيوي';
    document.getElementById('drawerOrganTag').style.color = data.color;
    document.getElementById('drawerOrganTag').style.background = `${data.color}22`;

    document.getElementById('drawerOrganTitleAr').textContent = data.nameAr;
    document.getElementById('drawerOrganTitleEn').textContent = data.nameEn;
    document.getElementById('drawerSummaryText').textContent = data.summary;

    // Functions list
    const funcList = document.getElementById('drawerFunctionsList');
    funcList.innerHTML = '';
    (data.functions || []).forEach((f) => {
      const li = document.createElement('li');
      li.textContent = f;
      funcList.appendChild(li);
    });

    // Fun facts list
    const factsCont = document.getElementById('drawerFactsContainer');
    factsCont.innerHTML = '';
    (data.funFacts || []).forEach((fact) => {
      const card = document.createElement('div');
      card.className = 'fact-card';
      card.textContent = fact;
      factsCont.appendChild(card);
    });

    // Heart toolbar check
    const heartToolbar = document.getElementById('heartToolbar');
    const digestiveBanner = document.getElementById('digestiveBanner');

    if (data.id === 'heart') {
      heartToolbar.style.display = 'flex';
      digestiveBanner.style.display = 'none';

      // Populate chambers chips
      const chamberChips = document.getElementById('chamberChips');
      chamberChips.innerHTML = '';
      if (data.internalView && data.internalView.chambers) {
        data.internalView.chambers.forEach((ch) => {
          const chip = document.createElement('button');
          chip.className = 'chamber-chip';
          chip.textContent = ch.nameAr;
          chip.title = ch.desc;
          chip.addEventListener('click', () => {
            document.getElementById('drawerSummaryText').textContent = `${ch.nameAr} (${ch.nameEn}): ${ch.desc}`;
          });
          chamberChips.appendChild(chip);
        });
      }
    } else if (data.id.startsWith('digestive_')) {
      heartToolbar.style.display = 'none';
      digestiveBanner.style.display = 'flex';
    } else {
      heartToolbar.style.display = 'none';
      digestiveBanner.style.display = 'none';
    }
  }

  closeDrawer() {
    const drawer = document.getElementById('organDrawer');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    this.hotspotManager.clearSelection();
  }

  onJsonDataUpdated(newData) {
    this.anatomyData = newData;
    this.hotspotManager.setHotspots(newData.hotspots);

    if (this.activeHotspot) {
      const updatedActive = newData.hotspots.find((h) => h.id === this.activeHotspot.id);
      if (updatedActive) {
        this.openDrawer(updatedActive);
      }
    }
  }

  setupEkgMonitor() {
    if (!this.ekgCanvas || !this.ekgCtx) return;
    const w = this.ekgCanvas.width;
    const h = this.ekgCanvas.height;

    // Generate normal sinus rhythm P-Q-R-S-T wave pattern
    this.ekgPoints = [];
    const totalSamples = 120;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / totalSamples;
      let val = h / 2;

      if (t > 0.15 && t < 0.25) {
        // P Wave
        val -= Math.sin(((t - 0.15) / 0.1) * Math.PI) * 4;
      } else if (t >= 0.28 && t < 0.31) {
        // Q Wave
        val += 3;
      } else if (t >= 0.31 && t < 0.35) {
        // R Wave (Tall Spike)
        val -= 16;
      } else if (t >= 0.35 && t < 0.38) {
        // S Wave
        val += 6;
      } else if (t > 0.45 && t < 0.6) {
        // T Wave
        val -= Math.sin(((t - 0.45) / 0.15) * Math.PI) * 6;
      }

      this.ekgPoints.push(val);
    }
  }

  updateEkg() {
    if (!this.ekgCtx) return;
    const ctx = this.ekgCtx;
    const w = this.ekgCanvas.width;
    const h = this.ekgCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 6;

    const len = this.ekgPoints.length;
    for (let x = 0; x < w; x++) {
      const sampleIdx = Math.floor((x * 0.8 + this.ekgIndex) % len);
      const y = this.ekgPoints[sampleIdx];
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    this.ekgIndex = (this.ekgIndex + 1.2) % len;
  }

  startLoop() {
    const loop = () => {
      requestAnimationFrame(loop);

      if (this.scene) {
        this.scene.update();
      }

      if (this.hotspotManager && this.scene) {
        this.hotspotManager.update(this.scene.clock.getElapsedTime());
      }

      this.updateEkg();
    };

    loop();
  }
}

// Instantiate application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AnatomyApp();
});
