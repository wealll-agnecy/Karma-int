import React, { useState, useEffect } from 'react';
import { Nav, Badge, Button, Offcanvas } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaThLarge, FaPlusCircle, FaUsers, FaChartLine, FaCog,
    FaChevronLeft, FaChevronRight, FaShieldAlt, FaTicketAlt,
    FaUserTie, FaSignOutAlt, FaLifeRing, FaCalendarAlt, FaQrcode, FaBars, FaEnvelope, FaUserPlus, FaWallet
} from 'react-icons/fa';
import apiClient from '../../api/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import OrganizerNavbar from './OrganizerNavbar';
import FloatingChatbot from './FloatingChatbot';
import './DashboardLayout.css';

const DashboardLayout = ({ children, role }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    const [enquiryCount, setEnquiryCount] = useState(0);
    const [notifCount, setNotifCount] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    const fetchCounts = async () => {
        if (role === 'admin' && user) {
            try {
                const res = await apiClient.get('/api/v1/notifications/count');
                setEnquiryCount(res.data.enquiries || 0);
            } catch (err) {
                console.error('Failed to fetch admin notification counts', err);
            }
        } else if (role === 'organizer' && user) {
            try {
                const res = await apiClient.get('/api/v1/notifications');
                const unread = res.data.data?.filter(n => !n.isRead).length || 0;
                setNotifCount(unread);
            } catch (err) {
                console.error('Failed to fetch organizer notifications', err);
            }
        }
    };

    useEffect(() => {
        document.body.classList.add('dashboard-active');
        
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000); // Polling every 30 seconds

        return () => {
            document.body.classList.remove('dashboard-active');
            clearInterval(interval);
        };
    }, [role, user]);

    const handleLogout = async () => {
        await logout();
        toast.success('Successfully logged out');
        navigate('/login');
    };

    const adminLinks = [
        { name: 'Console', path: '/admin/dashboard', icon: <FaChartLine /> },
        { name: 'Organizers', path: '/admin/bookings', icon: <FaUserTie /> },
        { name: 'Enquiries', path: '/admin/enquiries', icon: <FaEnvelope />, badge: enquiryCount },
        { name: 'Staff Hub', path: '/admin/staff', icon: <FaUsers /> },
    ];

    const organizerLinks = [
        { name: 'Dashboard', path: '/organizer/dashboard', icon: <FaThLarge />, badge: notifCount },
        { name: 'My Events', path: '/organizer/events', icon: <FaCalendarAlt /> },
        { name: 'Bookings', path: '/organizer/bookings', icon: <FaTicketAlt /> },
        { name: 'Leads', path: '/organizer/leads', icon: <FaUserPlus /> },
        { name: 'Staff Hub', path: '/organizer/staff', icon: <FaUsers /> },
        { name: 'Add-ons', path: '/organizer/addons', icon: <FaPlusCircle /> },
    ];

    const attendeeLinks = [
        { name: 'My Tickets', path: '/my-bookings', icon: <FaTicketAlt /> },
        { name: 'Home', path: '/', icon: <FaCalendarAlt /> },
        { name: 'Profile', path: '/profile', icon: <FaCog /> },
    ];

    const staffLinks = [
        { name: 'Terminal', path: '/staff/dashboard', icon: <FaThLarge /> },
        { name: 'Scanner', path: '/staff/scanner', icon: <FaQrcode /> },
        { name: 'Security', path: '/staff/security', icon: <FaShieldAlt /> },
    ];

    const getLinks = () => {
        switch (role) {
            case 'admin': return adminLinks;
            case 'organizer': return organizerLinks;
            case 'staff': return staffLinks;
            default: return attendeeLinks;
        }
    }

    const links = getLinks();
    const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    useEffect(() => {
        if (collapsed) {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
    }, [collapsed]);

    const SidebarContent = ({ forceExpanded = false }) => {
        const isCollapsed = forceExpanded ? false : collapsed;
        return (
            <div className="d-flex flex-column h-100 py-4 dashboard_left_sidebar">
                <div className="px-3 mb-4 d-flex align-items-center justify-content-between logo-section-sidebar">
                    <Link to="/" className="logo-container text-decoration-none">
                        {isCollapsed ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="sidebar-logo-min"
                            >
                                IA
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="sidebar-logo-expanded"
                            >
                                <img src="/iri-apex-logo.png" alt="IRI APEX" style={{ maxHeight: '50px', objectFit: 'contain' }} />
                            </motion.div>
                        )}
                    </Link>
                    <Button
                        variant="link"
                        onClick={() => setCollapsed(!collapsed)}
                        className="text-dark p-0 d-none d-lg-block shadow-none hover-text-pink transition-all border-0"
                    >
                        {isCollapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
                    </Button>
                </div>

                <div className="px-4 mb-4">
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fw-bold fs-6 text-uppercase tracking-widest text-secondary small opacity-50"
                        >
                            Menu
                        </motion.span>
                    )}
                </div>

                <Nav className="flex-column px-3 gap-2 flex-grow-1">
                    {links.map((link) => (
                        <Nav.Link
                            key={link.path}
                            as={Link}
                            to={link.path}
                            onClick={() => setShowMobileSidebar(false)}
                            className={`d-flex align-items-center gap-3 px-3 py-3 rounded-4 transition-premium overflow-visible-nav ${isActive(link.path) ? 'bg-primary text-white shadow-glow' : 'text-secondary hover-bg-white/5 hover-text-primary'}`}
                        >
                            <span className={`nav-icon-box ${isActive(link.path) ? 'text-white' : 'text-primary-light'}`}>
                                {link.icon}
                                {Number(link.badge) > 0 && <span className="nav-notif-dot">{link.badge}</span>}
                            </span>
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="small fw-semibold text-uppercase tracking-widest link-text-label"
                                >
                                    {link.name}
                                </motion.span>
                            )}
                        </Nav.Link>
                    ))}
                </Nav>

                <div className="px-3 mt-auto pt-4 border-top border-dark/5">
                    <div className={`d-flex align-items-center gap-3 p-2 rounded-4 user-drawer-info ${isCollapsed ? 'justify-content-center' : ''}`}>
                        <div
                            className="rounded-circle bg-gradient-premium d-flex align-items-center justify-content-center fw-bold text-white shadow-lg user-avatar-badge"
                        >
                            {user?.name?.charAt(0) || role?.charAt(0).toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <p className="m-0 small fw-bold text-dark text-truncate user-name-label">{user?.name || 'Active User'}</p>
                                <p className="m-0 text-secondary text-truncate uppercase tracking-tighter user-role-label">{role} node</p>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="link"
                        onClick={handleLogout}
                        className={`w-100 mt-3 d-flex align-items-center gap-3 text-danger hover-bg-danger/10 shadow-none transition-all ${isCollapsed ? 'justify-content-center' : ''} btn rounded-pill fw-medium px-4 py-2`}
                    >
                        <FaSignOutAlt />
                        {!isCollapsed && <span className="small fw-semibold uppercase tracking-widest logout-label-text">Disconnect</span>}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard-container d-flex dashboard-main-container">
            {/* Desktop Sidebar */}
            <motion.div
                animate={{ width: collapsed ? '80px' : '280px' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="d-none d-lg-block border-end border-dark/5 bg-white desktop-sidebar-box"
            >
                <SidebarContent />
            </motion.div>

            {/* Mobile Header Overlap Fix (Optional: if the main Navbar isn't enough) */}



            {/* Mobile Offcanvas Sidebar */}
            <Offcanvas
                show={showMobileSidebar}
                onHide={() => setShowMobileSidebar(false)}
                className="bg-white text-dark border-0 offcanvas-sidebar-box"
                placement="start"
            >
                <Offcanvas.Header closeButton className="border-bottom border-dark/5" />

                <Offcanvas.Body className="p-0 overflow-hidden">
                    <SidebarContent forceExpanded={true} />
                </Offcanvas.Body>
            </Offcanvas>

            {/* Main Content Area */}
            <div
                className={`flex-grow-1 d-flex flex-column min-w-0 dashboard-content-area ${collapsed ? 'collapsed' : ''}`}
            >
                {/* Mobile Header (Navbar) for both Organizer and Admin */}
                {role === 'organizer' && (
                    <OrganizerNavbar onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} role={role} />
                )}
                
                {role === 'admin' && (
                    <div className="d-md-none">
                        <OrganizerNavbar onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} role={role} />
                    </div>
                )}

                {/* Floating Mobile Sidebar Toggle for Staff */}
                {role === 'staff' && (
                    <button
                        className="d-md-none mobile-sidebar-toggle-floating"
                        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                        aria-label="Toggle Sidebar"
                    >
                        <FaChevronRight className={showMobileSidebar ? 'rotate-180' : ''} />
                    </button>
                )}

                <main className="p-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Render Floating Chatbot for organizers globally */}
                {role === 'organizer' && <FloatingChatbot />}
            </div>
        </div>
    );
};

export default DashboardLayout;
