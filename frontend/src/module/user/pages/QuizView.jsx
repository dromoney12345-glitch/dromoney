import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, Timer, Trophy, Coins, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { taskStorage } from '../../shared/services/taskStorage';
import api from '../../shared/services/api';

const QuizView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData, addCoins, boostersConfig, refreshUserProfile } = useUser();
    
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(0); // 0: Start, 1: Questions, 2: Result
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [score, setScore] = useState(0);
    const isSupportBoosterActive = userData?.isSupportBoosterActive && (!boostersConfig?.support?.length || boostersConfig.support.includes('Standard Quiz'));
    const isTaskBoosterActive = userData?.isTaskBoosterActive && (!boostersConfig?.task?.length || boostersConfig.task.includes('Standard Quiz'));
    const [timeLeft, setTimeLeft] = useState(isSupportBoosterActive ? 18 : 15);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isEventClosed, setIsEventClosed] = useState(false);
    const [startTime, setStartTime] = useState(null);

    const QUESTIONS = eventData?.config?.questions || [];
    const totalQ = QUESTIONS.length;
    
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/public/events/${id}`);
                if (res.success) {
                    setEventData(res.data);
                    
                    // Check if event is already completed and read the correct score from storage
                    const completed = JSON.parse(localStorage.getItem('dromoney_completed_events') || '[]');
                    if (completed.includes(id)) {
                        setIsEventClosed(true);
                        setCurrentStep(2);
                        
                        // Read actual score, fallback to res.data's length
                        const savedScores = JSON.parse(localStorage.getItem('dromoney_event_scores') || '{}');
                        const actualScore = savedScores[id] !== undefined ? savedScores[id] : (res.data?.config?.questions?.length || 5);
                        setScore(actualScore);
                    }
                }
            } catch (err) {
                console.error("Error fetching event:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (currentStep === 1 && !startTime) {
            setStartTime(Date.now());
        }
    }, [currentStep, startTime]);

    useEffect(() => {
        let timer;
        if (currentStep === 1 && !isAnswered && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && !isAnswered) {
            handleNext();
        }
        return () => clearInterval(timer);
    }, [currentStep, timeLeft, isAnswered]);

    const handleOptionSelect = (index) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);
        let newScore = score;
        if (index === QUESTIONS[currentQuestion].answer) {
            newScore = score + 1;
            setScore(newScore);
        }
        setTimeout(() => { handleNext(newScore); }, 1200);
    };

    const handleNext = (currentScore) => {
        const s = currentScore !== undefined ? currentScore : score;
        if (currentQuestion < QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setTimeLeft(isSupportBoosterActive ? 18 : 15);
        } else {
            handleFinish(s);
        }
    };

    const handleFinish = async (finalScore) => {
        const s = finalScore !== undefined ? finalScore : score;
        setCurrentStep(2);

        let calculatedTimeTaken = 0;
        if (startTime) {
            calculatedTimeTaken = Math.round((Date.now() - startTime) / 1000);
        }

        const completed = JSON.parse(localStorage.getItem('dromoney_completed_events') || '[]');
        if (!completed.includes(id)) {
            completed.push(id);
            localStorage.setItem('dromoney_completed_events', JSON.stringify(completed));
            
            // Save the actual score locally
            const savedScores = JSON.parse(localStorage.getItem('dromoney_event_scores') || '{}');
            savedScores[id] = s;
            localStorage.setItem('dromoney_event_scores', JSON.stringify(savedScores));
            
            // Add coins locally for immediate feedback ONLY if they get all questions correct
            let baseCoinPrize = 0;
            if (s === totalQ) {
                baseCoinPrize = eventData?.config?.reward || s * 10;
                addCoins(baseCoinPrize, `Quiz Prize: ${eventData?.title || 'Event'}`, id);
            }
            taskStorage.markComplete(id);

            try {
                // Save result to Backend
                const submitRes = await api.post(`/user/data/events/${id}/submit`, {
                    score: s,
                    result: `${s}/${totalQ}`,
                    prize: `${coinPrize} Coins`,
                    timeTaken: calculatedTimeTaken
                });
                if (submitRes?.supportBoosterConsumed) {
                    await refreshUserProfile?.(false);
                }
            } catch (err) {
                console.error("Failed to save result to server:", err);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (currentStep === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#EBF2FA] via-[#F1F5F9] to-[#E2E8F0] flex flex-col p-6 animate-in fade-in duration-500">
                <header className="flex items-center gap-4 mb-10">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/80 rounded-full active:scale-90 transition-all cursor-pointer shadow-sm border border-slate-100">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <h1 className="text-xl font-medium text-slate-800 tracking-tight uppercase">{eventData?.title || 'Daily Quiz'}</h1>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                    <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-slate-200/50 border-4 border-white rotate-3">
                        <Sparkles size={64} className="text-indigo-500 animate-pulse" />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-3xl font-medium text-slate-800 leading-tight">Ready for the challenge?</h2>
                        <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm leading-relaxed uppercase tracking-tighter">
                            Answer {totalQ || 5} simple questions and win up to {totalQ * 10 || 50} coins in your wallet instantly!
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-100/50 shadow-sm text-center">
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">Questions</p>
                            <p className="text-lg font-medium text-slate-800">{totalQ || 5}</p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-100/50 shadow-sm text-center relative overflow-hidden">
                            {isSupportBoosterActive && (
                                <div className="absolute top-0 right-0 bg-amber-400 text-slate-900 text-[7px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
                                    +3s Booster
                                </div>
                            )}
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">Time/Ques</p>
                            <p className="text-lg font-medium text-slate-800">{isSupportBoosterActive ? '18s' : '15s'}</p>
                        </div>
                    </div>
                </div>

                {isEventClosed ? (
                    <div className="bg-amber-55/10 backdrop-blur-md border border-amber-200/60 p-4 rounded-2xl flex items-center gap-3 mb-6 max-w-xs mx-auto w-full bg-white/65 shadow-sm">
                        <AlertCircle className="text-amber-550 shrink-0" size={20} />
                        <p className="text-[11px] font-medium text-amber-700 uppercase tracking-widest text-left">You have already completed this quiz today!</p>
                    </div>
                ) : (
                    <button 
                        onClick={() => setCurrentStep(1)}
                        className="w-full max-w-xs mx-auto bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-medium text-lg uppercase tracking-widest shadow-2xl shadow-blue-100 active:scale-95 transition-all mb-8 cursor-pointer"
                    >
                        Start Now
                    </button>
                )}
            </div>
        );
    }

    if (currentStep === 1) {
        const question = QUESTIONS[currentQuestion];
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#EBF2FA] via-[#F1F5F9] to-[#E2E8F0] flex flex-col pt-0 animate-in fade-in duration-300">
                {/* Progress Header */}
                <div className="bg-white px-6 py-8 rounded-b-[3rem] shadow-xl shadow-slate-200/50 z-10 border-b border-slate-100 sticky top-0">
                    <div className="flex items-center justify-between mb-6 max-w-md mx-auto">
                        <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[12px] font-medium uppercase tracking-widest border border-blue-100">
                            Question {currentQuestion + 1}/{totalQ}
                        </span>
                        <div className="flex items-center gap-2 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 relative">
                            <Timer size={16} className={`text-rose-500 ${timeLeft < 5 ? 'animate-pulse' : ''}`} />
                            <span className={`text-[14px] font-medium ${timeLeft < 5 ? 'text-rose-600' : 'text-slate-700'}`}>{timeLeft}s</span>
                            {isSupportBoosterActive && (
                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-bold text-[#F59E0B] bg-amber-50 px-1 py-0.5 rounded border border-amber-200 uppercase whitespace-nowrap">
                                    +3s Boost
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50 p-0.5 max-w-md mx-auto">
                        <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${((currentQuestion + 1) / totalQ) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex-1 px-6 py-10 flex flex-col justify-center max-w-md mx-auto w-full">
                    <h2 className="text-2xl font-medium text-slate-800 mb-10 leading-snug tracking-tight text-center">
                        {question?.question}
                    </h2>

                    <div className="space-y-4">
                        {question?.options.map((option, index) => {
                            let statusClasses = "bg-white border-slate-100 text-slate-700 hover:bg-slate-50";
                            if (isAnswered) {
                                if (index === question.answer) {
                                    statusClasses = "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-100";
                                } else if (index === selectedOption) {
                                    statusClasses = "bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-100";
                                } else {
                                    statusClasses = "bg-white border-slate-100 text-slate-300 opacity-50";
                                }
                            } else if (selectedOption === index) {
                                statusClasses = "bg-blue-50 border-blue-500 text-blue-700";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleOptionSelect(index)}
                                    disabled={isAnswered}
                                    className={`w-full p-5 rounded-3xl border-2 text-left font-medium transition-all flex items-center justify-between group active:scale-[0.98] cursor-pointer shadow-sm ${statusClasses}`}
                                >
                                    <span className="text-[15px] uppercase tracking-tight">{option}</span>
                                    {isAnswered && index === QUESTIONS[currentQuestion].answer && <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />}
                                    {isAnswered && index === selectedOption && index !== QUESTIONS[currentQuestion].answer && <XCircle size={24} className="text-rose-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#EBF2FA] via-[#F1F5F9] to-[#E2E8F0] flex flex-col p-6 animate-in zoom-in-95 duration-500">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 max-w-md mx-auto w-full">
                {/* Green Trophy Cup with gold sparkle badge */}
                <div className="relative">
                    <div className="w-36 h-36 bg-emerald-100/80 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-2xl animate-bounce" style={{ animationDuration: '3s' }}>
                        <Trophy size={72} className="text-emerald-600" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-amber-400 p-3 rounded-full shadow-lg border-4 border-white flex items-center justify-center">
                        <Sparkles size={20} className="text-white fill-white" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-medium text-slate-800 tracking-tight leading-none uppercase">Victory!</h2>
                    <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Quiz finished successfully</p>
                </div>

                {/* Highly polished, compact Pastel score and coin reward card */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 w-full max-w-xs space-y-5">
                    <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Your Final Score</p>
                        <div className="flex items-center justify-center gap-1">
                             <span className="text-4.5xl font-medium text-slate-800 leading-none">{score}</span>
                             <span className="text-base font-medium text-slate-300 mt-3">/ {totalQ || 5}</span>
                        </div>
                    </div>
                    
                    <div className="w-full h-px bg-slate-100"></div>
                    
                    <div className="flex items-center justify-center gap-3 bg-amber-50 border border-amber-100/50 p-3.5 rounded-2xl">
                        <div className="bg-amber-400 p-2 rounded-xl">
                            <Coins size={18} className="text-white fill-white" />
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] font-medium text-amber-600 uppercase leading-none mb-1">Total Prize</p>
                            <p className="text-lg font-medium text-slate-800 tracking-tight leading-none">+{score * 10} Coins</p>
                        </div>
                    </div>
                </div>

                {/* Elegant Alert Block */}
                <div className="p-4 bg-blue-50/70 border border-blue-100/50 rounded-2xl flex items-center gap-3.5 w-full max-w-xs shadow-md">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <CheckCircle2 size={20} className="text-blue-500" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-[11px] font-medium text-slate-700 uppercase tracking-tight">Event Status</h4>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Closing for verification...</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => navigate(-1)}
                className="w-full max-w-xs mx-auto bg-slate-900 hover:bg-black text-white py-4.5 rounded-3xl font-medium text-sm uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all mb-8 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
                Go Back <ArrowRight size={18} />
            </button>
        </div>
    );
};

export default QuizView;
