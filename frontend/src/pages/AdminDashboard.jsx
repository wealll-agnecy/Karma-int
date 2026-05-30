import { useState, useEffect } from 'react';
import * as adminApi from '../api/adminApi';
import { Container, Row, Col, Card, Button, Badge, Table, Spinner } from 'react-bootstrap';
import {
    FaWallet, FaUsers, FaTicketAlt, FaShieldAlt, FaEye, FaCheck, FaTimes,
    FaCalendarCheck, FaShoppingBag, FaBolt, FaChevronRight, FaChartLine,
    FaEllipsisV, FaCheckCircle, FaTrash
} from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatsCard from '../components/analytics/StatsCard';
import DashboardSkeleton from '../components/analytics/DashboardSkeleton';
import { Link } from 'react-router-dom';
import * as analyticsApi from '../api/analyticsApi';
import toast from 'react-hot-toast';
import '../css/dashboard.css';
import '../css/global.css';
import { formatCurrency } from '../utils/formatUtils';

const chartData = [
    { name: 'Jan', value: 38000 },
    { name: 'Feb', value: 42000 },
    
    { name: 'Mar', value: 39000 },
    { name: 'Apr', value: 85000 },
];



const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [liveStats, setLiveStats] = useState({
        revenue: 0,
        profit: 0,
        netProfit: 0,
        totalOrganizers: 0,
        totalStaff: 0,
        totalEvents: 0,
        ticketsSold: 0,
        expenses: 0,
        activities: []
    });
    const [loading, setLoading] = useState(true);


    const fetchDashboardData = async () => {
        try {
            // Fetch core intelligence data consolidated
            const [adminStatsRes] = await Promise.all([
                adminApi.getAdminStats()
            ]);

            const adminData = adminStatsRes.data.data;

            setLiveStats({
                revenue: adminData.totalRevenue || 0,
                totalOrganizers: adminData.totalOrganizers || 0,
                totalStaff: adminData.totalStaff || 0,
                totalEvents: adminData.totalEvents || 0,
                ticketsSold: adminData.totalTicketsSold || 0,
                profit: adminData.totalProfit || 0,
                totalEnquiries: adminData.totalEnquiries || 0,
                activities: adminData.activities || []
            });

        } catch (err) {
            console.error('Critical Console Sync Failure:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);




    if (loading) {
        return <DashboardSkeleton />;
    }

    const currentRevenue = Number(liveStats.revenue) || 0;

    return (
        <div className="dashboard-page p-0">
            <Container fluid className="px-md-5 pt-0 pb-3">
                {/* ─── Header ─── */}
                <div className="dashboard-header overview-section mb-3">
                    <h2 className="dashboard-title-main mb-1 d-flex align-items-center gap-3">
                        <FaChartLine className="text-pink d-none d-lg-inline-flex" /> Overview
                    </h2>
                    <p className="dashboard-subtext m-0">Analytics, finances and platform management portal.</p>
                </div>

                {/* ─── Stats Grid ─── */}
                <div className="stats-grid-saas mt-2">
                    <div className="dashboard-card">
                        <span className="card-title-sm">Organizers</span>
                        <h3 className="card-value-lg">{liveStats.totalOrganizers}</h3>
                        <div className="mt-2 text-success small fw-bold">Active Hosts</div>
                    </div>
                    <div className="dashboard-card">
                        <span className="card-title-sm">Staff units</span>
                        <h3 className="card-value-lg">{liveStats.totalStaff}</h3>
                        <div className="mt-2 text-slate small fw-bold">Master Nodes</div>
                    </div>
                    <div className="dashboard-card">
                        <span className="card-title-sm">Live Events</span>
                        <h3 className="card-value-lg">{liveStats.totalEvents}</h3>
                        <div className="mt-2 text-slate small fw-bold">Global Catalog</div>
                    </div>
                    <div className="dashboard-card">
                        <span className="card-title-sm">Tickets</span>
                        <h3 className="card-value-lg">{liveStats.ticketsSold.toLocaleString()}</h3>
                        <div className="mt-2 text-slate small fw-bold">Total Sales</div>
                    </div>
                    <Link to="/admin/enquiries" className="text-decoration-none text-dark">
                        <div className="dashboard-card hover-lift transition-all">
                            <span className="card-title-sm d-flex justify-content-between align-items-center">
                                Enquiries
                                {liveStats.totalEnquiries > 0 && (
                                    <Badge pill bg="pink" className="bg-pink text-white rounded-pill px-2 py-1 small">
                                        {liveStats.totalEnquiries}
                                    </Badge>
                                )}
                            </span>
                            <h3 className="card-value-lg">{liveStats.totalEnquiries || 0}</h3>
                            <div className="mt-2 text-pink small fw-bold d-flex align-items-center gap-1">
                                View Inbox <FaChevronRight size={10} />
                            </div>
                        </div>
                    </Link>
                </div>



                {/* â”€â”€â”€ Core Intelligence Panels â”€â”€â”€ */}
                <Row className="mb-4">
                    {/* â”€â”€â”€ Left Column â”€â”€â”€ */}
                    <Col lg={4} className="d-flex flex-column gap-4">
                        {/* Net Profit */}
                        <div className="dashboard-card d-flex flex-column justify-content-center">
                            <span className="card-title-sm mb-3">Net Profit</span>
                            <h2 className="fw-bold mb-4" style={{ fontSize: '2.5rem', letterSpacing: '-0.04em' }}>
                                {formatCurrency(liveStats.profit || 0)}
                            </h2>
                            <div className="mt-2 text-slate small fw-bold">Master Calculation</div>
                            <div className="mt-4 pt-3 border-top">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="small text-slate">Gross Volume</span>
                                    <span className="small fw-bold">{formatCurrency(liveStats.revenue || 0)}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="small text-slate">Operational Loss</span>
                                    <span className="small fw-bold text-danger">-{formatCurrency((liveStats.revenue || 0) - (liveStats.profit || 0))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Identity Moderation */}
                        <div className="dashboard-card text-center d-flex flex-column justify-content-center align-items-center py-5">
                            <span className="card-title-sm align-self-start w-100 text-start mb-4">Identity Moderation</span>
                            <div className="rounded-circle bg-success d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '40px', height: '40px' }}>
                                <FaCheck className="text-white" />
                            </div>
                            <p className="text-slate small fw-bold m-0">No pending requests</p>
                        </div>
                    </Col>

                    {/* â”€â”€â”€ Right Column â”€â”€â”€ */}
                    <Col lg={8} className="d-flex flex-column gap-4">
                        {/* Add Expenses */}
                        <div className="dashboard-card">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <span className="card-title-sm m-0">Add Expenses</span>
                                <Badge bg="light" text="dark" className="border text-uppercase" style={{ fontSize: '0.65rem' }}>finance</Badge>
                            </div>
                            
                            <div className="d-flex justify-content-between align-items-center p-3 rounded mb-3" style={{ border: '1px solid #f1f5f9' }}>
                                 <div>
                                     <div className="small fw-bold">Foods</div>
                                     <div className="text-slate" style={{ fontSize: '0.7rem' }}>Other</div>
                                 </div>
                                 <div className="d-flex align-items-center gap-3">
                                     <span className="fw-bold text-danger">â‚¹5,000</span>
                                     <div className="bg-primary rounded p-1 d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', cursor: 'pointer' }}>
                                         <FaTrash className="text-white" size={10} /> 
                                     </div>
                                 </div>
                            </div>

                            <div className="d-flex gap-2 align-items-center mt-3">
                                <input type="text" className="form-control form-control-sm" placeholder="Description" style={{ flex: 2, padding: '8px 12px' }} />
                                <input type="number" className="form-control form-control-sm" placeholder="Amount" style={{ flex: 1, padding: '8px 12px' }} />
                                <select className="form-select form-select-sm" style={{ flex: 1, padding: '8px 12px' }}>
                                    <option>Other</option>
                                    <option>Foods</option>
                                </select>
                                <Button variant="primary" size="sm" className="px-4 py-2 rounded-pill fw-bold" style={{ background: '#d946ef', border: 'none', fontSize: '0.75rem' }}>ADD</Button>
                            </div>
                        </div>

                        {/* Revenue Intelligence */}
                        <div className="dashboard-card">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <span className="card-title-sm m-0">Revenue Intelligence</span>
                                <Badge bg="light" text="dark" className="border text-uppercase" style={{ fontSize: '0.65rem' }}>real time</Badge>
                            </div>
                            <div style={{ width: '100%', height: '220px' }}>
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
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* ─── Audit Feed ─── */}
                <div className="dashboard-card mb-4">
                    <h5 className="dashboard-title-main" style={{ fontSize: '1.25rem', marginBottom: '25px' }}>Security & Audit Feed</h5>
                    <div className="data-list">
                        {(liveStats?.activities || []).length > 0 ? (
                            (liveStats?.activities || []).slice(0, 10).map((log, i) => (
                                <div key={i} className="data-item p-3 border-0 bg-transparent border-bottom rounded-0">
                                    <div className="data-left">
                                        <h6 style={{ fontSize: '0.875rem' }}>{log.message}</h6>
                                        <p style={{ fontSize: '0.75rem' }}>{new Date(log.time).toLocaleString()}</p>
                                    </div>
                                    <div className="text-slate uppercase small fw-bold tracking-wider audit-feed-type" style={{ opacity: 0.6 }}>
                                        {log.type}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-5 text-slate opacity-40 small">Zero active logs.</div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default AdminDashboard;
