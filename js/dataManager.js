// js/dataManager.js
import { isValidChapter } from './utils/helpers.js';

let allFlashcardsData = [];
let masteredCards = {}; // { chapKey: [cardId1, cardId2], ... }
let favoriteCards = []; // [cardId1, cardId2, ...]
let chapters = new Set();

const LOCAL_STORAGE_KEY_MASTERED = 'flashcardsMasteredCards';
const LOCAL_STORAGE_KEY_FAVORITES = 'flashcardsFavoriteCards';

// --- Chargement / Sauvegarde LocalStorage ---

function loadMasteredCards() {
    const storedMastered = localStorage.getItem(LOCAL_STORAGE_KEY_MASTERED);
    if (storedMastered) {
        try {
            masteredCards = JSON.parse(storedMastered);
            if (typeof masteredCards !== 'object' || masteredCards === null) masteredCards = {};
            Object.keys(masteredCards).forEach(chapKey => {
                if (!Array.isArray(masteredCards[chapKey])) masteredCards[chapKey] = [];
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
}

function loadFavorites() {
    const storedFavorites = localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITES);
    if (storedFavorites) {
        try {
            favoriteCards = JSON.parse(storedFavorites);
            if (!Array.isArray(favoriteCards)) favoriteCards = [];
        } catch (e) {
            console.error("Erreur parsing favorites localStorage:", e);
            favoriteCards = [];
        }
    } else {
        favoriteCards = [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITES, JSON.stringify(favoriteCards));
    } catch (e) {
        console.error("Erreur sauvegarde favorites localStorage:", e);
    }
}

// --- Fonctions d'accès/modification des données ---

export async function loadAllData(forceReload = false) {
    if (allFlashcardsData.length > 0 && !forceReload) {
        return allFlashcardsData; // Utiliser le cache si déjà chargé et pas de rechargement forcé
    }

    loadMasteredCards(); // Charger l'état maîtrisé
    loadFavorites(); // Charger les favoris

    try {
        const response = await fetch('flashcards.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const jsonData = await response.json();

        if (!Array.isArray(jsonData)) {
             throw new Error("Format JSON invalide: ce n'est pas un tableau.");
        }

        // Assigner un ID unique et extraire les chapitres
        chapters.clear();
        allFlashcardsData = jsonData.map((card, index) => {
             const chapter = isValidChapter(card.chapitre) ? Number(card.chapitre) : 'unknown';
             if (chapter !== 'unknown') {
                 chapters.add(chapter);
             }
             return {
                 ...card,
                 chapitre: chapter, // Assurer que c'est un nombre ou 'unknown'
                 uniqueId: `card-${chapter}-${index}` // ID basé sur chapitre et index original
             };
         });

         console.log(`Données JSON chargées: ${allFlashcardsData.length} cartes.`);
        return allFlashcardsData;

    } catch (error) {
        console.error("Erreur chargement JSON:", error);
        allFlashcardsData = []; // Assurer que le tableau est vide en cas d'erreur
        return [];
    }
}

export function getChapters() {
    return Array.from(chapters).sort((a, b) => a - b);
}

export function getCardsForChapter(chapterNum) {
    if (chapterNum === undefined || chapterNum === null) { // Pour 'all' ou cas non défini
        return allFlashcardsData.filter(card => card.chapitre !== 'unknown');
    }
    return allFlashcardsData.filter(card => card.chapitre === chapterNum);
}

export function getFavoriteCardsData() {
    // Retourne les objets cartes complets qui sont dans la liste des favoris
    return allFlashcardsData.filter(card => favoriteCards.includes(card.uniqueId));
}

export function getFavoriteCount() {
    // Compte les favoris qui existent réellement dans les données chargées
    return allFlashcardsData.filter(card => favoriteCards.includes(card.uniqueId)).length;
}

export function isMastered(cardId) {
    // Trouve la clé de chapitre correspondante ou cherche partout si nécessaire
    for (const chapKey in masteredCards) {
        if (masteredCards[chapKey].includes(cardId)) {
            return true;
        }
    }
    return false;
     // Version plus directe si on a le chapitre:
     // const card = allFlashcardsData.find(c => c.uniqueId === cardId);
     // if (!card || !isValidChapter(card.chapitre)) return false;
     // const chapKey = `chapitre_${card.chapitre}`;
     // return masteredCards[chapKey] && masteredCards[chapKey].includes(cardId);
}

export function addMastered(cardId) {
     const card = allFlashcardsData.find(c => c.uniqueId === cardId);
     if (!card || !isValidChapter(card.chapitre)) return; // Ne sauvegarde pas si chapitre invalide

     const chapKey = `chapitre_${card.chapitre}`;
     if (!masteredCards[chapKey]) {
         masteredCards[chapKey] = [];
     }
     if (!masteredCards[chapKey].includes(cardId)) {
         masteredCards[chapKey].push(cardId);
         saveMasteredCards();
     }
 }

export function toggleFavorite(cardId) {
     if (!cardId) return;
     const index = favoriteCards.indexOf(cardId);
     if (index > -1) {
         favoriteCards.splice(index, 1);
     } else {
         favoriteCards.push(cardId);
     }
     saveFavorites();
     // Le module UI mettra à jour l'icône
}

export function isFavorite(cardId) {
     return favoriteCards.includes(cardId);
}

export function resetMasteredProgress(chapterNum = undefined) {
     if (chapterNum === undefined) { // Reset tout
         masteredCards = {};
         console.log("Progression de toutes les cartes réinitialisée.");
     } else if (isValidChapter(chapterNum)) { // Chapitre spécifique
         const chapKey = `chapitre_${chapterNum}`;
         if (masteredCards[chapKey]) {
             delete masteredCards[chapKey];
             console.log(`Progression pour le chapitre ${chapterNum} réinitialisée.`);
         }
     }
     saveMasteredCards();
     // Pas besoin de retourner quoi que ce soit, l'état est modifié
}

export function resetFavorites() {
    favoriteCards = [];
    saveFavorites();
    console.log("Favoris réinitialisés.");
}

export function getAllData() {
    return allFlashcardsData; // Pour d'autres modules qui pourraient avoir besoin de tout
}