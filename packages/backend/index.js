// index.js
import express from 'express';
import axios from 'axios';
import 'dotenv/config';
import cors from 'cors';
import fs from 'fs'; // Import the file system module

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));

// --- NEW: Load pre-generated quizzes ---
let preGeneratedQuizzes = [];
try {
    const data = fs.readFileSync('./quizzes.json', 'utf8');
    preGeneratedQuizzes = JSON.parse(data);
    console.log('Pre-generated quizzes loaded successfully.');
} catch (err) {
    console.error('Error loading pre-generated quizzes:', err);
}
// --- END NEW ---

// Function to check if TMDb API is reachable
async function isTmdbApiReachable() {
    try {
        // A simple, lightweight TMDb endpoint to check connectivity
        await axios.get(`https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`, { timeout: 3000 });
        return true;
    } catch (error) {
        console.warn('TMDb API not reachable or rate-limited. Falling back to pre-generated data.');
        return false;
    }
}

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
    const { startYear, endYear, language, difficulty } = req.query;

    if (!startYear || !endYear || !language || !difficulty) {
        return res.status(400).json({ error: 'A start year, end year, language, and difficulty must be provided.' });
    }

    // --- UPDATED: Attempt to use live API first, then fallback ---
    const useLiveApi = await isTmdbApiReachable();

    if (useLiveApi) {
        try {
            let voteCount = 1000;
            if (difficulty === 'easy') voteCount = 5000;
            if (difficulty === 'hard') voteCount = 200;

            const baseUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&language=${language}&sort_by=popularity.desc&include_adult=false&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31&vote_count.gte=${voteCount}`;
            
            const initialResponse = await axios.get(baseUrl);
            const totalPages = initialResponse.data.total_pages;
            
            if (totalPages === 0) {
                return res.status(404).json({ error: `No movies found for these settings. Try a wider range or easier difficulty.` });
            }
            const randomPage = Math.min(Math.ceil(Math.random() * totalPages), 500); // Limit to 500 pages for performance/relevance
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
            
            if (randomMovie.poster_path) {
                gameData.posterUrl = `https://image.tmdb.org/t/p/w500${randomMovie.poster_path}`;
            } else {
                gameData.posterUrl = null;
            }
            
            res.json(gameData);

        } catch (error) {
            console.error("Error in live /api/new-game (TMDb/Gemini):", error.response ? error.response.data : error.message);
            // Fallback to pre-generated if live API fails
            console.warn('Falling back to pre-generated quizzes due to live API error.');
            servePreGeneratedQuiz(req, res, preGeneratedQuizzes);
        }
    } else {
        // If live API is not reachable, immediately fallback
        servePreGeneratedQuiz(req, res, preGeneratedQuizzes);
    }
});

// --- NEW: Helper function to serve pre-generated quizzes ---
function servePreGeneratedQuiz(req, res, quizzesData) {
    const { difficulty } = req.query;

    if (!quizzesData || quizzesData.length === 0) {
        return res.status(503).json({ error: 'Pre-generated quiz data not available.' });
    }

    const difficultyGroup = quizzesData.find(group => group.difficulty === difficulty);

    if (!difficultyGroup || difficultyGroup.quizzes.length === 0) {
        // Fallback to a default if the requested difficulty isn't found
        const defaultDifficultyGroup = quizzesData.find(group => group.difficulty === 'medium') || quizzesData[0];
        if (defaultDifficultyGroup) {
            const randomQuiz = defaultDifficultyGroup.quizzes[Math.floor(Math.random() * defaultDifficultyGroup.quizzes.length)];
            console.log(`Served random quiz from fallback difficulty (${defaultDifficultyGroup.difficulty})`);
            return res.json(randomQuiz);
        } else {
            return res.status(503).json({ error: 'No pre-generated quizzes available at all.' });
        }
    }

    const randomQuiz = difficultyGroup.quizzes[Math.floor(Math.random() * difficultyGroup.quizzes.length)];
    console.log(`Served pre-generated quiz (Difficulty: ${difficulty}, Title: ${randomQuiz.title})`);
    res.json(randomQuiz);
}
// --- END NEW ---


app.get('/api/search', async (req, res) => {
    // For search suggestions, if TMDb is down, you might want to return an empty array
    // or use a very limited, static list of common movies if you have one.
    // For simplicity, we'll just return empty if not reachable, or proceed as usual.
    const { query } = req.query;
    if (!query || query.length < 2) {
        return res.json([]);
    }

    const useLiveApi = await isTmdbApiReachable(); // Check if TMDb is reachable for search too

    if (useLiveApi) {
        try {
            const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
            const response = await axios.get(url);
            const suggestions = response.data.results.map(movie => movie.title).slice(0, 5);
            res.json(suggestions);
        } catch (error) {
            console.error("Search API error:", error.message);
            // If search fails, simply return an empty array of suggestions.
            res.json([]);
        }
    } else {
        // If TMDb is not reachable, don't provide suggestions.
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`QuizFlix backend running on http://localhost:${PORT}`);
});