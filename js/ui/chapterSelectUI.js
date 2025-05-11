import { fadeInElement, fadeOutElement } from '../utils/animation.js';
import {
    getAvailableSubjects,
    getSubjectDescription,
    getChapterDescription,
    getMasteredCountForChapter,
    getTotalCardsInChapter
} from '../dataManager.js';

let subjectButtonClickHandler = null;
let chapterButtonClickHandler = null;
let allButtonClickHandler = null;
let favoritesButtonClickHandler = null;
let resetChapterButtonClickHandler = null; // NOUVEAU HANDLER

export function setupSelectionListeners(handlers) {
    if (handlers.onSubjectClick) subjectButtonClickHandler = handlers.onSubjectClick;
    if (handlers.onChapterClick) chapterButtonClickHandler = handlers.onChapterClick;
    if (handlers.onAllClick) allButtonClickHandler = handlers.onAllClick;
    if (handlers.onFavoritesClick) favoritesButtonClickHandler = handlers.onFavoritesClick;
    if (handlers.onResetChapter) resetChapterButtonClickHandler = handlers.onResetChapter; // NOUVEAU

    const contentWrapper = document.querySelector('.content-wrapper');

    if (contentWrapper) {
        contentWrapper.removeEventListener('click', handleContentWrapperClicks);
        contentWrapper.addEventListener('click', handleContentWrapperClicks);
    } else {
        console.error("[chapterSelectUI.js] ERREUR CRITIQUE: .content-wrapper NON TROUVÉ!");
    }
}

function handleContentWrapperClicks(event) {
    const subjectWidget = event.target.closest('.subject-widget');
    if (subjectWidget && subjectButtonClickHandler) {
        const subjectFile = subjectWidget.dataset.subjectFile;
        const subjectName = subjectWidget.dataset.subjectName;
        if (subjectFile && subjectName) {
            subjectButtonClickHandler(subjectFile, subjectName);
        }
        return;
    }

    const chapterButton = event.target.closest('.chapter-button:not(.reset-chapter-btn)'); // Exclure le bouton reset ici
    const allChaptersButton = event.target.closest('#start-all-chapters-btn');
    const favoritesButton = event.target.closest('#start-favorites-btn');
    const resetChapterButton = event.target.closest('.reset-chapter-btn'); // NOUVEAU

    if (resetChapterButton && resetChapterButtonClickHandler) { // Vérifier celui-ci en premier
        const chapterNum = resetChapterButton.dataset.chapter;
        if (chapterNum !== undefined && !isNaN(Number(chapterNum))) {
            resetChapterButtonClickHandler(Number(chapterNum));
        }
        return;
    }

    if (chapterButton && chapterButtonClickHandler) {
        const chapterNum = chapterButton.dataset.chapter;
        if(chapterNum !== undefined && chapterNum !== null && !isNaN(Number(chapterNum))) {
            chapterButtonClickHandler(Number(chapterNum));
        }
        return;
    }

    if (allChaptersButton && allButtonClickHandler) {
        allButtonClickHandler();
        return;
    }

    if (favoritesButton && favoritesButtonClickHandler) {
        favoritesButtonClickHandler();
        return;
    }
}

export function displaySubjectSelection() {
    const allSubjects = getAvailableSubjects();

    const majorSubjects = allSubjects.filter(subject => subject.type === 'majeur');
    const minorSubjects = allSubjects.filter(subject => subject.type === 'mineur' || !subject.type);

    populateSubjectGroup(majorSubjects, 'subject-buttons-majeur', 'Aucune matière majeure configurée.');
    populateSubjectGroup(minorSubjects, 'subject-buttons-mineur', 'Aucune matière mineure configurée.');

    const majorSectionTitle = document.querySelector('#subject-selection h3.subject-group-title:first-of-type');
    const minorSectionTitle = document.querySelector('#subject-selection h3.subject-group-title:last-of-type');

    if (majorSectionTitle) majorSectionTitle.style.display = majorSubjects.length > 0 ? 'flex' : 'none';
    if (minorSectionTitle) minorSectionTitle.style.display = minorSubjects.length > 0 ? 'flex' : 'none';

    if (majorSubjects.length === 0 && minorSubjects.length === 0 && allSubjects.length > 0) {
        const mainContainer = document.getElementById('subject-buttons-majeur') || document.getElementById('subject-buttons-mineur');
        if (mainContainer) {
            mainContainer.innerHTML = '<p>Aucune matière configurée avec un type valide (majeur/mineur) ou toutes les matières sont affichées.</p>';
        }
    } else if (allSubjects.length === 0) {
        const majorContainer = document.getElementById('subject-buttons-majeur');
        if (majorContainer && majorContainer.innerHTML.trim() === '') {
             majorContainer.innerHTML = '<p>Aucune matière disponible.</p>';
        }
    }
}

function populateSubjectGroup(subjects, containerId, defaultMessage) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    container.innerHTML = '';

    if (!subjects || subjects.length === 0) {
        container.innerHTML = `<p>${defaultMessage}</p>`;
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
            container.appendChild(widget);
        });
    }
}

export function displayChapterSelection(chapters, favoriteCount, subjectName) {
    const localChapterButtonsContainer = document.getElementById('chapter-buttons');
    const localSubjectDescriptionElement = document.getElementById('subject-description');
    const localStartAllChaptersBtn = document.getElementById('start-all-chapters-btn');
    const localStartFavoritesBtn = document.getElementById('start-favorites-btn');

    if (!localChapterButtonsContainer || !localSubjectDescriptionElement ) {
        if(localChapterButtonsContainer) {
            localChapterButtonsContainer.innerHTML = '<p style="color: red; font-weight: bold;">Erreur critique: Impossible d\'afficher les chapitres.</p>';
        }
        return;
    }

   const subjectDesc = getSubjectDescription();
   localSubjectDescriptionElement.textContent = subjectDesc;
   localSubjectDescriptionElement.style.display = subjectDesc ? 'block' : 'none';

   localChapterButtonsContainer.innerHTML = '';
   if (localStartAllChaptersBtn) localStartAllChaptersBtn.disabled = true;
   if (localStartFavoritesBtn) localStartFavoritesBtn.disabled = true;

   if (!chapters || chapters.length === 0) {
       if (favoriteCount > 0) {
           localChapterButtonsContainer.innerHTML = '<p>Aucun chapitre trouvé, mais vous avez des favoris.</p>';
           if (localStartFavoritesBtn) localStartFavoritesBtn.disabled = false;
           updateFavoriteButtonState(favoriteCount);
       } else {
            localChapterButtonsContainer.innerHTML = '<p>Aucune carte ou chapitre trouvé pour cette matière.</p>';
       }
   } else {
       const chapterList = document.createElement('ul');
       chapterList.classList.add('chapter-description-list');

       chapters.forEach(chapterNum => {
           const listItem = document.createElement('li');
           listItem.classList.add('chapter-list-item');

           const buttonContentWrapper = document.createElement('div');
           buttonContentWrapper.classList.add('chapter-button-wrapper');

           const button = document.createElement('button');
           button.classList.add('chapter-button', 'styled-button', 'progress-button');
           button.dataset.chapter = chapterNum;

           const buttonText = document.createElement('span');
           buttonText.classList.add('progress-button-text');
           buttonText.textContent = `Chapitre ${chapterNum}`;
           button.appendChild(buttonText);

           const totalCards = getTotalCardsInChapter(chapterNum);
           const masteredCount = getMasteredCountForChapter(chapterNum);
           const progressPercentage = totalCards > 0 ? (masteredCount / totalCards) * 100 : 0;

           const buttonProgressBar = document.createElement('div');
           buttonProgressBar.classList.add('progress-button-bar');
           buttonProgressBar.style.width = `${progressPercentage}%`;

           button.appendChild(buttonProgressBar);
           buttonContentWrapper.appendChild(button);

           const progressInfoContainer = document.createElement('div'); // Conteneur pour texte de progression ET bouton reset
           progressInfoContainer.classList.add('chapter-progress-info');

           const progressText = document.createElement('span');
           progressText.classList.add('chapter-progress-text');
           progressText.textContent = totalCards > 0 ? `${masteredCount} / ${totalCards}` : `(0 cartes)`;

           progressInfoContainer.appendChild(progressText);

           if (totalCards > 0 && masteredCount === totalCards) {
                button.classList.add('completed');
                progressText.textContent += " 🎉";
                const resetButton = document.createElement('button');
                resetButton.classList.add('reset-chapter-btn');
                resetButton.dataset.chapter = chapterNum;
                resetButton.title = "Recommencer ce chapitre";
                resetButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14px" height="14px"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;
                progressInfoContainer.appendChild(resetButton);
           }
           buttonContentWrapper.appendChild(progressInfoContainer);

           const chapDescText = getChapterDescription(chapterNum);
           const descP = document.createElement('p');
           descP.classList.add('chapter-description-text');
           descP.textContent = chapDescText || "Aucune description disponible.";

           listItem.appendChild(buttonContentWrapper);
           listItem.appendChild(descP);
           chapterList.appendChild(listItem);
       });

       localChapterButtonsContainer.appendChild(chapterList);
       if (localStartAllChaptersBtn) localStartAllChaptersBtn.disabled = false;
       updateFavoriteButtonState(favoriteCount);
   }
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