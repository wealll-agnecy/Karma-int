import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './components/routing/ProtectedRoute';
import DashboardLayout from './components/common/DashboardLayout';
import ScrollToTop from './components/common/ScrollToTop';


// Performance: Lazy Loading across all deployment nodes
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const KarmaLandingPage = lazy(() => import('./pages/KarmaLandingPage'));
const KarmaBookingPage = lazy(() => import('./pages/KarmaBookingPage'));
const AdminEnquiries = lazy(() => import('./pages/AdminEnquiries'));
const AdminEnquiryDetails = lazy(() => import('./pages/AdminEnquiryDetails'));
const TicketView = lazy(() => import('./pages/TicketView'));

const OrganizerEvents = lazy(() => import('./pages/OrganizerEvents'));
const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard'));
const OrganizerBookings = lazy(() => import('./pages/OrganizerBookings'));
const OrganizerLeads = lazy(() => import('./pages/OrganizerLeads'));
const OrganizerEventAnalytics = lazy(() => import('./pages/OrganizerEventAnalytics'));

const OrganizerStaffManagement = lazy(() => import('./pages/OrganizerStaffManagement'));
const OrganizerAddons = lazy(() => import('./pages/OrganizerAddons'));
const OrganizerNotifications = lazy(() => import('./pages/OrganizerNotifications'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const AdminSecretLogin = lazy(() => import('./pages/AdminSecretLogin'));

const AdminStaffManagement = lazy(() => import('./pages/AdminStaffManagement'));
const AdminBookings = lazy(() => import('./pages/AdminBookings'));
const AdminOrganizerBookings = lazy(() => import('./pages/AdminOrganizerBookings'));
const AdminEventAttendees = lazy(() => import('./pages/AdminEventAttendees'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const StaffScanner = lazy(() => import('./pages/StaffScanner'));

const VerifyTicket = lazy(() => import('./pages/VerifyTicket'));

// Loader
const SectorLoader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', gap: '16px' }}>
        <Spinner animation="border" style={{ width: '2.5rem', height: '2.5rem', color: '#f59e0b' }} />
        <div style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
);

const DashboardWrapper = ({ children, role }) => (
    <DashboardLayout role={role}>
        <Suspense fallback={<SectorLoader />}>
            {children}
        </Suspense>
    </DashboardLayout>
);

const RemainingPaymentPage = lazy(() => import('./pages/RemainingPaymentPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));

const AppContent = () => {
    const location = useLocation();
    
    // Hide peripheral UI for Native App scanner view
    const isNativeScannerView = location.pathname.startsWith('/verify-ticket') || location.pathname.startsWith('/ticket/');
    
    if (isNativeScannerView) {
        return (
            <div className="min-vh-100 bg-black overflow-hidden">
                <Suspense fallback={<SectorLoader />}>
                    <Routes>
                        <Route path="/verify-ticket/:id" element={<VerifyTicket />} />
                        <Route path="/ticket/:id" element={<VerifyTicket />} />
                    </Routes>
                </Suspense>
                <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
            <main style={{ flex: 1 }}>
                <Suspense fallback={<SectorLoader />}>
                    <Routes>
                        <Route path="/" element={<KarmaLandingPage />} />
                        <Route path="/karma-booking" element={<KarmaBookingPage />} />
                        <Route path="/payment" element={<PaymentPage />} />

                        <Route path="/tickets/:id" element={<TicketView />} />
                        <Route path="/digital-pass/:id" element={<TicketView />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />


                        {/* Stealth Admin Gateway */}
                        <Route path="/admin" element={<AdminSecretLogin />} />
                        <Route path="/admin-login" element={<AdminSecretLogin />} />
                        <Route path="/organizer-login" element={<Login />} />
                        <Route path="/staff-login" element={<Login />} />

                        {/* Organizer Dashboard Routes */}
                        <Route path="/organizer/dashboard" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerDashboard /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/organizer/bookings" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerBookings /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/organizer/leads" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerLeads /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/organizer/events" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerEvents /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/organizer/event/:id" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerEventAnalytics /></DashboardWrapper></ProtectedRoute>} />

                        <Route path="/organizer/staff" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerStaffManagement /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/organizer/addons" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerAddons /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/organizer/notifications" element={<ProtectedRoute roles={['organizer', 'admin']}><DashboardWrapper role="organizer"><OrganizerNotifications /></DashboardWrapper></ProtectedRoute>} />


                        {/* Admin Dashboard Routes */}
                        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><DashboardWrapper role="admin"><AdminDashboard /></DashboardWrapper></ProtectedRoute>} />


                        <Route path="/admin/staff" element={<ProtectedRoute roles={['admin']}><DashboardWrapper role="admin"><AdminStaffManagement /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/admin/enquiries" element={<ProtectedRoute roles={['admin']}><DashboardWrapper role="admin"><AdminEnquiries /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/admin/enquiries/:id" element={<ProtectedRoute roles={['admin']}><DashboardWrapper role="admin"><AdminEnquiryDetails /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/admin/bookings" element={<ProtectedRoute roles={['admin']}><DashboardWrapper role="admin"><AdminBookings /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/admin/bookings/:organizerId" element={<ProtectedRoute roles={['admin']}><DashboardWrapper role="admin"><AdminOrganizerBookings /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/admin/event-attendees/:eventId" element={<ProtectedRoute roles={['admin']}><DashboardWrapper role="admin"><AdminEventAttendees /></DashboardWrapper></ProtectedRoute>} />

                        <Route path="/staff/dashboard" element={<ProtectedRoute roles={['staff', 'admin']}><DashboardWrapper role="staff"><StaffDashboard /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/staff/scanner" element={<ProtectedRoute roles={['staff', 'admin']}><DashboardWrapper role="staff"><StaffScanner /></DashboardWrapper></ProtectedRoute>} />
                        <Route path="/remaining-payment/:bookingId" element={<ProtectedRoute><RemainingPaymentPage /></ProtectedRoute>} />

                        {/* Catch-all → Karma Landing */}
                        <Route path="*" element={<KarmaLandingPage />} />
                    </Routes>
                </Suspense>
            </main>

            <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} toastOptions={{
                style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(245,158,11,0.3)' }
            }} />
        </div>
    );
}

function App() {
    return (
        <Router>
            <ScrollToTop />
            <AppContent />
        </Router>
    );
}

export default App;
