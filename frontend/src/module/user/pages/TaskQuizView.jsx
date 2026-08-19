import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, Timer, Trophy, IndianRupee, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { eventStorage } from '../../shared/services/eventStorage';
import { taskStorage } from '../../shared/services/taskStorage';

const TaskQuizView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCoins, userData, boostersConfig } = useUser();
    // We reuse event questions as a generic bank for 10 questions
    const QUESTIONS = eventStorage.getQuestions();
    const totalQ = QUESTIONS.length;
    
    const task = taskStorage.getTasks().find(t => String(t.id) === String(id));
    const reward = task ? (task.coinsReward || task.reward || 1) : 1;
    
    const [currentStep, setCurrentStep] = useState(0); // 0: Start, 1: Questions, 2: Result
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const isSupportBoosterActive = userData?.isSupportBoosterActive && (!boostersConfig?.support?.length || boostersConfig.support.includes('Task Quiz'));
    const isTaskBoosterActive = userData?.isTaskBoosterActive && (!boostersConfig?.task?.length || boostersConfig.task.includes('Task Quiz'));
    const [timeLeft, setTimeLeft] = useState(isSupportBoosterActive ? 13 : 10);
    const [score, setScore] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isEventClosed, setIsEventClosed] = useState(false);

    useEffect(() => {
        const completed = taskStorage.getCompletedTasks();
        if (completed.includes(id)) {
            setIsEventClosed(true);
            setCurrentStep(2);
            setScore(10); 
        }
    }, [id]);

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
        setTimeout(() => { handleNext(newScore); }, 1000);
    };

    const handleNext = (latestScore) => {
        const currentScore = latestScore !== undefined ? latestScore : score;
        if (currentQuestion < QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setTimeLeft(isSupportBoosterActive ? 13 : 10);
        } else {
            handleFinish(currentScore);
        }
    };

    const handleFinish = async (finalScore) => {
        const s = finalScore !== undefined ? finalScore : score;
        setCurrentStep(2);
        
        const completed = taskStorage.getCompletedTasks();
        if (!completed.includes(id)) {
            if (s === 10) {
                const res = await addCoins(reward, `Task Quiz: ${task?.title}`, id);
                if (res && res.success) {
                    taskStorage.markComplete(id);
                } else {
                    alert(res?.message || 'Failed to add reward. Please try again later.');
                }
            } else {
                taskStorage.markComplete(id);
            }
        }
    };

    if (currentStep === 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col p-6 animate-in fade-in duration-500">
                <header className="flex items-center gap-4 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-slate-50 rounded-full">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <h1 className="text-xl font-medium text-slate-800 tracking-tight uppercase">Simple Quiz Task</h1>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
                    <div className="w-28 h-28 bg-indigo-50 rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-100 border-4 border-white mb-6 animate-pulse">
                        <Sparkles size={48} className="text-indigo-500" />
                    </div>
                    
                    <h2 className="text-3xl font-medium text-slate-800 leading-tight mb-3">Ready for challenge?</h2>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto text-xs leading-relaxed uppercase tracking-tighter mb-8">
                        Answer 10 simple questions correctly to win your reward instantly! 
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs mx-auto">
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">Questions</p>
                            <p className="text-lg font-medium text-slate-800">10</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                            {userData?.isSupportBoosterActive && (
                                <div className="absolute top-0 right-0 bg-amber-400 text-slate-900 text-[7px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
                                    +3s Booster
                                </div>
                            )}
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">Time/Ques</p>
                            <p className="text-lg font-medium text-slate-800">{userData?.isSupportBoosterActive ? '13s' : '10s'}</p>
                        </div>
                    </div>
                </div>

                {isEventClosed ? (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
                        <AlertCircle className="text-amber-500" size={20} />
                        <p className="text-[11px] font-medium text-amber-700 uppercase tracking-widest">You have already completed this quiz today!</p>
                    </div>
                ) : (
                    <button 
                        onClick={() => setCurrentStep(1)}
                        className="w-full bg-blue-600 text-white py-5 rounded-3xl font-medium text-lg uppercase tracking-widest shadow-2xl shadow-blue-100 active:scale-95 transition-all mb-8"
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
            <div className="min-h-screen bg-slate-50 flex flex-col pt-0 animate-in fade-in duration-300">
                {/* Progress Header */}
                <div className="bg-white px-6 py-8 rounded-b-[3rem] shadow-xl shadow-slate-200/50 z-10 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-6">
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
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50 p-0.5">
                        <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${((currentQuestion + 1) / totalQ) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex-1 px-6 py-4 flex flex-col justify-start">
                    <h2 className="text-2xl font-medium text-slate-800 mb-6 leading-snug tracking-tight">
                        {question.question}
                    </h2>

                    <div className="space-y-4">
                        {question.options.map((option, index) => {
                            let statusClasses = "bg-white border-slate-100 text-slate-700";
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
                                    className={`w-full p-5 rounded-3xl border-2 text-left font-medium transition-all flex items-center justify-between group ${statusClasses}`}
                                >
                                    <span className="text-[15px] uppercase tracking-tight">{option}</span>
                                    {isAnswered && index === QUESTIONS[currentQuestion].answer && <CheckCircle2 size={24} className="text-emerald-500" />}
                                    {isAnswered && index === selectedOption && index !== QUESTIONS[currentQuestion].answer && <XCircle size={24} className="text-rose-500" />}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Common Instruction Below Options */}
                    <p className="mt-8 text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                        Choose the most appropriate answer above.
                    </p>
                </div>
            </div>
        );
    }

    const isWin = score === 10;

    return (
        <div className="min-h-screen bg-white flex flex-col p-6 animate-in zoom-in-95 duration-500">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                {isWin ? (
                    <>
                        <div className="w-32 h-32 bg-emerald-50 rounded-[3rem] flex items-center justify-center border-4 border-white shadow-2xl animate-in zoom-in duration-700">
                            <Trophy size={64} className="text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-medium text-slate-800 tracking-tight leading-none">Successfully <br/> You Won!</h2>
                            <p className="text-slate-500 font-medium uppercase tracking-widest text-[11px]">Task Completed 10/10</p>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 w-full max-w-xs space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-xl">
                                    <IndianRupee size={20} className="text-amber-600" />
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-medium text-amber-600 uppercase leading-none">Task Reward</p>
                                        {isTaskBoosterActive && (
                                            <span className="text-[10px] font-medium text-amber-500 uppercase tracking-widest ml-2 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">3X Boosted</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-normal">Completed under 5s</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-amber-500 text-sm">
                                        +₹{isTaskBoosterActive ? reward * 12 : reward}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-32 h-32 bg-rose-50 rounded-[3rem] flex items-center justify-center border-4 border-white shadow-2xl animate-in zoom-in duration-700">
                            <XCircle size={64} className="text-rose-500" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-medium text-slate-800 tracking-tight leading-none">You Lost</h2>
                            <p className="text-slate-500 font-medium uppercase tracking-widest text-[11px] leading-relaxed">
                                You scored {score}/10.<br/>
                                Please next day try!
                            </p>
                        </div>
                    </>
                )}
            </div>

            <button 
                onClick={() => navigate('/user/earn')}
                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-medium text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all mb-4 flex items-center justify-center gap-3"
            >
                Continue <ArrowRight size={20} />
            </button>
        </div>
    );
};

export default TaskQuizView;
