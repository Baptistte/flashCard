// js/utils/mermaidUtil.js
import { escapeHtml } from './helpers.js';

let mermaidInitialized = false;

export function initializeMermaid() {
    if (!mermaidInitialized && typeof mermaid !== 'undefined') {
        try {
            mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
            mermaidInitialized = true;
            console.log("Mermaid initialized.");
        } catch (e) {
            console.error("Erreur initialisation Mermaid:", e);
        }
    } else if (typeof mermaid === 'undefined') {
         console.warn("Mermaid library not found.");
    }
}

export async function renderMermaidDiagram(mermaidCode, containerElement, cardIndex) {
     if (!mermaidInitialized || !containerElement || !mermaidCode) return;

     containerElement.innerHTML = ''; // Clear previous diagram/error

     try {
        const mermaidId = `mermaid-graph-${Date.now()}-${cardIndex}`;
        // Vérifier si l'élément existe déjà (nécessaire pour render)
        if(document.getElementById(mermaidId)) {
             console.warn(`Mermaid element with ID ${mermaidId} already exists.`);
             // Option: générer un nouvel ID ou vider le conteneur et réessayer
             // Pour l'instant, on vide juste et on continue
             containerElement.innerHTML = '';
        }
        const { svg } = await mermaid.render(mermaidId, mermaidCode);
        const diagramElement = document.createElement('div');
        diagramElement.classList.add('mermaid');
        diagramElement.innerHTML = svg;
        containerElement.appendChild(diagramElement);
    } catch (error) {
        console.error(`Erreur Mermaid render pour carte ${cardIndex}:`, error);
        containerElement.innerHTML = `<div class="mermaid-error-container">Erreur rendu Mermaid.<br><pre>${escapeHtml(mermaidCode)}</pre></div>`;
    }
}