import { io } from 'socket.io-client';

// In production, an empty string tells the client to use 
// the same domain/origin that served the application.
const SOCKET_URL = '';

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
});

export const socketService = {
    connect: () => {
        if (!socket.connected) socket.connect();
    },

    disconnect: () => {
        if (socket.connected) socket.disconnect();
    },

    joinRoom: (roomId, username, role) => {
        socket.emit('join-room', { roomId, username, role });
    },

    sendMessage: (roomId, message, sender, senderId, image = null) => {
        socket.emit('send-message', {
            roomId,
            message,
            sender,
            senderId,
            image
        });
    },

    // FIXED: Maps to the correct keys used by your music player component and backend
    updateMusicState: (roomId, { playing, audioUrl, currentTime, title, artist, thumbnail }) => {
        socket.emit('update-music-state', {
            roomId,
            playing,
            audioUrl,
            currentTime,
            title,
            artist,
            thumbnail
        });
    },

    // FIXED: Captures audioUrl and thumbnail cleanly, matching your component actions
    changeTrack: (roomId, { audioUrl, title, artist, thumbnail }) => {
        socket.emit('change-track', {
            roomId,
            audioUrl,
            title,
            artist,
            thumbnail
        });
    }
};