import React, { useState } from 'react';
import { X, MessageSquare, Star, Loader2, CheckCircle2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../../shared/services/api';

const FeedbackModal = ({ isOpen, onClose }) => {
    const { addNotification } = useUser();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [status, setStatus] = useState('idle'); // idle, submitting, success

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) {
            addNotification("Rating Required...", "Please select a star rating first.", "warning");
            return;
        }

        if (!feedback.trim()) {
            addNotification("Comment Required", "Please share a few words about your experience.", "warning");
            return;
        }

        setStatus('submitting');

        try {
            const res = await api.post('/user/data/feedback', {
                rating,
                message: feedback
            });

            if (res.success) {
                setStatus('idle');
                setRating(0);
                setFeedback('');
                addNotification("Success!", "Feedback received. Thank you!", "success");
                onClose();
            }
        } catch (err) {
            console.error(err);
            setStatus('idle');
            addNotification("Error", "Failed to send feedback. Please try again.", "error");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={status === 'idle' ? onClose : undefined}></div>

            <div className="relative bg-white w-full max-w-[280px] sm:max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                {status === 'idle' && (
                    <>
                        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-indigo-100 text-indigo-500 rounded-xl flex items-center justify-center">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-md tracking-tight">App Feedback</h3>
                                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Help us improve</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-100">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-3 text-center border-b border-slate-100 border-dashed">
                            <h3 className="text-[11px] font-black text-slate-800 mb-2 uppercase tracking-wider">Rate your experience</h3>
                            <div className="flex justify-center gap-1 sm:gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="transition-transform active:scale-90 p-0.5"
                                    >
                                        <Star
                                            size={28}
                                            className={`transition-all duration-300 ${(hoverRating || rating) >= star
                                                    ? 'text-amber-400 fill-amber-400 drop-shadow-md scale-105'
                                                    : 'text-slate-200 fill-slate-50'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 sm:p-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 px-1">Any Suggestions?</p>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="I wish the app had..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-black text-slate-700 placeholder:text-slate-400 resize-none h-16 sm:h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                            ></textarea>

                            <button
                                onClick={handleSubmit}
                                className={`w-full py-3 mt-2 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 ${rating > 0 ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-slate-300 shadow-none hover:bg-slate-400'
                                    }`}>
                                Submit Feedback
                            </button>
                        </div>
                    </>
                )}

                {status === 'submitting' && (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                        <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
                        <h3 className="text-md font-black text-slate-800 tracking-tight">Sending Feedback...</h3>
                    </div>
                )}

            </div>
        </div>
    );
};

export default FeedbackModal;
