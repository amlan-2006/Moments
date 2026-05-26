// src/sockets/Roomhandle.js

export default (io, socket, rooms) => {

    // --- 1. JOIN ROOM ---
    socket.on('join-room', ({ roomId, username, role }) => {
        socket.join(roomId);

        // Initialize room entry if it doesn't exist yet
        if (!rooms[roomId]) {
            rooms[roomId] = {
                users: [],
                playback: { playing: false, currentTime: 0, audioUrl: null, title: '', artist: '', thumbnail: '' },
                currentTrack: null
            };
        }

        // Add user if they aren't already in the array
        if (!rooms[roomId].users.some(u => u.id === socket.id)) {
            rooms[roomId].users.push({ id: socket.id, username, role });
        }

        // Sync the current room state back to the user who just joined
        socket.emit('room-state', rooms[roomId]);

        // Alert the partner inside that room
        socket.to(roomId).emit('user-joined', { username });
        io.to(roomId).emit('room-users-updated', rooms[roomId].users);

        console.log(`👤 ${username} joined room: ${roomId}`);
    });

    // --- 2. REAL-TIME CHAT MESSAGING ---
    socket.on('send-message', ({ roomId, message, sender }) => {
        const msgPayload = {
            text: message,
            sender,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
        };

        // Emit message to everyone inside the room immediately
        io.to(roomId).emit('receive-message', msgPayload);
    });

    // --- 3. LIVE MUSIC SYNCHRONIZATION (Play/Pause/Seek) ---
    // FIXED: Listens explicitly to 'update-music-state' to match frontend socketService mapping
    socket.on('update-music-state', (payload) => {
        // Handle both flattened structures or destructured room wrapper payloads safely
        const roomId = payload.roomId;
        const stateData = payload.playback || payload;

        if (rooms[roomId]) {
            // Update server's source-of-truth using unified audio fields
            rooms[roomId].playback = {
                playing: stateData.playing,
                currentTime: stateData.currentTime,
                audioUrl: stateData.audioUrl,
                title: stateData.title || rooms[roomId].playback.title,
                artist: stateData.artist || rooms[roomId].playback.artist,
                thumbnail: stateData.thumbnail || rooms[roomId].playback.thumbnail
            };

            // Broadcast to everyone else in the room (excludes sender)
            socket.to(roomId).emit('music-state-update', rooms[roomId].playback);
        }
    });

    // --- 4. TRACK CHANGE (Admin or Client picks a new song) ---
    // FIXED: Listens explicitly to 'change-track' to match frontend socketService mapping
    socket.on('change-track', (payload) => {
        const roomId = payload.roomId;
        const trackData = payload.track || payload;

        if (rooms[roomId]) {
            const updatedPlayback = {
                playing: true,
                currentTime: 0, // Reset timeline to 0 for a fresh track
                audioUrl: trackData.audioUrl,
                title: trackData.title,
                artist: trackData.artist,
                thumbnail: trackData.thumbnail
            };

            rooms[roomId].playback = updatedPlayback;
            rooms[roomId].currentTrack = trackData; // Update main track cache slot

            // Broadcast to EVERYONE in the room for an immediate hardware lock
            io.to(roomId).emit('music-track-update', updatedPlayback);
            console.log(`🎵 Track changed in room ${roomId}: ${trackData.title} by ${trackData.artist}`);
        }
    });

    // --- 5. DISCONNECT CLEANUP LOGIC ---
    socket.on('disconnecting', () => {
        for (const roomId of socket.rooms) {
            if (rooms[roomId]) {
                // Drop the disconnecting user out of the array
                rooms[roomId].users = rooms[roomId].users.filter(u => u.id !== socket.id);

                // Memory optimization: Clean up completely if empty
                if (rooms[roomId].users.length === 0) {
                    delete rooms[roomId];
                    console.log(`🗑️ Room ${roomId} is empty. Memory wiped.`);
                } else {
                    io.to(roomId).emit('room-users-updated', rooms[roomId].users);
                    socket.to(roomId).emit('user-left', `Your partner disconnected.`);
                }
            }
        }
    });
};