# Icônes de l'extension

Les icônes ont été retirées du manifest pour permettre le chargement de l'extension.

## Pour ajouter vos propres icônes (optionnel)

Créez 3 fichiers PNG dans ce dossier :
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

Puis ajoutez ces lignes dans `manifest.json` :

```json
"action": {
  "default_popup": "popup.html",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
},
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

## Génération rapide d'icônes

Vous pouvez utiliser :
- **Favicon.io** : https://favicon.io/ (générateur gratuit)
- **Canva** : créez un design carré et exportez en 128x128, puis redimensionnez
- **Figma/Photoshop** : créez un design simple avec emoji 🎯 ou logo

L'extension fonctionne parfaitement sans icônes personnalisées.
