import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/formatUtils';
import { FaChartLine, FaWallet, FaTicketAlt, FaExclamationTriangle, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '24px' },
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '8px' },
    input: { border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', padding: '10px 14px', fontSize: '0.85rem', outline: 'none', width: '100%', color: '#1e1b2e' },
    statCard: (accent) => ({ background: '#fff', border: `1.5px solid ${accent}22`, borderRadius: '18px', padding: '20px', boxShadow: `0 8px 24px ${accent}15` }),
};

const EventDetails = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [expenseForm, setExpenseForm] = useState({
        title: '', amount: '', category: 'Other', description: '', date: new Date().toISOString().split('T')[0], status: 'Pending'
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const categories = ['Venue', 'Makeup Products', 'Decoration', 'Marketing', 'Staff', 'Food', 'Travel', 'Other'];

    const fetchDetails = async () => {
        try {
            const res = await apiClient.get(`/api/v1/organizer/event/${id}/details`);
            setData(res.data);
        } catch (err) { setError(err.response?.data?.message || 'Failed to load event analytics'); } finally { setLoading(false); }
    };
    useEffect(() => { if (!id || id === 'undefined') { setLoading(false); return; } fetchDetails(); }, [id]);

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (isEditing) {
                await apiClient.put(`/api/v1/expenses/${editId}`, expenseForm);
                toast.success('Expense updated successfully');
            } else {
                await apiClient.post('/api/v1/expenses', { ...expenseForm, eventId: id });
                toast.success('Expense added successfully');
            }
            setExpenseForm({ title: '', amount: '', category: 'Other', description: '', date: new Date().toISOString().split('T')[0], status: 'Pending' });
            setIsEditing(false);
            setEditId(null);
            fetchDetails();
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); } finally { setSubmitting(false); }
    };

    const handleEdit = (exp) => {
        setExpenseForm({ title: exp.title, amount: exp.amount, category: exp.category, description: exp.description || '', date: new Date(exp.date).toISOString().split('T')[0], status: exp.status || 'Pending' });
        setIsEditing(true); setEditId(exp._id); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (expId) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try { await apiClient.delete(`/api/v1/expenses/${expId}`); toast.success('Expense deleted'); fetchDetails(); } catch (err) { toast.error('Failed to delete expense'); }
    };

    const toggleStatus = async (exp) => {
        try {
            const newStatus = exp.status === 'Paid' ? 'Pending' : 'Paid';
            await apiClient.put(`/api/v1/expenses/${exp._id}`, { status: newStatus });
            fetchDetails();
        } catch (err) { toast.error('Failed to update status'); }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fdf7ff' }}>
            <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
        </div>
    );

    if (error) return (
        <div style={{ padding: '80px 24px', textAlign: 'center', background: '#fdf7ff', minHeight: '100vh' }}>
            <div style={{ display: 'inline-block', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px', padding: '32px', color: '#ef4444' }}>
                <FaExclamationTriangle size={32} style={{ marginBottom: '16px' }} />
                <h4 style={{ fontWeight: 800, margin: '0 0 8px 0' }}>Error Loading Analytics</h4>
                <p style={{ margin: 0 }}>{error}</p>
            </div>
        </div>
    );

    if (!data || data.totalTickets === 0) return (
        <div style={{ padding: '80px 24px', textAlign: 'center', background: '#fdf7ff', minHeight: '100vh' }}>
            <div style={{ fontSize: '4rem', opacity: 0.15, marginBottom: '16px' }}>📊</div>
            <h5 style={{ fontWeight: 800, color: '#1e1b2e' }}>No Data Available for this Event</h5>
        </div>
    );

    const { eventName, totalTickets, totalRevenue, totalExpenses, profit, salesByDate, planSales, expenses } = data;

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                <div style={{ padding: '40px 0 28px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Event Analytics</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FaChartLine color="#d946ef" size={28} /> {eventName}
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Comprehensive breakdown of sales and expenditure data.</p>
                </div>

                <Row className="g-3 mb-5">
                    <Col xs={6} md={3}>
                        <div style={P.statCard('#8b5cf6')}>
                            <div style={P.label}>Total Tickets Sold</div>
                            <div style={{ fontSize: 'clamp(1.15rem, 5vw, 1.8rem)', fontWeight: 800, color: '#1e1b2e', letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{totalTickets.toLocaleString()}</div>
                        </div>
                    </Col>
                    <Col xs={6} md={3}>
                        <div style={P.statCard('#10b981')}>
                            <div style={P.label}>Total Revenue</div>
                            <div style={{ fontSize: 'clamp(1.15rem, 5vw, 1.8rem)', fontWeight: 800, color: '#10b981', letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{formatCurrency(totalRevenue)}</div>
                        </div>
                    </Col>
                    <Col xs={6} md={3}>
                        <div style={P.statCard('#ef4444')}>
                            <div style={P.label}>Total Expenses</div>
                            <div style={{ fontSize: 'clamp(1.15rem, 5vw, 1.8rem)', fontWeight: 800, color: '#ef4444', letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{formatCurrency(totalExpenses)}</div>
                        </div>
                    </Col>
                    <Col xs={6} md={3}>
                        <div style={P.statCard(profit > 0 ? '#10b981' : '#ef4444')}>
                            <div style={P.label}>{profit < 0 ? 'Net Loss' : 'Net Profit'}</div>
                            <div style={{ fontSize: 'clamp(1.15rem, 5vw, 1.8rem)', fontWeight: 800, color: profit > 0 ? '#10b981' : '#ef4444', letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{formatCurrency(Math.abs(profit))}</div>
                        </div>
                    </Col>
                </Row>

                <div style={{ ...P.card, marginBottom: '40px' }}>
                    <h5 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isEditing ? <FaEdit color="#d946ef" /> : <FaPlus color="#d946ef" />}
                        {isEditing ? 'Edit Expense' : 'Add New Expense'}
                    </h5>
                    <form onSubmit={handleExpenseSubmit}>
                        <Row className="g-3">
                            <Col md={3}>
                                <label style={P.label}>Expense Title</label>
                                <input type="text" style={P.input} placeholder="e.g. Venue Advance" value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} required />
                            </Col>
                            <Col md={2}>
                                <label style={P.label}>Amount (INR)</label>
                                <input type="number" style={P.input} placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} required />
                            </Col>
                            <Col md={2}>
                                <label style={P.label}>Category</label>
                                <select style={P.input} value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </Col>
                            <Col md={2}>
                                <label style={P.label}>Date</label>
                                <input type="date" style={P.input} value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} required />
                            </Col>
                            <Col md={3} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                                <button type="submit" disabled={submitting} style={{ flex: 1, background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '10px 14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,.25)' }}>
                                    {submitting ? 'Processing...' : (isEditing ? 'Update' : 'Add Expense')}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={() => { setIsEditing(false); setEditId(null); setExpenseForm({ title: '', amount: '', category: 'Other', description: '', date: new Date().toISOString().split('T')[0], status: 'Pending' }); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#64748b', fontWeight: 700, fontSize: '0.85rem', padding: '10px 14px', cursor: 'pointer' }}>Cancel</button>
                                )}
                            </Col>
                            <Col md={12}>
                                <label style={P.label}>Notes / Description</label>
                                <input type="text" style={P.input} placeholder="Add additional details..." value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                            </Col>
                        </Row>
                    </form>
                </div>

                <Row className="g-4 mb-5">
                    <Col lg={6}>
                        <div style={{ ...P.card, height: '100%', padding: 0 }}>
                            <div style={{ padding: '24px 24px 16px' }}>
                                <h5 style={{ fontWeight: 800, color: '#1e1b2e', margin: 0 }}>Date-wise Ticket Sales</h5>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '450px' }}>
                                    <thead style={{ background: '#f8f7fc' }}>
                                        <tr>
                                            <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap' }}>Date</th>
                                            <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', whiteSpace: 'nowrap' }}>Tickets Sold</th>
                                            <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', whiteSpace: 'nowrap' }}>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesByDate?.length > 0 ? salesByDate.map((sales, idx) => (
                                            <tr key={idx} style={{ borderTop: '1px solid #ede8f4' }}>
                                                <td style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.85rem', color: '#1e1b2e', whiteSpace: 'nowrap' }}>{sales.date}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.85rem', color: '#4b5563', whiteSpace: 'nowrap' }}>{sales.ticketsSold.toLocaleString()}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatCurrency(sales.revenue)}</td>
                                            </tr>
                                        )) : (<tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>No tickets sold yet.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Col>
                    <Col lg={6}>
                        <div style={{ ...P.card, height: '100%', padding: 0 }}>
                            <div style={{ padding: '24px 24px 16px' }}>
                                <h5 style={{ fontWeight: 800, color: '#1e1b2e', margin: 0 }}>Plan-wise Sales</h5>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '450px' }}>
                                    <thead style={{ background: '#f8f7fc' }}>
                                        <tr>
                                            <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap' }}>Plan Name</th>
                                            <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', whiteSpace: 'nowrap' }}>Tickets Sold</th>
                                            <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', whiteSpace: 'nowrap' }}>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {planSales?.length > 0 ? planSales.map((plan, idx) => (
                                            <tr key={idx} style={{ borderTop: '1px solid #ede8f4' }}>
                                                <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                                    <span style={{ background: '#fdf4ff', color: '#d946ef', border: '1px solid #fbcfe8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{plan.planName}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.85rem', color: '#4b5563', whiteSpace: 'nowrap' }}>{plan.ticketsSold.toLocaleString()}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatCurrency(plan.revenue)}</td>
                                            </tr>
                                        )) : (<tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>No plans matched.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Col>
                </Row>

                <div style={{ ...P.card, padding: 0 }}>
                    <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h5 style={{ fontWeight: 800, color: '#1e1b2e', margin: 0 }}>Expense History</h5>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Total Event Expenses</div>
                            <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '1.2rem', lineHeight: 1 }}>{formatCurrency(totalExpenses)}</div>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead style={{ background: '#f8f7fc' }}>
                                <tr>
                                    <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap' }}>Details</th>
                                    <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap' }}>Category</th>
                                    <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap' }}>Status</th>
                                    <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap' }}>Date</th>
                                    <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', whiteSpace: 'nowrap' }}>Amount</th>
                                    <th style={{ padding: '12px 24px', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses?.length > 0 ? expenses.map((exp, idx) => (
                                    <tr key={idx} style={{ borderTop: '1px solid #ede8f4', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem', marginBottom: '4px', whiteSpace: 'nowrap' }}>{exp.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{exp.description || 'No notes'}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{exp.category}</span>
                                        </td>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                            <span onClick={() => toggleStatus(exp)} style={{ background: exp.status === 'Paid' ? '#d1fae5' : '#fee2e2', color: exp.status === 'Paid' ? '#059669' : '#dc2626', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                {exp.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(exp.date).toLocaleDateString()}</td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: '#ef4444', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{formatCurrency(exp.amount)}</td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                                                <button onClick={() => handleEdit(exp)} style={{ background: 'transparent', border: '1.5px solid #d946ef', borderRadius: '8px', color: '#d946ef', padding: '6px 8px', cursor: 'pointer', transition: 'all .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fdf4ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><FaEdit size={12} /></button>
                                                <button onClick={() => handleDelete(exp._id)} style={{ background: 'transparent', border: '1.5px solid #fca5a5', borderRadius: '8px', color: '#ef4444', padding: '6px 8px', cursor: 'pointer', transition: 'all .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><FaTrash size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (<tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>No expenses recorded for this event.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default EventDetails;
