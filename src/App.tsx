import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConnectionBanner } from './components/ConnectionBanner';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Coupons from './pages/Coupons';
import Analytics from './pages/Analytics';
import { News } from './pages/News';
import { ProductPageBuilder } from './pages/ProductPageBuilder';
import FeaturedProducts from './pages/FeaturedProducts';
import PushNotifications from './pages/PushNotifications';
import ReferralDashboard from './pages/ReferralDashboard';
import LevelRewards from './pages/LevelRewards';
import FastPayOrders from './pages/FastPayOrders';
import { Members } from './pages/Members';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ConnectionProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex h-screen flex-col bg-gray-50 overflow-x-hidden">
                  <ConnectionBanner />
                  <div className="flex flex-1 min-h-0 overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 overflow-y-auto content-safe pb-20 lg:pb-0">
                    <ErrorBoundary>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Virtual helper routes to open creation forms dynamically */}
                      <Route
                        path="/news/create"
                        element={<Navigate to="/news?action=create" replace />}
                      />
                      <Route
                        path="/noticia/create"
                        element={<Navigate to="/news?action=create" replace />}
                      />
                      <Route
                        path="/products/create"
                        element={<Navigate to="/products?action=create" replace />}
                      />
                      <Route
                        path="/produto/create"
                        element={<Navigate to="/products?action=create" replace />}
                      />

                      <Route
                        path="/products"
                        element={
                          <ProtectedRoute requirePermission="can_edit_products">
                            <Products />
                          </ProtectedRoute>
                        }
                      />
                      
                      <Route
                        path="/products/builder"
                        element={
                          <ProtectedRoute requirePermission="can_edit_products">
                            <ProductPageBuilder />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/featured"
                        element={
                          <ProtectedRoute requirePermission="can_edit_products">
                            <FeaturedProducts />
                          </ProtectedRoute>
                        }
                      />
                      
                      <Route path="/categories" element={<Categories />} />
                      
                      <Route
                        path="/news"
                        element={
                          <ProtectedRoute requirePermission="can_manage_news">
                            <News />
                          </ProtectedRoute>
                        }
                      />
                      
                      <Route
                        path="/coupons"
                        element={
                          <ProtectedRoute requirePermission="can_manage_coupons">
                            <Coupons />
                          </ProtectedRoute>
                        }
                      />
                      
                      <Route
                        path="/analytics"
                        element={
                          <ProtectedRoute requirePermission="can_access_analytics">
                            <Analytics />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/push"
                        element={
                          <ProtectedRoute requirePermission="can_edit_products">
                            <PushNotifications />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/referrals"
                        element={
                          <ProtectedRoute requirePermission="can_access_analytics">
                            <ReferralDashboard />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/rewards"
                        element={
                          <ProtectedRoute requirePermission="can_access_analytics">
                            <LevelRewards />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/fastpay"
                        element={
                          <ProtectedRoute requirePermission="can_manage_coupons">
                            <FastPayOrders />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/members"
                        element={
                          <ProtectedRoute requirePermission="can_access_analytics">
                            <Members />
                          </ProtectedRoute>
                        }
                      />
                      </Routes>
                    </ErrorBoundary>
                  </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      </ConnectionProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
