// content.js - Version améliorée avec extraction complète
// Injecté dans chaque page : extrait le HTML, CSS et JS complet pour un sélecteur donné

// Récupère TOUS les styles CSS (inline, internal, external) pour une section
function extractAllStyles(rootElement) {
  const cssRules = [];
  const processedUrls = new Set();

  // 1. Styles inline de l'élément principal
  if (rootElement.getAttribute('style')) {
    cssRules.push(`/* Styles inline de l'élément racine */`);
    cssRules.push(`${generateUniqueSelector(rootElement)} {`);
    cssRules.push(`  ${rootElement.getAttribute('style')}`);
    cssRules.push(`}\n`);
  }

  // 2. Styles inline de tous les enfants
  const elementsWithStyle = rootElement.querySelectorAll('[style]');
  elementsWithStyle.forEach((el) => {
    const selector = generateUniqueSelector(el);
    cssRules.push(`${selector} {`);
    cssRules.push(`  ${el.getAttribute('style')}`);
    cssRules.push(`}\n`);
  });

  // 3. Balises <style> dans la section
  const styleTags = rootElement.querySelectorAll('style');
  styleTags.forEach((styleTag, index) => {
    cssRules.push(`/* <style> tag #${index + 1} extrait de la section */`);
    cssRules.push(styleTag.textContent.trim());
    cssRules.push(`\n`);
  });

  // 4. Balises <style> globales du document
  document.querySelectorAll('style').forEach((styleTag, index) => {
    if (!rootElement.contains(styleTag)) {
      cssRules.push(`/* Balise <style> globale #${index + 1} */`);
      cssRules.push(styleTag.textContent.trim());
      cssRules.push(`\n`);
    }
  });

  // 5. Règles des stylesheets externes et internes
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules || sheet.rules;
    } catch (e) {
      // Cross-origin stylesheet non accessible
      if (sheet.href && !processedUrls.has(sheet.href)) {
        processedUrls.add(sheet.href);
        cssRules.push(`/* Stylesheet externe non accessible (CORS): ${sheet.href} */`);
        cssRules.push(`/* Téléchargez manuellement ce fichier pour récupérer tous les styles */\n`);
      }
      continue;
    }

    if (!rules) continue;

    const sheetUrl = sheet.href || 'styles internes';
    cssRules.push(`/* Règles extraites de: ${sheetUrl} */`);

    for (const rule of Array.from(rules)) {
      try {
        // Media queries
        if (rule instanceof CSSMediaRule) {
          cssRules.push(`@media ${rule.conditionText} {`);
          for (const innerRule of Array.from(rule.cssRules)) {
            cssRules.push(`  ${innerRule.cssText}`);
          }
          cssRules.push(`}\n`);
        }
        // Keyframes
        else if (rule instanceof CSSKeyframesRule) {
          cssRules.push(rule.cssText);
          cssRules.push(`\n`);
        }
        // Règles normales
        else if (rule.selectorText) {
          // Vérifier si la règle s'applique à la section ou ses enfants
          try {
            if (rootElement.matches(rule.selectorText) || 
                rootElement.querySelector(rule.selectorText)) {
              cssRules.push(rule.cssText);
            }
          } catch (e) {
            // Sélecteur invalide, on l'ajoute quand même
            cssRules.push(rule.cssText);
          }
        }
        // Autres règles (@import, @font-face, etc.)
        else if (rule.cssText) {
          cssRules.push(rule.cssText);
        }
      } catch (e) {
        console.warn('Erreur lors du traitement de la règle CSS:', e);
      }
    }
    cssRules.push(`\n`);
  }

  // 6. Styles calculés (computed styles) de l'élément principal
  const computedStyles = window.getComputedStyle(rootElement);
  cssRules.push(`/* Styles calculés de l'élément racine (pour référence) */`);
  cssRules.push(`/* ${generateUniqueSelector(rootElement)} { */`);
  for (const prop of computedStyles) {
    const value = computedStyles.getPropertyValue(prop);
    if (value) {
      cssRules.push(`/*   ${prop}: ${value}; */`);
    }
  }
  cssRules.push(`/* } */\n`);

  return cssRules.join('\n');
}

// Génère un sélecteur unique pour un élément
function generateUniqueSelector(el) {
  if (!el) return '';
  if (el.id) return `#${CSS.escape(el.id)}`;

  const parts = [];
  let current = el;

  while (current && current.nodeType === 1 && parts.length < 5) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      parts.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c).slice(0, 2);
      if (classes.length) {
        selector += classes.map(c => `.${CSS.escape(c)}`).join('');
      }
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

// Extrait TOUS les scripts (inline, externes, event handlers)
function extractAllScripts(rootElement) {
  const jsParts = [];
  const notes = [];

  jsParts.push('// ============================================');
  jsParts.push('// SCRIPTS EXTRAITS DE LA SECTION');
  jsParts.push('// ============================================\n');

  // 1. Scripts inline dans la section
  const inlineScripts = rootElement.querySelectorAll('script');
  if (inlineScripts.length > 0) {
    jsParts.push('// --- Scripts inline de la section ---\n');
    inlineScripts.forEach((script, index) => {
      if (script.src) {
        jsParts.push(`// Script externe #${index + 1}: ${script.src}`);
        notes.push(`Télécharger le script: ${script.src}`);
      } else if (script.textContent.trim()) {
        jsParts.push(`// Script inline #${index + 1}`);
        jsParts.push(script.textContent.trim());
        jsParts.push('\n');
      }
    });
  }

  // 2. Event handlers inline (onclick, onload, etc.)
  jsParts.push('// --- Event handlers inline ---\n');
  const elementsWithEvents = rootElement.querySelectorAll('*');
  let foundEvents = false;
  elementsWithEvents.forEach((el) => {
    for (const attr of el.attributes) {
      if (attr.name.startsWith('on')) {
        foundEvents = true;
        const selector = generateUniqueSelector(el);
        jsParts.push(`// ${selector} - ${attr.name}`);
        jsParts.push(`document.querySelector('${selector}').${attr.name} = function(event) {`);
        jsParts.push(`  ${attr.value}`);
        jsParts.push(`};\n`);
      }
    }
  });
  if (!foundEvents) {
    jsParts.push('// Aucun event handler inline détecté\n');
  }

  // 3. Data-attributes potentiellement liés à du JS
  jsParts.push('// --- Data-attributes détectés (peuvent être utilisés par JS) ---\n');
  const elementsWithData = rootElement.querySelectorAll('[data-*], [class*="js-"]');
  if (elementsWithData.length > 0) {
    const dataAttrs = new Set();
    elementsWithData.forEach((el) => {
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-') || el.className.includes('js-')) {
          dataAttrs.add(`${attr.name}: "${attr.value}"`);
        }
      }
    });
    if (dataAttrs.size > 0) {
      jsParts.push('// Attributs data-* trouvés:');
      dataAttrs.forEach(attr => jsParts.push(`// - ${attr}`));
      notes.push('Rechercher dans les fichiers JS du site les références à ces data-attributes');
    }
  }
  jsParts.push('\n');

  // 4. Scripts globaux du document
  jsParts.push('// --- Scripts globaux du document ---');
  jsParts.push('// Ces scripts peuvent contenir la logique pour cette section\n');
  const globalScripts = document.querySelectorAll('script');
  globalScripts.forEach((script, index) => {
    if (!rootElement.contains(script)) {
      if (script.src) {
        jsParts.push(`// Script global externe #${index + 1}: ${script.src}`);
        notes.push(`Vérifier le contenu de: ${script.src}`);
      }
    }
  });

  jsParts.push('\n// ============================================');
  jsParts.push('// NOTES IMPORTANTES');
  jsParts.push('// ============================================');
  if (notes.length > 0) {
    notes.forEach(note => jsParts.push(`// - ${note}`));
  } else {
    jsParts.push('// Aucune note supplémentaire');
  }

  return { jsCode: jsParts.join('\n'), notes };
}

// Gère les chemins des images et ressources
function rewriteResourcePaths(html, baseUrl) {
  const container = document.createElement('div');
  container.innerHTML = html;

  // Images
  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src) {
      try {
        const absoluteUrl = new URL(src, baseUrl).href;
        img.setAttribute('data-original-src', src);
        img.setAttribute('src', absoluteUrl);
      } catch (e) {}
    }

    const srcset = img.getAttribute('srcset');
    if (srcset) {
      img.setAttribute('data-original-srcset', srcset);
    }
  });

  // Vidéos
  const videos = container.querySelectorAll('video, source');
  videos.forEach((video) => {
    const src = video.getAttribute('src');
    if (src) {
      try {
        const absoluteUrl = new URL(src, baseUrl).href;
        video.setAttribute('data-original-src', src);
        video.setAttribute('src', absoluteUrl);
      } catch (e) {}
    }
  });

  // Liens CSS
  const links = container.querySelectorAll('link[rel="stylesheet"]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        link.setAttribute('data-original-href', href);
        link.setAttribute('href', absoluteUrl);
      } catch (e) {}
    }
  });

  return container.innerHTML;
}

// Point d'entrée : écoute les messages du popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SCRAPE_SECTION') return;

  const { selector, options } = message.payload;

  try {
    console.log('[Content] Extraction de la section:', selector);
    
    const element = document.querySelector(selector);
    if (!element) {
      sendResponse({ error: `Aucun élément trouvé pour le sélecteur : ${selector}` });
      return true;
    }

    const baseUrl = window.location.origin;

    // HTML complet
    let outerHTML = element.outerHTML;
    outerHTML = rewriteResourcePaths(outerHTML, baseUrl);

    // CSS complet
    const css = extractAllStyles(element);

    // JS complet
    const { jsCode, notes } = extractAllScripts(element);

    const data = {
      html: outerHTML,
      css,
      js: jsCode,
      meta: {
        url: window.location.href,
        selector,
        extractedAt: new Date().toISOString(),
        title: document.title,
        notes,
      },
    };

    console.log('[Content] Extraction réussie');
    sendResponse({ data });
  } catch (error) {
    console.error('[Content] Erreur:', error);
    sendResponse({ error: error.message || 'Erreur inconnue dans le content script.' });
  }

  return true;
});

console.log('[Content] Script content.js chargé');
