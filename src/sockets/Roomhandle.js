// src/sockets/Roomhandle.js

export default (io, socket, rooms) => {

    // --- 1. JOIN ROOM ---
    socket.on('join-room', ({ roomId, username, role }) => {
        socket.join(roomId);

        // Initialize room entry if it doesn't exist yet
        if (!rooms[roomId]) {
            rooms[roomId] = {
                users: [],
                playback: { playing: false, currentTime: 0, videoId: null },
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
    socket.on('music-state-change', ({ roomId, playing, videoId, currentTime }) => {
        if (rooms[roomId]) {
            // Update server's source-of-truth
            rooms[roomId].playback = {
                ...rooms[roomId].playback,
                playing,
                videoId,
                currentTime
            };

            // Broadcast to everyone else in the room (excludes sender)
            socket.to(roomId).emit('music-state-update', rooms[roomId].playback);
        }
    });

    // --- 4. TRACK CHANGE (Admin picks a new song) ---
    socket.on('music-track-change', ({ roomId, videoId, title, artist }) => {
        if (rooms[roomId]) {
            rooms[roomId].playback = {
                playing: true,
                videoId,
                currentTime: 0, // Reset timeline to 0
                title,
                artist
            };
            rooms[roomId].currentTrack = { videoId, title, artist }; // Update main track slot

            // Broadcast to EVERYONE including the sender for full sync
            io.to(roomId).emit('music-track-update', rooms[roomId].playback);
            console.log(`🎵 Track changed in room ${roomId}: ${title} by ${artist}`);
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