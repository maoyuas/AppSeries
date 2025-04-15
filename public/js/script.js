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
    resultsContainer.innerHTML = `<p class="error">${message}</p>`;
};

// Fonction pour rechercher les séries
const searchShows = async (query) => {
    try {
        toggleLoading(true);
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Une erreur est survenue');
        }

        displayResults(data);
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showError(error.message || 'Une erreur est survenue lors de la recherche. Veuillez réessayer.');
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
        return `
            <div class="show-card">
                ${show.Poster && show.Poster !== 'N/A' ? `
                    <img src="${show.Poster}" 
                         alt="${show.Title}" 
                         onerror="this.onerror=null; this.src='/images/no-poster.jpg';">
                ` : ''}
                <h2 class="show-title">${show.Title}</h2>
                <p><strong>Année:</strong> ${show.Year || 'Non spécifiée'}</p>
                <p><strong>Genre:</strong> ${show.Genre || 'Non spécifié'}</p>
                <p><strong>Note IMDB:</strong> ${show.imdbRating || 'Non disponible'}</p>
                ${show.Plot ? `<p><strong>Synopsis:</strong> ${show.Plot}</p>` : ''}
                ${show.Actors ? `<p><strong>Acteurs:</strong> ${show.Actors}</p>` : ''}
            </div>
        `;
    }).join('');
};

// Fonction pour gérer la recherche
const handleSearch = () => {
    const query = searchInput.value.trim();
    if (query) {
        searchShows(query);
    } else {
        showError('Veuillez entrer un titre à rechercher.');
    }
};

// Écouteurs d'événements
searchButton.addEventListener('click', handleSearch);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    searchInput.focus();
}); 