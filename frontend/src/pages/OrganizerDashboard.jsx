import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import * as eventApi from '../api/eventApi';
import * as analyticsApi from '../api/analyticsApi';
import apiClient from '../api/apiClient';
import { RevenueChart, TicketDistributionChart } from '../components/analytics/DashboardCharts';
import DashboardSkeleton from '../components/analytics/DashboardSkeleton';

import {
    FaCalendarAlt, FaTicketAlt, FaWallet, FaBolt, FaEye, FaEdit, FaTrash
} from 'react-icons/fa';
import '../css/dashboard.css';
import '../css/global.css';
import { formatCurrency } from '../utils/formatUtils';
import EventLandingEditor from '../components/events/EventLandingEditor';


const OrganizerDashboard = () => {
    const [stats, setStats] = useState({ totalEvents: 0, approvedEvents: 0, totalTicketsSold: 0, totalRevenue: 0 });
    const [revenueData, setRevenueData] = useState({ totalRevenue: 0, totalEvents: 0 });
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedEventToEdit, setSelectedEventToEdit] = useState(null);

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
            setEvents((eventsRes.data?.data || []).slice(0, 5)); // recent 5 events
        } catch (err) {
            console.error('Failed to load organizer dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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



    if (loading) {
        return <DashboardSkeleton />;
    }

    const netProfit = revenueData?.totalRevenue || 0;

    const calculatedProfit = (Number(calcRevenue) || 0) - (Number(calcExpenses) || 0);
    const isLoss = calculatedProfit < 0;

    const calculateDays = (start, end) => {
        if (!start || !end) return 1;
        const diff = new Date(end) - new Date(start);
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="dashboard-page" style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #f3e8ff 100%)' }}>
            <Container fluid className="px-md-5">
                {/* ─── Header ─── */}
                <div className="dashboard-header mt-5 d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
                    <div>
                        <h2 className="dashboard-title-main">Dashboard</h2>
                        <p className="dashboard-subtext">Manage your events, view analytics, and control your enterprise.</p>
                    </div>
                </div>

                {/* ─── Stats Grid (Desktop) ─── */}
                <div className="stats-grid-saas mb-5 d-none d-md-grid">
                    <div className="dashboard-card shadow-sm">
                        <span className="card-title-sm">Total Events</span>
                        <h3 className="card-value-lg">{stats?.totalEvents || 0}</h3>
                        <div className="mt-2 text-slate small fw-bold">All Time</div>
                    </div>
                    <div className="dashboard-card shadow-sm">
                        <span className="card-title-sm">Upcoming Events</span>
                        <h3 className="card-value-lg">{stats?.approvedEvents || 0}</h3>
                        <div className="mt-2 text-success small fw-bold">Live & Approved</div>
                    </div>
                    <div className="dashboard-card shadow-sm">
                        <span className="card-title-sm">Tickets Sold</span>
                        <h3 className="card-value-lg">{(stats?.totalTicketsSold || 0).toLocaleString()}</h3>
                        <div className="mt-2 text-slate small fw-bold">Total Sales</div>
                    </div>
                    <div className="dashboard-card shadow-sm">
                        <span className="card-title-sm">Completed Events</span>
                        <h3 className="card-value-lg">{revenueData?.totalEvents || 0}</h3>
                        <div className="mt-2 text-slate small fw-bold">Past Events History</div>
                    </div>
                </div>

                {/* --- MOBILE STATS (4 cards strictly in one line) --- */}
                <div className="d-md-none w-100 mb-4 pb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    <div className="dashboard-card shadow-sm m-0" style={{ padding: '6px 2px', textAlign: 'center', overflow: 'hidden' }}>
                        <div className="card-title-sm mb-1" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total</div>
                        <div className="card-value-lg fw-bold" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{stats?.totalEvents || 0}</div>
                        <div className="mt-1 text-slate" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>All Time</div>
                    </div>
                    <div className="dashboard-card shadow-sm m-0" style={{ padding: '6px 2px', textAlign: 'center', overflow: 'hidden' }}>
                        <div className="card-title-sm mb-1" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Upcoming</div>
                        <div className="card-value-lg fw-bold text-success" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{stats?.approvedEvents || 0}</div>
                        <div className="mt-1 text-success" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Live</div>
                    </div>
                    <div className="dashboard-card shadow-sm m-0" style={{ padding: '6px 2px', textAlign: 'center', overflow: 'hidden' }}>
                        <div className="card-title-sm mb-1" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tickets</div>
                        <div className="card-value-lg fw-bold" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{(stats?.totalTicketsSold || 0).toLocaleString()}</div>
                        <div className="mt-1 text-slate" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Sales</div>
                    </div>
                    <div className="dashboard-card shadow-sm m-0" style={{ padding: '6px 2px', textAlign: 'center', overflow: 'hidden' }}>
                        <div className="card-title-sm mb-1" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Completed</div>
                        <div className="card-value-lg fw-bold text-secondary" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{revenueData?.totalEvents || 0}</div>
                        <div className="mt-1 text-slate" style={{ fontSize: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>History</div>
                    </div>
                </div>

                {/* ─── Middle Section ─── */}
                <Row className="g-4 mb-5">
                    {/* Left: Earnings Summary */}
                    <Col lg={4}>
                        <div className="dashboard-card highlight-card d-flex flex-column justify-content-between h-100">
                            <div>
                                <span className="card-title-sm opacity-75">Net Profit</span>
                                <h2 className="card-value-lg my-2">
                                    {formatCurrency(netProfit)}
                                </h2>
                                <p className="small opacity-75 m-0 mb-4">Finalized Earnings</p>
                            </div>
                            <div className="pt-4 border-top border-white/20">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="small opacity-80">Gross Revenue:</span>
                                    <span className="fw-bold">{formatCurrency(stats?.totalRevenue)}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="small opacity-80">Monthly Avg:</span>
                                    <span className="fw-bold">{formatCurrency(Math.round((stats?.totalRevenue || 0) / 12))}</span>
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Right: Profit & Loss Calculator */}
                    <Col lg={8}>
                        <div className="dashboard-card h-100 d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="dashboard-title-main" style={{ fontSize: '1.25rem' }}>Profit & Loss Calculator</h5>
                                <Badge bg="light" text="dark" className="border text-uppercase" style={{ fontSize: '0.65rem' }}>tools</Badge>
                            </div>

                            <Row className="g-4 mb-4">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-slate mb-2">Expected Revenue</Form.Label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0 text-muted">₹</span>
                                            <Form.Control
                                                type="number"
                                                placeholder="0.00"
                                                value={calcRevenue}
                                                onChange={(e) => setCalcRevenue(e.target.value)}
                                                className="border-start-0 ps-0 shadow-none"
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-slate mb-2">Estimated Expenses</Form.Label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0 text-muted">₹</span>
                                            <Form.Control
                                                type="number"
                                                placeholder="0.00"
                                                value={calcExpenses}
                                                onChange={(e) => setCalcExpenses(e.target.value)}
                                                className="border-start-0 ps-0 shadow-none"
                                            />
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <div
                                className="mt-auto p-4 rounded-4 d-flex justify-content-between align-items-center"
                                style={{
                                    backgroundColor: isLoss ? '#fee2e2' : '#f0fdf4',
                                    border: `1px solid ${isLoss ? '#fca5a5' : '#bbf7d0'}`
                                }}
                            >
                                <div>
                                    <h6 className="m-0 mb-1 fw-bold" style={{ color: isLoss ? '#b91c1c' : '#15803d' }}>
                                        {isLoss ? 'Projected Loss' : 'Projected Profit'}
                                    </h6>
                                    <span className="small" style={{ color: isLoss ? '#ef4444' : '#22c55e' }}>Based on your inputs</span>
                                </div>
                                <h3 className="m-0 fw-bold" style={{ color: isLoss ? '#b91c1c' : '#15803d', fontSize: '1.75rem' }}>
                                    {isLoss ? '-' : '+'}{formatCurrency(Math.abs(calculatedProfit))}
                                </h3>
                            </div>
                        </div>
                    </Col>
                </Row>



                {/* ─── Bottom Section ─── */}
                <Row className="g-4 mb-5">
                    {/* Left: My Events List */}
                    <Col lg={7}>
                        <div className="dashboard-card h-100">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="dashboard-title-main" style={{ fontSize: '1.25rem' }}>My Events</h5>
                                <Button as={Link} to="/organizer/events" variant="link" className="text-decoration-none small fw-bold text-pink">View All</Button>
                            </div>
                            <div className="table-responsive rounded-4 border overflow-hidden shadow-sm">
                                <Table hover className="m-0 align-middle text-nowrap">
                                    <thead className="bg-light">
                                        <tr className="small text-uppercase fw-bold text-slate tracking-widest">
                                            <th className="px-4 py-3">Event Name</th>
                                            <th className="text-end px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((ev) => (
                                            <tr key={ev._id} className="border-bottom border-slate-100">
                                                <td className="px-4 py-3 fw-bold text-truncate" style={{ maxWidth: '200px' }}>{ev.title}</td>

                                                <td className="text-end px-4 py-3">
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <Button as={Link} to={`/organizer/event/${ev._id}`} className="btn btn-outline-pink shadow-none p-2" title="View Event Details">
                                                            <FaEye className="text-slate" />
                                                        </Button>
                                                        <Button 
                                                            onClick={(e) => { e.preventDefault(); setSelectedEventToEdit(ev); setEditorOpen(true); }} 
                                                            className="btn btn-pink shadow-none p-2" 
                                                            title="Edit Landing Page"
                                                        >
                                                            <FaEdit className="text-white" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {events.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="text-center py-4 text-muted small">No events found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </Col>

                    {/* Right: Analytics Chart */}
                    <Col lg={5}>
                        <div className="dashboard-card h-100">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="dashboard-title-main" style={{ fontSize: '1.25rem' }}>Platform Analytics</h5>
                            </div>
                            <div className="h-100 pb-4">
                                <RevenueChart data={[
                                    { name: 'Last Qtr', revenue: (stats?.totalRevenue || 0) * 0.4 },
                                    { name: 'Prev Mth', revenue: (stats?.totalRevenue || 0) * 0.7 },
                                    { name: 'Current', revenue: (stats?.totalRevenue || 0) },
                                ]} />
                            </div>
                        </div>
                    </Col>
                </Row>

                {editorOpen && selectedEventToEdit && (
                    <EventLandingEditor 
                        show={editorOpen} 
                        onHide={() => { setEditorOpen(false); setSelectedEventToEdit(null); }} 
                        event={selectedEventToEdit} 
                        onSaveSuccess={fetchData}
                    />
                )}

            </Container>
        </div>
    );
};

export default OrganizerDashboard;
