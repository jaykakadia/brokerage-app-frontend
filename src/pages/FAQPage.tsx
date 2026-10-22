import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { NavigateFunction } from '../types';
import {
  FAQ_ITEMS,
  FAQ_CATEGORIES,
  FAQ_NOTICE,
  type FaqItem,
  type FaqCategoryKey
} from '../data/faqs';

export interface FAQPageProps {
  onNavigate?: NavigateFunction;
}

export default function FAQPage({ onNavigate }: FAQPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set([1, 2, 3]));
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'yes' | 'no'>>({});

  // Deep-linking: check hash on mount (e.g. #q-5)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#q-')) {
      const targetId = parseInt(hash.replace('#q-', ''), 10);
      if (!isNaN(targetId)) {
        setOpenIds((prev) => new Set([...prev, targetId]));
        setTimeout(() => {
          const el = document.getElementById(`faq-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('faq-highlighted');
            setTimeout(() => el.classList.remove('faq-highlighted'), 2500);
          }
        }, 300);
      }
    }
  }, []);

  // SEO: Inject Schema.org FAQPage JSON-LD
  useEffect(() => {
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => {
        const fullAnswer = item.blocks
          .map((b) => (b.type === 'paragraph' ? b.text : b.items.map((i) => `• ${i}`).join('\n')))
          .join('\n\n');
        return {
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: fullAnswer,
          },
        };
      }),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-schema-ldjson';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('faq-schema-ldjson');
      if (existing) {
        document.head.removeChild(existing);
      }
    };
  }, []);

  // Filter items based on category & search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      if (item.question.toLowerCase().includes(q)) return true;

      const blockMatch = item.blocks.some((b) => {
        if (b.type === 'paragraph') return b.text.toLowerCase().includes(q);
        return b.items.some((it) => it.toLowerCase().includes(q));
      });

      return blockMatch;
    });
  }, [selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: FAQ_ITEMS.length };
    FAQ_ITEMS.forEach((it) => {
      counts[it.category] = (counts[it.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Toggle single accordion
  const toggleItem = useCallback((id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand / collapse all currently visible
  const areAllOpen = filteredItems.length > 0 && filteredItems.every((it) => openIds.has(it.id));

  const toggleAll = () => {
    if (areAllOpen) {
      setOpenIds(new Set());
    } else {
      setOpenIds(new Set(filteredItems.map((it) => it.id)));
    }
  };

  // Copy shareable link
  const handleCopyLink = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/faq#q-${id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  // Highlight matching search words in text
  const renderHighlighted = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;

    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="faq-search-mark">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const handleFeedback = (id: number, answer: 'yes' | 'no', e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedback((prev) => ({ ...prev, [id]: answer }));
  };

  const presetTags = [
    'Plot Verification',
    'Commercial Space',
    'Rental Properties',
    'Business Registration',
    'Palwal & Faridabad',
    'Listing Fees',
    'RERA Approvals'
  ];

  return (
    <div className="faq-page">
      {/* Hero Header */}
      <section className="page-hero green-hero faq-hero">
        <div className="container">
          <div className="faq-breadcrumb">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate?.('home');
              }}
            >
              Home
            </a>
            <span className="faq-sep">/</span>
            <span className="faq-current">FAQ</span>
          </div>

          <h1 className="faq-hero-title">
            <i className="fas fa-question-circle" aria-hidden="true"></i> Frequently Asked Questions
          </h1>
          <p className="faq-hero-sub">
            Find clear answers to your questions about buying, selling, renting properties, and registering real estate businesses on TradeCall India.
          </p>

          {/* Interactive Search Bar */}
          <div className="faq-search-wrap">
            <div className="faq-search-box">
              <i className="fas fa-search faq-search-icon" aria-hidden="true"></i>
              <input
                type="text"
                className="faq-search-input"
                placeholder="Search questions (e.g., plot verification, rental deposit, listing fee, registration)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search frequently asked questions"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="faq-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            {/* Quick Keyword Suggestions */}
            <div className="faq-preset-tags">
              <span className="faq-tags-label">Popular topics:</span>
              {presetTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`faq-tag-btn ${searchQuery.toLowerCase() === tag.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setSearchQuery(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main FAQ Content Section */}
      <section className="faq-main-section">
        <div className="container">
          {/* Category Tabs */}
          <div className="faq-category-tabs" role="tablist" aria-label="FAQ Categories">
            {FAQ_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.key] || 0;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  role="tab"
                  aria-selected={isActive}
                  className={`faq-category-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    // Open first few of new category
                    const matched = FAQ_ITEMS.filter(
                      (item) => cat.key === 'all' || item.category === cat.key
                    );
                    setOpenIds(new Set(matched.slice(0, 3).map((it) => it.id)));
                  }}
                >
                  <i className={cat.icon} aria-hidden="true"></i>
                  <span className="faq-tab-label">{cat.label}</span>
                  <span className="faq-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Results Bar / Quick Controls */}
          <div className="faq-controls-bar">
            <div className="faq-results-info">
              {searchQuery ? (
                <span>
                  Found <strong>{filteredItems.length}</strong> matching result
                  {filteredItems.length !== 1 ? 's' : ''} for &ldquo;
                  <span className="faq-query-highlight">{searchQuery}</span>&rdquo;
                  {selectedCategory !== 'all' && (
                    <span className="faq-in-cat">
                      {' '}in{' '}
                      <strong>
                        {FAQ_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
                      </strong>
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  Showing <strong>{filteredItems.length}</strong> question
                  {filteredItems.length !== 1 ? 's' : ''}
                  {selectedCategory !== 'all' && (
                    <span className="faq-in-cat">
                      {' '}in{' '}
                      <strong>
                        {FAQ_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
                      </strong>
                    </span>
                  )}
                </span>
              )}
            </div>

            {filteredItems.length > 0 && (
              <button
                type="button"
                className="faq-toggle-all-btn"
                onClick={toggleAll}
              >
                <i className={`fas ${areAllOpen ? 'fa-compress-alt' : 'fa-expand-alt'}`} aria-hidden="true"></i>
                {areAllOpen ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>

          {/* FAQ Accordion List */}
          {filteredItems.length > 0 ? (
            <div className="faq-accordion-list">
              {filteredItems.map((item: FaqItem) => {
                const isOpen = openIds.has(item.id);
                const itemFeedback = feedback[item.id];
                const catObj = FAQ_CATEGORIES.find((c) => c.key === item.category);

                return (
                  <article
                    key={item.id}
                    id={`faq-${item.id}`}
                    className={`faq-card ${isOpen ? 'is-open' : ''}`}
                  >
                    <header
                      className="faq-card-header"
                      onClick={() => toggleItem(item.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleItem(item.id);
                        }
                      }}
                    >
                      <div className="faq-header-left">
                        <span className="faq-id-badge">#{item.id}</span>
                        {catObj && (
                          <span className={`faq-category-chip cat-${item.category}`}>
                            <i className={catObj.icon} aria-hidden="true"></i> {catObj.label.split(':')[0]}
                          </span>
                        )}
                        <h3 className="faq-question-title">
                          {renderHighlighted(item.question)}
                        </h3>
                      </div>

                      <div className="faq-header-right">
                        <button
                          type="button"
                          className="faq-action-btn faq-copy-btn"
                          title="Copy direct link to this question"
                          aria-label="Copy link"
                          onClick={(e) => handleCopyLink(item.id, e)}
                        >
                          <i
                            className={`fas ${copiedId === item.id ? 'fa-check text-green' : 'fa-link'}`}
                            aria-hidden="true"
                          ></i>
                          {copiedId === item.id && <span className="faq-toast">Copied!</span>}
                        </button>
                        <span className="faq-chevron" aria-hidden="true">
                          <i className="fas fa-chevron-down"></i>
                        </span>
                      </div>
                    </header>

                    {isOpen && (
                      <div className="faq-card-body">
                        <div className="faq-answer-content">
                          {item.blocks.map((block, idx) => {
                            if (block.type === 'paragraph') {
                              return (
                                <p key={idx} className="faq-answer-paragraph">
                                  {renderHighlighted(block.text)}
                                </p>
                              );
                            }
                            if (block.type === 'list') {
                              return (
                                <ul key={idx} className="faq-answer-list">
                                  {block.items.map((it, iIdx) => (
                                    <li key={iIdx}>
                                      <i className="fas fa-check-circle faq-list-check" aria-hidden="true"></i>
                                      <span>{renderHighlighted(it)}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            return null;
                          })}
                        </div>

                        {/* Interactive Feedback footer */}
                        <div className="faq-card-footer">
                          <div className="faq-feedback">
                            <span className="faq-feedback-label">Was this answer helpful?</span>
                            {itemFeedback ? (
                              <span className="faq-feedback-thanks">
                                <i className="fas fa-heart text-green"></i> Thank you for your feedback!
                              </span>
                            ) : (
                              <div className="faq-feedback-btns">
                                <button
                                  type="button"
                                  className="faq-feedback-btn"
                                  onClick={(e) => handleFeedback(item.id, 'yes', e)}
                                >
                                  <i className="far fa-thumbs-up"></i> Yes
                                </button>
                                <button
                                  type="button"
                                  className="faq-feedback-btn"
                                  onClick={(e) => handleFeedback(item.id, 'no', e)}
                                >
                                  <i className="far fa-thumbs-down"></i> No
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="faq-empty-state">
              <div className="faq-empty-icon">
                <i className="fas fa-search-minus"></i>
              </div>
              <h3>No matching questions found</h3>
              <p>
                We couldn&apos;t find any questions matching &ldquo;<strong>{searchQuery}</strong>&rdquo;
                {selectedCategory !== 'all' ? ` in the selected category.` : '.'}
              </p>
              <div className="faq-empty-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  <i className="fas fa-redo"></i> Reset Filters
                </button>
                <a
                  href="https://wa.me/919992292828?text=Hello%20TradeCall%20India,%20I%20have%20a%20question%20about"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fab fa-whatsapp"></i> Ask on WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Important Notice & Legal Advisory Box */}
          <div className="faq-notice-card">
            <div className="faq-notice-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="faq-notice-content">
              <h4>{FAQ_NOTICE.title}</h4>
              {FAQ_NOTICE.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>

          {/* Still Have Questions? Support Cards Grid */}
          <div className="faq-support-section">
            <div className="faq-support-header">
              <div className="faq-support-badge">Need Further Assistance?</div>
              <h2>Still have questions? We&apos;re here to help.</h2>
              <p>
                Reach out to our customer support team or explore quick self-service options below.
              </p>
            </div>

            <div className="faq-support-grid">
              <div className="faq-support-card">
                <div className="faq-support-card-icon icon-whatsapp">
                  <i className="fab fa-whatsapp"></i>
                </div>
                <h3>Chat on WhatsApp</h3>
                <p>Get instant guidance regarding your property or business advertisement.</p>
                <a
                  href="https://wa.me/919992292828"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="faq-support-link"
                >
                  +91 9992292828 <i className="fas fa-arrow-right"></i>
                </a>
              </div>

              <div className="faq-support-card">
                <div className="faq-support-card-icon icon-email">
                  <i className="fas fa-envelope"></i>
                </div>
                <h3>Email Support</h3>
                <p>Have an inquiry or partnership request? Drop our team an email.</p>
                <a
                  href="mailto:support.tradecall@gmail.com"
                  className="faq-support-link"
                >
                  support.tradecall@gmail.com <i className="fas fa-arrow-right"></i>
                </a>
              </div>

              <div className="faq-support-card">
                <div className="faq-support-card-icon icon-post">
                  <i className="fas fa-plus-circle"></i>
                </div>
                <h3>Post a Free Listing</h3>
                <p>Advertise your residential plot, flat, house, or commercial space online.</p>
                <button
                  type="button"
                  className="faq-support-link"
                  onClick={() => onNavigate?.('post-listing')}
                >
                  Create Property Listing <i className="fas fa-arrow-right"></i>
                </button>
              </div>

              <div className="faq-support-card">
                <div className="faq-support-card-icon icon-biz">
                  <i className="fas fa-store"></i>
                </div>
                <h3>Business Directory</h3>
                <p>Promote your real estate agency, construction, or architectural business.</p>
                <button
                  type="button"
                  className="faq-support-link"
                  onClick={() => onNavigate?.('business-directory')}
                >
                  Explore Directory <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
