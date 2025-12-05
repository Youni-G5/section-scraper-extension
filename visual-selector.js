// visual-selector.js - CORRIGÉ : Verrouillage au clic + réouverture popup
// Script injecté pour permettre la sélection visuelle d'éléments sur la page

(function() {
  // Éviter les injections multiples
  if (window.__sectionScraperActive) {
    console.log('[Section Scraper] Déjà actif');
    return;
  }

  let currentElement = null;
  let overlay = null;
  let tooltip = null;
  let isActive = false;
  let isLocked = false; // NOUVEAU : verrouiller après le clic

  // Créer l'overlay de surbrillance
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'section-scraper-overlay';
    overlay.style.cssText = `
      position: absolute;
      background: rgba(99, 102, 241, 0.15);
      border: 2px solid #6366f1;
      pointer-events: none;
      z-index: 2147483646;
      transition: all 0.15s ease;
      border-radius: 4px;
    `;
    document.body.appendChild(overlay);
  }

  // Créer le tooltip d'information
  function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.id = 'section-scraper-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #1f2937;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      z-index: 2147483647;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(tooltip);
  }

  // Créer le badge d'information
  function createInfoBadge() {
    const badge = document.createElement('div');
    badge.id = 'section-scraper-badge';
    badge.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      z-index: 2147483647;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    badge.innerHTML = `
      <span style="font-size: 18px;">🎯</span>
      <span>Clique sur la section à extraire</span>
      <span style="opacity: 0.6; font-size: 11px; margin-left: 8px;">ESC pour annuler</span>
    `;
    document.body.appendChild(badge);
  }

  // Mettre à jour la position de l'overlay et tooltip
  function updateOverlay(element) {
    if (!element || !overlay || isLocked) return; // BLOQUER si verrouillé

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    overlay.style.top = `${rect.top + scrollTop}px`;
    overlay.style.left = `${rect.left + scrollLeft}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    // Positionner le tooltip
    if (tooltip) {
      const tag = element.tagName.toLowerCase();
      const classes = element.className ? `.${element.className.toString().split(' ').slice(0, 2).join('.')}` : '';
      const id = element.id ? `#${element.id}` : '';
      tooltip.textContent = `${tag}${id}${classes}`;
      
      tooltip.style.top = `${rect.top + scrollTop - 30}px`;
      tooltip.style.left = `${rect.left + scrollLeft}px`;
    }
  }

  // Générer un sélecteur CSS optimal pour un élément
  function generateSelector(element) {
    if (!element) return '';

    // 1. ID unique (priorité absolue)
    if (element.id) {
      const idSelector = `#${CSS.escape(element.id)}`;
      if (document.querySelectorAll(idSelector).length === 1) {
        return idSelector;
      }
    }

    // 2. Classe unique
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter(c => c);
      for (const cls of classes) {
        const classSelector = `.${CSS.escape(cls)}`;
        if (document.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }
    }

    // 3. Data-attributes
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        const attrSelector = `[${attr.name}="${CSS.escape(attr.value)}"]`;
        if (document.querySelectorAll(attrSelector).length === 1) {
          return attrSelector;
        }
      }
    }

    // 4. Construire un chemin avec classes et nth-child
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c).slice(0, 2);
        if (classes.length > 0) {
          selector += classes.map(c => `.${CSS.escape(c)}`).join('');
        }
      }
      
      // Ajouter nth-child si nécessaire pour unicité
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = parent;
      
      // Limiter la profondeur
      if (path.length >= 4) break;
    }

    return path.join(' > ');
  }

  // Gestionnaire de survol
  function handleMouseMove(e) {
    if (!isActive || isLocked) return; // BLOQUER le mouvement si verrouillé

    // Ignorer les éléments de l'extension
    if (e.target.id && e.target.id.startsWith('section-scraper-')) {
      return;
    }

    currentElement = e.target;
    updateOverlay(currentElement);
  }

  // Gestionnaire de clic
  function handleClick(e) {
    if (!isActive || isLocked) return; // Ignorer si déjà verrouillé

    // Ignorer les éléments de l'extension
    if (e.target.id && e.target.id.startsWith('section-scraper-')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // VERROUILLER IMMÉDIATEMENT
    isLocked = true;
    isActive = false;

    console.log('[Section Scraper] CLIC DÉTECTÉ - VERROUILLAGE');

    if (currentElement) {
      const selector = generateSelector(currentElement);
      console.log('[Section Scraper] Sélecteur généré:', selector);
      
      // Feedback visuel VERT
      if (overlay) {
        overlay.style.background = 'rgba(16, 185, 129, 0.3)';
        overlay.style.borderColor = '#10b981';
        overlay.style.borderWidth = '3px';
      }

      // Changer le badge
      const badge = document.getElementById('section-scraper-badge');
      if (badge) {
        badge.innerHTML = `
          <span style="font-size: 18px;">✅</span>
          <span>Section sélectionnée ! Ouverture du popup...</span>
        `;
        badge.style.background = '#10b981';
      }

      // Cacher le tooltip
      if (tooltip) {
        tooltip.style.display = 'none';
      }

      // Sauvegarder le sélecteur
      chrome.storage.local.set({ 
        selectedSelector: selector,
        timestamp: Date.now()
      }, () => {
        console.log('[Section Scraper] Sélecteur sauvegardé, réouverture du popup');
        
        // Demander au background de rouvrir le popup
        chrome.runtime.sendMessage({
          type: 'REOPEN_POPUP'
        });

        // Nettoyer après un délai
        setTimeout(() => {
          cleanup();
        }, 1000);
      });
    }

    return false;
  }

  // Gestionnaire ESC
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
    }
  }

  // Nettoyage
  function cleanup() {
    console.log('[Section Scraper] Nettoyage');
    isActive = false;
    isLocked = false;
    
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);

    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }

    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
      tooltip = null;
    }

    const badge = document.getElementById('section-scraper-badge');
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }

    window.__sectionScraperActive = false;
  }

  // Activation du mode sélection
  function activate() {
    console.log('[Section Scraper] Activation du mode sélection');
    
    if (isActive) {
      console.log('[Section Scraper] Déjà actif, nettoyage puis réactivation');
      cleanup();
    }

    window.__sectionScraperActive = true;
    isActive = true;
    isLocked = false;
    
    createOverlay();
    createTooltip();
    createInfoBadge();

    // Ajouter les listeners avec capture pour priorité maximale
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    console.log('[Section Scraper] Mode sélection activé');
  }

  // Écouter les messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ACTIVATE_VISUAL_SELECTOR') {
      activate();
      sendResponse({ success: true });
    }
    return true;
  });

  console.log('[Section Scraper] Script visuel chargé');
})();
