import React, { useState, useEffect, useRef } from 'react';
import { socket, socketService } from '../sockets/clientside';

// --- Sub-Components ---
const Message = ({ text, time, isUser, image }) => (
    <div className={`flex flex-col max-w-[100%] group ${isUser ? 'self-end items-end' : 'items-start'}`}>
        {image && (
            <div className="mb-2 w-64 h-48 overflow-hidden border-2 border-white shadow-md rounded-md rounded-bl-none">
                <img src={image} alt="Shared memory" className="w-full h-full object-cover" />
            </div>
        )}
        <div
            className={`p-3 px-4 font-sans text-sm shadow-sm border transition-all duration-300 ${isUser
                ? 'bg-white text-zinc-800 border-white/40 rounded-full rounded-br-none shadow-[0_4px_20px_rgba(139,76,80,0.04)]'
                : 'bg-[#E5989B]/15 text-zinc-800 border-[#E5989B]/5 rounded-full rounded-bl-none'
                }`}
        >
            {text}
        </div>
        <span className={`mt-1 font-sans text-[9px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'mr-4' : 'ml-4'}`}>
            {time}
        </span>
    </div>
);

// --- Main Component ---
const Chat = ({ roomState }) => {
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleReceiveMessage = (msg) => {
            const isCurrentUser =
                msg.senderId === socket.id ||
                (roomState && msg.sender === (roomState.username || roomState.nickname));

            setMessages(prev => [...prev, {
                ...msg,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isUser: isCurrentUser
            }]);
        };

        socket.on('receive-message', handleReceiveMessage);

        return () => {
            socket.off('receive-message', handleReceiveMessage);
        };
    }, [roomState]);

    const handleSend = () => {
        if (!inputValue.trim() || !roomState) return;

        const senderName = roomState.username || roomState.nickname || "Anonymous";

        socketService.sendMessage(roomState.id, inputValue.trim(), senderName, socket.id);
        setInputValue("");
    };

    return (
        <div className="min-h-screen bg-[#fff8f7] font-sans selection:bg-rose-100 flex flex-col">
            {/* {roomState && (
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Room {roomState.id}</p>
            )} */}
            {/* 1. Sticky Header */}


            {/* 2. Message Area */}
            <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col gap-4 pt-20 pb-32 px-4 transition-all">
                {!roomState ? (
                    <div className="flex flex-col items-center justify-center my-auto text-center opacity-50 py-12">
                        <span className="material-symbols-outlined text-4xl mb-2">meeting_room</span>
                        <p className="text-sm font-bold">Please join a room from the Home tab first.</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center my-auto text-center opacity-50 py-12">
                        <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                        <p className="text-sm">Start a conversation with your partner!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={msg.id || index} className="flex flex-col">
                            {!msg.isUser && (
                                <span className="text-[10px] text-zinc-400 font-bold mb-0.5 ml-4 uppercase tracking-widest">{msg.sender}</span>
                            )}
                            <Message
                                text={msg.text}
                                time={msg.time}
                                isUser={msg.isUser}
                                image={msg.image}
                            />
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* 3. Floating Input Bar */}
            <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl">
                <div className="w-full bg-white rounded-[30px] border border-rose-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex items-end px-3 py-1.5 gap-2">


                    <textarea
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                                e.target.style.height = 'auto';
                            }
                        }}
                        rows={1}
                        placeholder={roomState ? 'Say "hiiiee" to him/her....' : 'Join a room first!'}
                        disabled={!roomState}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-zinc-700 placeholder:text-zinc-300 px-2 py-2.5 resize-none max-h-[120px] overflow-y-auto outline-none"
                    />

                    <button
                        onClick={() => { handleSend(); }}
                        disabled={!roomState || !inputValue.trim()}
                        className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center text-white transition-all shadow-md mb-0.5 ${inputValue.trim() ? 'bg-[#E5989B] hover:scale-105 active:scale-95 cursor-pointer' : 'bg-zinc-300 cursor-not-allowed'}`}
                    >
                        <span className="material-symbols-outlined text-[20px] font-fill">send</span>
                    </button>
                </div>
            </div>

            <style>{`
                .animate-spin-slow { animation: spin 4s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .font-fill { font-variation-settings: 'FILL' 1; }
            `}</style>
        </div>
    );
};

export default Chat;