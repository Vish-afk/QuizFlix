# QuizFlix

An AI-powered movie trivia game that challenges your cinematic knowledge with dynamically generated clues.

## About The Project

QuizFlix is a web-based movie guessing game where players are given a series of clues to guess a movie title. What makes it unique is its use of the Google Gemini API to generate clever, human-like clues on the fly, ensuring a different experience every time. The project is a full-stack application built with a modern, cinematic UI, featuring a dynamic background that changes with each new movie.

## Features

- **AI-Powered Clues:** Integrates the Google Gemini API to generate creative and challenging clues for any movie.
- **Vast Movie Library:** Uses the TMDB API to pull from thousands of movies, ensuring endless gameplay.
- **Advanced Game Settings:** A polished settings modal allows players to customize their game:
  - **Difficulty Levels:** Choose between Easy, Medium, and Hard to get more or less popular movies.
  - **Year Range:** A dual-handle slider to select a specific range of release years.
  - **Multi-Language Support:** Play with movies and clues from dozens of different languages.
- **Dynamic Theming:** The app background features a blurred version of the current movie's poster, adding to the immersive experience.
- **Smart Autocomplete:** The guess input provides real-time movie suggestions from the TMDB API to help you lock in your answer.
- **Fully Responsive:** A clean, modern UI that works seamlessly on both desktop and mobile devices.

## Tech Stack

### Frontend
- **React** (with Vite)
- **CSS3** for custom styling and animations
- **Axios** for API requests
- **Libraries:** `react-select`, `rc-slider`, `react-icons`, `use-debounce`

### Backend
- **Node.js**
- **Express.js**

### APIs
- **Google Gemini API:** For generating AI clues.
- **The Movie Database (TMDB) API:** For all movie-related data.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You'll need the following installed on your machine:
- [Node.js](https://nodejs.org/) (which includes npm)
- [Git](https://git-scm.com/)

You will also need API keys from:
- [The Movie Database (TMDB)](https://www.themoviedb.org/signup)
- [Google AI Studio (for Gemini)](https://ai.google.dev/)

### Installation

1. **Clone the repository:**
    ```sh
    git clone [https://github.com/Vish-afk/QuizFlix.git](https://github.com/Vish-afk/QuizFlix.git)
    cd QuizFlix
    ```

2. **Install NPM packages:**
    This project is a monorepo using npm workspaces. This command will install dependencies for both the frontend and backend.
    ```sh
    npm install
    ```

3. **Set up your environment variables:**
    - Navigate to the backend folder: `cd packages/backend`
    - Create a new file named `.env`
    - Add your API keys to this file:
      ```
      TMDB_API_KEY=YOUR_TMDB_API_KEY_HERE
      GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
      ```

4. **Run the development server:**
    - Navigate back to the root `QuizFlix` folder: `cd ../..`
    - Run the following command to start both the frontend and backend servers concurrently:
      ```sh
      npm run dev
      ```
    - Open [http://localhost:5173](http://localhost:5173) to view the app in your browser.

## Acknowledgments

- Hat tip to the teams behind the [TMDB API](https://www.themoviedb.org/documentation/api) and [Google Gemini](https://ai.google.dev/) for their incredible services.
