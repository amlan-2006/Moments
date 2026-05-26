// src/index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import ytsr from 'ytsr';
import registerRoomHandlers from './sockets/Roomhandle.js';

const app = express();

const renderUrl = process.env.RENDER_EXTERNAL_URL;

const allowedOrigins = [
    "http://localhost:5173",
    renderUrl // Render sets this variable automatically!
].filter(Boolean);

// Allow your React app to connect to this server
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl) 
        // or if it's in our allowed list
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

// --- YouTube Search API Endpoint ---
app.get('/api/youtube-search', async (req, res) => {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
        return res.json({ results: [] });
    }

    try {
        const searchResults = await ytsr(query + ' song', { limit: 10 });

        // Filter only video results (not channels, playlists, etc.)
        const videos = searchResults.items
            .filter(item => item.type === 'video')
            .slice(0, 8)
            .map(item => ({
                videoId: item.id,
                title: item.title,
                artist: item.author?.name || 'Unknown Artist',
                thumbnail: item.bestThumbnail?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
                duration: item.duration || '0:00',
            }));

        res.json({ results: videos });
    } catch (err) {
        console.error('YouTube search error:', err.message);
        res.status(500).json({ results: [], error: 'Search failed. Please try again.' });
    }
});

const server = http.createServer(app);

// Initialize Socket.io with robust CORS settings
const io = new Server(server, {
    cors: {
        origin: allowedOrigins, // Use the same dynamic array you defined above
        methods: ["GET", "POST"]
    }
});

// Volatile in-memory room storage (Shared state across the server)
const rooms = {};

// Handle incoming connection and pass socket details to the isolated handler file
io.on('connection', (socket) => {
    console.log(`⚡ Connection established: ${socket.id}`);

    // Register all room, chat, and sync handlers from our separate file
    registerRoomHandlers(io, socket, rooms);
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Serve static files from your React build folder
app.use(express.static(path.join(__dirname, 'client/dist')));

// 2. Catch-all: If a request doesn't match an API route or a static file,
// send the React index.html. This is vital for React Router or SPA navigation.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server listening smoothly on port ${PORT}`);
});