import React from 'react'; // test sync
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layout & Pages
import UserLayout from './module/user/UserLayout';
import Home from './module/user/pages/Home';
import Earn from './module/user/pages/Earn';
import Events from './module/user/pages/Events';
import Profile from './module/user/pages/Profile';
import Wallet from './module/user/pages/Wallet';
import Income from './module/user/pages/Income';
import GuidePage from './module/user/pages/GuidePage';
import WithdrawalCard from './module/user/pages/WithdrawalCard';
import Marketing from './module/user/pages/Marketing';
import MarketingHistory from './module/user/pages/MarketingHistory';
import TaskRunner from './module/user/pages/TaskRunner';
import ContestView from './module/user/pages/ContestView';
import BusinessIdeas from './module/user/pages/BusinessIdeas';
import InfoPage from './module/user/pages/InfoPage';
import HelpCenter from './module/user/pages/HelpCenter';
import FutureFund from './module/user/pages/FutureFund';
import PromoteBrand from './module/user/pages/PromoteBrand';
import WatchAndEarn from './module/user/pages/WatchAndEarn';
import AdPlayer from './module/user/pages/AdPlayer';
import QuizView from './module/user/pages/QuizView';
import TaskQuizView from './module/user/pages/TaskQuizView';
import LuckyDrawView from './module/user/pages/LuckyDrawView';
import MemoryMasterView from './module/user/pages/MemoryMasterView';
import ScratchCardView from './module/user/pages/ScratchCardView';
import SpeedTapperView from './module/user/pages/SpeedTapperView';
import TreasureChestView from './module/user/pages/TreasureChestView';
import GoldProductionView from './module/user/pages/GoldProductionView';

// Auth Pages
import AuthLayout from './module/user/auth/AuthLayout';
import Login from './module/user/auth/Login';
import Register from './module/user/auth/Register';
import JoinReferral from './module/user/pages/JoinReferral';
import KycSetup from './module/user/auth/KycSetup';
import PendingApproval from './module/user/auth/PendingApproval';
import AdminLogin from './module/admin/auth/Login';
import AdminLayout from './module/admin/AdminLayout';
import AdminDashboard from './module/admin/pages/Dashboard';
import Users from './module/admin/pages/Users';
import Payments from './module/admin/pages/Payments';
import Affiliates from './module/admin/pages/Affiliates';
import CoinsAndTasks from './module/admin/pages/CoinsAndTasks';
import FutureFundAdmin from './module/admin/pages/FutureFundAdmin';
import FutureFundReport from './module/admin/pages/FutureFundReport';
import EventsAdmin from './module/admin/pages/Events';
import EventsReport from './module/admin/pages/EventsReport';
import BusinessContent from './module/admin/pages/BusinessContent';
import Wallets from './module/admin/pages/Wallets';
import NotificationsAdmin from './module/admin/pages/Notifications';
import Reports from './module/admin/pages/Reports';
import SettingsAdmin from './module/admin/pages/Settings';
import KYC from './module/admin/pages/KYC';
import Promotions from './module/admin/pages/Promotions';
import WatchAndEarnAdmin from './module/admin/pages/WatchAndEarnAdmin';
import LayoutManager from './module/admin/pages/LayoutManager';
import DocumentsCMS from './module/admin/pages/DocumentsCMS';
import MarketingManager from './module/admin/pages/MarketingManager';
import AdminChatSupport from './module/admin/pages/ChatSupport';
import TaskApprovals from './module/admin/pages/TaskApprovals';
import ChatSupportPage from './module/user/pages/ChatSupportPage';
import { AdminProvider, useAdmin } from './module/admin/context/AdminContext';

import { UserProvider, useUser } from './module/user/context/UserContext';
import SplashScreen from './module/user/auth/SplashScreen';

import { Loader2 } from 'lucide-react';

// Protected Route Component
const ProtectedUserRoute = ({ children }) => {
  const { isAuthenticated, userData, loading } = useUser();

  // Still initializing — token exists but profile not yet loaded
  // Show a neutral splash instead of redirecting to login
  if (loading && !userData?.mongoId) {
    return (
      <div className="min-h-screen bg-[#0f1d3a] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-white/10 border-t-white/60 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/user/auth/login" replace />;

  return children;
};

// Protected Admin Route Component
const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, adminData, loading } = useAdmin();

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  if (loading || !adminData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Authenticating Operator...</p>
      </div>
    );
  }

  return children;
};

// Smart root redirect — goes to home if logged in, login if not
const RootRedirect = () => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return null; // wait silently
  
  const lastRoute = sessionStorage.getItem('dromoney_last_route');
  if (isAuthenticated) {
    if (lastRoute && lastRoute !== '/') {
      return <Navigate to={lastRoute} replace />;
    }
    return <Navigate to='/user/home' replace />;
  }
  return <Navigate to='/user/auth/login' replace />;
};

const RouteTracker = () => {
  const location = useLocation();
  
  React.useEffect(() => {
    // 1. Existing App Logic
    if (location.pathname !== '/' && location.pathname !== '/user/auth/login') {
      sessionStorage.setItem('dromoney_last_route', location.pathname + location.search);
    }
    
    if (location.pathname.startsWith('/user')) {
      document.body.classList.add('user-panel');
    } else {
      document.body.classList.remove('user-panel');
    }

    // 2. Flutter Route Tracking Integration
    try {
      // Normalize route to ensure consistent format
      const normalizedRoute = location.pathname.startsWith('/') 
        ? location.pathname 
        : `/${location.pathname}`;
      
      // Development logging only - Always visible in dev tools for testing
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
        console.log(`[Flutter Route Sync] Detected route: ${normalizedRoute}`);
      }

      // Safe check for Flutter InAppWebView injected object
      if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
        // Send route to Flutter
        window.flutter_inappwebview.callHandler("routeChanged", normalizedRoute);
        
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
          console.log(`[Flutter Route Sync] Sent ${normalizedRoute} to Flutter`);
        }
      } else {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
          console.log(`[Flutter Route Sync] flutter_inappwebview not found. Running in standard browser.`);
        }
      }
    } catch (error) {
      // Catch any potential errors to prevent breaking browser usage
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
        console.error('[Flutter Route Sync Error]', error);
      }
    }
  }, [location]);
  
  // Expose global method for Flutter to pass native FCM token
  React.useEffect(() => {
    window.saveMobileFcmToken = async (token) => {
      try {
        // Always store it locally first just in case
        localStorage.setItem('pending_mobile_fcm_token', token);
        
        const { default: api } = await import('./module/shared/services/api');
        // Only try to save if we have a user token
        if (localStorage.getItem('dromoney_token')) {
            await api.post('/fcm-tokens/save', { token, platform: 'mobile' });
            console.log("Successfully saved Mobile FCM Token from Flutter");
            localStorage.removeItem('pending_mobile_fcm_token');
        } else {
            console.log("Saved Mobile FCM Token locally, waiting for login...");
        }
      } catch (err) {
        console.error("Error saving Mobile FCM Token from Flutter:", err);
      }
    };
    return () => {
      delete window.saveMobileFcmToken;
    };
  }, []);
  
  return null;
};

function App() {
  const [showSplash, setShowSplash] = React.useState(!localStorage.getItem('dromoney_token'));

  return (
    <AdminProvider>
      <UserProvider>
        {showSplash ? (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        ) : (
          <Router>
            <RouteTracker />
            <Routes>
            {/* Redirecting root to login or home based on auth */}
            <Route path="/" element={<RootRedirect />} />

            {/* Auth Module Routes (Always Public) */}
            <Route path="/join/:code" element={<JoinReferral />} />
            <Route path="/join" element={<JoinReferral />} />
            <Route path="/user/auth" element={<AuthLayout />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
            </Route>
            <Route path="/user/auth/kyc" element={<KycSetup />} />
            <Route path="/user/auth/pending" element={<PendingApproval />} />

            {/* User Module Routes (Protected) */}
            <Route path="/user" element={<ProtectedUserRoute><UserLayout /></ProtectedUserRoute>}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="earn" element={<Earn />} />
              <Route path="income" element={<Income />} />
              <Route path="guide/:slug" element={<GuidePage />} />
              <Route path="withdrawal-card" element={<WithdrawalCard />} />
              <Route path="business" element={<BusinessIdeas />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="marketing-history" element={<MarketingHistory />} />
              <Route path="history" element={<Navigate to="/user/wallet" replace />} />
              <Route path="events" element={<Navigate to="/user/home" replace />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="profile" element={<Profile />} />
              <Route path="business-ideas" element={<BusinessIdeas />} />
              <Route path="business-ideas/:ideaId?/:section?/:cardId?" element={<BusinessIdeas />} />
              <Route path="watch" element={<WatchAndEarn />} />
              <Route path="help" element={<HelpCenter />} />
              <Route path="future-fund" element={<FutureFund />} />
              <Route path="chat-support" element={<ChatSupportPage />} />
            </Route>

            {/* Public Info Route */}
            <Route path="/user/info/:type" element={<InfoPage />} />

            {/* Immersive User Routes (Protected) */}
            <Route path="/user/task/:id" element={<ProtectedUserRoute><TaskRunner /></ProtectedUserRoute>} />
            <Route path="/user/promote-brand" element={<ProtectedUserRoute><PromoteBrand /></ProtectedUserRoute>} />
            <Route path="/user/ad-player/:id" element={<ProtectedUserRoute><AdPlayer /></ProtectedUserRoute>} />
            <Route path="/user/quiz/:id" element={<ProtectedUserRoute><QuizView /></ProtectedUserRoute>} />
            <Route path="/user/task-quiz/:id" element={<ProtectedUserRoute><TaskQuizView /></ProtectedUserRoute>} />
            <Route path="/user/lucky-draw/:id" element={<ProtectedUserRoute><LuckyDrawView /></ProtectedUserRoute>} />
            <Route path="/user/memory-master/:id" element={<ProtectedUserRoute><MemoryMasterView /></ProtectedUserRoute>} />
            <Route path="/user/scratch-card/:id" element={<ProtectedUserRoute><ScratchCardView /></ProtectedUserRoute>} />
            <Route path="/user/speed-tapper/:id" element={<ProtectedUserRoute><SpeedTapperView /></ProtectedUserRoute>} />
            <Route path="/user/treasure-chest/:id" element={<ProtectedUserRoute><TreasureChestView /></ProtectedUserRoute>} />
            <Route path="/user/gold-production/:id" element={<ProtectedUserRoute><GoldProductionView /></ProtectedUserRoute>} />
            <Route path="/user/contest/:id" element={<ProtectedUserRoute><ContestView /></ProtectedUserRoute>} />

            {/* Admin Module Routes (Protected) */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="kyc" element={<KYC />} />
              <Route path="documents" element={<DocumentsCMS />} />
              <Route path="users" element={<Users />} />
              <Route path="payments" element={<Payments />} />
              <Route path="affiliates" element={<Affiliates />} />
              <Route path="tasks" element={<CoinsAndTasks />} />
              <Route path="task-approvals" element={<TaskApprovals />} />
              <Route path="future-fund" element={<Navigate to="/admin/future-fund/settings" replace />} />
              <Route path="future-fund/settings" element={<FutureFundAdmin />} />
              <Route path="future-fund/report" element={<FutureFundReport />} />
              <Route path="events" element={<EventsAdmin />} />
              <Route path="events/report" element={<EventsReport />} />
              <Route path="business-content" element={<BusinessContent />} />
              <Route path="withdrawals" element={<Wallets />} />
              <Route path="notifications" element={<NotificationsAdmin />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="watch-and-earn" element={<WatchAndEarnAdmin />} />
              <Route path="reports" element={<Reports />} />
              <Route path="layout" element={<LayoutManager />} />
              <Route path="marketing-content" element={<MarketingManager />} />
              <Route path="chat-support" element={<AdminChatSupport />} />
              <Route path="settings" element={<SettingsAdmin />} />
            </Route>

            {/* Fallback for safety */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        )}
      </UserProvider>
    </AdminProvider>
  );
}

export default App;


