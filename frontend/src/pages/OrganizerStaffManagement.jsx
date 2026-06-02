import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Modal, Spinner, Table } from 'react-bootstrap';
import { 
    FaUserPlus, FaTrash, FaLink, FaIdBadge, FaCheck, FaSearch, FaUsers, FaTimes, FaEdit
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import * as organizerApi from '../api/organizerApi';
import * as eventApi from '../api/eventApi';
import apiClient from '../api/apiClient';
import { playSound } from '../utils/soundManager';
import PremiumSearchBar from '../components/common/PremiumSearchBar';
import '../css/admin-pages.css';

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

    // Form states
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', staffRole: 'gate staff' });


    const fetchData = async () => {
        try {
            setLoading(true);
            const staffRes = await organizerApi.getStaff();
            setStaffList(staffRes.data?.data || []);
            
            const addonRes = await apiClient.get('/api/v1/organizer/addons');
            setAddons(addonRes.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        try {
            await organizerApi.createStaff(formData);
            setShowCreateModal(false);
            setFormData({ name: '', email: '', phone: '', password: '', staffRole: 'gate staff' });
            playSound('success');
            toast.success('Personnel record created successfully');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Initialization failure');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this staff member?')) {
            try {
                await organizerApi.deleteStaff(id);
                playSound('delete');
                toast.success('Personnel terminated');
                fetchData();
            } catch (err) {
                toast.error('Termination failure');
            }
        }
    };

    const handleReassignSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.put(`/api/v1/organizer/staff/${staffToReassign._id}/role`, { staffRole: newRole });
            toast.success('Staff role reassigned successfully');
            setShowReassignModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reassignment failed');
        }
    };



    const filteredStaff = staffList.filter(s => 
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.staffRole?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="admin-page-container">
            <Container fluid>
                <div className="admin-page-header">
                    <div>
                        <h1 className="d-flex align-items-center gap-3">
                            <FaUsers className="text-pink d-none d-lg-inline-flex" /> Staff Management
                        </h1>
                        <p className="dashboard-subtext">Manage operational staff and event assignment protocols</p>
                    </div>
                    <div className="d-flex gap-3">
                        <PremiumSearchBar 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ minWidth: '300px' }}
                        />
                        <button className="btn btn-pink" onClick={() => setShowCreateModal(true)}>
                            <FaUserPlus /> New Personnel
                        </button>
                    </div>
                </div>

                <div className="admin-card">
                    {loading ? (
                        <div className="loading-skeleton">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-row" />)}
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><FaUsers /></div>
                            <h3>No Personnel Found</h3>
                            <p>{search ? `Matching "${search}"` : 'Your staff registry is currently empty.'}</p>
                        </div>
                    ) : (
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Identity Name</th>
                                        <th>Staff ID</th>
                                        <th>Operational Role</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.map(staff => (
                                        <tr key={staff._id}>
                                            <td>
                                                <div className="fw-bold">{staff.name}</div>
                                                <div className="small text-muted">{staff.email}</div>
                                            </td>
                                            <td>
                                                <span className="fw-bold tracking-widest text-pink">{staff.staffId || 'PENDING'}</span>
                                            </td>
                                            <td>
                                                <span className={`admin-badge badge-${
                                                    staff.staffRole === 'coordinator' ? 'approved' : 'resolved'
                                                }`}>
                                                    {staff.staffCheckRole === 'CUSTOM_ADDON' && staff.customAddonItemNames?.length > 0
                                                        ? staff.customAddonItemNames[0].toUpperCase()
                                                        : staff.staffRole.toUpperCase()
                                                    }
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-btn-group justify-content-end gap-2 d-flex">
                                                    <button className="btn btn-outline-primary" title="Reassign Role" onClick={() => { setStaffToReassign(staff); setNewRole(staff.staffRole); setShowReassignModal(true); }}>
                                                        <FaEdit size={12} />
                                                    </button>
                                                    <button className="btn btn-pink" title="Terminate" onClick={() => handleDelete(staff._id)}>
                                                        <FaTrash size={12} />
                                                    </button>
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

            {/* Premium Create Staff Modal */}
            <Modal 
                show={showCreateModal} 
                onHide={() => setShowCreateModal(false)} 
                centered 
                size="sm"
                className="premium-popup"
            >
                <div className="popup-body">
                    <button className="close-btn" onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                        <FaTimes size={16} />
                    </button>
                    
                    <div className="popup-content">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <div className="modal-icon-header">
                                <FaUserPlus />
                            </div>
                            <div>
                                <h4 className="fw-black m-0" style={{ fontSize: '1.25rem' }}>Initialize Personnel</h4>
                                <p className="m-0 tiny-text uppercase tracking-widest text-pink fw-bold">Identity Deployment Protocol</p>
                            </div>
                        </div>

                        <Form onSubmit={handleCreateStaff}>
                            <div className="section-card mb-2">
                                <Form.Group className="mb-2">
                                    <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>Full Identity Name</Form.Label>
                                    <Form.Control required type="text" className="rounded-12 border-light py-1" placeholder="e.g. John Matrix" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </Form.Group>
                                <Form.Group className="mb-2">
                                    <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>Operational Email Link</Form.Label>
                                    <Form.Control required type="email" className="rounded-12 border-light py-1" placeholder="staff@nexus.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </Form.Group>
                                <Form.Group className="mb-0">
                                    <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>Mobile Number <span className="text-muted fw-normal">(optional — for mobile login)</span></Form.Label>
                                    <Form.Control type="tel" className="rounded-12 border-light py-1" placeholder="e.g. 9876543210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </Form.Group>
                            </div>

                            <div className="section-card mb-3">
                                <Form.Group className="mb-2">
                                    <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>Security Access Key</Form.Label>
                                    <Form.Control required type="password" minLength={6} className="rounded-12 border-light py-1" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </Form.Group>
                                <Form.Group className="mb-0">
                                    <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>Operational Designation</Form.Label>
                                    <Form.Select className="rounded-12 border-light py-1" value={formData.staffRole} onChange={e => setFormData({ ...formData, staffRole: e.target.value })}>
                                        <option value="gate staff">Gate Staff (Scanning & Validation)</option>
                                        <option value="coordinator">Coordinator (Operations)</option>
                                        <option value="support">Support Personnel</option>
                                        {addons.map((addon, index) => (
                                            <option key={index} value={addon.name}>{addon.name} ({addon.type})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="d-flex justify-content-center mt-3">
                                <Button type="submit" className="btn btn-pink px-4 rounded-pill py-2 fw-black shadow-glow btn-sm">DEPLOY PERSONNEL RECORD</Button>
                            </div>
                        </Form>
                    </div>
                </div>
            </Modal>

            {/* Reassign Role Modal */}
            <Modal show={showReassignModal} onHide={() => setShowReassignModal(false)} centered size="sm" className="premium-popup">
                <div className="popup-body">
                    <button className="close-btn" onClick={() => setShowReassignModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                        <FaTimes size={16} />
                    </button>
                    <div className="popup-content">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <div className="modal-icon-header">
                                <FaEdit />
                            </div>
                            <div>
                                <h4 className="fw-black m-0" style={{ fontSize: '1.25rem' }}>Reassign Role</h4>
                                <p className="m-0 tiny-text uppercase tracking-widest text-pink fw-bold">{staffToReassign?.name}</p>
                            </div>
                        </div>
                        <Form onSubmit={handleReassignSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>New Operational Designation</Form.Label>
                                <Form.Select className="rounded-12 border-light py-1" value={newRole} onChange={e => setNewRole(e.target.value)} required>
                                    <option value="">Select a role...</option>
                                    <option value="gate staff">Gate Staff (Scanning & Validation)</option>
                                    <option value="coordinator">Coordinator (Operations)</option>
                                    <option value="support">Support Personnel</option>
                                    {addons.map((addon, index) => (
                                        <option key={index} value={addon.name}>{addon.name} ({addon.type})</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            <div className="d-flex justify-content-center mt-3">
                                <Button type="submit" className="btn btn-pink px-4 rounded-pill py-2 fw-black shadow-glow btn-sm">UPDATE DESIGNATION</Button>
                            </div>
                        </Form>
                    </div>
                </div>
            </Modal>


        </div>
    );
};

export default OrganizerStaffManagement;
