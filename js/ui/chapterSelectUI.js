// js/ui/chapterSelectUI.js
import { fadeInElement, fadeOutElement } from '../utils/animation.js';
import { getAvailableSubjects, getSubjectDescription, getChapterDescription } from '../dataManager.js';

const subjectSelectionContainer = document.getElementById('subject-selection');
const chapterSelectionContainer = document.getElementById('chapter-selection');
const subjectButtonsContainer = document.getElementById('subject-buttons');
const chapterButtonsContainer = document.getElementById('chapter-buttons');
const startAllChaptersBtn = document.getElementById('start-all-chapters-btn');
const startFavoritesBtn = document.getElementById('start-favorites-btn');
const favoriteCountSpan = document.getElementById('favorite-count');
const resetAllProgressBtn = document.getElementById('reset-all-progress-btn');
const chapterSelectionTitle = document.getElementById('chapter-selection-title');
const subjectDescriptionElement = document.getElementById('subject-description');
const appTitle = document.getElementById('app-title');

let subjectButtonClickHandler = null;
let chapterButtonClickHandler = null;
let allButtonClickHandler = null;
let favoritesButtonClickHandler = null;
let resetAllButtonClickHandler = null;

export function setupSelectionListeners(handlers) {
    if (handlers.onSubjectClick) subjectButtonClickHandler = handlers.onSubjectClick;
    if (handlers.onChapterClick) chapterButtonClickHandler = handlers.onChapterClick;
    if (handlers.onAllClick) allButtonClickHandler = handlers.onAllClick;
    if (handlers.onFavoritesClick) favoritesButtonClickHandler = handlers.onFavoritesClick;
    if (handlers.onResetAllClick) resetAllButtonClickHandler = handlers.onResetAllClick;

    if (subjectSelectionContainer) {
        subjectSelectionContainer.removeEventListener('click', handleSubjectScreenClicks);
        subjectSelectionContainer.addEventListener('click', handleSubjectScreenClicks);
    }
    if (chapterSelectionContainer) {
        chapterSelectionContainer.removeEventListener('click', handleChapterScreenClicks);
        chapterSelectionContainer.addEventListener('click', handleChapterScreenClicks);
    }
}

function handleSubjectScreenClicks(event) {
    // *** MODIFIÉ: Cherche maintenant un élément avec la classe .subject-widget ***
    const subjectWidget = event.target.closest('.subject-widget');
    const resetAllButton = event.target.closest('#reset-all-progress-btn');

    if (subjectWidget && subjectButtonClickHandler) { // Vérifie si on a cliqué sur un widget
        // Récupérer les données depuis le widget cliqué
        const subjectFile = subjectWidget.dataset.subjectFile;
        const subjectName = subjectWidget.dataset.subjectName;
        if (subjectFile && subjectName) {
            subjectButtonClickHandler(subjectFile, subjectName); // Appeler le handler avec les bonnes données
        }
    } else if (resetAllButton && resetAllButtonClickHandler) {
        resetAllButtonClickHandler();
    }
}
function handleChapterScreenClicks(event) {
    const chapterButton = event.target.closest('.chapter-button');
    const allChaptersButton = event.target.closest('#start-all-chapters-btn');
    const favoritesButton = event.target.closest('#start-favorites-btn');

    if (chapterButton && chapterButtonClickHandler) {
        const chapterNum = chapterButton.dataset.chapter;
        if(chapterNum !== undefined && chapterNum !== null && !isNaN(Number(chapterNum))) {
            chapterButtonClickHandler(Number(chapterNum));
        }
    } else if (allChaptersButton && allButtonClickHandler) {
        allButtonClickHandler();
    } else if (favoritesButton && favoritesButtonClickHandler) {
        favoritesButtonClickHandler();
    }
}

export function displaySubjectSelection() {
    const subjects = getAvailableSubjects();
    if (!subjectButtonsContainer) return;

    subjectButtonsContainer.innerHTML = '';
    if(startAllChaptersBtn) startAllChaptersBtn.disabled = true; // Ces boutons sont sur l'écran chapitre
    if(startFavoritesBtn) startFavoritesBtn.disabled = true;

    if (!subjects || subjects.length === 0) {
        subjectButtonsContainer.innerHTML = '<p>Aucune matière configurée dans subjectsConfig.json</p>';
        if(resetAllProgressBtn) updateResetAllButtonState(true);
    } else {
        subjects.forEach(subject => {
            // Créer le widget conteneur (div ou button)
            const widget = document.createElement('div'); // Utiliser un div comme conteneur cliquable
            widget.classList.add('subject-widget'); // Nouvelle classe pour le style
            widget.dataset.subjectFile = subject.file;
            widget.dataset.subjectName = subject.name;
            widget.title = `Commencer la matière : ${subject.name}`; // Infobulle sur tout le widget

            // Créer le titre du widget
            const title = document.createElement('h3');
            // Option: Ajouter une icône avant le nom
            // title.innerHTML = `<span class="subject-icon">📘</span> ${subject.name}`;
            title.textContent = subject.name;

            // Créer la description du widget
            const description = document.createElement('p');
            description.textContent = subject.description || "Pas de description disponible.";

            // Ajouter titre et description au widget
            widget.appendChild(title);
            widget.appendChild(description);

            // Ajouter le widget à la grille
            subjectButtonsContainer.appendChild(widget);
        });
        // L'état du bouton resetAll est géré par app.js après chargement
    }
}

export function displayChapterSelection(chapters, favoriteCount, subjectName) {
    // Vérifier toutes les références nécessaires
    if (!chapterButtonsContainer || !chapterSelectionTitle || !appTitle || !startAllChaptersBtn || !startFavoritesBtn || !subjectDescriptionElement ) return;

   // --- Affichage Description Matière (inchangé) ---
   const subjectDesc = getSubjectDescription();
   subjectDescriptionElement.textContent = subjectDesc;
   subjectDescriptionElement.style.display = subjectDesc ? 'block' : 'none';

   // --- Mise à jour Titres (inchangé) ---
   chapterSelectionTitle.textContent = `Matière : ${subjectName || 'Inconnue'}`;
   appTitle.textContent = `Flashcards - ${subjectName || 'Sélection'}`;

   // --- Création de la liste des chapitres ---
   chapterButtonsContainer.innerHTML = ''; // Nettoyer la grille/liste précédente
   startAllChaptersBtn.disabled = true; // Désactiver par défaut
   startFavoritesBtn.disabled = true;

   if (!chapters || chapters.length === 0) {
       // Gérer le cas où il n'y a pas de chapitres (inchangé)
       if (favoriteCount > 0) {
           chapterButtonsContainer.innerHTML = '<p>Aucun chapitre trouvé, mais vous avez des favoris.</p>';
           startFavoritesBtn.disabled = false;
       } else {
            chapterButtonsContainer.innerHTML = '<p>Aucune carte ou chapitre trouvé pour cette matière.</p>';
       }
   } else {
       const chapterList = document.createElement('ul');
       chapterList.classList.add('chapter-description-list');

       chapters.forEach(chapterNum => {
           const listItem = document.createElement('li');

           const button = document.createElement('button');
           button.textContent = `Chapitre ${chapterNum}`;
           button.classList.add('chapter-button', 'styled-button');
           button.dataset.chapter = chapterNum;

           const chapDesc = getChapterDescription(chapterNum);
           const descP = document.createElement('p');
           descP.classList.add('chapter-description-text'); // Nouvelle classe pour styler
           descP.textContent = chapDesc || "Aucune description disponible."; // Message par défaut

           listItem.appendChild(button);
           listItem.appendChild(descP);

           chapterList.appendChild(listItem);
       });

       chapterButtonsContainer.appendChild(chapterList);

       // Réactiver les boutons globaux
       startAllChaptersBtn.disabled = false;
       updateFavoriteButtonState(favoriteCount);
   }
}

export function updateFavoriteButtonState(count) {
    if (favoriteCountSpan) favoriteCountSpan.textContent = count;
    if (startFavoritesBtn) startFavoritesBtn.disabled = count === 0;
}

export function updateResetAllButtonState(isDisabled) {
     if (resetAllProgressBtn) {
         resetAllProgressBtn.disabled = isDisabled;
     }
}

export function hideChapterSelection(callback) {
    if (chapterSelectionContainer) fadeOutElement(chapterSelectionContainer, callback);
    else if (callback) callback();
}

export function showChapterSelection(subjectName, chapters, favCount) {
    if (!chapterSelectionContainer || !subjectSelectionContainer) return;
    displayChapterSelection(chapters, favCount, subjectName);
    fadeOutElement(subjectSelectionContainer, () => {
        fadeInElement(chapterSelectionContainer);
    });
}

export function hideSubjectSelection(callback) {
     if (subjectSelectionContainer) fadeOutElement(subjectSelectionContainer, callback);
     else if (callback) callback();
}

export function showSubjectSelectionScreen() {
     if (!subjectSelectionContainer || !chapterSelectionContainer) return;
     const flashcardScreen = document.getElementById('flashcard-section');
     if (chapterSelectionContainer) chapterSelectionContainer.style.display = 'none';
     if (flashcardScreen) flashcardScreen.style.display = 'none';

     if (subjectButtonsContainer) subjectButtonsContainer.innerHTML = '<p>Chargement...</p>';
     displaySubjectSelection();
     fadeInElement(subjectSelectionContainer);
     if (appTitle) appTitle.textContent = "Flashcards";
}