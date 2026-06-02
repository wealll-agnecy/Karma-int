import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import * as eventApi from '../api/eventApi';
import * as analyticsApi from '../api/analyticsApi';
import { Row, Col } from 'react-bootstrap';
import OrganizerEventCard from '../components/events/OrganizerEventCard';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRocket, FaWallet, FaTicketAlt, FaBolt } from 'react-icons/fa';
import { formatCurrency } from '../utils/formatUtils';
import '../css/OrganizerEvents.css';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    metricCard: (accent) => ({ background: '#fff', border: `1.5px solid ${accent}22`, borderRadius: '22px', boxShadow: `0 8px 28px ${accent}10`, transition: 'all .3s ease', padding: '24px', position: 'relative', overflow: 'hidden' }),
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '8px' },
    value: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, color: '#111827' },
};

const OrganizerEvents = () => {
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
        } catch (err) { console.error('Failed to fetch node data'); } finally { setLoading(false); }
    };
    useEffect(() => { fetchEvents(); }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf7ff' }}>
            <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <FaRocket size={50} color="#8b5cf6" style={{ opacity: 0.5 }} />
            </motion.div>
        </div>
    );

    const metrics = [
        { label: 'Aggregate Revenue', value: formatCurrency(orgStats.totalRevenue), sub: 'Global Balance', accent: '#10b981' },
        { label: 'Ticket Circulation', value: orgStats.totalTicketsSold, sub: 'Sold Out Capacity', accent: '#ec4899' },
        { label: 'Active Nodes', value: orgStats.approvedEvents || 0, sub: 'Live Catalog', accent: '#8b5cf6' },
    ];

    return (
        <div style={P.page}>
            <div style={{ margin: '0 auto', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Organizer Portal</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>My Events</h1>
                    <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>
                        Monitoring {orgStats.totalEvents} active event nodes across the infrastructure.
                    </p>
                </div>

                {/* Desktop Metric Cards */}
                <div className="d-none d-md-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: '18px', marginBottom: '28px' }}>
                    {metrics.map((m, i) => (
                        <div key={i} style={P.metricCard(m.accent)}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${m.accent}20`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 28px ${m.accent}10`; }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle,${m.accent}20,transparent 70%)` }} />
                            <span style={P.label}>{m.label}</span>
                            <div style={P.value}>{m.value}</div>
                            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '8px', fontWeight: 600 }}>{m.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Mobile Metric Cards */}
                <div className="d-md-none" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '18px' }}>
                    {metrics.map((m, i) => (
                        <div key={i} style={{ background: '#fff', border: `1.5px solid ${m.accent}22`, borderRadius: '16px', padding: '12px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.52rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* Events Grid */}
                {(events || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '22px', border: '1px solid #ede8f4', boxShadow: '0 8px 32px rgba(100,60,180,0.07)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.15 }}>🔭</div>
                        <h4 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '8px', fontSize: '1.4rem' }}>No Events Detected</h4>
                        <p style={{ color: '#6b7280', margin: 0 }}>Your event registry is currently empty.</p>
                    </div>
                ) : (
                    <Row className="g-4">
                        <AnimatePresence>
                            {(events || []).map((event, idx) => (
                                <Col key={event._id} xl={4} lg={6} md={6}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.07 }}
                                    >
                                        <OrganizerEventCard event={event} />
                                    </motion.div>
                                </Col>
                            ))}
                        </AnimatePresence>
                    </Row>
                )}
            </div>
        </div>
    );
};

export default OrganizerEvents;
