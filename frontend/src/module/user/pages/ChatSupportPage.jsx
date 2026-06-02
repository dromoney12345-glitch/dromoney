import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, ShieldAlert, CreditCard, Loader2 } from 'lucide-react';
import api from '../../shared/services/api';
import { useUser } from '../context/UserContext';

const ChatSupportPage = () => {
    const navigate = useNavigate();
    const { userData, refreshUserProfile, addNotification } = useUser();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    // Subscription Check
    const isExpired = userData.supportExpiry && new Date(userData.supportExpiry) < new Date();

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await api.get('/chat');
            if (res.success) {
                setMessages(res.data);
            }
        } catch (err) {
            console.error("Chat error", err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const res = await api.post('/chat', { message: newMessage });
            if (res.success) {
                setMessages([...messages, res.data]);
                setNewMessage('');
                // If it was the first message, refresh profile to get expiry
                if (!userData.businessHubFirstAccessedAt) refreshUserProfile();
            }
        } catch (err) {
            addNotification("Error", "Message failed to send", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC]">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 active:scale-95 transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-medium text-slate-900 tracking-tight leading-none">Support Chat</h1>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
                        </p>
                        {userData.supportExpiry && !isExpired && (
                            <p className="text-[9px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                {Math.ceil((new Date(userData.supportExpiry) - new Date()) / (1000 * 60 * 60 * 24))} Days Left
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isExpired && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Send size={32} />
                        </div>
                        <h3 className="text-sm font-medium text-slate-800 uppercase tracking-tight">Ask us anything!</h3>
                        <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-widest leading-relaxed px-10">Our expert team is here to guide your business journey.</p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] font-medium shadow-sm leading-relaxed
                            ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                            {m.message}
                            <p className="text-[9px] opacity-60 mt-2 text-right font-medium">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isExpired && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                        <ShieldAlert className="mx-auto text-amber-500" size={32} />
                        <h4 className="text-sm font-medium text-amber-800 uppercase tracking-tight">Support Plan Expired</h4>
                        <p className="text-[11px] text-amber-600 font-medium leading-relaxed px-4 uppercase tracking-widest">Your access to support has ended. Please unlock a business plan to continue.</p>
                        <button
                            onClick={() => navigate('/user/business-ideas')}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl text-[12px] font-medium uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                            <CreditCard size={18} />
                            View Premium Plans
                        </button>
                    </div>
                )}
            </div>

            {/* Input */}
            {!isExpired && (
                <div className="p-4 bg-white border-t border-slate-100 sticky bottom-0 shadow-2xl">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Describe your query..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                        >
                            {sending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatSupportPage;
