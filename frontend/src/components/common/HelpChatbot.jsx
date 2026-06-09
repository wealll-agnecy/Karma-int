import React, { useState, useRef, useEffect } from 'react';
import { FaCommentDots, FaTimes, FaPaperPlane, FaEnvelope, FaWhatsapp, FaRobot, FaUser } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// â”€â”€â”€ Predefined FAQ Responses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FAQ_RESPONSES = [
    {
        keywords: ['create event', 'host event', 'make event', 'new event', 'add event', 'organize event'],
        answer: `🎉 **Creating an Event** is easy!\n\n1. Log in as an **Organizer** (or request organizer access from your profile).\n2. Click **"Host Event"** in the navbar or go to **My Events → Create Event**.\n3. Fill in event details: title, date, venue, tickets & pricing.\n4. Submit for review — our team approves it within 24 hours!\n\nNeed help becoming an organizer? Contact us below.`,
    },
    {
        keywords: ['book ticket', 'buy ticket', 'purchase ticket', 'register event', 'attend event', 'how to book'],
        answer: `🎟️ **Booking a Ticket** is simple!\n\n1. Browse events at **Events** page or search by name/category.\n2. Click on an event → select your ticket type & quantity.\n3. Proceed to **Checkout** and complete payment.\n4. Your ticket (with QR code) will be available under **My Bookings**.\n\nTip: You must be logged in to book tickets.`,
    },
    {
        keywords: ['payment', 'pay', 'refund', 'charge', 'billing', 'transaction', 'failed payment', 'payment issue'],
        answer: `💳 **Payment Issues?**\n\n• **Failed payment?** Check your card details and try again. Ensure you have sufficient balance.\n• **Charged but no ticket?** Wait 5–10 minutes and refresh **My Bookings**. If the ticket doesn't appear, contact us immediately.\n• **Refund request?** Refunds are processed by the event organizer. Contact support with your booking ID.\n\nFor urgent payment issues, reach us directly via Email or WhatsApp.`,
    },
    {
        keywords: ['contact', 'support', 'help', 'reach out', 'email', 'whatsapp', 'phone', 'talk to someone'],
        answer: `📞 **Contact Our Support Team**\n\nWe're here to help! Reach us through:\n\n• 📧 **Email:** support@iriapex.com\n• 💬 **WhatsApp:** Click the **Contact** button in the navbar for quick access.\n\n🕙 Support hours: Mon–Sat, 9 AM – 7 PM IST.`,
    },
    {
        keywords: ['organizer', 'become organizer', 'organizer account', 'organizer request', 'host account'],
        answer: `🚀 **Become an Organizer**\n\n1. Register or log in to your account.\n2. Go to your **Dashboard → Request Organizer Access**.\n3. Submit your request — our admin team will review within 48 hours.\n4. Once approved, you can create and manage events!\n\nAlready have organizer access? Go to **My Events** in the navbar.`,
    },
    {
        keywords: ['ticket', 'qr code', 'scan', 'check in', 'entry', 'download ticket', 'ticket not found'],
        answer: `📱 **Your Ticket & QR Code**\n\n1. Go to **My Bookings** after logging in.\n2. Click on your booking to view the **Ticket with QR Code**.\n3. At the event, show the QR code to the staff for scanning.\n\nLost your ticket? It's always available under **My Bookings**. No download needed — just show the screen!`,
    },
    {
        keywords: ['staff', 'scanner', 'check in staff', 'staff role'],
        answer: `👷 **Staff & Check-In**\n\nStaff members can:\n1. Log in with their **Staff credentials**.\n2. Navigate to **Scanner** in the navbar.\n3. Scan attendee QR codes at the event gate.\n\nOrganizers can assign staff to events from the **Staff Management** section in the Organizer Dashboard.`,
    },
    {
        keywords: ['cancel', 'delete', 'remove event', 'unpublish'],
        answer: `🗑️ **Cancel or Delete an Event**\n\nAs an organizer:\n1. Go to **My Events** → click on the event.\n2. In the **Event Dashboard**, use the **Edit/Delete** option.\n\n⚠️ Deleting an event will affect all attendees. Ensure you communicate with ticket holders before cancellation.`,
    },
    {
        keywords: ['login', 'sign in', 'password', 'forgot password', 'account', 'register', 'sign up'],
        answer: `🔍 **Account & Login Help**\n\n• **Forgot password?** Click **"Forgot Password"** on the login page to reset via email.\n• **Can't log in?** Make sure you're using the correct email and password.\n• **New user?** Click **"Get Started"** to register a free account.\n\nFor account issues, contact support@growthutsav.com.`,
    },
];

const DEFAULT_RESPONSE = `🤔 Hmm, I'm not sure about that one!\n\nHere are some things I can help with:\n• 🎉 How to create an event\n• 🎟️ How to book a ticket\n• 💳 Payment issues\n• 📞 Contact support\n• 👷 Staff & scanner help\n\nTry asking one of those, or use the **Contact** option to reach our team directly!`;

const SUGGESTION_CHIPS = [
    'How to create event',
    'How to book ticket',
    'Payment issues',
    'Contact support',
    'Become an organizer',
];

function getBotResponse(query) {
    const lower = query.toLowerCase().trim();
    if (!lower) return null;
    for (const faq of FAQ_RESPONSES) {
        if (faq.keywords.some((kw) => lower.includes(kw))) {
            return faq.answer;
        }
    }
    return DEFAULT_RESPONSE;
}

// Render markdown-like bold text (very lightweight)
function renderAnswer(text) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
}

// ————————————————————————————————————————————————————————————————————————————————
export function ContactModal({ show, onClose }) {
    if (!show) return null;
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="contact-modal-overlay"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 40 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                        className="contact-modal-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="contact-modal-close" onClick={onClose} aria-label="Close">
                            <FaTimes />
                        </button>
                        <div className="contact-modal-header">
                            <h5 className="contact-modal-title">Get In Touch</h5>
                            <p className="contact-modal-subtitle">Choose how you'd like to reach us</p>
                        </div>
                        <div className="contact-modal-body">
                            <a
                                href="mailto:support@growthutsav.com"
                                className="contact-option-btn email-btn"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span className="contact-option-icon email-icon">
                                    <FaEnvelope />
                                </span>
                                <div className="contact-option-info">
                                    <span className="contact-option-label">Email Us</span>
                                    <span className="contact-option-value">support@growthutsav.com</span>
                                </div>
                            </a>
                            <a
                                href="https://wa.me/919876543210"
                                className="contact-option-btn whatsapp-btn"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span className="contact-option-icon whatsapp-icon">
                                    <FaWhatsapp />
                                </span>
                                <div className="contact-option-info">
                                    <span className="contact-option-label">WhatsApp Us</span>
                                    <span className="contact-option-value">Quick chat support</span>
                                </div>
                            </a>
                        </div>
                        <p className="contact-modal-footer-note">
                            🕙 Available Mon–Sat, 9 AM – 7 PM IST
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// â”€â”€â”€ Main Help Chatbot Floating Widget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HelpChatbot = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            from: 'bot',
            text: `👋 Hi there! I'm **GrowthUtsav Support Bot**.\n\nI can help you with event creation, ticket booking, payments, and more. Ask me anything, or tap a suggestion below!`,
            id: 0,
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [messages, isOpen]);

    const sendMessage = (text) => {
        const query = text || inputValue;
        if (!query.trim()) return;
        const userMsg = { from: 'user', text: query, id: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);
        setTimeout(() => {
            const botReply = getBotResponse(query);
            setMessages((prev) => [...prev, { from: 'bot', text: botReply, id: Date.now() + 1 }]);
            setIsTyping(false);
        }, 800 + Math.random() * 400);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Hide chatbot on all routes except the Home page '/'
    if (location.pathname !== '/') {
        return null;
    }

    return (
        <>
            {/* â”€â”€ Floating Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <AnimatePresence>
                {!isOpen && (
                    <div className="chatbot-fab-container">
                        {/* Hover Popup */}
                        <AnimatePresence>
                            {isHovered && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, x: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                    className="chatbot-hover-popup"
                                    style={{
                                        background: 'white',
                                        padding: '10px 18px',
                                        borderRadius: '16px 16px 4px 16px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                        marginBottom: '15px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: '#333',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <span style={{ color: '#7c3aed' }}>Laila:</span> Hi I'm Laila from GU, How can i help you today?
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            key="fab"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            className="chatbot-fab"
                            onClick={() => {
                                setIsOpen(true);
                                setIsHovered(false);
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            aria-label="Open Help Chatbot"
                            id="help-chatbot-fab"
                            style={{ 
                                position: 'relative', 
                                bottom: 'auto', 
                                right: 'auto',
                                fontSize: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {isHovered ? <FaRobot /> : <FaCommentDots />}
                            <span className="chatbot-fab-label">Help</span>
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>

            {/* â”€â”€ Chatbot Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="chatbot"
                        initial={{ opacity: 0, scale: 0.85, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 30 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                        className="chatbot-panel"
                        id="help-chatbot-panel"
                    >
                        {/* Header */}
                        <div className="chatbot-header">
                            <div className="chatbot-header-info">
                                <div className="chatbot-avatar" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3e8ff' }}>
                                    <FaRobot style={{ color: '#a855f7' }} size={24} />
                                    <span className="chatbot-status-dot" />
                                </div>
                                <div>
                                    <div className="chatbot-name">Laila | Support</div>
                                    <div className="chatbot-status">Online • Usually replies instantly</div>
                                </div>
                            </div>
                            <button
                                className="chatbot-close-btn"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close chatbot"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="chatbot-messages" id="chatbot-messages-container">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={`chatbot-bubble-row ${msg.from === 'user' ? 'user-row' : 'bot-row'}`}
                                >
                                    {msg.from === 'bot' && (
                                        <span className="bubble-avatar bot-bubble-avatar" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                                            <FaRobot style={{ color: '#a855f7' }} size={12} />
                                        </span>
                                    )}
                                    <div className={`chatbot-bubble ${msg.from === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                                        {msg.text.split('\n').map((line, i) => (
                                            <span key={i}>
                                                {renderAnswer(line)}
                                                {i < msg.text.split('\n').length - 1 && <br />}
                                            </span>
                                        ))}
                                    </div>
                                    {msg.from === 'user' && (
                                        <span className="bubble-avatar user-bubble-avatar">
                                            <FaUser size={12} />
                                        </span>
                                    )}
                                </motion.div>
                            ))}

                            {/* Typing indicator */}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="chatbot-bubble-row bot-row"
                                >
                                    <span className="bubble-avatar bot-bubble-avatar" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                                        <FaRobot style={{ color: '#a855f7' }} size={12} />
                                    </span>
                                    <div className="chatbot-bubble bot-bubble typing-bubble">
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggestion Chips */}
                        <div className="chatbot-chips">
                            {SUGGESTION_CHIPS.map((chip) => (
                                <button
                                    key={chip}
                                    className="chatbot-chip"
                                    onClick={() => sendMessage(chip)}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="chatbot-input-area">
                            <input
                                ref={inputRef}
                                type="text"
                                className="chatbot-input"
                                placeholder="Ask me anything..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                id="chatbot-input-field"
                                aria-label="Type your question"
                            />
                            <button
                                className="chatbot-send-btn"
                                onClick={() => sendMessage()}
                                disabled={!inputValue.trim() || isTyping}
                                aria-label="Send message"
                                id="chatbot-send-button"
                            >
                                <FaPaperPlane size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default HelpChatbot;
