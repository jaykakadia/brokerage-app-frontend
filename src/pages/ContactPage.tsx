import React, { useState, useEffect } from 'react';
import { submitEnquiry, getApiErrorMessage } from '../services/api';
import { setSeo } from '../utils/seo';
import type { NavigateFunction } from '../types';

export interface ContactPageProps {
  onNavigate?: NavigateFunction;
}

export default function ContactPage({ onNavigate }: ContactPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSeo({
      title: 'Contact TradeCall India – Property & Business Listing Support',
      description: 'Get in touch with TradeCall India in Palwal, Haryana for property and business listing support. Call or WhatsApp +91 9992292828 or email support.tradecall@gmail.com.',
      path: '/contact',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact TradeCall India – Property & Business Listing Support',
          url: 'https://tradecall.in/contact',
          description: 'Get in touch with TradeCall India for verified real estate inquiries, advertising, and business directory services in Palwal, Faridabad, and NCR.',
          mainEntity: {
            '@type': 'Organization',
            '@id': 'https://tradecall.in/#organization',
            name: 'TradeCall India',
            url: 'https://tradecall.in',
            telephone: '+91 9992292828',
            email: 'support.tradecall@gmail.com',
            hasMap: 'https://maps.google.com/?q=Palwal,+Haryana+121102,+India',
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '+91 9992292828',
              contactType: 'customer service',
              areaServed: 'IN',
              availableLanguage: ['en', 'hi']
            },
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Palwal',
              addressLocality: 'Palwal',
              addressRegion: 'Haryana',
              postalCode: '121102',
              addressCountry: 'IN'
            }
          }
        }
      ]
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitEnquiry({ name: name.trim(), email: email.trim(), phone, message: message.trim(), website });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not send your message. Please try again or WhatsApp us.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>
            <i className="fas fa-headset"></i> Contact TradeCall India
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            Have a question, feedback, or need help? Reach out to our Palwal team
          </p>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: '#f4f6f9' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '50px' }}>
            {/* Phone Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f0fdf4', color: '#0c6253', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 16px auto' }}>
                <i className="fas fa-phone-alt"></i>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Phone Support</h3>
              <a href="tel:+919992292828" style={{ color: '#0c6253', fontWeight: 600, fontSize: '16px', textDecoration: 'none' }}>
                +91 99922 92828
              </a>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>Mon - Sat: 9:00 AM - 8:00 PM</p>
            </div>

            {/* WhatsApp Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px auto' }}>
                <i className="fab fa-whatsapp"></i>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>WhatsApp Support</h3>
              <a href="https://wa.me/919992292828" target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
                +91 99922 92828
              </a>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>Instant response 9am - 8pm</p>
            </div>

            {/* Location Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f0fdf4', color: '#0c6253', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 16px auto' }}>
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Office Address</h3>
              <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                <a
                  href="https://maps.google.com/?q=Palwal,+Haryana+121102,+India"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0c6253', fontWeight: 600, textDecoration: 'none' }}
                >
                  Palwal, Haryana 121102 <i className="fas fa-external-link-alt" style={{ fontSize: '11px', marginLeft: '4px' }}></i>
                </a>
              </p>
              <p style={{ marginTop: '6px', marginBottom: 0 }}>
                <a
                  href="https://maps.google.com/?q=Palwal,+Haryana+121102,+India"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600, textDecoration: 'underline' }}
                >
                  View on Google Maps
                </a>
              </p>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>Mon - Sat: 9:00 AM - 7:00 PM</p>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '700px', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px', textAlign: 'center' }}>Send Us a Message</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', marginBottom: '30px' }}>Fill in your details and our team will get back to you shortly.</p>

            {submitted ? (
              <div style={{ background: '#dcfce7', color: '#166534', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 600 }}>
                <i className="fas fa-check-circle" style={{ fontSize: '28px', display: 'block', marginBottom: '10px' }}></i>
                Thank you! Your message has been received. Our team will contact you shortly.
              </div>
            ) : (
              <form onSubmit={(e) => { void handleSubmit(e); }}>
                {error ? (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                    {error}
                  </div>
                ) : null}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    style={{ width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      style={{ width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Mobile Number *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      style={{ width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Your Message *</label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    style={{ width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  style={{ width: '100%', padding: '14px', background: '#0c6253', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '16px', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.75 : 1 }}
                >
                  {sending ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Helpful Quick Links for SEO & User Navigation (Audit Point 6c) */}
          <div style={{ maxWidth: '700px', margin: '36px auto 0', background: '#fff', borderRadius: '16px', padding: '24px 30px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e', marginBottom: '14px' }}>
              Explore More on TradeCall India
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
              <a
                href="/about"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('about'); } }}
                style={{ padding: '8px 16px', background: '#f0fdf4', color: '#0c6253', borderRadius: '8px', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', border: '1px solid #bbf7d0' }}
              >
                <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>About Us
              </a>
              <a
                href="/faq"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('faq'); } }}
                style={{ padding: '8px 16px', background: '#f0fdf4', color: '#0c6253', borderRadius: '8px', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', border: '1px solid #bbf7d0' }}
              >
                <i className="fas fa-question-circle" style={{ marginRight: '6px' }}></i>FAQ
              </a>
              <a
                href="/post-listing"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('post-listing'); } }}
                style={{ padding: '8px 16px', background: '#0c6253', color: '#fff', borderRadius: '8px', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none' }}
              >
                <i className="fas fa-home" style={{ marginRight: '6px' }}></i>List Your Property
              </a>
              <a
                href="/post-listing"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('post-listing'); } }}
                style={{ padding: '8px 16px', background: '#f0fdf4', color: '#0c6253', borderRadius: '8px', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', border: '1px solid #bbf7d0' }}
              >
                <i className="fas fa-store" style={{ marginRight: '6px' }}></i>List Your Business
              </a>
              <a
                href="/business-directory"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('business-directory'); } }}
                style={{ padding: '8px 16px', background: '#f8fafc', color: '#334155', borderRadius: '8px', fontWeight: 600, fontSize: '13.5px', textDecoration: 'none', border: '1px solid #e2e8f0' }}
              >
                <i className="fas fa-address-book" style={{ marginRight: '6px' }}></i>Business Directory
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
