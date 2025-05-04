// js/ui/progressUI.js

const progressIndicator = document.getElementById('progress');
const progressBarContainer = document.getElementById('progress-visual-container');
const progressBar = document.getElementById('progress-bar');

export function updateProgressDisplay(matchedCount, totalInitialSession, remaining) {
    let percentage = 0;
    let text = '';

    if (totalInitialSession > 0) {
        percentage = totalInitialSession > 0 ? (matchedCount / totalInitialSession) * 100 : 0; // Utiliser matchedCount
        if (remaining > 0) {
            const currentVisibleCardNumber = matchedCount + 1; // Basé sur les cartes maîtrisées
            text = `Carte ${currentVisibleCardNumber} / ${totalInitialSession} (Restantes: ${remaining})`;
        } else {
            percentage = 100; // Assurer 100%
            text = `Session terminée (${totalInitialSession} / ${totalInitialSession})`;
        }
    } else {
         // Si totalInitialSession est 0, cela signifie soit qu'il n'y avait pas de cartes au début,
         // soit que toutes les cartes étaient déjà maîtrisées (cas géré dans displaySessionComplete aussi)
        text = `Carte 0 / 0 (Restantes: 0)`;
         percentage = (matchedCount > 0) ? 100 : 0; // Si on arrive ici avec matchedCount > 0, c'est la fin
    }

    if (progressIndicator) {
        progressIndicator.textContent = text;
    }

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    // Gérer la visibilité de la barre
     if (progressBarContainer) {
         const sessionCompleteVisible = document.getElementById('session-complete-message')?.style.display !== 'none';
         progressBarContainer.style.display = (totalInitialSession > 0 || sessionCompleteVisible) ? 'block' : 'none';
     }
}

export function hideProgress() {
    if(progressIndicator) progressIndicator.textContent = '';
    if(progressBar) progressBar.style.width = '0%';
    if(progressBarContainer) progressBarContainer.style.display = 'none';
}