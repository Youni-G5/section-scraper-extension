// content.js
// Injecté dans chaque page : extrait le HTML, CSS et JS pour un sélecteur donné

// Utilitaire : récupère les styles CSS associés à un élément (inline + rules des stylesheets)
function getComputedCssForElement(element, options = { inlineStyles: true }) {
  const cssBlocks = [];

  // Styles inline directement sur l'élément
  if (options.inlineStyles && element.getAttribute("style")) {
    const selector = generateUniqueSelector(element);
    cssBlocks.push(`${selector} { ${element.getAttribute("style")} }`);
  }

  // Règles CSS des stylesheets qui matchent cet élément
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules || sheet.rules;
    } catch (e) {
      // Certains styles cross-origin ne sont pas accessibles
      continue;
    }

    if (!rules) continue;

    for (const rule of Array.from(rules)) {
      if (rule.selectorText) {
        try {
          if (element.matches(rule.selectorText) || element.querySelector(rule.selectorText)) {
            cssBlocks.push(rule.cssText);
          }
        } catch (_) {
          // Ignorer les sélecteurs invalides ou complexes
        }
      }
    }
  }

  return cssBlocks.join("\n");
}

// Génère un sélecteur unique pour un élément (aide pour isoler la section en CSS)
function generateUniqueSelector(el) {
  if (!el) return "";
  if (el.id) return `#${el.id}`;

  const parts = [];
  let current = el;

  while (current && current.nodeType === 1 && parts.length < 5) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      const classes = current.className
        .toString()
        .trim()
        .split(/\s+/)
        .slice(0, 2);
      if (classes.length) {
        selector += "." + classes.join(".");
      }
    }

    const siblingIndex = Array.from(current.parentNode?.children || []).indexOf(current);
    if (siblingIndex > -1) {
      selector += `:nth-child(${siblingIndex + 1})`;
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(" > ");
}

// Extrait les scripts liés à la section (inline + liens logiques)
function extractScriptsForSection(rootElement, includeScripts = true) {
  const jsParts = [];
  const scriptFallbackNotes = [];

  if (!includeScripts) {
    scriptFallbackNotes.push(
      "Extraction JS désactivée. Pensez à copier manuellement les scripts nécessaires depuis la page."
    );
    return { jsCode: "", notes: scriptFallbackNotes };
  }

  // Scripts inline dans la section
  const inlineScripts = rootElement.querySelectorAll("script");
  inlineScripts.forEach((script, index) => {
    if (script.textContent.trim()) {
      jsParts.push(`// Script inline #${index + 1} extrait depuis la section\n`);
      jsParts.push(script.textContent.trim());
      jsParts.push("\n\n");
    }
  });

  // Scripts globaux probables (basés sur data-attributes ou id/classes)
  const sectionId = rootElement.id;
  const sectionClasses = Array.from(rootElement.classList || []);

  if (sectionId || sectionClasses.length) {
    scriptFallbackNotes.push(
      "Certains scripts globaux liés à la section peuvent se trouver dans des fichiers JS externes (theme.js, app.js, etc.)."
    );
    scriptFallbackNotes.push(
      "Recherchez dans vos fichiers Shopify les références à l'ID ou aux classes de la section pour compléter la logique JS."
    );
  }

  return { jsCode: jsParts.join("\n"), notes: scriptFallbackNotes };
}

// Gère les chemins des images pour faciliter l'intégration dans Shopify
function rewriteImagePaths(html, baseUrl) {
  const container = document.createElement("div");
  container.innerHTML = html;

  const images = container.querySelectorAll("img");
  images.forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;

    // Si chemin relatif, le convertir en absolu pour référence
    try {
      const absoluteUrl = new URL(src, baseUrl).href;
      img.setAttribute("data-original-src", src);
      img.setAttribute("src", absoluteUrl);
    } catch (e) {
      // Ignorer les URLs invalides
    }
  });

  return container.innerHTML;
}

// Point d'entrée : écoute les messages du popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SCRAPE_SECTION") return;

  const { selector, options } = message.payload;

  try {
    const element = document.querySelector(selector);
    if (!element) {
      sendResponse({ error: `Aucun élément trouvé pour le sélecteur : ${selector}` });
      return true;
    }

    const baseUrl = window.location.origin;

    // HTML complet de la section
    let outerHTML = element.outerHTML;
    outerHTML = rewriteImagePaths(outerHTML, baseUrl);

    // CSS ciblé
    const css = getComputedCssForElement(element, {
      inlineStyles: options.inlineStyles,
    });

    // JS associé
    const { jsCode, notes } = extractScriptsForSection(element, options.includeScripts);

    const data = {
      html: outerHTML,
      css,
      js: jsCode,
      meta: {
        url: window.location.href,
        selector,
        extractedAt: new Date().toISOString(),
        notes,
      },
    };

    sendResponse({ data });
  } catch (error) {
    console.error("Erreur content script:", error);
    sendResponse({ error: error.message || "Erreur inconnue dans le content script." });
  }

  // Indique que la réponse est asynchrone
  return true;
});
