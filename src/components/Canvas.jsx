// import React, { useRef, useEffect, useState, useCallback } from 'react';

// const Canvas = () => {
//     const canvasRef = useRef(null);
//     const contextRef = useRef(null);

//     // State for UI and History
//     const [isDrawing, setIsDrawing] = useState(false);
//     const [currentTool, setCurrentTool] = useState('brush'); // 'brush' | 'eraser'
//     const [history, setHistory] = useState([]);
//     const [historyStep, setHistoryStep] = useState(-1);
//     const maxHistory = 20;

//     // Initialize Canvas
//     useEffect(() => {
//         const canvas = canvasRef.current;
//         const ratio = window.devicePixelRatio || 1;

//         // Set display size
//         canvas.style.width = `${window.innerWidth}px`;
//         canvas.style.height = `${window.innerHeight}px`;

//         // Set actual resolution
//         canvas.width = window.innerWidth * ratio;
//         canvas.height = window.innerHeight * ratio;

//         const ctx = canvas.getContext('2d', { alpha: true });
//         ctx.scale(ratio, ratio);
//         ctx.lineCap = 'round';
//         ctx.lineJoin = 'round';
//         ctx.lineWidth = 3;
//         ctx.strokeStyle = '#8b4c50';

//         contextRef.current = ctx;

//         // Capture initial blank state
//         const initialState = canvas.toDataURL();
//         setHistory([initialState]);
//         setHistoryStep(0);

//         const handleResize = () => {
//             // In a real app, you'd want to save the content before resizing
//             // For this ephemeral version, we just reset the dimensions
//             canvas.style.width = `${window.innerWidth}px`;
//             canvas.style.height = `${window.innerHeight}px`;
//         };

//         window.addEventListener('resize', handleResize);
//         return () => window.removeEventListener('resize', handleResize);
//     }, []);

//     // History Management
//     const saveState = useCallback(() => {
//         const canvas = canvasRef.current;
//         const currentState = canvas.toDataURL();

//         setHistory(prev => {
//             const newHistory = prev.slice(0, historyStep + 1);
//             newHistory.push(currentState);
//             if (newHistory.length > maxHistory) {
//                 newHistory.shift();
//             }
//             return newHistory;
//         });

//         setHistoryStep(prev => {
//             const next = prev + 1;
//             return next >= maxHistory ? maxHistory - 1 : next;
//         });
//     }, [historyStep]);

//     const loadHistoryStep = (stepIndex) => {
//         const canvas = canvasRef.current;
//         const ctx = contextRef.current;
//         const img = new Image();
//         img.src = history[stepIndex];
//         img.onload = () => {
//             ctx.clearRect(0, 0, canvas.width, canvas.height);
//             ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
//         };
//         setHistoryStep(stepIndex);
//     };

//     // Drawing Logic
//     const getPos = (e) => {
//         const rect = canvasRef.current.getBoundingClientRect();
//         const clientX = e.touches ? e.touches[0].clientX : e.clientX;
//         const clientY = e.touches ? e.touches[0].clientY : e.clientY;
//         return { x: clientX - rect.left, y: clientY - rect.top };
//     };

//     const startDraw = (e) => {
//         const { x, y } = getPos(e);
//         const ctx = contextRef.current;

//         if (currentTool === 'eraser') {
//             ctx.globalCompositeOperation = 'destination-out';
//             ctx.lineWidth = 20;
//         } else {
//             ctx.globalCompositeOperation = 'source-over';
//             ctx.lineWidth = 3;
//         }

//         ctx.beginPath();
//         ctx.moveTo(x, y);
//         setIsDrawing(true);
//     };

//     const draw = (e) => {
//         if (!isDrawing) return;
//         const { x, y } = getPos(e);
//         contextRef.current.lineTo(x, y);
//         contextRef.current.stroke();
//     };

//     const stopDraw = () => {
//         if (isDrawing) {
//             contextRef.current.closePath();
//             setIsDrawing(false);
//             saveState();
//         }
//     };

//     const clearCanvas = () => {
//         const canvas = canvasRef.current;
//         contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
//         saveState();
//     };

//     return (
//         <div className="fixed inset-0 bg-[#fff8f7] overflow-hidden flex flex-col font-sans select-none">
//             {/* Subtle Paper Texture */}
//             <div className="fixed inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#e5989b_0.5px,transparent_0.5px)] [background-size:16px_16px]"></div>

//             {/* Header */}
//             <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
//                 <h1 className="text-[#8b4c50] font-bold tracking-tight text-sm opacity-40 uppercase">
//                     Sketching a Moment
//                 </h1>
//             </div>

//             {/* Canvas */}
//             <canvas
//                 ref={canvasRef}
//                 onMouseDown={startDraw}
//                 onMouseMove={draw}
//                 onMouseUp={stopDraw}
//                 onMouseLeave={stopDraw}
//                 onTouchStart={(e) => { e.preventDefault(); startDraw(e); }}
//                 onTouchMove={(e) => { e.preventDefault(); draw(e); }}
//                 onTouchEnd={stopDraw}
//                 className="w-full h-full block touch-none cursor-crosshair"
//             />

//             {/* Floating Toolbar */}
//             <nav className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50">
//                 <div className="bg-white/80 backdrop-blur-xl rounded-full border border-rose-100 px-6 py-3 shadow-lg flex items-center gap-6">

//                     {/* Brush */}
//                     <button
//                         onClick={() => setCurrentTool('brush')}
//                         className={`p-2 rounded-full transition-all ${currentTool === 'brush' ? 'text-[#E5989B] scale-110' : 'text-zinc-400'}`}
//                     >
//                         <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTool === 'brush' ? 1 : 0}` }}>
//                             brush
//                         </span>
//                     </button>

//                     {/* Eraser */}
//                     <button
//                         onClick={() => setCurrentTool('eraser')}
//                         className={`p-2 rounded-full transition-all ${currentTool === 'eraser' ? 'text-[#E5989B] scale-110' : 'text-zinc-400'}`}
//                     >
//                         <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTool === 'eraser' ? 1 : 0}` }}>
//                             ink_eraser
//                         </span>
//                     </button>

//                     <div className="w-px h-6 bg-rose-100/50"></div>

//                     {/* Undo */}
//                     <button
//                         onClick={() => loadHistoryStep(historyStep - 1)}
//                         disabled={historyStep <= 0}
//                         className="p-2 text-zinc-400 hover:text-[#E5989B] disabled:opacity-20 transition-colors"
//                     >
//                         <span className="material-symbols-outlined">undo</span>
//                     </button>

//                     {/* Redo */}
//                     <button
//                         onClick={() => loadHistoryStep(historyStep + 1)}
//                         disabled={historyStep >= history.length - 1}
//                         className="p-2 text-zinc-400 hover:text-[#E5989B] disabled:opacity-20 transition-colors"
//                     >
//                         <span className="material-symbols-outlined">redo</span>
//                     </button>

//                     {/* Clear */}
//                     <button
//                         onClick={clearCanvas}
//                         className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
//                     >
//                         <span className="material-symbols-outlined">delete</span>
//                     </button>
//                 </div>
//             </nav>

//             <style jsx>{`
//         .material-symbols-outlined {
//           font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
//         }
//       `}</style>
//         </div>
//     );
// };

// export default Canvas;