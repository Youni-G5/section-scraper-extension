// popup.js - Version avec mode visuel

const selectorInput = document.getElementById("selector");
const extractBtn = document.getElementById("extractBtn");
const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const progressBarEl = document.querySelector(".progress-bar");
const includeImagesEl = document.getElementById("includeImages");
const inlineStylesEl = document.getElementById("inlineStyles");
const includeScriptsEl = document.getElementById("includeScripts");

// Nouveaux éléments pour le mode visuel
const visualModeBtn = document.getElementById("visualModeBtn");
const manualModeBtn = document.getElementById("manualModeBtn");
const visualModeContent = document.getElementById("visualMode");
const manualModeContent = document.getElementById("manualMode");
const activatePickerBtn = document.getElementById("activatePickerBtn");
const selectedInfo = document.getElementById("selectedInfo");
const selectedSelectorEl = document.getElementById("selectedSelector");
const clearSelectionBtn = document.getElementById("clearSelection");

let currentMode = "visual";
let selectedSelector = null;

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove("hidden");
}

function setLoading(isLoading) {
  extractBtn.disabled = isLoading;
  progressEl.classList.toggle("hidden", !isLoading);
  if (!isLoading) {
    progressBarEl.style.width = "0%";
  }
}

// Gestion des modes
visualModeBtn.addEventListener("click", () => {
  currentMode = "visual";
  visualModeBtn.classList.add("active");
  manualModeBtn.classList.remove("active");
  visualModeContent.classList.remove("hidden");
  manualModeContent.classList.add("hidden");
});

manualModeBtn.addEventListener("click", () => {
  currentMode = "manual";
  manualModeBtn.classList.add("active");
  visualModeBtn.classList.remove("active");
  manualModeContent.classList.remove("hidden");
  visualModeContent.classList.add("hidden");
});

// Activation du mode sélecteur visuel
activatePickerBtn.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Injecter le script de sélection visuelle
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["visual-selector.js"]
    });

    // Activer le mode sélection
    await chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_VISUAL_SELECTOR" });
    
    setStatus("👆 Clique sur la section que tu veux copier...", "info");
    
    // Fermer le popup (l'utilisateur va interagir avec la page)
    window.close();
  } catch (error) {
    console.error("Erreur activation picker:", error);
    setStatus("Erreur lors de l'activation du sélecteur visuel.", "error");
  }
});

// Écouter les sélections visuelles (via storage)
chrome.storage.local.get(["selectedSelector"], (result) => {
  if (result.selectedSelector) {
    selectedSelector = result.selectedSelector;
    selectedSelectorEl.textContent = selectedSelector;
    selectedInfo.classList.remove("hidden");
  }
});

// Annuler la sélection
clearSelectionBtn.addEventListener("click", () => {
  selectedSelector = null;
  chrome.storage.local.remove("selectedSelector");
  selectedInfo.classList.add("hidden");
  selectedSelectorEl.textContent = "";
});

// Extraction de la section
extractBtn.addEventListener("click", async () => {
  let selector;

  if (currentMode === "visual") {
    if (!selectedSelector) {
      setStatus("Merci de sélectionner une section en mode visuel d'abord.", "error");
      return;
    }
    selector = selectedSelector;
  } else {
    selector = selectorInput.value.trim();
    if (!selector) {
      setStatus("Merci de renseigner un sélecteur CSS valide.", "error");
      return;
    }
  }

  setLoading(true);
  setStatus("Extraction de la section en cours...", "info");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "SCRAPE_SECTION",
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
      throw new Error(response?.error || "Erreur inconnue lors de l'extraction.");
    }

    await chrome.runtime.sendMessage({
      type: "CREATE_ZIP_AND_DOWNLOAD",
      payload: response.data,
    });

    setStatus("✅ Section extraite et ZIP téléchargé avec succès.", "success");
    
    // Nettoyer la sélection après extraction réussie
    if (currentMode === "visual") {
      setTimeout(() => {
        selectedSelector = null;
        chrome.storage.local.remove("selectedSelector");
        selectedInfo.classList.add("hidden");
      }, 2000);
    }
  } catch (error) {
    console.error("Erreur popup:", error);
    setStatus(error.message || "Erreur inattendue pendant l'extraction.", "error");
  } finally {
    setLoading(false);
  }
});
