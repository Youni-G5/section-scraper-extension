// background.js - Service worker avec génération .liquid Shopify
// FIX: Utilisation de Data URL au lieu de createObjectURL

function stringToUint8Array(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Générer un fichier .liquid Shopify complet
function generateLiquidFile(data) {
  const { html, css, js, meta } = data;
  const timestamp = new Date().toISOString().split('T')[0];
  const sectionName = meta.selector.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-');

  const liquidContent = `{%- comment -%}
  Section: Custom Scraped Section
  Source: ${meta.url}
  Sélecteur: ${meta.selector}
  Date d'extraction: ${timestamp}
  
  ⚠️ IMPORTANT :
  - Cette section est une copie EXACTE du code original
  - Vérifiez les images et remplacez les URLs par des assets Shopify
  - Testez dans le Theme Customizer avant de publier
  - Les data-attributes et classes sont préservés à 100%
{%- endcomment -%}

<div class="custom-section-{{ section.id }}" data-section-id="{{ section.id }}">
  {%- comment -%} HTML ORIGINAL - 100% IDENTIQUE {%- endcomment -%}
  
${html}

</div>

{% schema %}
{
  "name": "Section Extraite",
  "class": "custom-scraped-section",
  "settings": [
    {
      "type": "header",
      "content": "Instructions"
    },
    {
      "type": "paragraph",
      "content": "Section extraite de: ${meta.url.substring(0, 50)}..."
    },
    {
      "type": "paragraph",
      "content": "Sélecteur CSS: ${meta.selector}"
    },
    {
      "type": "header",
      "content": "Édition du contenu"
    },
    {
      "type": "html",
      "id": "custom_content",
      "label": "Contenu personnalisé",
      "info": "Modifiez le HTML ci-dessus directement dans ce fichier .liquid pour personnaliser le contenu"
    }
  ],
  "presets": [
    {
      "name": "Section Extraite"
    }
  ]
}
{% endschema %}

{% stylesheet %}
/* ================================================
   CSS ORIGINAL - AUCUNE MODIFICATION
   Extrait de: ${meta.url}
   Sélecteur: ${meta.selector}
   Date: ${timestamp}
   ================================================ */

/* Isolation des styles avec préfixage de section */
.custom-section-{{ section.id }} {
  /* Styles racine si nécessaire */
}

/* CSS COMPLET EXTRAIT */
${css || '/* Aucun CSS spécifique détecté */'}

/* ================================================
   NOTES :
   - Tous les sélecteurs sont préservés
   - Les @keyframes, @media, @font-face sont intacts
   - Vérifiez les conflits avec votre thème
   - Ajoutez .custom-section-{{ section.id }} devant
     les sélecteurs pour isoler si nécessaire
   ================================================ */
{% endstylesheet %}

{% javascript %}
/* ================================================
   JAVASCRIPT ORIGINAL - AUCUNE MODIFICATION
   Extrait de: ${meta.url}
   Sélecteur: ${meta.selector}
   Date: ${timestamp}
   ================================================ */

(function() {
  'use strict';
  
  // Fonction d'initialisation de la section
  function initCustomSection() {
    const section = document.querySelector('.custom-section-{{ section.id }}');
    if (!section) {
      console.warn('[Custom Section] Section non trouvée');
      return;
    }

    // ================================================
    // JAVASCRIPT COMPLET EXTRAIT
    // ================================================
    
    ${js || '// Aucun JavaScript spécifique détecté'}

    console.log('[Custom Section] Section initialisée');
  }

  // Initialisation au chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomSection);
  } else {
    initCustomSection();
  }

  // Support du Theme Editor Shopify
  document.addEventListener('shopify:section:load', function(event) {
    const target = event.target;
    if (target && target.querySelector('.custom-section-{{ section.id }}')) {
      console.log('[Custom Section] Rechargement dans le Theme Editor');
      initCustomSection();
    }
  });

  // Support du Theme Editor - section select
  document.addEventListener('shopify:section:select', function(event) {
    const target = event.target;
    if (target && target.querySelector('.custom-section-{{ section.id }}')) {
      console.log('[Custom Section] Section sélectionnée dans le Theme Editor');
    }
  });

  // Support du Theme Editor - section deselect
  document.addEventListener('shopify:section:deselect', function(event) {
    const target = event.target;
    if (target && target.querySelector('.custom-section-{{ section.id }}')) {
      console.log('[Custom Section] Section désélectionnée dans le Theme Editor');
    }
  });
})();

/* ================================================
   NOTES IMPORTANTES :
   ${meta.notes && meta.notes.length > 0 ? meta.notes.map(n => `- ${n}`).join('\n   ') : '- Aucune note spécifique'}
   
   - Tous les event listeners sont préservés
   - Les animations et interactions sont intactes
   - Le code est scopé à la section avec {{ section.id }}
   - Compatible avec le Theme Editor Shopify
   ================================================ */
{% endjavascript %}
`;

  return liquidContent;
}

// Convertir contenu en Data URL pour téléchargement
function createDataUrl(content, mimeType = 'text/plain') {
  // Encoder en base64 pour éviter les problèmes avec les caractères spéciaux
  const base64 = btoa(unescape(encodeURIComponent(content)));
  return `data:${mimeType};base64,${base64}`;
}

// ZIP minimaliste
function createMinimalZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  let offset = 0;

  const fileEntries = files.map((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = stringToUint8Array(file.content);
    const localHeaderOffset = offset;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, contentBytes.length, true);
    view.setUint32(22, contentBytes.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    chunks.push(localHeader, contentBytes);
    offset += localHeader.length + contentBytes.length;

    return { file, nameBytes, contentBytes, localHeaderOffset };
  });

  const centralDirectoryOffset = offset;

  fileEntries.forEach((entry) => {
    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(centralHeader.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 0, true);
    view.setUint32(20, entry.contentBytes.length, true);
    view.setUint32(24, entry.contentBytes.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.localHeaderOffset, true);
    centralHeader.set(entry.nameBytes, 46);

    chunks.push(centralHeader);
    offset += centralHeader.length;
  });

  const centralDirectorySize = offset - centralDirectoryOffset;
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, fileEntries.length, true);
  endView.setUint16(10, fileEntries.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, centralDirectoryOffset, true);
  endView.setUint16(20, 0, true);
  chunks.push(endRecord);

  let totalLength = 0;
  chunks.forEach((c) => (totalLength += c.length));
  const zip = new Uint8Array(totalLength);
  let position = 0;
  chunks.forEach((c) => {
    zip.set(c, position);
    position += c.length;
  });

  return zip;
}

// Convertir Uint8Array en Data URL
function arrayBufferToDataUrl(buffer, mimeType) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Réouverture du popup
  if (message.type === 'REOPEN_POPUP') {
    chrome.action.openPopup().catch(err => {
      console.log('[Background] Impossible de rouvrir le popup automatiquement:', err);
    });
    return true;
  }

  // Générer et télécharger le fichier .liquid
  if (message.type === 'CREATE_LIQUID_FILE') {
    try {
      const liquidContent = generateLiquidFile(message.payload);
      const dataUrl = createDataUrl(liquidContent, 'text/plain');
      const fileName = `custom-section-${Date.now()}.liquid`;

      chrome.downloads.download({
        url: dataUrl,
        filename: fileName,
        saveAs: true,
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Erreur de téléchargement:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[Background] Fichier .liquid téléchargé:', downloadId);
          sendResponse({ success: true });
        }
      });
    } catch (error) {
      console.error('[Background] Erreur génération .liquid:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Async response
  }

  // Télécharger ZIP
  if (message.type === 'CREATE_ZIP_AND_DOWNLOAD') {
    try {
      const { html, css, js, meta } = message.payload;

      const files = [
        { name: 'section.html', content: `<!-- Extrait de: ${meta.url} -->\n\n${html}` },
        { name: 'section.css', content: `/* Extrait de: ${meta.url} */\n\n${css || '/* Aucun CSS */'}` },
        { name: 'section.js', content: `/* Extrait de: ${meta.url} */\n\n${js || '// Aucun JS'}` },
      ];

      const zipBytes = createMinimalZip(files);
      const dataUrl = arrayBufferToDataUrl(zipBytes, 'application/zip');
      const fileName = `section-scraper-${Date.now()}.zip`;

      chrome.downloads.download({
        url: dataUrl,
        filename: fileName,
        saveAs: true,
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Erreur de téléchargement ZIP:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[Background] ZIP téléchargé:', downloadId);
          sendResponse({ success: true });
        }
      });
    } catch (error) {
      console.error('[Background] Erreur génération ZIP:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Async response
  }

  return true;
});

console.log('[Background] Service worker chargé');
