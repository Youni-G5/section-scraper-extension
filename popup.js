// popup.js - Version avec copie presse-papier

const selectorInput = document.getElementById('selector');
const extractBtn = document.getElementById('extractBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const progressBarEl = document.querySelector('.progress-bar');
const includeImagesEl = document.getElementById('includeImages');
const inlineStylesEl = document.getElementById('inlineStyles');
const includeScriptsEl = document.getElementById('includeScripts');

const visualModeBtn = document.getElementById('visualModeBtn');
const manualModeBtn = document.getElementById('manualModeBtn');
const visualModeContent = document.getElementById('visualMode');
const manualModeContent = document.getElementById('manualMode');
const activatePickerBtn = document.getElementById('activatePickerBtn');
const selectedInfo = document.getElementById('selectedInfo');
const selectedSelectorEl = document.getElementById('selectedSelector');
const clearSelectionBtn = document.getElementById('clearSelection');

let currentMode = 'visual';
let selectedSelector = null;
let extractedData = null; // Stocker les données extraites

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
  
  // Auto-hide après 5 secondes pour success
  if (type === 'success') {
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 5000);
  }
}

function setLoading(isLoading) {
  extractBtn.disabled = isLoading;
  downloadBtn.disabled = isLoading;
  progressEl.classList.toggle('hidden', !isLoading);
  if (isLoading) {
    extractBtn.style.opacity = '0.5';
    downloadBtn.style.opacity = '0.5';
  } else {
    extractBtn.style.opacity = '1';
    downloadBtn.style.opacity = '1';
    progressBarEl.style.width = '0%';
  }
}

// Gestion des modes
visualModeBtn.addEventListener('click', () => {
  currentMode = 'visual';
  visualModeBtn.classList.add('active');
  manualModeBtn.classList.remove('active');
  visualModeContent.classList.remove('hidden');
  manualModeContent.classList.add('hidden');
});

manualModeBtn.addEventListener('click', () => {
  currentMode = 'manual';
  manualModeBtn.classList.add('active');
  visualModeBtn.classList.remove('active');
  manualModeContent.classList.remove('hidden');
  visualModeContent.classList.add('hidden');
});

// Activation du sélecteur visuel
activatePickerBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    console.log('[Popup] Injection du script visuel');
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['visual-selector.js']
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[Popup] Activation du mode sélection');
    await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_VISUAL_SELECTOR' });
    
    setStatus('Clique sur la section que tu veux extraire', 'info');
    window.close();
  } catch (error) {
    console.error('[Popup] Erreur:', error);
    setStatus('Erreur lors de l\'activation du sélecteur', 'error');
  }
});

// Vérifier s'il y a une sélection au chargement
chrome.storage.local.get(['selectedSelector', 'timestamp'], (result) => {
  if (result.selectedSelector) {
    const age = Date.now() - (result.timestamp || 0);
    if (age < 5 * 60 * 1000) {
      selectedSelector = result.selectedSelector;
      selectedSelectorEl.textContent = selectedSelector;
      selectedInfo.classList.remove('hidden');
      console.log('[Popup] Sélection restaurée:', selectedSelector);
    } else {
      chrome.storage.local.remove(['selectedSelector', 'timestamp']);
    }
  }
});

// Annuler la sélection
clearSelectionBtn.addEventListener('click', () => {
  selectedSelector = null;
  extractedData = null;
  chrome.storage.local.remove(['selectedSelector', 'timestamp']);
  selectedInfo.classList.add('hidden');
  selectedSelectorEl.textContent = '';
  setStatus('Sélection effacée', 'info');
});

// Fonction pour extraire la section
async function extractSection() {
  let selector;

  if (currentMode === 'visual') {
    if (!selectedSelector) {
      setStatus('Sélectionne d\'abord une section en mode visuel', 'error');
      return null;
    }
    selector = selectedSelector;
  } else {
    selector = selectorInput.value.trim();
    if (!selector) {
      setStatus('Entre un sélecteur CSS valide', 'error');
      return null;
    }
  }

  setLoading(true);
  setStatus('Extraction en cours...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    console.log('[Popup] Extraction de:', selector);

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'SCRAPE_SECTION',
      payload: {
        selector,
        options: {
          includeImages: includeImagesEl.checked,
          inlineStyles: inlineStylesEl.checked,
          includeScripts: includeScriptsEl.checked,
        },
      },
    });

    if (!response || response.error) {
      throw new Error(response?.error || 'Erreur inconnue lors de l\'extraction');
    }

    console.log('[Popup] Extraction réussie');
    return response.data;
  } catch (error) {
    console.error('[Popup] Erreur:', error);
    setStatus(error.message || 'Erreur pendant l\'extraction', 'error');
    return null;
  } finally {
    setLoading(false);
  }
}

// Copier dans le presse-papier (bouton principal)
extractBtn.addEventListener('click', async () => {
  const data = await extractSection();
  if (!data) return;

  extractedData = data;

  // Formatter le code pour le presse-papier
  const formattedCode = `
/* ============================================
 * SECTION EXTRAITE
 * Source: ${data.meta.url}
 * Sélecteur: ${data.meta.selector}
 * Date: ${data.meta.extractedAt}
 * ============================================ */

/* ========== HTML ========== */

${data.html}


/* ========== CSS ========== */

<style>
${data.css}
</style>


/* ========== JAVASCRIPT ========== */

<script>
${data.js}
</script>
`;

  try {
    // Copier dans le presse-papier
    await navigator.clipboard.writeText(formattedCode);
    setStatus('✓ Code copié dans le presse-papier !', 'success');
    
    // Nettoyer la sélection après copie
    if (currentMode === 'visual') {
      setTimeout(() => {
        selectedSelector = null;
        chrome.storage.local.remove(['selectedSelector', 'timestamp']);
        selectedInfo.classList.add('hidden');
      }, 2000);
    }
  } catch (error) {
    console.error('[Popup] Erreur copie:', error);
    setStatus('Erreur lors de la copie dans le presse-papier', 'error');
  }
});

// Télécharger en ZIP (bouton secondaire)
downloadBtn.addEventListener('click', async () => {
  let data = extractedData;
  
  // Si pas de données en cache, extraire
  if (!data) {
    data = await extractSection();
    if (!data) return;
    extractedData = data;
  }

  console.log('[Popup] Création du ZIP');

  try {
    await chrome.runtime.sendMessage({
      type: 'CREATE_ZIP_AND_DOWNLOAD',
      payload: data,
    });

    setStatus('✓ ZIP téléchargé avec succès', 'success');
    
    if (currentMode === 'visual') {
      setTimeout(() => {
        selectedSelector = null;
        chrome.storage.local.remove(['selectedSelector', 'timestamp']);
        selectedInfo.classList.add('hidden');
      }, 2000);
    }
  } catch (error) {
    console.error('[Popup] Erreur ZIP:', error);
    setStatus('Erreur lors de la création du ZIP', 'error');
  }
});

console.log('[Popup] Script popup.js chargé');
