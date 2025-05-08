/* js/ui/chapterSelectUI.js */
import { fadeInElement, fadeOutElement } from '../utils/animation.js';
import { getAvailableSubjects, getSubjectDescription, getChapterDescription } from '../dataManager.js';

let subjectButtonClickHandler = null;
let chapterButtonClickHandler = null;
let allButtonClickHandler = null;
let favoritesButtonClickHandler = null;

export function setupSelectionListeners(handlers) {
    if (handlers.onSubjectClick) subjectButtonClickHandler = handlers.onSubjectClick;
    if (handlers.onChapterClick) chapterButtonClickHandler = handlers.onChapterClick;
    if (handlers.onAllClick) allButtonClickHandler = handlers.onAllClick;
    if (handlers.onFavoritesClick) favoritesButtonClickHandler = handlers.onFavoritesClick;

    const contentWrapper = document.querySelector('.content-wrapper');

    if (contentWrapper) {
        console.log('%c[chapterSelectUI.js] Attachement du listener délégué à contentWrapper', 'color: green;');
        contentWrapper.removeEventListener('click', handleContentWrapperClicks);
        contentWrapper.addEventListener('click', handleContentWrapperClicks);
    } else {
        console.error('%c[chapterSelectUI.js] ERREUR CRITIQUE: .content-wrapper NON TROUVÉ!', 'color: red; font-weight: bold;');
    }
}

function handleContentWrapperClicks(event) {
    console.log('%c[chapterSelectUI.js] handleContentWrapperClicks DÉCLENCHÉ!', 'color: purple;', event.target);

    const subjectWidget = event.target.closest('.subject-widget');
    if (subjectWidget && subjectButtonClickHandler) {
        console.log('%c[chapterSelectUI.js] Clic détecté sur .subject-widget', 'color: purple;');
        const subjectFile = subjectWidget.dataset.subjectFile;
        const subjectName = subjectWidget.dataset.subjectName;
        if (subjectFile && subjectName) {
            subjectButtonClickHandler(subjectFile, subjectName);
        } else {
             console.warn('%c[chapterSelectUI.js] subjectFile ou subjectName manquant sur le widget.', 'color: orange;');
        }
        return;
    }

    const chapterButton = event.target.closest('.chapter-button');
    const allChaptersButton = event.target.closest('#start-all-chapters-btn');
    const favoritesButton = event.target.closest('#start-favorites-btn');

    if (chapterButton && chapterButtonClickHandler) {
        console.log('%c[chapterSelectUI.js] Clic détecté sur .chapter-button', 'color: purple;');
        const chapterNum = chapterButton.dataset.chapter;
        if(chapterNum !== undefined && chapterNum !== null && !isNaN(Number(chapterNum))) {
            chapterButtonClickHandler(Number(chapterNum));
        }
        return;
    }

    if (allChaptersButton && allButtonClickHandler) {
        console.log('%c[chapterSelectUI.js] Clic détecté sur #start-all-chapters-btn', 'color: purple;');
        allButtonClickHandler();
        return;
    }

    if (favoritesButton && favoritesButtonClickHandler) {
        console.log('%c[chapterSelectUI.js] Clic détecté sur #start-favorites-btn', 'color: purple;');
        favoritesButtonClickHandler();
        return;
    }
}


export function displaySubjectSelection() {
    console.log('%c[chapterSelectUI.js] displaySubjectSelection APPELÉ', 'color: blue;');
    const subjects = getAvailableSubjects();
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

    const localChapterButtonsContainer = document.getElementById('chapter-buttons');
    const localSubjectDescriptionElement = document.getElementById('subject-description');
    const localStartAllChaptersBtn = document.getElementById('start-all-chapters-btn'); // On les récupère pour les activer/désactiver
    const localStartFavoritesBtn = document.getElementById('start-favorites-btn');

    // Simplifier la vérification : on a besoin AU MOINS du conteneur des boutons et de la description
    if (!localChapterButtonsContainer || !localSubjectDescriptionElement ) {
        console.error("%c[chapterSelectUI.js] ERREUR CRITIQUE: #chapter-buttons ou #subject-description manquant DANS displayChapterSelection.", 'color: red; font-weight: bold;');
        if(localChapterButtonsContainer) {
            localChapterButtonsContainer.innerHTML = '<p style="color: red; font-weight: bold;">Erreur critique: Impossible d\'afficher les chapitres (éléments DOM manquants).</p>';
        }
        return;
    }

   const subjectDesc = getSubjectDescription();
   localSubjectDescriptionElement.textContent = subjectDesc;
   localSubjectDescriptionElement.style.display = subjectDesc ? 'block' : 'none';

   localChapterButtonsContainer.innerHTML = '';
   // Désactiver les boutons START par défaut (on les trouvera plus tard si besoin)
   if (localStartAllChaptersBtn) localStartAllChaptersBtn.disabled = true;
   if (localStartFavoritesBtn) localStartFavoritesBtn.disabled = true;


   if (!chapters || chapters.length === 0) {
       console.log('%c[chapterSelectUI.js] Pas de chapitres ou liste vide.', 'color: blue;');
       if (favoriteCount > 0) {
           localChapterButtonsContainer.innerHTML = '<p>Aucun chapitre trouvé, mais vous avez des favoris.</p>';
           if (localStartFavoritesBtn) localStartFavoritesBtn.disabled = false; // Activer si trouvé
           updateFavoriteButtonState(favoriteCount);
       } else {
            localChapterButtonsContainer.innerHTML = '<p>Aucune carte ou chapitre trouvé pour cette matière.</p>';
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

       localChapterButtonsContainer.appendChild(chapterList);
       if (localStartAllChaptersBtn) localStartAllChaptersBtn.disabled = false; // Activer si trouvé
       updateFavoriteButtonState(favoriteCount);
   }
   console.log('%c[chapterSelectUI.js] displayChapterSelection - FIN', 'color: blue; font-weight: bold;');
}

export function updateFavoriteButtonState(count) {
    const span = document.getElementById('favorite-count');
    const btn = document.getElementById('start-favorites-btn');
    if (span) span.textContent = count;
    if (btn) btn.disabled = count === 0;
}

export function updateResetAllButtonState() {
    const resetAllBtnSidebar = document.getElementById('reset-all-progress-btn-sidebar');
    if (resetAllBtnSidebar) {
        const hasProgress = Object.keys(localStorage).some(k => k.startsWith('flashcardsMastered_') || k.startsWith('flashcardsFavorites_'));
        resetAllBtnSidebar.disabled = !hasProgress;
    }
}