const classIcons = {
    'Mammalia': 'deer-rudolph',
    'Aves': 'bird',
    'Insecta': 'fly-insect',
    'Amphibia': 'frog',
    'Arachnida': 'spider',
    'Actinopterygii': 'fish',
    'Equisetopsida': 'seedling'
};

/**
 * Récupère les données de la fiche descriptive d'un taxon
 * @param {string} lb_nom - Nom latin du taxon
 * @returns {Promise<Array|null>}
 */
async function fetchFicheData(lb_nom) {
    try {
        const { data, error } = await supabaseClient
            .from('v_fiche')
            .select('*')
            .eq('lb_nom', lb_nom);

        if (error) throw error;

        // Si data est vide, on renvoie null, sinon on renvoie le tableau
        return (data && data.length > 0) ? data : null;
    } catch (err) {
        console.error(`Erreur fetchFicheData(${lb_nom}):`, err.message);
        return null;
    }
}

/**
 * Génère le contenu HTML d'une popup Leaflet à partir des données de v_fiche
 * @param {Object} data - Une ligne de données issue de v_fiche
 * @returns {string} HTML formaté
 */
function generatePopupHTML(dataArray) {
    console.log('Données pour la fiche:', dataArray);

    if (!dataArray || dataArray.length === 0) return '<p>Données indisponibles</p>';

    // Les infos communes (identiques sur toutes les lignes du tableau)
    const data = dataArray[0];
    console.log('Données utilisées pour l\'entête de la fiche:', data);
    const primaryColor = '#703B3B';

    const iconSuffix = classIcons[data.classe];
    var iconHTML = iconSuffix 
        ? `<i class="fi fi-ts-${iconSuffix} taxo-icon" style="font-size: 1.2rem; color: ${primaryColor};"></i>`
        : '';

    // Extraction unique des statuts (pour éviter les doublons si la vue en génère)
    // On crée une liste HTML pour chaque statut présent dans le tableau
    const statusHTML = dataArray.map(item => `
        <div style="margin-bottom: 8px; border-left: 3px solid #d35400; padding-left: 8px;">
            <p style="margin: 0; font-size: 0.85rem; font-weight: bold; color: #d35400;">
                ${item.lb_type_statut || 'Statut'}
            </p>
            <p style="margin: 0; font-size: 0.8rem; color: #2c3e50;">
                ${item.label_statut || 'N/A'} 
                <span style="color: #7f8c8d;">(${item.code_statut || '-'})</span>
            </p>
        </div>
    `).join('');

    return `
        <div class="fiche-info">
            <!-- Entête -->
            <div class="entete-fiche">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <h3>
                        ${data.lb_nom || 'Espèce inconnue'}
                    </h3>
                    ${iconHTML}
                </div>
                ${data.nom_vern ? `<p>${data.nom_vern}</p>` : ''}
            </div>

            <!-- Image -->
            ${data.image_url ? `
                <div style="margin-bottom: 10px; text-align: center;">
                    <img src="${data.image_url}" alt="${data.lb_nom}" style="max-width: 100%; max-height: 150px; border-radius: 8px; object-fit: cover;">
                </div>
            ` : ''}

            <!-- Observation -->
            <div class="observation-info"">
                <p><strong>Date:</strong> ${data.date_obs ? new Date(data.date_obs).toLocaleDateString('fr-FR') : 'N/A'}</p>
                <p><strong>Détails:</strong> ${data.abondance || '1'} indiv. ${data.type_obs || 'N/R'} (${data.sexe || 'sexe N/R'}, ${data.stade || 'stade N/R'})</p>
                <p>Classification: ${data.classe || 'N/A'} (${data.phylum || 'N/A'})</p>
            </div>

            <!-- Liste des Statuts -->
            <div class="status-list">
                <span class="status-title">Protections & Réglementations</span>
                <div class="statuts-list">
                    ${statusHTML}
                </div>
            </div>
        </div>
    `;
}