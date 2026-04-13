import { scrollToTopVisible } from './const.js';

// Gestion du bouton "Scroll to top"
if (scrollToTopVisible) {
    document.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            scrollToTopVisible.style.display = 'block';
        } else {
            scrollToTopVisible.style.display = 'none';
        }
    });
}