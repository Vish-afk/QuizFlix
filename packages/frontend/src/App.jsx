// app.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useDebounce } from 'use-debounce';
import { FiSettings } from 'react-icons/fi';
import Select from 'react-select';

import './App.css';

const customSelectStyles = {
    control: (p) => ({ ...p, backgroundColor: '#2a2a2a', borderColor: '#444', minHeight: '50px', boxShadow: 'none', '&:hover': { borderColor: '#f5c518' }, }),
    menu: (p) => ({ ...p, backgroundColor: '#2a2a2a' }),
    option: (p, { isFocused }) => ({ ...p, backgroundColor: isFocused ? '#f5c518' : '#2a2a2a', color: isFocused ? '#121212' : '#eaeaea', }),
    multiValue: (p) => ({ ...p, backgroundColor: '#f5c518' }),
    multiValueLabel: (p) => ({ ...p, color: '#121212', fontWeight: 'bold' }),
    multiValueRemove: (p) => ({ ...p, color: '#121212', ':hover': { backgroundColor: '#e0b410', color: '#121212' } }),
    input: (p) => ({ ...p, color: '#eaeaea' }),
    placeholder: (p) => ({...p, color: '#888'}),
};

function App() {
    const [gameState, setGameState] = useState('idle');
    const [clues, setClues] = useState([]);
    const [correctTitle, setCorrectTitle] = useState('');
    const [currentClueIndex, setCurrentClueIndex] = useState(0);
    const [userGuess, setUserGuess] = useState('');
    const [error, setError] = useState(null);
    const [yearRange, setYearRange] = useState([1990, 2025]);
    const [suggestions, setSuggestions] = useState([]);
    const [debouncedGuess] = useDebounce(userGuess, 300);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const [selectedLanguages, setSelectedLanguages] = useState([{ value: 'en', label: 'English' }]);
    const [posterUrl, setPosterUrl] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [isFallbackMode, setIsFallbackMode] = useState(false);
    const [showPoster, setShowPoster] = useState(false);

    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/languages');
                const filteredLanguages = response.data.filter(lang => lang.english_name.length > 0);
                setSupportedLanguages(filteredLanguages);
            } catch (error) {
                console.error("Could not fetch languages", error);
            }
        };
        fetchLanguages();
    }, []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (debouncedGuess.length > 1) {
                try {
                    const response = await axios.get(`http://localhost:3001/api/search?query=${debouncedGuess}`);
                    setSuggestions(response.data);
                } catch (error) {
                    setSuggestions([]);
                }
            } else {
                setSuggestions([]);
            }
        };
        fetchSuggestions();
    }, [debouncedGuess]);

    const fetchNewGame = async () => {
        if (!selectedLanguages || selectedLanguages.length === 0) {
            setError('Please select at least one language in settings.');
            setGameState('idle');
            return;
        }
        const randomLang = selectedLanguages.length > 0 ? selectedLanguages.at(Math.floor(Math.random() * selectedLanguages.length)) : { value: 'en' };
        const languageCode = randomLang.value;
        const [startYear, endYear] = yearRange;

        setGameState('loading');
        setError(null);
        setSuggestions([]);
        setIsFallbackMode(false);
        setPosterUrl('');
        setShowPoster(false);

        try {
            const response = await axios.get(`http://localhost:3001/api/new-game?startYear=${startYear}&endYear=${endYear}&language=${languageCode}&difficulty=${difficulty}`);
            setClues(response.data.clues);
            setCorrectTitle(response.data.title);
            setPosterUrl(response.data.posterUrl);
            setCurrentClueIndex(0);
            setUserGuess('');
            setGameState('playing');
        } catch (err) {
            console.error("Failed to fetch new game:", err.response ? err.response.data : err.message);
            setError(err.response ? err.response.data.error : 'Could not connect to the server or generate a new game.');
            setGameState('idle');
            setIsFallbackMode(true);
        }
    };

    const checkGuess = (guess) => {
        if (guess.trim().toLowerCase() === correctTitle.toLowerCase()) {
            setGameState('correct');
            setShowPoster(true);
        } else {
            if (currentClueIndex < clues.length - 1) {
                setCurrentClueIndex(currentClueIndex + 1);
            } else {
                setGameState('failed'); // Ran out of clues and guess was wrong
                setShowPoster(true);
            }
        }
        setUserGuess('');
        setSuggestions([]);
    };

    // NEW: Handle "Give Up" functionality
    const handleGiveUp = () => {
        setGameState('failed'); // Immediately set game state to failed
        setShowPoster(true); // Show poster
        setUserGuess(''); // Clear any pending guess
        setSuggestions([]); // Clear suggestions
    };

    const handleFormSubmit = (e) => { e.preventDefault(); checkGuess(userGuess); };
    const handleSuggestionClick = (suggestion) => { setUserGuess(suggestion); checkGuess(suggestion); };
    useEffect(() => { if (isSettingsOpen) { document.body.classList.add('modal-open'); } else { document.body.classList.remove('modal-open'); } }, [isSettingsOpen]);

    const languageOptions = supportedLanguages.map(lang => ({
        value: lang.iso_639_1,
        label: lang.english_name
    }));

    return (
        <div className="app-container">
            <div className="app-overlay" />

            <div className="quiz-card">
                <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} aria-label="Settings"><FiSettings /></button>
                <h1>QuizFlix</h1>

                {gameState === 'idle' && (
                    <div className="game-setup">
                        <p className="current-setting-display">
                            Movies from <strong>{yearRange?.[0]}-{yearRange?.[1]}</strong> in <strong>{selectedLanguages.map(l => l.label).join(', ')}</strong> ({difficulty})
                        </p>
                        {isFallbackMode && (
                            <p className="warning-message">
                                Using pre-generated quizzes (API limits reached). Settings for year/language may not apply.
                            </p>
                        )}
                        <button onClick={fetchNewGame} className="start-btn">Start New Game</button>
                        {error && <p className="error-message">{error}</p>}
                    </div>
                )}

                {gameState === 'loading' && <p className="loading-text">Loading your movie...</p>}

                {(gameState === 'playing' || gameState === 'failed' || gameState === 'correct') && (
                    <div className="game-area">
                        {isFallbackMode && (
                            <p className="warning-message small">
                                Using pre-generated data.
                            </p>
                        )}
                        <p className="clue-counter">Clue {currentClueIndex + 1} of {clues.length}</p>
                        <div className="clue-box">
                            <strong>Clue:</strong> {clues?.[currentClueIndex]}
                        </div>

                        <form onSubmit={handleFormSubmit} className="guess-form">
                            <input
                                type="text"
                                value={userGuess}
                                onChange={(e) => setUserGuess(e.target.value)}
                                placeholder="Your guess..."
                                disabled={gameState !== 'playing'}
                            />
                            <button type="submit" disabled={gameState !== 'playing'}>Guess</button>
                        </form>

                        {suggestions.length > 0 && userGuess.length > 1 && (
                            <ul className="suggestions-dropdown">
                                {suggestions.map((s, i) => (
                                    <li key={i} onClick={() => handleSuggestionClick(s)}>{s}</li>
                                ))}
                            </ul>
                        )}

                        {/* UPDATED: Give Up button */}
                        {gameState === 'playing' && (
                            <button onClick={handleGiveUp} className="skip-btn give-up-btn">
                                Give Up
                            </button>
                        )}

                        {(gameState === 'correct' || gameState === 'failed') && (
                            <div className="game-over-results">
                                {gameState === 'correct' ? (
                                    <div className="result correct">
                                        <h2>Correct!</h2>
                                        <p>You guessed "{correctTitle}"!</p>
                                    </div>
                                ) : (
                                    <div className="result failed">
                                        <h2>Game Over!</h2>
                                        <p>The movie was: "{correctTitle}"</p>
                                    </div>
                                )}

                                {showPoster && posterUrl && (
                                    <img src={posterUrl} alt={correctTitle} className="movie-result-poster" />
                                )}

                                <button onClick={fetchNewGame} className="start-btn">Play Again</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isSettingsOpen && (
                <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setIsSettingsOpen(false)} aria-label="Close Settings">&times;</button>
                        <h2>Settings</h2>

                        <div className="setting-item">
                            <label>Difficulty:</label>
                            <div className="difficulty-selector">
                                <button
                                    className={`difficulty-btn ${difficulty === 'easy' ? 'active' : ''}`}
                                    onClick={() => setDifficulty('easy')}>Easy</button>
                                <button
                                    className={`difficulty-btn ${difficulty === 'medium' ? 'active' : ''}`}
                                    onClick={() => setDifficulty('medium')}>Medium</button>
                                <button
                                    className={`difficulty-btn ${difficulty === 'hard' ? 'active' : ''}`}
                                    onClick={() => setDifficulty('hard')}>Hard</button>
                            </div>
                        </div>

                        <div className="setting-item">
                            <label>Movie Release Year Range:</label>
                            <strong>{yearRange?.[0]} &mdash; {yearRange?.[1]}</strong>
                            <Slider range min={1890} max={2025} value={yearRange} onChange={(newRange) => setYearRange(newRange)} allowCross={false} className="year-slider" />
                        </div>

                        <div className="setting-item">
                            <label htmlFor="language-select">Movie Languages:</label>
                            <Select
                                id="language-select" isMulti options={languageOptions}
                                value={selectedLanguages}
                                onChange={(selectedOptions) => setSelectedLanguages(selectedOptions || [])}
                                styles={customSelectStyles} className="react-select-container"
                                placeholder="Select languages..."
                            />
                        </div>

                        <button className="done-btn" onClick={() => setIsSettingsOpen(false)}>Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;