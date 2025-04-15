// Configuration de l'API
const API_KEY = '44e566c8'; // Clé API gratuite OMDb
const API_URL = 'https://www.omdbapi.com/';

// Éléments du DOM
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resultsContainer = document.getElementById('results');
const loadingElement = document.getElementById('loading');

// Fonction pour afficher/masquer le loader
const toggleLoading = (show) => {
    loadingElement.classList.toggle('hidden', !show);
};

// Fonction pour afficher un message d'erreur
const showError = (message) => {
    resultsContainer.innerHTML = `<p class="error" style="color: red; text-align: center; padding: 20px;">${message}</p>`;
};

// Fonction pour rechercher les films/séries
const searchShows = async (query) => {
    try {
        toggleLoading(true);
        const response = await fetch(`${API_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&type=series`);

        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.Error) {
            showError(data.Error === 'Movie not found!' ? 'Aucune série trouvée.' : data.Error);
            return;
        }

        if (!data.Search || data.Search.length === 0) {
            showError('Aucun résultat trouvé pour votre recherche.');
            return;
        }

        // Récupérer les détails pour chaque série
        const detailedResults = await Promise.all(
            data.Search.map(async (show) => {
                const detailResponse = await fetch(`${API_URL}?apikey=${API_KEY}&i=${show.imdbID}&plot=short`);
                const detailData = await detailResponse.json();
                return detailData;
            })
        );

        displayResults(detailedResults);
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    } finally {
        toggleLoading(false);
    }
};

// Fonction pour afficher les résultats
const displayResults = (shows) => {
    if (!shows || shows.length === 0) {
        showError('Aucun résultat trouvé pour votre recherche.');
        return;
    }

    resultsContainer.innerHTML = shows.map(show => {
        const platforms = [];
        if (show.streamingInfo) {
            if (show.streamingInfo.netflix) platforms.push('Netflix');
            if (show.streamingInfo.prime) platforms.push('Amazon Prime');
            if (show.streamingInfo.disney) platforms.push('Disney+');
            if (show.streamingInfo.hbo) platforms.push('HBO');
        }

        return `
            <div class="show-card">
                ${show.Poster && show.Poster !== 'N/A' ? `
                    <img src="${show.Poster}" 
                         alt="${show.Title}" 
                         style="width: 200px; height: auto; margin-bottom: 10px; border-radius: 8px;">
                ` : ''}
                <h2 class="show-title">${show.Title}</h2>
                <p><strong>Année:</strong> ${show.Year || 'Non spécifiée'}</p>
                <p><strong>Genre:</strong> ${show.Genre || 'Non spécifié'}</p>
                <p><strong>Note IMDB:</strong> ${show.imdbRating || 'Non disponible'}</p>
                ${show.Plot ? `<p><strong>Synopsis:</strong> ${show.Plot}</p>` : ''}
                ${show.Actors ? `<p><strong>Acteurs:</strong> ${show.Actors}</p>` : ''}
                ${platforms.length > 0 ? `
                    <p><strong>Disponible sur:</strong> ${platforms.join(', ')}</p>
                ` : ''}
            </div>
        `;
    }).join('');

    // Ajouter des styles supplémentaires pour la grille de résultats
    resultsContainer.style.display = 'grid';
    resultsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    resultsContainer.style.gap = '20px';
    resultsContainer.style.padding = '20px';
};

// Écouteurs d'événements
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        searchShows(query);
    } else {
        showError('Veuillez entrer un titre à rechercher.');
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            searchShows(query);
        } else {
            showError('Veuillez entrer un titre à rechercher.');
        }
    }
}); 