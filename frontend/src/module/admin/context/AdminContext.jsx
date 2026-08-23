import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import api from '../../shared/services/api';
import { io as socketIO } from 'socket.io-client';
import { BASE_URL } from '../../shared/services/api';

const AdminContext = React.createContext();

export const AdminProvider = ({ children }) => {
    const [adminData, setAdminData] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(
        !!(localStorage.getItem('dromoney_admin_token') || sessionStorage.getItem('dromoney_admin_token'))
    );
    const socketRef = useRef(null);

    // ── Socket connection for real-time admin alerts ──
    useEffect(() => {
        if (!isAuthenticated) return;

        const socket = socketIO(BASE_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Admin Socket] Connected:', socket.id);
        });

        socket.on('new_report', (data) => {
            const id = Date.now();
            const preview = data.message.length > 60
                ? data.message.slice(0, 60) + '...'
                : data.message;
            setNotifications(prev => [{
                id,
                title: '🚨 New Problem Report',
                message: `${data.userName} submitted: "${preview}"`,
                type: 'error'
            }, ...prev]);
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 8000);
        });

        socket.on('disconnect', () => {
            console.log('[Admin Socket] Disconnected');
        });

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            refreshAdminProfile();
            fetchDashboardStats();
        }
    }, [isAuthenticated]);

    const refreshAdminProfile = async () => {
        try {
            const response = await api.get('/admin/auth/me');
            if (response.success) {
                setAdminData(response.data);
            }
        } catch (err) {
            console.error("Admin Profile Error:", err);
            if (err.status === 401) adminLogout();
        }
    };

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/dashboard/stats');
            if (response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.error("Stats Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const adminLogin = async (email, password, rememberMe = true) => {
        setLoading(true);
        try {
            const response = await api.post('/admin/auth/login', { email, password });
            sessionStorage.removeItem('dromoney_admin_token');
            localStorage.removeItem('dromoney_admin_token');
            if (rememberMe) {
                localStorage.setItem('dromoney_admin_token', response.token);
            } else {
                sessionStorage.setItem('dromoney_admin_token', response.token);
            }
            setAdminData(response.admin);
            setIsAuthenticated(true);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message || err };
        } finally {
            setLoading(false);
        }
    };

    const adminLogout = () => {
        localStorage.removeItem('dromoney_admin_token');
        sessionStorage.removeItem('dromoney_admin_token');
        setAdminData(null);
        setIsAuthenticated(false);
    };

    const addNotification = (title, message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [{ id, title, message, type }, ...prev]);
        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const value = useMemo(() => ({
        adminData,
        stats,
        loading,
        notifications,
        isAuthenticated,
        adminLogin,
        adminLogout,
        addNotification,
        removeNotification,
        refreshAdminProfile,
        fetchDashboardStats
    }), [adminData, stats, loading, notifications, isAuthenticated]);

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) throw new Error('useAdmin must be used within an AdminProvider');
    return context;
};
