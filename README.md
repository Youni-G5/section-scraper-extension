# Section Scraper Extension

Extension Chrome avancée pour extraire une section complète d'une page web (HTML, CSS, JS) et la préparer pour une intégration dans un thème Shopify.

## ✨ Nouveauté v1.1.0 : Mode Sélecteur Visuel

**Plus besoin de connaître les sélecteurs CSS !** Clique directement sur la section que tu veux copier.

## Objectif

- Permettre de cibler n'importe quelle section d'une page via :
  - **Mode Visuel** : clique sur la section pour la sélectionner (recommandé)
  - **Mode Manuel** : entre un sélecteur CSS si tu le connais déjà
- Extraire :
  - le HTML complet de la section (outerHTML)
  - les styles CSS associés (inline + règles de stylesheets accessibles)
  - le JavaScript lié à la section (inline + recommandations pour scripts globaux)
- Générer automatiquement une archive ZIP contenant `section.html`, `section.css` et `section.js` prête à être importée et adaptée dans Shopify.

## Installation locale dans Chrome (mode développeur)

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/Youni-G5/section-scraper-extension.git
   cd section-scraper-extension
   ```

2. **Ouvrir Chrome et aller dans :**
   - `chrome://extensions/`

3. **Activer le Mode développeur** (coin supérieur droit)

4. **Cliquer sur "Charger l'extension non empaquetée"**

5. **Sélectionner le dossier du projet** `section-scraper-extension`

L'icône de l'extension apparaît ensuite dans la barre d'outils Chrome.

## 🚀 Utilisation

### Mode Visuel (Recommandé)

1. Va sur la page web contenant la section à copier
2. Clique sur l'icône de l'extension
3. Dans le popup, reste sur **"Mode Visuel"** (activé par défaut)
4. Clique sur **"🎯 Sélectionner une Section"**
5. La page s'affiche avec :
   - Un badge bleu en haut : "🎯 Clique sur la section à copier"
   - Les sections se surlignent en bleu au survol de ta souris
6. **Clique sur la section** que tu veux extraire
7. Le popup se rouvre automatiquement avec la section sélectionnée
8. Ajuste les options si nécessaire :
   - ✅ Télécharger les images locales
   - ✅ Inclure tous les styles calculés
   - ✅ Extraire le JavaScript associé
9. Clique sur **"⬇️ Extraire la Section"**
10. Le ZIP se télécharge automatiquement

**Astuce :** Appuie sur **ESC** pour annuler le mode sélection visuelle.

### Mode Manuel (Avancé)

1. Va sur la page web contenant la section à copier
2. Clique sur l'icône de l'extension
3. Clique sur **"⌨️ Mode Manuel"**
4. Entre un sélecteur CSS dans le champ, par exemple :
   - `.product-section`
   - `#hero`
   - `[data-section="banner"]`
   - `main > section:nth-child(2)`
5. Clique sur **"⬇️ Extraire la Section"**

**Comment trouver un sélecteur CSS manuellement :**
- Clic droit sur la section > "Inspecter"
- Dans les DevTools, clic droit sur l'élément HTML
- "Copy" > "Copy selector"

## Structure du projet

```
section-scraper-extension/
├── manifest.json          # Configuration Manifest V3
├── popup.html             # Interface utilisateur du popup
├── popup.js               # Logique du popup
├── style.css              # Styles du popup
├── content.js             # Extraction HTML/CSS/JS
├── visual-selector.js     # Mode sélecteur visuel
├── background.js          # Génération du ZIP
├── icons/                 # Icônes (optionnel)
└── README.md
```

## Fonctionnement technique

### Mode Visuel

1. **popup.js** injecte `visual-selector.js` dans la page active
2. **visual-selector.js** :
   - Crée un overlay bleu translucide qui suit la souris
   - Affiche un badge d'instructions en haut de la page
   - Au survol, met en surbrillance l'élément sous le curseur
   - Au clic, génère automatiquement un sélecteur CSS optimal :
     - Privilégie les ID uniques
     - Utilise les classes si uniques
     - Vérifie les data-attributes
     - Construit un chemin avec nth-of-type si nécessaire
   - Sauvegarde le sélecteur dans `chrome.storage.local`
3. **popup.js** récupère le sélecteur et lance l'extraction

### Extraction de Section

- **content.js** :
  - Récupère l'élément ciblé avec `document.querySelector(selector)`
  - Extrait :
    - `outerHTML` de la section
    - CSS associé via styles inline + règles de `document.styleSheets`
    - JavaScript inline + notes pour scripts globaux
  - Réécrit les chemins d'images en URLs absolues

- **background.js** :
  - Construit un ZIP minimal contenant :
    - `section.html` avec commentaires d'origine
    - `section.css` avec recommandations Shopify
    - `section.js` avec notes d'intégration
  - Déclenche le téléchargement via `chrome.downloads`

## Limites et bonnes pratiques pour Shopify

### CSS partiel
- Les styles cross-origin (CDN tiers) ne sont pas toujours accessibles
- Pour ces cas, copier manuellement depuis les fichiers CSS originaux

### JavaScript global
- L'extension récupère uniquement les scripts inline de la section
- Pour une intégration propre :
  - Rechercher les références à l'ID/classes dans les JS globaux du site
  - Adapter dans `theme.js` ou fichiers JS de ton thème

### Performances
- Limiter les sélecteurs trop génériques
- Préfixer les classes ou isoler dans un wrapper si nécessaire

## Conseils d'adaptation à Liquid (Shopify)

### HTML (`section.html`)
- Créer un fichier dans `sections/` (ex: `custom-section.liquid`)
- Coller le contenu HTML
- Remplacer les contenus statiques par des variables Liquid :
  ```liquid
  {{ section.settings.titre }}
  {{ section.settings.image | img_url: 'large' }}
  ```
- Ajouter un `schema` pour le customizer

### CSS (`section.css`)
- Copier dans `assets/custom-section.css` ou `theme.css`
- Limiter la portée avec un wrapper ou préfixe de classe
- Harmoniser avec le design system du thème

### JS (`section.js`)
- Intégrer dans `assets/theme.js` ou fichier dédié
- Initialiser sur les événements Shopify :
  ```javascript
  document.addEventListener('shopify:section:load', function(event) {
    // Initialiser la section
  });
  ```

## Améliorations futures possibles

- [ ] Export direct en `.liquid` avec schema JSON
- [ ] Prévisualisation avant téléchargement
- [ ] Support multi-sélection (plusieurs sections à la fois)
- [ ] Détection automatique des frameworks JS (React, Vue, Alpine...)
- [ ] Intégration directe avec Shopify CLI

## Avertissement

Cette extension vise à gagner du temps sur l'extraction technique, mais ne remplace pas :
- L'analyse manuelle du code
- Les ajustements pour la performance et structure Shopify
- Le respect des droits d'auteur et licences des designs copiés

## Support

Problèmes ? Ouvre une issue sur GitHub : [section-scraper-extension/issues](https://github.com/Youni-G5/section-scraper-extension/issues)

---

**Version actuelle :** 1.1.0  
**Licence :** MIT  
**Auteur :** Créé pour les développeurs Shopify
