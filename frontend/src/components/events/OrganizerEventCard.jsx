import React from 'react';
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaArrowRight, FaClock, FaEye } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../../config/apiConfig';
import { formatCurrency, resolveImageUrl } from '../../utils/formatUtils';

const OrganizerEventCard = ({ event }) => {
    const navigate = useNavigate();

    const sold = (event.ticketTypes || []).reduce((acc, curr) => acc + (curr.sold || 0), 0);
    const minPrice = (event.ticketTypes || []).length > 0 ? Math.min(...event.ticketTypes.map(t => t.price)) : 0;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
            className="h-100 position-relative"
        >
            <div className="dashboard-card shadow-sm overflow-hidden p-0 border-0 h-100">
                <div className="position-relative" style={{ height: '180px' }}>
                    <img
                        src={resolveImageUrl(event.bannerImage || event.eventImage)}
                        className="h-100 w-100 object-fit-cover"
                        alt={event.title}
                    />


                    {/* Food Banners on Image */}
                    {(event?.foodSettings?.foodType === 'compulsory' || event?.foodSettings?.type === 'compulsory') && (
                        <div className="food-banner-ribbon compulsory">
                            FOOD INCLUDED
                        </div>
                    )}
                    {(event?.foodSettings?.foodType === 'multiple' || event?.foodSettings?.type === 'multiple') && (
                        <div className="food-banner-ribbon multiple">
                            YOU CAN SELECT YOUR MEAL
                        </div>
                    )}
                </div>

                <div className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="flex-grow-1 overflow-hidden">
                            <span className="card-title-sm" style={{ color: '#ec4899', fontSize: '0.7rem' }}>{event.category || 'General'}</span>
                            <h5 className="dashboard-title-main text-truncate m-0" style={{ fontSize: '1.2rem' }}>{event.title}</h5>
                        </div>
                    </div>

                    <div className="d-flex flex-column gap-2 mb-4">
                        <div className="d-flex align-items-center gap-2 text-slate small fw-bold">
                            <FaCalendarAlt className="opacity-40" />
                            <span>{event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2 text-slate small fw-bold">
                            <FaMapMarkerAlt className="opacity-40" />
                            <span className="text-truncate">{event.venue || 'Remote'}</span>
                        </div>
                    </div>

                    <div className="pt-3 border-top d-flex justify-content-between align-items-center mt-auto">
                        <div className="d-flex align-items-center gap-2">
                           <FaUsers className="text-slate opacity-40" />
                           <span className="fw-bold small">{sold} Sold</span>
                        </div>
                        <div className="fw-black text-pink">{formatCurrency(minPrice)}</div>
                    </div>
                </div>

                {/* View Actions Overlay on Hover */}
                <div className="card-actions-overlay position-absolute top-0 end-0 p-3 d-flex gap-2">
                    <button 
                        className="btn btn-sm btn-light rounded-circle shadow-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/organizer/event/${event._id}`); }}
                        title="View Event Details"
                        style={{ width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <FaEye className="text-secondary" />
                    </button>
                </div>

            </div>
        </motion.div>
    );
};

export default OrganizerEventCard;
