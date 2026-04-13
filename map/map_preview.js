/**
 * map_preview.js
 * Version légère et corrigée pour l'index.html
 */

async function initMapPreview() {
    // 1. Initialisation de la carte
    // ATTENTION : Vérifie que l'ID dans ton HTML est bien 'map_preview' avec un tiret
    const previewMap = L.map('map_preview', {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
    }).setView([46.603354, 1.888334], 6);

    // Définiiton des couleurs
    const colors = {
        primary: '#703B3B',
        secondary: '#A18D6D',
        tertiary: '#E1D0B3'
    }

    // 2. Ajout du fond de plan (on utilise previewMap, pas 'map')
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(previewMap);

    // 3. Récupération et affichage des points
    try {
        // fetchObservations() doit être défini dans queries.js
        const observations = await fetchObservations();
        
        if (observations && observations.length > 0) {
            const markers = [];

            observations.forEach(obs => {
                if (obs.latitude && obs.longitude) {
                    const dot = L.circleMarker([obs.latitude, obs.longitude], {
                        radius: 5,
                        fillColor: colors.primary,
                        color: colors.tertiary,
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    })
                    
                    dot.addTo(previewMap);
                    
                    markers.push([obs.latitude, obs.longitude]);
                }
            });
        }
    } catch (error) {
        console.error("Erreur lors du chargement des points de la preview :", error);
    }
}

// Lancement au chargement du DOM
document.addEventListener('DOMContentLoaded', initMapPreview);