// js/ui/controlsUI.js

const prevBtn = document.getElementById('prev-btn');
const flipBtn = document.getElementById('flip-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const backToChaptersBtn = document.getElementById('back-to-chapters-btn');
const matchPassControls = document.getElementById('match-pass-controls');
const matchBtn = document.getElementById('match-btn');
const passBtn = document.getElementById('pass-btn');
const toggleFavoriteBtn = document.getElementById('toggle-favorite-btn');
const resetCurrentProgressBtn = document.getElementById('reset-current-progress-btn');

export function updateButtonStates(config) {
    if (!config) return;
    const { hasCards, isFirst, isLast, isFlipped, canShuffle, canReset } = config;

    if (prevBtn) prevBtn.disabled = !hasCards || isFirst;
    if (flipBtn) flipBtn.disabled = !hasCards;
    if (shuffleBtn) shuffleBtn.disabled = !hasCards || !canShuffle;
    if (toggleFavoriteBtn) toggleFavoriteBtn.disabled = !hasCards;

    if (matchBtn) matchBtn.disabled = !hasCards || !isFlipped;
    if (passBtn) passBtn.disabled = !hasCards || !isFlipped;

    if (resetCurrentProgressBtn) resetCurrentProgressBtn.disabled = !canReset;
}

export function showFlipButton() {
    if (matchPassControls) matchPassControls.style.display = 'none';
    if (flipBtn) flipBtn.style.display = 'inline-flex';
}

export function showMatchPassButtons() {
    if (flipBtn) flipBtn.style.display = 'none';
    if (matchPassControls) matchPassControls.style.display = 'flex';
}

export function disableAllCardControls() {
    if (prevBtn) prevBtn.disabled = true;
    if (flipBtn) flipBtn.disabled = true;
    if (shuffleBtn) shuffleBtn.disabled = true;
    if (matchBtn) matchBtn.disabled = true;
    if (passBtn) passBtn.disabled = true;
    if (toggleFavoriteBtn) toggleFavoriteBtn.disabled = true;
    if (resetCurrentProgressBtn) resetCurrentProgressBtn.disabled = true;
    if (matchPassControls) matchPassControls.style.display = 'none';
    if (flipBtn) flipBtn.style.display = 'inline-flex'; // Keep flip visible but disabled
}

export function enableAllCardControls(deckSize = 0) {
    // Réactive les boutons qui devraient l'être (l'état précis dépendra de l'index etc.)
    const hasCards = deckSize > 0;
     if (flipBtn) flipBtn.disabled = !hasCards;
     if (shuffleBtn) shuffleBtn.disabled = !(hasCards && deckSize > 1);
     if (toggleFavoriteBtn) toggleFavoriteBtn.disabled = !hasCards;
     // updateButtonStates sera appelé par showCard pour gérer Préc/Suivant/Match/Pass
}

export function setupControlsListeners(handlers) {
     if (prevBtn && handlers.onPrev) prevBtn.addEventListener('click', handlers.onPrev);
     if (flipBtn && handlers.onFlip) flipBtn.addEventListener('click', handlers.onFlip);
     if (passBtn && handlers.onPass) passBtn.addEventListener('click', handlers.onPass);
     if (matchBtn && handlers.onMatch) matchBtn.addEventListener('click', handlers.onMatch);
     if (shuffleBtn && handlers.onShuffle) shuffleBtn.addEventListener('click', handlers.onShuffle);
     if (toggleFavoriteBtn && handlers.onFavoriteToggle) toggleFavoriteBtn.addEventListener('click', handlers.onFavoriteToggle);
     if (resetCurrentProgressBtn && handlers.onResetCurrent) resetCurrentProgressBtn.addEventListener('click', handlers.onResetCurrent);
     if (backToChaptersBtn && handlers.onBack) backToChaptersBtn.addEventListener('click', handlers.onBack);

     // Pour le flip en cliquant sur la carte elle-même (géré dans app.js pour le moment)
     // const flashcard = document.querySelector('.flashcard');
     // if (flashcard && handlers.onFlip) {
     //     flashcard.addEventListener('click', (e) => {
     //        if (e.target.closest('a, button, .favorite-toggle-btn')) return;
     //        const flipBtnRef = document.getElementById('flip-btn'); // Vérifier si le bouton flip est actif
     //        if (!document.querySelector('.flashcard').classList.contains('is-flipped') && flipBtnRef && !flipBtnRef.disabled) {
     //             handlers.onFlip();
     //         }
     //    });
     // }

      // Pour le bouton Restart (attaché dynamiquement dans app.js)
     const sessionCompleteMessage = document.getElementById('session-complete-message');
     if (sessionCompleteMessage && handlers.onRestart) {
         sessionCompleteMessage.addEventListener('click', (event) => {
             if (event.target && event.target.id === 'restart-session-btn') {
                 handlers.onRestart();
             }
         });
     }
}