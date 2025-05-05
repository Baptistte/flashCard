// js/app.js
import {
    loadAllData,
    loadSubjectData,
    getCardsForChapter,
    getFavoriteCardsData,
    getChapters,
    isMastered,
    addMastered,
    toggleFavorite,
    isFavorite,
    resetMasteredProgress,
    resetFavorites,
    getFavoriteCount,
    resetAllProgressGlobal,
    getAvailableSubjects
} from './dataManager.js';
import {
    setupSelectionListeners,
    displaySubjectSelection,
    displayChapterSelection, // Utiliser displayChapterSelection pour préparer l'UI
    updateFavoriteButtonState as updateFavBtnStateChapterUI,
    updateResetAllButtonState,
    hideChapterSelection,
    showChapterSelection, // Utiliser showChapterSelection pour la transition
    hideSubjectSelection,
    showSubjectSelectionScreen
} from './ui/chapterSelectUI.js';
import { shuffleArray, isValidChapter } from './utils/helpers.js';
import { initializeMermaid } from './utils/mermaidUtil.js';
import { displayCardContent, flipCardUI, showQuestionReminder, hideQuestionReminder, updateFavoriteIcon } from './ui/flashcardUI.js';
import { updateButtonStates as updateControlsUI, showFlipButton, showMatchPassButtons, disableAllCardControls, enableAllCardControls, setupControlsListeners } from './ui/controlsUI.js';
import { updateProgressDisplay, hideProgress } from './ui/progressUI.js';
import { fadeInElement, fadeOutElement } from './utils/animation.js'; // Assurer que c'est importé

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Initializing App"); // LOG INIT

    // --- Variables d'état globales ---
    let initialFilteredCards = [];
    let currentSessionDeck = [];
    let currentIndex = 0;
    let currentSelectedSubject = null;
    let currentSelectedChapterOrMode = null;
    let sessionStartTime = null;
    let sessionMatchedCount = 0;
    let sessionPassedCount = 0;

    // --- Références DOM ---
    const subjectSelectionContainer = document.getElementById('subject-selection');
    const chapterSelectionContainer = document.getElementById('chapter-selection');
    const flashcardSection = document.getElementById('flashcard-section');
    const sessionCompleteMessage = document.getElementById('session-complete-message');
    const backBtn = document.getElementById('back-btn');
    const flashcardContainer = document.querySelector('.flashcard-container');
    const controlsContainer = document.querySelector('.controls');
    const utilityControlsContainer = document.querySelector('.utility-controls-container');
    const progressVisualContainer = document.getElementById('progress-visual-container');
    const appTitle = document.getElementById('app-title');

    // --- Initialisation ---
    async function initializeApp() {
        console.log("initializeApp: Starting");
        initializeMermaid();
        try {
            await loadAllData(); // Charge juste la liste des matières maintenant
            const subjects = getAvailableSubjects();
            console.log("initializeApp: Available subjects loaded:", subjects);
            displaySubjectSelection(subjects); // chapterSelectUI affiche les matières
            updateResetAllButtonState(Object.keys(localStorage).some(k => k.startsWith('flashcardsMastered_') || k.startsWith('flashcardsFavorites_')));
            fadeInElement(subjectSelectionContainer);
            setupAppListeners(); // Attacher les listeners une fois
            console.log("initializeApp: Initialization complete");
        } catch (error) {
            console.error("initializeApp: Failed to initialize", error);
            // Gérer l'affichage de l'erreur à l'utilisateur si nécessaire
        }
    }

    // --- Logique de Sélection Matière ---
    async function handleSubjectSelect(subjectFile, subjectName) {
        console.log(`handleSubjectSelect: Subject selected - File: ${subjectFile}, Name: ${subjectName}`);
        currentSelectedSubject = { file: subjectFile, name: subjectName };
        try {
            console.log("handleSubjectSelect: Loading subject data...");
            const subjectData = await loadSubjectData(subjectFile); // Charge données + localStorage matière
            if (!subjectData || subjectData.length === 0) {
                 console.warn(`handleSubjectSelect: No card data found for ${subjectFile}`);
                 // Afficher un message à l'utilisateur ?
                 // Pour l'instant, on continue pour afficher l'écran chapitre (qui dira qu'il n'y a rien)
            } else {
                 console.log(`handleSubjectSelect: Subject data loaded, ${subjectData.length} cards total.`);
            }

            const chapters = getChapters(); // Chapitres de la matière courante
            const favCount = getFavoriteCount(); // Favoris de la matière courante
            console.log(`handleSubjectSelect: Chapters found: [${chapters.join(', ')}], Favorites: ${favCount}`);

            // Utiliser la fonction de chapterSelectUI pour gérer l'affichage et la transition
            showChapterSelection(subjectName, chapters, favCount); // Affiche écran chapitres
            console.log("handleSubjectSelect: showChapterSelection called");

            if (backBtn) {
                backBtn.style.display = 'inline-flex';
                backBtn.title = "Retour aux matières";
                console.log("handleSubjectSelect: Back button displayed for subject selection");
            }
        } catch (error) {
            console.error(`handleSubjectSelect: Error loading data for ${subjectFile}`, error);
            alert(`Erreur lors du chargement de la matière : ${subjectName}`);
            // Peut-être revenir à l'écran des matières ?
            showSubjectSelectionScreen();
        }
    }

    // --- Logique de démarrage de session ---
    function startFlashcards(selectedChapterOrMode) {
        console.log(`startFlashcards: Starting session for mode/chapter: ${selectedChapterOrMode}`);
        if (!currentSelectedSubject) {
            console.error("startFlashcards: No subject selected!");
            alert("Erreur : Aucune matière n'est sélectionnée.");
            return;
        }
        currentSelectedChapterOrMode = selectedChapterOrMode;
        let baseFilteredData;
        let allMasteredInitially = false;

        try { // Ajouter try/catch autour de la récupération des données
            if (selectedChapterOrMode === 'all') {
                baseFilteredData = getCardsForChapter(undefined);
                initialFilteredCards = baseFilteredData.filter(card => !isMastered(card.uniqueId));
                if (initialFilteredCards.length === 0 && baseFilteredData.length > 0) allMasteredInitially = true;
            } else if (selectedChapterOrMode === 'favorites') {
                baseFilteredData = getFavoriteCardsData();
                if (baseFilteredData.length === 0) {
                    alert("Vous n'avez aucune carte en favoris pour cette matière !");
                    return;
                }
                initialFilteredCards = [...baseFilteredData];
            } else { // Chapitre spécifique
                baseFilteredData = getCardsForChapter(Number(selectedChapterOrMode));
                if (baseFilteredData.length === 0) {
                    alert(`Aucune carte trouvée pour le chapitre ${selectedChapterOrMode} dans cette matière.`);
                    return;
                }
                initialFilteredCards = baseFilteredData.filter(card => !isMastered(card.uniqueId));
                if (initialFilteredCards.length === 0 && baseFilteredData.length > 0) allMasteredInitially = true;
            }
        } catch (error) {
             console.error("startFlashcards: Error filtering cards", error);
             alert("Erreur lors de la préparation des cartes pour la session.");
             return;
        }


        console.log(`startFlashcards: Initial cards for session: ${initialFilteredCards.length}, Base cards: ${baseFilteredData.length}, All mastered initially: ${allMasteredInitially}`);


        if (allMasteredInitially) {
            alert(`Félicitations ! Toutes les cartes pour cette sélection sont déjà maîtrisées.`);
             displaySessionCompleteView(true);
             hideChapterSelection(() => {
                 if (backBtn) backBtn.title = "Retour aux chapitres";
                 fadeInElement(flashcardSection, 'flex');
                 if (progressVisualContainer) progressVisualContainer.style.display = 'block';
                 if (sessionCompleteMessage) sessionCompleteMessage.style.display = 'block';
                 hideQuestionReminder();
                 if (flashcardContainer) flashcardContainer.style.display = 'none';
                 if (controlsContainer) controlsContainer.style.display = 'none';
                 if (utilityControlsContainer) utilityControlsContainer.style.display = 'none';
             });
             return;
        }

        if (initialFilteredCards.length === 0) {
             alert(`Aucune carte à étudier pour cette sélection.`);
             return;
        }

        currentSessionDeck = [...initialFilteredCards];
        currentIndex = 0;
        sessionStartTime = new Date();
        sessionMatchedCount = 0;
        sessionPassedCount = 0;

        console.log("startFlashcards: Hiding chapter selection, showing flashcard section");
        hideChapterSelection(() => {
            shuffleDeck();
            if (backBtn) backBtn.title = "Retour aux chapitres";
            fadeInElement(flashcardSection, 'flex');
            if (progressVisualContainer) progressVisualContainer.style.display = 'block';
            hideSessionCompleteMessage();
            hideQuestionReminder();
        });
    }

    // --- Logique d'affichage de carte ---
    async function showCard(index) {
        console.log(`showCard: Attempting to show card at index ${index}. Deck size: ${currentSessionDeck?.length}`);
        if (!currentSessionDeck || currentSessionDeck.length === 0) {
            console.log("showCard: No cards left in deck, displaying session complete.");
            displaySessionCompleteView();
            return;
        }
        if (index < 0 || index >= currentSessionDeck.length) {
             console.warn(`showCard: Invalid index ${index}, resetting to 0.`);
             currentIndex = 0;
             index = 0;
             if (currentSessionDeck.length === 0) {
                 displaySessionCompleteView();
                 return;
             }
        }

        const currentCard = currentSessionDeck[index];
        console.log("showCard: Displaying card:", currentCard?.uniqueId);
        await displayCardContent(currentCard); // Géré par flashcardUI

        hideSessionCompleteMessage();
        if(flashcardContainer) flashcardContainer.style.display = 'block';
        if(controlsContainer) controlsContainer.style.display = 'flex';
        if(utilityControlsContainer) utilityControlsContainer.style.display = 'flex';
        enableAllCardControls(currentSessionDeck.length);

        updateUIState();
        hideQuestionReminder();
        showFlipButton();
    }

    // --- Logique de navigation et d'action ---
    function flip() {
        console.log("flip: Flipping card");
        if (!currentSessionDeck || currentSessionDeck.length === 0) return;
        const isNowFlipped = flipCardUI();
        if (isNowFlipped) {
            showMatchPassButtons();
            const currentCard = currentSessionDeck[currentIndex];
            showQuestionReminder(currentCard.question);
        } else {
            showFlipButton();
            hideQuestionReminder();
        }
        updateUIState();
    }

    function match() {
        console.log("match: Card matched");
         if (!currentSessionDeck || currentSessionDeck.length === 0) return;
        const matchedCard = currentSessionDeck[currentIndex];
        console.log("match: Matched card ID:", matchedCard?.uniqueId);

        if (currentSelectedChapterOrMode === 'favorites' && isFavorite(matchedCard.uniqueId)) {
            console.log("match: Removing from favorites (in fav mode)");
            toggleFavorite(matchedCard.uniqueId);
            updateFavBtnStateChapterUI(getFavoriteCount());
        }

        if (currentSelectedChapterOrMode !== 'favorites') {
             console.log("match: Adding to mastered");
            addMastered(matchedCard.uniqueId);
        }
        sessionMatchedCount++;
        currentSessionDeck.splice(currentIndex, 1);

        if (currentIndex >= currentSessionDeck.length) {
            currentIndex = Math.max(0, currentSessionDeck.length - 1);
        }
        console.log("match: Hiding reminder and showing next card");
        hideQuestionReminder(() => {
            showCard(currentIndex);
        });
   }

    function pass() {
        console.log("pass: Card passed");
        if (!currentSessionDeck || currentSessionDeck.length <= 1) {
             console.log("pass: Only one card left, treating as match");
             sessionPassedCount++;
              hideQuestionReminder(() => {
                  showCard(currentIndex); // Réaffiche la même puis déclenchera fin si c'est la dernière
              });
             return;
         }
        sessionPassedCount++;
        const passedCard = currentSessionDeck.splice(currentIndex, 1)[0];
        let newIndex;
        do {
            const minInsertIndex = currentIndex;
            const maxIndex = currentSessionDeck.length;
            newIndex = Math.floor(Math.random() * (maxIndex - minInsertIndex + 1)) + minInsertIndex;
        } while (newIndex === currentIndex && currentSessionDeck.length > 0);
        currentSessionDeck.splice(newIndex, 0, passedCard);
        console.log(`pass: Reinserted card ${passedCard?.uniqueId} at index ${newIndex}`);

        if (currentIndex >= currentSessionDeck.length) {
             currentIndex = Math.max(0, currentSessionDeck.length - 1);
        }
        console.log("pass: Hiding reminder and showing card at current index:", currentIndex);
         hideQuestionReminder(() => {
            showCard(currentIndex);
        });
    }

    function prev() {
        console.log("prev: Going to previous card");
        if (currentIndex > 0) {
            currentIndex--;
             hideQuestionReminder(() => {
                 showCard(currentIndex);
             });
        }
    }

    function shuffleDeck() {
        console.log("shuffleDeck: Shuffling remaining cards");
         if (currentSessionDeck && currentSessionDeck.length > 1) {
             currentSessionDeck = shuffleArray(currentSessionDeck);
             currentIndex = 0;
             hideQuestionReminder(() => {
                 showCard(currentIndex);
             });
         } else if (currentSessionDeck && currentSessionDeck.length === 1) {
             showCard(currentIndex);
         } else {
             displaySessionCompleteView();
         }
    }

    function displaySessionCompleteView(allMasteredInitially = false) {
        console.log("displaySessionCompleteView: Session ended. All mastered initially:", allMasteredInitially);
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
             const finalMatchedCount = currentSelectedChapterOrMode === 'favorites' ? sessionMatchedCount : totalSessionCards - currentSessionDeck.length;
             const successRate = totalSessionCards > 0 ? Math.round((finalMatchedCount / totalSessionCards) * 100) : 0;
             completionTextHTML = `🎉 Session terminée ! 🎉<br><small>${finalMatchedCount} sur ${totalSessionCards} cartes maîtrisées${timeSpent}.<br>Taux de réussite : ${successRate}%. ${sessionPassedCount} carte(s) passée(s).</small>`;
        }

        if(flashcardContainer) flashcardContainer.style.display = 'none';
        if(controlsContainer) controlsContainer.style.display = 'none';
        if(utilityControlsContainer) utilityControlsContainer.style.display = 'none';
        hideQuestionReminder();

        updateProgressDisplay(sessionMatchedCount, initialFilteredCards.length, 0);
        if(progressVisualContainer) progressVisualContainer.style.display = 'block';

        disableAllCardControls();

         const messageTextElement = document.getElementById('session-complete-text');
         const restartBtnHTML = '<button id="restart-session-btn" class="utility-button">Recommencer</button>';

         if (messageTextElement) {
             messageTextElement.innerHTML = completionTextHTML;
             if (!sessionCompleteMessage.querySelector('#restart-session-btn')) {
                 sessionCompleteMessage.insertAdjacentHTML('beforeend', restartBtnHTML);
             }
         } else {
             sessionCompleteMessage.innerHTML = completionTextHTML + restartBtnHTML;
         }

         fadeInElement(sessionCompleteMessage, 'block');
         const restartBtn = document.getElementById('restart-session-btn');
         if(restartBtn) {
            restartBtn.removeEventListener('click', restartSession);
            restartBtn.addEventListener('click', restartSession);
         }
    }

     function hideSessionCompleteMessage() {
        if (sessionCompleteMessage && sessionCompleteMessage.style.display !== 'none') {
            sessionCompleteMessage.style.display = 'none';
        }
    }

    function restartSession() {
        console.log("restartSession: Restarting current session");
         if(currentSelectedChapterOrMode !== null) {
             hideSessionCompleteMessage();
             if(flashcardContainer) flashcardContainer.style.display = 'block';
             if(controlsContainer) controlsContainer.style.display = 'flex';
             if(utilityControlsContainer) utilityControlsContainer.style.display = 'flex';
             startFlashcards(currentSelectedChapterOrMode);
         } else {
            console.log("restartSession: No current selection, going back to subject select");
             navigateBack(); // Devrait ramener à la sélection matière si rien n'est sélectionné
         }
    }

     function navigateBack() {
        const isFlashcardVisible = flashcardSection.style.display !== 'none' && !flashcardSection.classList.contains('fade-out');
        const isChapterSelectVisible = chapterSelectionContainer.style.display !== 'none' && !chapterSelectionContainer.classList.contains('fade-out');

        if (isFlashcardVisible) {
            console.log("navigateBack: From Flashcards to Chapters");
            fadeOutElement(flashcardSection, () => {
                 const chapters = getChapters();
                 const favCount = getFavoriteCount();
                 displayChapterSelection(chapters, favCount, currentSelectedSubject?.name); // Prépare
                 fadeInElement(chapterSelectionContainer); // Affiche
                 if (backBtn) {
                    backBtn.style.display = 'inline-flex';
                    backBtn.title = "Retour aux matières";
                 }
                 currentSelectedChapterOrMode = null;
                 initialFilteredCards = [];
                 currentSessionDeck = [];
                 currentIndex = 0;
                 displayCardContent(null);
                 hideSessionCompleteMessage();
                 hideProgress();
                 hideQuestionReminder();
                 disableAllCardControls();
            });
        } else if (isChapterSelectVisible) {
            console.log("navigateBack: From Chapters to Subjects");
            fadeOutElement(chapterSelectionContainer, () => {
                showSubjectSelectionScreen(); // Affiche écran matières
                if (backBtn) backBtn.style.display = 'none';
                currentSelectedSubject = null;
                if (appTitle) appTitle.textContent = "Flashcards";
            });
        } else {
             console.log("navigateBack: Already at subject selection or unknown state.");
        }
    }

    function handleResetCurrent() {
        console.log("handleResetCurrent: Attempting reset for selection:", currentSelectedChapterOrMode);
        if (currentSelectedChapterOrMode === null || !currentSelectedSubject || currentSelectedChapterOrMode === 'favorites') {
            alert("Cette option n'est pas disponible pour le mode 'Favoris' ou si aucune sélection n'est active.");
            return;
        }
        const chapterToReset = currentSelectedChapterOrMode;
        const chapterLabel = chapterToReset === 'all' ? `tous les chapitres de ${currentSelectedSubject.name}` : `le chapitre ${chapterToReset} de ${currentSelectedSubject.name}`;
        if (confirm(`Êtes-vous sûr de vouloir oublier la progression pour ${chapterLabel} ? Vous retournerez à l'écran de sélection des chapitres.`)) {
             console.log("handleResetCurrent: Resetting progress for", chapterToReset);
             resetMasteredProgress(chapterToReset === 'all' ? undefined : Number(chapterToReset));
             navigateBack(); // Retourne à la sélection des chapitres
         }
    }

    function handleResetAll() {
        console.log("handleResetAll: Attempting reset all progress");
         if (confirm("Êtes-vous sûr de vouloir oublier TOUTE la progression (cartes maîtrisées ET favoris) pour TOUTES les matières ?")) {
             if (confirm("VRAIMENT TOUT ? Cette action est irréversible.")) {
                 console.log("handleResetAll: Confirming full reset");
                 resetAllProgressGlobal();
                 alert("Toute la progression et les favoris ont été réinitialisés.");
                 updateResetAllButtonState(true);
                 updateFavBtnStateChapterUI(0);
             }
         }
    }

    function updateUIState() {
        const totalInitialSession = initialFilteredCards.length;
        const remaining = currentSessionDeck.length;
        const matchedThisSession = totalInitialSession - remaining;
        updateProgressDisplay(matchedThisSession, totalInitialSession, remaining);

        const isFlipped = document.querySelector('.flashcard')?.classList.contains('is-flipped');
        let canResetCurrent = false;
        if (currentSelectedChapterOrMode !== 'favorites' && currentSelectedSubject && initialFilteredCards.length > 0) { // Ajout vérif initialFilteredCards > 0
             const allCardsForSelection = getCardsForChapter(currentSelectedChapterOrMode === 'all' ? undefined : Number(currentSelectedChapterOrMode));
             canResetCurrent = initialFilteredCards.length < allCardsForSelection.length; // Possible si des cartes ont été maîtrisées
        }

        updateControlsUI({
            hasCards: currentSessionDeck.length > 0,
            isFirst: currentIndex === 0,
            isLast: currentIndex === currentSessionDeck.length - 1,
            isFlipped: !!isFlipped, // Convertir en booléen
            canShuffle: currentSessionDeck.length > 1,
            canReset: canResetCurrent
        });

        if (currentSessionDeck.length > 0 && currentSessionDeck[currentIndex]) {
             updateFavoriteIcon(isFavorite(currentSessionDeck[currentIndex].uniqueId));
         } else {
             updateFavoriteIcon(false);
         }
    }

    function setupAppListeners() {
         setupSelectionListeners({
             onSubjectClick: handleSubjectSelect,
             onChapterClick: (chapterNum) => startFlashcards(chapterNum),
             onAllClick: () => startFlashcards('all'),
             onFavoritesClick: () => startFlashcards('favorites'),
             onResetAllClick: handleResetAll
         });

        setupControlsListeners({
            onPrev: prev,
            onFlip: flip,
            onMatch: match,
            onPass: pass,
            onShuffle: shuffleDeck,
            onResetCurrent: handleResetCurrent,
            onBack: navigateBack,
            onRestart: restartSession
        });

        const toggleFavoriteBtnQ = document.getElementById('toggle-favorite-btn-question');
        const toggleFavoriteBtnA = document.getElementById('toggle-favorite-btn-answer');
        if (toggleFavoriteBtnQ) toggleFavoriteBtnQ.addEventListener('click', handleToggleFavoriteApp);
        if (toggleFavoriteBtnA) toggleFavoriteBtnA.addEventListener('click', handleToggleFavoriteApp);

        if (backBtn) {
            backBtn.removeEventListener('click', navigateBack); // Nettoyer au cas où
            backBtn.addEventListener('click', navigateBack);
        }
        document.addEventListener('keydown', handleKeyPress);

        const flashcardElement = document.querySelector('.flashcard');
        if (flashcardElement) {
            flashcardElement.addEventListener('click', (e) => {
                if (e.target.closest('a, button, .favorite-toggle-btn')) return;
                const flipBtnRef = document.getElementById('flip-btn');
                if (!flashcardElement.classList.contains('is-flipped') && flipBtnRef && !flipBtnRef.disabled) {
                     flip();
                 }
            });
        }
    }

    function handleToggleFavoriteApp() {
        if (!currentSessionDeck || currentSessionDeck.length === 0) return;
        const currentCard = currentSessionDeck[currentIndex];
        if (!currentCard) return;
        console.log(`handleToggleFavoriteApp: Toggling favorite for ${currentCard.uniqueId}`);
        toggleFavorite(currentCard.uniqueId);
        updateFavoriteIcon(isFavorite(currentCard.uniqueId));
        updateFavBtnStateChapterUI(getFavoriteCount());
    }


    function handleKeyPress(event) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
           return;
        }

        const isFlashcardSectionVisible = flashcardSection.style.display !== 'none';
        const isChapterSelectVisible = chapterSelectionContainer.style.display !== 'none';
        const isSubjectSelectVisible = subjectSelectionContainer.style.display !== 'none';
        const isFlipped = document.querySelector('.flashcard')?.classList.contains('is-flipped');
        const isSessionComplete = sessionCompleteMessage.style.display !== 'none';
        const areControlsVisible = document.getElementById('controls')?.style.display !== 'none';

        if (isFlashcardSectionVisible && !isSessionComplete && currentSessionDeck && currentSessionDeck.length > 0 && areControlsVisible) {
            const prevBtnDisabled = document.getElementById('prev-btn')?.disabled;
            const matchBtnDisabled = document.getElementById('match-btn')?.disabled;
            const passBtnDisabled = document.getElementById('pass-btn')?.disabled;
            const flipBtnDisabled = document.getElementById('flip-btn')?.disabled;
            const shuffleBtnDisabled = document.getElementById('shuffle-btn')?.disabled;
            const favoriteBtnDisabled = document.getElementById('toggle-favorite-btn-question')?.disabled;

            switch (event.key) {
                case 'ArrowLeft': if (!prevBtnDisabled) { event.preventDefault(); prev(); } break;
                case 'ArrowRight': if (isFlipped && !matchBtnDisabled) { event.preventDefault(); match(); } break;
                case 'ArrowDown': if (isFlipped && !passBtnDisabled) { event.preventDefault(); pass(); } break;
                case ' ': case 'ArrowUp': if (!isFlipped && !flipBtnDisabled) { event.preventDefault(); flip(); } break;
                case 'm': case 'M': if (!shuffleBtnDisabled) { event.preventDefault(); shuffleDeck(); } break;
                case 'f': case 'F': if(!favoriteBtnDisabled) {event.preventDefault(); handleToggleFavoriteApp();} break;
                case 'Escape': if (backBtn.style.display !== 'none') { event.preventDefault(); navigateBack(); } break;
            }
        } else if (isChapterSelectVisible && !chapterSelectionContainer.classList.contains('fade-out')) {
            if (event.key === 'Enter') {
                 if (document.activeElement && document.activeElement.classList.contains('chapter-button')) { document.activeElement.click(); }
                 else if (document.activeElement?.id === 'start-all-chapters-btn' && !document.activeElement?.disabled) { document.activeElement.click(); }
                 else if (document.activeElement?.id === 'start-favorites-btn' && !document.activeElement?.disabled) { document.activeElement.click(); }
             } else if (event.key === 'Escape') {
                 if (backBtn.style.display !== 'none') { event.preventDefault(); navigateBack(); }
             }
        } else if (isSubjectSelectVisible && !subjectSelectionContainer.classList.contains('fade-out')) {
            if (event.key === 'Enter') {
                 if (document.activeElement && document.activeElement.classList.contains('subject-button')) { document.activeElement.click(); }
             }
        } else if (isSessionComplete) {
             const restartBtn = document.getElementById('restart-session-btn');
             if (event.key === 'Enter' || event.key === 'r' || event.key === 'R') {
                if(restartBtn) restartSession();
             } else if (event.key === 'Escape') {
                  if (backBtn.style.display !== 'none') { event.preventDefault(); navigateBack(); }
             }
        }
    }

    initializeApp();
});