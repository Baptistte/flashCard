document.addEventListener('DOMContentLoaded', () => {
    let allFlashcardsData = [];
    let initialFilteredCards = [];
    let currentSessionDeck = [];
    let masteredCards = {};
    let favoriteCards = [];
    let currentIndex = 0;
    let chapters = new Set();
    let currentSelectedChapter = null;
    let sessionStartTime = null;
    let sessionMatchedCount = 0;
    let sessionPassedCount = 0;

    const LOCAL_STORAGE_KEY_MASTERED = 'flashcardsMasteredCards';
    const LOCAL_STORAGE_KEY_FAVORITES = 'flashcardsFavoriteCards';

    const chapterSelectionContainer = document.getElementById('chapter-selection');
    const chapterButtonsContainer = document.getElementById('chapter-buttons');
    const startAllChaptersBtn = document.getElementById('start-all-chapters-btn');
    const startFavoritesBtn = document.getElementById('start-favorites-btn');
    const favoriteCountSpan = document.getElementById('favorite-count');
    const flashcardSection = document.getElementById('flashcard-section');
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');
    const answerDiagramContainer = document.getElementById('answer-diagram');
    const answerChapterInfo = document.getElementById('answer-chapter-info');
    const progressIndicator = document.getElementById('progress');
    const progressBarContainer = document.getElementById('progress-visual-container');
    const progressBar = document.getElementById('progress-bar');
    const prevBtn = document.getElementById('prev-btn');
    const flipBtn = document.getElementById('flip-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const backToChaptersBtn = document.getElementById('back-to-chapters-btn');
    const flashcard = document.querySelector('.flashcard');
    const heartAnimationElement = document.querySelector('.heart-animation');
    const matchPassControls = document.getElementById('match-pass-controls');
    const matchBtn = document.getElementById('match-btn');
    const passBtn = document.getElementById('pass-btn');
    const sessionCompleteMessage = document.getElementById('session-complete-message');
    const questionReminderContainer = document.getElementById('question-reminder');
    const questionReminderText = document.getElementById('question-reminder-text');
    const toggleFavoriteBtn = document.getElementById('toggle-favorite-btn');
    const resetCurrentProgressBtn = document.getElementById('reset-current-progress-btn'); // NOUVEAU
    const resetAllProgressBtn = document.getElementById('reset-all-progress-btn'); // NOUVEAU


    mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

    const animationDuration = 400;

    function fadeOutElement(element, callback) {
        if (!element || element.style.display === 'none') { if (callback) callback(); return; }
        element.classList.add('fade-out');
        element.classList.remove('fade-in');
        const handleAnimationEnd = (event) => {
            if (event.target !== element) return;
            element.style.display = 'none';
            element.classList.remove('fade-out');
            element.removeEventListener('animationend', handleAnimationEnd);
            if (callback) callback();
        };
        element.addEventListener('animationend', handleAnimationEnd);
        setTimeout(() => {
             if (element.classList.contains('fade-out')) {
                 handleAnimationEnd({target: element});
             }
        }, animationDuration + 50);
    }

    function fadeInElement(element, displayType = 'block', callback) {
         if (!element) return;
        element.classList.remove('fade-out');
        element.style.display = displayType;
        void element.offsetWidth;
        element.classList.add('fade-in');
        const handleAnimationEnd = (event) => {
            if (event.target !== element) return;
            element.removeEventListener('animationend', handleAnimationEnd);
            if (callback) callback();
        };
        element.addEventListener('animationend', handleAnimationEnd);
         setTimeout(() => {
             const style = window.getComputedStyle(element);
             if (element.classList.contains('fade-in') && style.opacity !== '1' && style.display !== 'none') {
                 handleAnimationEnd({target: element});
                 element.style.opacity = '1';
                 element.classList.remove('fade-in');
             }
         }, animationDuration + 50);
    }

    async function loadAndPrepareData() {
        loadMasteredCards();
        loadFavorites();
        try {
            const response = await fetch('flashcards.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allFlashcardsData = await response.json();

            if (!Array.isArray(allFlashcardsData) || allFlashcardsData.length === 0) {
                 chapterButtonsContainer.innerHTML = "<p>Aucune carte trouvée ou format invalide.</p>";
                 console.error("Données invalides:", allFlashcardsData);
                 disableAllControls();
                 startAllChaptersBtn.disabled = true;
                 startFavoritesBtn.disabled = true;
                 resetAllProgressBtn.disabled = true; // Désactiver reset all si pas de data
                 return;
            }

            allFlashcardsData = allFlashcardsData.map((card, index) => ({
                ...card,
                 uniqueId: `card-${card.chapitre}-${index}`
            }));


            chapters.clear();
            allFlashcardsData.forEach(card => {
                if (isValidChapter(card.chapitre)) {
                    chapters.add(Number(card.chapitre));
                }
            });
            const sortedChapters = Array.from(chapters).sort((a, b) => a - b);

            displayChapterSelection(sortedChapters);
            updateFavoriteButtonState();
            updateResetAllButtonState(); // Mettre à jour état bouton reset all
            fadeInElement(chapterSelectionContainer);

        } catch (error) {
            console.error("Erreur chargement:", error);
            chapterButtonsContainer.innerHTML = `<p class="error-message">Erreur chargement. Vérifiez flashcards.json et la console.</p>`;
            disableAllControls();
            startAllChaptersBtn.disabled = true;
             startFavoritesBtn.disabled = true;
             resetAllProgressBtn.disabled = true;
        }
    }

    function loadMasteredCards() {
        const storedMastered = localStorage.getItem(LOCAL_STORAGE_KEY_MASTERED);
        if (storedMastered) {
            try {
                masteredCards = JSON.parse(storedMastered);
                if (typeof masteredCards !== 'object' || masteredCards === null) {
                    masteredCards = {};
                }
                 Object.keys(masteredCards).forEach(chapKey => {
                     if (!Array.isArray(masteredCards[chapKey])) {
                         masteredCards[chapKey] = [];
                     }
                 });
            } catch (e) {
                console.error("Erreur parsing mastered localStorage:", e);
                masteredCards = {};
            }
        } else {
            masteredCards = {};
        }
    }

    function saveMasteredCards() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_MASTERED, JSON.stringify(masteredCards));
        } catch (e) {
            console.error("Erreur sauvegarde mastered localStorage:", e);
        }
        updateResetAllButtonState(); // Mettre à jour l'état après sauvegarde
    }

    function addMasteredCard(chapter, cardId) {
         const chapKey = `chapitre_${chapter}`;
         if (!masteredCards[chapKey]) {
             masteredCards[chapKey] = [];
         }
         if (!masteredCards[chapKey].includes(cardId)) {
             masteredCards[chapKey].push(cardId);
             saveMasteredCards();
         }
     }

    function isCardMastered(chapter, cardId) {
        const chapKey = `chapitre_${chapter}`;
        return masteredCards[chapKey] && masteredCards[chapKey].includes(cardId);
    }

    function loadFavorites() {
        const storedFavorites = localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITES);
        if (storedFavorites) {
            try {
                favoriteCards = JSON.parse(storedFavorites);
                if (!Array.isArray(favoriteCards)) {
                    favoriteCards = [];
                }
            } catch (e) {
                console.error("Erreur parsing favorites localStorage:", e);
                favoriteCards = [];
            }
        } else {
            favoriteCards = [];
        }
         updateFavoriteButtonState();
    }

    function saveFavorites() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITES, JSON.stringify(favoriteCards));
        } catch (e) {
            console.error("Erreur sauvegarde favorites localStorage:", e);
        }
        updateFavoriteButtonState();
    }

    function toggleFavorite(cardId) {
        if (!cardId) return;
        const index = favoriteCards.indexOf(cardId);
        if (index > -1) {
            favoriteCards.splice(index, 1);
        } else {
            favoriteCards.push(cardId);
        }
        saveFavorites();
        updateToggleFavoriteButtonVisual();
    }

    function isFavorite(cardId) {
        return favoriteCards.includes(cardId);
    }

    function updateFavoriteButtonState() {
        const count = favoriteCards.length;
        if (favoriteCountSpan) {
            favoriteCountSpan.textContent = count;
        }
        if (startFavoritesBtn) {
            startFavoritesBtn.disabled = count === 0;
        }
    }
    // NOUVEAU: Mettre à jour état bouton Reset All
    function updateResetAllButtonState() {
         if(resetAllProgressBtn) {
            // Désactiver si masteredCards est vide
             resetAllProgressBtn.disabled = Object.keys(masteredCards).length === 0 && favoriteCards.length === 0;
         }
    }
    // NOUVEAU: Mettre à jour état bouton Reset Current
     function updateResetCurrentButtonState() {
         if(resetCurrentProgressBtn) {
             const chapKey = `chapitre_${currentSelectedChapter}`;
             const hasMasteredInCurrent = currentSelectedChapter !== 'favorites' && masteredCards[chapKey] && masteredCards[chapKey].length > 0;
             // Désactiver si pas de chapitre sélectionné, si c'est favoris, ou si rien n'est maîtrisé pour ce chapitre
             resetCurrentProgressBtn.disabled = currentSelectedChapter === null || currentSelectedChapter === 'favorites' || !hasMasteredInCurrent;
         }
     }


     function resetMasteredCards(chapterOrMode = null) {
         if (chapterOrMode === null || chapterOrMode === 'all') {
             masteredCards = {};
             console.log("Progression de toutes les cartes réinitialisée.");
         } else if (isValidChapter(chapterOrMode)) { // Chapitre spécifique
             const chapKey = `chapitre_${chapterOrMode}`;
             if (masteredCards[chapKey]) {
                 delete masteredCards[chapKey];
                 console.log(`Progression pour le chapitre ${chapterOrMode} réinitialisée.`);
             }
         }
         // Ne rien faire pour 'favorites' car la progression n'est pas sauvée pour ce mode
         saveMasteredCards();
         updateResetAllButtonState(); // Mettre à jour l'état du bouton global
     }

      // NOUVEAU: Reset Favoris
     function resetFavorites() {
         if(confirm("Êtes-vous sûr de vouloir supprimer toutes les cartes favorites ?")) {
             favoriteCards = [];
             saveFavorites();
             updateToggleFavoriteButtonVisual(); // Mettre à jour si une carte est affichée
             alert("Favoris réinitialisés.");
         }
     }

    function isValidChapter(chapter) {
         return chapter !== undefined && chapter !== null && !isNaN(Number(chapter));
    }

    function displayChapterSelection(sortedChapters) {
        chapterButtonsContainer.innerHTML = '';
        startAllChaptersBtn.disabled = true;

        if (allFlashcardsData.length === 0) {
             chapterButtonsContainer.innerHTML = '<p>Aucune carte à afficher.</p>';
         }
         else if (sortedChapters.length === 0) {
             chapterButtonsContainer.innerHTML = '<p>Aucune carte avec numéro de chapitre valide. Choisir "TOUS".</p>';
             startAllChaptersBtn.disabled = false;
         } else {
            sortedChapters.forEach(chapterNum => {
                const button = document.createElement('button');
                button.textContent = `Chapitre ${chapterNum}`;
                button.classList.add('chapter-button');
                button.dataset.chapter = chapterNum;
                button.addEventListener('click', () => startFlashcards(chapterNum));
                chapterButtonsContainer.appendChild(button);
            });
            startAllChaptersBtn.disabled = false;
        }
        updateFavoriteButtonState();
        updateResetAllButtonState();

        flashcardSection.style.display = 'none';
        flashcardSection.classList.remove('fade-in', 'fade-out');
        backToChaptersBtn.style.display = 'none';
        sessionCompleteMessage.style.display = 'none';
        progressBarContainer.style.display = 'none';
        questionReminderContainer.style.display = 'none';
        updateProgress();
        disableAllControls();
    }

    function startFlashcards(selectedChapterOrMode) {
        currentSelectedChapter = selectedChapterOrMode;
        let baseFilteredData;

        if (selectedChapterOrMode === 'all') {
             baseFilteredData = allFlashcardsData.filter(card => isValidChapter(card.chapitre));
             initialFilteredCards = baseFilteredData.filter(card => !isCardMastered(card.chapitre, card.uniqueId));
        } else if (selectedChapterOrMode === 'favorites') {
            if (favoriteCards.length === 0) {
                alert("Vous n'avez aucune carte en favoris !");
                return;
            }
            baseFilteredData = allFlashcardsData.filter(card => favoriteCards.includes(card.uniqueId));
            baseFilteredData = baseFilteredData.filter(favCard => allFlashcardsData.some(allCard => allCard.uniqueId === favCard.uniqueId));
             initialFilteredCards = [...baseFilteredData]; // Pas de filtre de maîtrise pour favoris

        } else {
            baseFilteredData = allFlashcardsData.filter(card => card.chapitre === Number(selectedChapterOrMode));
             initialFilteredCards = baseFilteredData.filter(card => !isCardMastered(card.chapitre, card.uniqueId) );
        }

        if (!baseFilteredData || baseFilteredData.length === 0) {
             alert(`Aucune carte valide trouvée pour ${ selectedChapterOrMode === 'all' ? 'tous les chapitres' : selectedChapterOrMode === 'favorites' ? 'les favoris' : 'le chapitre ' + selectedChapterOrMode}.`);
             return;
        }

        if (selectedChapterOrMode !== 'favorites' && initialFilteredCards.length === 0) {
            alert(`Félicitations ! Toutes les cartes pour ${selectedChapterOrMode === 'all' ? 'tous les chapitres' : 'le chapitre ' + selectedChapterOrMode} sont déjà maîtrisées.`);
             displaySessionComplete(true);
             fadeOutElement(chapterSelectionContainer, () => {
                 backToChaptersBtn.style.display = 'inline-flex';
                 fadeInElement(flashcardSection, 'flex');
                 progressBarContainer.style.display = 'block';
                 sessionCompleteMessage.style.display = 'block';
                 questionReminderContainer.style.display = 'none';
                 updateResetCurrentButtonState(); // Mettre à jour état reset chapitre
             });
             return;
        }

        currentSessionDeck = [...initialFilteredCards];

        currentIndex = 0;
        sessionStartTime = new Date();
        sessionMatchedCount = 0;
        sessionPassedCount = 0;

        fadeOutElement(chapterSelectionContainer, () => {
            shuffleCurrentDeck();
            backToChaptersBtn.style.display = 'inline-flex';
            fadeInElement(flashcardSection, 'flex');
            progressBarContainer.style.display = 'block';
            sessionCompleteMessage.style.display = 'none';
            questionReminderContainer.style.display = 'none';
            updateResetCurrentButtonState(); // Mettre à jour état reset chapitre
        });
    }

     async function showCard(index) {
        if (!currentSessionDeck || currentSessionDeck.length === 0) {
            displaySessionComplete();
            return;
        }
        if (index < 0 || index >= currentSessionDeck.length) {
             currentIndex = 0;
             index = 0;
             if (currentSessionDeck.length === 0) {
                 displaySessionComplete();
                 return;
             }
        }

        sessionCompleteMessage.style.display = 'none';
        enableFlashcardControls();

        const currentCard = currentSessionDeck[index];

        questionText.textContent = currentCard.question || "[Question manquante]";
        answerText.textContent = currentCard.reponse || "[Réponse manquante]";
        answerDiagramContainer.innerHTML = '';
        answerDiagramContainer.className = 'diagram-container';

        questionReminderText.textContent = currentCard.question || "";
        questionReminderContainer.style.display = 'none';

        if (answerChapterInfo && isValidChapter(currentCard.chapitre)) {
            answerChapterInfo.textContent = `(Chap. ${currentCard.chapitre})`;
        } else if (answerChapterInfo) {
            answerChapterInfo.textContent = '';
        }

        updateToggleFavoriteButtonVisual();

        if (currentCard.diagram_mermaid && typeof currentCard.diagram_mermaid === 'string' && currentCard.diagram_mermaid.trim() !== '') {
             renderMermaid(currentCard.diagram_mermaid.trim(), index);
        } else if (currentCard.diagram_image && typeof currentCard.diagram_image === 'string' && currentCard.diagram_image.trim() !== '') {
            renderImage(currentCard.diagram_image.trim(), index);
        } else if (currentCard.diagram_text && typeof currentCard.diagram_text === 'string' && currentCard.diagram_text.trim() !== '') {
            renderTextDiagram(currentCard.diagram_text);
        }

        if(flashcard.classList.contains('is-flipped')){
            flashcard.classList.remove('is-flipped');
        }
        matchPassControls.style.display = 'none';
        flipBtn.style.display = 'inline-flex';

        updateProgress();
        updateButtonStates();
        updateResetCurrentButtonState(); // Mettre à jour état reset chapitre
    }

    async function renderMermaid(mermaidCode, cardIndex) {
         try {
            const mermaidId = `mermaid-graph-${Date.now()}-${cardIndex}`;
            const { svg } = await mermaid.render(mermaidId, mermaidCode);
            const diagramElement = document.createElement('div');
            diagramElement.classList.add('mermaid');
            diagramElement.innerHTML = svg;
             answerDiagramContainer.innerHTML = '';
            answerDiagramContainer.appendChild(diagramElement);
        } catch (error) {
            console.error(`Erreur Mermaid carte index ${cardIndex} (deck actuel):`, error);
            answerDiagramContainer.innerHTML = `<div class="mermaid-error-container">Erreur rendu Mermaid.<br><pre>${escapeHtml(mermaidCode)}</pre></div>`;
        }
    }
    function renderImage(imageUrl, cardIndex) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Schéma question index ${cardIndex} (deck actuel)`;
        img.onerror = () => answerDiagramContainer.innerHTML = `<p class="error-message">(Erreur: Image introuvable: ${escapeHtml(imageUrl)})</p>`;
         answerDiagramContainer.innerHTML = '';
        answerDiagramContainer.appendChild(img);
    }
    function renderTextDiagram(textCode) {
        const pre = document.createElement('pre');
        pre.textContent = textCode;
         answerDiagramContainer.innerHTML = '';
        answerDiagramContainer.appendChild(pre);
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, '"')
             .replace(/'/g, "'");
    }


    function flipCard() {
        if (!currentSessionDeck || currentSessionDeck.length === 0 || !heartAnimationElement) return;

        const willBeFlipped = !flashcard.classList.contains('is-flipped');
        flashcard.classList.toggle('is-flipped');

        if (willBeFlipped) {
            flipBtn.style.display = 'none';
            matchPassControls.style.display = 'flex';
            fadeInElement(questionReminderContainer,'block');
            updateButtonStates();
            heartAnimationElement.classList.add('animate-heart');
            heartAnimationElement.addEventListener('animationend', () => {
                heartAnimationElement.classList.remove('animate-heart');
            }, { once: true });
        } else {
            matchPassControls.style.display = 'none';
            flipBtn.style.display = 'inline-flex';
            fadeOutElement(questionReminderContainer);
            updateButtonStates();
        }
    }

    function matchCard() {
         if (!currentSessionDeck || currentSessionDeck.length === 0) return;

        const matchedCard = currentSessionDeck[currentIndex];

        // NOUVEAU: Si la carte était favorite, on la retire des favoris
        if(isFavorite(matchedCard.uniqueId)) {
            toggleFavorite(matchedCard.uniqueId); // Ceci appelle saveFavorites et update boutons
        }

        // On sauvegarde comme maîtrisée seulement si on n'est PAS en mode favoris
        if (currentSelectedChapter !== 'favorites') {
            addMasteredCard(matchedCard.chapitre, matchedCard.uniqueId);
        }
        sessionMatchedCount++;

        currentSessionDeck.splice(currentIndex, 1);

        if (currentIndex >= currentSessionDeck.length) {
            currentIndex = Math.max(0, currentSessionDeck.length - 1);
        }
        fadeOutElement(questionReminderContainer, () => {
            showCard(currentIndex);
        });
    }

    function passCard() {
         if (!currentSessionDeck || currentSessionDeck.length <= 1) {
             sessionPassedCount++;
              fadeOutElement(questionReminderContainer, () => {
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
         fadeOutElement(questionReminderContainer, () => {
            showCard(currentIndex);
        });
    }

    function prevCard() {
        if (currentIndex > 0) {
            currentIndex--;
             fadeOutElement(questionReminderContainer, () => {
                 showCard(currentIndex);
             });
        }
    }

     function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function shuffleCurrentDeck() {
         if (currentSessionDeck && currentSessionDeck.length > 1) {
             currentSessionDeck = shuffleArray(currentSessionDeck);
             currentIndex = 0;
             fadeOutElement(questionReminderContainer, () => {
                 showCard(currentIndex);
             });
             console.log("Cartes restantes mélangées.");
         } else if (currentSessionDeck && currentSessionDeck.length > 0) {
            showCard(currentIndex);
         } else {
             displaySessionComplete();
         }
    }

    function updateProgress() {
        const totalInitialSession = initialFilteredCards ? initialFilteredCards.length : 0;
        const remaining = currentSessionDeck ? currentSessionDeck.length : 0;
        const matchedThisSession = totalInitialSession - remaining;
        let percentage = 0;

        if (totalInitialSession > 0) {
            percentage = (matchedThisSession / totalInitialSession) * 100;
            if (remaining > 0) {
                const currentVisibleCardNumber = matchedThisSession + 1;
                progressIndicator.textContent = `Carte ${currentVisibleCardNumber} / ${totalInitialSession} (Restantes: ${remaining})`;
            } else {
                percentage = 100;
                progressIndicator.textContent = `Session terminée (${totalInitialSession} / ${totalInitialSession})`;
            }
        } else {
            const totalMasteredInitially = Object.values(masteredCards).reduce((acc, val) => acc + (Array.isArray(val) ? val.length : 0), 0);
            progressIndicator.textContent = `Session terminée (0 nouvelles cartes)`;
             percentage = 100;
        }

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        if (progressBarContainer) {
             progressBarContainer.style.display = (totalInitialSession > 0 || sessionCompleteMessage.style.display !== 'none') ? 'block' : 'none';
        }
    }

    function updateButtonStates() {
        const hasCards = currentSessionDeck && currentSessionDeck.length > 0;
        const isFlipped = flashcard.classList.contains('is-flipped');

        prevBtn.disabled = !hasCards || currentIndex === 0;
        flipBtn.disabled = !hasCards;
        shuffleBtn.disabled = !hasCards || currentSessionDeck.length < 2;

        matchBtn.disabled = !hasCards || !isFlipped;
        passBtn.disabled = !hasCards || !isFlipped;
        toggleFavoriteBtn.disabled = !hasCards; // NOUVEAU: Activer/désactiver favori
    }

    function disableAllControls() {
        prevBtn.disabled = true;
        flipBtn.disabled = true;
        shuffleBtn.disabled = true;
        matchBtn.disabled = true;
        passBtn.disabled = true;
        matchPassControls.style.display = 'none';
        flipBtn.style.display = 'inline-flex';
        toggleFavoriteBtn.disabled = true; // NOUVEAU
        if(resetCurrentProgressBtn) resetCurrentProgressBtn.disabled = true; // NOUVEAU
    }

    function enableFlashcardControls() {
         const hasCards = currentSessionDeck && currentSessionDeck.length > 0;
         flipBtn.disabled = !hasCards;
         shuffleBtn.disabled = !(hasCards && currentSessionDeck.length > 1);
         toggleFavoriteBtn.disabled = !hasCards; // NOUVEAU
         updateButtonStates(); // Gère Préc et Match/Pass
         updateResetCurrentButtonState(); // NOUVEAU
    }

    function displaySessionComplete(allMasteredInitially = false) {
        const sessionEndTime = new Date();
        let timeSpent = '';
        if (sessionStartTime) {
            const durationSeconds = Math.round((sessionEndTime - sessionStartTime) / 1000);
            const minutes = Math.floor(durationSeconds / 60);
            const seconds = durationSeconds % 60;
            timeSpent = ` en ${minutes} min ${seconds} sec`;
        }

        let completionTextHTML = ''; // Renommé pour clarté
        if(allMasteredInitially) {
             completionTextHTML = `Toutes les cartes de cette sélection sont déjà maîtrisées !`;
        } else {
             const totalSessionCards = initialFilteredCards.length;
             const successRate = totalSessionCards > 0 ? Math.round((sessionMatchedCount / totalSessionCards) * 100) : 0;
             completionTextHTML = `🎉 Session terminée ! 🎉<br><small>${sessionMatchedCount} sur ${totalSessionCards} cartes maîtrisées${timeSpent}.<br>Taux de réussite : ${successRate}%. ${sessionPassedCount} carte(s) passée(s).</small>`;
        }

         questionText.textContent = "";
         answerText.textContent = "";
         answerDiagramContainer.innerHTML = "";
         answerChapterInfo.textContent = '';
         if (flashcard.classList.contains('is-flipped')) { flashcard.classList.remove('is-flipped'); }
         flashcardContainer.style.display = 'none';
         document.querySelector('.controls').style.display = 'none';
          document.querySelector('.utility-controls-container').style.display = 'none'; // Cacher aussi shuffle/reset chapitre
         questionReminderContainer.style.display = 'none';
         progressBarContainer.style.display = 'block';
         updateProgress(); // Met à jour le texte final (ex: 10/10)

         disableAllControls();
         const messageTextElement = document.getElementById('session-complete-text');
         if (messageTextElement) {
             messageTextElement.innerHTML = completionTextHTML; // Mettre à jour le texte
         } else {
            // Fallback si l'élément P n'existe pas
             sessionCompleteMessage.innerHTML = completionTextHTML + '<button id="restart-session-btn" class="utility-button">Recommencer</button>';
         }

         fadeInElement(sessionCompleteMessage, 'block');
         const restartBtn = document.getElementById('restart-session-btn');
         if(restartBtn) {
            restartBtn.removeEventListener('click', restartCurrentSession);
            restartBtn.addEventListener('click', restartCurrentSession);
         }
    }


    function restartCurrentSession() {
         if(currentSelectedChapter !== null) {
             sessionCompleteMessage.style.display = 'none';
             flashcardContainer.style.display = 'block';
             document.querySelector('.controls').style.display = 'flex';
             document.querySelector('.utility-controls-container').style.display = 'flex'; // Réafficher
             startFlashcards(currentSelectedChapter);
         } else {
             goBackToChapters();
         }
    }

     function goBackToChapters() {
        fadeOutElement(flashcardSection, () => {
            backToChaptersBtn.style.display = 'none';
            fadeInElement(chapterSelectionContainer);
            currentSelectedChapter = null;
            initialFilteredCards = [];
            currentSessionDeck = [];
            currentIndex = 0;
            if(flashcard.classList.contains('is-flipped')){ flashcard.classList.remove('is-flipped'); }
            questionText.textContent = "Chargement...";
            answerText.textContent = "";
            answerDiagramContainer.innerHTML = "";
            answerChapterInfo.textContent = '';
            sessionCompleteMessage.style.display = 'none';
            progressBarContainer.style.display = 'none';
            questionReminderContainer.style.display = 'none';
            updateProgress();
            disableAllControls();
            updateResetAllButtonState(); // Mettre à jour état reset all sur écran chapters
        });
    }

    function handleToggleFavorite() {
        if (!currentSessionDeck || currentSessionDeck.length === 0) return;
        const currentCard = currentSessionDeck[currentIndex];
        toggleFavorite(currentCard.uniqueId);
    }

    function updateToggleFavoriteButtonVisual() {
         if (!currentSessionDeck || currentSessionDeck.length === 0 || !toggleFavoriteBtn) return;
         const currentCard = currentSessionDeck[currentIndex];
         if (isFavorite(currentCard.uniqueId)) {
             toggleFavoriteBtn.classList.add('is-favorite');
             toggleFavoriteBtn.title = "Retirer des favoris (F)";
         } else {
             toggleFavoriteBtn.classList.remove('is-favorite');
             toggleFavoriteBtn.title = "Ajouter aux favoris (F)";
         }
    }

    // MODIFIÉ: Gérer Reset Chapitre pour retourner à la sélection
    function handleResetCurrentProgress() {
        if (currentSelectedChapter === null || currentSelectedChapter === 'favorites') {
            alert("Cette option n'est pas disponible pour le mode 'Favoris'.");
            return; // Ne rien faire en mode favoris ou si pas de sélection valide
        }

        const chapterToReset = currentSelectedChapter;
        const chapterLabel = chapterToReset === 'all' ? "tous les chapitres" : `le chapitre ${chapterToReset}`;

        if (confirm(`Êtes-vous sûr de vouloir oublier la progression pour ${chapterLabel} ? Vous retournerez à l'écran de sélection.`)) {
             resetMasteredCards(chapterToReset === 'all' ? null : Number(chapterToReset));
             // Au lieu de relancer la session, on retourne à l'écran de sélection
             goBackToChapters();
         }
    }
     // NOUVEAU: Gérer Reset Tout
     function handleResetAllProgress() {
         if (confirm("Êtes-vous sûr de vouloir oublier TOUTE la progression (cartes maîtrisées ET favoris) ?")) {
             if (confirm("VRAIMENT TOUT ? Cette action est irréversible.")) {
                 resetMasteredCards(null); // Reset toute la progression "maîtrisé"
                 resetFavorites(); // Reset aussi les favoris
                 alert("Toute la progression et les favoris ont été réinitialisés.");
                 updateResetAllButtonState(); // Mettre à jour le bouton sur l'écran de sélection
             }
         }
     }


    function handleKeyPress(event) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
           return;
        }

        const isFlashcardSectionVisible = flashcardSection.style.display !== 'none' && !flashcardSection.classList.contains('fade-out');
        const isFlipped = flashcard.classList.contains('is-flipped');
        const isSessionComplete = sessionCompleteMessage.style.display !== 'none';

        if (isFlashcardSectionVisible && !isSessionComplete && currentSessionDeck && currentSessionDeck.length > 0) {
            switch (event.key) {
                case 'ArrowLeft': if (!prevBtn.disabled) { event.preventDefault(); prevCard(); } break;
                case 'ArrowRight':
                    if (isFlipped && !matchBtn.disabled) { event.preventDefault(); matchCard(); }
                    break;
                case 'ArrowDown':
                     if (isFlipped && !passBtn.disabled) { event.preventDefault(); passCard(); }
                     break;
                case ' ': case 'ArrowUp': if (!flipBtn.disabled && !isFlipped) { event.preventDefault(); flipCard(); } break;
                case 'm': case 'M': if (!shuffleBtn.disabled) { event.preventDefault(); shuffleCurrentDeck(); } break;
                case 'f': case 'F': if(!toggleFavoriteBtn.disabled) {event.preventDefault(); handleToggleFavorite();} break;
                case 'Escape': if (backToChaptersBtn.style.display !== 'none') { event.preventDefault(); goBackToChapters(); } break;
            }
        } else if (chapterSelectionContainer.style.display !== 'none' && !chapterSelectionContainer.classList.contains('fade-out')) {
             if (event.key === 'Enter') {
                 if (document.activeElement && document.activeElement.classList.contains('chapter-button')) { document.activeElement.click(); }
                 else if (document.activeElement === startAllChaptersBtn && !startAllChaptersBtn.disabled) { startAllChaptersBtn.click(); }
                 else if (document.activeElement === startFavoritesBtn && !startFavoritesBtn.disabled) { startFavoritesBtn.click(); }
             }
        } else if (isSessionComplete) {
             if (event.key === 'Enter' || event.key === 'r' || event.key === 'R') {
                 restartCurrentSession();
             } else if (event.key === 'Escape') {
                 goBackToChapters();
             }
        }
    }

    startAllChaptersBtn.addEventListener('click', () => startFlashcards('all'));
    startFavoritesBtn.addEventListener('click', () => startFlashcards('favorites'));
    prevBtn.addEventListener('click', prevCard);
    flipBtn.addEventListener('click', flipCard);
    passBtn.addEventListener('click', passCard);
    matchBtn.addEventListener('click', matchCard);
    toggleFavoriteBtn.addEventListener('click', handleToggleFavorite);
    flashcard.addEventListener('click', (e) => {
        if (e.target.closest('a, button, .favorite-toggle-btn')) return;
        if (!flashcard.classList.contains('is-flipped') && !flipBtn.disabled) {
             flipCard();
         }
    });
    shuffleBtn.addEventListener('click', shuffleCurrentDeck);
    resetCurrentProgressBtn.addEventListener('click', handleResetCurrentProgress); // NOUVEAU
    resetAllProgressBtn.addEventListener('click', handleResetAllProgress); // NOUVEAU
    backToChaptersBtn.addEventListener('click', goBackToChapters);
    document.addEventListener('keydown', handleKeyPress);

    loadAndPrepareData();
});