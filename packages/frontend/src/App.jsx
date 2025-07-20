import { useState, useEffect } from 'react';
import axios from 'axios';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useDebounce } from 'use-debounce';
import { FiSettings } from 'react-icons/fi';
import Select from 'react-select';

import './App.css';

// Custom styles object for react-select with final size adjustment
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

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/languages');
        const filteredLanguages = response.data.filter(lang => lang.english_name.length > 0);
        setSupportedLanguages(filteredLanguages);
      } catch (error) { console.error("Could not fetch languages", error); }
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
    const randomLang = selectedLanguages[Math.floor(Math.random() * selectedLanguages.length)];
    const languageCode = randomLang.value;
    const [startYear, endYear] = yearRange;
    
    setGameState('loading');
    setError(null);
    setSuggestions([]);

    try {
      const response = await axios.get(`http://localhost:3001/api/new-game?startYear=${startYear}&endYear=${endYear}&language=${languageCode}`);
      setClues(response.data.clues);
      setCorrectTitle(response.data.title);
      setPosterUrl(response.data.posterUrl);
      setCurrentClueIndex(0);
      setUserGuess('');
      setGameState('playing');
    } catch (err) {
      setError(err.response ? err.response.data.error : 'Could not connect to the server.');
      setGameState('idle');
    }
  };

  const checkGuess = (guess) => {
    if (guess.trim().toLowerCase() === correctTitle.toLowerCase()) {
      setGameState('correct');
    } else {
      if (currentClueIndex < clues.length - 1) {
        setCurrentClueIndex(currentClueIndex + 1);
      } else {
        setGameState('failed');
      }
    }
    setUserGuess('');
    setSuggestions([]);
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
      <div 
        className="background-poster" 
        style={{ backgroundImage: posterUrl ? `url(${posterUrl})` : 'none' }}
      />
      <div className="app-overlay" />
      
      <div className="quiz-card">
        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} aria-label="Settings"><FiSettings /></button>
        <h1>QuizFlix</h1>
        
        {gameState === 'idle' && (
          <div className="game-setup">
            <p className="current-setting-display">
              Movies from <strong>{yearRange[0]}-{yearRange[1]}</strong> in <strong>{selectedLanguages.map(l => l.label).join(', ') || 'Any Language'}</strong>
            </p>
            <button onClick={fetchNewGame} className="start-btn">Start New Game</button>
            {error && <p className="error-message">{error}</p>}
          </div>
        )}
        
        {gameState === 'loading' && <p className="loading-text">Loading your movie...</p>}

        {(gameState === 'playing' || gameState === 'failed' || gameState === 'correct') && (
          <div className="game-area">
            <div className="clue-box">
              <p><strong>Clue {currentClueIndex + 1} of {clues.length}:</strong></p>
              <p>{clues[currentClueIndex]}</p>
            </div>

            {gameState === 'playing' && (
              <div className="guess-container">
                <form onSubmit={handleFormSubmit} className="guess-form">
                  <input
                    type="text" value={userGuess} onChange={(e) => setUserGuess(e.target.value)}
                    placeholder="Enter your guess..." autoFocus autoComplete="off"
                  />
                  <button type="submit">Guess</button>
                </form>
                {suggestions.length > 0 && (
                  <ul className="suggestions-dropdown">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="skip-btn" onClick={() => setGameState('failed')}>Reveal Answer</button>
              </div>
            )}
            
            {gameState === 'correct' && (
              <div className="result correct">
                <h2>Correct! 🎉</h2>
                <p>The movie was: <strong>{correctTitle}</strong></p>
                <button onClick={() => { setGameState('idle'); setPosterUrl(''); }}>Play Again</button>
              </div>
            )}
            
            {gameState === 'failed' && (
              <div className="result failed">
                <h2>Game Over! 😥</h2>
                <p>The correct movie was: <strong>{correctTitle}</strong></p>
                <button onClick={() => { setGameState('idle'); setPosterUrl(''); }}>Try Another Movie</button>
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
              <label>Movie Release Year Range:</label>
              <strong>{yearRange[0]} &mdash; {yearRange[1]}</strong>
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