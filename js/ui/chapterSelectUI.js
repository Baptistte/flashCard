// js/ui/chapterSelectUI.js
import { fadeInElement, fadeOutElement } from '../utils/animation.js';
import { getAvailableSubjects, getSubjectDescription, getChapterDescription } from '../dataManager.js';

// SONT-ILS BIEN TROUVES LORSQUE LE MODULE EST CHARGE INITIALEMENT ?
console.log('%c[chapterSelectUI.js] Initialisation du module - Vérification des constantes globales :', 'color: teal;');
const subjectButtonsContainer = document.getElementById('subject-buttons');
console.log('  -> subjectButtonsContainer:', subjectButtonsContainer);
const chapterButtonsContainer = document.getElementById('chapter-buttons'); // C'est LUI qui doit être rempli
console.log('  -> chapterButtonsContainer:', chapterButtonsContainer);
const startAllChaptersBtn = document.getElementById('start-all-chapters-btn');
console.log('  -> startAllChaptersBtn:', startAllChaptersBtn);
const startFavoritesBtn = document.getElementById('start-favorites-btn');
console.log('  -> startFavoritesBtn:', startFavoritesBtn);
const favoriteCountSpan = document.getElementById('favorite-count');
console.log('  -> favoriteCountSpan:', favoriteCountSpan);
const subjectDescriptionElement = document.getElementById('subject-description');
console.log('  -> subjectDescriptionElement:', subjectDescriptionElement);
console.log('%c[chapterSelectUI.js] Fin vérification constantes globales.', 'color: teal;');


let subjectButtonClickHandler = null;
let chapterButtonClickHandler = null;
let allButtonClickHandler = null;
let favoritesButtonClickHandler = null;


export function setupSelectionListeners(handlers) {
    if (handlers.onSubjectClick) subjectButtonClickHandler = handlers.onSubjectClick;
    if (handlers.onChapterClick) chapterButtonClickHandler = handlers.onChapterClick;
    if (handlers.onAllClick) allButtonClickHandler = handlers.onAllClick;
    if (handlers.onFavoritesClick) favoritesButtonClickHandler = handlers.onFavoritesClick;

    const subjectSelectionContainer = document.getElementById('subject-selection');
    const chapterSelectionContainerInternal = document.getElementById('chapter-selection');

    if (subjectSelectionContainer) {
        console.log('%c[chapterSelectUI.js] Attachement du listener à subjectSelectionContainer', 'color: green;');
        subjectSelectionContainer.removeEventListener('click', handleSubjectScreenClicks);
        subjectSelectionContainer.addEventListener('click', handleSubjectScreenClicks);
    } else {
        console.error('%c[chapterSelectUI.js] ERREUR: subjectSelectionContainer NON TROUVÉ lors de setupSelectionListeners!', 'color: red; font-weight: bold;');
    }
    if (chapterSelectionContainerInternal) {
        console.log('%c[chapterSelectUI.js] Attachement du listener à chapterSelectionContainerInternal', 'color: green;');
        chapterSelectionContainerInternal.removeEventListener('click', handleChapterScreenClicks);
        chapterSelectionContainerInternal.addEventListener('click', handleChapterScreenClicks);
    } else {
        console.error('%c[chapterSelectUI.js] ERREUR: chapterSelectionContainerInternal NON TROUVÉ lors de setupSelectionListeners!', 'color: red; font-weight: bold;');
    }
}

function handleSubjectScreenClicks(event) {
    console.log('%c[chapterSelectUI.js] handleSubjectScreenClicks DÉCLENCHÉ!', 'color: purple;', event.target);

    const subjectWidget = event.target.closest('.subject-widget');
    console.log('%c[chapterSelectUI.js] subjectWidget trouvé:', 'color: purple;', subjectWidget);

    if (subjectWidget && subjectButtonClickHandler) {
        console.log('%c[chapterSelectUI.js] subjectWidget et subjectButtonClickHandler existent. Appel du handler...', 'color: purple;');
        const subjectFile = subjectWidget.dataset.subjectFile;
        const subjectName = subjectWidget.dataset.subjectName;
        if (subjectFile && subjectName) {
            console.log(`%c[chapterSelectUI.js] Appel de subjectButtonClickHandler avec: ${subjectFile}, ${subjectName}`, 'color: purple;');
            subjectButtonClickHandler(subjectFile, subjectName);
        } else {
            console.warn('%c[chapterSelectUI.js] subjectFile ou subjectName manquant sur le widget.', 'color: orange;');
        }
    } else if (!subjectWidget) {
        console.log('%c[chapterSelectUI.js] Clic dans subjectSelectionContainer, mais PAS sur un .subject-widget.', 'color: orange;');
    } else if (!subjectButtonClickHandler) {
        console.error('%c[chapterSelectUI.js] ERREUR: subjectButtonClickHandler n\'est PAS DÉFINI.', 'color: red; font-weight: bold;');
    }
}

function handleChapterScreenClicks(event) {
    console.log('%c[chapterSelectUI.js] handleChapterScreenClicks DÉCLENCHÉ!', 'color: purple;', event.target);
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
    console.log('%c[chapterSelectUI.js] displaySubjectSelection APPELÉ', 'color: blue;');
    const subjects = getAvailableSubjects();
    // Ré-vérifier la constante ici aussi, au cas où.
    const localSubjectButtonsContainer = document.getElementById('subject-buttons');
    if (!localSubjectButtonsContainer) {
        console.error("displaySubjectSelection: localSubjectButtonsContainer non trouvé!");
        return;
    }

    localSubjectButtonsContainer.innerHTML = '';

    if (!subjects || subjects.length === 0) {
        localSubjectButtonsContainer.innerHTML = '<p>Aucune matière configurée.</p>';
    } else {
        subjects.forEach(subject => {
            const widget = document.createElement('div');
            widget.classList.add('subject-widget');
            widget.dataset.subjectFile = subject.file;
            widget.dataset.subjectName = subject.name;
            widget.title = `Commencer la matière : ${subject.name}`;

            const title = document.createElement('h3');
            title.textContent = subject.name;

            const description = document.createElement('p');
            description.textContent = subject.description || "Pas de description disponible.";

            widget.appendChild(title);
            widget.appendChild(description);
            localSubjectButtonsContainer.appendChild(widget);
        });
    }
}

export function displayChapterSelection(chapters, favoriteCount, subjectName) {
    console.log('%c[chapterSelectUI.js] displayChapterSelection - DÉBUT', 'color: blue; font-weight: bold;');
    console.log('  chapters:', chapters);
    console.log('  favoriteCount:', favoriteCount);
    console.log('  subjectName:', subjectName);

    // Utiliser les constantes globales qui devraient être initialisées lors du chargement du module
    console.log('  Vérification des constantes globales DANS displayChapterSelection:');
    console.log('    chapterButtonsContainer:', chapterButtonsContainer); // Utilise la constante globale
    console.log('    startAllChaptersBtn:', startAllChaptersBtn);
    console.log('    startFavoritesBtn:', startFavoritesBtn);
    console.log('    subjectDescriptionElement:', subjectDescriptionElement);
    console.log('    favoriteCountSpan:', favoriteCountSpan);


    if (!chapterButtonsContainer || !startAllChaptersBtn || !startFavoritesBtn || !subjectDescriptionElement || !favoriteCountSpan ) {
        console.error("%c[chapterSelectUI.js] ERREUR CRITIQUE: Une ou plusieurs constantes DOM globales sont nulles DANS displayChapterSelection.", 'color: red; font-weight: bold;');
        if(chapterButtonsContainer) { // Si au moins lui existe, on met un message d'erreur visible
            chapterButtonsContainer.innerHTML = '<p style="color: red; font-weight: bold;">Erreur critique: Impossible d\'afficher les chapitres (constantes DOM globales nulles).</p>';
        }
        return; // Arrêter l'exécution si les éléments essentiels sont manquants
    }

   const subjectDesc = getSubjectDescription();
   subjectDescriptionElement.textContent = subjectDesc; // Utilise la constante globale
   subjectDescriptionElement.style.display = subjectDesc ? 'block' : 'none';

   console.log('%c[chapterSelectUI.js] Contenu de chapterButtonsContainer AVANT nettoyage:', 'color: orange;', chapterButtonsContainer.innerHTML);
   chapterButtonsContainer.innerHTML = '';
   console.log('%c[chapterSelectUI.js] Contenu de chapterButtonsContainer APRÈS nettoyage:', 'color: orange;', chapterButtonsContainer.innerHTML);

   startAllChaptersBtn.disabled = true; // Utilise la constante globale
   startFavoritesBtn.disabled = true; // Utilise la constante globale

   if (!chapters || chapters.length === 0) {
       console.log('%c[chapterSelectUI.js] Pas de chapitres ou liste vide.', 'color: blue;');
       if (favoriteCount > 0) {
           chapterButtonsContainer.innerHTML = '<p>Aucun chapitre trouvé, mais vous avez des favoris.</p>';
           startFavoritesBtn.disabled = false;
       } else {
            chapterButtonsContainer.innerHTML = '<p>Aucune carte ou chapitre trouvé pour cette matière.</p>';
       }
   } else {
       console.log('%c[chapterSelectUI.js] Création de la liste des chapitres...', 'color: blue;');
       const chapterList = document.createElement('ul');
       chapterList.classList.add('chapter-description-list');

       chapters.forEach(chapterNum => {
           const listItem = document.createElement('li');

           const button = document.createElement('button');
           button.textContent = `Chapitre ${chapterNum}`;
           button.classList.add('chapter-button', 'styled-button');
           button.dataset.chapter = chapterNum;

           const chapDescText = getChapterDescription(chapterNum);
           const descP = document.createElement('p');
           descP.classList.add('chapter-description-text');
           descP.textContent = chapDescText || "Aucune description disponible.";

           listItem.appendChild(button);
           listItem.appendChild(descP);
           chapterList.appendChild(listItem);
       });

       chapterButtonsContainer.appendChild(chapterList);
       console.log('%c[chapterSelectUI.js] Contenu de chapterButtonsContainer APRÈS ajout liste:', 'color: green;', chapterButtonsContainer.innerHTML);
       startAllChaptersBtn.disabled = false;
       updateFavoriteButtonState(favoriteCount); // Appel simple, elle utilise ses propres globales ou vous pouvez les passer
   }
   console.log('%c[chapterSelectUI.js] displayChapterSelection - FIN', 'color: blue; font-weight: bold;');
}

export function updateFavoriteButtonState(count) { // cette fonction utilise les globales
    if (favoriteCountSpan) favoriteCountSpan.textContent = count;
    if (startFavoritesBtn) startFavoritesBtn.disabled = count === 0;
}


export function updateResetAllButtonState() {
    const resetAllBtnSidebar = document.getElementById('reset-all-progress-btn-sidebar');
    if (resetAllBtnSidebar) {
        const hasProgress = Object.keys(localStorage).some(k => k.startsWith('flashcardsMastered_') || k.startsWith('flashcardsFavorites_'));
        resetAllBtnSidebar.disabled = !hasProgress;
    }
}