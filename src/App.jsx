import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Chat from './components/Chat';
import Music from './components/Music';
import { socketService, socket } from './sockets/clientside';

const MomentsApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const [roomState, setRoomState] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- Prevent Unintentional Disconnection / Refresh Prompt ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (roomState) {
        // Triggers the standard system pop-up confirmation
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomInput(roomParam);
      setActionType('join');
    }
    const handleUsersUpdate = (payload) => {
      setRoomState(prev => {
        if (!prev) return prev;
        const usersArray = Array.isArray(payload) ? payload : payload.users;
        const count = Array.isArray(payload) ? payload.length : payload.userCount;
        return { ...prev, members: usersArray, userCount: count };
      });
    };

    const handleRoomState = (state) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return { ...prev, members: state.users };
      });
    };

    socket.on('room-users-update', handleUsersUpdate);
    socket.on('room-state', handleRoomState);

    return () => {
      socket.off('room-users-update', handleUsersUpdate);
      socket.off('room-state', handleRoomState);
    };
  }, []);

  const handleCreateRoom = () => {
    if (!nameInput.trim()) {
      setError("Please enter a nickname.");
      return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    socketService.connect();
    socketService.joinRoom(newRoomId, nameInput, 'admin');

    setRoomState({ id: newRoomId, nickname: nameInput, role: 'admin', members: [{ username: nameInput, role: 'admin' }], userCount: 1 });
    window.history.pushState({}, '', `?room=${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (!nameInput.trim()) {
      setError("Please enter a nickname.");
      return;
    }
    if (!roomInput.trim()) {
      setError("Please enter a Room ID.");
      return;
    }

    const roomId = roomInput.trim().toUpperCase();
    socketService.connect();
    socketService.joinRoom(roomId, nameInput, 'joinee');

    setRoomState({ id: roomId, nickname: nameInput, role: 'joinee', members: [{ username: nameInput, role: 'joinee' }], userCount: 1 });
    window.history.pushState({}, '', `?room=${roomId}`);
  };

  const scale1 = useTransform(scrollYProgress, [0, 0.4], [0, 1.2]);
  const rotate1 = useTransform(scrollYProgress, [0, 0.4], [-60, 10]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  const scale2 = useTransform(scrollYProgress, [0.1, 0.5], [0, 1]);
  const rotate2 = useTransform(scrollYProgress, [0.1, 0.5], [45, -15]);
  const opacity2 = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);

  const scale3 = useTransform(scrollYProgress, [0.2, 0.6], [0, 1.5]);
  const rotate3 = useTransform(scrollYProgress, [0.2, 0.6], [-45, 20]);
  const opacity3 = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);

  const scale4 = useTransform(scrollYProgress, [0.3, 0.7], [0, 1.3]);
  const rotate4 = useTransform(scrollYProgress, [0.3, 0.7], [90, 0]);
  const opacity4 = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);

  return (
    <div className="min-h-screen bg-brand-cream font-sans text-zinc-900 selection:bg-rose-100">

      {/* --- Header --- */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-zinc-800 text-white px-6 py-3 rounded-full shadow-xl font-semibold text-sm">
          {toastMessage}
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-rose-100/20">
        <div className="max-w-5xl mx-auto px-6 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2 text-rose-400">
            <img className="w-12 h-12" src="src/assets/love_home.png" alt="Logo" />
            <span className="text-md font-bold uppercase tracking-widest">Moments</span>
          </div>
        </div>
      </header>

      {/* --- HOME TAB PANEL --- */}
      <main className={`pb-32 ${activeTab === 'home' ? 'block' : 'hidden'}`}>
        {/* --- Hero Section --- */}
        <section ref={heroRef} className="px-6 pt-12 pb-20 text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Every story deserves its <span className="text-brand-rose italic">own little world</span>
          </h1>
          <p className="text-zinc-600 mb-10 max-w-md">
            Moments is a digital platform designed for intimacy, helping people connect over shared moments.
          </p>

          {roomState ? (
            <div className="flex flex-col items-center gap-4 mt-6 p-6 bg-white/80 backdrop-blur-md rounded-3xl paper-shadow border border-rose-100 relative z-10 w-full max-w-sm">
              <div className="text-xl font-bold text-rose-500">Room: {roomState.id}</div>
              <div className="text-sm text-zinc-600 mb-4 flex items-center gap-2">
                Joined as <span className="font-bold">{roomState.nickname}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${roomState.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {roomState.role}
                </span>
              </div>

              {roomState.role === 'admin' && roomState.members && (
                <div className="w-full bg-white/40 rounded-2xl p-4 mb-4 border border-rose-50 shadow-inner">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">People in room</p>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full shadow-sm border border-rose-200">
                      {roomState.userCount || 1} Connected
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {roomState.members.filter(m => (m.id ? m.id !== socket.id : m.username !== roomState.nickname)).length > 0 ? (
                      roomState.members.filter(m => (m.id ? m.id !== socket.id : m.username !== roomState.nickname)).map((member, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-xl shadow-sm border border-rose-100/50">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                          <span className="font-bold text-zinc-700">{member.username}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider ml-auto">{member.role}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-zinc-500 italic text-center py-2">Waiting for partner to join...</div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Share via</p>
              <div className="flex gap-4 items-center mb-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent('Hey! I created a cozy space for us on Moments. Join me here: ' + window.location.origin + window.location.pathname + '?room=' + roomState.id)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center bg-[#25D366] text-white rounded-full hover:scale-110 transition-transform shadow-md cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Hey! I created a cozy space for us on Moments. Join me here:')}&url=${encodeURIComponent(window.location.origin + window.location.pathname + '?room=' + roomState.id)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center bg-[#1DA1F2] text-white rounded-full hover:scale-110 transition-transform shadow-md cursor-pointer"
                  title="Share on Twitter"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                </a>

                <button
                  onClick={() => {
                    const link = `${window.location.origin}${window.location.pathname}?room=${roomState.id}`;
                    navigator.clipboard.writeText(link).then(() => showToast('Room link copied to clipboard!'))
                      .catch(() => showToast('Failed to copy link.'));
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full hover:bg-zinc-200 hover:scale-110 transition-all shadow-md cursor-pointer"
                  title="Copy Link"
                >
                  <span className="material-symbols-outlined text-[20px]">content_copy</span>
                </button>
              </div>
            </div>
          ) : actionType === null ? (
            <div className="flex justify-center mt-6 relative z-10">
              <button
                onClick={() => setActionType('create')}
                className="watercolor-gradient text-white px-8 py-4 rounded-full font-bold tracking-widest paper-shadow active:scale-95 transition-transform cursor-pointer"
              >
                CREATE YOUR SPACE
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-6 p-6 bg-white/80 backdrop-blur-md rounded-3xl paper-shadow border border-rose-100 w-full max-w-sm relative z-10">
              <h3 className="text-xl font-bold mb-2">
                {actionType === 'create' ? 'Create your own space' : 'Join a room'}
              </h3>

              {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}

              <input
                type="text"
                placeholder="Your Nickname"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setError(''); }}
                className="px-4 py-3 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white/50"
              />

              {actionType === 'join' && (
                <input
                  type="text"
                  value={`Joining Room: ${roomInput}`}
                  readOnly
                  className="px-4 py-3 rounded-xl border border-rose-200 bg-white/50 text-zinc-500 font-semibold cursor-not-allowed uppercase"
                />
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setActionType(null); setError(''); }}
                  className="flex-1 bg-zinc-100 text-zinc-600 px-4 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={actionType === 'create' ? handleCreateRoom : handleJoinRoom}
                  className="flex-1 watercolor-gradient text-white px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {actionType === 'create' ? 'Create' : 'Join'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-12 relative w-full max-w-sm aspect-square">
            <div className="absolute inset-0 rounded-blob-2 overflow-hidden paper-shadow border-4 border-white z-10">
              <img
                src="src/assets/img (1).jpg"
                alt="Couple"
                className="w-full h-full object-cover"
              />
            </div>

            <motion.div
              style={{ scale: scale1, rotate: rotate1, opacity: opacity1 }}
              className="absolute -top-16 -left-16 hidden md:flex items-center justify-center z-20 w-32 h-32 origin-center mix-blend-multiply drop-shadow-md"
            >
              <img src="src/assets/flwr.png" alt="Flower" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>
            <motion.div
              style={{ scale: scale2, opacity: opacity2 }}
              className="absolute -top-25 -right-2 hidden md:flex items-center justify-center z-0 w-40 h-60 origin-center mix-blend-multiply drop-shadow-md"
            >
              <img src="src/assets/orchids.png" alt="Flower" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>

            <motion.div
              style={{ scale: scale2, rotate: rotate2, opacity: opacity2 }}
              className="absolute top-1/4 -right-25 hidden md:flex items-center justify-center z-0 w-40 h-40 origin-center mix-blend-multiply drop-shadow-md"
            >
              <img src="src/assets/sflr.png" alt="Flower" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>

            <motion.div
              style={{ scale: scale3, rotate: rotate3, opacity: opacity3 }}
              className="absolute -bottom-12 -left-18 hidden md:flex items-center justify-center z-20 w-36 h-36 origin-center mix-blend-multiply drop-shadow-md"
            >
              <img src="src/assets/ff.png" alt="Flower" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>

            <motion.div
              style={{ scale: scale4, rotate: rotate4, opacity: opacity4 }}
              className="absolute -bottom-20 -right-40 hidden md:flex items-center justify-center z-20 w-60 h-60 origin-center mix-blend-multiply drop-shadow-md"
            >
              <img src="src/assets/lily.png" alt="Flower" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>
          </div>
        </section>

        {/* --- Features Grid --- */}
        <section className="px-12 py-16 flex flex-col gap-16 bg-white/40">
          <div className="max-w-4xl mx-auto grid gap-12 md:grid-cols-2 md:gap-18">
            <FeatureCard
              icon="forum"
              title="Private Chat"
              desc="Encrypted, playful messaging with hand-drawn stickers."
              blobClass="rounded-blob-1 bg-amber-100/50"
            />
            <FeatureCard
              icon="music_note"
              title="Music"
              desc="A soft, cozy corner for music that makes your world feel whole, even when you're apart."
              blobClass="rounded-blob-2 bg-orange-100/50"
            />
          </div>
        </section>

        {/* --- Journal Section --- */}
        <section className="px-6 py-20 max-w-4xl mx-auto flex flex-col text-center md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">Our Little World</h2>
            <p className="text-zinc-600 mb-6">A tiny corner of the internet built just for us, our jokes, and our favorite things.</p>
            {/* <ul className="space-y-3">
              <li className="flex gap-2 items-center text-sm font-medium">
                <span className="material-symbols-outlined text-rose-400">check_circle</span>
                Two Souls, One Song
              </li>
              <li className="flex gap-2 items-center text-sm font-medium">
                <span className="material-symbols-outlined text-rose-400">check_circle</span>
                A Moment of Us !
              </li>
            </ul> */}
          </div>

          {/* <div className="flex-1 w-full bg-white p-6 rounded-3xl paper-shadow border border-white">
            <p className="text-sm font-bold text-brand-rose mb-2 uppercase tracking-lighter">Love is to be felt</p>
            <p className="text-2xl font-hindi font-semibold">प्रेम दर्शन है, प्रदर्शन नहीं।</p>
          </div> */}
        </section>

        {/* --- Security Notice --- */}
        <section className="px-6  text-center">
          <p className="text-xs text-zinc-400 max-w-md mx-auto flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[12px]">lock</span>
            Your moments are secured. We do not store your data.
          </p>
        </section>
      </main>

      {/* --- CHAT TAB PANEL (Persistent) --- */}
      <div className={`pb-32 pt-24 max-w-2xl mx-auto min-h-screen ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
        <Chat roomState={roomState} />
      </div>

      {/* --- MUSIC TAB PANEL (Persistent) --- */}
      <div className={`min-h-screen ${activeTab === 'music_note' ? 'block' : 'hidden'}`}>
        <Music roomState={roomState} />
      </div>

      {/* --- Fixed Bottom Dock --- */}
      <nav className="fixed bottom-1 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-md bg-white/80 backdrop-blur-xl rounded-full border border-white-100 shadow-xl px-6 py-3 flex justify-around">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center transition-all ${activeTab === 'home' ? 'text-rose-500 scale-110' : 'text-zinc-400'}`}>
          <span className={`material-symbols-outlined ${activeTab === 'home' ? 'fill-1' : ''}`}>home</span>
          <span className="text-[10px] font-bold uppercase mt-1">Home</span>
        </button>

        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center transition-all ${activeTab === 'chat' ? 'text-rose-500 scale-110' : 'text-zinc-400'}`}>
          <span className={`material-symbols-outlined ${activeTab === 'chat' ? 'fill-1' : ''}`}>forum</span>
          <span className="text-[10px] font-bold uppercase mt-1">Chat</span>
        </button>

        <button onClick={() => setActiveTab('music_note')} className={`flex flex-col items-center transition-all ${activeTab === 'music_note' ? 'text-rose-500 scale-110' : 'text-zinc-400'}`}>
          <span className={`material-symbols-outlined ${activeTab === 'music_note' ? 'fill-1' : ''}`}>music_note</span>
          <span className="text-[10px] font-bold uppercase mt-1">Music</span>
        </button>
      </nav>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, blobClass }) => (
  <div className="flex flex-col items-center text-center group">
    <div className={`w-16 h-16 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${blobClass}`}>
      <span className="material-symbols-outlined text-zinc-700 text-3xl">{icon}</span>
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
  </div>
);

export default MomentsApp;