import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Modal, Row, Col } from 'react-bootstrap';
import { FaPlusCircle, FaTimes, FaCog, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';
import '../css/admin-pages.css';

const OrganizerAddons = () => {
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        type: 'Custom Section',
        name: ''
    });

    const fetchAddons = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/v1/organizer/addons');
            setAddons(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch addons', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddons();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/api/v1/organizer/addons', formData);
            toast.success('Operational section created successfully!');
            setShowModal(false);
            setFormData({ type: 'Custom Section', name: '' });
            fetchAddons();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create addon');
        }
    };

    const handleDelete = async (name) => {
        if (!window.confirm(`Are you sure you want to delete the addon "${name}"?`)) return;
        try {
            await apiClient.delete(`/api/v1/organizer/addons/${name}`);
            toast.success('Operational section deleted successfully!');
            fetchAddons();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete addon');
        }
    };

    return (
        <div className="admin-page-container">
            <Container fluid>
                <div className="admin-page-header d-flex justify-content-between align-items-center">
                    <div>
                        <h1 className="d-flex align-items-center gap-3">
                            <FaPlusCircle className="text-pink d-none d-lg-inline-flex" /> Add-ons Module
                        </h1>
                        <p className="dashboard-subtext">Manage custom operational sections for staff designation</p>
                    </div>
                    <Button className="btn btn-pink" onClick={() => setShowModal(true)}>
                        <FaPlusCircle /> Create Add-on
                    </Button>
                </div>

                <div className="admin-card">
                    {loading ? (
                        <div className="loading-skeleton">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton-row" />)}
                        </div>
                    ) : addons.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><FaCog /></div>
                            <h3>No Add-ons Created</h3>
                            <p>You haven't created any custom operational sections yet.</p>
                        </div>
                    ) : (
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {addons.map((addon, index) => (
                                        <tr key={index}>
                                            <td><div className="fw-bold">{addon.name}</div></td>
                                            <td>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="admin-badge badge-resolved">
                                                        {addon.type}
                                                    </span>
                                                    <button className="btn btn-outline-danger shadow-none p-2 border-0" onClick={() => handleDelete(addon.name)} title="Delete Addon">
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

            {/* Create Addon Modal */}
            <Modal
                show={showModal}
                onHide={() => setShowModal(false)}
                centered
                size="sm"
                className="premium-popup"
            >
                <div className="popup-body">
                    <button className="close-btn" onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                        <FaTimes size={16} />
                    </button>

                    <div className="popup-content">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <div className="modal-icon-header">
                                <FaPlusCircle />
                            </div>
                            <div>
                                <h4 className="fw-black m-0" style={{ fontSize: '1.25rem' }}>Create Add-on</h4>
                                <p className="m-0 tiny-text uppercase tracking-widest text-pink fw-bold">Operational Section</p>
                            </div>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            <div className="section-card mb-2">
                                <Form.Group className="mb-2">
                                    <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>Type</Form.Label>
                                    <Form.Control required type="text" className="rounded-12 border-light py-1" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} placeholder="e.g. Access Level" />
                                </Form.Group>
                                <Form.Group className="mb-0">
                                    <Form.Label className="small uppercase fw-bold text-muted tracking-widest mb-1" style={{ fontSize: '10px' }}>Section Name</Form.Label>
                                    <Form.Control required type="text" className="rounded-12 border-light py-1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. VIP Access" />
                                </Form.Group>
                            </div>
                            <div className="d-flex justify-content-center mt-3">
                                <Button type="submit" className="btn btn-pink px-4 rounded-pill py-2 fw-black shadow-glow btn-sm">CREATE SECTION</Button>
                            </div>
                        </Form>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default OrganizerAddons;
