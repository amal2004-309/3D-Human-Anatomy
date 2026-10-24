/**
 * Interactive In-App JSON Editor & Live Re-loader
 * Allows the user to provide, paste, inspect, or modify the anatomy JSON data,
 * dynamically re-rendering the 3D hotspots, colors, and descriptions.
 */
export class JsonEditorManager {
  constructor(initialData, onDataUpdate) {
    this.currentData = initialData;
    this.onDataUpdate = onDataUpdate;
    this.modal = null;
    this.textarea = null;
    this.statusEl = null;

    this.createDom();
  }

  createDom() {
    this.modal = document.createElement('div');
    this.modal.className = 'json-modal-backdrop';
    this.modal.id = 'jsonModal';
    this.modal.style.display = 'none';

    this.modal.innerHTML = `
      <div class="json-modal-container">
        <div class="json-modal-header">
          <div class="json-modal-title">
            <span class="icon-code">{ }</span>
            <h3>محرر بيانات الأعضاء والـ Hotspots عبر الـ JSON</h3>
          </div>
          <button class="btn-icon-close" id="btnCloseJsonModal" title="إغلاق">✕</button>
        </div>

        <div class="json-modal-toolbar">
          <span class="toolbar-hint">قم بتعديل النقاط، الإحداثيات (x, y, z)، الألوان، أو الشروحات، ثم اضغط على "تطبيق وتحديث":</span>
          <div class="toolbar-actions">
            <button class="btn-tool" id="btnResetJson">إعادة التعيين للأصل</button>
            <button class="btn-tool" id="btnExportJson">تحميل ملف JSON ⬇</button>
            <label class="btn-tool file-label">
              رفع ملف JSON ⬆
              <input type="file" id="inputFileJson" accept=".json" style="display:none;" />
            </label>
          </div>
        </div>

        <div class="json-editor-wrapper">
          <textarea id="jsonEditorArea" spellcheck="false" placeholder="الصق بيانات الـ JSON هنا..."></textarea>
        </div>

        <div class="json-modal-footer">
          <div class="json-status" id="jsonStatus">جاهز للتحرير</div>
          <div class="footer-buttons">
            <button class="btn-secondary" id="btnCancelJson">إلغاء</button>
            <button class="btn-primary" id="btnApplyJson">تطبيق وتحديث النموذج ثلاثي الأبعاد ✨</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    this.textarea = this.modal.querySelector('#jsonEditorArea');
    this.statusEl = this.modal.querySelector('#jsonStatus');

    this.setupListeners();
    this.setText(this.currentData);
  }

  setupListeners() {
    this.modal.querySelector('#btnCloseJsonModal').addEventListener('click', () => this.close());
    this.modal.querySelector('#btnCancelJson').addEventListener('click', () => this.close());

    this.modal.querySelector('#btnApplyJson').addEventListener('click', () => this.applyJson());
    this.modal.querySelector('#btnResetJson').addEventListener('click', () => this.resetToDefault());

    this.modal.querySelector('#btnExportJson').addEventListener('click', () => this.exportJson());

    const fileInput = this.modal.querySelector('#inputFileJson');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.textarea.value = event.target.result;
          this.setStatus('تم تحميل الملف بنجاح! اضغط تطبيق للتحديث.', 'info');
        };
        reader.readAsText(file);
      }
    });

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
  }

  open() {
    this.setText(this.currentData);
    this.modal.style.display = 'flex';
    this.setStatus('يمكنك التعديل بحرية ثم تطبيق التغييرات.', 'info');
  }

  close() {
    this.modal.style.display = 'none';
  }

  setText(data) {
    try {
      this.textarea.value = JSON.stringify(data, null, 2);
    } catch (e) {
      this.textarea.value = '';
    }
  }

  setStatus(msg, type = 'info') {
    this.statusEl.textContent = msg;
    this.statusEl.className = `json-status status-${type}`;
  }

  applyJson() {
    try {
      const parsed = JSON.parse(this.textarea.value);
      if (!parsed.hotspots || !Array.isArray(parsed.hotspots)) {
        throw new Error('يجب أن يحتوي ملف الـ JSON على مصفوفة باسم "hotspots" تضم النقاط والأعضاء.');
      }

      this.currentData = parsed;
      this.setStatus('تم تطبيق وتحديث النموذج بنجاح!', 'success');

      if (this.onDataUpdate) {
        this.onDataUpdate(parsed);
      }

      setTimeout(() => this.close(), 700);
    } catch (err) {
      this.setStatus(`خطأ في الـ JSON: ${err.message}`, 'error');
    }
  }

  resetToDefault() {
    fetch('/src/data/anatomy-data.json')
      .then((res) => res.json())
      .then((data) => {
        this.currentData = data;
        this.setText(data);
        this.applyJson();
      })
      .catch((err) => {
        this.setStatus('فشل استعادة الأصل: ' + err.message, 'error');
      });
  }

  exportJson() {
    const blob = new Blob([this.textarea.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anatomy-hotspots-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
