require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware pour la gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        error: 'Une erreur est survenue sur le serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route API pour rechercher des séries
app.get('/api/search', async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Le paramètre de recherche est requis' });
        }

        const response = await fetch(
            `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=series`
        );

        if (!response.ok) {
            throw new Error(`Erreur API OMDB: ${response.status}`);
        }

        const data = await response.json();

        if (data.Error) {
            return res.status(404).json({
                error: data.Error === 'Movie not found!' ? 'Aucune série trouvée' : data.Error
            });
        }

        if (!data.Search || !Array.isArray(data.Search)) {
            return res.status(404).json({ error: 'Format de données invalide' });
        }

        // Récupérer les détails pour chaque série avec gestion des erreurs
        const detailedResults = await Promise.all(
            data.Search.map(async (show) => {
                try {
                    if (!show.imdbID) {
                        throw new Error('ID IMDB manquant');
                    }

                    const detailResponse = await fetch(
                        `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${show.imdbID}&plot=short`
                    );

                    if (!detailResponse.ok) {
                        throw new Error(`Erreur API détails: ${detailResponse.status}`);
                    }

                    return detailResponse.json();
                } catch (error) {
                    console.error(`Erreur lors de la récupération des détails pour ${show.imdbID}:`, error);
                    return null;
                }
            })
        );

        // Filtrer les résultats null
        const validResults = detailedResults.filter(result => result !== null);

        res.json(validResults);
    } catch (error) {
        next(error);
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

// Route pour obtenir les détails d'une série
app.get('/api/details', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'L\'ID est requis' });
        }

        const response = await fetch(
            `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${id}&plot=full`
        );
        const data = await response.json();

        if (data.Error) {
            return res.status(404).json({ error: data.Error });
        }

        res.json(data);
    } catch (error) {
        console.error('Erreur serveur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});