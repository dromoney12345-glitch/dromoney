import React, { useState, useEffect, useRef } from 'react';
import api from '../../shared/services/api';
import { Search, MessageSquare, Send, User, Clock, Loader2, ArrowLeft } from 'lucide-react';

const AdminChatSupport = () => {
    const [threads, setThreads] = useState([]);
    const [activeUser, setActiveUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchThreads();
        const interval = setInterval(fetchThreads, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeUser) {
            fetchMessages(activeUser._id);
            const interval = setInterval(() => fetchMessages(activeUser._id), 5000);
            return () => clearInterval(interval);
        }
    }, [activeUser]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchThreads = async () => {
        try {
            const res = await api.get('/chat/admin/users');
            if (res.success) {
                setThreads(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingThreads(false);
        }
    };

    const fetchMessages = async (userId) => {
        try {
            const res = await api.get(`/chat/admin/${userId}`);
            if (res.success) {
                setMessages(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !activeUser) return;

        setSending(true);
        try {
            const res = await api.post(`/chat/admin/${activeUser._id}`, { message: newMessage });
            if (res.success) {
                setMessages([...messages, res.data]);
                setNewMessage('');
                fetchThreads();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const filteredThreads = threads.filter(t => 
        t.userName?.toLowerCase().includes(search.toLowerCase()) ||
        t.lastMessage?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-80px)] bg-white overflow-hidden">
            <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col shrink-0 ${activeUser ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-medium uppercase tracking-normal text-slate-800 mb-4">Support Inbox</h2>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingThreads ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-slate-300" size={24} />
                        </div>
                    ) : filteredThreads.length === 0 ? (
                        <div className="text-center py-10 px-4">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-normal">No conversations</p>
                        </div>
                    ) : (
                        filteredThreads.map((thread) => (
                            <button 
                                key={thread._id}
                                onClick={() => setActiveUser({ _id: thread._id, name: thread.userName })}
                                className={`w-full p-4 flex gap-3 hover:bg-slate-50 transition-all border-b border-slate-50 text-left relative
                                    ${activeUser?._id === thread._id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : ''}`}
                            >
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                                    <User size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="text-[13px] font-medium text-slate-800 truncate uppercase">{thread.userName}</h4>
                                        <span className="text-[9px] font-medium text-slate-400">
                                            {new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-[11px] truncate ${thread.unreadCount > 0 ? 'font-medium text-slate-800' : 'text-slate-400 font-medium'}`}>
                                        {thread.lastMessage}
                                    </p>
                                </div>
                                {thread.unreadCount > 0 && (
                                    <span className="absolute right-4 bottom-4 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-medium">
                                        {thread.unreadCount}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className={`flex-1 flex flex-col bg-slate-50/30 ${!activeUser ? 'hidden md:flex' : 'flex'}`}>
                {activeUser ? (
                    <>
                        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveUser(null)} className="md:hidden p-2 hover:bg-slate-50 rounded-lg">
                                    <ArrowLeft size={18} />
                                </button>
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium uppercase tracking-tight text-slate-800">{activeUser.name}</h3>
                                    <p className="text-[10px] font-medium text-emerald-500 flex items-center gap-1 uppercase tracking-normal">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        Active Support Session
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className="flex flex-col max-w-[70%]">
                                        <div className={`p-4 rounded-2xl text-[13px] font-medium shadow-sm leading-relaxed
                                            ${m.sender === 'admin' 
                                                ? 'bg-slate-900 text-white rounded-tr-none' 
                                                : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                                            {m.message}
                                        </div>
                                        <p className={`text-[9px] font-medium text-slate-400 mt-2 ${m.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                                            {new Date(m.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="bg-white border-t border-slate-100 p-4 flex gap-3 shadow-2xl">
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={`Reply to ${activeUser.name}...`}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <button 
                                type="submit"
                                disabled={sending || !newMessage.trim()}
                                className="bg-indigo-600 text-white px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                <span className="font-medium text-[11px] uppercase tracking-normal text-white">Send</span>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                        <div className="w-20 h-20 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mb-6">
                            <MessageSquare size={40} />
                        </div>
                        <h3 className="text-base font-medium text-slate-800 uppercase tracking-tight">Select a conversation</h3>
                        <p className="text-sm text-slate-400 mt-2 font-medium">Choose a user from the sidebar to start assisting them.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatSupport;
