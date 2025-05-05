// js/ui/flashcardUI.js
import { renderMermaidDiagram } from '../utils/mermaidUtil.js';
import { escapeHtml } from '../utils/helpers.js';
import { fadeInElement, fadeOutElement } from '../utils/animation.js';
import { isFavorite } from '../dataManager.js'; // Importer pour l'état initial

const flashcard = document.querySelector('.flashcard');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const answerDiagramContainer = document.getElementById('answer-diagram');
const answerChapterInfo = document.getElementById('answer-chapter-info');
const questionReminderContainer = document.getElementById('question-reminder');
const questionReminderText = document.getElementById('question-reminder-text');
const heartAnimationElement = document.querySelector('.heart-animation');

export async function displayCardContent(cardData) {
    if (!cardData) {
        // Clear card content when session ends or no card
        questionText.textContent = "";
        answerText.textContent = "";
        answerDiagramContainer.innerHTML = "";
        if (answerChapterInfo) answerChapterInfo.textContent = "";
        if (questionReminderText) questionReminderText.textContent = "";
        hideQuestionReminder(); // Assurer caché
        if (toggleFavoriteBtn) toggleFavoriteBtn.classList.remove('is-favorite'); // Reset état fav visuel
        if (flashcard.classList.contains('is-flipped')) {
            flashcard.classList.remove('is-flipped'); // Assurer côté question
        }
        return;
    }

    questionText.textContent = cardData.question || "[Question manquante]";
    answerText.textContent = cardData.reponse || "[Réponse manquante]";
    answerDiagramContainer.innerHTML = ''; // Clear previous diagram
    answerDiagramContainer.className = 'diagram-container'; // Reset class

    if (answerChapterInfo && isValidChapter(cardData.chapitre)) {
        answerChapterInfo.textContent = `(Chap. ${cardData.chapitre})`;
    } else if (answerChapterInfo) {
        answerChapterInfo.textContent = '';
    }

    // Update favorite icon state based on dataManager
    updateFavoriteIcon(isFavorite(cardData.uniqueId));

    // Render diagram
    if (cardData.diagram_mermaid && typeof cardData.diagram_mermaid === 'string' && cardData.diagram_mermaid.trim() !== '') {
         await renderMermaidDiagram(cardData.diagram_mermaid.trim(), answerDiagramContainer, cardData.uniqueId);
    } else if (cardData.diagram_image && typeof cardData.diagram_image === 'string' && cardData.diagram_image.trim() !== '') {
        renderImage(cardData.diagram_image.trim(), answerDiagramContainer, cardData.uniqueId);
    } else if (cardData.diagram_text && typeof cardData.diagram_text === 'string' && cardData.diagram_text.trim() !== '') {
        renderTextDiagram(cardData.diagram_text, answerDiagramContainer);
    }

    // Ensure card is on question side and reminder is hidden initially
    if(flashcard.classList.contains('is-flipped')){
        flashcard.classList.remove('is-flipped');
    }
    hideQuestionReminder();
}

export function flipCardUI() {
    if (!flashcard) return false;
    const willBeFlipped = !flashcard.classList.contains('is-flipped');
    flashcard.classList.toggle('is-flipped');

     // Trigger heart animation only when flipping TO answer
     if (willBeFlipped && heartAnimationElement) {
        heartAnimationElement.classList.add('animate-heart');
        heartAnimationElement.addEventListener('animationend', () => {
            heartAnimationElement.classList.remove('animate-heart');
        }, { once: true });
    }
    return willBeFlipped; // Return new state
}

export function showQuestionReminder(text) {
    if (questionReminderText) questionReminderText.textContent = text || "";
    if (questionReminderContainer) fadeInElement(questionReminderContainer, 'block');
}

export function hideQuestionReminder(callback) {
    if (questionReminderContainer) fadeOutElement(questionReminderContainer, callback);
    else if (callback) callback(); // Execute callback immediately if element doesn't exist
}

export function updateFavoriteIcon(isFav) {
    // Cibler les deux boutons par leur ID spécifique
    const btnQ = document.getElementById('toggle-favorite-btn-question');
    const btnA = document.getElementById('toggle-favorite-btn-answer');
    const buttons = [btnQ, btnA];

    buttons.forEach(btn => {
         if (!btn) return; // Vérifier si le bouton existe
         if (isFav) {
             btn.classList.add('is-favorite');
             btn.title = "Retirer des favoris (F)";
         } else {
             btn.classList.remove('is-favorite');
             btn.title = "Ajouter aux favoris (F)";
         }
     });
}
// test
// --- Internal rendering helpers for flashcardUI ---
function renderImage(imageUrl, container, cardId) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Schéma carte ${cardId}`;
    img.onerror = () => container.innerHTML = `<p class="error-message">(Erreur: Image introuvable: ${escapeHtml(imageUrl)})</p>`;
    container.innerHTML = '';
    container.appendChild(img);
}

function renderTextDiagram(textCode, container) {
    const pre = document.createElement('pre');
    pre.textContent = textCode;
    container.innerHTML = '';
    container.appendChild(pre);
}

// Local helper needed by renderMermaidDiagram error message
function isValidChapter(chapter) {
     return chapter !== undefined && chapter !== null && !isNaN(Number(chapter));
}