import { useState, useEffect } from 'react';
import * as adminApi from '../api/adminApi';
import { Container, Row, Col, Button, Badge, Table } from 'react-bootstrap';
import {
    FaWallet, FaUsers, FaTicketAlt, FaCheck,
    FaChevronRight, FaChartLine, FaTrash, FaEdit, FaEnvelope, FaShieldAlt
} from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardSkeleton from '../components/analytics/DashboardSkeleton';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../css/dashboard.css';
import '../css/global.css';
import { formatCurrency } from '../utils/formatUtils';
import * as eventApi from '../api/eventApi';
import EventLandingEditor from '../components/events/EventLandingEditor';

/* ─── Design tokens ─── */
const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '28px' },
    metricCard: (accent) => ({ background: '#fff', border: `1.5px solid ${accent}22`, borderRadius: '22px', boxShadow: `0 8px 28px ${accent}10`, transition: 'all .3s ease', padding: '24px', position: 'relative', overflow: 'hidden' }),
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '8px' },
    value: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, color: '#111827' },
    sectionTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1e1b2e', letterSpacing: '-0.3px', margin: 0 },
    tag: { background: '#f3f4f6', color: '#6b7280', borderRadius: '8px', padding: '4px 12px', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' },
};

const chartData = [
    { name: 'Jan', value: 38000 },
    { name: 'Feb', value: 42000 },
    { name: 'Mar', value: 39000 },
    { name: 'Apr', value: 85000 },
];

const AdminDashboard = () => {
    const [liveStats, setLiveStats] = useState({ revenue: 0, profit: 0, netProfit: 0, totalOrganizers: 0, totalStaff: 0, totalEvents: 0, ticketsSold: 0, expenses: 0, activities: [] });
    const [events, setEvents] = useState([]);
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedEventToEdit, setSelectedEventToEdit] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const [adminStatsRes, eventsRes] = await Promise.all([adminApi.getAdminStats(), eventApi.getEvents()]);
            const adminData = adminStatsRes.data.data;
            setEvents(eventsRes.data?.data || []);
            setLiveStats({ revenue: adminData.totalRevenue || 0, totalOrganizers: adminData.totalOrganizers || 0, totalStaff: adminData.totalStaff || 0, totalEvents: adminData.totalEvents || 0, ticketsSold: adminData.totalTicketsSold || 0, profit: adminData.totalProfit || 0, totalEnquiries: adminData.totalEnquiries || 0, activities: adminData.activities || [] });
        } catch (err) { console.error('Critical Console Sync Failure:', err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchDashboardData(); }, []);

    if (loading) return <DashboardSkeleton />;

    const topMetrics = [
        { label: 'Organizers', value: liveStats.totalOrganizers, sub: 'Active Hosts', accent: '#8b5cf6' },
        { label: 'Staff Units', value: liveStats.totalStaff, sub: 'Assigned Nodes', accent: '#3b82f6' },
        { label: 'Live Events', value: liveStats.totalEvents, sub: 'Global Catalog', accent: '#ec4899' },
        { label: 'Tickets Sold', value: liveStats.ticketsSold?.toLocaleString(), sub: 'Total Sales', accent: '#10b981' },
    ];

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 32px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Admin Portal</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>Overview</h1>
                    <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Analytics, finances and platform management portal.</p>
                </div>

                {/* Desktop metrics */}
                <div className="d-none d-md-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: '16px', marginBottom: '28px' }}>
                    {topMetrics.map((m, i) => (
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
                    {/* Enquiries card */}
                    <Link to="/admin/enquiries" style={{ textDecoration: 'none' }}>
                        <div style={{ ...P.metricCard('#f59e0b'), cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px #f59e0b20'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px #f59e0b10'; }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle,#f59e0b20,transparent 70%)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={P.label}>Enquiries</span>
                                {liveStats.totalEnquiries > 0 && <span style={{ background: '#fbbf24', color: '#fff', borderRadius: '999px', padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700 }}>{liveStats.totalEnquiries}</span>}
                            </div>
                            <div style={P.value}>{liveStats.totalEnquiries || 0}</div>
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>View Inbox <FaChevronRight size={8} /></div>
                        </div>
                    </Link>
                </div>

                {/* Mobile metrics */}
                <div className="d-md-none" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '18px' }}>
                    {[...topMetrics, { label: 'Enquiries', value: liveStats.totalEnquiries || 0, sub: 'View Inbox', accent: '#f59e0b', link: '/admin/enquiries' }].map((m, i) => {
                        const cardContent = (
                            <div style={{ ...P.card, padding: '12px 10px', textAlign: 'center', borderRadius: '16px', height: '100%' }}>
                                <div style={{ ...P.label, fontSize: '0.52rem', marginBottom: '6px' }}>{m.label}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-0.5px' }}>{m.value}</div>
                            </div>
                        );
                        return m.link ? (
                            <Link key={i} to={m.link} style={{ textDecoration: 'none', gridColumn: 'span 2' }}>
                                {cardContent}
                            </Link>
                        ) : (
                            <div key={i} style={{ gridColumn: 'auto' }}>
                                {cardContent}
                            </div>
                        );
                    })}
                </div>

                {/* Intelligence Panels */}
                <Row className="g-4 mb-4">
                    <Col xs={12} lg={4}>
                        <Row className="g-4 h-100">
                            {/* Net Profit */}
                            <Col xs={12} lg={12}>
                                <div style={{ ...P.card, background: 'linear-gradient(145deg,#1e1b2e,#2d2a4a)', color: '#fff', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{ ...P.label, color: 'rgba(255,255,255,0.5)' }}>Net Profit</span>
                                        <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-2px', margin: '8px 0 4px', background: 'linear-gradient(135deg,#c084fc,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                                            {formatCurrency(liveStats.profit || 0)}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Master Calc</div>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Volume</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(liveStats.revenue || 0)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Op Loss</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171' }}>-{formatCurrency((liveStats.revenue || 0) - (liveStats.profit || 0))}</span>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                            {/* Moderation */}
                            <Col xs={12} lg={12}>
                                <div style={{ ...P.card, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <span style={{ ...P.label, alignSelf: 'flex-start', marginBottom: '16px' }}>Moderation</span>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 8px 20px #10b98130' }}>
                                        <FaCheck color="#fff" size={18} />
                                    </div>
                                    <p style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>No pending<br/>requests</p>
                                </div>
                            </Col>
                        </Row>
                    </Col>

                    <Col xs={12} lg={8}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                            {/* Add Expenses */}
                            <div style={P.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h5 style={P.sectionTitle}>Add Expenses</h5>
                                    <span style={P.tag}>Finance</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '14px', background: '#fafafa', border: '1.5px solid #f1f5f9', marginBottom: '14px' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.88rem' }}>Foods</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Other</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.95rem' }}>₹5,000</span>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <FaTrash color="#fff" size={10} />
                                        </div>
                                    </div>
                                </div>
                                <div className="expense-form-container" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input type="text" placeholder="Description" style={{ flex: 2, minWidth: '100px', padding: '10px 14px', border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', fontSize: '0.82rem', outline: 'none' }} />
                                    <input type="number" placeholder="Amount" style={{ flex: 1, minWidth: '80px', padding: '10px 14px', border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', fontSize: '0.82rem', outline: 'none' }} />
                                    <select style={{ flex: 1, minWidth: '80px', padding: '10px 14px', border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', fontSize: '0.82rem', outline: 'none' }}>
                                        <option>Other</option>
                                        <option>Foods</option>
                                    </select>
                                    <button style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.78rem', padding: '10px 20px', cursor: 'pointer', whiteSpace: 'nowrap' }}>ADD</button>
                                </div>

                            </div>

                            {/* Revenue Intelligence Chart */}
                            <div style={{ ...P.card, flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h5 style={P.sectionTitle}>Revenue Intelligence</h5>
                                    <span style={P.tag}>Real Time</span>
                                </div>
                                <div style={{ width: '100%', height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dx={-10} />
                                            <Tooltip contentStyle={{ borderRadius: '14px', border: '1.5px solid #ede8f4', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }} itemStyle={{ color: '#8b5cf6', fontWeight: 700 }} />
                                            <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Events CMS */}
                <div style={{ ...P.card, marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                        <h5 style={P.sectionTitle}>Events CMS System</h5>
                        <span style={P.tag}>Content Management</span>
                    </div>
                    {/* Desktop Table View */}
                    <div className="d-none d-md-block" style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #ede8f4' }}>
                        <Table className="m-0 align-middle">
                            <thead>
                                <tr style={{ background: '#f8f7fc' }}>
                                    <th style={{ padding: '14px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', border: 'none' }}>Event Name</th>
                                    <th style={{ padding: '14px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', border: 'none', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((ev) => (
                                    <tr key={ev._id} style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e1b2e', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: 'none' }}>{ev.title}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', border: 'none' }}>
                                            <button
                                                onClick={() => { setSelectedEventToEdit(ev); setEditorOpen(true); }}
                                                style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.78rem', padding: '7px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <FaEdit size={11} /> Edit Content
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {events.length === 0 && (
                                    <tr><td colSpan="2" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '0.85rem', border: 'none' }}>No events found</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {/* Mobile CMS List View */}
                    <div className="d-block d-md-none" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {events.map((ev) => (
                            <div key={ev._id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8f7fc', borderRadius: '16px', border: '1px solid #ede8f4' }}>
                                <div style={{ fontWeight: 600, color: '#1e1b2e', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                    {ev.title}
                                </div>
                                <button
                                    onClick={() => { setSelectedEventToEdit(ev); setEditorOpen(true); }}
                                    style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, fontSize: '0.78rem', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
                                >
                                    <FaEdit size={11} /> Edit Content
                                </button>
                            </div>
                        ))}
                        {events.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '0.85rem' }}>No events found</div>
                        )}
                    </div>
                </div>

                {editorOpen && selectedEventToEdit && (
                    <EventLandingEditor
                        show={editorOpen}
                        onHide={() => { setEditorOpen(false); setSelectedEventToEdit(null); }}
                        event={selectedEventToEdit}
                        onEventUpdated={(updatedEvent) => {
                            setEvents(events.map(e => e._id === updatedEvent._id ? updatedEvent : e));
                            toast.success('Landing page updated seamlessly!');
                        }}
                    />
                )}

                {/* Audit Feed */}
                <div style={{ ...P.card, marginBottom: '24px' }}>
                    <h5 style={{ ...P.sectionTitle, marginBottom: '22px' }}>Security & Audit Feed</h5>
                    <div>
                        {(liveStats?.activities || []).length > 0 ? (
                            (liveStats.activities).slice(0, 10).map((log, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 9 ? '1px solid #f3f4f6' : 'none', transition: 'background .2s' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1e1b2e', fontSize: '0.875rem', marginBottom: '3px' }}>{log.message}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{new Date(log.time).toLocaleString()}</div>
                                    </div>
                                    <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: '999px', padding: '4px 12px', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{log.type}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '0.88rem' }}>Zero active logs.</div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default AdminDashboard;
