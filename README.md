# Table Enable

A single-page React app that displays a live SVG room map with real-time table and seat occupancy updates via WebSocket.

## Features

- **Live Room Map**: Responsive SVG floor plan with real-time occupancy visualization
- **WebSocket Integration**: Auto-reconnecting WebSocket client with exponential backoff
- **Status Visualization**: Color-coded tables and seats (green=empty, red=occupied, gray=unknown)
- **Confidence Indicators**: Opacity reflects model confidence (0.3-1.0 range)
- **Accessibility**: Semantic HTML, ARIA labels, and keyboard navigation support
- **Dark Mode**: Automatic system theme detection
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment**:

   ```bash
   cp env.example .env
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Open browser**: Navigate to `http://localhost:3000`

## Testing with Mock Backend

To test the WebSocket functionality without a real backend:

1. **Start test HTTP server** (in a new terminal):

   ```bash
   node test-server.js
   ```

2. **Start test WebSocket server** (in another terminal):

   ```bash
   node test-websocket.js
   ```

3. **Update environment** (edit `.env`):

   ```
   VITE_BACKEND_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8001
   ```

4. **Restart dev server**:
   ```bash
   npm run dev
   ```

## Data Format

### WebSocket Messages

The app expects WebSocket messages in this format:

```json
{
  "people_count": 12,
  "fps": 30,
  "tables": [{ "id": "table-1", "status": "occupied", "confidence": 0.92 }],
  "seats": [{ "id": "t1", "status": "empty", "confidence": 0.85 }]
}
```

### Room API

The app fetches room geometry from `GET /api/room`:

```json
{
  "room_id": "room-1",
  "name": "Demo Room",
  "size": { "w": 800, "h": 500 },
  "tables": [
    { "id": "table-1", "polygon": [[x,y], [x,y], ...] }
  ],
  "seats": [
    { "id": "t1", "polygon": [[x,y], [x,y], ...] }
  ]
}
```

## Environment Variables

- `VITE_BACKEND_URL`: Backend API URL (default: `http://localhost:8000`)
- `VITE_WS_URL`: WebSocket URL (default: `ws://localhost:8000/ws/occupancy`)

## Status Colors

- **Green** (`#22c55e`): Empty/available
- **Red** (`#ef4444`): Occupied/in-use
- **Gray** (`#9ca3af`): Unknown status

Opacity reflects model confidence (0.3-1.0 range).

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Architecture

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **WebSocket**: Real-time communication
- **SVG**: Scalable vector graphics for maps

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
