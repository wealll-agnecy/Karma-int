import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Table, Badge, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import * as eventApi from '../api/eventApi';
import * as analyticsApi from '../api/analyticsApi';
import { RevenueChart } from '../components/analytics/DashboardCharts';
import DashboardSkeleton from '../components/analytics/DashboardSkeleton';
import {
    FaCalendarAlt, FaTicketAlt, FaWallet, FaEye, FaChartLine,
    FaArrowUp, FaCheckCircle, FaBolt, FaTimesCircle, FaUndo
} from 'react-icons/fa';
import '../css/dashboard.css';
import '../css/global.css';
import { formatCurrency } from '../utils/formatUtils';

/* ─── inline design tokens ─────────────────────────────────── */
const S = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)',
        padding: '0 0 60px',
    },
    card: {
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        border: '1px solid #ede8f4',
        borderRadius: '22px',
        boxShadow: '0 8px 32px rgba(100,60,180,0.07)',
        transition: 'box-shadow .3s ease, transform .3s ease',
        padding: '28px 28px',
    },
    metricCard: (accent) => ({
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${accent}22`,
        borderRadius: '22px',
        boxShadow: `0 8px 28px ${accent}12`,
        transition: 'all .3s ease',
        padding: '26px 24px',
        position: 'relative',
        overflow: 'hidden',
    }),
    accentDot: (accent) => ({
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}22, transparent 70%)`,
        pointerEvents: 'none',
    }),
    label: {
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#9ca3af',
        marginBottom: '8px',
        display: 'block',
    },
    value: {
        fontSize: '2.1rem',
        fontWeight: 800,
        letterSpacing: '-1.5px',
        lineHeight: 1,
        color: '#111827',
    },
    sectionTitle: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#1e1b2e',
        letterSpacing: '-0.3px',
    },
    badge: (color) => ({
        background: color === 'success' ? '#dcfce7' : '#fef9c3',
        color: color === 'success' ? '#15803d' : '#92400e',
        borderRadius: '999px',
        padding: '5px 14px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        border: 'none',
    }),
    gradBtn: {
        background: 'linear-gradient(135deg,#d946ef,#8b5cf6)',
        border: 'none',
        borderRadius: '14px',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.8rem',
        padding: '8px 20px',
        boxShadow: '0 6px 20px rgba(139,92,246,.25)',
        transition: 'transform .2s, box-shadow .2s',
    },
};

const metrics = (stats, revenueData) => [
    {
        label: 'Total Revenue',
        value: formatCurrency(stats?.totalRevenue || 0),
        sub: 'Verified Earnings',
        icon: <FaWallet />,
        accent: '#2575fc',
    },
    {
        label: 'Successful Payments',
        value: stats?.successfulPayments || 0,
        sub: 'Verified Success',
        icon: <FaCheckCircle />,
        accent: '#10b981',
    },
    {
        label: 'Failed Payments',
        value: stats?.failedPayments || 0,
        sub: 'Declined/Error',
        icon: <FaTimesCircle />,
        accent: '#ef4444',
    },
    {
        label: 'Refunds',
        value: stats?.refunds || 0,
        sub: 'Processed Returns',
        icon: <FaUndo />,
        accent: '#f59e0b',
    },
];

const OrganizerDashboard = () => {
    const [stats, setStats] = useState({ totalEvents: 0, approvedEvents: 0, totalTicketsSold: 0, totalRevenue: 0 });
    const [revenueData, setRevenueData] = useState({ totalRevenue: 0, totalEvents: 0 });
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Calculator states
    const [calcRevenue, setCalcRevenue] = useState('');
    const [calcExpenses, setCalcExpenses] = useState('');

    const fetchData = async () => {
        try {
            const [statsRes, eventsRes, revenueRes] = await Promise.all([
                analyticsApi.getOrganizerStats(),
                eventApi.getMyEvents(),
                analyticsApi.getOrganizerRevenue()
            ]);
            setStats(statsRes.data?.data || { totalEvents: 0, approvedEvents: 0, totalTicketsSold: 0, totalRevenue: 0 });
            setRevenueData(revenueRes.data || { totalRevenue: 0, totalEvents: 0 });
            setEvents((eventsRes.data?.data || []).slice(0, 5));
        } catch (err) {
            console.error('Failed to load organizer dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Are you sure you want to delete this event? This action is irreversible.")) return;
        try {
            await eventApi.deleteEvent(id);
            fetchData();
        } catch (err) {
            const toast = (await import('react-hot-toast')).default;
            toast.error('Failed to delete event.');
        }
    };

    if (loading) return <DashboardSkeleton />;

    const netProfit = revenueData?.totalRevenue || 0;
    const calculatedProfit = (Number(calcRevenue) || 0) - (Number(calcExpenses) || 0);
    const isLoss = calculatedProfit < 0;

    return (
        <div style={S.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>

                {/* ─── Page Header ─── */}
                <div style={{ padding: '40px 0 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>
                                Organizer Portal
                            </div>
                            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>
                                Dashboard
                            </h1>
                            <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>
                                Manage your events, view analytics, and control your enterprise.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ─── Metric Cards (Desktop) ─── */}
                <div className="d-none d-md-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: '18px', marginBottom: '28px' }}>
                    {metrics(stats, revenueData).map((m, i) => (
                        <div key={i} style={S.metricCard(m.accent)}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${m.accent}20`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 28px ${m.accent}12`; }}
                        >
                            <div style={S.accentDot(m.accent)} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={S.label}>{m.label}</span>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: `${m.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.accent, fontSize: '0.9rem' }}>
                                    {m.icon}
                                </div>
                            </div>
                            <div style={S.value}>{m.value}</div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px', fontWeight: 600 }}>{m.sub}</div>
                        </div>
                    ))}
                </div>

                {/* ─── Metric Cards (Mobile — 2×2 grid) ─── */}
                <div className="d-md-none" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '20px' }}>
                    {metrics(stats, revenueData).map((m, i) => (
                        <div key={i} style={{ ...S.metricCard(m.accent), padding: '16px' }}>
                            <span style={{ ...S.label, fontSize: '0.58rem' }}>{m.label}</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-1px' }}>{m.value}</div>
                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, marginTop: '4px' }}>{m.sub}</div>
                        </div>
                    ))}
                </div>

                {/* ─── Middle Row: Net Profit + P&L Calculator ─── */}
                <Row className="g-4 mb-4">
                    {/* Net Profit */}
                    <Col lg={4}>
                        <div style={{ ...S.card, background: 'linear-gradient(145deg,#1e1b2e,#2d2a4a)', color: '#fff', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <span style={{ ...S.label, color: 'rgba(255,255,255,0.5)' }}>Net Profit</span>
                                <div style={{ fontSize: 'clamp(1.6rem, 7vw, 2.6rem)', fontWeight: 800, letterSpacing: '-2px', margin: '12px 0 6px', background: 'linear-gradient(135deg,#c084fc,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                                    {formatCurrency(netProfit)}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Finalized Earnings</p>
                            </div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Gross Revenue</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(stats?.totalRevenue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Monthly Avg</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(Math.round((stats?.totalRevenue || 0) / 12))}</span>
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* P&L Calculator */}
                    <Col lg={8}>
                        <div style={{ ...S.card, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h5 style={S.sectionTitle}>Profit & Loss Calculator</h5>
                                <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: '8px', padding: '4px 12px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tools</span>
                            </div>

                            <Row className="g-3 mb-4">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label style={{ ...S.label }}>Expected Revenue</Form.Label>
                                        <div className="input-group">
                                            <span className="input-group-text" style={{ background: '#f8fafc', border: '1.5px solid #ede8f4', borderRight: 'none', borderRadius: '12px 0 0 12px', color: '#6b7280', fontWeight: 700 }}>₹</span>
                                            <Form.Control
                                                type="number"
                                                placeholder="0.00"
                                                value={calcRevenue}
                                                onChange={(e) => setCalcRevenue(e.target.value)}
                                                style={{ border: '1.5px solid #ede8f4', borderLeft: 'none', borderRadius: '0 12px 12px 0', background: '#f8fafc', boxShadow: 'none', padding: '10px 14px' }}
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label style={{ ...S.label }}>Estimated Expenses</Form.Label>
                                        <div className="input-group">
                                            <span className="input-group-text" style={{ background: '#f8fafc', border: '1.5px solid #ede8f4', borderRight: 'none', borderRadius: '12px 0 0 12px', color: '#6b7280', fontWeight: 700 }}>₹</span>
                                            <Form.Control
                                                type="number"
                                                placeholder="0.00"
                                                value={calcExpenses}
                                                onChange={(e) => setCalcExpenses(e.target.value)}
                                                style={{ border: '1.5px solid #ede8f4', borderLeft: 'none', borderRadius: '0 12px 12px 0', background: '#f8fafc', boxShadow: 'none', padding: '10px 14px' }}
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <div style={{
                                marginTop: 'auto',
                                padding: '20px 24px',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: isLoss ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                                border: `1.5px solid ${isLoss ? '#fca5a5' : '#86efac'}`,
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isLoss ? '#b91c1c' : '#15803d', marginBottom: '4px' }}>
                                        {isLoss ? '⚠ Projected Loss' : '✓ Projected Profit'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: isLoss ? '#ef4444' : '#22c55e' }}>Based on your inputs</div>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', color: isLoss ? '#b91c1c' : '#15803d' }}>
                                    {isLoss ? '-' : '+'}{formatCurrency(Math.abs(calculatedProfit))}
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* ─── Bottom Row: My Events + Analytics ─── */}
                <Row className="g-4">
                    {/* My Events */}
                    <Col lg={7}>
                        <div style={{ ...S.card, height: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                                <h5 style={S.sectionTitle}>My Events</h5>
                                <Button as={Link} to="/organizer/events" style={{ ...S.gradBtn }}>
                                    View All
                                </Button>
                            </div>

                            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #ede8f4' }}>
                                <Table className="m-0 align-middle" style={{ marginBottom: 0 }}>
                                    <thead>
                                        <tr style={{ background: '#f8f7fc' }}>
                                            <th style={{ padding: '14px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', border: 'none' }}>Event Name</th>
                                            <th style={{ padding: '14px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', border: 'none', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((ev) => (
                                            <tr key={ev._id}
                                                style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e1b2e', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: 'none' }}>
                                                    {ev.title}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'right', border: 'none' }}>
                                                    <Button as={Link} to={`/organizer/event/${ev._id}`}
                                                        style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '10px', color: '#8b5cf6', padding: '6px 12px', fontSize: '0.8rem', transition: 'all .2s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ede8f4'; }}
                                                        title="View Event Details"
                                                    >
                                                        <FaEye />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {events.length === 0 && (
                                            <tr>
                                                <td colSpan="2" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '0.85rem', border: 'none' }}>
                                                    No events found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </Col>

                    {/* Analytics Chart */}
                    <Col lg={5}>
                        <div style={{ ...S.card, height: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                                <h5 style={S.sectionTitle}>Platform Analytics</h5>
                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                                    <FaChartLine size={14} />
                                </div>
                            </div>
                            <div style={{ height: '250px', paddingBottom: '8px' }}>
                                <RevenueChart data={[
                                    { name: 'Last Qtr', revenue: (stats?.totalRevenue || 0) * 0.4 },
                                    { name: 'Prev Mth', revenue: (stats?.totalRevenue || 0) * 0.7 },
                                    { name: 'Current', revenue: (stats?.totalRevenue || 0) },
                                ]} />
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default OrganizerDashboard;
