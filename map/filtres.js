// ============================================
// CONFIGURATION DES FILTRES
// ============================================

// Liste complète des filtres disponibles
const FILTERS_DESKTOP = ["lb_nom", "nom_vern", "type_obs", "sexe", "stade", "abondance", "classe"];

// ============================================
// INITIALISATION DES SPINNERS
// ============================================

/**
 * Remplit tous les spinners au chargement initial
 */
async function populateAllFilters() {
    for (const filter of FILTERS_DESKTOP) {
        await populateFilter(filter);
    }
}

/**
 * Remplit un spinner avec les données de la vue SQL correspondante
 * @param {string} filterName - Nom du filtre (ex: 'sexe')
 */
async function populateFilter(filterName) {
    const selectElement = document.getElementById(`filter_desktop_${filterName}`);
    if (!selectElement) {
        console.warn(`Spinner filter_desktop_${filterName} introuvable`);
        return;
    }
    // Récupère les données depuis la vue v_{filterName}
    const options = await fetchSpinnerData(`v_${filterName}`, filterName);
    console.log(`📥 Données reçues pour ${filterName}:`, options[0]);
    
    // Construit le HTML des options
    const optionsHTML = '<option value="all">Tout</option>' + 
        options.map(item => 
            `<option value="${item[filterName]}">${item[filterName]}</option>`
        ).join('');
    
    selectElement.innerHTML = optionsHTML;
    console.log(`Element : `, selectElement,`Filtre : ${filterName}`,optionsHTML);
}

// ============================================
// MISE À JOUR DYNAMIQUE DES FILTRES
// ============================================

/**
 * Récupère l'état actuel de tous les spinners
 * @returns {Object} Objet {nomFiltre: valeur}
 */
function getCurrentFilters() {
    const filters = {};
    FILTERS_DESKTOP.forEach(filterName => {
        const value = document.getElementById(`filter_desktop_${filterName}`)?.value;
        if (value && value !== 'all') {
            filters[filterName] = value;
        }
    });
    return filters;
}

/**
 * Met à jour les options d'un spinner en fonction des autres filtres actifs
 * @param {string} filterToUpdate - Nom du spinner à mettre à jour
 * @param {Object} currentFilters - Filtres actuellement actifs
 */
async function updateSpinnerOptions(filterToUpdate, currentFilters) {
    const selectElement = document.getElementById(`filter_desktop_${filterToUpdate}`);
    if (!selectElement) return;
    
    // Récupère la valeur actuelle pour la restaurer si possible
    const currentValue = selectElement.value;
    
    // Construit les filtres SANS celui qu'on met à jour
    const otherFilters = { ...currentFilters };
    delete otherFilters[filterToUpdate];
    
    // Récupère les valeurs distinctes possibles
    const availableOptions = await fetchDistinctValues(filterToUpdate, otherFilters);
    
    // Reconstruit les options
    const optionsHTML = '<option value="all">Tout</option>' + 
        availableOptions.map(val => 
            `<option value="${val}">${val}</option>`
        ).join('');
    
    selectElement.innerHTML = optionsHTML;
    
    // Restaure la valeur si elle existe encore
    if (availableOptions.includes(currentValue)) {
        selectElement.value = currentValue;
    } else {
        selectElement.value = 'all';
    }
}

/**
 * Met à jour TOUS les autres spinners quand un filtre change
 * @param {string} changedFilter - Le filtre qui vient d'être modifié
 */
async function updateAllSpinners(changedFilter) {
    // 1. Récupère l'état actuel de tous les filtres
    const currentFilters = getCurrentFilters();
    
    // 2. Met à jour chaque spinner SAUF celui qui vient de changer
    const updatePromises = FILTERS_DESKTOP
        .filter(f => f !== changedFilter)
        .map(f => updateSpinnerOptions(f, currentFilters));
    
    await Promise.all(updatePromises);
    
    // 3. Met à jour la carte avec les nouvelles données
    await updateMap();
}

// ============================================
// MISE À JOUR DE LA CARTE
// ============================================

/**
 * Rafraîchit la carte avec les données filtrées
 */
async function updateMap() {
    const currentFilters = getCurrentFilters();
    const filteredData = await fetchObservationsFiltered(currentFilters);
    
    // Enrichit avec les données de v_nom (notamment 'classe')
    const enrichedData = await enrichObservationsWithVnom(filteredData);
    
    // Met à jour les markers sur la carte
    refreshMarkers(enrichedData);
}

// ============================================
// INITIALISATION DES LISTENERS
// ============================================

/**
 * Attache les event listeners sur tous les spinners
 */
function initFilterListeners() {
    FILTERS_DESKTOP.forEach(filterName => {
        const selectElement = document.getElementById(`filter_desktop_${filterName}`);
        if (selectElement) {
            selectElement.addEventListener('change', () => {
                updateAllSpinners(filterName);
            });
        }
    });
}

// ============================================
// LANCEMENT AU CHARGEMENT
// ============================================

// Peuple les spinners puis active les listeners
populateAllFilters().then(() => {
    initFilterListeners();
    console.log('✅ Filtres initialisés');
});

async function resetFilters() {
    console.log('🔄 Réinitialisation des filtres...');
    
    // 1. Remet tous les spinners sur "Tout"
    FILTERS_DESKTOP.forEach(filterName => {
        const selectElement = document.getElementById(`filter_desktop_${filterName}`);
        if (selectElement) {
            selectElement.value = 'all';
        }
    });
    
    // 2. Recharge tous les spinners avec toutes les valeurs disponibles
    await populateAllFilters();
    
    // 3. Recharge la carte avec toutes les observations
    try {
        const observations = await fetchObservations();
        const enrichedObs = await enrichObservationsWithVnom(observations);
        refreshMarkers(enrichedObs);
        console.log('✅ Filtres réinitialisés');
    } catch (error) {
        console.error("❌ Erreur lors de la réinitialisation:", error);
    }
}