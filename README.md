# Section Scraper Extension

Extension Chrome avancée pour extraire une section complète d'une page web (HTML, CSS, JS) et la préparer pour une intégration dans un thème Shopify.

## Objectif

- Permettre de cibler n'importe quelle section d'une page via un sélecteur CSS.
- Extraire :
  - le HTML complet de la section (outerHTML)
  - les styles CSS associés (inline + règles de stylesheets accessibles)
  - le JavaScript lié à la section (inline + recommandations pour scripts globaux)
- Générer automatiquement une archive ZIP contenant `section.html`, `section.css` et `section.js` prête à être importée et adaptée dans Shopify.

## Installation locale dans Chrome (mode développeur)

- Cloner le dépôt :
  - `git clone https://github.com/Youni-G5/section-scraper-extension.git`
  - `cd section-scraper-extension`
- Ouvrir Chrome et aller dans :
  - `chrome://extensions/`
- Activer le **Mode développeur** (coin supérieur droit).
- Cliquer sur **Charger l'extension non empaquetée**.
- Sélectionner le dossier du projet `section-scraper-extension`.

L'icône de l'extension apparaît ensuite dans la barre d'outils Chrome.

## Utilisation

- Aller sur la page web contenant la section à copier.
- Clic sur l'icône de l'extension pour ouvrir le popup.
- Dans le champ **Sélecteur CSS**, renseigner un sélecteur valide correspondant à la section à extraire, par exemple :
  - `.product-section`
  - `#hero`
  - `[data-section="banner"]`
- Optionnel : ajuster les options disponibles :
  - **Télécharger les images locales** : convertit les chemins d'images relatifs en URLs absolues pour faciliter l'import.
  - **Inclure tous les styles calculés** : ajoute les styles inline de l'élément (attribut `style`) dans le CSS extrait.
  - **Extraire le JavaScript associé** : récupère les scripts inline de la section et ajoute des notes pour les scripts globaux.
- Cliquer sur **« Extraire la Section »**.
- Un fichier ZIP est généré et téléchargé contenant :
  - `section.html`
  - `section.css`
  - `section.js`

## Structure du projet

- `manifest.json` : configuration Manifest V3 de l'extension.
- `popup.html` : interface utilisateur du popup.
- `style.css` : styles du popup.
- `popup.js` : logique du popup, communication avec le content script et le background.
- `content.js` : script injecté dans la page, responsable de l'extraction HTML/CSS/JS.
- `background.js` : service worker qui génère le ZIP et déclenche le téléchargement.
- `icons/` : icônes de l'extension (à compléter si besoin).

## Fonctionnement technique

- **popup.js**
  - Lit le sélecteur CSS et les options saisies par l'utilisateur.
  - Envoie un message au `content.js` dans l'onglet actif (`SCRAPE_SECTION`).
  - En cas de succès, envoie les données au `background.js` (`CREATE_ZIP_AND_DOWNLOAD`).

- **content.js**
  - Récupère l'élément ciblé avec `document.querySelector(selector)`.
  - Extrait :
    - `outerHTML` de la section.
    - CSS associé via :
      - styles inline (attribut `style`) si option activée.
      - règles des feuilles de style accessibles (`document.styleSheets`) qui matchent l'élément ou ses descendants.
    - JavaScript :
      - scripts inline à l'intérieur de la section.
      - notes explicatives pour compléter les scripts globaux (fichiers JS externes du site).
  - Réécrit les chemins d'images en URLs absolues et stocke aussi le chemin original dans `data-original-src`.

- **background.js**
  - Construit un ZIP minimal contenant :
    - `section.html` avec un commentaire en tête rappelant l'URL d'origine, le sélecteur et des recommandations Shopify.
    - `section.css` avec un commentaire décrivant les bonnes pratiques d'intégration dans Shopify.
    - `section.js` avec des commentaires sur l'intégration dans les fichiers JS de thème.
  - Déclenche le téléchargement du ZIP via l'API `chrome.downloads`.

## Limites et bonnes pratiques pour Shopify

- **CSS partiel** :
  - Les styles provenant de feuilles de style cross-origin (CDN, domaines tiers) ne sont pas toujours accessibles depuis `document.styleSheets` (restrictions de sécurité).
  - Pour ces cas, il peut être nécessaire de copier manuellement des parties de CSS depuis les fichiers originaux.

- **JavaScript global** :
  - L'extension récupère les scripts inline présents dans la section mais ne peut pas automatiquement reconstituer toute la logique des fichiers JS globaux.
  - Pour une intégration propre dans Shopify, il est recommandé de :
    - Rechercher les références à l'ID ou aux classes de la section dans les fichiers JS du site d'origine.
    - Reproduire ou adapter ces comportements dans `theme.js` ou un fichier JS global de votre thème Shopify.

- **Performances et isolation** :
  - Limiter l'utilisation de sélecteurs trop génériques pour éviter de polluer l'ensemble du thème.
  - Préfixer les classes ou isoler la section dans un wrapper spécifique si nécessaire.

## Conseils d'adaptation à Liquid (Shopify)

- **HTML (`section.html`)** :
  - Transformer la section en section Shopify :
    - Créer un fichier dans `sections/` (ex : `custom-section.liquid`).
    - Coller le contenu de `section.html`.
    - Remplacer les contenus statiques par des variables Liquid (
      `{{ section.settings.titre }}`, `{{ section.settings.image }}`, etc.).
  - Utiliser les `schema` de sections pour exposer des réglages dans le customizer.

- **CSS (`section.css`)** :
  - Copier les styles dans :
    - un fichier dédié (ex : `assets/custom-section.css`), ou
    - un fichier global (ex : `theme.css`), en prenant soin de limiter la portée des styles à la section.
  - Nettoyer les règles inutiles ou redondantes et harmoniser avec le design system du thème.

- **JS (`section.js`)** :
  - Intégrer le code dans :
    - un fichier global (ex : `assets/theme.js`) ou
    - un fichier dédié aux sections custom.
  - Initialiser la logique JS sur les événements Shopify pertinents :
    - `shopify:section:load`
    - `shopify:section:select`
    - `DOMContentLoaded` ou équivalents.

## Personnalisation et extension du projet

- Remplacer l'implémentation ZIP minimaliste par une bibliothèque dédiée comme JSZip si vous avez besoin de :
  - compression réelle,
  - gestion avancée des métadonnées,
  - compatibilité maximale avec tous les outils d'archive.
- Ajouter un mode "prévisualisation" dans le popup pour afficher un aperçu du HTML extrait.
- Ajouter une option pour exporter directement un fichier `.liquid` au lieu d'HTML brut.

## Avertissement

Cette extension vise à vous faire gagner du temps sur l'extraction technique, mais ne remplace pas :

- l'analyse manuelle du code,
- les ajustements nécessaires pour respecter la structure et la performance de votre thème Shopify,
- le respect des droits d'auteur et des licences liés aux designs et contenus copiés.
