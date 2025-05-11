import { isValidChapter } from './utils/helpers.js';

let AVAILABLE_SUBJECTS = [];
let currentSubjectConfig = null;
let allSubjectsData = {};
let masteredCards = {};
let favoriteCards = [];
let currentSubjectFile = null;

const LOCAL_STORAGE_KEY_MASTERED_PREFIX = 'flashcardsMastered_';
const LOCAL_STORAGE_KEY_FAVORITES_PREFIX = 'flashcardsFavorites_';

function getMasteredStorageKey(subjectFile) { return subjectFile ? `${LOCAL_STORAGE_KEY_MASTERED_PREFIX}${subjectFile}` : null; }
function getFavoritesStorageKey(subjectFile) { return subjectFile ? `${LOCAL_STORAGE_KEY_FAVORITES_PREFIX}${subjectFile}` : null; }

function loadMasteredCardsForSubject(subjectFile) {
    const key = getMasteredStorageKey(subjectFile);
    if (!key) return {};
    const stored = localStorage.getItem(key);
    let data = {};
    if (stored) {
        try {
            data = JSON.parse(stored);
            if (typeof data !== 'object' || data === null) data = {};
            Object.keys(data).forEach(k => { if (!Array.isArray(data[k])) data[k] = []; });
        } catch (e) { data = {}; console.error("Err parse mastered:", key, e); }
    }
    return data;
}

function saveMasteredCards() {
    const key = getMasteredStorageKey(currentSubjectFile);
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(masteredCards)); }
    catch (e) { console.error("Err save mastered:", key, e); }
}

function loadFavoritesForSubject(subjectFile) {
    const key = getFavoritesStorageKey(subjectFile);
    if(!key) return [];
    const stored = localStorage.getItem(key);
    let data = [];
    if (stored) {
        try {
            data = JSON.parse(stored);
            if (!Array.isArray(data)) data = [];
        } catch (e) { data = []; console.error("Err parse favorites:", key, e); }
    }
    return data;
}

function saveFavorites() {
    const key = getFavoritesStorageKey(currentSubjectFile);
    if(!key) return;
    try { localStorage.setItem(key, JSON.stringify(favoriteCards)); }
    catch (e) { console.error("Err save favorites:", key, e); }
}

export async function loadAllData() {
    try {
        const response = await fetch('subjectsConfig.json');
        if (!response.ok) throw new Error(`Config HTTP error! status: ${response.status}`);
        AVAILABLE_SUBJECTS = await response.json();
        if (!Array.isArray(AVAILABLE_SUBJECTS)) {
             AVAILABLE_SUBJECTS = [];
        }
    } catch(error) {
        console.error("Erreur chargement subjectsConfig.json:", error);
        AVAILABLE_SUBJECTS = [];
    }
    return AVAILABLE_SUBJECTS;
}

export async function loadSubjectData(subjectFile) {
    if (!subjectFile) return [];

    currentSubjectFile = subjectFile;
    currentSubjectConfig = AVAILABLE_SUBJECTS.find(s => s.file === subjectFile);

    if (!currentSubjectConfig) {
        console.error(`Configuration non trouvée pour ${subjectFile}`);
        return [];
    }

    masteredCards = loadMasteredCardsForSubject(subjectFile);
    favoriteCards = loadFavoritesForSubject(subjectFile);

    if (allSubjectsData[subjectFile]) {
        return allSubjectsData[subjectFile];
    }

    try {
        const response = await fetch(subjectFile);
        if (!response.ok) throw new Error(`JSON HTTP error! status: ${response.status} for ${subjectFile}`);
        const jsonData = await response.json();
        if (!Array.isArray(jsonData)) throw new Error(`Format JSON invalide: not an array.`);

        const subjectDataCache = jsonData.map((card, index) => {
             const chapter = isValidChapter(card.chapitre) ? Number(card.chapitre) : 'unknown';
             return {
                 ...card,
                 chapitre: chapter,
                 uniqueId: `${subjectFile}-card-${chapter}-${index}`
             };
         });

        allSubjectsData[subjectFile] = subjectDataCache;
        return subjectDataCache;

    } catch (error) {
        console.error(`Erreur chargement JSON pour ${subjectFile}:`, error);
        allSubjectsData[subjectFile] = [];
        return [];
    }
}

export function getAvailableSubjects() { return AVAILABLE_SUBJECTS; }

export function getChapters() {
    const currentData = allSubjectsData[currentSubjectFile] || [];
    const chapters = new Set();
    currentData.forEach(card => { if (card.chapitre !== 'unknown') chapters.add(card.chapitre); });
    return Array.from(chapters).sort((a, b) => a - b);
}

export function getCardsForChapter(chapterNum) {
    const currentData = allSubjectsData[currentSubjectFile] || [];
    if (chapterNum === undefined || chapterNum === null) {
        return currentData.filter(card => card.chapitre !== 'unknown');
    }
    return currentData.filter(card => card.chapitre === chapterNum);
}

export function getFavoriteCardsData() {
    const currentData = allSubjectsData[currentSubjectFile] || [];
    const currentFavorites = favoriteCards || [];
    return currentData.filter(card => currentFavorites.includes(card.uniqueId));
}

export function getFavoriteCount() {
    const currentData = allSubjectsData[currentSubjectFile] || [];
    const currentFavorites = favoriteCards || [];
    return currentData.filter(card => currentFavorites.includes(card.uniqueId)).length;
}

export function getSubjectDescription() {
    return currentSubjectConfig?.description || "";
}

export function getChapterDescription(chapterNum) {
    return currentSubjectConfig?.chapterDescriptions?.[String(chapterNum)] || "";
}

export function isMastered(cardId) {
    for (const chapKey in masteredCards) {
        if (masteredCards[chapKey].includes(cardId)) return true;
    }
    return false;
}

export function addMastered(cardId) {
     const currentData = allSubjectsData[currentSubjectFile] || [];
     const card = currentData.find(c => c.uniqueId === cardId);
     if (!card || !isValidChapter(card.chapitre)) return;
     const chapKey = `chapitre_${card.chapitre}`;
     if (!masteredCards[chapKey]) masteredCards[chapKey] = [];
     if (!masteredCards[chapKey].includes(cardId)) {
         masteredCards[chapKey].push(cardId);
         saveMasteredCards();
     }
 }

export function toggleFavorite(cardId) {
     if (!cardId) return;
     const currentFavorites = favoriteCards || [];
     const index = currentFavorites.indexOf(cardId);
     if (index > -1) currentFavorites.splice(index, 1);
     else currentFavorites.push(cardId);
     favoriteCards = currentFavorites;
     saveFavorites();
}

export function isFavorite(cardId) {
     const currentFavorites = favoriteCards || [];
     return currentFavorites.includes(cardId);
}

export function resetMasteredProgress(chapterNum = undefined) {
     if (!currentSubjectFile) return;
     if (chapterNum === undefined) masteredCards = {};
     else if (isValidChapter(chapterNum)) {
         const chapKey = `chapitre_${chapterNum}`;
         if (masteredCards[chapKey]) delete masteredCards[chapKey];
     }
     saveMasteredCards();
}

export function resetFavorites() {
    if (!currentSubjectFile) return;
    favoriteCards = [];
    saveFavorites();
}

export function resetAllProgressGlobal() {
    AVAILABLE_SUBJECTS.forEach(subject => {
        const masteredKey = getMasteredStorageKey(subject.file);
        const favoritesKey = getFavoritesStorageKey(subject.file);
        if(masteredKey) localStorage.removeItem(masteredKey);
        if(favoritesKey) localStorage.removeItem(favoritesKey);
    });
    masteredCards = {};
    favoriteCards = [];
}

export function getMasteredCountForChapter(chapterNum) {
    if (!currentSubjectFile || !isValidChapter(chapterNum)) return 0;
    const chapKey = `chapitre_${chapterNum}`;
    const masteredInChapter = masteredCards[chapKey] || [];
    return masteredInChapter.length;
}

export function getTotalCardsInChapter(chapterNum) {
    if (!currentSubjectFile || !isValidChapter(chapterNum)) return 0;
    const currentData = allSubjectsData[currentSubjectFile] || [];
    return currentData.filter(card => card.chapitre === chapterNum).length;
}