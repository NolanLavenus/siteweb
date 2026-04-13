// ============================================
// CONFIGURATION DES FILTRES
// ============================================

// Liste complète des filtres disponibles
const FILTERS_MOBILE = ["lb_nom", "nom_vern", "type_obs", "sexe", "stade", "abondance", "classe"];

// ============================================
// INITIALISATION DES SPINNERS
// ============================================

/**
 * Remplit tous les spinners au chargement initial
 */
async function populateAllFiltersMobile() {
    for (const filter of FILTERS_MOBILE) {
        await populateFilterMobile(filter);
    }
}

/**
 * Remplit un spinner avec les données de la vue SQL correspondante
 * @param {string} filterName - Nom du filtre (ex: 'sexe')
 */
async function populateFilterMobile(filterName) {
    const selectElement = document.getElementById(`filter_mobile_${filterName}`);
    if (!selectElement) {
        console.warn(`Spinner filter_mobile_${filterName} introuvable`);
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
function getCurrentFiltersMobile() {
    const filters = {};
    FILTERS_MOBILE.forEach(filterName => {
        const value = document.getElementById(`filter_mobile_${filterName}`)?.value;
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
async function updateSpinnerOptionsMobile(filterToUpdate, currentFilters) {
    const selectElement = document.getElementById(`filter_mobile_${filterToUpdate}`);
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
async function updateAllSpinnersMobile(changedFilter) {
    // 1. Récupère l'état actuel de tous les filtres
    const currentFilters = getCurrentFiltersMobile();
    
    // 2. Met à jour chaque spinner SAUF celui qui vient de changer
    const updatePromises = FILTERS_MOBILE
        .filter(f => f !== changedFilter)
        .map(f => updateSpinnerOptionsMobile(f, currentFilters));
    
    await Promise.all(updatePromises);
    
    // 3. Met à jour la carte avec les nouvelles données
    await updateMapMobile();
}

// ============================================
// MISE À JOUR DE LA CARTE
// ============================================

/**
 * Rafraîchit la carte avec les données filtrées
 */
async function updateMapMobile() {
    const currentFilters = getCurrentFiltersMobile();
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
function initFilterListenersMobile() {
    FILTERS_MOBILE.forEach(filterName => {
        const selectElement = document.getElementById(`filter_mobile_${filterName}`);
        if (selectElement) {
            selectElement.addEventListener('change', () => {
                updateAllSpinnersMobile(filterName);
            });
        }
    });
}

// ============================================
// LANCEMENT AU CHARGEMENT
// ============================================

// Peuple les spinners puis active les listeners
populateAllFiltersMobile().then(() => {
    initFilterListenersMobile();
    console.log('✅ Filtres initialisés');
});

async function resetFiltersMobile() {
    console.log('🔄 Réinitialisation des filtres...');
    
    // 1. Remet tous les spinners sur "Tout"
    FILTERS_MOBILE.forEach(filterName => {
        const selectElement = document.getElementById(`filter_mobile_${filterName}`);
        if (selectElement) {
            selectElement.value = 'all';
        }
    });
    
    // 2. Recharge tous les spinners avec toutes les valeurs disponibles
    await populateAllFiltersMobile();
    
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