import express from 'express';
import axios from 'axios';
import 'dotenv/config';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));

app.get('/api/languages', async (req, res) => {
    try {
        const url = `https://api.themoviedb.org/3/configuration/languages?api_key=${process.env.TMDB_API_KEY}`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Language API error:", error.message);
        res.status(500).json({ error: 'Failed to fetch languages.' });
    }
});

app.get('/api/new-game', async (req, res) => {
    try {
        const { startYear, endYear, language } = req.query;
        if (!startYear || !endYear || !language) {
            return res.status(400).json({ error: 'A start year, end year, and language must be provided.' });
        }

        const baseUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&language=${language}&sort_by=popularity.desc&include_adult=false&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31&vote_count.gte=1000`;
        
        const initialResponse = await axios.get(baseUrl);
        const totalPages = initialResponse.data.total_pages;
        
        if (totalPages === 0) {
            return res.status(404).json({ error: `No highly-rated movies found for ${startYear}-${endYear} in the selected language.` });
        }
        const randomPage = Math.min(Math.ceil(Math.random() * totalPages), 500);
        const moviesResponse = await axios.get(`${baseUrl}&page=${randomPage}`);
        const movies = moviesResponse.data.results;

        if (!movies || movies.length === 0) {
            return res.status(404).json({ error: `Could not fetch movies for the selected range.` });
        }
        
        const randomMovie = movies[Math.floor(Math.random() * movies.length)];

        const prompt = `
            You are a witty and charismatic movie buff crafting clever trivia questions for your friends. Your tone should be playful and intriguing.
            Based on the following movie data, generate 5 clues in the language with the ISO 639-1 code: "${language}".
            Follow these rules strictly:
            - **Style:** Start vague and get more specific. Avoid just summarizing the plot. Instead, focus on iconic scenes, famous quotes, the director's unique style, or the film's cultural impact.
            - **Restrictions:** Absolutely no movie titles or actor/character names. Do not sound like a robot.
            - **Format:** Return ONLY a valid JSON object with two keys: "title" (the movie's title) and "clues" (an array of 5 string clues).
            Movie Data:
            Title: ${randomMovie.title}
            Overview: ${randomMovie.overview}
            Release Year: ${randomMovie.release_date.substring(0, 4)}
        `;

        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );

        const rawResponse = geminiResponse.data.candidates[0].content.parts[0].text;
        const cleanedJsonString = rawResponse.replace(/```json|```/g, '').trim();
        const gameData = JSON.parse(cleanedJsonString);
        
        // Add the poster path to the response
        if (randomMovie.poster_path) {
            gameData.posterUrl = `https://image.tmdb.org/t/p/w500${randomMovie.poster_path}`;
        } else {
            gameData.posterUrl = null; // Handle cases with no poster
        }
        
        res.json(gameData);

    } catch (error) {
        console.error("Error in /api/new-game:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate a new game.' });
    }
});

app.get('/api/search', async (req, res) => {
    // ... search endpoint code remains the same
});

app.listen(PORT, () => {
    console.log(`QuizFlix backend running on http://localhost:${PORT}`);
});