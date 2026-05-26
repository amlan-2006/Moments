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

    // Updated to accept the optional image parameter we discussed earlier
    sendMessage: (roomId, message, sender, senderId, image = null) => {
        socket.emit('send-message', {
            roomId,
            message,
            sender,
            senderId,
            image // This will now be sent to the server
        });
    },

    updateMusicState: (roomId, { playing, videoId, currentTime }) => {
        socket.emit('music-state-change', { roomId, playing, videoId, currentTime });
    },

    changeTrack: (roomId, { videoId, title, artist }) => {
        socket.emit('music-track-change', { roomId, videoId, title, artist });
    }
};