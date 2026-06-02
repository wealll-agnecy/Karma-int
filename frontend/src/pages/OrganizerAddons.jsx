import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Modal, Row, Col } from 'react-bootstrap';
import { FaPlusCircle, FaTimes, FaCog, FaTrash, FaLayerGroup } from 'react-icons/fa';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '28px' },
    label: { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '6px' },
};

const OrganizerAddons = () => {
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ type: 'Custom Section', name: '' });

    const fetchAddons = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/v1/organizer/addons');
            setAddons(res.data.data || []);
        } catch (err) { console.error('Failed to fetch addons', err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchAddons(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/api/v1/organizer/addons', formData);
            toast.success('Operational section created successfully!');
            setShowModal(false);
            setFormData({ type: 'Custom Section', name: '' });
            fetchAddons();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to create addon'); }
    };

    const handleDelete = async (name) => {
        if (!window.confirm(`Are you sure you want to delete the addon "${name}"?`)) return;
        try {
            await apiClient.delete(`/api/v1/organizer/addons/${name}`);
            toast.success('Operational section deleted successfully!');
            fetchAddons();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete addon'); }
    };

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Organizer Portal</div>
                        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>Add-ons Module</h1>
                        <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Manage custom operational sections for staff designation.</p>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.82rem', padding: '12px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}
                    >
                        <FaPlusCircle size={14} /> Create Add-on
                    </button>
                </div>

                <div style={{ ...P.card, marginBottom: '40px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ height: '60px', borderRadius: '14px', background: 'linear-gradient(90deg,#f8f7fc,#ede8f4,#f8f7fc)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                            ))}
                        </div>
                    ) : addons.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                            <FaCog size={52} color="#e9d5ff" style={{ marginBottom: '16px' }} />
                            <h4 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '8px' }}>No Add-ons Created</h4>
                            <p style={{ color: '#6b7280', margin: 0 }}>You haven't created any custom operational sections yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {addons.map((addon, index) => (
                                <div key={index}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '16px', background: '#f8f7fc', border: '1.5px solid #ede8f4', transition: 'all .2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#c4b5fd'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f8f7fc'; e.currentTarget.style.borderColor = '#ede8f4'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaLayerGroup size={15} color="#8b5cf6" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{addon.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>{addon.type}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '999px', padding: '4px 12px', fontSize: '0.68rem', fontWeight: 700 }}>{addon.type}</span>
                                        <button onClick={() => handleDelete(addon.name)}
                                            style={{ background: 'transparent', border: '1.5px solid #fca5a5', borderRadius: '10px', color: '#ef4444', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <FaTrash size={11} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Container>

            {/* Create Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="sm">
                <Modal.Header closeButton style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 24px' }}>
                    <Modal.Title style={{ fontWeight: 700, fontSize: '1rem', color: '#1e1b2e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaPlusCircle size={14} color="#fff" />
                        </div>
                        Create Add-on
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '24px' }}>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <label style={P.label}>Type</label>
                            <Form.Control
                                required type="text"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                placeholder="e.g. Access Level"
                                style={{ border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', padding: '10px 14px', fontSize: '0.85rem', outline: 'none', boxShadow: 'none' }}
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <label style={P.label}>Section Name</label>
                            <Form.Control
                                required type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. VIP Access"
                                style={{ border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', padding: '10px 14px', fontSize: '0.85rem', outline: 'none', boxShadow: 'none' }}
                            />
                        </Form.Group>
                        <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '12px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}>
                            CREATE SECTION
                        </button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default OrganizerAddons;
