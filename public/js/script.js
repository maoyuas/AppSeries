// Variables globales
let currentResults = [];
let currentPage = 1;
const resultsPerPage = 9;
let isLoading = false;
const OMDB_API_KEY = 'be69aad';

// Éléments du DOM
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resultsContainer = document.getElementById('resultsContainer');
const loadingElement = document.getElementById('loading');
const paginationElement = document.getElementById('pagination');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const themeToggle = document.getElementById('themeToggle');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // S'assurer que les overlays sont cachés au démarrage
    hideLoading();
    closeModal();

    // Charger le thème sauvegardé
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
});

// Gestionnaire d'événements pour le changement de thème
themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Fonction pour créer une requête avec timeout
async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('La requête a pris trop de temps à répondre');
        }
        throw error;
    }
}

// Recherche de séries
async function searchSeries() {
    if (isLoading) return;

    const query = searchInput.value.trim();
    if (!query) {
        showError('Veuillez entrer un terme de recherche');
        return;
    }

    try {
        isLoading = true;
        showLoading();

        const response = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=series`);
        if (!response.ok) {
            throw new Error('Erreur lors de la recherche');
        }

        const data = await response.json();
        if (data.Error) {
            throw new Error(data.Error === 'Movie not found!' ? 'Aucune série trouvée' : data.Error);
        }

        currentResults = data.Search;
        currentPage = 1;

        displayResults();
        updatePagination();
    } catch (error) {
        showError(error.message);
        currentResults = [];
        displayResults();
        updatePagination();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Affichage des résultats
function displayResults() {
    if (!currentResults || !currentResults.length) {
        resultsContainer.innerHTML = '<p class="no-results">Aucun résultat trouvé</p>';
        return;
    }

    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    const paginatedResults = currentResults.slice(start, end);

    resultsContainer.innerHTML = paginatedResults.map(show => `
        <div class="show-card">
            <img src="${show.Poster !== 'N/A' ? show.Poster : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                 alt="${show.Title}" 
                 loading="lazy">
            <div class="show-info">
                <h3 class="show-title">${show.Title}</h3>
                <p><strong>Année:</strong> ${show.Year}</p>
                <button class="details-btn" onclick="showDetails('${show.imdbID}')">
                    Plus de détails
                </button>
            </div>
        </div>
    `).join('');
}

// Affichage des détails d'une série
async function showDetails(imdbID) {
    try {
        showLoading();
        const response = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=full`);
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des détails');
        }

        const show = await response.json();
        if (show.Error) {
            throw new Error('Impossible de charger les détails de la série');
        }

        modalContent.innerHTML = `
            <button class="modal-close" onclick="closeModal()">&times;</button>
            <div class="modal-header">
                <img src="${show.Poster !== 'N/A' ? show.Poster : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                     alt="${show.Title}">
                <div class="modal-info">
                    <h2>${show.Title}</h2>
                    <p><strong>Année:</strong> ${show.Year}</p>
                    <p><strong>Genre:</strong> ${show.Genre}</p>
                    <p><strong>Note IMDb:</strong> ${show.imdbRating}</p>
                    <p><strong>Durée:</strong> ${show.Runtime}</p>
                    <p><strong>Acteurs:</strong> ${show.Actors}</p>
                </div>
            </div>
            <div class="modal-body">
                <h3>Synopsis</h3>
                <p>${show.Plot}</p>
                ${show.Ratings && show.Ratings.length > 0 ? `
                    <div class="modal-ratings">
                        ${show.Ratings.map(rating => `
                            <div class="rating">
                                <strong>${rating.Source}:</strong> ${rating.Value}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        modal.classList.add('active');
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Mise à jour de la pagination
function updatePagination() {
    if (!currentResults || !currentResults.length) {
        paginationElement.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(currentResults.length / resultsPerPage);
    paginationElement.innerHTML = `
        <button class="page-btn" onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            Précédent
        </button>
        <span>Page ${currentPage} sur ${totalPages}</span>
        <button class="page-btn" onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            Suivant
        </button>
    `;
}

// Changement de page
function changePage(page) {
    if (page < 1 || page > Math.ceil(currentResults.length / resultsPerPage)) return;
    currentPage = page;
    displayResults();
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Affichage du chargement
function showLoading() {
    loadingElement.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Masquage du chargement
function hideLoading() {
    loadingElement.classList.remove('active');
    document.body.style.overflow = '';
}

// Affichage des erreurs
function showError(message) {
    resultsContainer.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Événements
searchButton.addEventListener('click', searchSeries);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchSeries();
});

// Gestionnaire d'événements pour la modal
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Fermeture de la modal
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
} 