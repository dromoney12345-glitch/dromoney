import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import api, { BASE_URL } from '../../shared/services/api';
import io from 'socket.io-client';
import { buildReferralLink, getPendingReferralCode, clearPendingReferralCode, savePendingReferralCode, fetchFlutterInstallReferrer, getReferralClickId, clearReferralClickId } from '../../shared/utils/referral';
import { installFcmTokenBridge, requestNativeFcmToken, saveFcmTokenToServer, readPendingFcmToken } from '../../shared/utils/fcmToken';
import { showFlutterSystemNotification } from '../../shared/utils/flutterNotifications';

const UserContext = React.createContext();

/** Always resolve an absolute Socket.io URL — empty/relative falls back to Vite origin and 404s. */
function getSocketUrl() {
    const envUrl = String(import.meta.env.VITE_SOCKET_URL || '').trim().replace(/\/$/, '');
    if (envUrl) return envUrl;
    const base = String(BASE_URL || '').trim().replace(/\/$/, '');
    if (base && /^https?:\/\//i.test(base)) return base;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        return 'http://localhost:5001';
    }
    return window.location.origin;
}

const SOCKET_URL = getSocketUrl();

// Initial empty state to prevent destructuring crashes
const INITIAL_USER_STATE = {
    name: '',
    email: '',
    id: '',
    mongoId: '',
    isPaid: false,
    earnings: { today: 0, total: 0, referral: 0 },
    
    referrals: { count: 0, code: '', link: '' },
    wallet: { balance: 0, pendingBalance: 0, virtualBalance: 0, transactions: [] },
    withdrawalCard: { status: 'none' },
    virtualAccount: null,
    kycStatus: 'Not Started',
    profileImage: '',
    todayRewardCount: 0,
    futureFund: { status: 'locked', progress: 0, criteria: [] },
    isBoosterActive: false,
    isSupportBoosterActive: false,
    isTaskBoosterActive: false,
    supportExpiry: null,
    unlockedIdeas: [],
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
        installFcmTokenBridge();

        const CURRENT_VERSION = '2.1';
        if (localStorage.getItem('dromoney_app_version') !== CURRENT_VERSION) {
            const keep = {};
            ['dromoney_token', 'pending_mobile_fcm_token', 'dromoney_referral_code', 'dromoney_referral_click'].forEach((key) => {
                const value = localStorage.getItem(key);
                if (value) keep[key] = value;
            });
            localStorage.clear();
            Object.entries(keep).forEach(([key, value]) => localStorage.setItem(key, value));
            localStorage.setItem('dromoney_app_version', CURRENT_VERSION);
            window.location.reload();
        }

        if (isAuthenticated) {
            fetchNotifications();

            let activeSocket = null;

            refreshUserProfile().then((profile) => {
                if (profile && profile._id) {
                    // Setup Socket Connection
                    activeSocket = io(SOCKET_URL, {
                        path: '/socket.io',
                        transports: ['websocket', 'polling'],
                        withCredentials: true,
                        reconnection: true,
                        reconnectionAttempts: 10,
                    });
                    setSocket(activeSocket);

                    activeSocket.on('connect', () => {
                        console.debug('[User Socket] Connected:', activeSocket.id, '→', SOCKET_URL);
                    });
                    activeSocket.on('connect_error', (err) => {
                        console.warn('[User Socket] connect_error:', err.message, '→', SOCKET_URL);
                    });

                    // Listen to real-time withdrawal updates for this specific user
                    activeSocket.on(`withdrawal_update_${profile._id}`, (data) => {
                        refreshUserProfile();
                        const event = new CustomEvent('withdrawal_status_updated', { detail: data });
                        window.dispatchEvent(event);
                    });

                    activeSocket.on(`payment_update_${profile._id}`, (data) => {
                        refreshUserProfile();
                        const event = new CustomEvent('payment_status_updated', { detail: data });
                        window.dispatchEvent(event);
                    });

                    activeSocket.on(`user_notification_${profile._id}`, (notif) => {
                        addNotification(notif.title, notif.message, notif.type || 'info');
                        fetchNotifications();
                        // Phone tray while app is open (FCM alone often skips foreground)
                        showFlutterSystemNotification({
                            title: notif.title,
                            body: notif.message,
                            link: notif.link || '/user/home',
                            type: notif.type || 'info',
                        });
                    });

                    activeSocket.on('new_broadcast', (notif) => {
                        addNotification(notif.title, notif.message, 'broadcast');
                        fetchNotifications();
                        showFlutterSystemNotification({
                            title: notif.title,
                            body: notif.message,
                            link: notif.link || '/user/home',
                            type: 'broadcast',
                        });
                    });

                    requestNativeFcmToken();
                    // Extra pull after socket ready — Flutter often injects token late
                    setTimeout(() => requestNativeFcmToken(), 2500);
                    setTimeout(() => requestNativeFcmToken(), 8000);
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
            const [notifRes, boosterRes, inboxRes] = await Promise.all([
                api.get('/public/notifications').catch(() => ({ success: false })),
                api.get('/public/boosters').catch(() => ({ success: false })),
                isAuthenticated
                    ? api.get('/user/data/notifications').catch(() => ({ success: false }))
                    : Promise.resolve({ success: false }),
            ]);

            const readIds = JSON.parse(localStorage.getItem('dromoney_read_notifs') || '[]');
            const broadcasts = (notifRes.success && notifRes.data)
                ? notifRes.data.map((n) => ({
                    id: n._id,
                    title: n.title,
                    message: n.message,
                    time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: new Date(n.createdAt).getTime(),
                    type: n.type || 'broadcast',
                    isRead: readIds.includes(n._id),
                }))
                : [];

            const personal = (inboxRes.success && inboxRes.data)
                ? inboxRes.data.map((n) => ({
                    id: n._id,
                    title: n.title,
                    message: n.message,
                    time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    timestamp: n.createdAt ? new Date(n.createdAt).getTime() : 0,
                    type: n.type || 'info',
                    isRead: !!n.isRead || readIds.includes(n._id),
                }))
                : [];

            setNotifications([...personal, ...broadcasts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));

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
        if (id && isAuthenticated) {
            api.patch(`/user/data/notifications/${id}/read`).catch(() => {});
        }
    };

    const clearNotifications = async () => {
        setNotifications([]);
        try {
            await api.delete('/user/data/notifications');
            setUserData((prev) => ({ ...prev, userNotifications: [] }));
        } catch (err) {
            console.error("Failed to clear personal notifications", err);
        }
    };

    const tryAttachPendingReferral = async ({ waitMs = 0 } = {}) => {
        let code = getPendingReferralCode();
        if (!code && waitMs > 0) {
            code = await fetchFlutterInstallReferrer(waitMs);
        }
        if (code) savePendingReferralCode(code);
        code = getPendingReferralCode();
        const clickId = getReferralClickId();
        if (!code && !clickId) return false;
        try {
            const res = await api.post('/user/data/attach-referral', {
                referralCode: code || '',
                referralClickId: clickId,
            });
            if (res?.success) {
                clearPendingReferralCode();
                clearReferralClickId();
                return !!res.attached;
            }
        } catch (err) {
            if (err?.status === 400) {
                clearPendingReferralCode();
                clearReferralClickId();
            }
        }
        return false;
    };

    useEffect(() => {
        const onReferralSaved = () => {
            if (localStorage.getItem('dromoney_token')) {
                tryAttachPendingReferral();
            }
        };
        window.addEventListener('dromoney_referral_saved', onReferralSaved);
        if (!isAuthenticated) {
            return () => window.removeEventListener('dromoney_referral_saved', onReferralSaved);
        }
        const retrySoon = setTimeout(() => tryAttachPendingReferral({ waitMs: 4000 }), 2500);
        const retryLater = setTimeout(() => tryAttachPendingReferral({ waitMs: 4000 }), 10000);
        return () => {
            window.removeEventListener('dromoney_referral_saved', onReferralSaved);
            clearTimeout(retrySoon);
            clearTimeout(retryLater);
        };
    }, [isAuthenticated]);

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
                
                // Check for pending FCM token and save it now that user is authenticated
                const pendingToken = readPendingFcmToken();
                if (pendingToken) {
                    saveFcmTokenToServer(pendingToken, 'mobile');
                }
                requestNativeFcmToken();

                await tryAttachPendingReferral();
                fetchNotifications();
                
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

        setUserData({
            name: dbUser.name,
            id: `AFF-${dbUser.referralCode}`,
            mongoId: dbUser._id,
            megaEligibility: dbUser.megaEligibility || null,
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
            
            referrals: {
                count: dbUser.referralCount || 0,
                code: dbUser.referralCode,
                link: buildReferralLink(dbUser.referralCode, settings?.referralLinkBaseUrl)
            },
            wallet: {
                balance: dbUser.wallet?.balance || 0,
                pendingBalance: dbUser.wallet?.pendingBalance || 0,
                virtualBalance: dbUser.wallet?.virtualBalance || 0,
                transactions: inrTransactions
            },
            withdrawalCard: dbUser.withdrawalCard || { status: 'none' },
            kycStatus: dbUser.kyc?.status || 'Not Started',
            kycRejectionReason: dbUser.kyc?.rejectionReason || '',
            profileImage: dbUser.profileImage || '',
            futureFund: {
                status: dbUser.futureFund?.status || 'locked',
                progress: dbUser.futureFund?.progress || 0,
                criteria: dbUser.futureFund?.criteria || []
            },
            todayRewardCount: dbUser.todayRewardCount || 0,
            watchedAdsCount: dbUser.lifetimeAdsWatched || (dbUser.watchedAds ? dbUser.watchedAds.length : 0),
            lifetimeAdsWatched: dbUser.lifetimeAdsWatched || 0,
            lifetimeTasksCompleted: dbUser.lifetimeTasksCompleted || 0,
            supportExpiry: dbUser.supportExpiry,
            unlockedIdeas: (dbUser.unlockedIdeas || []).map((id) => id.toString()),
            activeBusinessPlan: dbUser.activeBusinessPlan || 'Free',
            businessPlanStatus: dbUser.businessPlanStatus || 'none',
            businessHubFirstAccessedAt: dbUser.businessHubFirstAccessedAt,
            completedTasks: dbUser.completedTasks || [],
            dailyTaskCompletions: dbUser.dailyTaskCompletions || [],
            hasCompletedCourse: dbUser.hasCompletedCourse || false,
            userNotifications: dbUser.notifications || [],
            virtualAccount: dbUser.virtualAccount || null,
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

    const persistFcmAfterAuth = () => {
        const pending = readPendingFcmToken();
        if (pending) saveFcmTokenToServer(pending, 'mobile');
        requestNativeFcmToken();
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
            sessionStorage.removeItem('dromoney_va_guide_shown');
            setIsAuthenticated(true);
            persistFcmAfterAuth();
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
            sessionStorage.removeItem('dromoney_va_guide_shown');
            setIsAuthenticated(true);
            persistFcmAfterAuth();
            return { success: true };
        } catch (err) {
            setLoading(false);
            return { success: false, error: err.message || 'Login failed' };
        }
    };

    const register = async (formData) => {
        setLoading(true);
        try {
            const referralCode = formData.referralCode || getPendingReferralCode() || '';
            if (referralCode) savePendingReferralCode(referralCode);
            const clickId = getReferralClickId();
            const headers = {};
            if (referralCode) headers['X-Referral-Code'] = referralCode;
            if (clickId) headers['X-Referral-Click'] = clickId;
            const response = await api.post(
                '/user/auth/register',
                { ...formData, referralCode, referralClickId: clickId },
                Object.keys(headers).length ? { headers } : undefined
            );
            localStorage.setItem('dromoney_token', response.token);
            sessionStorage.removeItem('dromoney_va_guide_shown');
            setIsAuthenticated(true);
            persistFcmAfterAuth();
            await tryAttachPendingReferral({ waitMs: 5000 });
            return { success: true };
        } catch (err) {
            setLoading(false);
            return { success: false, error: err.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('dromoney_token');
        sessionStorage.removeItem('dromoney_va_guide_shown');
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

    const addEarning = async (amount, source, taskId) => {
        try {
            const res = await api.post('/user/wallet/add-earning', { amount, source, taskId });
            if (res?.data) {
                setUserData(prev => ({
                    ...prev,
                    wallet: {
                        ...prev.wallet,
                        balance: res.data.newWalletBalance ?? prev.wallet.balance,
                        pendingBalance: res.data.newPendingBalance ?? prev.wallet.pendingBalance,
                        virtualBalance: res.data.newVirtualBalance ?? prev.wallet.virtualBalance,
                    },
                    completedTasks: res.data.completedTasks || prev.completedTasks,
                    dailyTaskCompletions: res.data.dailyTaskCompletions || prev.dailyTaskCompletions,
                    lifetimeTasksCompleted: res.data.lifetimeTasksCompleted ?? prev.lifetimeTasksCompleted,
                    futureFund: res.data.futureFund || prev.futureFund,
                }));
            }
            return { success: true, data: res?.data };
        } catch (err) {
            console.error('addEarning error:', err);
            return { success: false, message: err.message || 'Failed to add earning' };
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
        setNotifications(prev => {
            // Prevent duplicate notifications in the UI 
            const isDuplicate = prev.some(n => n.title === title && n.message === message);
            if (isDuplicate) return prev;
            return [{ id: Date.now(), title, message, time: "Just now", type, isRead: false }, ...prev];
        });
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
        addEarning,
        addCoins: addEarning,
        requestWithdrawal,
        addNotification,
        markAsRead,
        refreshUserProfile,
        updateProfileImage,
        updateProfileData,
        clearNotifications,
        fetchNotifications,
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
