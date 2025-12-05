// popup.js
// Gère l'interface utilisateur du popup et communique avec le content script

const selectorInput = document.getElementById("selector");
const extractBtn = document.getElementById("extractBtn");
const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const progressBarEl = document.querySelector(".progress-bar");
const includeImagesEl = document.getElementById("includeImages");
const inlineStylesEl = document.getElementById("inlineStyles");
const includeScriptsEl = document.getElementById("includeScripts");

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

extractBtn.addEventListener("click", async () => {
  const selector = selectorInput.value.trim();

  if (!selector) {
    setStatus("Merci de renseigner un sélecteur CSS valide.", "error");
    return;
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

    // Demande au background de créer le ZIP et de le télécharger
    await chrome.runtime.sendMessage({
      type: "CREATE_ZIP_AND_DOWNLOAD",
      payload: response.data,
    });

    setStatus("✅ Section extraite et ZIP téléchargé avec succès.", "success");
  } catch (error) {
    console.error("Erreur popup:", error);
    setStatus(error.message || "Erreur inattendue pendant l'extraction.", "error");
  } finally {
    setLoading(false);
  }
});
