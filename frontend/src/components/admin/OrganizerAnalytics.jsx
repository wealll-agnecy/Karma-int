import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Row, Col, Card, Badge, Table, ProgressBar, Spinner } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTicketAlt, FaMoneyBillWave, FaChartLine, FaStar, FaClock, FaHistory } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import * as analyticsApi from '../../api/analyticsApi';
import { formatCurrency } from '../../utils/formatUtils';

const OrganizerAnalytics = ({ eventId, organizerId, totalCapacity = 0 }) => {
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 5;

    const fetchAnalytics = useCallback(async () => {
        console.log(`🔍 [TELEMETRY_SYNC]: eventId=${eventId}, organizerId=${organizerId}`);
        if (!eventId && !organizerId) return;

        try {
            let statsRes, bookingsRes, specRes;
            
            if (eventId) {
                console.log(`📡 [FRONTEND]: Triggering telemetry sync for Event: ${eventId}`);
                const results = await Promise.allSettled([
                    analyticsApi.getEventDashboardStats(eventId),
                    analyticsApi.getEventRecentBookings(eventId),
                    analyticsApi.getEventStats(eventId)
                ]);

                statsRes = results[0].status === 'fulfilled' ? results[0].value : null;
                bookingsRes = results[1].status === 'fulfilled' ? results[1].value : null;
                specRes = results[2].status === 'fulfilled' ? results[2].value : null;

                if (results[0].status === 'rejected') console.error('❌ Dashboard Stats Error:', results[0].reason);
                if (results[1].status === 'rejected') console.error('❌ Recent Bookings Error:', results[1].reason);
                if (results[2].status === 'rejected') console.error('❌ Specialized Stats Error:', results[2].reason);

                console.log('✅ [FRONTEND]: Raw Payloads Received');
            } else if (organizerId) {
                const results = await Promise.allSettled([
                    analyticsApi.getOrganizerDashboardStats(organizerId).catch(() => ({ data: { success: false, data: {} } })),
                    analyticsApi.getOrganizerRecentBookings(organizerId).catch(() => ({ data: { success: false, data: [] } }))
                ]);
                statsRes = results[0].status === 'fulfilled' ? results[0].value : null;
                bookingsRes = results[1].status === 'fulfilled' ? results[1].value : null;
            }
            
            if (statsRes?.data?.success) {
                const raw = statsRes.data.data;
                const specData = specRes?.data?.data || {};
                
                // Construct Real Breakdown from Backend Aggregation
                // If it's pure organizer view and no specRes, use statsRes's breakdown or chartData
                const backendBreakdown = Array.isArray(raw?.breakdown) ? raw.breakdown : 
                                       (Array.isArray(raw?.chartData) ? raw.chartData : []);

                const realBreakdown = eventId ? [
                    { name: 'Gold', count: specData?.gold || 0, color: '#f59e0b', popular: (specData?.gold || 0) >= (specData?.silver || 0) && (specData?.gold || 0) >= (specData?.platinum || 0) && (specData?.gold || 0) > 0 },
                    { name: 'Silver', count: specData?.silver || 0, color: '#94a3b8', popular: (specData?.silver || 0) > (specData?.gold || 0) && (specData?.silver || 0) >= (specData?.platinum || 0) && (specData?.silver || 0) > 0 },
                    { name: 'Platinum', count: specData?.platinum || 0, color: '#6a11cb', popular: (specData?.platinum || 0) > (specData?.gold || 0) && (specData?.platinum || 0) > (specData?.silver || 0) && (specData?.platinum || 0) > 0 }
                ] : backendBreakdown.map(b => ({
                    name: b.name || 'Standard',
                    count: b.count || b.sales || 0,
                    color: b.color || '#6a11cb',
                    popular: false
                }));

                const normalized = {
                    ...raw,
                    totalTickets: specData?.totalTickets || raw?.totalTickets || 0,
                    totalRevenue: specData?.totalRevenue || raw?.totalRevenue || 0,
                    mostSold: raw?.mostSold || 'N/A',
                    status: raw?.status || 'Active',
                    breakdown: realBreakdown,
                    chartData: Array.isArray(raw?.chartData) ? raw.chartData : []
                };
                setStats(normalized);
            }
            
            if (bookingsRes?.data?.success) {
                setBookings(Array.isArray(bookingsRes?.data?.data) ? bookingsRes.data.data : []);
            }
            
            setError(null);
        } catch (err) {
            console.error('Telemetric aggregation failure:', err);
            setError('SYNC DISRUPTED: CHECKING NODE CONNECTIVITY');
        } finally {
            setLoading(false);
        }
    }, [eventId, organizerId]);

    // Polling Protocol (10s) - reduced frequency for stability
    useEffect(() => {
        let failureCount = 0;
        const maxFailures = 3;

        const sync = async () => {
            try {
                await fetchAnalytics();
                failureCount = 0; // Reset on success
            } catch (err) {
                failureCount++;
                if (failureCount >= maxFailures) {
                    console.error('🛑 [TELEMETRY_HALTED]: Persistent node synchronization failure. Stopping polling.');
                    clearInterval(interval);
                }
            }
        };

        sync();
        const interval = setInterval(sync, 10000);
        return () => clearInterval(interval);
    }, [eventId, organizerId, fetchAnalytics]);

    const chartData = useMemo(() => {
        const rawChart = Array.isArray(stats?.chartData) ? stats.chartData : 
                        (Array.isArray(stats?.breakdown) ? stats.breakdown : []);
        return rawChart.map(item => ({
            name: item?.name || 'Unknown',
            value: item?.count || item?.sales || 0
        }));
    }, [stats]);

    // Fallback constants to prevent render crashes
    const displayStats = useMemo(() => stats || {
        totalTickets: 0,
        totalRevenue: 0,
        mostSold: 'N/A',
        status: 'Offline',
        breakdown: []
    }, [stats]);

    if (error && !stats) {
        return (
            <div className="text-center py-5">
                <Badge bg="warning" text="dark" className="p-3 shadow-lg fs-6 fw-black mb-3">TELEMETRY OFFLINE</Badge>
                <div className="text-danger small fw-bold">CAUSE: {error}</div>
                <p className="text-soft-purple mt-3">Re-establishing connection to analytics node...</p>
            </div>
        );
    }

    if (!loading && !stats && !bookings.length) {
        return (
            <div className="text-center py-5">
                <Badge bg="danger" className="p-3 shadow-lg fs-6 fw-black">NO ANALYTICS DATA DETECTED IN NODE</Badge>
                <p className="text-soft-purple mt-3">Ensure you have active bookings or checking connection...</p>
            </div>
        );
    }

    return (
        <div className="organizer-analytics-section mt-4 pt-4 border-top border-muted">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-black m-0 d-flex align-items-center gap-2">
                    <FaChartLine className="text-primary" /> Event Analytics
                </h5>
                <div className="d-flex align-items-center gap-3">
                    {loading && <Spinner animation="grow" size="sm" variant="primary" className="opacity-50" />}
                    {error && (
                        <Badge bg="warning" text="dark" className="px-2 py-1 x-small fw-black animate-pulse">
                            SYNC LAG: RETRYING...
                        </Badge>
                    )}
                    <div className="d-flex align-items-center gap-2">
                        <div className={`pulse-dot ${error ? 'bg-warning' : 'bg-success'}`}></div>
                        <span className="text-muted x-small fw-bold">{error ? 'SYNC INTERRUPTED' : 'LIVE SYNC ACTIVE'}</span>
                    </div>
                </div>
            </div>

            {/* 1. Stats Cards */}
            <Row className="g-3 mb-4">
                {[
                    { title: 'Total Tickets Sold', value: displayStats.totalTickets, icon: <FaTicketAlt />, color: '#6a11cb' },
                    { title: 'Total Revenue', value: formatCurrency(displayStats.totalRevenue), icon: <FaMoneyBillWave />, color: '#2575fc' },
                    { title: 'Most Sold', value: displayStats.mostSold, icon: <FaStar />, color: '#f59e0b' },
                    { title: 'Pulse Status', value: displayStats.status, icon: <FaClock />, color: '#10b981' }
                ].map((stat, idx) => (
                    <Col xs={12} sm={6} lg={3} key={idx} className="mb-3 mb-lg-0">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="card-ui"
                            style={{ '--accent-color': stat.color }}
                        >
                            <div className="icon-badge">{stat.icon}</div>
                            <div className="mt-3">
                                <div className="small opacity-50 fw-bold text-uppercase tracking-wider">{stat.title}</div>
                                <div className="h4 fw-black m-0 mt-1">{stat.value}</div>
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Row className="g-4">
                {/* 2. Category Breakdown */}
                <Col lg={6}>
                    <Card className="card-ui p-4 h-100">
                        <h6 className="fw-bold mb-4">Ticket Distribution</h6>
                        <div className="d-flex flex-column gap-4">
                            {(displayStats.breakdown || []).map((item, idx) => (
                                <div key={idx} className={`category-progress-item ${item.popular ? 'is-popular' : ''}`}>
                                    <div className="d-flex justify-content-between mb-2 align-items-center">
                                        <span className="fw-bold d-flex align-items-center gap-2">
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                            {item.name}
                                            {item.popular && <Badge bg="warning" className="text-dark x-small ms-2">Most Popular 🔥</Badge>}
                                        </span>
                                        <span className="text-soft-purple fw-black">{item.count} Sold</span>
                                    </div>
                                    <ProgressBar 
                                        now={totalCapacity > 0 ? (item.count / totalCapacity) * 100 : 0} 
                                        className="custom-bar" 
                                        style={{ '--bar-color': item.color }} 
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                {/* 3. Bar Chart */}
                <Col lg={6}>
                    <Card className="card-ui p-4 h-100">
                        <h6 className="fw-bold mb-4">Sales Visualization</h6>
                        <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={0}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{ fill: 'var(--bg-hover)' }} 
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={(displayStats.breakdown[index] || {}).color || '#6a11cb'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* 4. Recent Bookings */}
                <Col lg={12}>
                    <Card className="card-ui overflow-hidden p-0">
                        <div className="p-4 bg-light d-flex justify-content-between align-items-center">
                            <h6 className="fw-bold m-0 text-dark"><FaHistory className="me-2 opacity-50" /> Recent Bookings</h6>
                            <Badge bg="primary-subtle" className="text-primary fw-black">REAL-TIME FEED</Badge>
                        </div>
                        <Table responsive hover className="m-0 align-middle">
                            <thead className="bg-light">
                                <tr className="x-small text-muted text-uppercase tracking-widest">
                                    <th className="py-3 px-4">Attendee</th>
                                    <th className="py-3">Type</th>
                                    <th className="py-3">Amount</th>
                                    <th className="py-3 px-4 text-end">Time</th>
                                </tr>
                            </thead>
                             <tbody>
                                {bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5 text-muted">No successful bookings detected in this node yet.</td>
                                    </tr>
                                ) : (
                                    bookings.map(booking => (
                                        <tr key={booking.id} className="border-bottom border-dark/5">
                                            <td className="py-3 px-4">
                                                <div className="fw-bold text-dark">{booking.name}</div>
                                            </td>
                                            <td className="py-3">
                                                <Badge style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', color: '#000' }}>{booking.type}</Badge>
                                            </td>
                                            <td className="py-3 fw-black text-primary">{formatCurrency(booking.amount)}</td>
                                            <td className="py-3 px-4 text-end text-muted small">
                                                {new Date(booking.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .icon-badge {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--accent-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white !important;
                    font-size: 0.9rem;
                }
                .custom-bar {
                    height: 6px;
                    background: #f1f5f9;
                    border-radius: 100px;
                    overflow: visible;
                }
                .custom-bar .progress-bar {
                    background: var(--bar-color);
                    border-radius: 100px;
                }
                .category-progress-item.is-popular {
                    padding: 12px;
                    background: var(--primary-shadow);
                    border: 1px solid var(--primary);
                    border-radius: 12px;
                }
                .x-small { font-size: 0.65rem; }
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
            `}</style>
        </div>
    );
};

export default memo(OrganizerAnalytics);
