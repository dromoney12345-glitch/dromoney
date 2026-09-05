import React from 'react'; // test sync
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layout & Pages
import UserLayout from './module/user/UserLayout';
import Home from './module/user/pages/Home';
import Earn from './module/user/pages/Earn';
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
import AdminLogin from './module/admin/auth/Login';
import AdminLayout from './module/admin/AdminLayout';
import AdminDashboard from './module/admin/pages/Dashboard';
import Users from './module/admin/pages/Users';
import Payments from './module/admin/pages/Payments';
import Affiliates from './module/admin/pages/Affiliates';
import CoinsAndTasks from './module/admin/pages/CoinsAndTasks';
import FutureFundAdmin from './module/admin/pages/FutureFundAdmin';
import FutureFundReport from './module/admin/pages/FutureFundReport';
import BusinessContent from './module/admin/pages/BusinessContent';
import Wallets from './module/admin/pages/Wallets';
import NotificationsAdmin from './module/admin/pages/Notifications';
import Reports from './module/admin/pages/Reports';
import SettingsAdmin from './module/admin/pages/Settings';
import Promotions from './module/admin/pages/Promotions';
import WatchAndEarnAdmin from './module/admin/pages/WatchAndEarnAdmin';
import LayoutManager from './module/admin/pages/LayoutManager';
import MarketingManager from './module/admin/pages/MarketingManager';
import AdminChatSupport from './module/admin/pages/ChatSupport';
import TaskApprovals from './module/admin/pages/TaskApprovals';
import ChatSupportPage from './module/user/pages/ChatSupportPage';
import Offerwall from './module/user/pages/Offerwall';
import { AdminProvider, useAdmin } from './module/admin/context/AdminContext';

import { UserProvider, useUser } from './module/user/context/UserContext';
import { extractReferralCode, getPendingReferralCode, installReferralCapture, captureReferralFromLocation } from './module/shared/utils/referral';
import { installFcmTokenBridge, requestNativeFcmToken } from './module/shared/utils/fcmToken';
import { notifyFlutterAppReady } from './module/shared/utils/flutterAds';

const SilentBoot = () => <div className="min-h-screen bg-white" aria-hidden />;

/** Only restore routes that exist in the app (prevents /home ↔ / loops). */
function isSafeAppRoute(path) {
  if (!path || typeof path !== 'string') return false;
  const clean = path.split('?')[0];
  if (clean === '/' || clean === '/home') return false;
  return clean.startsWith('/user') || clean.startsWith('/admin');
}

// Protected Route Component
const ProtectedUserRoute = ({ children }) => {
  const { isAuthenticated, userData, loading } = useUser();

  // Token exists but profile is still loading — keep blank so Flutter splash is not replaced by a spinner
  if (loading && !userData?.mongoId) {
    return <SilentBoot />;
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
  const location = useLocation();
  if (loading) return <SilentBoot />;

  const lastRoute = sessionStorage.getItem('dromoney_last_route');
  if (isAuthenticated) {
    if (isSafeAppRoute(lastRoute)) {
      return <Navigate to={lastRoute} replace />;
    }
    // Clear bad legacy values like "/home" that caused infinite redirects
    if (lastRoute && !isSafeAppRoute(lastRoute)) {
      sessionStorage.removeItem('dromoney_last_route');
    }
    return <Navigate to="/user/home" replace />;
  }

  const invite =
    extractReferralCode(location.search) ||
    extractReferralCode(location.pathname) ||
    extractReferralCode(typeof window !== 'undefined' ? window.location.href : '') ||
    getPendingReferralCode();
  if (invite) {
    return <Navigate to={`/user/auth/register?invite=${encodeURIComponent(invite)}`} replace />;
  }
  return <Navigate to={`/user/auth/login${location.search || ''}`} replace />;
};

/** Unknown paths must NOT bounce to "/" (that re-reads lastRoute and can loop). */
const CatchAllRedirect = () => {
  const { isAuthenticated, loading } = useUser();
  if (loading) return <SilentBoot />;
  if (isAuthenticated) return <Navigate to="/user/home" replace />;
  return <Navigate to="/user/auth/login" replace />;
};

const RouteTracker = () => {
  const location = useLocation();
  
  React.useEffect(() => {
    captureReferralFromLocation();
    // Persist only real app routes — never bare "/home" or "/"
    if (isSafeAppRoute(location.pathname)) {
      sessionStorage.setItem('dromoney_last_route', location.pathname + location.search);
    }
    
    if (location.pathname.startsWith('/user')) {
      document.body.classList.add('user-panel');
    } else {
      document.body.classList.remove('user-panel');
    }

    // Flutter Route Tracking Integration
    try {
      const normalizedRoute = location.pathname.startsWith('/') 
        ? location.pathname 
        : `/${location.pathname}`;
      
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
        console.log(`[Flutter Route Sync] Detected route: ${normalizedRoute}`);
      }

      if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
        window.flutter_inappwebview.callHandler("routeChanged", normalizedRoute);
        
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
          console.log(`[Flutter Route Sync] Sent ${normalizedRoute} to Flutter`);
        }
      } else if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
        // Log once per unique route — avoid flooding when not in Flutter
        console.debug(`[Flutter Route Sync] browser mode @ ${normalizedRoute}`);
      }
    } catch (error) {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
        console.error('[Flutter Route Sync Error]', error);
      }
    }
  }, [location]);
  
  // Expose global method for Flutter to pass native FCM token
  React.useEffect(() => {
    installFcmTokenBridge();
    requestNativeFcmToken();
    return () => {};
  }, []);
  
  return null;
};

const FlutterSplashBridge = () => {
  const { isAuthenticated, userData, loading } = useUser();
  const location = useLocation();

  React.useEffect(() => {
    if (location.pathname === '/') return;
    if (location.pathname.startsWith('/admin')) {
      notifyFlutterAppReady();
      return;
    }
    const sessionReady = isAuthenticated ? !!userData?.mongoId : !loading;
    if (sessionReady) notifyFlutterAppReady();
  }, [isAuthenticated, userData?.mongoId, loading, location.pathname]);

  return null;
};

function App() {
  React.useEffect(() => installReferralCapture(), []);

  React.useEffect(() => {
    installFcmTokenBridge();
    requestNativeFcmToken();
  }, []);

  return (
    <AdminProvider>
      <UserProvider>
        <Router>
            <RouteTracker />
            <FlutterSplashBridge />
            <Routes>
            {/* Redirecting root to login or home based on auth */}
            <Route path="/" element={<RootRedirect />} />
            {/* Legacy/short paths that used to cause / ↔ /home infinite loops */}
            <Route path="/home" element={<Navigate to="/user/home" replace />} />
            <Route path="/earn" element={<Navigate to="/user/earn" replace />} />
            <Route path="/wallet" element={<Navigate to="/user/wallet" replace />} />
            <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
            <Route path="/income" element={<Navigate to="/user/income" replace />} />
            <Route path="/watch" element={<Navigate to="/user/watch" replace />} />
            <Route path="/login" element={<Navigate to="/user/auth/login" replace />} />
            <Route path="/register" element={<Navigate to="/user/auth/register" replace />} />

            {/* Auth Module Routes (Always Public) */}
            <Route path="/join/:code" element={<JoinReferral />} />
            <Route path="/join" element={<JoinReferral />} />
            <Route path="/user/auth" element={<AuthLayout />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
            </Route>
            <Route path="/user/auth/kyc" element={<Navigate to="/user/home" replace />} />
            <Route path="/user/auth/pending" element={<Navigate to="/user/home" replace />} />

            {/* User Module Routes (Protected) */}
            <Route path="/user" element={<ProtectedUserRoute><UserLayout /></ProtectedUserRoute>}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="earn" element={<Earn />} />
              <Route path="income" element={<Income />} />
              <Route path="guide/:slug" element={<GuidePage />} />
              <Route path="withdrawal-card" element={<WithdrawalCard />} />
              <Route path="virtual-account" element={<WithdrawalCard />} />
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
              <Route path="offerwall" element={<Offerwall />} />
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
              <Route path="kyc" element={<Navigate to="/admin/users" replace />} />
              <Route path="documents" element={<Navigate to="/admin/layout" replace />} />
              <Route path="users" element={<Users />} />
              <Route path="payments" element={<Payments />} />
              <Route path="affiliates" element={<Affiliates />} />
              <Route path="tasks" element={<CoinsAndTasks />} />
              <Route path="task-approvals" element={<TaskApprovals />} />
              <Route path="future-fund" element={<Navigate to="/admin/future-fund/settings" replace />} />
              <Route path="future-fund/settings" element={<FutureFundAdmin />} />
              <Route path="future-fund/report" element={<FutureFundReport />} />
              <Route path="events" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="events/report" element={<Navigate to="/admin/dashboard" replace />} />
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

            {/* Fallback — never bounce unknown paths back through "/" (loop risk) */}
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </Router>
      </UserProvider>
    </AdminProvider>
  );
}

export default App;


