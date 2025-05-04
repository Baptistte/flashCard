// js/app.js
import { loadAllData, getCardsForChapter, getFavoriteCardsData, getChapters, isMastered, addMastered, toggleFavorite, isFavorite, resetMasteredProgress, resetFavorites, getFavoriteCount } from './dataManager.js';
import { setupChapterSelection, displayChapterSelection, updateFavoriteButtonState as updateFavBtnStateChapterUI , updateResetAllButtonState, hideChapterSelection, showChapterSelection } from './ui/chapterSelectUI.js';
import { displayCardContent, flipCardUI, showQuestionReminder, hideQuestionReminder, updateFavoriteIcon } from './ui/flashcardUI.js';
import { updateButtonStates as updateControlsUI, showFlipButton, showMatchPassButtons, disableAllCardControls, enableAllCardControls, setupControlsListeners } from './ui/controlsUI.js';
import { updateProgressDisplay, hideProgress } from './ui/progressUI.js';
import { fadeInElement, fadeOutElement } from './utils/animation.js';
import { shuffleArray, isValidChapter } from './utils/helpers.js';
import { initializeMermaid } from './utils/mermaidUtil.js';


document.addEventListener('DOMContentLoaded', () => {
    // --- Variables d'état globales de l'application ---
    let initialFilteredCards = []; // Cartes au début de la session (non maîtrisées ou favorites)
    let currentSessionDeck = [];   // Cartes restantes dans la session en cours
    let currentIndex = 0;          // Index dans currentSessionDeck
    let currentSelectedChapterOrMode = null; // Garde trace de la sélection (chapitre, 'all', 'favorites')
    let sessionStartTime = null;
    let sessionMatchedCount = 0;
    let sessionPassedCount = 0;

    // --- Références DOM (pour les conteneurs principaux) ---
    const chapterSelectionContainer = document.getElementById('chapter-selection');
    const flashcardSection = document.getElementById('flashcard-section');
    const sessionCompleteMessage = document.getElementById('session-complete-message');
    const backToChaptersBtn = document.getElementById('back-to-chapters-btn');
    const flashcardContainer = document.querySelector('.flashcard-container'); // Pour cacher/montrer
    const controlsContainer = document.querySelector('.controls'); // Pour cacher/montrer
    const utilityControlsContainer = document.querySelector('.utility-controls-container'); // Pour cacher/montrer
    const progressVisualContainer = document.getElementById('progress-visual-container');
    const progressIndicator = document.getElementById('progress');

    // --- Initialisation ---
    async function initializeApp() {
        initializeMermaid(); // Initialiser Mermaid une fois
        const allData = await loadAllData(); // Charge JSON et localStorage
        if (!allData || allData.length === 0) {
            displayChapterSelection([], 0); // Afficher message via chapterSelectUI
            return;
        }
        const chapters = getChapters();
        const favCount = getFavoriteCount();
        displayChapterSelection(chapters, favCount); // chapterSelectUI gère l'affichage
        updateResetAllButtonState(); // Mettre à jour état bouton reset all
        fadeInElement(chapterSelectionContainer);

        // Mettre en place les listeners globaux
        setupAppListeners();
    }

    // --- Logique de démarrage de session ---
    function startFlashcards(selectedChapterOrMode) {
        currentSelectedChapterOrMode = selectedChapterOrMode;
        let baseFilteredData;
        let allMasteredInitially = false; // Flag pour le message de fin

        if (selectedChapterOrMode === 'all') {
             // Force le rechargement des données pour être sûr si jamais le JSON a changé
             // Et filtre pour ne prendre que les cartes avec un chapitre valide
             baseFilteredData = loadAllData(true).filter(card => isValidChapter(card.chapitre));
             initialFilteredCards = baseFilteredData.filter(card => !isMastered(card.uniqueId));
             if (initialFilteredCards.length === 0 && baseFilteredData.length > 0) allMasteredInitially = true;
        } else if (selectedChapterOrMode === 'favorites') {
            baseFilteredData = getFavoriteCardsData(); // Récupère les cartes favs actuelles
            if (baseFilteredData.length === 0) {
                alert("Vous n'avez aucune carte en favoris !");
                return;
            }
            initialFilteredCards = [...baseFilteredData]; // Pas de filtre de maîtrise
        } else { // Chapitre spécifique
            baseFilteredData = getCardsForChapter(Number(selectedChapterOrMode));
            initialFilteredCards = baseFilteredData.filter(card => !isMastered(card.uniqueId));
            if (initialFilteredCards.length === 0 && baseFilteredData.length > 0) allMasteredInitially = true;
        }

        // Si aucune carte valide trouvée pour la sélection
        if (!baseFilteredData || baseFilteredData.length === 0) {
             alert(`Aucune carte valide trouvée pour cette sélection.`);
             return;
        }

        // Si toutes sont déjà maîtrisées (hors mode favoris)
        if (allMasteredInitially) {
            alert(`Félicitations ! Toutes les cartes pour cette sélection sont déjà maîtrisées.`);
             displaySessionCompleteView(true); // Afficher message fin spécial
             // Transition UI
             fadeOutElement(chapterSelectionContainer, () => {
                 if (backToChaptersBtn) backToChaptersBtn.style.display = 'inline-flex';
                 fadeInElement(flashcardSection, 'flex');
                 if (progressVisualContainer) progressVisualContainer.style.display = 'block';
                 if (sessionCompleteMessage) sessionCompleteMessage.style.display = 'block'; // Afficher le message directement
                 hideQuestionReminder();
                 if (flashcardContainer) flashcardContainer.style.display = 'none'; // Cacher la carte
                 if (controlsContainer) controlsContainer.style.display = 'none'; // Cacher controles
                 if (utilityControlsContainer) utilityControlsContainer.style.display = 'none'; // Cacher utilitaires
             });
             return;
        }

        // Préparer la session
        currentSessionDeck = [...initialFilteredCards];
        currentIndex = 0;
        sessionStartTime = new Date();
        sessionMatchedCount = 0;
        sessionPassedCount = 0;

        // Transition UI
        hideChapterSelection(() => { // Utilise chapterSelectUI
            shuffleDeck(); // Mélange et affiche la première carte (via showCard)
            if (backToChaptersBtn) backToChaptersBtn.style.display = 'inline-flex';
            fadeInElement(flashcardSection, 'flex');
            if (progressVisualContainer) progressVisualContainer.style.display = 'block';
            hideSessionCompleteMessage();
            hideQuestionReminder();
        });
    }

    // --- Logique d'affichage de carte ---
    async function showCard(index) {
        if (!currentSessionDeck || currentSessionDeck.length === 0) {
            displaySessionCompleteView();
            return;
        }
        if (index < 0 || index >= currentSessionDeck.length) {
             currentIndex = 0; // Retour au début si index invalide
             index = 0;
             if (currentSessionDeck.length === 0) { // Re-vérifier après ajustement
                 displaySessionCompleteView();
                 return;
             }
        }

        const currentCard = currentSessionDeck[index];
        await displayCardContent(currentCard); // Géré par flashcardUI

        hideSessionCompleteMessage();
        if(flashcardContainer) flashcardContainer.style.display = 'block';
        if(controlsContainer) controlsContainer.style.display = 'flex';
        if(utilityControlsContainer) utilityControlsContainer.style.display = 'flex';
        enableAllCardControls(currentSessionDeck.length);

        updateUIState(); // Met à jour progression et états boutons
        hideQuestionReminder(); // Cacher rappel par défaut
        showFlipButton(); // Montrer bouton Flip
    }

    // --- Logique de navigation et d'action ---
    function flip() {
        if (!currentSessionDeck || currentSessionDeck.length === 0) return;
        const isNowFlipped = flipCardUI(); // Géré par flashcardUI
        if (isNowFlipped) {
            showMatchPassButtons();
            const currentCard = currentSessionDeck[currentIndex];
            showQuestionReminder(currentCard.question);
        } else {
            showFlipButton();
            hideQuestionReminder();
        }
        updateUIState(); // Met à jour états boutons
    }

    function match() {
        if (!currentSessionDeck || currentSessionDeck.length === 0) return;
       const matchedCard = currentSessionDeck[currentIndex];

       // MODIFIÉ : Retirer des favoris SEULEMENT si on est en mode 'favorites'
       if (currentSelectedChapterOrMode === 'favorites' && isFavorite(matchedCard.uniqueId)) {
           toggleFavorite(matchedCard.uniqueId); // Retire des favoris et sauvegarde
           // Pas besoin d'updater l'icône ici car on passe à la carte suivante
           updateFavBtnStateChapterUI(getFavoriteCount()); // Met à jour le compteur global
       }

       // Marquer comme maîtrisée (pour les sessions futures, sauf si on est en mode favoris)
       if (currentSelectedChapterOrMode !== 'favorites') {
           addMastered(matchedCard.uniqueId); // Ajoute aux maîtrisées et sauvegarde
       }

       sessionMatchedCount++; // Compte pour les stats de la session en cours

       currentSessionDeck.splice(currentIndex, 1); // Retire de la session en cours

       // Ajuster l'index si on a retiré la dernière carte visuellement
       if (currentIndex >= currentSessionDeck.length) {
           currentIndex = Math.max(0, currentSessionDeck.length - 1);
       }

       hideQuestionReminder(() => {
           showCard(currentIndex); // Afficher la carte suivante ou la fin de session
       });
   }

    function pass() {
        if (!currentSessionDeck || currentSessionDeck.length <= 1) {
             sessionPassedCount++;
              hideQuestionReminder(() => {
                  showCard(currentIndex); // Réaffiche la même
              });
             return;
         }
        sessionPassedCount++;
        const passedCard = currentSessionDeck.splice(currentIndex, 1)[0];
        let newIndex;
        do {
            // Insérer aléatoirement *après* l'index courant (ou à la fin)
            const minInsertIndex = currentIndex;
            const maxIndex = currentSessionDeck.length;
            newIndex = Math.floor(Math.random() * (maxIndex - minInsertIndex + 1)) + minInsertIndex;
        } while (newIndex === currentIndex && currentSessionDeck.length > 0); // Évite juste l'index courant si possible

        currentSessionDeck.splice(newIndex, 0, passedCard);

        // Ajuster l'index si on a retiré la dernière visuellement
        if (currentIndex >= currentSessionDeck.length) {
             currentIndex = Math.max(0, currentSessionDeck.length - 1);
        }
        // Sinon, l'index pointe maintenant sur l'élément suivant celui qu'on a retiré, on reste là.

         hideQuestionReminder(() => {
            showCard(currentIndex); // Affiche la carte qui est maintenant à l'index courant
        });
    }

    function prev() {
        if (currentIndex > 0) {
            currentIndex--;
             hideQuestionReminder(() => {
                 showCard(currentIndex);
             });
        }
    }

    function shuffleDeck() {
         if (currentSessionDeck && currentSessionDeck.length > 1) {
             currentSessionDeck = shuffleArray(currentSessionDeck); // Utilise l'helper
             currentIndex = 0;
             hideQuestionReminder(() => {
                 showCard(currentIndex);
             });
         } else if (currentSessionDeck && currentSessionDeck.length === 1) {
             showCard(currentIndex); // Juste réafficher
         } else {
             displaySessionCompleteView();
         }
    }

    // --- Gestion de fin/redémarrage de session ---
    function displaySessionCompleteView(allMasteredInitially = false) {
        const sessionEndTime = new Date();
        let timeSpent = '';
        if (sessionStartTime) {
            const durationSeconds = Math.round((sessionEndTime - sessionStartTime) / 1000);
            const minutes = Math.floor(durationSeconds / 60);
            const seconds = durationSeconds % 60;
            timeSpent = ` en ${minutes} min ${seconds} sec`;
        }

        let completionTextHTML = '';
        if(allMasteredInitially) {
             completionTextHTML = `Toutes les cartes de cette sélection sont déjà maîtrisées !`;
        } else {
             const totalSessionCards = initialFilteredCards.length;
             // S'assurer que sessionMatchedCount est correct même si on finit par "Pass" la dernière carte
             const finalMatchedCount = currentSelectedChapterOrMode === 'favorites' ? sessionMatchedCount : totalSessionCards - currentSessionDeck.length;
             const successRate = totalSessionCards > 0 ? Math.round((finalMatchedCount / totalSessionCards) * 100) : 0;
             completionTextHTML = `🎉 Session terminée ! 🎉<br><small>${finalMatchedCount} sur ${totalSessionCards} cartes maîtrisées${timeSpent}.<br>Taux de réussite : ${successRate}%. ${sessionPassedCount} carte(s) passée(s).</small>`;
        }

        // Cacher les éléments de la carte
        if(flashcardContainer) flashcardContainer.style.display = 'none';
        if(controlsContainer) controlsContainer.style.display = 'none';
        if(utilityControlsContainer) utilityControlsContainer.style.display = 'none';
        hideQuestionReminder();

        // Mettre à jour la progression finale
        updateProgressDisplay(sessionMatchedCount, initialFilteredCards.length, 0);
        if(progressVisualContainer) progressVisualContainer.style.display = 'block'; // Laisser visible

        disableAllCardControls();

         const messageTextElement = document.getElementById('session-complete-text');
         const restartBtnHTML = '<button id="restart-session-btn" class="utility-button">Recommencer</button>'; // Isoler le bouton

         if (messageTextElement) {
             messageTextElement.innerHTML = completionTextHTML; // Mettre à jour le texte
             // Ajouter le bouton s'il n'est pas déjà là (sécurité)
             if (!sessionCompleteMessage.querySelector('#restart-session-btn')) {
                 sessionCompleteMessage.insertAdjacentHTML('beforeend', restartBtnHTML);
             }
         } else {
            // Fallback si l'élément P n'existe pas
             sessionCompleteMessage.innerHTML = completionTextHTML + restartBtnHTML;
         }

         fadeInElement(sessionCompleteMessage, 'block');
         const restartBtn = document.getElementById('restart-session-btn');
         if(restartBtn) {
            restartBtn.removeEventListener('click', restartSession); // Nettoyer au cas où
            restartBtn.addEventListener('click', restartSession);
         }
    }

    function hideSessionCompleteMessage() {
        if (sessionCompleteMessage && sessionCompleteMessage.style.display !== 'none') {
            sessionCompleteMessage.style.display = 'none';
        }
    }


    function restartSession() {
         if(currentSelectedChapterOrMode !== null) {
             hideSessionCompleteMessage();
             if(flashcardContainer) flashcardContainer.style.display = 'block';
             if(controlsContainer) controlsContainer.style.display = 'flex';
             if(utilityControlsContainer) utilityControlsContainer.style.display = 'flex';
             startFlashcards(currentSelectedChapterOrMode); // Relance avec la même sélection
         } else {
             goBack(); // Sécurité
         }
    }

    // Retour à la sélection des chapitres
     function goBack() {
        fadeOutElement(flashcardSection, () => {
            if (backToChaptersBtn) backToChaptersBtn.style.display = 'none';
            fadeInElement(chapterSelectionContainer);
            currentSelectedChapterOrMode = null;
            initialFilteredCards = [];
            currentSessionDeck = [];
            currentIndex = 0;
            displayCardContent(null);
            hideSessionCompleteMessage();
            hideProgress(); // Cacher toute la progression
            hideQuestionReminder();
            disableAllCardControls();
            updateResetAllButtonState();
            updateFavBtnStateChapterUI(getFavoriteCount());
        });
    }

    // --- Gestion des resets de progression ---
    function handleResetCurrent() {
        if (currentSelectedChapterOrMode === null || currentSelectedChapterOrMode === 'favorites') {
            alert("Cette option n'est pas disponible pour le mode 'Favoris' ou si aucun chapitre n'est sélectionné.");
            return;
        }
        const chapterToReset = currentSelectedChapterOrMode;
        const chapterLabel = chapterToReset === 'all' ? "tous les chapitres" : `le chapitre ${chapterToReset}`;
        if (confirm(`Êtes-vous sûr de vouloir oublier la progression pour ${chapterLabel} ? Vous retournerez à l'écran de sélection.`)) {
             resetMasteredProgress(chapterToReset === 'all' ? undefined : Number(chapterToReset));
             goBack();
         }
    }

    function handleResetAll() {
         if (confirm("Êtes-vous sûr de vouloir oublier TOUTE la progression (cartes maîtrisées ET favoris) ?")) {
             if (confirm("VRAIMENT TOUT ? Cette action est irréversible.")) {
                 resetMasteredProgress();
                 resetFavorites();
                 alert("Toute la progression et les favoris ont été réinitialisés.");
                 updateResetAllButtonState(true); // Devrait être désactivé maintenant
                 updateFavBtnStateChapterUI(0); // Mettre à jour le compteur sur l'écran de sélection
             }
         }
    }

    // --- Mise à jour globale de l'UI ---
    function updateUIState() {
        const totalInitialSession = initialFilteredCards.length;
        const remaining = currentSessionDeck.length;
        // Recalculer matchedThisSession pour la progression textuelle/barre
        const matchedThisSessionForProgress = totalInitialSession - remaining;
        updateProgressDisplay(matchedThisSessionForProgress, totalInitialSession, remaining); // Utiliser le bon compte pour l'affichage

        const isFlipped = document.querySelector('.flashcard')?.classList.contains('is-flipped');
        updateControlsUI({
            hasCards: currentSessionDeck.length > 0,
            isFirst: currentIndex === 0,
            isLast: currentIndex === currentSessionDeck.length - 1,
            isFlipped: isFlipped,
            canShuffle: currentSessionDeck.length > 1,
            // Vérifier s'il y a des cartes maîtrisées pour la sélection courante (hors favoris)
             canReset: currentSelectedChapterOrMode !== 'favorites' &&
                       initialFilteredCards.length < getCardsForChapter(currentSelectedChapterOrMode === 'all' ? undefined : Number(currentSelectedChapterOrMode)).length
        });

        if (currentSessionDeck.length > 0 && currentSessionDeck[currentIndex]) { // S'assurer que l'index est valide
             updateFavoriteIcon(isFavorite(currentSessionDeck[currentIndex].uniqueId));
         } else {
             updateFavoriteIcon(false); // Pas de carte, pas de favori
         }
    }

    function setupAppListeners() {
        // Listeners sur l'écran de sélection (via chapterSelectUI)
        setupChapterSelection(
            (chapterNum) => startFlashcards(chapterNum),
            () => startFlashcards('all'),
            () => startFlashcards('favorites'),
            handleResetAll
        );

       // Listeners sur les contrôles de la flashcard (via controlsUI)
       setupControlsListeners({
           onPrev: prev,
           onFlip: flip,
           onMatch: match,
           onPass: pass,
           onShuffle: shuffleDeck,
           // onFavoriteToggle est géré ci-dessous pour les 2 boutons
           onResetCurrent: handleResetCurrent,
           onBack: goBack,
           onRestart: restartSession
       });

       // --- MODIFICATION ICI : Attacher aux DEUX boutons favoris ---
       const toggleFavoriteBtnQ = document.getElementById('toggle-favorite-btn-question');
       const toggleFavoriteBtnA = document.getElementById('toggle-favorite-btn-answer');
       if (toggleFavoriteBtnQ) {
            toggleFavoriteBtnQ.addEventListener('click', handleToggleFavoriteApp);
       }
        if (toggleFavoriteBtnA) {
            toggleFavoriteBtnA.addEventListener('click', handleToggleFavoriteApp);
       }
       // --- FIN MODIFICATION ---


       // Listener clavier global
       document.addEventListener('keydown', handleKeyPress);

        // Listener pour retourner la carte au clic (peut rester ici ou dans controlsUI si on passe la réf à flashcard)
        const flashcardElement = document.querySelector('.flashcard');
        if (flashcardElement) {
            flashcardElement.addEventListener('click', (e) => {
                // Empêche le flip si on clique sur un bouton DANS la carte (inclut les boutons favoris)
                if (e.target.closest('a, button, .favorite-toggle-btn')) {
                    return;
                }
                const flipBtnRef = document.getElementById('flip-btn');
                if (!flashcardElement.classList.contains('is-flipped') && flipBtnRef && !flipBtnRef.disabled) {
                     flip();
                 }
            });
        }
    }

    // Fonction wrapper pour le toggle favori (inchangée, elle sera appelée par les deux boutons)
    function handleToggleFavoriteApp() {
        if (!currentSessionDeck || currentSessionDeck.length === 0) return;
        const currentCard = currentSessionDeck[currentIndex];
        if (!currentCard) return; // Sécurité supplémentaire
        toggleFavorite(currentCard.uniqueId); // Appel dataManager
        updateFavoriteIcon(isFavorite(currentCard.uniqueId)); // Appel flashcardUI pour les DEUX icônes
        updateFavBtnStateChapterUI(getFavoriteCount()); // Appel chapterSelectUI pour le compteur global
    }


    function handleKeyPress(event) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
           return;
        }

        const isFlashcardSectionVisible = flashcardSection.style.display !== 'none' && !flashcardSection.classList.contains('fade-out');
        const isFlipped = document.querySelector('.flashcard')?.classList.contains('is-flipped');
        const isSessionComplete = sessionCompleteMessage.style.display !== 'none';
        const areControlsVisible = document.getElementById('controls')?.style.display !== 'none';

        if (isFlashcardSectionVisible && !isSessionComplete && currentSessionDeck && currentSessionDeck.length > 0 && areControlsVisible) {
            const prevBtnDisabled = document.getElementById('prev-btn')?.disabled;
            const matchBtnDisabled = document.getElementById('match-btn')?.disabled;
            const passBtnDisabled = document.getElementById('pass-btn')?.disabled;
            const flipBtnDisabled = document.getElementById('flip-btn')?.disabled;
            const shuffleBtnDisabled = document.getElementById('shuffle-btn')?.disabled;
            const favoriteBtnDisabled = document.getElementById('toggle-favorite-btn')?.disabled;

            switch (event.key) {
                case 'ArrowLeft': if (!prevBtnDisabled) { event.preventDefault(); prev(); } break;
                case 'ArrowRight': if (isFlipped && !matchBtnDisabled) { event.preventDefault(); match(); } break;
                case 'ArrowDown': if (isFlipped && !passBtnDisabled) { event.preventDefault(); pass(); } break;
                case ' ': case 'ArrowUp': if (!isFlipped && !flipBtnDisabled) { event.preventDefault(); flip(); } break;
                case 'm': case 'M': if (!shuffleBtnDisabled) { event.preventDefault(); shuffleDeck(); } break;
                case 'f': case 'F': if(!favoriteBtnDisabled) {event.preventDefault(); handleToggleFavoriteApp();} break; // Utiliser le wrapper
                case 'Escape': if (backToChaptersBtn.style.display !== 'none') { event.preventDefault(); goBack(); } break;
            }
        } else if (chapterSelectionContainer.style.display !== 'none' && !chapterSelectionContainer.classList.contains('fade-out')) {
            if (event.key === 'Enter') {
                 if (document.activeElement && document.activeElement.classList.contains('chapter-button')) { document.activeElement.click(); }
                 else if (document.activeElement === startAllChaptersBtn && !startAllChaptersBtn.disabled) { startAllChaptersBtn.click(); }
                 else if (document.activeElement === startFavoritesBtn && !startFavoritesBtn.disabled) { startFavoritesBtn.click(); }
             }
        } else if (isSessionComplete) {
             const restartBtn = document.getElementById('restart-session-btn');
             if (event.key === 'Enter' || event.key === 'r' || event.key === 'R') {
                if(restartBtn) restartSession();
             } else if (event.key === 'Escape') {
                 goBack();
             }
        }
    }

    // --- Démarrage ---
    initializeApp();
});