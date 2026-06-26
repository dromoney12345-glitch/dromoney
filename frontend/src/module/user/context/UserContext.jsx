import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import api from '../../shared/services/api';
import io from 'socket.io-client';

const UserContext = React.createContext();
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://dromoney.onrender.com';

// Initial empty state to prevent destructuring crashes
const INITIAL_USER_STATE = {
    name: '',
    email: '',
    id: '',
    mongoId: '',
    isPaid: false,
    earnings: { today: 0, total: 0, referral: 0 },
    coins: { total: 0, history: [] },
    referrals: { count: 0, code: '', link: '' },
    wallet: { balance: 0, transactions: [] },
    kycStatus: 'Not Started',
    profileImage: '',
    futureFund: { status: 'locked', progress: 0, criteria: [] },
    isBoosterActive: false,
    isSupportBoosterActive: false,
    isTaskBoosterActive: false,
    supportExpiry: null,
    activeBusinessPlan: 'Free',
    businessPlanStatus: 'none',
    completedTasks: [],
    hasCompletedCourse: false,
    userNotifications: []
};

export const UserProvider = ({ children }) => {
    const [userData, setUserData] = useState(INITIAL_USER_STATE);
    const [notifications, setNotifications] = useState([]);
    const [joinedEvents, setJoinedEvents] = useState([]);
    const [loading, setLoading] = useState(!!localStorage.getItem('dromoney_token'));
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('dromoney_token'));
    const [socket, setSocket] = useState(null);
    const [boostersConfig, setBoostersConfig] = useState({ support: [], task: [] });

    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();

            let activeSocket = null;

            refreshUserProfile().then((profile) => {
                if (profile && profile._id) {
                    // Setup Socket Connection
                    activeSocket = io(SOCKET_URL);
                    setSocket(activeSocket);

                    activeSocket.on('new_broadcast', (notif) => {
                        addNotification(notif.title, notif.message, 'broadcast');
                    });

                    // Listen to real-time withdrawal updates for this specific user
                    activeSocket.on(`withdrawal_update_${profile._id}`, (data) => {
                        refreshUserProfile();
                        // Dispatch custom browser event so active screens like Wallet.jsx can show instant alerts/popups
                        const event = new CustomEvent('withdrawal_status_updated', { detail: data });
                        window.dispatchEvent(event);
                    });
                }
            });

            return () => {
                if (activeSocket) activeSocket.close();
            };
        } else {
            setUserData(INITIAL_USER_STATE);
            setNotifications([]);
        }
    }, [isAuthenticated]);

    const fetchNotifications = async () => {
        try {
            const [notifRes, boosterRes] = await Promise.all([
                api.get('/public/notifications').catch(() => ({ success: false })),
                api.get('/public/boosters').catch(() => ({ success: false }))
            ]);

            if (notifRes.success && notifRes.data) {
                const readIds = JSON.parse(localStorage.getItem('dromoney_read_notifs') || '[]');
                const mapped = notifRes.data.map(n => ({
                    id: n._id,
                    title: n.title,
                    message: n.message,
                    time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: n.type || 'broadcast',
                    isRead: readIds.includes(n._id)
                }));
                setNotifications(mapped);
            }

            if (boosterRes.success && boosterRes.data) {
                const config = {};
                boosterRes.data.forEach(b => {
                    config[b.type] = b.applicableTasks || [];
                });
                setBoostersConfig(config);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    };

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        const readIds = JSON.parse(localStorage.getItem('dromoney_read_notifs') || '[]');
        if (!readIds.includes(id)) {
            readIds.push(id);
            localStorage.setItem('dromoney_read_notifs', JSON.stringify(readIds));
        }
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const refreshUserProfile = async (showSpinner = false) => {
        if (!isAuthenticated) return null;
        if (showSpinner) {
            setLoading(true);
        }
        try {
            const [profileRes, txRes] = await Promise.all([
                api.get('/user/auth/me'),
                api.get('/user/wallet/transactions').catch(err => {
                    console.error("Failed to load transactions:", err);
                    return { success: false, data: [] };
                })
            ]);
            if (profileRes.success && profileRes.data) {
                const transactions = txRes.success && txRes.data ? txRes.data : [];
                mapAndSetUserData(profileRes.data, transactions, profileRes.settings);
                return profileRes.data;
            }
        } catch (err) {
            console.error("Profile Sync Error:", err);
            if (err.status === 401) logout();
        } finally {
            setLoading(false);
        }
        return null;
    };

    const mapAndSetUserData = (dbUser, transactions = [], settings = {}) => {
        const inrTransactions = transactions.filter(t => t.currency === 'INR');
        const dynamicWalletBalance = inrTransactions.reduce((acc, tx) => {
            if (tx.type === 'credit' && tx.status === 'Success') {
                return acc + (tx.amount || 0);
            }
            if (tx.type === 'withdrawal' && tx.status === 'Success') {
                return acc - (tx.amount || 0);
            }
            return acc;
        }, 0);

        setUserData({
            name: dbUser.name,
            id: `AFF-${dbUser.referralCode}`,
            mongoId: dbUser._id,
            email: dbUser.email,
            phone: dbUser.phone,
            isPaid: dbUser.isPaid,
            isBoosterActive: dbUser.isBoosterActive,
            isSupportBoosterActive: dbUser.isSupportBoosterActive,
            isTaskBoosterActive: dbUser.isTaskBoosterActive,
            earnings: {
                today: dbUser.wallet?.todayEarnings || 0,
                total: dbUser.wallet?.lifetimeEarnings || 0,
                referral: dbUser.wallet?.referralEarnings || 0
            },
            coins: {
                total: dbUser.coins?.balance || 0,
                history: transactions.filter(t => t.currency === 'COIN')
            },
            referrals: {
                count: dbUser.referralCount || 0,
                code: dbUser.referralCode,
                link: `${settings?.referralLinkBaseUrl || 'https://earningapp.com/join/'}${dbUser.referralCode}`
            },
            wallet: {
                balance: dynamicWalletBalance,
                transactions: inrTransactions
            },
            kycStatus: dbUser.kyc?.status || 'Not Started',
            kycRejectionReason: dbUser.kyc?.rejectionReason || '',
            profileImage: dbUser.profileImage || '',
            futureFund: {
                status: dbUser.futureFund?.status || 'locked',
                progress: dbUser.futureFund?.progress || 0,
                criteria: dbUser.futureFund?.criteria || []
            },
            watchedAdsCount: dbUser.watchedAds ? dbUser.watchedAds.length : 0,
            supportExpiry: dbUser.supportExpiry,
            activeBusinessPlan: dbUser.activeBusinessPlan || 'Free',
            businessPlanStatus: dbUser.businessPlanStatus || 'none',
            businessHubFirstAccessedAt: dbUser.businessHubFirstAccessedAt,
            completedTasks: dbUser.completedTasks || [],
            dailyTaskCompletions: dbUser.dailyTaskCompletions || [],
            hasCompletedCourse: dbUser.hasCompletedCourse || false,
            userNotifications: dbUser.notifications || []
        });
    };

    const sendLoginOtp = async (phone) => {
        setLoading(true);
        try {
            const response = await api.post('/user/auth/send-otp', { phone });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message || 'OTP Send failed' };
        } finally {
            setLoading(false);
        }
    };

    const sendRegisterOtp = async (phone, email) => {
        setLoading(true);
        try {
            const response = await api.post('/user/auth/send-otp-register', { phone, email });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message || 'OTP Send failed' };
        } finally {
            setLoading(false);
        }
    };

    const verifyLoginOtp = async (phone, otp) => {
        setLoading(true);
        try {
            const response = await api.post('/user/auth/verify-otp', { phone, otp });
            localStorage.setItem('dromoney_token', response.token);
            setIsAuthenticated(true);
            return { success: true };
        } catch (err) {
            setLoading(false);
            return { success: false, error: err.message || 'Verification failed' };
        }
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const response = await api.post('/user/auth/login', { email, password });
            localStorage.setItem('dromoney_token', response.token);
            setIsAuthenticated(true);
            return { success: true };
        } catch (err) {
            setLoading(false);
            return { success: false, error: err.message || 'Login failed' };
        }
    };

    const register = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/user/auth/register', formData);
            localStorage.setItem('dromoney_token', response.token);
            setIsAuthenticated(true);
            return { success: true };
        } catch (err) {
            setLoading(false);
            return { success: false, error: err.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('dromoney_token');
        setIsAuthenticated(false);
        setUserData(INITIAL_USER_STATE);
        localStorage.removeItem('dromoney_read_notifs');
        localStorage.removeItem('dromoney_completed_tasks');
    };

    const unlockPlatform = async () => {
        try {
            await api.post('/user/data/unlock');
            await refreshUserProfile();
            return true;
        } catch (err) { return false; }
    };

    const completeCourse = async () => {
        try {
            await api.post('/user/data/complete-course');
            await refreshUserProfile();
            return true;
        } catch (err) {
            console.error("Failed to complete course:", err);
            return false;
        }
    };

    const addCoins = async (amount, source, taskId) => {
        try {
            const res = await api.post('/user/wallet/add-coins', { amount, source, taskId });
            // Immediately update local coin balance from the server-confirmed value
            // This avoids calling refreshUserProfile() which was hitting /auth/me → 401 → auto-logout
            if (res?.data?.newCoinBalance !== undefined) {
                setUserData(prev => ({
                    ...prev,
                    coins: { ...prev.coins, total: res.data.newCoinBalance },
                    completedTasks: res.data.completedTasks || prev.completedTasks,
                    dailyTaskCompletions: res.data.dailyTaskCompletions || prev.dailyTaskCompletions
                }));
            }
            return { success: true };
        } catch (err) {
            console.error('addCoins error:', err);
            return { success: false, message: err.message || 'Failed to add coins' };
        }
    };

    const requestWithdrawal = async (amount, bankDetails, paymentMethod = 'Bank Transfer') => {
        try {
            await api.post('/user/wallet/withdraw', { amount, bankDetails, paymentMethod });
            // Note: refreshUserProfile is called by the caller AFTER showing success modal
            return { success: true };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || err.message || 'Withdrawal failed'
            };
        }
    };

    const updateProfileImage = async (newUrl) => {
        setUserData(prev => ({ ...prev, profileImage: newUrl }));
    };

    const updateProfileData = async (data) => {
        try {
            const res = await api.patch('/user/data/profile', data);
            if (res.success) {
                setUserData(prev => ({
                    ...prev,
                    ...(data.name && { name: data.name }),
                    ...(data.email && { email: data.email }),
                    ...(data.phone && { phone: data.phone })
                }));
                return { success: true };
            }
            return { success: false, error: res.message || 'Failed to update' };
        } catch (error) {
            console.error('Update Profile error:', error);
            return { success: false, error: error.response?.data?.message || 'Server error' };
        }
    };

    const addNotification = (title, message, type) => {
        setNotifications(prev => [{ id: Date.now(), title, message, time: "Just now", type, isRead: false }, ...prev]);
    };

    const value = useMemo(() => ({
        userData,
        notifications,
        loading,
        isAuthenticated,
        login,
        sendLoginOtp,
        sendRegisterOtp,
        verifyLoginOtp,
        register,
        logout,
        unlockPlatform,
        completeCourse,
        addCoins,
        updateCoinBalance: (newBalance) => {
            setUserData(prev => ({ ...prev, coins: { ...prev.coins, total: newBalance } }));
        },
        requestWithdrawal,
        addNotification,
        refreshUserProfile,
        updateProfileImage,
        updateProfileData,
        clearNotifications,
        boostersConfig
    }), [userData, notifications, loading, isAuthenticated, boostersConfig]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser must be used within a UserProvider');
    return context;
};
