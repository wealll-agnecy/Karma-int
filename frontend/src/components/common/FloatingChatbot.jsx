import React, { useState, useEffect, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { FaPaperPlane, FaRobot, FaTimes, FaCommentDots } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/apiClient';
import '../../css/FloatingChatbot.css';

const FloatingChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Load session memory from localStorage on mount
    useEffect(() => {
        const savedChat = localStorage.getItem('growthutsav_chat_history');
        if (savedChat) {
            setMessages(JSON.parse(savedChat));
        } else {
            setMessages([
                { 
                    id: 1, 
                    sender: 'bot', 
                    text: 'Hello! I am Growthutsav Assistant. How can I help you today with ticket management, analytics, or event setup?' 
                }
            ]);
        }
    }, []);

    // Save to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('growthutsav_chat_history', JSON.stringify(messages));
        }
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const currentInput = input.trim();
        const userMsg = { id: Date.now(), sender: 'user', text: currentInput };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await apiClient.post('/api/v1/chatbot', {
                message: currentInput,
                history: messages
            });

            const data = response.data;
            
            const botMsg = {
                id: Date.now() + 1,
                sender: 'bot',
                text: data.success ? data.data.reply : data.message
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const botMsg = {
                id: Date.now() + 1,
                sender: 'bot',
                text: error.response?.data?.message || "I am having trouble connecting to my servers. Please ensure the backend is running and you have internet access."
            };
            setMessages(prev => [...prev, botMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const suggestions = [
        "How do I set up a new event?",
        "Where can I see partial payments?",
        "How do I scan QR codes?"
    ];

    const handleSuggestionClick = (text) => {
        setInput(text);
        // We can optionally auto-send immediately, but letting the user hit send is safer
    };

    return (
        <div className="floating-chatbot-container">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        className="chatbot-window"
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="chatbot-header">
                            <div className="chatbot-title-container">
                                <div className="chatbot-avatar">
                                    <FaRobot size={18} />
                                </div>
                                <div className="chatbot-header-text">
                                    <h6>Growthutsav Assistant</h6>
                                    <div className="status">
                                        <span className="dot">●</span> Online
                                    </div>
                                </div>
                            </div>
                            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="chatbot-body">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
                                    <div className="chat-bubble">
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            
                            {isLoading && (
                                <div className="chat-message-row bot">
                                    <div className="chat-bubble" style={{ padding: '16px 20px' }}>
                                        <div className="typing-dots">
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Suggestions */}
                        <div className="chatbot-suggestions">
                            {suggestions.map((s, idx) => (
                                <div 
                                    key={idx} 
                                    className="suggestion-pill"
                                    onClick={() => handleSuggestionClick(s)}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form className="chatbot-input-area" onSubmit={handleSend}>
                            <input 
                                type="text" 
                                className="chatbot-input" 
                                placeholder="Type your question..." 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button type="submit" className="chatbot-send-btn" disabled={!input.trim() || isLoading}>
                                <FaPaperPlane size={14} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Button */}
            <motion.div 
                className="chatbot-trigger-btn"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isOpen ? <FaTimes size={20} color="#fff" /> : <FaCommentDots size={24} />}
            </motion.div>
        </div>
    );
};

export default FloatingChatbot;
