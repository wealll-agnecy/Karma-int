import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Modal } from 'react-bootstrap';
import { FaUserPlus, FaTrash, FaEdit, FaUsers, FaTimes, FaSearch, FaIdBadge } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import * as organizerApi from '../api/organizerApi';
import * as eventApi from '../api/eventApi';
import apiClient from '../api/apiClient';
import { playSound } from '../utils/soundManager';

const P = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#fdf7ff 0%,#f5f0fb 50%,#faf7fb 100%)', padding: '0 0 60px' },
    card: { background: 'rgba(255,255,255,0.97)', border: '1px solid #ede8f4', borderRadius: '22px', boxShadow: '0 8px 32px rgba(100,60,180,0.07)', transition: 'all .3s ease', padding: '28px' },
    label: { fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '6px' },
    input: { border: '1.5px solid #ede8f4', borderRadius: '12px', background: '#f8f7fc', padding: '10px 14px', fontSize: '0.85rem', outline: 'none', boxShadow: 'none', width: '100%' },
    roleBadge: (role) => ({ background: role === 'coordinator' ? '#dbeafe' : '#dcfce7', color: role === 'coordinator' ? '#1d4ed8' : '#15803d', borderRadius: '999px', padding: '4px 12px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }),
};

const OrganizerStaffManagement = () => {
    const [staffList, setStaffList] = useState([]);
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [search, setSearch] = useState('');
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [staffToReassign, setStaffToReassign] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', staffRole: 'gate staff' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const staffRes = await organizerApi.getStaff();
            setStaffList(staffRes.data?.data || []);
            const addonRes = await apiClient.get('/api/v1/organizer/addons');
            setAddons(addonRes.data?.data || []);
        } catch (err) { console.error('Failed to fetch data', err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        try {
            await organizerApi.createStaff(formData);
            setShowCreateModal(false);
            setFormData({ name: '', email: '', phone: '', password: '', staffRole: 'gate staff' });
            playSound('success');
            toast.success('Personnel record created successfully');
            fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Initialization failure'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this staff member?')) {
            try {
                await organizerApi.deleteStaff(id);
                playSound('delete');
                toast.success('Personnel terminated');
                fetchData();
            } catch (err) { toast.error('Termination failure'); }
        }
    };

    const handleReassignSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.put(`/api/v1/organizer/staff/${staffToReassign._id}/role`, { staffRole: newRole });
            toast.success('Staff role reassigned successfully');
            setShowReassignModal(false);
            fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Reassignment failed'); }
    };

    const filteredStaff = staffList.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.staffRole?.toLowerCase().includes(search.toLowerCase())
    );

    const staffModalFields = [
        { label: 'Full Name', type: 'text', key: 'name', placeholder: 'e.g. John Matrix', required: true },
        { label: 'Email', type: 'email', key: 'email', placeholder: 'staff@example.com', required: true },
        { label: 'Mobile Number (optional)', type: 'tel', key: 'phone', placeholder: 'e.g. 9876543210' },
        { label: 'Password', type: 'password', key: 'password', placeholder: '••••••••', required: true, minLength: 6 },
    ];

    return (
        <div style={P.page}>
            <Container fluid style={{ maxWidth: '1400px', padding: '0 24px' }}>
                {/* Header */}
                <div style={{ padding: '40px 0 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>Organizer Portal</div>
                        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-1.5px', color: '#1e1b2e', margin: 0 }}>Staff Management</h1>
                        <p style={{ color: '#6b7280', marginTop: '6px', marginBottom: 0, fontSize: '0.9rem' }}>Manage operational staff and event assignment protocols.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid #ede8f4', borderRadius: '14px', padding: '10px 16px', boxShadow: '0 4px 16px rgba(100,60,180,0.06)' }}>
                            <FaSearch color="#9ca3af" size={13} />
                            <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: '#374151', background: 'transparent', width: '200px' }} />
                        </div>
                        <button onClick={() => setShowCreateModal(true)}
                            style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.82rem', padding: '12px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}
                        >
                            <FaUserPlus size={14} /> New Personnel
                        </button>
                    </div>
                </div>

                <div style={{ ...P.card, marginBottom: '40px', padding: 0, overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1,2,3,4,5].map(i => <div key={i} style={{ height: '60px', borderRadius: '14px', background: '#f8f7fc' }} />)}
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                            <FaUsers size={52} color="#e9d5ff" style={{ marginBottom: '16px' }} />
                            <h4 style={{ fontWeight: 800, color: '#1e1b2e', marginBottom: '8px' }}>No Personnel Found</h4>
                            <p style={{ color: '#6b7280', margin: 0 }}>{search ? `No results matching "${search}"` : 'Your staff registry is currently empty.'}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
                                <thead>
                                    <tr style={{ background: '#f8f7fc', borderBottom: '1.5px solid #ede8f4' }}>
                                        {['Identity Name', 'Staff ID', 'Role', 'Actions'].map((h, i) => (
                                            <th key={i} style={{ padding: '16px 20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', textAlign: i === 3 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.map((staff, idx) => (
                                        <tr key={staff._id} style={{ borderTop: '1px solid #f3f4f6', transition: 'background .2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6d28d9', flexShrink: 0 }}>
                                                        {(staff.name || 'S')[0].toUpperCase()}
                                                    </div>
                                                    <div style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.88rem' }}>{staff.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{staff.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '0.85rem', fontFamily: 'monospace', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{staff.staffId || 'PENDING'}</span>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={P.roleBadge(staff.staffRole)}>
                                                    {staff.staffCheckRole === 'CUSTOM_ADDON' && staff.customAddonItemNames?.length > 0
                                                        ? staff.customAddonItemNames[0].toUpperCase()
                                                        : staff.staffRole.toUpperCase()
                                                    }
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        onClick={() => { setStaffToReassign(staff); setNewRole(staff.staffRole); setShowReassignModal(true); }}
                                                        title="Reassign Role"
                                                        style={{ background: 'transparent', border: '1.5px solid #ede8f4', borderRadius: '10px', color: '#8b5cf6', padding: '7px 10px', cursor: 'pointer', transition: 'all .2s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ede8f4'; }}
                                                    ><FaEdit size={12} /></button>
                                                    <button
                                                        onClick={() => handleDelete(staff._id)}
                                                        title="Terminate"
                                                        style={{ background: 'transparent', border: '1.5px solid #fca5a5', borderRadius: '10px', color: '#ef4444', padding: '7px 10px', cursor: 'pointer', transition: 'all .2s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                                    ><FaTrash size={12} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Container>

            {/* Create Staff Modal */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="sm">
                <Modal.Header closeButton style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 24px' }}>
                    <Modal.Title style={{ fontWeight: 700, fontSize: '1rem', color: '#1e1b2e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaUserPlus size={14} color="#fff" />
                        </div>
                        Initialize Personnel
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '24px' }}>
                    <Form onSubmit={handleCreateStaff}>
                        {staffModalFields.map((f) => (
                            <Form.Group key={f.key} className="mb-3">
                                <label style={P.label}>{f.label}</label>
                                <Form.Control
                                    required={f.required} type={f.type} minLength={f.minLength}
                                    placeholder={f.placeholder}
                                    value={formData[f.key]}
                                    onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                    style={P.input}
                                    className="shadow-none"
                                />
                            </Form.Group>
                        ))}
                        <Form.Group className="mb-4">
                            <label style={P.label}>Operational Designation</label>
                            <Form.Select value={formData.staffRole} onChange={e => setFormData({ ...formData, staffRole: e.target.value })} style={P.input} className="shadow-none">
                                <option value="gate staff">Gate Staff (Scanning & Validation)</option>
                                <option value="coordinator">Coordinator (Operations)</option>
                                <option value="support">Support Personnel</option>
                                {addons.map((addon, i) => <option key={i} value={addon.name}>{addon.name} ({addon.type})</option>)}
                            </Form.Select>
                        </Form.Group>
                        <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '12px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}>
                            DEPLOY PERSONNEL RECORD
                        </button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Reassign Role Modal */}
            <Modal show={showReassignModal} onHide={() => setShowReassignModal(false)} centered size="sm">
                <Modal.Header closeButton style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 24px' }}>
                    <Modal.Title style={{ fontWeight: 700, fontSize: '1rem', color: '#1e1b2e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaEdit size={14} color="#fff" />
                        </div>
                        Reassign Role
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '24px' }}>
                    <div style={{ background: '#f8f7fc', borderRadius: '14px', padding: '12px 16px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '4px' }}>Staff Member</div>
                        <div style={{ fontWeight: 700, color: '#1e1b2e', fontSize: '0.9rem' }}>{staffToReassign?.name}</div>
                    </div>
                    <Form onSubmit={handleReassignSubmit}>
                        <Form.Group className="mb-4">
                            <label style={P.label}>New Operational Designation</label>
                            <Form.Select required value={newRole} onChange={e => setNewRole(e.target.value)} style={P.input} className="shadow-none">
                                <option value="">Select a role...</option>
                                <option value="gate staff">Gate Staff (Scanning & Validation)</option>
                                <option value="coordinator">Coordinator (Operations)</option>
                                <option value="support">Support Personnel</option>
                                {addons.map((addon, i) => <option key={i} value={addon.name}>{addon.name} ({addon.type})</option>)}
                            </Form.Select>
                        </Form.Group>
                        <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg,#d946ef,#8b5cf6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '12px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,.25)' }}>
                            UPDATE DESIGNATION
                        </button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default OrganizerStaffManagement;
