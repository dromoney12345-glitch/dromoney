import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { EVENTS } from '../data/mockData';
import { ChevronLeft, Trophy, Users, Timer, Star, ShieldCheck, Info, Loader2, Play } from 'lucide-react';

const ContestView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { joinedEvents } = useUser();
    
    const contest = EVENTS.find(e => e.id === parseInt(id));
    const isJoined = joinedEvents.includes(parseInt(id));

    // States for functional simulation
    const [timeLeft, setTimeLeft] = useState({ h: 2, m: 45, s: 12 });
    const [liveScores, setLiveScores] = useState([950, 820, 780, 650, 510]);
    const [showDemoQuiz, setShowDemoQuiz] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);

    // 1. Ticking Timer Simulation
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { h, m, s } = prev;
                if (s > 0) s--;
                else {
                    if (m > 0) { m--; s = 59; }
                    else { if (h > 0) { h--; m = 59; s = 59; } }
                }
                return { h, m, s };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Leaderboard Score Simulation
    useEffect(() => {
        const scoreTimer = setInterval(() => {
            setLiveScores(prev => prev.map((score, i) => i === 2 ? score : score + Math.floor(Math.random() * 5)));
        }, 3000);
        return () => clearInterval(scoreTimer);
    }, []);

    // Dummy Quiz Questions
    const quizQuestions = [
        { q: "Which company owns the Affiliate Earn program?", a: ["Junkar", "Amazon", "Google", "Flipkart"], correct: 0 },
        { q: "What is added after a friend's KYC?", a: ["Pending Wallet", "Coins", "Crypto", "Gift card"], correct: 0 }
    ];

    if (!contest) return <div className="p-8 text-center text-white min-h-screen bg-slate-950">Event not found!</div>;

    const leaderboard = [
        { id: 1, name: "Amit K.", score: liveScores[0], rank: 1, avatar: "AK" },
        { id: 2, name: "Suresh P.", score: liveScores[1], rank: 2, avatar: "SP" },
        { id: 3, name: "Rahul S. (You)", score: liveScores[2], rank: 3, avatar: "RS", isUser: true },
        { id: 4, name: "Priya M.", score: liveScores[3], rank: 4, avatar: "PM" },
        { id: 5, name: "Deepak R.", score: liveScores[4], rank: 5, avatar: "DR" },
    ];

    return (
        <div className="bg-slate-950 min-h-screen text-slate-200 flex flex-col sm:max-w-md sm:mx-auto relative z-[500] overflow-hidden">
            {/* Nav Header */}
            <div className="px-4 py-4 flex items-center gap-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50 w-full shadow-lg">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 rounded-full hover:bg-slate-800 transition-colors border border-slate-800">
                    <ChevronLeft size={20} className="text-white" />
                </button>
                <div className="flex-1 truncate">
                    <h1 className="text-base font-medium text-white truncate">{contest.title}</h1>
                    <p className="text-[9px] text-sky-400 font-medium uppercase tracking-widest leading-none mt-1">Live Contest Room</p>
                </div>
                <div className="bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-inner shrink-0">
                    <span className="font-medium text-emerald-400 text-xs">JOINED</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-24">
                
                {/* 1. Status Hero Card */}
                <div className="relative bg-gradient-to-br from-indigo-600 to-sky-600 rounded-3xl p-6 shadow-xl overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                            <Trophy size={32} className="text-white animate-bounce" />
                        </div>
                        <h2 className="text-xl font-medium text-white mb-1 uppercase tracking-tight">Win {contest.reward}</h2>
                        <div className="px-4 py-1.5 bg-slate-900/40 backdrop-blur rounded-full border border-white/20 mt-2 flex items-center gap-2">
                             <Timer size={14} className="text-sky-300" />
                             <span className="text-[10px] font-medium text-white uppercase tracking-widest tabular-nums">Starts in {timeLeft.h.toString().padStart(2, '0')}h : {timeLeft.m.toString().padStart(2, '0')}m : {timeLeft.s.toString().padStart(2, '0')}s</span>
                        </div>
                    </div>
                </div>

                {/* 2. Interactive Leaderboard Section */}
                <div>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-xs font-medium text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Users size={16} className="text-sky-500" /> Live Rankings
                        </h3>
                        <span className="text-[9px] font-medium text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded tracking-tighter uppercase">520 Participants</span>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-inner">
                        {leaderboard.map((user, index) => (
                            <div key={user.id} className={`flex items-center justify-between p-4 border-b border-slate-800/50 last:border-0 ${user.isUser ? 'bg-sky-500/10 border-sky-500/20' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <span className={`w-5 text-center text-xs font-medium ${index < 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                                        #{user.rank}
                                    </span>
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 font-medium flex items-center justify-center border border-slate-700 shadow-sm relative overflow-hidden">
                                        {user.avatar}
                                        {index < 2 && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900"></div>}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${user.isUser ? 'text-sky-400' : 'text-white'}`}>{user.name}</p>
                                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest leading-none mt-1 flex items-center gap-1">
                                            {index < 2 ? <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span> : null}
                                            {index < 2 ? 'Active Now' : 'Last seen 2m ago'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-300 tabular-nums">{user.score}</p>
                                    <p className="text-[8px] font-medium text-slate-600 uppercase tracking-tighter">pts earned</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Rules & Protection */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-inner relative overflow-hidden">
                    <ShieldCheck size={40} className="absolute -right-4 -bottom-4 text-slate-800 opacity-30" />
                    <h3 className="text-[10px] font-medium text-sky-400 mb-3 uppercase tracking-widest">Contest Integrity</h3>
                    <ul className="text-[10px] text-slate-400 space-y-2.5 font-medium uppercase tracking-wide leading-relaxed list-none">
                        <li className="flex gap-2">
                             <div className="w-1 h-1 bg-sky-500 rounded-full mt-1.5 shrink-0"></div>
                             Only verified KYC users are eligible for final cash rewards.
                        </li>
                        <li className="flex gap-2">
                             <div className="w-1 h-1 bg-sky-500 rounded-full mt-1.5 shrink-0"></div>
                             Using VPN or multiple accounts will lead to instant disqualification.
                        </li>
                        <li className="flex gap-2">
                             <div className="w-1 h-1 bg-sky-500 rounded-full mt-1.5 shrink-0"></div>
                             Winners are declared within 24h of contest end time.
                        </li>
                    </ul>
                </div>

            </div>

            {/* Bottom Action Footer */}
             <div className="p-4 bg-slate-950 border-t border-slate-800 sticky bottom-0 z-50">
                <button 
                    onClick={() => setShowDemoQuiz(true)}
                    className="w-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-medium uppercase tracking-[0.2em] py-4 rounded-xl flex justify-center items-center gap-2 text-[11px] shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all"
                >
                    <Play size={16} fill="currentColor" />
                    Launch Demo Quiz (Preview)
                </button>
             </div>

             {/* 4. DEMO QUIZ OVERLAY SIMULATION */}
             {showDemoQuiz && (
                 <div className="absolute inset-0 z-[60] bg-slate-950 animate-in slide-in-from-bottom duration-500 flex flex-col p-6">
                     <div className="flex justify-between items-center mb-8">
                         <span className="text-[10px] font-medium text-slate-500 tracking-widest uppercase">Question {currentQuestion + 1}/2</span>
                         <div className="bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30">
                            <span className="text-rose-500 font-medium text-xs font-mono">00:08</span>
                         </div>
                     </div>

                     <div className="flex-1 flex flex-col justify-center">
                        <h2 className="text-xl font-medium text-white text-center mb-10 leading-tight">
                            {quizQuestions[currentQuestion].q}
                        </h2>

                        <div className="grid gap-3">
                            {quizQuestions[currentQuestion].a.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => {
                                        if (currentQuestion < 1) setCurrentQuestion(1);
                                        else setShowDemoQuiz(false);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left text-sm font-medium text-slate-300 hover:border-sky-500 hover:bg-slate-800 transition-all active:scale-95 flex justify-between items-center group"
                                >
                                    {opt}
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-700 group-hover:border-sky-500"></div>
                                </button>
                            ))}
                        </div>
                     </div>

                     <div className="mt-auto py-4 text-center">
                         <p className="text-[9px] text-slate-600 font-medium uppercase tracking-widest">Quiz Demo Mode • No points added</p>
                         <button onClick={() => setShowDemoQuiz(false)} className="text-[10px] text-sky-500 font-medium uppercase mt-4 underline underline-offset-4">Exit Preview</button>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default ContestView;
