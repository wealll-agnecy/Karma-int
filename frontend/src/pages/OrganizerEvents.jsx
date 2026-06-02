import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import * as eventApi from '../api/eventApi';
import * as analyticsApi from '../api/analyticsApi';
import { Button, Badge, Row, Col } from 'react-bootstrap';
import OrganizerEventCard from '../components/events/OrganizerEventCard';
import StatsCard from '../components/analytics/StatsCard';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaSatellite, FaRocket, FaWallet, FaTicketAlt, FaCalendarCheck } from 'react-icons/fa';
import { formatCurrency } from '../utils/formatUtils';

import '../css/OrganizerEvents.css';

const OrganizerEvents = () => {
    // ... existing state and effects ...
    const [events, setEvents] = useState([]);
    const [orgStats, setOrgStats] = useState({ totalEvents: 0, totalRevenue: 0, totalTicketsSold: 0 });
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();

    const fetchEvents = async () => {
        try {
            const [eventsRes, statsRes] = await Promise.all([
                eventApi.getMyEvents(),
                analyticsApi.getOrganizerStats()
            ]);
            setEvents(eventsRes.data?.data || []);
            setOrgStats(statsRes.data?.data || { totalEvents: 0, totalRevenue: 0, totalTicketsSold: 0 });
        } catch (err) {
            console.error('Failed to fetch node data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);


    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-transparent">
            <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <FaRocket size={50} className="text-primary opacity-50" />
            </motion.div>
        </div>
    );

    return (
        <div className="organizer-events-page">
            <div className="dashboard-page">
                <div className="dashboard-header d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-4">
                    <div>
                        <h2 className="dashboard-title-main">My Events</h2>
                        <p className="dashboard-subtext">
                            Monitoring {orgStats.totalEvents} active event nodes across the infrastructure.
                        </p>
                    </div>
                </div>

                {/* ─── Stats Grid (Desktop) ─── */}
                <div className="stats-grid-saas mb-5 d-none d-md-grid">
                    <div className="dashboard-card shadow-sm">
                        <span className="card-title-sm">Aggregate Revenue</span>
                        <h3 className="card-value-lg">{formatCurrency(orgStats.totalRevenue)}</h3>
                        <div className="mt-2 text-success small fw-bold">Global Balance</div>
                    </div>
                    <div className="dashboard-card shadow-sm">
                        <span className="card-title-sm">Ticket Circulation</span>
                        <h3 className="card-value-lg">{orgStats.totalTicketsSold}</h3>
                        <div className="mt-2 text-pink small fw-bold">Sold Out Capacity</div>
                    </div>
                    <div className="dashboard-card shadow-sm">
                        <span className="card-title-sm">Active Nodes</span>
                        <h3 className="card-value-lg">{orgStats.approvedEvents}</h3>
                        <div className="mt-2 text-slate small fw-bold">Live Catalog</div>
                    </div>
                </div>

                {/* --- MOBILE STATS (3 cards strictly in one line) --- */}
                <div className="d-md-none w-100 mb-4 pb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <div className="dashboard-card shadow-sm m-0" style={{ padding: '8px 4px', textAlign: 'center', overflow: 'hidden' }}>
                        <div className="card-title-sm mb-1" style={{ fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Revenue</div>
                        <div className="card-value-lg fw-bold text-truncate" style={{ fontSize: '0.9rem' }}>{formatCurrency(orgStats.totalRevenue)}</div>
                        <div className="mt-1 text-success" style={{ fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Balance</div>
                    </div>
                    <div className="dashboard-card shadow-sm m-0" style={{ padding: '8px 4px', textAlign: 'center', overflow: 'hidden' }}>
                        <div className="card-title-sm mb-1" style={{ fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tickets</div>
                        <div className="card-value-lg fw-bold text-truncate" style={{ fontSize: '0.9rem' }}>{orgStats.totalTicketsSold}</div>
                        <div className="mt-1 text-pink" style={{ fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Sold Out</div>
                    </div>
                    <div className="dashboard-card shadow-sm m-0" style={{ padding: '8px 4px', textAlign: 'center', overflow: 'hidden' }}>
                        <div className="card-title-sm mb-1" style={{ fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nodes</div>
                        <div className="card-value-lg fw-bold text-truncate" style={{ fontSize: '0.9rem' }}>{orgStats.approvedEvents}</div>
                        <div className="mt-1 text-slate" style={{ fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Live</div>
                    </div>
                </div>


                {(events || []).length === 0 ? (
                    <div className="dashboard-card text-center py-5 shadow-sm">
                        <div className="display-1 mb-4 opacity-10">🔭</div>
                        <h4 className="dashboard-title-main mb-4" style={{ fontSize: '1.5rem' }}>No Events Detected</h4>
                    </div>
                ) : (
                    <Row className="g-4">
                        {(events || []).map((event, idx) => (
                            <Col key={event._id} xl={4} lg={6} md={6}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <OrganizerEventCard event={event} />
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                )}
            </div>
        </div>
    );
};

export default OrganizerEvents;
