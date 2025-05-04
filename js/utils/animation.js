// js/utils/animation.js

const animationDuration = 400; // ms

export function fadeOutElement(element, callback) {
    if (!element || element.style.display === 'none') { if (callback) callback(); return; }
    element.classList.add('fade-out');
    element.classList.remove('fade-in');
    const handleAnimationEnd = (event) => {
        if (event.target !== element) return;
        element.style.display = 'none';
        element.classList.remove('fade-out');
        element.removeEventListener('animationend', handleAnimationEnd);
        if (callback) callback();
    };
    element.addEventListener('animationend', handleAnimationEnd);
    // Fallback timer
    setTimeout(() => {
         if (element.classList.contains('fade-out')) {
             handleAnimationEnd({target: element});
         }
    }, animationDuration + 50);
}

export function fadeInElement(element, displayType = 'block', callback) {
     if (!element) return;
    element.classList.remove('fade-out');
    element.style.display = displayType;
    // Force reflow to ensure animation plays
    void element.offsetWidth;
    element.classList.add('fade-in');
    const handleAnimationEnd = (event) => {
        if (event.target !== element) return;
        // Ne pas retirer fade-in pour garder opacity: 1
        element.removeEventListener('animationend', handleAnimationEnd);
        if (callback) callback();
    };
    element.addEventListener('animationend', handleAnimationEnd);
    // Fallback timer
     setTimeout(() => {
         const style = window.getComputedStyle(element);
         if (element.classList.contains('fade-in') && style.opacity !== '1' && style.display !== 'none') {
             handleAnimationEnd({target: element});
             element.style.opacity = '1';
             element.classList.remove('fade-in');
         }
     }, animationDuration + 50);
}