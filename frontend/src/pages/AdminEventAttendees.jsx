import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Badge, Spinner, Modal, Table } from 'react-bootstrap';
import { FaEnvelope, FaPhone, FaTicketAlt, FaCalendarDay, FaWallet, FaArrowLeft, FaSearch, FaUsers, FaEye, FaFileExcel, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { formatCurrency } from '../utils/formatUtils';
import * as analyticsApi from '../api/analyticsApi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', overflow: 'hidden' },
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
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '8px' },
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

const AdminEventAttendees = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [packageFilter, setPackageFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {
        if (!eventId || eventId === 'undefined') { setLoading(false); return; }
        const fetchAttendees = async () => {
            try {
                const res = await analyticsApi.getEventAttendees(eventId);
                const rawData = res.data?.data || [];
                const flattened = rawData.flatMap(booking => 
                    (booking.attendeeDetails || []).map(attendee => ({
                        ...attendee,
                        ticketType: booking.ticketType || 'N/A',
                        plan: booking.selectedPlans?.label || booking.selectedPlans?.name || 'Standard',
                        totalAmount: booking.totalAmount || 0,
                        amountPaid: booking.amountPaid || 0,
                        paymentStatus: booking.paymentStatus || 'unknown',
                        orderId: booking.orderId || 'N/A',
                        bookingId: booking._id,
                        bookingDate: booking.createdAt,
                        rawBooking: booking
                    }))
                );
                setAttendees(flattened);
            } catch (err) {
                console.error('Error fetching attendees:', err);
                toast.error('Failed to load attendee list');
            } finally { setLoading(false); }
        };
        fetchAttendees();
    }, [eventId]);

    const uniqueBookingsMap = {};
    attendees.forEach(a => {
        if (a.bookingId) {
            uniqueBookingsMap[a.bookingId] = {
                totalAmount: a.totalAmount || 0,
                amountPaid: a.amountPaid || 0,
                ticketType: a.ticketType || 'Standard',
                quantity: a.rawBooking?.quantity || a.rawBooking?.attendeeDetails?.length || 1
            };
        }
    });
    const uniqueBookings = Object.values(uniqueBookingsMap);
    const totalExpected = uniqueBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalCollected = uniqueBookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalPending = Math.max(0, totalExpected - totalCollected);

    const packageStats = {};
    uniqueBookings.forEach(b => {
        const type = b.ticketType;
        if (!packageStats[type]) packageStats[type] = { count: 0, revenue: 0 };
        packageStats[type].count += b.quantity;
        packageStats[type].revenue += b.totalAmount;
    });

    const filteredAttendees = attendees.filter(a => {
        const matchesSearch = (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (a.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (a.phone || '').includes(searchTerm);
        
        const isPaid = a.amountPaid >= a.totalAmount;
        const matchesFilter = filterType === 'all' || 
                             (filterType === 'completed' && isPaid) ||
                             (filterType === 'pending' && !isPaid);
                             
        let matchesDate = true;
        if (selectedDate && a.bookingDate) {
            matchesDate = new Date(a.bookingDate).toISOString().split('T')[0] === selectedDate;
        }

        const matchesPackage = packageFilter === 'all' || a.ticketType === packageFilter;

        return matchesSearch && matchesFilter && matchesDate && matchesPackage;
    });

    const handleShowDetails = (attendee) => {
        const booking = attendee.rawBooking || {};
        setSelectedBooking({
            attendeeName: booking.user?.name || booking.attendeeDetails?.[0]?.name || attendee.name,
            email: booking.user?.email || booking.attendeeDetails?.[0]?.email || attendee.email,
            phone: booking.user?.phone || booking.attendeeDetails?.[0]?.phone || attendee.phone,
            eventName: booking.event?.title || attendee.eventName || 'Event',
            ticketTier: attendee.ticketType || booking.ticketType || 'Standard',
            bookedQuantity: booking.quantity || booking.attendeeDetails?.length || 1,
            attendeeDetails: booking.attendeeDetails || [attendee],
            selectedFood: booking.selectedFood || [],
            selectedAddons: booking.selectedAddons || [],
            totalAmount: booking.totalAmount || attendee.totalAmount || 0,
            amountPaid: booking.amountPaid || attendee.amountPaid || 0,
            remainingAmount: Math.max((booking.totalAmount || attendee.totalAmount || 0) - (booking.amountPaid || attendee.amountPaid || 0), 0),
            verifiedPayment: booking.verifiedPayment || null
        });
        setShowModal(true);
    };

    const handleExportExcel = () => {
        const data = filteredAttendees.map(attendee => ({
            Name: attendee.name,
            Email: attendee.email,
            Phone: attendee.phone,
            'Ticket Type': attendee.ticketType,
            'Booking Date': new Date(attendee.bookingDate).toLocaleDateString(),
            'Amount Paid': attendee.amountPaid,
            'Total Order': attendee.totalAmount
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendees");
        XLSX.writeFile(wb, `Attendees_${eventId}.xlsx`);
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf7ff' }}>
            <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
        </div>
    );

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={() => navigate(-1)}
                            style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,.25)', flexShrink: 0 }}
                        >
                            <FaArrowLeft size={18} />
                        </button>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '6px' }}>Attendee Registry</div>
                            <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-1px', color: '#1e1b2e', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FaUsers color="#d946ef" size={28} /> Event Guests
                            </h1>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button onClick={handleExportExcel}
                            style={{ background: '#10b981', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.85rem', padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16,185,129,0.2)' }}
                        >
                            <FaFileExcel /> Excel
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '14px', padding: '10px 16px', boxShadow: '0 4px 16px rgba(100,60,180,0.06)' }}>
                            <FaCalendarDay color="#9ca3af" size={13} />
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: '#374151', background: 'transparent' }} />
                            {selectedDate && <button onClick={() => setSelectedDate('')} style={{background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0}}>Clear</button>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '14px', padding: '10px 16px', boxShadow: '0 4px 16px rgba(100,60,180,0.06)' }}>
                            <FaSearch color="#9ca3af" size={13} />
                            <input type="text" placeholder="Search guests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: '#374151', background: 'transparent', width: '200px' }} />
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
                            className="attendee-stat-card" 
                            style={{
                                ...P.metricCard(m.accent),
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
                                <span style={{...P.label, color: packageFilter === m.type ? m.accent : '#9ca3af'}}>{m.label}</span>
                                <div className="icon-box-premium" style={{ width: '36px', height: '36px', borderRadius: '12px', background: packageFilter === m.type ? m.accent : `${m.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: packageFilter === m.type ? '#fff' : m.accent, fontSize: '0.9rem' }}>
                                    {m.icon}
                                </div>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-1px', lineHeight: 1 }}>{m.value}</div>
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
                                ...P.card, padding: '12px 10px', textAlign: 'center', borderRadius: '16px',
                                border: packageFilter === m.type ? '2px solid #3b82f6' : '1px solid #ede8f4',
                                background: packageFilter === m.type ? '#eff6ff' : 'rgba(255,255,255,0.97)',
                                gridColumn: (i === 0 && Object.keys(packageStats).length % 2 === 0) ? 'span 2' : 'span 1'
                            }}>
                            <div style={{ ...P.label, fontSize: '0.52rem', marginBottom: '6px', color: packageFilter === m.type ? '#3b82f6' : '#9ca3af' }}>{m.label}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-0.5px' }}>{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* ─── Filter Pills ─── */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: 'All Guests' },
                        { key: 'pending', label: 'Pending Dues' },
                        { key: 'completed', label: 'Completed' },
                    ].map(f => (
                        <button
                            key={f.key}
                            style={P.filterPill(filterType === f.key)}
                            onClick={() => setFilterType(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9ca3af', alignSelf: 'center', fontWeight: 600 }}>
                        {filteredAttendees.length} {filteredAttendees.length === 1 ? 'guest' : 'guests'}
                    </span>
                </div>

                {/* Desktop Table */}
                <div className="d-none d-lg-block" style={P.card}>
                    {filteredAttendees.length === 0 ? (
                        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '16px' }}>👤</div>
                            <h5 style={{ fontWeight: 700, color: '#1e1b2e' }}>No attendees found</h5>
                        </div>
                    ) : (
                        <Table className="m-0 align-middle" style={{ marginBottom: 0 }}>
                            <thead>
                                <tr style={{ background: '#f8f7fc', borderBottom: '1.5px solid #ede8f4' }}>
                                    {['Attendee', 'Plan / Ticket Type', 'Booking Date', 'Payment Progress', 'Status', 'Total Amount'].map((h, i) => (
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
                                {filteredAttendees.map((attendee, idx) => {
                                    const paidAmount = attendee.amountPaid || 0;
                                    const totalAmount = attendee.totalAmount || 1;
                                    const progress = Math.min((paidAmount / totalAmount) * 100, 100);
                                    const isPaid = paidAmount >= totalAmount;

                                    return (
                                        <tr key={idx} style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            {/* Attendee */}
                                            <td style={{ padding: '16px 20px', border: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6d28d9', flexShrink: 0 }}>
                                                        {(attendee.name || 'G')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.88rem' }}>{attendee.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{attendee.email}</div>
                                                    </div>
                                                    <button
                                                        style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '9px', color: '#8b5cf6', padding: '5px 8px', cursor: 'pointer', marginLeft: '4px', transition: 'all .2s' }}
                                                        onClick={() => handleShowDetails(attendee)}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ede8f4'; }}
                                                    >
                                                        <FaEye size={13} />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Plan / Ticket Type */}
                                            <td style={{ padding: '16px 20px', border: 'none' }}>
                                                <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>{attendee.ticketType}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{attendee.plan || 'Standard'} Plan</div>
                                            </td>

                                            {/* Booking Date */}
                                            <td style={{ padding: '16px 20px', border: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
                                                    <FaCalendarDay size={12} color="#ec4899" />
                                                    {attendee.bookingDate ? new Date(attendee.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                </div>
                                            </td>

                                            {/* Payment Progress */}
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

                                            {/* Total Expected */}
                                            <td style={{ padding: '16px 20px', border: 'none', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#1e1b2e', letterSpacing: '-0.5px' }}>
                                                {formatCurrency(attendee.totalAmount)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </div>

                {/* Mobile Cards View */}
                <div className="d-lg-none d-flex flex-column gap-3 mb-5">
                    {filteredAttendees.length === 0 ? (
                        <div style={{ ...P.card, padding: '40px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '16px' }}>👤</div>
                            <h5 style={{ fontWeight: 700, color: '#1e1b2e' }}>No attendees found</h5>
                        </div>
                    ) : (
                        filteredAttendees.map((attendee, idx) => {
                            const paidAmount = attendee.amountPaid || 0;
                            const totalAmount = attendee.totalAmount || 1;
                            const progress = Math.min((paidAmount / totalAmount) * 100, 100);
                            const isPaid = paidAmount >= totalAmount;

                            return (
                                <div key={idx} style={{ ...P.card, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                                    {/* Accent top stripe */}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                                        background: isPaid
                                            ? 'linear-gradient(90deg,#10b981,#059669)'
                                            : 'linear-gradient(90deg,#d946ef,#8b5cf6)',
                                    }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6d28d9' }}>
                                                {(attendee.name || 'G')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{attendee.name || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{attendee.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '9px', color: '#8b5cf6', padding: '5px 8px', cursor: 'pointer' }}
                                                onClick={() => handleShowDetails(attendee)}
                                            >
                                                <FaEye size={13} />
                                            </button>
                                            <span style={statusBadge(isPaid)}>{isPaid ? 'Paid' : 'Partial'}</span>
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8f7fc', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Plan / Ticket Type</div>
                                        <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem' }}>{attendee.ticketType}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>{attendee.plan || 'Standard'} Plan</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FaCalendarDay size={10} color="#ec4899" /> 
                                            Booked on: {attendee.bookingDate ? new Date(attendee.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
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
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-0.5px' }}>{formatCurrency(totalAmount)}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="premium-details-modal">
                    <Modal.Header closeButton style={{ borderBottom: '1px solid #ede8f4', padding: '20px 28px' }}>
                        <Modal.Title style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e1b2e' }}>Booking Details Summary</Modal.Title>
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
                        <button
                            style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, padding: '10px 24px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,.25)' }}
                            onClick={() => setShowModal(false)}
                        >
                            Close Details
                        </button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default AdminEventAttendees;
