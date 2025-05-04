# Flashcards Droit des Affaires - Application Web

Cette application web permet de réviser des notions de Droit des Affaires à l'aide de flashcards interactives, organisées par chapitres. Elle intègre des fonctionnalités de suivi de progression, de mise en favoris et d'affichage de diagrammes (via Mermaid.js).

## Fonctionnalités

*   **Sélection de Chapitre :** Choisissez un chapitre spécifique ou révisez toutes les cartes.
*   **Mode Favoris :** Lancez une session uniquement avec les cartes que vous avez marquées comme favorites.
*   **Flashcards Interactives :**
    *   Affichage Question / Réponse.
    *   Possibilité de retourner la carte (clic ou raccourci).
    *   Affichage de diagrammes Mermaid, images ou texte préformaté associés aux réponses.
    *   Rappel de la question visible lorsque la réponse est affichée.
*   **Système d'Apprentissage "Match/Pass" :**
    *   **Maîtrisé :** Indique que vous connaissez la carte. Elle est marquée comme maîtrisée (sauvegardée) pour les sessions futures (sauf mode favoris) et retirée de la session en cours. Si la carte était favorite, elle est retirée des favoris *uniquement si vous êtes en mode favoris*.
    *   **Passer :** Indique que vous souhaitez revoir la carte. Elle est retirée temporairement et réinsérée aléatoirement plus loin dans le paquet de la session en cours.
*   **Suivi de Progression :**
    *   Barre de progression visuelle et indicateur textuel (X cartes vues / Y total / Z restantes).
    *   Sauvegarde des cartes maîtrisées dans le `localStorage` (persiste entre les sessions).
    *   Statistiques simples affichées à la fin de chaque session (cartes maîtrisées, temps passé, taux de réussite, cartes passées).
*   **Gestion des Favoris :**
    *   Marquez/Démarquez des cartes comme favorites via une icône étoile.
    *   Les favoris sont sauvegardés dans le `localStorage`.
    *   Lancez des sessions dédiées aux cartes favorites.
*   **Gestion de la Progression :**
    *   Option pour réinitialiser la progression ("cartes maîtrisées") pour le chapitre/mode en cours.
    *   Option pour réinitialiser TOUTE la progression (maîtrisées + favoris) sur l'écran de sélection.
*   **Autres :**
    *   Bouton pour mélanger les cartes restantes dans la session.
    *   Navigation Précédent/Suivant.
    *   Bouton pour revenir à la sélection des chapitres.
    *   Design responsive pour s'adapter aux différentes tailles d'écran.
    *   Utilisation de Mermaid.js pour le rendu de diagrammes.
    *   Raccourcis clavier pour une navigation rapide.

## Architecture du Projet

Le projet est structuré en modules JavaScript pour une meilleure organisation et maintenabilité :
.
├── index.html # Structure principale de la page web
├── style.css # Styles CSS pour l'apparence
├── flashcards.json # Fichier contenant les données des cartes (questions, réponses, chapitre, diagrammes...)
│
└── js/ # Dossier contenant le code JavaScript
│
├── app.js # Point d'entrée principal : orchestre l'application, gère l'état global et les événements majeurs.
│
├── dataManager.js # Module de gestion des données : chargement du JSON, lecture/écriture du localStorage (maîtrisées, favoris), filtrage des cartes.
│
├── ui/ # Dossier pour les modules liés à l'interface utilisateur
│ │
│ ├── chapterSelectUI.js # Gère l'affichage et les interactions de l'écran de sélection des chapitres.
│ │
│ ├── flashcardUI.js # Gère l'affichage de la flashcard (question, réponse, diagramme, icône favori, flip).
│ │
│ ├── controlsUI.js # Gère l'état visuel (activé/désactivé) et l'affichage des boutons de contrôle (Préc., Flip, Match/Pass, Shuffle, Reset...).
│ │
│ └── progressUI.js # Gère l'affichage de la progression (barre visuelle et indicateur textuel).
│
└── utils/ # Dossier pour les fonctions utilitaires
│
├── mermaidUtil.js # Fonctions spécifiques pour l'initialisation et le rendu des diagrammes Mermaid.
│
├── animation.js # Fonctions pour les animations CSS (fadeIn, fadeOut).
│
└── helpers.js # Fonctions utilitaires générales (mélange de tableau, validation, échappement HTML...).

**Flux de l'application :**

1.  `index.html` charge `js/app.js` comme module.
2.  `app.js` initialise l'application (`initializeApp`).
3.  `initializeApp` appelle `dataManager.loadAllData()` pour charger le JSON et les données du `localStorage`.
4.  `initializeApp` appelle `chapterSelectUI.displayChapterSelection()` pour afficher l'écran d'accueil.
5.  L'utilisateur choisit un chapitre/mode. `app.js` intercepte cet événement (via `setupChapterSelection`).
6.  `app.js` appelle `dataManager` pour obtenir les cartes filtrées (non maîtrisées ou favorites).
7.  `app.js` initialise l'état de la session et appelle `flashcardUI.displayCardContent()`, `progressUI.updateProgressDisplay()`, et `controlsUI.updateButtonStates()`. L'UI est mise à jour via les modules dédiés.
8.  Les interactions de l'utilisateur (clic sur Précédent, Flip, Match, Pass, Favori, etc.) sont gérées par des écouteurs d'événements (mis en place par `setupControlsListeners` dans `app.js`), qui appellent les fonctions logiques correspondantes dans `app.js`.
9.  Ces fonctions logiques dans `app.js` mettent à jour l'état (`currentIndex`, `currentSessionDeck`), appellent `dataManager` si nécessaire (pour sauvegarder maîtrise/favori), et appellent les modules UI pour refléter les changements.

## Format du fichier `flashcards.json`

Le fichier `flashcards.json` doit être un tableau d'objets JSON. Chaque objet représente une flashcard et doit avoir au minimum les clés suivantes :

*   `question` (string): Le texte de la question.
*   `reponse` (string): Le texte de la réponse.
*   `chapitre` (number): Le numéro du chapitre auquel la carte appartient.

Optionnellement, une carte peut avoir une des clés suivantes pour un diagramme (Mermaid a priorité) :

*   `diagram_mermaid` (string): Le code Mermaid à rendre.
*   `diagram_image` (string): Le chemin vers un fichier image.
*   `diagram_text` (string): Un schéma en texte préformaté.

Exemple :
```json
[
  {
    "chapitre": 0,
    "question": "Quelle est la nature du droit des affaires ?",
    "reponse": "C'est une discipline vivante et évolutive."
  },
  {
    "chapitre": 2,
    "question": "Quel est le principe de la preuve en matière commerciale ?",
    "reponse": "Entre commerçants, la preuve est libre (L110-3 C.com).",
    "diagram_mermaid": "graph TD\n    A{Acte Juridique} --> B{Entre Commerçants?};\n    B -- Oui --> C[Preuve Libre L110-3];\n    B -- Non (Acte Mixte) --> D{Qui prouve?};\n    D -- Commerçant prouve<br/>contre Non-Commerçant --> E[Règles Civiles<br/>(Écrit sup. 1500 Euros)];\n    D -- Non-Commerçant prouve<br/>contre Commerçant --> C;\n    C -- Moyens --> F[Tous moyens<br/>Écrit - Témoignage<br/>Comptabilité etc];\n    E -- Exceptions --> G[Commencement preuve par écrit<br/>Impossibilité morale/matérielle];"
  }
]
```

Installation et Lancement
Clonez ou téléchargez ce dépôt.

Assurez-vous que les fichiers (index.html, style.css, flashcards.json et le dossier js/ avec tous ses sous-fichiers) sont dans le même répertoire.

Important : En raison de l'utilisation des modules JavaScript (import/export) et de fetch pour charger le JSON, vous ne pouvez généralement pas ouvrir index.html directement depuis votre explorateur de fichiers (protocole file://). Vous devez servir les fichiers via un serveur web local.

Option simple (avec VS Code) : Installez l'extension "Live Server" et cliquez sur "Go Live" en bas à droite de l'éditeur.

Option avec Python : Ouvrez un terminal dans le dossier du projet et exécutez python -m http.server (pour Python 3) ou python -m SimpleHTTPServer (pour Python 2). Accédez ensuite à http://localhost:8000 (ou le port indiqué) dans votre navigateur.

Option avec Node.js : Installez serve globalement (npm install -g serve) puis exécutez serve dans le dossier du projet. Accédez à l'adresse indiquée.

Ouvrez l'application dans votre navigateur web via l'adresse fournie par le serveur local.

Raccourcis Clavier (Pendant une session)
Flèche Gauche : Carte précédente

Flèche Droite : Valider "Maîtrisé" (si réponse affichée)

Flèche Bas : Valider "Passer" (si réponse affichée)

Espace / Flèche Haut : Retourner la carte (si question affichée)

M : Mélanger les cartes restantes

F : Ajouter/Retirer la carte actuelle des favoris

Escape : Retourner à la sélection des chapitres/modes

Contributions
Les suggestions d'amélioration et les contributions sont les bienvenues.

**Points clés ajoutés/précisés dans ce README :**

*   **Fonctionnalités :** Liste détaillée de ce que fait l'application.
*   **Architecture :** Description claire de la structure modulaire avec les rôles de chaque fichier/dossier. Ajout d'un petit diagramme de flux simplifié.
*   **Format `flashcards.json` :** Explication des clés requises et optionnelles.
*   **Installation et Lancement :** **Crucial :** Explique pourquoi un serveur local est nécessaire et donne plusieurs options simples pour en lancer un.
*   **Raccourcis Clavier :** Liste mise à jour avec les nouvelles fonctionnalités.

Ce `README.md` devrait donner une bonne vue d'ensemble du projet, de son fonctionnement et de sa structure. N'hésitez pas à l'adapter si besoin !