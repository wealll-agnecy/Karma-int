import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Accordion, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { FaSave, FaEye, FaTimes, FaPalette, FaFont, FaImage, FaListUl, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { updateEventLandingPage } from '../../api/organizerApi';

const EventLandingEditor = ({ show, onHide, event, onSaveSuccess }) => {
    const [config, setConfig] = useState({
        hero: { title: '', subtitle: '', description: '', buttonText: 'Get Tickets', bannerImage: '', videoUrl: '' },
        theme: { primaryColor: '#e91e63', fontFamily: 'Inter, sans-serif' },
        sections: {
            speakers: { isVisible: true, items: [] },
            schedule: { isVisible: true, items: [] },
            faq: { isVisible: true, items: [] },
            testimonials: { isVisible: true, items: [] }
        },
        seo: { metaTitle: '', metaDescription: '', keywords: '' }
    });

    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    useEffect(() => {
        if (event) {
            setConfig({
                hero: {
                    title: event.landingPageConfig?.hero?.title || event.title || '',
                    subtitle: event.landingPageConfig?.hero?.subtitle || '',
                    description: event.landingPageConfig?.hero?.description || event.description || '',
                    buttonText: event.landingPageConfig?.hero?.buttonText || 'Get Tickets',
                    bannerImage: event.landingPageConfig?.hero?.bannerImage || event.bannerImage || '',
                    videoUrl: event.landingPageConfig?.hero?.videoUrl || ''
                },
                theme: {
                    primaryColor: event.landingPageConfig?.theme?.primaryColor || '#e91e63',
                    fontFamily: event.landingPageConfig?.theme?.fontFamily || 'Inter, sans-serif'
                },
                sections: {
                    speakers: event.landingPageConfig?.sections?.speakers || { isVisible: true, items: [] },
                    schedule: event.landingPageConfig?.sections?.schedule || { isVisible: true, items: [] },
                    faq: event.landingPageConfig?.sections?.faq || { isVisible: true, items: [] },
                    testimonials: event.landingPageConfig?.sections?.testimonials || { isVisible: true, items: [] }
                },
                seo: event.landingPageConfig?.seo || { metaTitle: '', metaDescription: '', keywords: '' }
            });
        }
    }, [event]);

    const handleSave = async (auto = false) => {
        if (!event) return;
        if (!auto) setSaving(true);
        try {
            const res = await updateEventLandingPage(event._id, config);
            if (res.data.success) {
                setLastSaved(new Date());
                if (!auto) {
                    toast.success('Landing page updated successfully!');
                    if (onSaveSuccess) onSaveSuccess();
                }
            }
        } catch (err) {
            if (!auto) toast.error('Failed to save landing page configuration.');
        } finally {
            if (!auto) setSaving(false);
        }
    };

    // Auto-save debouncer
    useEffect(() => {
        if (!show || !event) return;
        const timer = setTimeout(() => {
            handleSave(true);
        }, 10000); // 10 second auto-save
        return () => clearTimeout(timer);
    }, [config, show]);

    const handleHeroChange = (e) => setConfig({ ...config, hero: { ...config.hero, [e.target.name]: e.target.value } });
    const handleThemeChange = (e) => setConfig({ ...config, theme: { ...config.theme, [e.target.name]: e.target.value } });
    const handleSeoChange = (e) => setConfig({ ...config, seo: { ...config.seo, [e.target.name]: e.target.value } });

    const toggleSection = (sectionName) => {
        setConfig({
            ...config,
            sections: {
                ...config.sections,
                [sectionName]: { ...config.sections[sectionName], isVisible: !config.sections[sectionName].isVisible }
            }
        });
    };

    const addFaq = () => {
        const newFaq = [...config.sections.faq.items, { question: '', answer: '' }];
        setConfig({ ...config, sections: { ...config.sections, faq: { ...config.sections.faq, items: newFaq } } });
    };

    const updateFaq = (index, field, value) => {
        const items = [...config.sections.faq.items];
        items[index][field] = value;
        setConfig({ ...config, sections: { ...config.sections, faq: { ...config.sections.faq, items } } });
    };

    const removeFaq = (index) => {
        const items = config.sections.faq.items.filter((_, i) => i !== index);
        setConfig({ ...config, sections: { ...config.sections, faq: { ...config.sections.faq, items } } });
    };

    return (
        <Modal show={show} onHide={onHide} fullscreen dialogClassName="bg-dark text-white">
            <Modal.Header className="bg-dark text-white border-secondary d-flex justify-content-between align-items-center py-2">
                <div className="d-flex align-items-center gap-3">
                    <Modal.Title className="m-0 fs-5">
                        <FaPalette className="text-pink me-2" /> Landing Page Editor
                    </Modal.Title>
                    {lastSaved && <Badge bg="success" className="fw-normal">Auto-saved {lastSaved.toLocaleTimeString()}</Badge>}
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-light" size="sm" onClick={onHide}>
                        <FaTimes className="me-1" /> Close
                    </Button>
                    <Button variant="pink" size="sm" onClick={() => handleSave(false)} disabled={saving} className="text-white">
                        {saving ? <Spinner size="sm" /> : <><FaSave className="me-1" /> Save & Publish</>}
                    </Button>
                </div>
            </Modal.Header>
            <Modal.Body className="p-0 bg-dark text-light overflow-hidden">
                <Row className="h-100 g-0">
                    {/* LEFT PANEL: Editor Controls */}
                    <Col md={4} lg={3} className="h-100 overflow-auto border-end border-secondary bg-dark" style={{ zIndex: 10 }}>
                        <div className="p-3">
                            <Accordion defaultActiveKey="0" className="editor-accordion">
                                {/* Hero Section */}
                                <Accordion.Item eventKey="0" className="bg-transparent border-secondary text-white mb-2">
                                    <Accordion.Header>Hero Section</Accordion.Header>
                                    <Accordion.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted">Title</Form.Label>
                                            <Form.Control type="text" name="title" value={config.hero.title} onChange={handleHeroChange} className="bg-secondary text-white border-0 shadow-none" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted">Subtitle</Form.Label>
                                            <Form.Control type="text" name="subtitle" value={config.hero.subtitle} onChange={handleHeroChange} className="bg-secondary text-white border-0 shadow-none" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted">Description</Form.Label>
                                            <Form.Control as="textarea" rows={3} name="description" value={config.hero.description} onChange={handleHeroChange} className="bg-secondary text-white border-0 shadow-none" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted">Button Text</Form.Label>
                                            <Form.Control type="text" name="buttonText" value={config.hero.buttonText} onChange={handleHeroChange} className="bg-secondary text-white border-0 shadow-none" />
                                        </Form.Group>
                                    </Accordion.Body>
                                </Accordion.Item>

                                {/* Theme & Styling */}
                                <Accordion.Item eventKey="1" className="bg-transparent border-secondary text-white mb-2">
                                    <Accordion.Header>Theme & Styling</Accordion.Header>
                                    <Accordion.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted d-flex align-items-center gap-2"><FaPalette /> Primary Color</Form.Label>
                                            <Form.Control type="color" name="primaryColor" value={config.theme.primaryColor} onChange={handleThemeChange} className="p-1 shadow-none" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted d-flex align-items-center gap-2"><FaFont /> Font Family</Form.Label>
                                            <Form.Select name="fontFamily" value={config.theme.fontFamily} onChange={handleThemeChange} className="bg-secondary text-white border-0 shadow-none">
                                                <option value="Inter, sans-serif">Inter</option>
                                                <option value="Roboto, sans-serif">Roboto</option>
                                                <option value="Outfit, sans-serif">Outfit</option>
                                                <option value="Playfair Display, serif">Playfair Display</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Accordion.Body>
                                </Accordion.Item>

                                {/* FAQs Configuration */}
                                <Accordion.Item eventKey="2" className="bg-transparent border-secondary text-white mb-2">
                                    <Accordion.Header>FAQs Section</Accordion.Header>
                                    <Accordion.Body>
                                        <Form.Check 
                                            type="switch" 
                                            id="faq-visible" 
                                            label="Show FAQs Section" 
                                            checked={config.sections.faq.isVisible} 
                                            onChange={() => toggleSection('faq')}
                                            className="mb-3"
                                        />
                                        {config.sections.faq.isVisible && (
                                            <>
                                                {config.sections.faq.items.map((item, idx) => (
                                                    <div key={idx} className="bg-secondary bg-opacity-25 p-2 rounded mb-2 position-relative">
                                                        <Form.Control type="text" placeholder="Question" className="mb-1 bg-dark text-white border-secondary shadow-none form-control-sm" value={item.question} onChange={(e) => updateFaq(idx, 'question', e.target.value)} />
                                                        <Form.Control as="textarea" rows={2} placeholder="Answer" className="bg-dark text-white border-secondary shadow-none form-control-sm" value={item.answer} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} />
                                                        <button className="btn btn-sm text-danger position-absolute top-0 end-0 p-1" onClick={() => removeFaq(idx)}><FaTrash size={12}/></button>
                                                    </div>
                                                ))}
                                                <Button variant="outline-pink" size="sm" className="w-100" onClick={addFaq}><FaPlus className="me-1"/> Add FAQ</Button>
                                            </>
                                        )}
                                    </Accordion.Body>
                                </Accordion.Item>
                                
                                {/* SEO */}
                                <Accordion.Item eventKey="3" className="bg-transparent border-secondary text-white mb-2">
                                    <Accordion.Header>SEO Metadata</Accordion.Header>
                                    <Accordion.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted">Meta Title</Form.Label>
                                            <Form.Control type="text" name="metaTitle" value={config.seo.metaTitle} onChange={handleSeoChange} className="bg-secondary text-white border-0 shadow-none" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small text-muted">Meta Description</Form.Label>
                                            <Form.Control as="textarea" rows={2} name="metaDescription" value={config.seo.metaDescription} onChange={handleSeoChange} className="bg-secondary text-white border-0 shadow-none" />
                                        </Form.Group>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </div>
                    </Col>

                    {/* RIGHT PANEL: Live Preview Frame */}
                    <Col md={8} lg={9} className="h-100 bg-black p-4 overflow-auto position-relative">
                        <div className="position-absolute top-0 start-50 translate-middle-x bg-secondary text-white px-3 py-1 rounded-bottom small fw-bold" style={{ zIndex: 100 }}>LIVE PREVIEW</div>
                        <div className="preview-container w-100 bg-white rounded-4 overflow-hidden shadow-lg mx-auto" style={{ maxWidth: '1200px', minHeight: '800px', fontFamily: config.theme.fontFamily }}>
                            
                            {/* Dummy Hero Preview */}
                            <div className="hero-preview p-5 text-center text-white d-flex flex-column justify-content-center align-items-center" style={{ backgroundColor: config.theme.primaryColor, minHeight: '400px' }}>
                                <h1 className="fw-black mb-3 display-4" style={{ fontFamily: config.theme.fontFamily }}>{config.hero.title || 'Your Event Title'}</h1>
                                <h4 className="fw-normal mb-4 opacity-75">{config.hero.subtitle || 'Your Event Subtitle'}</h4>
                                <p className="lead mb-5" style={{ maxWidth: '600px' }}>{config.hero.description || 'Describe your event here to convince attendees to buy tickets.'}</p>
                                <button className="btn btn-lg rounded-pill fw-bold shadow px-5" style={{ backgroundColor: '#fff', color: config.theme.primaryColor }}>{config.hero.buttonText}</button>
                            </div>

                            {/* Dummy FAQ Preview */}
                            {config.sections.faq.isVisible && config.sections.faq.items.length > 0 && (
                                <div className="faq-preview p-5 text-dark" style={{ backgroundColor: '#f8f9fa' }}>
                                    <h2 className="text-center fw-bold mb-4" style={{ color: config.theme.primaryColor }}>Frequently Asked Questions</h2>
                                    <div className="mx-auto" style={{ maxWidth: '800px' }}>
                                        {config.sections.faq.items.map((item, idx) => (
                                            <div key={idx} className="mb-4 bg-white p-4 rounded shadow-sm">
                                                <h5 className="fw-bold m-0">{item.question || 'Question?'}</h5>
                                                <p className="text-muted mt-2 m-0">{item.answer || 'Answer goes here.'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </Col>
                </Row>
            </Modal.Body>
        </Modal>
    );
};

export default EventLandingEditor;
