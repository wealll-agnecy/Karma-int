import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaTicketAlt,
    FaGlobe,
    FaStar,
    FaUsers,
    FaShieldAlt,
    FaClock,
    FaArrowRight,
    FaCertificate,
    FaChartLine,
    FaUserTie,
    FaMagic,
    FaCrown,
    FaGift,
    FaTrophy
} from 'react-icons/fa';
import './IriLandingPage.css';

const IriLandingPage = () => {
    const navigate = useNavigate();

    const handleBookNow = (packageName) => {
        navigate('/iri-booking', { state: { plan: packageName } });
    };

    const scrollToAgenda = () => {
        const element = document.getElementById('agenda-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Speakers static data as per image_5.png spec
    const speakers = [
        {
            name: "Jayita Das",
            role: "DEMO",
            experience: "No makeup look with water proof",
            image: "/images/speaker_1.png"
        },
        {
            name: "Debjani Dutta",
            role: "DEMO",
            experience: "Drag proof, Water proof, Smudge broof makeup",
            image: "/images/speaker_2.png"
        },
        {
            name: "Monalisa Mukharjee",
            role: "DEMO",
            experience: "Ultra HD glass finishing makeup",
            image: "/images/speaker_3.png"
        },
        {
            name: "Chandrani Mukherjee",
            role: "DEMO",
            experience: "Long lasting, Drag-Proof, Sweat Resistant Flawless Reception Look",
            image: "/images/speaker_4.png"
        },
        {
            name: "Mouparna Adhikary",
            role: "DEMO",
            experience: "Glass skin photo finish long wear makeup look",
            image: "/images/speaker_5.png"
        }
    ];

    // What you will learn static data as per spec
    const courseHighlights = [
        {
            title: "Bridal Makeup",
            desc: "Master flawless bridal looks",
            icon: <FaMagic />
        },
        {
            title: "HD & Airbrush",
            desc: "Learn advanced techniques",
            icon: <FaCrown />
        },
        {
            title: "Celebrity Secrets",
            desc: "Tips & tricks used by top artists",
            icon: <FaStar />
        },
        {
            title: "Client Management",
            desc: "Build & retain high paying clients",
            icon: <FaUserTie />
        },
        {
            title: "Business Growth",
            desc: "Scale your makeup business",
            icon: <FaChartLine />
        },
        {
            title: "Certificate",
            desc: "Get certified & stand out",
            icon: <FaCertificate />
        }
    ];

    // Testimonials static data
    const testimonials = [
        {
            name: "Pooja Desai",
            text: "This event completely changed my career. I learned so much and my confidence has grown to another level!",
            avatar: "/images/speaker_riya.png"
        },
        {
            name: "Muskan Ali",
            text: "Amazing artists, amazing experience! Worth every penny. Highly recommended for all artists.",
            avatar: "/images/speaker_neha.png"
        },
        {
            name: "Simran Kaur",
            text: "The best makeup event I have ever attended. Will join again for sure!",
            avatar: "/images/speaker_sakshi.png"
        }
    ];

    // Timeline data
    const agendaTimeline = [
        { time: "10:00 AM – 11:00 AM", desc: "Registration & Welcome" },
        { time: "11:00 AM – 01:00 PM", desc: "Bridal Makeup Masterclass" },
        { time: "01:00 PM – 02:00 PM", desc: "Lunch Break" },
        { time: "02:00 PM – 04:00 PM", desc: "HD & Airbrush Demo" },
        { time: "04:00 PM – 05:30 PM", desc: "Business Growth Session" },
        { time: "05:30 PM – 06:00 PM", desc: "Q&A & Certificate Distribution" }
    ];

    return (
        <div className="landing-wrapper">
            {/* Hero Section */}
            <section className="hero-section" id="home">
                <div className="hero-image-wrap">
                    <div className="hero-image-glow"></div>
                    <img
                        src="/images/mastery_hero.png"
                        alt="IRI Apex Makeup Hero model"
                        className="hero-image"
                    />
                    <div className="conclave-overlay-card">
                        <div className="conclave-overlay-border-top"></div>
                        <div className="conclave-overlay-inner">
                            <span className="conclave-overlay-deco">✦</span>
                            <span className="conclave-overlay-title">MAKEUP CONCLAVE 1.0</span>
                            <span className="conclave-overlay-deco">✦</span>
                        </div>
                        <div className="conclave-overlay-border-bottom"></div>
                        <div className="conclave-overlay-shimmer"></div>
                    </div>
                </div>
                <div className="hero-features">
                    <div className="hero-feature-item">
                        <div className="hero-feature-icon-wrap">
                            <FaCalendarAlt />
                        </div>
                        <div className="hero-feature-text">
                            11 JULY 2026
                            <span className="hero-feature-subtext">9 AM TO 7PM</span>
                        </div>
                    </div>

                    <div className="hero-feature-item">
                        <div className="hero-feature-icon-wrap">
                            <FaMapMarkerAlt />
                        </div>
                        <div className="hero-feature-text">
                            SILIGURI
                            <span className="hero-feature-subtext">Montana Vista</span>
                        </div>
                    </div>

                    <div className="hero-feature-item">
                        <div className="hero-feature-icon-wrap">
                            <FaTicketAlt />
                        </div>
                        <div className="hero-feature-text">
                            LIMITED SEATS
                            <span className="hero-feature-subtext">Book Your Seat Now</span>
                        </div>
                    </div>
                </div>

                <div className="hero-buttons">
                    <button
                        className="hero-btn-primary"
                        onClick={() => handleBookNow('Regular')}
                    >
                        BOOK NOW <FaArrowRight />
                    </button>
                    <button
                        className="hero-btn-secondary"
                        onClick={scrollToAgenda}
                    >
                        VIEW AGENDA
                    </button>
                </div>



            </section>

            {/* Partners Banner Section */}
            <section className="partners-banner-section">
                <img 
                    src="/images/partners_banner.png" 
                    alt="Partners and Contact" 
                    className="partners-banner-img"
                />
            </section>

            {/* Key Metrics Section */}


            {/* Speakers Section */}
            <section className="speakers-section" id="speakers">
                <div className="section-header-wrap">
                    <h2 className="section-title"><i>LEARN FROM INDUSTRY EXPERTS</i></h2>
                </div>

                <div className="speakers-grid">
                    {speakers.map((s, idx) => (
                        <div className="speaker-card" key={idx}>
                            <div className="speaker-image-frame">
                                <img src={s.image} alt={s.name} className="speaker-img" />
                            </div>
                            <h3 className="speaker-name">{s.name}</h3>
                            <p className="speaker-role">{s.role}</p>
                            <span className="speaker-exp-badge">{s.experience}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* What You'll Learn Section */}
            <section className="learn-section">
                <div className="section-header-wrap">
                    <h2 className="section-title">WHAT YOU'LL LEARN</h2>
                </div>

                <div className="learn-grid">
                    {courseHighlights.map((ch, idx) => (
                        <div className="learn-card" key={idx}>
                            <div className="learn-icon-wrap">{ch.icon}</div>
                            <h3 className="learn-title">{ch.title}</h3>
                            <p className="learn-desc">{ch.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Entry Tickets Section */}
            <section className="tickets-section" id="agenda-section">
                <div className="section-header-wrap">
                    <h2 className="section-title">CHOOSE YOUR ENTRY PASS</h2>
                </div>

                <div className="tickets-grid">
                    {/* Early Bird Ticket Card */}


                    {/* Regular Ticket Card */}
                    <div className="ticket-card premium-pink">
                        <div className="ticket-badge-glow"></div>
                        <div className="ticket-header">
                            <span className="ticket-badge">STANDARD ENTRY</span>
                            <h3 className="ticket-name">ENTRY FEES</h3>
                            <p className="ticket-subtitle">General Admission</p>
                        </div>
                        <div className="ticket-price-wrap">
                            <span className="currency">₹</span>
                            <span className="price">3000</span>
                        </div>
                        <div className="ticket-details-list">
                            <div className="ticket-detail-item">
                                <FaCalendarAlt className="ticket-detail-icon" />
                                <span>11 July 2026, Saturday</span>
                            </div>
                            <div className="ticket-detail-item">
                                <FaClock className="ticket-detail-icon" />
                                <span>09:00 AM – 07:00 PM</span>
                            </div>
                            <div className="ticket-detail-item">
                                <FaMapMarkerAlt className="ticket-detail-icon" />
                                <span>Montana Vista, Siliguri</span>
                            </div>
                        </div>
                        <ul className="ticket-benefits">
                            <li><FaStar className="benefit-star" /> Full Masterclass Access</li>
                            <li><FaStar className="benefit-star" /> Live Q&A & Certification</li>
                            <li><FaStar className="benefit-star" /> Standard seating area</li>
                            <li className="disabled"><FaStar className="benefit-star" /> No Goodie Bag included</li>
                        </ul>
                        <button
                            className="ticket-book-btn pink-btn"
                            onClick={() => handleBookNow('Regular')}
                        >
                            BOOK NOW
                        </button>
                    </div>
                </div>
            </section>

            {/* Event Agenda Timeline Section */}
            <section className="agenda-section-wrap" id="agenda">
                <div className="section-header-wrap">
                    <h2 className="section-title">EVENT AGENDA</h2>
                </div>

                <div className="agenda-container-new">
                    <div className="agenda-timeline-new">
                        {agendaTimeline.map((item, idx) => (
                            <div className="agenda-item-new" key={idx}>
                                <div className="agenda-dot-new"></div>
                                <div className="agenda-time-new">{item.time}</div>
                                <div className="agenda-content-new">{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials section */}


            <section className="metrics-section" id="event">
                <div className="metrics-container">
                    <div className="metric-col">
                        <div className="metric-icon-wrap"><FaUsers /></div>
                        <span className="metric-number">5000+</span>
                        <span className="metric-label">Artists Trained</span>
                    </div>

                    <div className="metric-col">
                        <div className="metric-icon-wrap"><FaGlobe /></div>
                        <span className="metric-number">50+</span>
                        <span className="metric-label">Cities Reached</span>
                    </div>

                    <div className="metric-col">
                        <div className="metric-icon-wrap"><FaTrophy /></div>
                        <span className="metric-number">20+</span>
                        <span className="metric-label">Industry Experts</span>
                    </div>

                    <div className="metric-col">
                        <div className="metric-icon-wrap"><FaShieldAlt /></div>
                        <span className="metric-number">4.9/5</span>
                        <span className="metric-label">Average Rating</span>
                    </div>
                </div>
            </section>

            {/* Final Call to Action */}
            <section className="cta-section" id="contact">
                <div className="terms-container">
                    <h2 className="section-title" style={{ width: '100%', justifyContent: 'center', marginBottom: '30px' }}>
                        TERMS & CONDITIONS
                    </h2>
                    <ul className="terms-list">
                        <li><strong>Ticket Policy:</strong> All ticket sales are final. No refunds, cancellations, or transfers are permitted under any circumstances.</li>
                        <li><strong>Entry Requirements:</strong> A valid government-issued ID and the original booking confirmation email must be presented at the venue for entry.</li>
                        <li><strong>Right of Admission:</strong> Management reserves the right of admission and may remove any attendee violating event rules or causing disruption.</li>
                        <li><strong>Photography/Videography:</strong> Recording the masterclass or using professional cameras is strictly prohibited unless authorized by the organizers.</li>
                        <li><strong>Timings:</strong> Please arrive at the venue at least 30 minutes prior to the scheduled start time to ensure smooth registration.</li>
                        <li><strong>Liability:</strong> The organizers are not responsible for any loss, theft, or damage to personal belongings during the event.</li>
                    </ul>
                </div>
            </section>
        </div>
    );
};

export default IriLandingPage;
