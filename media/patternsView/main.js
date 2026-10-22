(function () {
  const vscode = acquireVsCodeApi();

  const globalToggle = document.getElementById('globalToggle');
  const addPatternBtn = document.getElementById('addPatternBtn');
  const addForm = document.getElementById('addForm');
  const addPatternInput = document.getElementById('addPatternInput');
  const addColorSwatch = document.getElementById('addColorSwatch');
  const addPatternConfirm = document.getElementById('addPatternConfirm');
  const addPatternCancel = document.getElementById('addPatternCancel');
  const addError = document.getElementById('addError');
  const patternList = document.getElementById('patternList');
  const emptyState = document.getElementById('emptyState');
  const themeSelect = document.getElementById('themeSelect');
  const themeNameInput = document.getElementById('themeName');
  const themeJsonInput = document.getElementById('themeJson');
  const importThemeBtn = document.getElementById('importThemeBtn');
  const exportThemeBtn = document.getElementById('exportThemeBtn');
  const themeError = document.getElementById('themeError');
  const colorPalette = document.getElementById('colorPalette');

  const EYE_OPEN =
    '<svg class="eye-icon" viewBox="0 0 16 16" aria-hidden="true">' +
    '<path fill="currentColor" d="M8 3C4.5 3 1.7 5.1 1 8c.7 2.9 3.5 5 7 5s6.3-2.1 7-5c-.7-2.9-3.5-5-7-5zm0 8.5A3.5 3.5 0 1 1 8 4.5a3.5 3.5 0 0 1 0 7zm0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>' +
    '</svg>';
  const EYE_CLOSED =
    '<svg class="eye-icon" viewBox="0 0 16 16" aria-hidden="true">' +
    '<path fill="currentColor" d="M1.5 1.2 2.2.5l13.3 13.3-.7.7-2.4-2.4A8.4 8.4 0 0 1 8 13c-3.5 0-6.3-2.1-7-5 .3-1.3 1.1-2.5 2.1-3.4L1.5 1.2zm4.6 4.6A2 2 0 0 0 8 10.5c.3 0 .5 0 .8-.1L6.1 5.8zM8 3c3.5 0 6.3 2.1 7 5a7.4 7.4 0 0 1-2.1 3.1l-1.1-1.1A3.5 3.5 0 0 0 8 4.5c-.4 0-.7.1-1 .2L5.7 3.4C6.4 3.1 7.2 3 8 3z"/>' +
    '</svg>';

  let state = {
    patterns: [],
    enableCustomPatterns: true,
    colorThemes: {},
    activeTheme: 'Default',
    activeThemeColors: []
  };
  let editingIndex = null;
  let addSelectedColor = null;
  let paletteContext = null;

  function post(message) {
    vscode.postMessage(message);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeColor(value) {
    return (value || '').trim().toLowerCase();
  }

  function colorKey(foreground, background) {
    return normalizeColor(foreground) + '|' + normalizeColor(background);
  }

  function getActiveThemeColors() {
    if (state.activeThemeColors && state.activeThemeColors.length) {
      return state.activeThemeColors;
    }
    const themes = state.colorThemes || {};
    return themes[state.activeTheme] || [];
  }

  function findColorIndex(foreground, background) {
    const key = colorKey(foreground, background);
    const colors = getActiveThemeColors();
    for (let i = 0; i < colors.length; i++) {
      if (colorKey(colors[i].foreground, colors[i].background) === key) {
        return i;
      }
    }
    return -1;
  }

  function pickUnusedColor() {
    const colors = getActiveThemeColors();
    if (!colors.length) {
      return null;
    }
    const used = new Set(
      (state.patterns || []).map((p) => colorKey(p.foreground, p.background))
    );
    for (let i = 0; i < colors.length; i++) {
      if (!used.has(colorKey(colors[i].foreground, colors[i].background))) {
        return colors[i];
      }
    }
    return colors[(state.patterns || []).length % colors.length];
  }

  function displayFill(color) {
    if (!color) {
      return 'transparent';
    }
    // Prefer opaque-looking preview: use foreground when background is very transparent.
    return color.foreground || color.background || 'transparent';
  }

  function applySwatch(el, color) {
    if (!el) {
      return;
    }
    el.style.background = displayFill(color);
    el.style.borderColor = color && color.foreground
      ? color.foreground
      : 'var(--vscode-panel-border, rgba(128,128,128,0.5))';
  }

  function closePalette() {
    paletteContext = null;
    colorPalette.hidden = true;
    colorPalette.innerHTML = '';
  }

  function openPalette(anchorEl, selectedColor, onPick) {
    const colors = getActiveThemeColors();
    if (!colors.length) {
      return;
    }

    paletteContext = { onPick };
    colorPalette.innerHTML = '';
    colors.forEach((color) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-swatch';
      btn.title = (color.foreground || '') + ' / ' + (color.background || '');
      btn.style.background = displayFill(color);
      if (selectedColor &&
          colorKey(selectedColor.foreground, selectedColor.background) ===
          colorKey(color.foreground, color.background)) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pick = paletteContext && paletteContext.onPick;
        closePalette();
        if (pick) {
          pick(color);
        }
      });
      colorPalette.appendChild(btn);
    });

    colorPalette.hidden = false;

    const anchorRect = anchorEl.getBoundingClientRect();
    const paletteWidth = colorPalette.offsetWidth || 140;
    const left = Math.min(
      Math.max(8, anchorRect.left),
      window.innerWidth - paletteWidth - 8
    );
    const top = anchorRect.bottom + 6;
    colorPalette.style.left = left + 'px';
    colorPalette.style.top = top + 'px';
  }

  function renderThemes() {
    const names = Object.keys(state.colorThemes || {});
    themeSelect.innerHTML = names.map((name) => {
      const selected = name === state.activeTheme ? ' selected' : '';
      return '<option value="' + escapeHtml(name) + '"' + selected + '>' + escapeHtml(name) + '</option>';
    }).join('');
  }

  function renderPatterns() {
    const patterns = state.patterns || [];
    patternList.innerHTML = '';
    emptyState.style.display = patterns.length === 0 ? 'block' : 'none';

    patterns.forEach((item, index) => {
      const li = document.createElement('li');
      const enabled = item.enabled !== false;
      li.className = 'pattern-item' + (enabled ? '' : ' disabled');

      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch swatch-btn';
      swatch.title = 'Change color';
      swatch.setAttribute('aria-label', 'Change color');
      applySwatch(swatch, item);
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        openPalette(swatch, item, (color) => {
          post({
            type: 'setPatternColor',
            index,
            foreground: color.foreground,
            background: color.background
          });
        });
      });

      const textWrap = document.createElement('div');
      textWrap.className = 'pattern-text';
      textWrap.title = 'Double-click to edit';

      if (editingIndex === index) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = item.pattern || '';
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            commitEdit(index, input.value);
          } else if (e.key === 'Escape') {
            editingIndex = null;
            renderPatterns();
          }
        });
        input.addEventListener('blur', () => {
          if (editingIndex === index) {
            commitEdit(index, input.value);
          }
        });
        textWrap.appendChild(input);
        setTimeout(() => {
          input.focus();
          input.select();
        }, 0);
      } else {
        textWrap.textContent = item.pattern || '';
        textWrap.addEventListener('dblclick', () => {
          editingIndex = index;
          renderPatterns();
        });
      }

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'icon eye-btn';
      toggleBtn.type = 'button';
      toggleBtn.title = enabled ? 'Hide pattern' : 'Show pattern';
      toggleBtn.setAttribute('aria-label', enabled ? 'Hide pattern' : 'Show pattern');
      toggleBtn.innerHTML = enabled ? EYE_OPEN : EYE_CLOSED;
      toggleBtn.addEventListener('click', () => {
        post({ type: 'togglePattern', index, enabled: !enabled });
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon';
      deleteBtn.type = 'button';
      deleteBtn.title = 'Delete pattern';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => {
        post({ type: 'deletePattern', index });
      });

      li.appendChild(swatch);
      li.appendChild(textWrap);
      li.appendChild(toggleBtn);
      li.appendChild(deleteBtn);
      patternList.appendChild(li);
    });
  }

  function commitEdit(index, value) {
    editingIndex = null;
    const trimmed = (value || '').trim();
    if (!trimmed || trimmed === (state.patterns[index] && state.patterns[index].pattern)) {
      renderPatterns();
      return;
    }
    post({ type: 'editPattern', index, pattern: trimmed });
  }

  function syncAddColorPreview() {
    applySwatch(addColorSwatch, addSelectedColor);
  }

  function openAddForm() {
    addError.textContent = '';
    addPatternInput.value = '';
    addSelectedColor = pickUnusedColor();
    syncAddColorPreview();
    addForm.hidden = false;
    addPatternBtn.disabled = true;
    addPatternInput.focus();
  }

  function closeAddForm() {
    addForm.hidden = true;
    addPatternBtn.disabled = false;
    addError.textContent = '';
    closePalette();
  }

  function submitAddForm() {
    const pattern = (addPatternInput.value || '').trim();
    if (!pattern) {
      addError.textContent = 'Pattern cannot be empty.';
      addPatternInput.focus();
      return;
    }
    addError.textContent = '';
    post({
      type: 'addPattern',
      pattern,
      foreground: addSelectedColor ? addSelectedColor.foreground : undefined,
      background: addSelectedColor ? addSelectedColor.background : undefined
    });
    closeAddForm();
  }

  function render() {
    globalToggle.checked = !!state.enableCustomPatterns;
    renderThemes();
    renderPatterns();
    if (!addForm.hidden) {
      if (addSelectedColor) {
        const idx = findColorIndex(addSelectedColor.foreground, addSelectedColor.background);
        if (idx < 0) {
          addSelectedColor = pickUnusedColor();
        } else {
          addSelectedColor = getActiveThemeColors()[idx];
        }
      } else {
        addSelectedColor = pickUnusedColor();
      }
      syncAddColorPreview();
    }
  }

  globalToggle.addEventListener('change', () => {
    post({ type: 'toggleAll', enabled: globalToggle.checked });
  });

  addPatternBtn.addEventListener('click', () => {
    openAddForm();
  });

  addPatternConfirm.addEventListener('click', () => {
    submitAddForm();
  });

  addPatternCancel.addEventListener('click', () => {
    closeAddForm();
  });

  addPatternInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitAddForm();
    } else if (e.key === 'Escape') {
      closeAddForm();
    }
  });

  addColorSwatch.addEventListener('click', (e) => {
    e.stopPropagation();
    openPalette(addColorSwatch, addSelectedColor, (color) => {
      addSelectedColor = color;
      syncAddColorPreview();
    });
  });

  document.addEventListener('click', () => {
    closePalette();
  });

  colorPalette.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  themeSelect.addEventListener('change', () => {
    post({ type: 'setActiveTheme', name: themeSelect.value });
  });

  importThemeBtn.addEventListener('click', () => {
    themeError.textContent = '';
    post({
      type: 'importTheme',
      name: themeNameInput.value,
      json: themeJsonInput.value
    });
  });

  exportThemeBtn.addEventListener('click', () => {
    themeError.textContent = '';
    post({ type: 'exportTheme' });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || !message.type) {
      return;
    }

    if (message.type === 'state') {
      state = message;
      render();
      return;
    }

    if (message.type === 'exportThemeResult') {
      themeJsonInput.value = message.json || '';
      themeNameInput.value = state.activeTheme || '';
      themeError.textContent = 'Exported current theme JSON into the box below. Copy it as needed.';
      return;
    }

    if (message.type === 'error') {
      if (!addForm.hidden) {
        addError.textContent = message.message || 'Unexpected error';
      }
      themeError.textContent = message.message || 'Unexpected error';
      return;
    }

    if (message.type === 'info') {
      themeError.textContent = message.message || '';
    }
  });

  post({ type: 'ready' });
})();
