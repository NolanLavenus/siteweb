import { navDesktop, navMobile, closeBtn, menuToggle, sidebar } from './const.js';

/**
 * GESTION DU SCROLL
 * Contrôle l'apparition des barres de navigation et du bouton de filtre
 */
document.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const shouldShow = scrollY > 100;

    // Barre Desktop
    if (navDesktop) {
        shouldShow ? navDesktop.classList.add('desktop-active') : navDesktop.classList.remove('desktop-active');
    }

    // Bouton Menu Mobile (Burger)
    if (navMobile) {
        shouldShow ? navMobile.classList.add('mobile-btn-active') : navMobile.classList.remove('mobile-btn-active');
    }

    // Bouton Filtre Flottant (Spécifique Map)
    const filterToggle = document.getElementById('filter-toggle');
    if (filterToggle) {
        if (shouldShow) {
            filterToggle.style.visibility = 'visible';
            filterToggle.style.opacity = '1';
            filterToggle.style.transform = 'scale(1)';
        } else {
            filterToggle.style.visibility = 'hidden';
            filterToggle.style.opacity = '0';
            filterToggle.style.transform = 'scale(0)';
        }
    }
});

/**
 * MENU DE NAVIGATION MOBILE (SIDEBAR PRINCIPALE)
 */
const openNav = () => sidebar?.classList.add('open');
const closeNav = () => sidebar?.classList.remove('open');

menuToggle?.addEventListener('click', openNav);
closeBtn?.addEventListener('click', closeNav);

// Fermeture automatique au clic sur un lien de navigation
document.querySelectorAll('.mobile-sidebar a').forEach(link => {
    link.addEventListener('click', closeNav);
});

/**
 * MENU DES FILTRES MOBILE (SIDEBAR FILTRES)
 */
const filterToggle = document.getElementById('filter-toggle');
const filterSidebar = document.getElementById('filter-sidebar-mobile');
const filterCloseBtn = document.getElementById('filter-close-btn');

const openFilters = () => {
    if (filterSidebar) {
        filterSidebar.classList.add('open');
        if (filterToggle) {
            filterToggle.style.opacity = '0';
            filterToggle.style.visibility = 'hidden';
            filterToggle.style.transform = 'scale(0)';
        }
    }
};

const closeFilters = () => {
    if (filterSidebar) {
        filterSidebar.classList.remove('open');
        if (filterToggle) {
            filterToggle.style.opacity = '1';
            filterToggle.style.visibility = 'visible';
            filterToggle.style.transform = 'scale(1)';
        }
    }
};

filterToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    openFilters();
});

filterCloseBtn?.addEventListener('click', closeFilters);

// Fermer les menus si on clique en dehors
document.addEventListener('click', (event) => {
    // Si la sidebar de navigation est ouverte et qu'on clique ailleurs
    if (sidebar?.classList.contains('open') && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
        closeNav();
    }
    // Si la sidebar de filtres est ouverte et qu'on clique ailleurs
    if (filterSidebar?.classList.contains('open') && !filterSidebar.contains(event.target) && !filterToggle.contains(event.target)) {
        closeFilters();
    }
});