# 3D Surfer

A fun 3D surfing game where you control a surfer and pop beach balls while riding waves in a standing-wave pool.

## Features

- 3D graphics using Three.js
- Responsive design that works on both desktop and mobile
- Touch and keyboard controls
- Dynamic wave system
- Realistic surfing physics
- Score tracking based on ball popping

## Controls

- Desktop: Use arrow keys to move the surfer (left/right, forward/back)
- Mobile: Touch and drag to control the surfer's movement

## Getting Started

This is a Vite-based application.

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `https://localhost:8080`

## Project Structure

```
src/
├── game/              # Game-specific code
│   ├── main.js       # Main game initialization and loop
│   ├── Pool.js       # Pool class for wave pool physics
│   └── Surfer.js     # Surfer class for player physics
├── styles/           # CSS styles
│   └── main.css      # Main stylesheet
├── assets/           # Static assets (images, models, etc.)
└── index.html        # Main HTML file with game UI
```

## Technologies Used

- Vite for build tooling and development server
- Three.js for 3D graphics
- ES6 Modules for code organization
- CSS3 for styling and animations
- HTML5 for game interface

## Development

- `npm run dev` - Start the development server with hot module replacement
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally

## License

MIT License 
