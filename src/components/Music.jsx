import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { socket, socketService } from '../sockets/clientside'; // Adjust path if needed

// --- Sub-Components ---

const VisualizerBar = ({ heightClass, isPlaying }) => (
    <motion.div
        animate={isPlaying ? { height: ["20%", "100%", "40%", "80%", "30%", "100%"] } : { height: "20%" }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", repeatType: "mirror" }}
        className={`w-1.5 bg-rose-400 rounded-full ${heightClass}`}
        style={{ originY: 1 }}
    />
);

const SongItem = ({ title, artist, audioUrl, thumbnail, onPlay, isActive }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onPlay({ audioUrl, title, artist, thumbnail })}
        className={`flex items-center gap-3 p-3 rounded-2xl backdrop-blur-sm transition-colors group cursor-pointer border shadow-sm ${isActive
            ? 'bg-rose-50/70 border-rose-200/60 shadow-rose-100/40'
            : 'bg-white/40 hover:bg-white/70 border-transparent hover:border-white/50'
            }`}
    >
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm bg-zinc-100">
            <img
                src={thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150'}
                alt={title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150'; }}
            />
        </div>
        <div className="flex-1 overflow-hidden">
            <h4 className={`font-bold text-sm truncate ${isActive ? 'text-rose-600' : 'text-zinc-800'}`}>{title}</h4>
            <p className="text-xs text-zinc-500 truncate">{artist}</p>
        </div>
        {isActive ? (
            <div className="flex items-center gap-0.5 h-5">
                <motion.div animate={{ height: ["30%", "100%", "50%"] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-rose-400 rounded-full" style={{ originY: 1 }} />
                <motion.div animate={{ height: ["60%", "30%", "100%"] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-rose-400 rounded-full" style={{ originY: 1 }} />
                <motion.div animate={{ height: ["40%", "80%", "20%"] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-rose-400 rounded-full" style={{ originY: 1 }} />
            </div>
        ) : (
            <button className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-rose-500">
                <span className="material-symbols-outlined text-sm">play_arrow</span>
            </button>
        )}
    </motion.div>
);

const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

const SONG_LIBRARY = [
    { audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', title: 'Acoustic Sunrise', artist: 'Chill Vibes', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' },
    { audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', title: 'Lofi Study', artist: 'Beat Maker', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' },
    { audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', title: 'Midnight Drive', artist: 'Synthwave', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80' }
];

// --- Main Music Component ---

const Music = ({ roomState }) => {
    const audioRef = useRef(null);
    const isRemoteAction = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentSong, setCurrentSong] = useState(SONG_LIBRARY[0]);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // --- 1. Live iTunes Network Fetch ---
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=6`);
                const data = await response.json();

                const formattedSongs = data.results.map(track => ({
                    audioUrl: track.previewUrl,
                    title: track.trackName,
                    artist: track.artistName,
                    thumbnail: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://via.placeholder.com/400'
                }));
                setSearchResults(formattedSongs);
            } catch (error) {
                console.error("iTunes Search Failed:", error);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // --- 2. WebSocket Listeners (FIXED INfINITE LOOP & ALBUM ART) ---
    useEffect(() => {
        if (!audioRef.current) return;

        const handleMusicStateUpdate = (playback) => {
            if (!playback || !playback.audioUrl) return;

            // CRITICAL FIX: If this update is for the song we are already playing, do NOT swap the source string
            if (audioRef.current.src !== playback.audioUrl) {
                isRemoteAction.current = true;
                setCurrentSong({
                    audioUrl: playback.audioUrl,
                    title: playback.title || 'Shared Song',
                    artist: playback.artist || 'Online',
                    thumbnail: playback.thumbnail || 'https://via.placeholder.com/400'
                });
                audioRef.current.src = playback.audioUrl;
            }

            // Sync Time cleanly without stuttering
            if (playback.currentTime !== undefined) {
                if (Math.abs(audioRef.current.currentTime - playback.currentTime) > 2.5) {
                    audioRef.current.currentTime = playback.currentTime;
                }
            }

            // Sync Play/Pause without redundancy
            if (playback.playing) {
                if (audioRef.current.paused) audioRef.current.play().catch(() => { });
                setIsPlaying(true);
            } else {
                if (!audioRef.current.paused) audioRef.current.pause();
                setIsPlaying(false);
            }

            setTimeout(() => { isRemoteAction.current = false; }, 300);
        };

        const handleTrackUpdate = (playback) => {
            if (!playback || !playback.audioUrl) return;

            // CRITICAL FIX: Block updating source if it's already set to this track
            if (audioRef.current.src === playback.audioUrl) return;

            isRemoteAction.current = true;
            setCurrentSong({
                audioUrl: playback.audioUrl,
                title: playback.title || 'Shared Song',
                artist: playback.artist || 'Online',
                thumbnail: playback.thumbnail || 'https://via.placeholder.com/400'
            });

            audioRef.current.src = playback.audioUrl;
            audioRef.current.play().catch(() => { });

            setIsPlaying(true);
            setCurrentTime(0);
            setTimeout(() => { isRemoteAction.current = false; }, 300);
        };

        const handleRoomState = (state) => {
            if (state && state.playback && state.playback.audioUrl) {
                if (audioRef.current.src === state.playback.audioUrl) return;

                isRemoteAction.current = true;
                setCurrentSong({
                    audioUrl: state.playback.audioUrl,
                    title: state.playback.title || 'Shared',
                    artist: state.playback.artist || '',
                    thumbnail: state.playback.thumbnail || 'https://via.placeholder.com/400'
                });

                audioRef.current.src = state.playback.audioUrl;
                audioRef.current.currentTime = state.playback.currentTime || 0;

                if (state.playback.playing) {
                    audioRef.current.play().catch(() => { });
                    setIsPlaying(true);
                }
                setTimeout(() => { isRemoteAction.current = false; }, 300);
            }
        };

        socket.on('music-state-update', handleMusicStateUpdate);
        socket.on('music-track-update', handleTrackUpdate);
        socket.on('room-state', handleRoomState);

        return () => {
            socket.off('music-state-update', handleMusicStateUpdate);
            socket.off('music-track-update', handleTrackUpdate);
            socket.off('room-state', handleRoomState);
        };
    }, []); // Removed [currentSong.audioUrl] dependency array lock to keep logic decoupled from fast state changes

    // --- 3. Local Controls ---

    const handlePlayPause = useCallback(() => {
        if (!audioRef.current || !currentSong.audioUrl) return;

        const newPlaying = !isPlaying;
        if (newPlaying) {
            audioRef.current.play().catch(() => { });
        } else {
            audioRef.current.pause();
        }
        setIsPlaying(newPlaying);

        if (roomState && !isRemoteAction.current) {
            socketService.updateMusicState(roomState.id, {
                playing: newPlaying,
                audioUrl: currentSong.audioUrl,
                currentTime: audioRef.current.currentTime,
                title: currentSong.title,
                artist: currentSong.artist,
                thumbnail: currentSong.thumbnail
            });
        }
    }, [isPlaying, roomState, currentSong]);

    const handleSeek = useCallback((e) => {
        if (!audioRef.current || duration === 0) return;
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        const seekTime = fraction * duration;

        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);

        if (roomState && !isRemoteAction.current) {
            socketService.updateMusicState(roomState.id, {
                playing: isPlaying,
                audioUrl: currentSong.audioUrl,
                currentTime: seekTime,
                title: currentSong.title,
                artist: currentSong.artist,
                thumbnail: currentSong.thumbnail
            });
        }
    }, [duration, isPlaying, roomState, currentSong]);

    const handlePlaySong = useCallback((song) => {
        if (!audioRef.current) return;

        setCurrentSong(song);
        audioRef.current.src = song.audioUrl;
        audioRef.current.play().catch(() => { });

        setIsPlaying(true);
        setCurrentTime(0);

        if (roomState) {
            socketService.changeTrack(roomState.id, {
                audioUrl: song.audioUrl,
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail
            });
        }
    }, [roomState]);

    // --- 4. Audio Element Listeners ---
    const handleTimeUpdate = () => {
        if (audioRef.current && !isRemoteAction.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="w-full font-sans pb-32 pt-8 px-4 flex flex-col items-center">
            <audio
                ref={audioRef}
                src={currentSong.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md mx-auto flex flex-col items-center relative"
            >
                {/* Search Bar */}
                <div className="w-full relative mb-6 z-50">
                    <div className={`flex items-center bg-white/50 backdrop-blur-md border ${isSearchFocused ? 'border-rose-300 shadow-md' : 'border-white/60 shadow-sm'} rounded-full px-4 py-3 transition-all`}>
                        <span className="material-symbols-outlined text-zinc-400 mr-2">search</span>
                        <input
                            type="text"
                            placeholder="Search songs or artists online..."
                            className="bg-transparent border-none outline-none w-full text-zinc-700 placeholder-zinc-400 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                        />
                        {isSearching ? (
                            <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-rose-400">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </div>

                    {/* Search Dropdown */}
                    {isSearchFocused && searchQuery && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-14 left-0 w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white p-2 z-50 max-h-64 overflow-y-auto"
                        >
                            {searchResults.length > 0 ? (
                                searchResults.map((song, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-2 hover:bg-rose-50/60 rounded-xl cursor-pointer transition-colors border-b border-zinc-50 last:border-none"
                                        onClick={() => { handlePlaySong(song); setSearchQuery(""); }}
                                    >
                                        <img
                                            src={song.thumbnail}
                                            alt={song.title}
                                            className="w-10 h-10 rounded-lg object-cover shadow-inner bg-zinc-100"
                                            referrerPolicy="no-referrer"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                        />
                                        <div className="overflow-hidden flex-1">
                                            <h4 className="text-sm font-bold text-zinc-800 truncate">{song.title}</h4>
                                            <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                                        </div>
                                    </div>
                                ))
                            ) : !isSearching && (
                                <div className="p-4 text-center text-sm text-zinc-500">No tracks found.</div>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* Live Player Card */}
                <section className="w-full bg-white/40 backdrop-blur-xl rounded-[40px] p-6 shadow-xl shadow-rose-100/30 border border-white flex flex-col items-center mb-8 relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-200/40 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-200/40 rounded-full blur-3xl"></div>

                    {/* Main Album Art Wrapper */}
                    <div className="relative w-56 h-56 mb-8 mt-4 rounded-3xl overflow-hidden shadow-md bg-zinc-200 flex items-center justify-center">
                        <img
                            src={currentSong.thumbnail || 'https://via.placeholder.com/400'}
                            className="w-full h-full object-cover relative z-10"
                            alt={currentSong.title || "Album Art"}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                console.log("Cover Art load fallback triggered.");
                                e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400';
                            }}
                        />
                    </div>

                    {/* Song Info */}
                    <div className="text-center mb-6 z-10 w-full px-4">
                        <h2 className="text-2xl font-bold text-zinc-800 mb-1 truncate">{currentSong.title}</h2>
                        <p className="text-rose-400 font-semibold text-sm truncate">{currentSong.artist}</p>
                    </div>

                    {/* Visualizer & Progress */}
                    <div className="w-full z-10 mb-8">
                        <div className="flex justify-center items-end gap-1.5 h-10 mb-4">
                            <VisualizerBar heightClass="h-4" isPlaying={isPlaying} />
                            <VisualizerBar heightClass="h-7" isPlaying={isPlaying} />
                            <VisualizerBar heightClass="h-10" isPlaying={isPlaying} />
                            <VisualizerBar heightClass="h-6" isPlaying={isPlaying} />
                            <VisualizerBar heightClass="h-5" isPlaying={isPlaying} />
                        </div>

                        <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden cursor-pointer relative" onClick={handleSeek}>
                            <motion.div
                                className="h-full bg-rose-400 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                                transition={{ ease: "linear", duration: 0.1 }}
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[10px] font-bold text-zinc-500">{formatTime(currentTime)}</span>
                            <span className="text-[10px] font-bold text-zinc-500">{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-8 w-full z-10">
                        <button
                            onClick={() => {
                                const idx = SONG_LIBRARY.findIndex(s => s.audioUrl === currentSong.audioUrl);
                                const prevIdx = idx > 0 ? idx - 1 : SONG_LIBRARY.length - 1;
                                handlePlaySong(SONG_LIBRARY[prevIdx]);
                            }}
                            className="text-zinc-400 hover:text-rose-500 transition-colors active:scale-90"
                        >
                            <span className="material-symbols-outlined text-3xl">skip_previous</span>
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlayPause}
                            className="w-16 h-16 bg-gradient-to-br from-rose-400 to-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-300/50"
                        >
                            <span className={`material-symbols-outlined text-4xl ${isPlaying ? '' : 'ml-1'}`}>
                                {isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                        </motion.button>
                        <button
                            onClick={() => {
                                const idx = SONG_LIBRARY.findIndex(s => s.audioUrl === currentSong.audioUrl);
                                const nextIdx = idx < SONG_LIBRARY.length - 1 ? idx + 1 : 0;
                                handlePlaySong(SONG_LIBRARY[nextIdx]);
                            }}
                            className="text-zinc-400 hover:text-rose-500 transition-colors active:scale-90"
                        >
                            <span className="material-symbols-outlined text-3xl">skip_next</span>
                        </button>
                    </div>
                </section>

                {/* Queue Section */}
                <section className="w-full bg-white/30 backdrop-blur-md rounded-[32px] p-6 shadow-sm border border-white/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-400">queue_music</span>
                            Song Library
                        </h3>
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-400 px-2 py-1 rounded-full">{SONG_LIBRARY.length} songs</span>
                    </div>

                    <div className="space-y-3">
                        {SONG_LIBRARY.map((song, idx) => (
                            <SongItem
                                key={idx}
                                title={song.title}
                                artist={song.artist}
                                audioUrl={song.audioUrl}
                                thumbnail={song.thumbnail}
                                onPlay={handlePlaySong}
                                isActive={currentSong.audioUrl === song.audioUrl && isPlaying}
                            />
                        ))}
                    </div>
                </section>
            </motion.main>
        </div>
    );
};

export default Music;