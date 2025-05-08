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
    getFavoriteCount,
    resetAllProgressGlobal,
    getAvailableSubjects
} from './dataManager.js';
import {
    setupSelectionListeners,
    displaySubjectSelection,
    displayChapterSelection,
    updateFavoriteButtonState as updateFavBtnStateChapterUI,
    updateResetAllButtonState
} from './ui/chapterSelectUI.js';
import { shuffleArray } from './utils/helpers.js';
import { initializeMermaid } from './utils/mermaidUtil.js';
import { displayCardContent, flipCardUI, showQuestionReminder, hideQuestionReminder, updateFavoriteIcon } from './ui/flashcardUI.js';
import { updateButtonStates as updateControlsUI, showFlipButton, showMatchPassButtons, disableAllCardControls, enableAllCardControls, setupControlsListeners } from './ui/controlsUI.js';
import { updateProgressDisplay, hideProgress } from './ui/progressUI.js';
import { fadeInElement, fadeOutElement } from './utils/animation.js';

document.addEventListener('DOMContentLoaded', () => {
    let initialFilteredCards = [];
    let currentSessionDeck = [];
    let currentIndex = 0;
    let currentSelectedSubject = null;
    let currentSelectedChapterOrMode = null;
    let sessionStartTime = null;
    let sessionMatchedCount = 0;
    let sessionPassedCount = 0;

    const subjectSelectionContainer = document.getElementById('subject-selection');
    const chapterSelectionContainer = document.getElementById('chapter-selection');
    const flashcardSection = document.getElementById('flashcard-section');
    const aboutSection = document.getElementById('about-section');
    const sessionCompleteMessage = document.getElementById('session-complete-message');
    const backBtn = document.getElementById('back-btn');
    const flashcardContainer = document.querySelector('.flashcard-container');
    const controlsContainer = document.querySelector('.controls');
    const utilityControlsContainer = document.querySelector('.utility-controls-container');
    const progressVisualContainer = document.getElementById('progress-visual-container');
    const contentTitleHeader = document.getElementById('content-title');
    const sidebar = document.getElementById('sidebar');

    async function initializeApp() {
        initializeMermaid();
        try {
            await loadAllData();
            const subjects = getAvailableSubjects();
            displaySubjectSelection(subjects);
            updateResetAllButtonState();
            setupAppListeners();
            showView('subject-selection');
            updateActiveNavLink(document.getElementById('nav-subjects'));
        } catch (error) {
            console.error("initializeApp: Failed to initialize", error);
            if (contentTitleHeader) contentTitleHeader.textContent = "Erreur Initialisation";
            const subjectButtonsDiv = document.getElementById('subject-buttons');
            if (subjectButtonsDiv) subjectButtonsDiv.innerHTML = `<p class="error-message">Erreur lors du chargement de la configuration des matières. Veuillez vérifier le fichier subjectsConfig.json et la console pour plus de détails.</p>`;
        }
    }

    function showView(viewId, data = {}) {
        const views = [
            { id: 'subject-selection', title: 'Matières' },
            { id: 'chapter-selection', title: `Chapitres - ${currentSelectedSubject?.name || ''}` },
            { id: 'flashcard-section', title: `Flashcards - ${currentSelectedSubject?.name || ''}` },
            { id: 'about-section', title: 'À Propos' }
        ];

        views.forEach(view => {
            const el = document.getElementById(view.id);
            if (el && el.style.display !== 'none' && view.id !== viewId) {
                fadeOutElement(el);
            }
        });

        const targetViewInfo = views.find(v => v.id === viewId);
        const targetElement = document.getElementById(viewId);

        if (targetElement) {
            fadeInElement(targetElement, 'block');
            if (contentTitleHeader && targetViewInfo) {
                if (viewId === 'chapter-selection' && currentSelectedSubject) {
                    contentTitleHeader.textContent = `Chapitres - ${currentSelectedSubject.name}`;
                } else if (viewId === 'flashcard-section' && currentSelectedSubject) {
                     let chapterDetail = "";
                     if (currentSelectedChapterOrMode === 'all') chapterDetail = "Tous les chapitres";
                     else if (currentSelectedChapterOrMode === 'favorites') chapterDetail = "Favoris";
                     else if (currentSelectedChapterOrMode) chapterDetail = `Chap. ${currentSelectedChapterOrMode}`;
                     contentTitleHeader.textContent = `${currentSelectedSubject.name} - ${chapterDetail}`;
                }
                else {
                    contentTitleHeader.textContent = targetViewInfo.title;
                }
            }
        }

        if (backBtn) {
            if (viewId === 'subject-selection' || viewId === 'about-section') {
                backBtn.style.display = 'none';
            } else {
                backBtn.style.display = 'inline-flex';
                if (viewId === 'chapter-selection') backBtn.dataset.targetView = 'subject-selection';
                if (viewId === 'flashcard-section') backBtn.dataset.targetView = 'chapter-selection';
            }
        }
        if (sidebar && sidebar.classList.contains('is-open') && window.innerWidth <= 768) {
            sidebar.classList.remove('is-open');
        }
    }

    function updateActiveNavLink(activeLink) {
        document.querySelectorAll('.sidebar-link.active').forEach(link => link.classList.remove('active'));
        if (activeLink) activeLink.classList.add('active');
    }

    async function handleSubjectSelect(subjectFile, subjectName) {
        console.log('%c[app.js] handleSubjectSelect APPELÉ avec:', 'color: green; font-weight: bold;', subjectFile, subjectName); // LOG 5
        currentSelectedSubject = { file: subjectFile, name: subjectName };
        try {
            console.log('%c[app.js] handleSubjectSelect - Début chargement données matière...', 'color: green;');
            await loadSubjectData(subjectFile);
            const chapters = getChapters();
            const favCount = getFavoriteCount();
            console.log('%c[app.js] handleSubjectSelect - Données prêtes. Appel displayChapterSelection...', 'color: green;');
            console.log('  Chapters:', chapters);
            console.log('  FavCount:', favCount);
            console.log('  SubjectName:', subjectName);
            displayChapterSelection(chapters, favCount, subjectName);
            console.log('%c[app.js] handleSubjectSelect - Après displayChapterSelection. Appel showView...', 'color: green;');
            showView('chapter-selection');
            updateActiveNavLink(document.getElementById('nav-subjects')); // Garder matières actif
        } catch (error) {
            console.error(`%c[app.js] handleSubjectSelect: Erreur lors du chargement des données pour ${subjectFile}`, 'color: red;', error);
            alert(`Erreur lors du chargement de la matière : ${subjectName}`);
            showView('subject-selection');
        }
    }

    function startFlashcards(selectedChapterOrMode) {
        if (!currentSelectedSubject) {
            alert("Erreur : Aucune matière n'est sélectionnée.");
            return;
        }
        currentSelectedChapterOrMode = selectedChapterOrMode;
        let baseFilteredData;
        let allMasteredInitially = false;

        try {
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
            } else {
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

        if (allMasteredInitially) {
            alert(`Félicitations ! Toutes les cartes pour cette sélection sont déjà maîtrisées.`);
            showView('flashcard-section');
            displaySessionCompleteView(true);
            if (backBtn) backBtn.title = "Retour aux chapitres";
            if (progressVisualContainer) progressVisualContainer.style.display = 'block';
            if (sessionCompleteMessage) sessionCompleteMessage.style.display = 'block';
            hideQuestionReminder();
            if (flashcardContainer) flashcardContainer.style.display = 'none';
            if (controlsContainer) controlsContainer.style.display = 'none';
            if (utilityControlsContainer) utilityControlsContainer.style.display = 'none';
            return;
        }

        if (initialFilteredCards.length === 0 && selectedChapterOrMode !== 'favorites') {
             alert(`Aucune carte à étudier pour cette sélection (probablement toutes maîtrisées ou chapitre vide).`);
             return;
        }
         if (initialFilteredCards.length === 0 && selectedChapterOrMode === 'favorites') {
             alert("Aucune carte favorite à réviser. Avez-vous marqué des cartes comme favorites et non maîtrisées?");
             return;
         }


        currentSessionDeck = [...initialFilteredCards];
        currentIndex = 0;
        sessionStartTime = new Date();
        sessionMatchedCount = 0;
        sessionPassedCount = 0;

        shuffleDeck();
        showView('flashcard-section');
        if (backBtn) backBtn.title = "Retour aux chapitres";
        if (progressVisualContainer) progressVisualContainer.style.display = 'block';
        hideSessionCompleteMessage();
        hideQuestionReminder();
    }

    async function showCard(index) {
        if (!currentSessionDeck || currentSessionDeck.length === 0) {
            displaySessionCompleteView();
            return;
        }
        if (index < 0 || index >= currentSessionDeck.length) {
             currentIndex = 0;
             index = 0;
             if (currentSessionDeck.length === 0) {
                 displaySessionCompleteView();
                 return;
             }
        }

        const currentCard = currentSessionDeck[index];
        await displayCardContent(currentCard);

        hideSessionCompleteMessage();
        if(flashcardContainer) flashcardContainer.style.display = 'block';
        if(controlsContainer) controlsContainer.style.display = 'flex';
        if(utilityControlsContainer) utilityControlsContainer.style.display = 'flex';
        enableAllCardControls(currentSessionDeck.length);

        updateUIState();
        hideQuestionReminder();
        showFlipButton();
    }

    function flip() {
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
        if (!currentSessionDeck || currentSessionDeck.length === 0) return;
        const matchedCard = currentSessionDeck[currentIndex];

        if (currentSelectedChapterOrMode === 'favorites' && isFavorite(matchedCard.uniqueId)) {
            toggleFavorite(matchedCard.uniqueId);
            updateFavBtnStateChapterUI(getFavoriteCount());
        }

        if (currentSelectedChapterOrMode !== 'favorites') {
            addMastered(matchedCard.uniqueId);
        }
        sessionMatchedCount++;
        currentSessionDeck.splice(currentIndex, 1);

        if (currentIndex >= currentSessionDeck.length) {
            currentIndex = Math.max(0, currentSessionDeck.length - 1);
        }
        hideQuestionReminder(() => {
            showCard(currentIndex);
        });
   }

    function pass() {
        if (!currentSessionDeck || currentSessionDeck.length <= 1) {
             sessionPassedCount++;
              hideQuestionReminder(() => {
                  showCard(currentIndex);
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

        if (currentIndex >= currentSessionDeck.length) {
             currentIndex = Math.max(0, currentSessionDeck.length - 1);
        }
         hideQuestionReminder(() => {
            showCard(currentIndex);
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
         } else if (sessionCompleteMessage) {
             sessionCompleteMessage.innerHTML = completionTextHTML + restartBtnHTML;
         }

        if(sessionCompleteMessage) fadeInElement(sessionCompleteMessage, 'block');
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
        if(currentSelectedChapterOrMode !== null) {
            hideSessionCompleteMessage();
            if(flashcardContainer) flashcardContainer.style.display = 'block';
            if(controlsContainer) controlsContainer.style.display = 'flex';
            if(utilityControlsContainer) utilityControlsContainer.style.display = 'flex';
            startFlashcards(currentSelectedChapterOrMode);
        } else {
            navigateBack();
        }
    }

    function navigateBack() {
        const targetView = backBtn.dataset.targetView;
        if (targetView === 'chapter-selection') {
            showView('chapter-selection');
            updateActiveNavLink(document.getElementById('nav-subjects'));
            currentSelectedChapterOrMode = null;
            initialFilteredCards = [];
            currentSessionDeck = [];
            currentIndex = 0;
            displayCardContent(null);
            hideSessionCompleteMessage();
            hideProgress();
            hideQuestionReminder();
            disableAllCardControls();
        } else if (targetView === 'subject-selection') {
            showView('subject-selection');
            updateActiveNavLink(document.getElementById('nav-subjects'));
            currentSelectedSubject = null;
        } else {
            showView('subject-selection');
            updateActiveNavLink(document.getElementById('nav-subjects'));
        }
    }

    function handleResetCurrent() {
        if (currentSelectedChapterOrMode === null || !currentSelectedSubject || currentSelectedChapterOrMode === 'favorites') {
            alert("Cette option n'est pas disponible pour le mode 'Favoris' ou si aucune sélection n'est active.");
            return;
        }
        const chapterToReset = currentSelectedChapterOrMode;
        const chapterLabel = chapterToReset === 'all' ? `tous les chapitres de ${currentSelectedSubject.name}` : `le chapitre ${chapterToReset} de ${currentSelectedSubject.name}`;
        if (confirm(`Êtes-vous sûr de vouloir oublier la progression pour ${chapterLabel} ? Vous retournerez à l'écran de sélection des chapitres.`)) {
             resetMasteredProgress(chapterToReset === 'all' ? undefined : Number(chapterToReset));
             showView('chapter-selection');
             displayChapterSelection(getChapters(), getFavoriteCount(), currentSelectedSubject.name);
         }
    }

    function handleResetAll() {
         if (confirm("Êtes-vous sûr de vouloir oublier TOUTE la progression (cartes maîtrisées ET favoris) pour TOUTES les matières ?")) {
             if (confirm("VRAIMENT TOUT ? Cette action est irréversible.")) {
                 resetAllProgressGlobal();
                 alert("Toute la progression et les favoris ont été réinitialisés.");
                 updateResetAllButtonState();
                 if(currentSelectedSubject) {
                     updateFavBtnStateChapterUI(getFavoriteCount());
                 } else {
                     updateFavBtnStateChapterUI(0);
                 }
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
        if (currentSelectedChapterOrMode !== 'favorites' && currentSelectedSubject && initialFilteredCards.length > 0) {
             const allCardsForSelection = getCardsForChapter(currentSelectedChapterOrMode === 'all' ? undefined : Number(currentSelectedChapterOrMode));
             canResetCurrent = initialFilteredCards.length < allCardsForSelection.length;
        }

        updateControlsUI({
            hasCards: currentSessionDeck.length > 0,
            isFirst: currentIndex === 0,
            isLast: currentIndex === currentSessionDeck.length - 1,
            isFlipped: !!isFlipped,
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
        console.log('%c[app.js] setupAppListeners APPELÉ.', 'color: blue; font-weight: bold;'); // LOG 6
        setupSelectionListeners({
            onSubjectClick: handleSubjectSelect,
            onChapterClick: (chapterNum) => startFlashcards(chapterNum),
            onAllClick: () => startFlashcards('all'),
            onFavoritesClick: () => startFlashcards('favorites')
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

        const navSubjectsBtn = document.getElementById('nav-subjects');
        const navAboutBtn = document.getElementById('nav-about');
        const sidebarToggleBtn = document.getElementById('sidebar-toggle');
        const resetAllSidebarBtn = document.getElementById('reset-all-progress-btn-sidebar');

        if (navSubjectsBtn) {
            navSubjectsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showView('subject-selection');
                updateActiveNavLink(navSubjectsBtn);
                currentSelectedSubject = null;
                currentSelectedChapterOrMode = null;
            });
        }
        if (navAboutBtn) {
            navAboutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showView('about-section');
                updateActiveNavLink(navAboutBtn);
            });
        }
        if (sidebarToggleBtn && sidebar) {
            sidebarToggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('is-open');
            });
        }
        if (resetAllSidebarBtn) {
            resetAllSidebarBtn.addEventListener('click', handleResetAll);
        }


        const toggleFavoriteBtnQ = document.getElementById('toggle-favorite-btn-question');
        const toggleFavoriteBtnA = document.getElementById('toggle-favorite-btn-answer');
        if (toggleFavoriteBtnQ) toggleFavoriteBtnQ.addEventListener('click', handleToggleFavoriteApp);
        if (toggleFavoriteBtnA) toggleFavoriteBtnA.addEventListener('click', handleToggleFavoriteApp);

        if (backBtn) {
            backBtn.removeEventListener('click', navigateBack);
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
        if (!currentSessionDeck || currentSessionDeck.length === 0 || !currentSessionDeck[currentIndex]) return;
        const currentCard = currentSessionDeck[currentIndex];
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
        const controlsAreVisible = controlsContainer?.style.display !== 'none';

        if (isFlashcardSectionVisible && !isSessionComplete && currentSessionDeck && currentSessionDeck.length > 0 && controlsAreVisible) {
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
            }
        }

        if (event.key === 'Escape') {
             if (backBtn.style.display !== 'none') { event.preventDefault(); navigateBack(); }
             else if (sidebar && sidebar.classList.contains('is-open')) { sidebar.classList.remove('is-open'); }
        }


        if (isChapterSelectVisible && !chapterSelectionContainer.classList.contains('fade-out')) {
            if (event.key === 'Enter') {
                 if (document.activeElement && document.activeElement.classList.contains('chapter-button')) { document.activeElement.click(); }
                 else if (document.activeElement?.id === 'start-all-chapters-btn' && !document.activeElement?.disabled) { document.activeElement.click(); }
                 else if (document.activeElement?.id === 'start-favorites-btn' && !document.activeElement?.disabled) { document.activeElement.click(); }
             }
        } else if (isSubjectSelectVisible && !subjectSelectionContainer.classList.contains('fade-out')) {
            if (event.key === 'Enter') {
                 if (document.activeElement && document.activeElement.classList.contains('subject-widget')) { document.activeElement.click(); }
             }
        } else if (isSessionComplete) {
             const restartBtn = document.getElementById('restart-session-btn');
             if (event.key === 'Enter' || event.key === 'r' || event.key === 'R') {
                if(restartBtn) restartSession();
             }
        }
    }

    initializeApp();
});