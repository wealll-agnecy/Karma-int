import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt } from 'react-icons/fa';
import { getEvents } from '../api/eventApi';
import './KarmaLandingPage.css';

const KarmaLandingPage = () => {
    const navigate = useNavigate();
    const [eventDetails, setEventDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    const trainers = [
        {
            name: "Harsh Dave",
            role: "Professional Makeup Artist and Beauty Educator",
            image: "/images/harsh_dave.png",
            tag: "Iconic Makeup Educator · 15+ Years Experience",
            bullets: [
                "Harsh Dave is a renowned makeup artist and beauty educator known for his creative artistry",
                "professional techniques, and impactful beauty training sessions.",
                "With expertise in makeup, hairstyling, and advanced beauty education",
                " he has inspired aspiring artists through workshops and masterclasses across the industry."
            ]
        },
        {
            name: "Richa Dave",
            role: "Indian makeup artist and Beauty Educator",
            image: "/images/richa_dave.png",
            tag: "Celebrity Makeup Artist · Co-Founder of Jasmine Beauty Care",
            bullets: [
                "Richa Dave is an internationally recognized makeup artist, beauty educator.",
                "entrepreneur known for her signature bridal transformations, advanced artistry techniques, and impactful beauty masterclasses.",
                "As the face behind Jasmine Beauty Care.",
                "she has inspired thousands of aspiring artists through her creativity, innovation, and industry expertise."
            ]
        },
        {
            name: "Prarthit Dave",
            role: "Professional hairstylist and Beauty Artist",
            image: "/images/prarthit_dave.png",
            tag: "Creative Director & Stylist · Hair Styling & Media Expert",
            bullets: [
                "Prarthi Dave is a professional hairstylist and beauty artist known for her creative hairstyling techniques",
                "bridal transformations, and contribution to advanced beauty education with Jasmine Beauty Care."
            ]
        }
    ];

    const [activeTrainer, setActiveTrainer] = useState(0);
    const [activeReel, setActiveReel] = useState(1);
    const [playingReel, setPlayingReel] = useState(null);
    const [activeCerSlide, setActiveCerSlide] = useState(0);
    const [isHoveredCer, setIsHoveredCer] = useState(false);
    const [isTransitioningCer, setIsTransitioningCer] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await getEvents({ limit: 1 });
                const eventList = res.data?.data || res.data?.events || (Array.isArray(res.data) ? res.data : null);
                if (eventList && eventList.length > 0) {
                    setEventDetails(eventList[0]);
                }
            } catch (err) {
                console.error('Failed to fetch event directly from backend endpoint:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, []);

    const activeTrainersList = (() => {
        const dbSpeakers = eventDetails?.landingPageConfig?.sections?.speakers?.items;
        if (dbSpeakers && dbSpeakers.length > 0) {
            return dbSpeakers.map((s, idx) => {
                let defaultImg = "/images/richa_dave.png";
                if (idx === 0) defaultImg = "/images/harsh_dave.png";
                if (idx === 2) defaultImg = "/images/prarthit_dave.png";
                const img = (s.image && s.image !== 'no-photo.jpg' && s.image !== '') ? s.image : defaultImg;
                return {
                    name: s.name,
                    role: s.role || s.company || "",
                    image: img,
                    tag: s.company || s.role || "",
                    bullets: s.bio ? s.bio.split('\n').filter(b => b.trim()) : [
                        "Direct mentorship and hands-on styling coaching.",
                        "Learn signature looks and portfolio styling tips.",
                        "Step-by-step masterclass instruction."
                    ]
                };
            });
        }
        return trainers;
    })();

    useEffect(() => {
        if (playingReel !== null) return;
        const interval = setInterval(() => {
            setActiveReel((prev) => (prev + 1) % 6);
        }, 3000);
        return () => clearInterval(interval);
    }, [playingReel]);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTrainer((prev) => (prev + 1) % activeTrainersList.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [activeTrainersList.length]);

    useEffect(() => {
        if (isHoveredCer) return;
        const interval = setInterval(() => {
            setIsTransitioningCer(true);
            setActiveCerSlide((prev) => prev + 1);
        }, 3000);
        return () => clearInterval(interval);
    }, [isHoveredCer]);

    const handleCerTransitionEnd = () => {
        if (activeCerSlide >= 8) {
            setIsTransitioningCer(false);
            setActiveCerSlide(0);
        }
    };

    const handleBookNow = (packageName) => {
        navigate('/karma-booking', { state: { plan: packageName } });
    };

    const getTicketPrice = (name, fallback) => {
        const ticket = eventDetails?.ticketTypes?.find(t => t.name === name);
        return ticket ? `₹ ${Number(ticket.price).toLocaleString('en-IN')}/-` : fallback;
    };

    const formatEventDate = () => {
        if (!eventDetails?.date) {
            return <>17<span className="superscript">TH</span> TO 21<span className="superscript">ST</span>, AUGUST, 2026</>;
        }
        const d = new Date(eventDetails.date);
        const getDayWithSuffix = (date) => {
            const day = date.getDate();
            if (day > 3 && day < 21) return `${day}TH`;
            switch (day % 10) {
                case 1: return `${day}ST`;
                case 2: return `${day}ND`;
                case 3: return `${day}RD`;
                default: return `${day}TH`;
            }
        };

        if (eventDetails.endDate && new Date(eventDetails.date).toDateString() !== new Date(eventDetails.endDate).toDateString()) {
            const endD = new Date(eventDetails.endDate);
            const startStr = getDayWithSuffix(d);
            const endStr = getDayWithSuffix(endD);
            const monthStr = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
            const yearStr = d.getFullYear();
            const parseDay = (dayStr) => {
                const num = dayStr.slice(0, -2);
                const suffix = dayStr.slice(-2);
                return <>{num}<span className="superscript">{suffix}</span></>;
            };
            return <>{parseDay(startStr)} TO {parseDay(endStr)}, {monthStr}, {yearStr}</>;
        } else {
            const dayStr = getDayWithSuffix(d);
            const monthStr = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
            const yearStr = d.getFullYear();
            const num = dayStr.slice(0, -2);
            const suffix = dayStr.slice(-2);
            return <>{num}<span className="superscript">{suffix}</span>, {monthStr}, {yearStr}</>;
        }
    };

    const renderEventTitle = () => {
        const title = eventDetails?.title || "Basic To Advanced Masterclass";
        const match = title.match(/^(.*?)(Master\s*class|Master\s*Class)(.*)$/i);
        if (match) {
            const prefix = match[1].trim();
            const main = (match[2] + match[3]).trim();
            return (
                <>
                    <h2 className="basic-advanced-title">{prefix}</h2>
                    <h1 className="masterclass-title">{main}</h1>
                </>
            );
        } else {
            return (
                <>
                    <h2 className="basic-advanced-title">Basic To Advanced</h2>
                    <h1 className="masterclass-title">{title}</h1>
                </>
            );
        }
    };

    const contactPhone = eventDetails?.organizer?.phone || "87775 02600";
    const contactName = eventDetails?.organizer?.name || "ANJANA ROY";

    return (
        <div className="landing-wrapper">
            {/* Main Banner Section */}
            <div className="karma-event-page">
                <div className="karma-event-content">
                    {/* 3-Person Gallery (Overlapped) */}
                    <div className="speakers-gallery">
                        <div className="speaker-card-side left-side">
                            <img
                                src="/images/harsh_dave.png"
                                alt="Harsh Dave"
                                className="speaker-img"
                            />
                        </div>

                        <div className="speaker-card-center">
                            <img
                                src="/images/richa_dave.png"
                                alt="Richa Dave"
                                className="speaker-img center-img"
                            />
                        </div>

                        <div className="speaker-card-side right-side">
                            <img
                                src="/images/prarthit_dave.png"
                                alt="Prarthi Dave"
                                className="speaker-img"
                            />
                        </div>
                    </div>

                    {renderEventTitle()}

                    {/* Date Badge */}
                    <div className="date-badge">
                        <FaCalendarAlt className="date-icon" />
                        <p className="date-text">{formatEventDate()}</p>
                    </div>

                    {/* Bottom Speaker Names & Descriptions Row */}
                    {/* <div className="footer-divider-line"></div> */}
                    {/* <div className="speakers-info-row">
                        <div className="speaker-info-col">
                            <h3 className="info-name">Richa Dave</h3>
                            <p className="info-title">The Iconic Makeup Educator</p>
                        </div>
                        <div className="speaker-info-col">
                            <h3 className="info-name">Harsh Dave</h3>
                            <p className="info-title">The Iconic Makeup Educator</p>
                        </div>
                        <div className="speaker-info-col">
                            <h3 className="info-name">Prarthi Dave</h3>
                            <p className="info-title">Iconic Hair Stylist & Educator</p>
                        </div>
                    </div> */}

                    {/* Partner Grid Section */}
                    <div className="footer-divider-line"></div>
                    <div className="partners-logos-row">
                        <div className="partners-logo-col">
                            <span className="partner-label">HOSTED BY</span>
                            <div className="partner-logos-group">

                                <img
                                    src="/images/sb_logo.png"
                                    alt="SB International Logo"
                                    className="partner-logo-img"
                                />
                            </div>
                        </div>
                        <div className="partners-logo-col">
                            <span className="partner-label">PRESENTED & ORGANIZED BY</span>
                            <div className="partner-logos-group">

                                <img
                                    src="/images/karma_logo.png"
                                    alt="Karma Internationals Logo"
                                    className="partner-logo-img"
                                />
                            </div>
                        </div>
                        <div className="partners-logo-col">
                            <span className="partner-label">Digital Partner</span>
                            <div className="partner-logos-group">
                                <img
                                    src="/images/Wealll_new.png"
                                    alt="Wealll Logo"
                                    className="partner-logo-img"
                                />
                            </div>
                        </div>
                        <div className="partners-logo-col">
                            <span className="partner-label">Technical Partner</span>
                            <div className="partner-logos-group">
                                <img
                                    src="/images/growth_utsav.png"
                                    alt="Growth Utsav Logo"
                                    className="partner-logo-img"
                                />
                            </div>
                        </div>
                        <div className="partners-logo-col">
                            <span className="partner-label">Makeup Partner</span>
                            <div className="partner-logos-group">
                                <img
                                    src="/images/aflairza_logo.png"
                                    alt="Aflairza Logo"
                                    className="partner-logo-img"
                                />
                                &amp;
                                <img src="/images/recode_logo_new.png" alt="" className="partner-logo-img" />
                            </div>
                        </div>


                    </div>
                    <div className="footer-divider-line"></div>
                </div>
            </div>

            {/* Partners / Slider Section (Outside Banner) */}
            <div className="partners-section">
                <div className="partners-content-row">
                    <div className="partners-title-container">
                        <h2 className="partners-title">
                            <span className="gold-text">Karma</span><br />International <br />Featured
                        </h2>
                    </div>
                    <div className="marquee-container">
                        <div className="marquee-track">
                            {/* Original Set */}
                            <div className="marquee-item"><img src="/images/client_logo1.png" alt="Client 1" /></div>
                            <div className="marquee-item"><img src="/images/client_logo2.png" alt="Client 2" /></div>
                            <div className="marquee-item"><img src="/images/client_logo3.png" alt="Client 3" /></div>
                            <div className="marquee-item"><img src="/images/client_logo4.png" alt="Client 4" /></div>
                            <div className="marquee-item"><img src="/images/client_logo5.png" alt="Client 5" /></div>
                            <div className="marquee-item"><img src="/images/client_logo6.png" alt="Client 6" /></div>
                            {/* Duplicate Set for Infinite Scroll Loop */}
                            <div className="marquee-item"><img src="/images/client_logo1.png" alt="Client 1" /></div>
                            <div className="marquee-item"><img src="/images/client_logo2.png" alt="Client 2" /></div>
                            <div className="marquee-item"><img src="/images/client_logo3.png" alt="Client 3" /></div>
                            <div className="marquee-item"><img src="/images/client_logo4.png" alt="Client 4" /></div>
                            <div className="marquee-item"><img src="/images/client_logo5.png" alt="Client 5" /></div>
                            <div className="marquee-item"><img src="/images/client_logo6.png" alt="Client 6" /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meet Your Trainer Section */}
            <section className="mtn-section">
                <div className="mtn-wrap">
                    <div className="mtn-photo-col mtn-insta-col">
                        <video
                            src="/videos/richa_dave.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="trainer-local-video"
                        ></video>
                    </div>
                    <div className="mtn-content-col">
                        <p className="mtn-eyebrow">Meet Your Trainer</p>

                        {activeTrainersList.map((t, idx) => (
                            <div key={idx} className={`mtn-details ${idx === activeTrainer ? 'active' : ''}`}>
                                <h2 className="mtn-name">{t.name}</h2>
                                <p className="mtn-role mb-3 mb-md-4">{t.role}</p>
                                <ul className="mtn-list">
                                    {t.bullets.map((bullet, bIdx) => (
                                        <li className="mtn-list__item" key={bIdx}>
                                            <span className="mtn-list__dot"></span>
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mtn-divider"></div>
                                <div className="mtn-author">
                                    <div className="mtn-author__info">
                                        <span className="mtn-author__name">{t.name}</span>
                                        <span className="mtn-author__tag">{t.tag}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Slider Dots */}
                        <div className="mtn-dots">
                            {activeTrainersList.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`mtn-dot ${idx === activeTrainer ? 'active' : ''}`}
                                    onClick={() => setActiveTrainer(idx)}
                                    aria-label={`Go to trainer ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="price-section">
                <div className="container">
                    <h2 className="text-center"><span className="golden-text-gradient">Choose Your Experience</span></h2>
                    <p className="text-center">Select the perfect package</p>
                    <div className="row pt-40 justify-content-center g-4">
                        {/* Package 1 */}
                        <div className="col-md-6 col-lg-5">
                            <div className="ticket-card glass-effect">
                                <div className="text-center">
                                    <h3>Package - 1</h3>
                                    <span className="price golden-text-gradient">{getTicketPrice('Package 1', '₹ 20,000/-')}</span>
                                    <ul>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Learn 2 Complete Looks Every Day (Makeup & Hair)
                                        </li>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Participants will receive a Framed Certificate
                                        </li>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            A Customised Trophy
                                        </li>

                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Selfie and Photo with the Jasmine Beauty Care Team
                                        </li>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Breakfast | Lunch | Hi-Tea
                                        </li>
                                    </ul>
                                    <button className="book_now_btn golden-gradient" onClick={() => handleBookNow('Package 1')}>Book Now</button>
                                </div>
                            </div>
                        </div>

                        {/* Package 2 */}
                        <div className="col-md-6 col-lg-5">
                            <div className="ticket-card glass-effect vip-card">
                                <div className="text-center">
                                    <h3>Package - 2</h3>
                                    <span className="price golden-text-gradient">{getTicketPrice('Package 2', '₹ 30,000/-')}</span>
                                    <ul>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Learn 2 Complete Looks Every Day (Makeup & Hair)
                                        </li>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Private Hands-on Practice Sessions by Team Jasmine Beauty Care
                                        </li>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Participants will receive a Framed Certificate
                                        </li>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            A Customised Trophy
                                        </li>

                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Selfie and Photo with the Entire Team Promotional Video shared
                                        </li>
                                        <li>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round" className="text-yellow-400 flex-shrink-0">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Breakfast | Lunch | Hi-Tea
                                        </li>
                                    </ul>
                                    <button className="book_now_btn golden-gradient" onClick={() => handleBookNow('Package 2')}>Book Now</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Exclusive Bonuses Section */}
            <div className="bonuses-section-vsl">
                <div className="container">
                    <div className="bonuses-content text-center">
                        <h2 className="heading my-0"><span className="white-text">Exclusive</span> <span className="golden-text-gradient">Bonuses</span></h2>
                        <div className="tickets mt-3">
                            {/* Bonus 1 */}
                            <div className="ticket">
                                <div className="ticket-body">
                                    <span className="notch notch-tl"></span>
                                    <span className="notch notch-bl"></span>
                                    <span className="notch notch-l"></span>
                                    <span className="notch notch-r"></span>
                                    <div className="ticket-stub">
                                        <span className="stub-label">Bonus Pass</span>
                                        <div className="stub-icon">
                                            <div className="stub-num">01</div>
                                        </div>

                                        {/* <div className="stub-num-label">Bonus</div> */}
                                    </div>
                                    <div className="ticket-main">

                                        <div className="ticket-text-content">
                                            <h3 className="ticket-title"> Learn the latest Trending Makeup Looks & Signature Hairstyles </h3>

                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Bonus 2 */}
                            <div className="ticket">
                                <div className="ticket-body">
                                    <span className="notch notch-tl"></span>
                                    <span className="notch notch-bl"></span>
                                    <span className="notch notch-l"></span>
                                    <span className="notch notch-r"></span>
                                    <div className="ticket-stub">
                                        <span className="stub-label">Bonus Pass</span>
                                        <div className="stub-icon">
                                            <div className="stub-num">02</div>
                                        </div>

                                        {/* <div className="stub-num-label">Bonus</div> */}
                                    </div>
                                    <div className="ticket-main">

                                        <div className="ticket-text-content">
                                            <h3 className="ticket-title">In-depth knowledge of Drugstore & Luxury/High-End Products</h3>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Bonus 3 */}
                            <div className="ticket">
                                <div className="ticket-body">
                                    <span className="notch notch-tl"></span>
                                    <span className="notch notch-bl"></span>
                                    <span className="notch notch-l"></span>
                                    <span className="notch notch-r"></span>
                                    <div className="ticket-stub">
                                        <span className="stub-label">Bonus Pass</span>
                                        <div className="stub-icon">
                                            <div className="stub-num">03</div>
                                        </div>

                                        {/* <div className="stub-num-label">Bonus</div> */}
                                    </div>
                                    <div className="ticket-main">

                                        <div className="ticket-text-content">
                                            <h3 className="ticket-title">Professional Hands-On Practice Sessions</h3>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Bonus 4 */}
                            <div className="ticket">
                                <div className="ticket-body">
                                    <span className="notch notch-tl"></span>
                                    <span className="notch notch-bl"></span>
                                    <span className="notch notch-l"></span>
                                    <span className="notch notch-r"></span>
                                    <div className="ticket-stub">
                                        <span className="stub-label">Bonus Pass</span>
                                        <div className="stub-icon">
                                            <div className="stub-num">04</div>
                                        </div>

                                        {/* <div className="stub-num-label">Bonus</div> */}
                                    </div>
                                    <div className="ticket-main">

                                        <div className="ticket-text-content">
                                            <h3 className="ticket-title">Understanding of Product Selection for Different Skin Types & Textures </h3>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Bonus 5 */}
                            <div className="ticket">
                                <div className="ticket-body">
                                    <span className="notch notch-tl"></span>
                                    <span className="notch notch-bl"></span>
                                    <span className="notch notch-l"></span>
                                    <span className="notch notch-r"></span>
                                    <div className="ticket-stub">
                                        <span className="stub-label">Bonus Pass</span>
                                        <div className="stub-icon">
                                            <div className="stub-num">05</div>
                                        </div>

                                        {/* <div className="stub-num-label">Bonus</div> */}
                                    </div>
                                    <div className="ticket-main">

                                        <div className="ticket-text-content">
                                            <h3 className="ticket-title">Tips & Techniques for Bridal, Glam & Editorial Finishes</h3>

                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Bonus 6 */}
                            <div className="ticket">
                                <div className="ticket-body">
                                    <span className="notch notch-tl"></span>
                                    <span className="notch notch-bl"></span>
                                    <span className="notch notch-l"></span>
                                    <span className="notch notch-r"></span>
                                    <div className="ticket-stub">
                                        <span className="stub-label">Bonus Pass</span>
                                        <div className="stub-icon">
                                            <div className="stub-num">06</div>
                                        </div>

                                        {/* <div className="stub-num-label">Bonus</div> */}
                                    </div>
                                    <div className="ticket-main">

                                        <div className="ticket-text-content">
                                            <h3 className="ticket-title">Guidance on Client Handling & Professional Presentation </h3>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA button at the bottom of bonuses */}
                        <div className="bonuses-cta-container mt-5 pt-3">
                            <button className="golden-gradient px-5 py-3 fs-5 font-weight-bold" onClick={() => handleBookNow('Package 2')}>
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Satisfied MUA's Reels Slider Section */}
            <section className="mua-section">
                <div className="container">
                    <h2 className="mua-heading">Thousands of Satisfied <em>MUA'S</em></h2>

                    <div className="mua-slider-container">
                        <button className="mua-arrow prev" onClick={() => setActiveReel((prev) => (prev - 1 + 6) % 6)} aria-label="Previous reel">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>

                        <div className="mua-slider-track">
                            {[0, 1, 2, 3, 4, 5].map((idx) => {
                                const reelId = [
                                    "841316029025589",
                                    "1125577746349061",
                                    "25409302808748175",
                                    "1297002459160483",
                                    "865156539911454",
                                    "788776383718576"
                                ][idx];

                                let cardClass = "mua-card";
                                if (idx === activeReel) {
                                    cardClass += " active";
                                } else if (idx === (activeReel - 1 + 6) % 6) {
                                    cardClass += " prev";
                                } else if (idx === (activeReel + 1) % 6) {
                                    cardClass += " next";
                                } else {
                                    cardClass += " hidden";
                                }

                                return (
                                    <div
                                        key={idx}
                                        className={cardClass}
                                        onClick={() => {
                                            if (activeReel !== idx) {
                                                setActiveReel(idx);
                                                setPlayingReel(null);
                                            }
                                        }}
                                    >
                                        <div className="mua-video-wrapper">
                                            <iframe
                                                src={`https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F${reelId}%2F&show_text=0&t=0`}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 'none', overflow: 'hidden' }}
                                                scrolling="no"
                                                frameBorder="0"
                                                allowFullScreen={true}
                                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                                title={`Satisfied MUA Reel ${idx + 1}`}
                                            ></iframe>

                                            {playingReel !== idx && (
                                                <div
                                                    className="mua-video-overlay"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (activeReel === idx) {
                                                            setPlayingReel(idx);
                                                        } else {
                                                            setActiveReel(idx);
                                                            setPlayingReel(null);
                                                        }
                                                    }}
                                                >
                                                    <div className="mua-reel-badge">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                                                            <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h2V1H13a5 5 0 0 0-5 5v2z" />
                                                        </svg>
                                                        REELS
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button className="mua-arrow next" onClick={() => setActiveReel((prev) => (prev + 1) % 6)} aria-label="Next reel">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>

                    {/* Navigation Dots */}
                    <div className="mua-dots">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                            <button
                                key={idx}
                                className={`mua-dot ${idx === activeReel ? 'active' : ''}`}
                                onClick={() => setActiveReel(idx)}
                                aria-label={`Go to reel ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Your 5-Day Journey Section */}
            <section className="pgd-section">
                <div className="container">
                    <h2 className="pgd-heading">Your <em>5-Day</em> Journey</h2>
                    <div className="pgd-track">
                        <div className="pgd-line"></div>

                        {/* Day 1 */}
                        <div className="pgd-step">
                            <div className="pgd-circle"><span className="pgd-num">01</span></div>
                            <div className="pgd-content">
                                <h3 className="pgd-title">Skin Prep & Base</h3>
                                <p className="pgd-desc">Master flawless glass skin base, color correction, and contouring techniques.</p>
                            </div>
                        </div>

                        {/* Day 2 */}
                        <div className="pgd-step">
                            <div className="pgd-circle"><span className="pgd-num">02</span></div>
                            <div className="pgd-content">
                                <h3 className="pgd-title">Eye Makeup Mastery</h3>
                                <p className="pgd-desc">Learn advanced smoky eyes, cut crease, glitter application, and liner precision.</p>
                            </div>
                        </div>

                        {/* Day 3 */}
                        <div className="pgd-step">
                            <div className="pgd-circle"><span className="pgd-num">03</span></div>
                            <div className="pgd-content">
                                <h3 className="pgd-title">Bridal & Glam Looks</h3>
                                <p className="pgd-desc">Create iconic Indian traditional bridal and high-fashion red carpet glam looks.</p>
                            </div>
                        </div>

                        {/* Day 4 */}
                        <div className="pgd-step">
                            <div className="pgd-circle"><span className="pgd-num">04</span></div>
                            <div className="pgd-content">
                                <h3 className="pgd-title">Hair Styling Art</h3>
                                <p className="pgd-desc">Understand hair texturing, red-carpet updos, volume creation, and detailing.</p>
                            </div>
                        </div>

                        {/* Day 5 */}
                        <div className="pgd-step">
                            <div className="pgd-circle"><span className="pgd-num">05</span></div>
                            <div className="pgd-content">
                                <h3 className="pgd-title">Business & Portfolio</h3>
                                <p className="pgd-desc">Learn client acquisition, pricing strategies, social media branding, and professional photography.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* This Masterclass Is For You If Section */}
            <section className="mify-section">
                <div className="container">
                    <div className="mify-card">
                        <h2 className="mify-heading">This Masterclass Is <em>For You If...</em></h2>
                        <div className="mify-grid">
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text"> You wish to learn the latest trending bridal, glam & fashion looks.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text">You want hands-on experience with industry techniques & professional finishing.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text">You’re struggling with product selection, blending, or skin preparation.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text">You want to build a strong career in the beauty & makeup industry.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text">You wish to gain confidence in handling real clients professionally.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text">You want to understand both drugstore and luxury product usage.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text">You’re looking to create portfolio-worthy makeup looks.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text">You want to learn directly from renowned industry experts.</p>
                            </div>
                            <div className="mify-item">
                                <div className="mify-icon-wrap">
                                    <svg className="mify-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                                <p className="mify-text"> You are passionate about beauty, creativity, and becoming a better artist every day.</p>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            {/* About Host Section */}

            <section className="about-ki-section">
                <div className="container">
                    <div className="about-ki-wrap">
                        <div className="about-ki-photo-container">
                            <img alt="Karma International" className="about-ki-img" src="/images/about_img.jpeg" />
                        </div>
                        <div className="about-ki-content-col">
                            <p className="about-ki-eyebrow">ABOUT KARMA INTERNATIONAL</p>
                            <h2 className="about-ki-title">Meet <em>Karma International</em></h2>
                            <p className="about-ki-desc">Karma International is a premier global fashion, style, and lifestyle platform. Over the years, we have hosted prestigious fashion awards, grand carnivals, industry seminars, and specialized masterclass training sessions designed to elevate makeup artists, hair stylists, and beauty entrepreneurs.</p><p className="about-ki-mission"><em>Mission:</em> To train and certify passionate beauty professionals globally.</p>
                            <div className="about-ki-divider"></div>
                            <div className="about-ki-stats-grid">
                                <div className="about-ki-stat-card">
                                    <div className="about-ki-stat-val">27+</div>
                                    <div className="about-ki-stat-label">Years of Fashion & Styling Excellence</div>
                                </div>
                                <div className="about-ki-stat-card"><div className="about-ki-stat-val">100+</div><div className="about-ki-stat-label">Awards & Grand Carnivals Hosted</div></div><div className="about-ki-stat-card"><div className="about-ki-stat-val">3lacs+</div><div className="about-ki-stat-label">Students Trained in Seminars &amp; Classes</div></div><div className="about-ki-stat-card"><div className="about-ki-stat-val">14.2k+</div><div className="about-ki-stat-label">Active Global Community Followers</div></div></div></div></div></div></section>



            {/* Certification Slider Section */}
            <section className="cer-section">
                <div className="container">
                    <h2 className="cer-heading">Certification &amp; <em>Recognition</em></h2>
                    <div
                        className="cer-slider-container"
                        onMouseEnter={() => setIsHoveredCer(true)}
                        onMouseLeave={() => setIsHoveredCer(false)}
                    >
                        <div
                            className="cer-slider-track"
                            style={{
                                transform: `translateX(calc(-1 * ${activeCerSlide} * var(--cer-slide-width, 25%)))`,
                                transition: isTransitioningCer ? 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
                            }}
                            onTransitionEnd={handleCerTransitionEnd}
                        >
                            {[0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3].map((num, idx) => (
                                <div className="cer-card" key={idx}>
                                    <div className="cer-img-frame">
                                        <img src={`/images/award${num + 1}.jpg`} alt={`Certificate ${num + 1}`} className="cer-img" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Terms and Conditions Section */}
            <section className="tnc-section" style={{ backgroundImage: "url('/images/banner_bg.jpeg')" }}>
                <div className="tnc-container">
                    <div className="tnc-logo-header">
                        <span className="tnc-presented">PRESENTED & ORGANIZED BY</span>
                        <img src="/images/karma_logo.png" alt="Karma International" className="tnc-karma-logo" />
                    </div>

                    <div className="tnc-card glass-effect">
                        <div className="tnc-card-layout">
                            <div className="tnc-left-col">
                                <h2 className="tnc-title"><span className="tnc-yellow">TERMS & CONDITIONS</span> APPLY</h2>
                                <div className="tnc-list-container">
                                    <ul className="tnc-list">
                                        <li><span className="tnc-bullet">•</span> Booking amount is non-refundable & non-adjustable</li>
                                        <li><span className="tnc-bullet">•</span> Full advance payment required</li>
                                        <li><span className="tnc-bullet">•</span> Seats will be allocated on a first-come, first-served basis<br />early bookings get front-row access.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="tnc-vertical-separator"></div>

                            <div className="tnc-right-col">
                                <div className="tnc-contact-info">
                                    <span className="tnc-inquiries">FOR BOOKINGS AND INQUIRIES:</span>
                                    <h3 className="tnc-contact">CONTACT: <span className="tnc-yellow">{contactPhone}</span></h3>
                                    <div className="tnc-contact-name">{contactName}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sticky Footer */}
            <div className="sticky-cta-footer">
                <div className="sticky-cta-container">
                    <div className="sticky-cta-text">
                        <h4 className="sticky-cta-title">Don't Miss Out!</h4>
                    </div>
                    <div className="sticky-cta-action">
                        <button className="sticky-cta-btn" onClick={() => handleBookNow('Package 2')}>Book Now {getTicketPrice('Package 2', '₹ 30,000/-').replace('/-', '')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KarmaLandingPage;
