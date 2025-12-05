// visual-selector.js
// Script injecté pour permettre la sélection visuelle d'éléments sur la page

(function() {
  // Vérifier si le mode est déjà actif
  if (window.__sectionScraperActive) {
    return;
  }

  window.__sectionScraperActive = true;

  let currentElement = null;
  let overlay = null;
  let isActive = false;

  // Créer l'overlay de surbrillance
  function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "section-scraper-overlay";
    overlay.style.cssText = `
      position: absolute;
      background: rgba(59, 130, 246, 0.3);
      border: 3px solid #3b82f6;
      pointer-events: none;
      z-index: 2147483647;
      transition: all 0.1s ease;
      box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(overlay);
  }

  // Créer le badge d'information
  function createInfoBadge() {
    const badge = document.createElement("div");
    badge.id = "section-scraper-badge";
    badge.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideDown 0.3s ease;
    `;
    badge.innerHTML = `
      🎯 Clique sur la section à copier | <span style="opacity: 0.8; font-size: 12px;">ESC pour annuler</span>
    `;
    document.body.appendChild(badge);

    // Animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // Mettre à jour la position de l'overlay
  function updateOverlay(element) {
    if (!element || !overlay) return;

    const rect = element.getBoundingClientRect();
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  // Générer un sélecteur CSS optimal pour un élément
  function generateSelector(element) {
    if (!element) return "";

    // Si ID unique, l'utiliser
    if (element.id && document.querySelectorAll(`#${element.id}`).length === 1) {
      return `#${element.id}`;
    }

    // Si classe unique
    if (element.className && typeof element.className === "string") {
      const classes = element.className.trim().split(/\s+/);
      for (const cls of classes) {
        const selector = `.${cls}`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    // Utiliser data-attributes si disponibles
    for (const attr of element.attributes) {
      if (attr.name.startsWith("data-")) {
        const selector = `[${attr.name}="${attr.value}"]`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    // Sinon, construire un chemin avec nth-child
    const parts = [];
    let current = element;
    let attempts = 0;

    while (current && current.nodeType === 1 && attempts < 5) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        parts.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === "string") {
        const classes = current.className.trim().split(/\s+/).slice(0, 2);
        if (classes.length) {
          selector += "." + classes.join(".");
        }
      }

      // Ajouter nth-child si nécessaire
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(
          (el) => el.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(selector);
      current = current.parentElement;
      attempts++;
    }

    return parts.join(" > ");
  }

  // Gestionnaire de survol
  function handleMouseMove(e) {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    currentElement = e.target;

    // Ignorer l'overlay et le badge
    if (currentElement.id === "section-scraper-overlay" || 
        currentElement.id === "section-scraper-badge") {
      return;
    }

    updateOverlay(currentElement);
  }

  // Gestionnaire de clic
  function handleClick(e) {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    if (currentElement && 
        currentElement.id !== "section-scraper-overlay" && 
        currentElement.id !== "section-scraper-badge") {
      
      const selector = generateSelector(currentElement);
      
      // Sauvegarder dans le storage
      chrome.storage.local.set({ selectedSelector: selector });

      // Feedback visuel
      overlay.style.background = "rgba(16, 185, 129, 0.3)";
      overlay.style.borderColor = "#10b981";

      setTimeout(() => {
        cleanup();
      }, 300);
    }
  }

  // Gestionnaire ESC
  function handleKeyDown(e) {
    if (e.key === "Escape") {
      cleanup();
    }
  }

  // Nettoyage
  function cleanup() {
    isActive = false;
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);

    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }

    const badge = document.getElementById("section-scraper-badge");
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }

    window.__sectionScraperActive = false;
  }

  // Activation du mode sélection
  function activate() {
    if (isActive) return;

    isActive = true;
    createOverlay();
    createInfoBadge();

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
  }

  // Écouter les messages du popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ACTIVATE_VISUAL_SELECTOR") {
      activate();
      sendResponse({ success: true });
    }
    return true;
  });
})();
