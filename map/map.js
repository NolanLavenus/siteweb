// ============================================
// VARIABLES GLOBALES
// ============================================

let map; // Instance Leaflet
let markersLayer; // Layer group pour les markers

// Palette de couleurs
const COLORS = {
    primary: '#703B3B',
    secondary: '#A18D6D',
    tertiary: '#E1D0B3'
};

// ============================================
// INITIALISATION DE LA CARTE
// ============================================

/**
 * Initialise la carte Leaflet au chargement de la page
 */
async function initMap() {

    // Intialisation de la carte
    map = L.map('map', {
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true
    }).setView([46.603354, 1.888334], 6);

    // Fond de plan

    // Fond OSM
    var fondOSM = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    })
    fondOSM.addTo(map);
    
    // Fond ortophoto IGN
    var fondOrtho = L.tileLayer(
        "https://data.geopf.fr/wmts?" +
        "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
        "&STYLE=normal" +
        "&TILEMATRIXSET=PM" +
        "&FORMAT=image/jpeg"+
        "&LAYER=ORTHOIMAGERY.ORTHOPHOTOS"+
        "&TILEMATRIX={z}" +
        "&TILEROW={y}" +
        "&TILECOL={x}",
    {
        minZoom : 0,
        maxZoom : 18,
                attribution : "IGN-F/Geoportail",
        tileSize : 256 // les tuiles du Géooportail font 256x256px
    });
    // fondOrtho.addTo(map);

    // Fond ortophoto IGN
    var carteIgn = L.tileLayer(
        "https://data.geopf.fr/wmts?" +
        "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
        "&STYLE=normal" +
        "&TILEMATRIXSET=PM" +
        "&FORMAT=image/png"+
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"+
        "&TILEMATRIX={z}" +
        "&TILEROW={y}" +
        "&TILECOL={x}",
    {
        minZoom : 0,
        maxZoom : 18,
                attribution : "IGN-F/Geoportail",
        tileSize : 256 // les tuiles du Géooportail font 256x256px
    });
    // fondOrtho.addTo(map);

    var listeFonds={
        "OSM":fondOSM,
        "Ortho IGN":fondOrtho,
        "Carte IGN":carteIgn
    };

    // Layer control
    var layerControl = L.control.layers(
        listeFonds,
        null,{
        position:'topright'
    });
    layerControl.addTo(map);

    // Création du cluster
    cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: true,
        // Apparence des clusters ici
        polygonOptions: {
            fillColor: COLORS.primary,
            color: COLORS.tertiary,
            weight: 2,
            opacity: 1,
            fillOpacity: 0.3,
        }
    });
    map.addLayer(cluster);

    // Chargement initial de toutes les observations
    try {
        const observations = await fetchObservations();
        const enrichedObs = await enrichObservationsWithVnom(observations);
        refreshMarkers(enrichedObs);
    } catch (error) {
        console.error("Erreur lors du chargement des observations:", error);
    }
}

// Gestion des markers
async function enrichObservationsWithVnom(observations) {
    if (!observations || observations.length === 0) return [];
    
    try {
        // Récupère tous les lb_nom uniques
        const uniqueNames = [...new Set(observations.map(obs => obs.lb_nom))].filter(Boolean);
        
        if (uniqueNames.length === 0) return observations;
        
        // Récupère les infos de v_nom pour ces noms
        const { data: vnomData, error } = await supabaseClient
            .from('v_nom')
            .select('lb_nom, classe, nom_vern')
            .in('lb_nom', uniqueNames);
        
        if (error) {
            console.warn('Impossible d\'enrichir avec v_nom:', error.message);
            return observations;
        }
        
        // Crée un index pour accès rapide
        const vnomMap = {};
        vnomData.forEach(v => {
            vnomMap[v.lb_nom] = v;
        });
        
        // Enrichit chaque observation
        return observations.map(obs => ({
            ...obs,
            classe: vnomMap[obs.lb_nom]?.classe || obs.classe,
            nom_vern: obs.nom_vern || vnomMap[obs.lb_nom]?.nom_vern
        }));
    } catch (err) {
        console.error('Erreur enrichissement:', err.message);
        return observations;
    }
}

function refreshMarkers(observations) {
    if (!cluster) return;

    // 1. On vide les marqueurs existants
    cluster.clearLayers();

    // 2. On boucle sur les données
    observations.forEach(obs => {
        if (obs.latitude && obs.longitude) {
            const marker = L.circleMarker([obs.latitude, obs.longitude], {
                radius: 8,
                fillColor: COLORS.primary,
                color: COLORS.tertiary,
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            // --- LOGIQUE DE POPUP DYNAMIQUE ---
            
            // On affiche d'abord un message de chargement
            marker.bindPopup("Chargement de la fiche...");

            // On écoute le clic sur le marqueur pour charger la vraie fiche
            marker.on('click', async () => {
                try {
                    // 1. Récupération des données complètes via la vue v_fiche
                    // fetchFicheData est déclarée dans queries.js
                    const ficheArray = await fetchFicheData(obs.lb_nom);
                    
                    if (ficheArray && ficheArray.length > 0) {
                        // 2. Génération du HTML avec la fonction de queries.js
                        const html = generatePopupHTML(ficheArray);
                        
                        // 3. Mise à jour du contenu de la popup
                        marker.setPopupContent(html);
                    } else {
                        marker.setPopupContent(`<strong>${obs.lb_nom}</strong><br>Aucune fiche détaillée trouvée.`);
                    }
                } catch (err) {
                    console.error("Erreur lors de l'ouverture de la popup:", err);
                    marker.setPopupContent("Erreur lors du chargement des données.");
                }
            });

            cluster.addLayer(marker);
        }
    });

    console.log(`✅ ${observations.length} marqueur(s) affiché(s)`);
}

// ============================================
// LANCEMENT AU CHARGEMENT
// ============================================

document.addEventListener('DOMContentLoaded', initMap);