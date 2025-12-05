// popup.js - Version corrigée avec gestion complète

const selectorInput = document.getElementById('selector');
const extractBtn = document.getElementById('extractBtn');
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

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

function setLoading(isLoading) {
  extractBtn.disabled = isLoading;
  progressEl.classList.toggle('hidden', !isLoading);
  if (isLoading) {
    extractBtn.style.opacity = '0.5';
  } else {
    extractBtn.style.opacity = '1';
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
    
    // Injecter le script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['visual-selector.js']
    });

    // Petit délai pour s'assurer que le script est chargé
    await new Promise(resolve => setTimeout(resolve, 100));

    // Activer le mode sélection
    console.log('[Popup] Activation du mode sélection');
    await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_VISUAL_SELECTOR' });
    
    setStatus('Clique sur la section que tu veux extraire', 'info');
    
    // Fermer le popup
    window.close();
  } catch (error) {
    console.error('[Popup] Erreur:', error);
    setStatus('Erreur lors de l\'activation du sélecteur', 'error');
  }
});

// Vérifier s'il y a une sélection au chargement
chrome.storage.local.get(['selectedSelector', 'timestamp'], (result) => {
  if (result.selectedSelector) {
    // Vérifier que la sélection n'est pas trop ancienne (5 minutes)
    const age = Date.now() - (result.timestamp || 0);
    if (age < 5 * 60 * 1000) {
      selectedSelector = result.selectedSelector;
      selectedSelectorEl.textContent = selectedSelector;
      selectedInfo.classList.remove('hidden');
      console.log('[Popup] Sélection restaurée:', selectedSelector);
    } else {
      // Nettoyer les anciennes sélections
      chrome.storage.local.remove(['selectedSelector', 'timestamp']);
    }
  }
});

// Écouter les messages (sélection effectuée)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SELECTOR_PICKED') {
    selectedSelector = message.selector;
    selectedSelectorEl.textContent = selectedSelector;
    selectedInfo.classList.remove('hidden');
    console.log('[Popup] Nouvelle sélection reçue:', selectedSelector);
  }
});

// Annuler la sélection
clearSelectionBtn.addEventListener('click', () => {
  selectedSelector = null;
  chrome.storage.local.remove(['selectedSelector', 'timestamp']);
  selectedInfo.classList.add('hidden');
  selectedSelectorEl.textContent = '';
  setStatus('Sélection effacée', 'info');
  setTimeout(() => statusEl.classList.add('hidden'), 2000);
});

// Extraction de la section
extractBtn.addEventListener('click', async () => {
  let selector;

  if (currentMode === 'visual') {
    if (!selectedSelector) {
      setStatus('Sélectionne d\'abord une section en mode visuel', 'error');
      return;
    }
    selector = selectedSelector;
  } else {
    selector = selectorInput.value.trim();
    if (!selector) {
      setStatus('Entre un sélecteur CSS valide', 'error');
      return;
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

    console.log('[Popup] Création du ZIP');

    await chrome.runtime.sendMessage({
      type: 'CREATE_ZIP_AND_DOWNLOAD',
      payload: response.data,
    });

    setStatus('✓ Section extraite avec succès', 'success');
    
    // Nettoyer la sélection après extraction
    if (currentMode === 'visual') {
      setTimeout(() => {
        selectedSelector = null;
        chrome.storage.local.remove(['selectedSelector', 'timestamp']);
        selectedInfo.classList.add('hidden');
      }, 2000);
    }
  } catch (error) {
    console.error('[Popup] Erreur:', error);
    setStatus(error.message || 'Erreur pendant l\'extraction', 'error');
  } finally {
    setLoading(false);
  }
});

console.log('[Popup] Script popup.js chargé');
