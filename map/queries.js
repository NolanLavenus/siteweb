// ============================================
// CONFIGURATION SUPABASE
// ============================================
const SUPABASE_URL = 'https://biakssrhoajqgceaoyee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpYWtzc3Job2FqcWdjZWFveWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTYwNzksImV4cCI6MjA5MDUzMjA3OX0.i6MriL3tCtNMqQPQ2B5TFdy4MfKDli5rqkcjfvT3p5k';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: {
        schema: 'observation'
    }
});

// ============================================
// REQUÊTES PRINCIPALES
// ============================================

/**
 * Récupère toutes les observations (non filtrées)
 * @returns {Promise<Array>} Tableau des observations
 */
async function fetchObservations() {
    try {
        const { data, error } = await supabaseClient
            .from('observations')
            .select('*')
            .order('date_obs', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Erreur fetchObservations:', err.message);
        return [];
    }
}

/**
 * Récupère les observations avec filtres appliqués
 * @param {Object} filters - Objet {colonne: valeur}
 * @returns {Promise<Array>} Observations filtrées
 */
async function fetchObservationsFiltered(filters) {
    try {
        // CAS SPÉCIAL : Si on filtre par 'classe', on doit passer par v_nom
        if (filters.classe && filters.classe !== 'all') {
            return await fetchObservationsFilteredWithClasse(filters);
        }
        
        // CAS NORMAL : Filtres directs sur observations
        let query = supabaseClient
            .from('observations')
            .select('*');
        
        // Applique chaque filtre actif
        Object.entries(filters).forEach(([column, value]) => {
            if (value && value !== 'all') {
                query = query.eq(column, value);
            }
        });
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("Erreur fetchObservationsFiltered:", err.message);
        return [];
    }
}

/**
 * Récupère les observations filtrées quand 'classe' est dans les filtres
 * Nécessite une jointure avec v_nom
 * @param {Object} filters - Filtres incluant 'classe'
 * @returns {Promise<Array>} Observations filtrées
 */
async function fetchObservationsFilteredWithClasse(filters) {
    try {
        const classeValue = filters.classe;
        
        // 1. Récupère les lb_nom qui correspondent à la classe demandée
        const { data: vnomData, error: vnomError } = await supabaseClient
            .from('v_nom')
            .select('lb_nom, nom_vern')
            .eq('classe', classeValue);
        
        if (vnomError) throw vnomError;
        
        // Extrait les noms uniques
        const validNames = [...new Set(vnomData.map(v => v.lb_nom))].filter(Boolean);
        
        if (validNames.length === 0) return [];
        
        // 2. Filtre les observations par ces noms + les autres filtres
        let query = supabaseClient
            .from('observations')
            .select('*')
            .in('lb_nom', validNames);
        
        // Applique les autres filtres (sauf 'classe')
        Object.entries(filters).forEach(([column, value]) => {
            if (column !== 'classe' && value && value !== 'all') {
                query = query.eq(column, value);
            }
        });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data || [];
    } catch (err) {
        console.error("Erreur fetchObservationsFilteredWithClasse:", err.message);
        return [];
    }
}

/**
 * Récupère les valeurs DISTINCTES d'une colonne avec filtres
 * Utilisé pour mettre à jour les spinners dynamiquement
 * @param {string} column - Nom de la colonne
 * @param {Object} activeFilters - Filtres déjà actifs (on exclut celui en cours)
 * @returns {Promise<Array>} Valeurs uniques triées
 */
async function fetchDistinctValues(column, activeFilters = {}) {
    if (column === 'classe') return await fetchDistinctClasses(activeFilters);

    try {
        let query = supabaseClient.from('observations').select(column);

        // Si un filtre de classe est actif, on restreint la recherche aux lb_nom de cette classe
        if (activeFilters.classe && activeFilters.classe !== 'all') {
            const { data: names } = await supabaseClient
                .from('v_nom')
                .select('lb_nom')
                .eq('classe', activeFilters.classe);
            
            const validNames = names.map(n => n.lb_nom);
            if (validNames.length === 0) return [];
            query = query.in('lb_nom', validNames);
        }

        // Applique les autres filtres (sexe, stade, etc.)
        Object.entries(activeFilters).forEach(([col, val]) => {
            if (col !== 'classe' && col !== column && val && val !== 'all') {
                query = query.eq(col, val);
            }
        });

        const { data, error } = await query;
        if (error) throw error;

        return [...new Set(data.map(item => item[column]))]
            .filter(v => v != null && v !== '')
            .sort();
    } catch (err) {
        console.error(`Erreur distinct ${column}:`, err.message);
        return [];
    }
}

/**
 * Récupère les valeurs distinctes de 'classe' via v_nom avec filtres
 * Cas spécial car 'classe' n'est pas dans observations directement
 * @param {Object} activeFilters - Filtres actifs sur observations
 * @returns {Promise<Array>} Classes disponibles selon les filtres
 */
async function fetchDistinctClasses(activeFilters = {}) {
    try {
        // 1. Récupère d'abord les observations filtrées pour avoir les lb_nom
        let obsQuery = supabaseClient
            .from('observations')
            .select('lb_nom, nom_vern');
        
        // Applique tous les filtres SAUF classe
        Object.entries(activeFilters).forEach(([col, val]) => {
            if (col !== 'classe' && val && val !== 'all') {
                obsQuery = obsQuery.eq(col, val);
            }
        });
        
        const { data: obsData, error: obsError } = await obsQuery;
        if (obsError) throw obsError;
        
        // 2. Extrait les lb_nom et nom_vern uniques
        const uniqueNames = [...new Set(obsData.map(obs => obs.lb_nom || obs.nom_vern))].filter(Boolean);
        
        if (uniqueNames.length === 0) return [];
        
        // 3. Récupère les classes correspondantes depuis v_nom
        const { data: vnomData, error: vnomError } = await supabaseClient
            .from('v_nom')
            .select('classe')
            .in('lb_nom', uniqueNames);
        
        if (vnomError) throw vnomError;
        
        // 4. Extrait les classes uniques et trie
        const classes = vnomData.map(item => item.classe);
        return [...new Set(classes)]
            .filter(v => v != null && v !== '')
            .sort();
    } catch (err) {
        console.error('Erreur fetchDistinctClasses:', err.message);
        return [];
    }
}

// ============================================
// REQUÊTES POUR SPINNERS (VUES SQL)
// ============================================

/**
 * Récupère les données d'un spinner depuis une vue SQL
 * @param {string} viewName - Nom de la vue (ex: 'v_sexe')
 * @param {string} columnName - Colonne à trier
 * @returns {Promise<Array>}
 */
async function fetchSpinnerData(viewName, columnName) {
    try {
        const { data, error } = await supabaseClient
            .from(viewName)
            .select('*')
            .order(columnName, { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error(`Erreur fetchSpinnerData(${viewName}):`, err.message);
        return [];
    }
}

async function fetchFicheData(lb_nom) {
    try {
        const { data, error } = await supabaseClient
            .from('v_fiche')
            .select('*')
            .eq('lb_nom', lb_nom);
        if (error) throw error;
        return (data && data.length > 0) ? data : null;
    } catch (err) {
        console.error(`Erreur fetchFicheData(${lb_nom}):`, err.message);
        return null;
    }
}