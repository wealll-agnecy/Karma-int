import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Button, Modal } from 'react-bootstrap';
import { FaEnvelope, FaEye, FaTrash, FaSearch, FaInbox, FaPhone } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../utils/soundManager';
import '../css/admin-pages.css';
import '../css/AdminStyles.css';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '28px' },
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af' },
};

export default function AdminEnquiries() {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const fetchEnquiries = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get("/api/v1/enquiries");
            setEnquiries(res.data.data || res.data || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchEnquiries(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this enquiry?')) return;
        try {
            await apiClient.delete(`/api/v1/enquiries/${id}`);
            playSound('delete');
            setToast({ msg: 'Enquiry deleted', type: 'success' });
            fetchEnquiries();
            setShowModal(false);
        } catch (err) { setToast({ msg: 'Failed to delete', type: 'danger' }); }
        setTimeout(() => setToast(null), 3000);
    };

    const handleShowDetails = (enquiry) => { setSelectedEnquiry(enquiry); setShowModal(true); };

    const filtered = enquiries.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.message?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Admin Portal</div>
                        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>Enquiries</h1>
                        <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Incoming contact requests and messages from leads.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '14px', padding: '10px 16px', boxShadow: '0 4px 16px rgba(100,60,180,0.06)' }}>
                        <FaSearch color="#9ca3af" size={14} />
                        <input
                            type="text"
                            placeholder="Search enquiries..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: '#374151', background: 'transparent', width: '220px' }}
                        />
                    </div>
                </div>

                {toast && (
                    <div style={{ marginBottom: '16px', padding: '12px 20px', borderRadius: '14px', background: toast.type === 'success' ? '#dcfce7' : '#fee2e2', color: toast.type === 'success' ? '#15803d' : '#b91c1c', fontWeight: 600, fontSize: '0.85rem', border: `1.5px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
                        {toast.msg}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px' }}>
                        <Spinner animation="border" style={{ color: '#8b5cf6', width: '2.5rem', height: '2.5rem' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ ...P.card, textAlign: 'center', padding: '80px 24px' }}>
                        <FaInbox size={48} color="#e9d5ff" style={{ marginBottom: '16px' }} />
                        <h4 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '8px' }}>No enquiries found</h4>
                        <p style={{ color: '#6b7280', margin: 0 }}>All incoming messages will appear here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
                        <AnimatePresence>
                            {filtered.map((enq, i) => (
                                <motion.div key={enq._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}>
                                    <div style={{ ...P.card, padding: '20px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(100,60,180,0.12)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(100,60,180,0.07)'; }}
                                    >
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg,#d946ef,#8b5cf6)' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6d28d9', flexShrink: 0 }}>
                                                        {(enq.name || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.95rem' }}>{enq.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FaEnvelope size={10} />{enq.email}</span>
                                                            {enq.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FaPhone size={10} />{enq.phone}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0, lineHeight: 1.6, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {enq.message}
                                                </p>
                                                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '10px', fontWeight: 600 }}>
                                                    {enq.createdAt ? new Date(enq.createdAt).toLocaleString() : ''}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                                <button onClick={() => handleShowDetails(enq)}
                                                    style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '10px', color: '#8b5cf6', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.78rem', transition: 'all .2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ede8f4'; }}
                                                >
                                                    <FaEye size={12} /> View
                                                </button>
                                                <button onClick={() => handleDelete(enq._id)}
                                                    style={{ background: 'transparent', border: '1.5px solid #fca5a5', borderRadius: '10px', color: '#ef4444', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.78rem', transition: 'all .2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    <FaTrash size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Details Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="md">
                    <Modal.Header closeButton style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 28px' }}>
                        <Modal.Title style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e1b2e' }}>Enquiry Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ padding: '28px' }}>
                        {selectedEnquiry && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                                    <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#6d28d9' }}>
                                        {(selectedEnquiry.name || 'U')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '1rem' }}>{selectedEnquiry.name}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{selectedEnquiry.email}</div>
                                    </div>
                                </div>
                                {selectedEnquiry.phone && (
                                    <div style={{ background: '#f8f7fc', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FaPhone size={13} color="#8b5cf6" />
                                        <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>{selectedEnquiry.phone}</span>
                                    </div>
                                )}
                                <div style={{ background: '#f8f7fc', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '8px' }}>Message</div>
                                    <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{selectedEnquiry.message}</p>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600 }}>
                                    Received: {selectedEnquiry.createdAt ? new Date(selectedEnquiry.createdAt).toLocaleString() : 'N/A'}
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer style={{ borderTop: '1px solid #f3f4f6', padding: '16px 28px', gap: '10px' }}>
                        <button onClick={() => handleDelete(selectedEnquiry?._id)}
                            style={{ background: 'transparent', border: '1.5px solid #fca5a5', borderRadius: '12px', color: '#ef4444', padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                        >Delete</button>
                        <button onClick={() => setShowModal(false)}
                            style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', padding: '9px 24px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                        >Close</button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
}
