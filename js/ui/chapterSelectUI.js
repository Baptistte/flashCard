// js/ui/chapterSelectUI.js
import { fadeInElement, fadeOutElement } from '../utils/animation.js';

const chapterSelectionContainer = document.getElementById('chapter-selection');
const chapterButtonsContainer = document.getElementById('chapter-buttons');
const startAllChaptersBtn = document.getElementById('start-all-chapters-btn');
const startFavoritesBtn = document.getElementById('start-favorites-btn');
const favoriteCountSpan = document.getElementById('favorite-count');
const resetAllProgressBtn = document.getElementById('reset-all-progress-btn');

let chapterButtonClickHandler = null;
let allButtonClickHandler = null;
let favoritesButtonClickHandler = null;
let resetAllButtonClickHandler = null;


export function setupChapterSelection(
        onChapterClick,
        onAllClick,
        onFavoritesClick,
        onResetAllClick
    ) {
    chapterButtonClickHandler = onChapterClick;
    allButtonClickHandler = onAllClick;
    favoritesButtonClickHandler = onFavoritesClick;
    resetAllButtonClickHandler = onResetAllClick;

    // Attacher les listeners aux boutons fixes une seule fois
    startAllChaptersBtn.addEventListener('click', () => {
         if (allButtonClickHandler) allButtonClickHandler();
     });
     startFavoritesBtn.addEventListener('click', () => {
         if (favoritesButtonClickHandler) favoritesButtonClickHandler();
     });
     resetAllProgressBtn.addEventListener('click', () => {
        if(resetAllButtonClickHandler) resetAllButtonClickHandler();
     });

     // Utiliser la délégation d'événements pour les boutons de chapitre
     chapterButtonsContainer.addEventListener('click', (event) => {
         const button = event.target.closest('.chapter-button');
         if (button && chapterButtonClickHandler) {
             const chapterNum = button.dataset.chapter;
             chapterButtonClickHandler(Number(chapterNum)); // Envoyer le numéro
         }
     });
}


export function displayChapterSelection(chapters, favoriteCount) {
    chapterButtonsContainer.innerHTML = ''; // Clear previous buttons/messages
    startAllChaptersBtn.disabled = true;
    startFavoritesBtn.disabled = true;

    if (!chapters || chapters.length === 0) {
        if (favoriteCount > 0) {
             chapterButtonsContainer.innerHTML = '<p>Aucun chapitre trouvé, mais vous avez des favoris.</p>';
             startFavoritesBtn.disabled = false;
             startAllChaptersBtn.disabled = true; // Pas de chapitres à lancer
        } else {
            chapterButtonsContainer.innerHTML = '<p>Aucune carte ou chapitre trouvé.</p>';
        }
    } else {
        chapters.forEach(chapterNum => {
            const button = document.createElement('button');
            button.textContent = `Chapitre ${chapterNum}`;
            button.classList.add('chapter-button');
            button.dataset.chapter = chapterNum;
            // Le listener est déjà sur le conteneur parent
            chapterButtonsContainer.appendChild(button);
        });
        startAllChaptersBtn.disabled = false; // Activer si des chapitres existent
        updateFavoriteButtonState(favoriteCount); // Mettre à jour le bouton favoris
    }
    updateResetAllButtonState(); // Mettre à jour basé sur les données chargées (fait dans dataManager)
}

export function updateFavoriteButtonState(count) {
    if (favoriteCountSpan) {
        favoriteCountSpan.textContent = count;
    }
    if (startFavoritesBtn) {
        startFavoritesBtn.disabled = count === 0;
    }
}

export function updateResetAllButtonState(isDisabled = undefined) {
     // Si isDisabled n'est pas fourni, on ne fait rien (géré par dataManager via app.js)
     if (resetAllProgressBtn && isDisabled !== undefined) {
         resetAllProgressBtn.disabled = isDisabled;
     }
     // Si on voulait le rendre plus autonome, il faudrait importer dataManager ici
     // et vérifier l'état de masteredCards et favoriteCards.
}

export function hideChapterSelection(callback) {
    fadeOutElement(chapterSelectionContainer, callback);
}

export function showChapterSelection() {
     fadeInElement(chapterSelectionContainer);
}