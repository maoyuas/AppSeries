// Variables globales
let currentResults = [];
let currentPage = 1;
const resultsPerPage = 9;
let isLoading = false;

// Éléments du DOM
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resultsContainer = document.getElementById('resultsContainer');
const loadingElement = document.getElementById('loading');
const paginationElement = document.getElementById('pagination');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const themeToggle = document.getElementById('themeToggle');

// Fonction pour gérer le stockage local de manière sécurisée
function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        // Pour le thème, on retourne directement la valeur sans parser le JSON
        if (key === 'theme') {
            return item || defaultValue;
        }
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Erreur lors de la lecture du stockage:', error);
        return defaultValue;
    }
}

function setInStorage(key, value) {
    try {
        // Pour le thème, on stocke directement la valeur sans la convertir en JSON
        if (key === 'theme') {
            localStorage.setItem(key, value);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    } catch (error) {
        console.error('Erreur lors de l\'écriture dans le stockage:', error);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // S'assurer que les overlays sont cachés au démarrage
    hideLoading();
    closeModal();

    // Charger le thème sauvegardé de manière sécurisée
    const savedTheme = getFromStorage('theme', 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
});

// Gestionnaire d'événements pour le changement de thème
themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    setInStorage('theme', newTheme);
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

// Fonction pour afficher les erreurs
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // Supprimer les messages d'erreur existants
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());

    // Insérer le nouveau message d'erreur
    const searchBox = document.querySelector('.search-box');
    searchBox.insertAdjacentElement('afterend', errorDiv);

    // Supprimer le message après 5 secondes
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Fonction pour vérifier si une valeur est une chaîne valide
function isValidString(str) {
    return str !== null && str !== undefined && typeof str === 'string';
}

// Recherche de séries avec gestion des erreurs
async function searchSeries() {
    if (isLoading) return;

    const query = searchInput.value;
    if (!isValidString(query) || !query.trim()) {
        showError('Veuillez entrer un terme de recherche');
        return;
    }

    try {
        isLoading = true;
        showLoading();

        const response = await fetch(`/api/search?query=${encodeURIComponent(query.trim())}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(isValidString(data.error) ? data.error : 'Erreur lors de la recherche');
        }

        if (Array.isArray(data)) {
            currentResults = data.filter(item => item && isValidString(item.Title));
        } else {
            throw new Error('Format de données invalide');
        }

        if (currentResults.length === 0) {
            showError('Aucune série trouvée');
        }

        currentPage = 1;
        displayResults();
        updatePagination();
    } catch (error) {
        console.error('Erreur de recherche:', error);
        showError(isValidString(error.message) ? error.message : 'Une erreur est survenue');
        currentResults = [];
        displayResults();
        updatePagination();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Affichage des résultats avec vérification des données
function displayResults() {
    if (!Array.isArray(currentResults) || currentResults.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">Aucun résultat trouvé</p>';
        return;
    }

    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    const paginatedResults = currentResults.slice(start, end);

    resultsContainer.innerHTML = paginatedResults.map(show => {
        if (!show) return '';

        const title = isValidString(show.Title) ? show.Title : 'Titre inconnu';
        const year = isValidString(show.Year) ? show.Year : 'Année inconnue';
        const poster = isValidString(show.Poster) && show.Poster !== 'N/A'
            ? show.Poster
            : 'https://via.placeholder.com/300x450?text=No+Image';
        const id = isValidString(show.imdbID) ? show.imdbID : '';

        return `
            <div class="show-card">
                <img src="${poster}" 
                     alt="${title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="show-info">
                    <h3 class="show-title">${title}</h3>
                    <p><strong>Année:</strong> ${year}</p>
                    ${id ? `<button class="details-btn" onclick="showDetails('${id}')">
                        Plus de détails
                    </button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Affichage des détails avec gestion des erreurs
async function showDetails(imdbID) {
    if (!isValidString(imdbID)) {
        showError('ID invalide');
        return;
    }

    try {
        showLoading();
        const response = await fetch(`/api/details?id=${encodeURIComponent(imdbID)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(isValidString(data.error) ? data.error : 'Erreur lors de la récupération des détails');
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Données invalides reçues du serveur');
        }

        const show = {
            Title: isValidString(data.Title) ? data.Title : 'Titre inconnu',
            Year: isValidString(data.Year) ? data.Year : 'Année inconnue',
            Poster: isValidString(data.Poster) && data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/300x450?text=No+Image',
            Plot: isValidString(data.Plot) ? data.Plot : 'Aucun synopsis disponible',
            Genre: isValidString(data.Genre) ? data.Genre : 'Genre inconnu',
            imdbRating: isValidString(data.imdbRating) ? data.imdbRating : 'Note non disponible',
            Runtime: isValidString(data.Runtime) ? data.Runtime : 'Durée inconnue',
            Actors: isValidString(data.Actors) ? data.Actors : 'Acteurs inconnus',
            Ratings: Array.isArray(data.Ratings) ? data.Ratings : []
        };

        modalContent.innerHTML = `
            <button class="modal-close" onclick="closeModal()">&times;</button>
            <div class="modal-header">
                <img src="${show.Poster}" 
                     alt="${show.Title}"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
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
                ${show.Ratings.length > 0 ? `
                    <div class="modal-ratings">
                        ${show.Ratings.map(rating => `
                            <div class="rating">
                                <strong>${isValidString(rating.Source) ? rating.Source : ''}:</strong> ${isValidString(rating.Value) ? rating.Value : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        modal.classList.add('active');
    } catch (error) {
        console.error('Erreur lors de l\'affichage des détails:', error);
        showError(isValidString(error.message) ? error.message : 'Une erreur est survenue');
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