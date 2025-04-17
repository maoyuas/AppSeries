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

// Route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route API pour rechercher des séries
app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Le paramètre de recherche est requis' });
        }

        const response = await fetch(
            `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=series`
        );
        const data = await response.json();

        if (data.Error) {
            return res.status(404).json({ error: data.Error });
        }

        // Récupérer les détails pour chaque série
        const detailedResults = await Promise.all(
            data.Search.map(async (show) => {
                const detailResponse = await fetch(
                    `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${show.imdbID}&plot=short`
                );
                return detailResponse.json();
            })
        );

        res.json(detailedResults);
    } catch (error) {
        console.error('Erreur serveur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
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