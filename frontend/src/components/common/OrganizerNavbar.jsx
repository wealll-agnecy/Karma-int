import React, { useState, useEffect } from 'react';
import { Dropdown, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaBell, FaLifeRing, FaBars } from 'react-icons/fa';
import firebaseRealtimeService from '../../utils/socketService';
import { useAuth } from '../../context/AuthContext';
import '../../css/OrganizerNavbar.css';

const OrganizerNavbar = ({ onToggleSidebar, role }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'New Ticket Sale', message: 'Kaustav bought VIP ticket for Masterclass.', isRead: false, createdAt: new Date().toISOString() },
        { id: 2, title: 'Lead Updated', message: 'Gopal Chandra Paul status changed to Contacted.', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, title: 'Event Approval', message: 'Your event "Karma Basic to Advanced" was approved.', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 4, title: 'Payment Received', message: '₹5000 partial payment received from attendee.', isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() }
    ]);
    const [unreadCount, setUnreadCount] = useState(2);

    useEffect(() => {
        if (!user || !user._id || role === 'admin') return;

        // The Firebase listeners are initialized when connect is called.
        // If it fails, our exponential backoff fixes will handle it gracefully.
        firebaseRealtimeService.connect(user._id);

        const handleNotification = (notif) => {
            setNotifications(prev => {
                const exists = prev.find(n => n.id === notif.id);
                if (exists) return prev;
                return [notif, ...prev].slice(0, 10);
            });
            setUnreadCount(prev => prev + 1);
        };

        firebaseRealtimeService.on('notification', handleNotification);

        return () => {
            firebaseRealtimeService.off('notification', handleNotification);
        };
    }, [user]);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString();
    };

    return (
        <nav className="organizer-navbar">
            <div className="nav-left-actions d-md-none d-flex align-items-center gap-2" style={{ flex: 1, justifyContent: 'flex-start' }}>
                <button 
                    className="border-0 p-2 d-flex align-items-center justify-content-center bg-transparent" 
                    onClick={onToggleSidebar}
                    aria-label="Toggle Sidebar"
                >
                    <FaBars size={22} color="#000" />
                </button>
                <div className="logo-container text-decoration-none">
                    <h1 className="logo-text mb-0" style={{ fontSize: '1.25rem', letterSpacing: '0.5px' }}>
                        <span className="growth" style={{ color: 'var(--primary)' }}>Growth</span>
                        <span className="utsav" style={{ color: '#000' }}>Utsav</span>
                    </h1>
                </div>
            </div>
            
            <div className="nav-left-actions d-none d-md-flex align-items-center">
                {/* Breadcrumbs or branding placeholder */}
            </div>

            <div className="nav-right-actions ms-auto">
                {role !== 'admin' && (
                    <Dropdown align="end">
                        <Dropdown.Toggle as="div" className="nav-icon-btn position-relative" bsPrefix="p-0" style={{ cursor: 'pointer' }}>
                            <FaBell size={24} color="#ff007f" />
                            {unreadCount > 0 && (
                                <span className="nav-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            )}
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="notif-dropdown-menu">
                            <div className="notif-header">
                                <h6>Notifications</h6>
                                {unreadCount > 0 && (
                                    <Badge bg="danger" pill>{unreadCount} New</Badge>
                                )}
                            </div>
                            
                            <div className="notif-list">
                                {notifications.length > 0 ? (
                                    notifications.map((n, idx) => (
                                        <Link to="/organizer/notifications" key={n.id || idx} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                                            <div className="notif-title">{n.title || 'Notification'}</div>
                                            <div className="notif-msg text-truncate">{n.message}</div>
                                            <div className="notif-time">{formatTime(n.createdAt)}</div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-center p-4 text-muted small">
                                        No recent notifications.
                                    </div>
                                )}
                            </div>

                            <div className="notif-footer">
                                <Link to="/organizer/notifications" className="notif-view-all" onClick={() => setUnreadCount(0)}>
                                    View All Activity
                                </Link>
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>
                )}
            </div>
        </nav>
    );
};

export default OrganizerNavbar;
