// background.js (service worker) - AVEC réouverture popup
// Crée un ZIP contenant section.html, section.css, section.js et lance le téléchargement

function stringToUint8Array(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// ZIP minimaliste (Store only, sans compression)
function createMinimalZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  let offset = 0;

  const fileEntries = files.map((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = stringToUint8Array(file.content);
    const localHeaderOffset = offset;

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = store)
    view.setUint16(10, 0, true); // File last mod time
    view.setUint16(12, 0, true); // File last mod date
    view.setUint32(14, 0, true); // CRC-32 (0 pour simplifier, certains unzip tolèrent)
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    chunks.push(localHeader, contentBytes);
    offset += localHeader.length + contentBytes.length;

    return {
      file,
      nameBytes,
      contentBytes,
      localHeaderOffset,
    };
  });

  const centralDirectoryOffset = offset;

  // Central directory
  fileEntries.forEach((entry) => {
    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(centralHeader.buffer);
    view.setUint32(0, 0x02014b50, true); // Central file header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0, true); // General purpose bit flag
    view.setUint16(10, 0, true); // Compression method (0 = store)
    view.setUint16(12, 0, true); // File last mod time
    view.setUint16(14, 0, true); // File last mod date
    view.setUint32(16, 0, true); // CRC-32 (0 simplifié)
    view.setUint32(20, entry.contentBytes.length, true); // Compressed size
    view.setUint32(24, entry.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, entry.localHeaderOffset, true); // Relative offset of local header
    centralHeader.set(entry.nameBytes, 46);

    chunks.push(centralHeader);
    offset += centralHeader.length;
  });

  const centralDirectorySize = offset - centralDirectoryOffset;

  // End of central directory record
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true); // End of central dir signature
  endView.setUint16(4, 0, true); // Number of this disk
  endView.setUint16(6, 0, true); // Disk where central directory starts
  endView.setUint16(8, fileEntries.length, true); // Number of central directory records on this disk
  endView.setUint16(10, fileEntries.length, true); // Total number of central directory records
  endView.setUint32(12, centralDirectorySize, true); // Size of central directory
  endView.setUint32(16, centralDirectoryOffset, true); // Offset of start of central directory
  endView.setUint16(20, 0, true); // Comment length

  chunks.push(endRecord);

  // Concatène tous les chunks
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Gérer la réouverture du popup
  if (message.type === 'REOPEN_POPUP') {
    console.log('[Background] Réouverture du popup demandée');
    chrome.action.openPopup().catch(err => {
      console.log('[Background] Impossible de rouvrir le popup automatiquement:', err);
      // Sur Chrome, openPopup() ne fonctionne que si l'utilisateur a interagi
      // Mais le storage persiste, donc le popup montrera la sélection au prochain clic
    });
    return true;
  }

  if (message.type !== 'CREATE_ZIP_AND_DOWNLOAD') return;

  const { html, css, js, meta } = message.payload;

  const headerComment = `<!--\n  Section extraite depuis : ${meta.url}\n  Sélecteur : ${meta.selector}\n  Date d'extraction : ${meta.extractedAt}\n\n  Notes :\n  - Vérifiez les chemins d'images (data-original-src) et importez-les dans Shopify.\n  - Adaptez ce markup en Liquid (sections, snippets, blocks) selon votre thème.\n-->\n\n`;

  const cssComment = `/*\n  CSS extrait pour la section : ${meta.selector}\n  Source : ${meta.url}\n  Date : ${meta.extractedAt}\n\n  Recommandations Shopify :\n  - Nettoyez les sélecteurs globaux et limitez-vous à la section.\n  - Utilisez les classes utilitaires ou tokens de design de votre thème.\n  - Vérifiez les @keyframes et @media queries.\n*/\n\n`;

  const jsComment = `/*\n  JS extrait pour la section : ${meta.selector}\n  Source : ${meta.url}\n  Date : ${meta.extractedAt}\n\n  IMPORTANT :\n  - Intégrez cette logique dans un fichier JS de thème (theme.js, global.js, etc.).\n  - Utilisez les events Shopify (section load, section select) pour initialiser la section.\n  - Complétez manuellement avec les scripts globaux si nécessaire.\n\n  Notes automatiques :\n  ${meta.notes?.map((n) => `  - ${n}`).join('\n') || '  -'}\n*/\n\n`;

  const files = [
    {
      name: 'section.html',
      content: headerComment + html,
    },
    {
      name: 'section.css',
      content: cssComment + (css || '/* Aucun style CSS spécifique détecté pour cette section. */\n'),
    },
    {
      name: 'section.js',
      content: jsComment + (js || '// Aucun JavaScript spécifique détecté pour cette section.\n'),
    },
  ];

  const zipBytes = createMinimalZip(files);
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);

  const fileName = `section-scraper-${Date.now()}.zip`;

  chrome.downloads.download({
    url,
    filename: fileName,
    saveAs: true,
  });

  sendResponse && sendResponse({ success: true });

  return true;
});

console.log('[Background] Service worker chargé');
