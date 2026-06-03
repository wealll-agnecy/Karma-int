import { useState, useEffect } from 'react';
import { Container, Table, Badge, Spinner, Alert, Card, Row, Col, Button, Modal } from 'react-bootstrap';
import apiClient from '../api/apiClient';
import { FaTicketAlt, FaWallet, FaCheckCircle, FaExclamationCircle, FaEye, FaFileExcel, FaArrowUp, FaFilter, FaCalendarDay } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import '../css/dashboard.css';
import { formatCurrency } from '../utils/formatUtils';

/* ─── Design Tokens ─────────────────────────────── */
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
        padding: '28px',
    },
    metricCard: (accent) => ({
        background: 'rgba(255,255,255,0.97)',
        border: `1.5px solid ${accent}22`,
        borderRadius: '22px',
        boxShadow: `0 8px 28px ${accent}10`,
        transition: 'all .3s ease',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
    }),
    label: {
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.13em',
        textTransform: 'uppercase',
        color: '#9ca3af',
        display: 'block',
        marginBottom: '8px',
    },
    value: {
        fontSize: '2rem',
        fontWeight: 800,
        letterSpacing: '-1.5px',
        lineHeight: 1,
        color: '#111827',
    },
    filterPill: (active) => ({
        borderRadius: '999px',
        padding: '8px 20px',
        fontWeight: 600,
        fontSize: '0.78rem',
        border: active ? 'none' : '1.5px solid #ede8f4',
        background: active ? 'linear-gradient(135deg,#d946ef,#8b5cf6)' : 'transparent',
        color: active ? '#fff' : '#6b7280',
        boxShadow: active ? '0 4px 14px rgba(139,92,246,.25)' : 'none',
        cursor: 'pointer',
        transition: 'all .2s ease',
        whiteSpace: 'nowrap',
    }),
    exportBtn: {
        background: 'linear-gradient(135deg,#10b981,#059669)',
        border: 'none',
        borderRadius: '14px',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.8rem',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 6px 20px rgba(16,185,129,.25)',
        cursor: 'pointer',
        transition: 'transform .2s, box-shadow .2s',
    },
    sectionTitle: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#1e1b2e',
        letterSpacing: '-0.3px',
        margin: 0,
    },
};

const statusBadge = (isPaid) => ({
    display: 'inline-block',
    borderRadius: '999px',
    padding: '5px 14px',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    background: isPaid ? '#dcfce7' : '#fef9c3',
    color: isPaid ? '#15803d' : '#92400e',
});

const OrganizerBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [packageFilter, setPackageFilter] = useState('all');

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await apiClient.get('/api/v1/organizer/bookings');
                setBookings(res.data.data);
            } catch (err) {
                setError('Failed to load bookings.');
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const handleExportExcel = () => {
        const data = bookings.map(booking => ({
            'Attendee Name': booking.user?.name || 'Unknown',
            'Email': booking.user?.email || 'N/A',
            'Event Name': booking.event?.title || 'N/A',
            'Event Date': new Date(booking.event?.date).toLocaleDateString(),
            'Total Amount': booking.totalAmount,
            'Amount Paid': booking.amountPaid || 0,
            'Pending Dues': booking.totalAmount - (booking.amountPaid || 0)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bookings");
        XLSX.writeFile(wb, `Bookings.xlsx`);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: '#fdf7ff' }}>
                <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
            </div>
        );
    }

    const totalExpected = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalCollected = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    const totalPending = totalExpected - totalCollected;

    const packageStats = {};
    bookings.forEach(b => {
        const type = b.ticketType || 'Standard';
        if (!packageStats[type]) packageStats[type] = { count: 0, revenue: 0 };
        packageStats[type].count += (b.quantity || b.attendeeDetails?.length || 1);
        packageStats[type].revenue += b.totalAmount;
    });

    const filteredBookings = bookings.filter(b => {
        const isPaid = (b.amountPaid || 0) >= b.totalAmount;
        let matchesFilter = true;
        if (filter === 'completed') matchesFilter = isPaid;
        else if (filter === 'pending') matchesFilter = !isPaid;

        let matchesDate = true;
        if (selectedDate && b.createdAt) {
            matchesDate = new Date(b.createdAt).toISOString().split('T')[0] === selectedDate;
        }

        const matchesPackage = packageFilter === 'all' || (b.ticketType || 'Standard') === packageFilter;

        return matchesFilter && matchesDate && matchesPackage;
    });

    return (
        <div style={S.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>

                {/* ─── Header ─── */}
                <div style={{ padding: '40px 0 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>
                                Booking Management
                            </div>
                            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>
                                Attendee Bookings
                            </h1>
                            <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>
                                Monitor ticket sales and payment collection status.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '14px', padding: '10px 16px', boxShadow: '0 4px 16px rgba(100,60,180,0.06)' }}>
                                <FaCalendarDay color="#9ca3af" size={13} />
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                    style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: '#374151', background: 'transparent' }} />
                                {selectedDate && <button onClick={() => setSelectedDate('')} style={{background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0}}>Clear</button>}
                            </div>
                            <button style={S.exportBtn} onClick={handleExportExcel}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(16,185,129,.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,.25)'; }}
                            >
                                <FaFileExcel /> <span className="d-none d-md-inline">Export Excel</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Metric Cards (Desktop) ─── */}
                <div className="d-none d-md-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                    {[
                        { id: 'gross', label: 'Gross Sales', value: formatCurrency(totalExpected), accent: '#8b5cf6', icon: <FaWallet /> },
                        { id: 'collected', label: 'Collected', value: formatCurrency(totalCollected), accent: '#10b981', icon: <FaCheckCircle /> },
                        { id: 'pending', label: 'Pending Dues', value: formatCurrency(totalPending), accent: '#f59e0b', icon: <FaExclamationCircle /> },
                        ...Object.entries(packageStats).map(([type, stats], i) => ({
                            id: `pkg-${type}`,
                            isPackage: true,
                            type: type,
                            label: type,
                            value: `${stats.count} Sold`,
                            subValue: formatCurrency(stats.revenue),
                            accent: i % 2 === 0 ? '#3b82f6' : '#ec4899',
                            icon: <FaTicketAlt />
                        }))
                    ].map((m, i) => (
                        <div key={i} 
                            onClick={() => m.isPackage ? setPackageFilter(packageFilter === m.type ? 'all' : m.type) : null}
                            style={{
                                ...S.metricCard(m.accent),
                                cursor: m.isPackage ? 'pointer' : 'default',
                                border: packageFilter === m.type ? `2px solid ${m.accent}` : `1.5px solid ${m.accent}22`,
                                transform: packageFilter === m.type ? 'translateY(-4px)' : 'none',
                                boxShadow: packageFilter === m.type ? `0 16px 40px ${m.accent}30` : `0 8px 28px ${m.accent}10`
                            }}
                            onMouseEnter={e => { if (packageFilter !== m.type) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${m.accent}20`; } }}
                            onMouseLeave={e => { if (packageFilter !== m.type) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 28px ${m.accent}10`; } }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle, ${m.accent}20, transparent 70%)` }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <span style={{...S.label, color: packageFilter === m.type ? m.accent : '#9ca3af'}}>{m.label}</span>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: packageFilter === m.type ? m.accent : `${m.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: packageFilter === m.type ? '#fff' : m.accent, fontSize: '0.9rem' }}>
                                    {m.icon}
                                </div>
                            </div>
                            <div style={S.value}>{m.value}</div>
                            {m.subValue && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px', fontWeight: 600 }}>Rev: {m.subValue}</div>}
                        </div>
                    ))}
                </div>

                {/* ─── Mobile Metric Cards ─── */}
                <div className="d-md-none" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '18px' }}>
                    {[
                        { label: 'Gross Sales', value: formatCurrency(totalExpected) },
                        { label: 'Collected', value: formatCurrency(totalCollected) },
                        { label: 'Pending', value: formatCurrency(totalPending) },
                        ...Object.entries(packageStats).map(([type, stats]) => ({
                            label: type, value: `${stats.count} Sold`, isPackage: true, type: type
                        }))
                    ].map((m, i) => (
                        <div key={i} 
                            onClick={() => m.isPackage ? setPackageFilter(packageFilter === m.type ? 'all' : m.type) : null}
                            style={{ 
                                ...S.card, padding: '12px 10px', textAlign: 'center', borderRadius: '16px',
                                border: packageFilter === m.type ? '2px solid #3b82f6' : '1px solid #ede8f4',
                                background: packageFilter === m.type ? '#eff6ff' : 'rgba(255,255,255,0.97)',
                                gridColumn: (i === 0 && Object.keys(packageStats).length % 2 === 0) ? 'span 2' : 'span 1'
                            }}>
                            <div style={{ ...S.label, fontSize: '0.52rem', marginBottom: '6px', color: packageFilter === m.type ? '#3b82f6' : '#9ca3af' }}>{m.label}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-0.5px' }}>{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* ─── Filter Pills ─── */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: 'All Bookings' },
                        { key: 'pending', label: 'Pending Dues' },
                        { key: 'completed', label: 'Completed' },
                    ].map(f => (
                        <button
                            key={f.key}
                            style={S.filterPill(filter === f.key)}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9ca3af', alignSelf: 'center', fontWeight: 600 }}>
                        {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
                    </span>
                </div>

                {error && <Alert variant="danger" style={{ borderRadius: '14px' }}>{error}</Alert>}

                {/* ─── Desktop Table ─── */}
                <div className="d-none d-lg-block mb-5">
                    <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                        <Table className="m-0 align-middle" style={{ marginBottom: 0 }}>
                            <thead>
                                <tr style={{ background: '#f8f7fc', borderBottom: '1.5px solid #ede8f4' }}>
                                    {['Attendee', 'Event', 'Booking Date', 'Payment Progress', 'Status', 'Total Amount'].map((h, i) => (
                                        <th key={i} style={{
                                            padding: '16px 20px',
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.12em',
                                            color: '#9ca3af',
                                            border: 'none',
                                            textAlign: i === 5 ? 'right' : 'left',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.map((booking) => {
                                    const paidAmount = booking.amountPaid || 0;
                                    const totalAmount = booking.totalAmount || 1;
                                    const progress = Math.min((paidAmount / totalAmount) * 100, 100);
                                    const isPaid = paidAmount >= totalAmount;

                                    return (
                                        <tr key={booking._id}
                                            style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Attendee */}
                                            <td style={{ padding: '16px 20px', border: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '38px', height: '38px', borderRadius: '12px',
                                                        background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 800, fontSize: '0.85rem', color: '#6d28d9', flexShrink: 0
                                                    }}>
                                                        {(booking.user?.name || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.88rem' }}>{booking.user?.name || 'Unknown'}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{booking.user?.email}</div>
                                                    </div>
                                                    <button
                                                        style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '9px', color: '#8b5cf6', padding: '5px 8px', cursor: 'pointer', marginLeft: '4px', transition: 'all .2s' }}
                                                        onClick={() => { setSelectedBooking(booking); setShowModal(true); }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ede8f4'; }}
                                                    >
                                                        <FaEye size={13} />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Event */}
                                            <td style={{ padding: '16px 20px', border: 'none' }}>
                                                <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>{booking.event?.title}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{new Date(booking.event?.date).toLocaleDateString()}</div>
                                            </td>

                                            {/* Booking Date */}
                                            <td style={{ padding: '16px 20px', border: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
                                                    <FaCalendarDay size={12} color="#ec4899" />
                                                    {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                </div>
                                            </td>

                                            {/* Progress */}
                                            <td style={{ padding: '16px 20px', border: 'none', minWidth: '190px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>{formatCurrency(paidAmount)} paid</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(totalAmount - paidAmount)} due</span>
                                                </div>
                                                <div style={{ height: '7px', borderRadius: '999px', background: '#f3f4f6', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${progress}%`,
                                                        height: '100%',
                                                        borderRadius: '999px',
                                                        background: isPaid
                                                            ? 'linear-gradient(90deg,#10b981,#059669)'
                                                            : 'linear-gradient(90deg,#f59e0b,#d97706)',
                                                        transition: 'width .5s ease',
                                                    }} />
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '16px 20px', border: 'none' }}>
                                                <span style={statusBadge(isPaid)}>
                                                    {isPaid ? 'Paid' : 'Partial'}
                                                </span>
                                            </td>

                                            {/* Total */}
                                            <td style={{ padding: '16px 20px', border: 'none', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#1e1b2e', letterSpacing: '-0.5px' }}>
                                                {formatCurrency(booking.totalAmount)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredBookings.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '0.88rem', border: 'none' }}>
                                            No bookings matched the selected filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </div>

                {/* ─── Mobile Cards ─── */}
                <div className="d-lg-none d-flex flex-column gap-3 mb-5">
                    {filteredBookings.map((booking) => {
                        const paidAmount = booking.amountPaid || 0;
                        const totalAmount = booking.totalAmount || 1;
                        const progress = Math.min((paidAmount / totalAmount) * 100, 100);
                        const isPaid = paidAmount >= totalAmount;

                        return (
                            <div key={booking._id} style={{ ...S.card, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                                {/* Accent top stripe */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                                    background: isPaid
                                        ? 'linear-gradient(90deg,#10b981,#059669)'
                                        : 'linear-gradient(90deg,#d946ef,#8b5cf6)',
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px',
                                            background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '0.9rem', color: '#6d28d9',
                                        }}>
                                            {(booking.user?.name || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{booking.user?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{booking.user?.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '9px', color: '#8b5cf6', padding: '5px 8px', cursor: 'pointer' }}
                                            onClick={() => { setSelectedBooking(booking); setShowModal(true); }}
                                        >
                                            <FaEye size={13} />
                                        </button>
                                        <span style={statusBadge(isPaid)}>{isPaid ? 'Paid' : 'Partial'}</span>
                                    </div>
                                </div>

                                <div style={{ background: '#f8f7fc', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Event</div>
                                    <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem' }}>{booking.event?.title}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>
                                        {new Date(booking.event?.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FaCalendarDay size={10} color="#ec4899" /> 
                                        Booked on: {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>{formatCurrency(paidAmount)} paid</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(totalAmount - paidAmount)} due</span>
                                    </div>
                                    <div style={{ height: '8px', borderRadius: '999px', background: '#f3f4f6', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${progress}%`,
                                            height: '100%',
                                            borderRadius: '999px',
                                            background: isPaid
                                                ? 'linear-gradient(90deg,#10b981,#059669)'
                                                : 'linear-gradient(90deg,#f59e0b,#d97706)',
                                        }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600 }}>Total Expected</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-0.5px' }}>{formatCurrency(booking.totalAmount)}</span>
                                </div>
                            </div>
                        );
                    })}
                    {filteredBookings.length === 0 && (
                        <div style={{ ...S.card, textAlign: 'center', padding: '50px 24px', color: '#9ca3af', fontSize: '0.88rem' }}>
                            No bookings matched the selected filter.
                        </div>
                    )}
                </div>

                {/* ─── Attendee Details Modal ─── */}
                <Modal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    centered
                    size="lg"
                    className="premium-details-modal"
                >
                    <Modal.Header closeButton style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 28px' }}>
                        <Modal.Title style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e1b2e' }}>
                            Booking Details Summary
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto', padding: '28px' }}>
                        {selectedBooking && (
                            <div>
                                {/* Section 1: Primary Attendee Info */}
                                <div className="mb-4">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Primary Attendee</h6>
                                    <Row className="g-3">
                                        <Col md={4}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Full Name</div>
                                                <div className="fw-bold">{selectedBooking.attendeeName}</div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Email Address</div>
                                                <div className="fw-bold text-truncate">{selectedBooking.email}</div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Phone Number</div>
                                                <div className="fw-bold">{selectedBooking.phone || 'N/A'}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Section 2: Booking Info */}
                                <div className="mb-4 border-top pt-4">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Booking & Plan Information</h6>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Event Name</div>
                                                <div className="fw-bold text-pink">{selectedBooking.eventName}</div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Plan Type</div>
                                                <div className="fw-bold">{selectedBooking.ticketTier}</div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="p-3 border rounded-3 bg-light">
                                                <div className="text-muted small">Tickets Booked</div>
                                                <div className="fw-black text-primary fs-5">
                                                    {selectedBooking.bookedQuantity || 1} Ticket(s)
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Section 3: Group Members */}
                                <div className="mb-4 border-top pt-4">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Group Members ({selectedBooking.attendeeDetails?.length || 0})</h6>
                                    {selectedBooking.attendeeDetails && selectedBooking.attendeeDetails.length > 0 ? (
                                        <div className="table-responsive border rounded-3">
                                            <Table hover className="m-0 align-middle">
                                                <thead className="bg-light">
                                                    <tr className="small text-uppercase fw-bold text-slate">
                                                        <th className="px-3 py-2">#</th>
                                                        <th className="py-2">Member Name</th>
                                                        <th className="py-2">Phone / Contact</th>
                                                        <th className="px-3 py-2">Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedBooking.attendeeDetails.map((member, index) => (
                                                        <tr key={index}>
                                                            <td className="px-3 py-2 text-muted small">{index + 1}</td>
                                                            <td className="py-2 fw-bold">{member.name}</td>
                                                            <td className="py-2">{member.phone || 'N/A'}</td>
                                                            <td className="px-3 py-2 text-muted small">{member.email || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-3 text-muted border rounded-3 bg-light-subtle small">
                                            No secondary group members added. Single ticket booking.
                                        </div>
                                    )}
                                </div>

                                {/* Section 4: Food & Addons */}
                                {((selectedBooking.selectedFood && selectedBooking.selectedFood.length > 0) ||
                                    (selectedBooking.selectedAddons && selectedBooking.selectedAddons.length > 0)) && (
                                        <div className="mb-4 border-top pt-4">
                                            <Row>
                                                {selectedBooking.selectedFood && selectedBooking.selectedFood.length > 0 && (
                                                    <Col md={selectedBooking.selectedAddons && selectedBooking.selectedAddons.length > 0 ? 6 : 12}>
                                                        <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Food Orders</h6>
                                                        <div className="table-responsive border rounded-3">
                                                            <Table hover className="m-0 align-middle small">
                                                                <thead className="bg-light">
                                                                    <tr>
                                                                        <th className="px-3 py-2">Item</th>
                                                                        <th className="py-2">Type</th>
                                                                        <th className="px-3 py-2 text-end">Qty</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedBooking.selectedFood.map((food, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="px-3 py-2 fw-bold">{food.itemName}</td>
                                                                            <td className="py-2"><Badge bg={food.type === 'veg' ? 'success' : 'danger'}>{food.type}</Badge></td>
                                                                            <td className="px-3 py-2 text-end">{food.quantity}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </Table>
                                                        </div>
                                                    </Col>
                                                )}
                                                {selectedBooking.selectedAddons && selectedBooking.selectedAddons.length > 0 && (
                                                    <Col md={selectedBooking.selectedFood && selectedBooking.selectedFood.length > 0 ? 6 : 12}>
                                                        <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Addons / Goodies</h6>
                                                        <div className="table-responsive border rounded-3">
                                                            <Table hover className="m-0 align-middle small">
                                                                <thead className="bg-light">
                                                                    <tr>
                                                                        <th className="px-3 py-2">Item</th>
                                                                        <th className="px-3 py-2 text-end">Qty</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedBooking.selectedAddons.map((addon, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="px-3 py-2 fw-bold">{addon.itemName}</td>
                                                                            <td className="px-3 py-2 text-end">{addon.quantity}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </Table>
                                                        </div>
                                                    </Col>
                                                )}
                                            </Row>
                                        </div>
                                    )}

                                {/* Section 5: Financial Summary */}
                                <div className="border-top pt-4 mb-2">
                                    <h6 className="text-uppercase text-muted fw-bold small mb-3" style={{ letterSpacing: '1px' }}>Payment Summary</h6>
                                    <div style={{ background: 'linear-gradient(135deg,#f8f7fc,#f5f3ff)', borderRadius: '16px', padding: '20px', border: '1.5px solid #ede8f4' }}>
                                        <Row className="g-3 text-center align-items-center mb-3">
                                            <Col xs={12} sm={4} className="py-2">
                                                <div className="text-muted small">Total Cost</div>
                                                <div className="fw-bold fs-5 text-dark">{formatCurrency(selectedBooking.totalAmount)}</div>
                                            </Col>
                                            <Col xs={12} sm={4} className="py-2 border-sm-start border-sm-end border-top-mobile border-bottom-mobile">
                                                <div className="text-muted small">Amount Paid</div>
                                                <div className="fw-bold fs-5 text-success">{formatCurrency(selectedBooking.amountPaid)}</div>
                                            </Col>
                                            <Col xs={12} sm={4} className="py-2">
                                                <div className="text-muted small">Outstanding Balance</div>
                                                <div className={`fw-bold fs-5 ${selectedBooking.remainingAmount > 0 ? 'text-danger' : 'text-slate'}`}>
                                                    {formatCurrency(selectedBooking.remainingAmount)}
                                                </div>
                                            </Col>
                                        </Row>

                                        {selectedBooking.verifiedPayment && (
                                            <div className="border-top pt-3 mt-2 text-start">
                                                <h6 className="text-muted fw-bold small mb-2"><FaCheckCircle className="text-success me-1" /> Verified Transaction Details</h6>
                                                <Row className="g-2 small">
                                                    <Col sm={6}>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Payment Status</div>
                                                        <div className="fw-bold text-success">{selectedBooking.verifiedPayment.status}</div>
                                                    </Col>
                                                    <Col sm={6}>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Payment Date</div>
                                                        <div className="fw-bold">{new Date(selectedBooking.verifiedPayment.paidAt || selectedBooking.verifiedPayment.createdAt).toLocaleString()}</div>
                                                    </Col>
                                                    <Col sm={6}>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Amount</div>
                                                        <div className="fw-bold">{formatCurrency((selectedBooking.verifiedPayment.amount || 0) / 100)} {selectedBooking.verifiedPayment.currency}</div>
                                                    </Col>
                                                    <Col sm={6}>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Payment Method</div>
                                                        <div className="fw-bold">{selectedBooking.verifiedPayment.paymentMethod || 'N/A'}</div>
                                                    </Col>
                                                    <Col sm={6}>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Payment ID</div>
                                                        <div className="fw-bold text-break font-monospace" style={{ fontSize: '0.8rem' }}>{selectedBooking.verifiedPayment.paymentId || 'N/A'}</div>
                                                    </Col>
                                                    <Col sm={6}>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Transaction ID</div>
                                                        <div className="fw-bold text-break font-monospace" style={{ fontSize: '0.8rem' }}>{selectedBooking.verifiedPayment.transactionId || 'N/A'}</div>
                                                    </Col>
                                                </Row>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer style={{ borderTop: '1px solid #f3f4f6', padding: '16px 28px' }}>
                        <Button
                            style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', fontWeight: 600, padding: '10px 24px' }}
                            onClick={() => setShowModal(false)}
                        >
                            Close Details
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default OrganizerBookings;
