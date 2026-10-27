import { useState, useEffect } from 'react';
import { setSeo, toMetaDescription } from '../utils/seo';
import { getBlogDetail, getImageUrl } from '../services/api';
import { findFallbackBlog } from '../data/defaultBlogs';
import type { NavigateFunction } from '../types';

export interface BlogDetailPageProps {
  blogIdentifier: string | number | null;
  onNavigate: NavigateFunction;
}

interface BlogArticleDetail {
  id: number | string;
  title: string;
  category?: string;
  author?: string;
  created_at?: string;
  featured_image?: string;
  image_url?: string;
  content: string;
  tags?: string;
  views?: number;
}

interface BlogComment {
  author: string;
  text: string;
  time: string;
}

export default function BlogDetailPage({ blogIdentifier, onNavigate }: BlogDetailPageProps) {
  const [blog, setBlog] = useState<BlogArticleDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Blogger comments state
  const [commentText, setCommentText] = useState<string>('');
  const [commentAuthor, setCommentAuthor] = useState<string>('TradeCall India (Google)');
  const [showAuthorMenu, setShowAuthorMenu] = useState<boolean>(false);
  const [notifyMe, setNotifyMe] = useState<boolean>(false);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [showShareDropdown, setShowShareDropdown] = useState<boolean>(false);

  useEffect(() => {
    const fetchBlog = async (): Promise<void> => {
      if (!blogIdentifier) {
        setLoading(false);
        setError('Blog identifier is missing');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        try {
          const res = await getBlogDetail(blogIdentifier);
          const data = res.data?.data;
          if (data && data.title) {
            setBlog({
              id: data.id,
              title: data.title,
              category: data.category,
              author: data.author,
              created_at: data.created_at,
              featured_image: data.image_url ? getImageUrl(data.image_url) : undefined,
              content: data.content,
              tags: data.tags || undefined,
              views: data.views
            });
            return;
          }
        } catch {
          // Fall back to built-in articles if API is down or article not found in DB
        }

        const fallback = findFallbackBlog(blogIdentifier);
        if (fallback) {
          setBlog({
            id: fallback.id,
            title: fallback.title,
            category: fallback.category,
            author: fallback.author,
            created_at: fallback.created_at,
            featured_image: fallback.featured_image,
            content: fallback.content,
            tags: fallback.tags,
            views: fallback.views
          });
          setError(null);
        } else {
          setError('Article not found');
        }
      } finally {
        setLoading(false);
      }
    };

    if (blogIdentifier) {
      void fetchBlog();
    }
  }, [blogIdentifier]);

  // Load comments from localStorage when blog is loaded
  useEffect(() => {
    if (!blog?.id) return;
    try {
      const stored = localStorage.getItem(`tc_blog_comments_${blog.id}`);
      if (stored) {
        setComments(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [blog?.id]);

  useEffect(() => {
    if (!blog || !blogIdentifier) return;
    setSeo({
      title: blog.title,
      description: toMetaDescription(blog.content),
      path: `/blog/${blogIdentifier}`,
      image: blog.featured_image
    });
  }, [blog, blogIdentifier]);

  const handlePublishComment = () => {
    if (!commentText.trim() || !blog?.id) return;
    const newComment: BlogComment = {
      author: commentAuthor,
      text: commentText.trim(),
      time: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    const updated = [newComment, ...comments];
    setComments(updated);
    setCommentText('');
    try {
      localStorage.setItem(`tc_blog_comments_${blog.id}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setShareToast('Comment published successfully!');
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleShareClick = async () => {
    const shareData = {
      title: blog?.title || 'TradeCall India Blog',
      text: `Read "${blog?.title || ''}" on TradeCall India`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fall back to dropdown
      }
    }
    setShowShareDropdown(prev => !prev);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareToast('Link copied to clipboard!');
      setShowShareDropdown(false);
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      setShareToast('Could not copy link');
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', background: '#f4f6f9', minHeight: '60vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#0c6253', marginBottom: '16px' }}></i>
        <p style={{ color: '#6b7280' }}>Loading article...</p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', background: '#f4f6f9', minHeight: '60vh' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <i className="fas fa-exclamation-circle" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }}></i>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#1a1a2e' }}>Article Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>The requested article does not exist or may have been removed.</p>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '10px 24px' }}
            onClick={() => onNavigate('blog')}
          >
            <i className="fas fa-arrow-left"></i> Back to Blog
          </button>
        </div>
      </div>
    );
  }

  const dateStr = blog.created_at
    ? new Date(blog.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'May 2025';

  const rawTags = (blog.tags || '')
    .split(',')
    .map(t => t.trim().replace(/^#+/, ''))
    .filter(Boolean);

  // If no tags were explicitly set, provide helpful contextual defaults
  const pillTags = rawTags.length > 0 ? rawTags : [
    'avoid paying brokerages',
    'best propert agent palwal',
    'property dealer palwal',
    'property listing at tradecall',
    'tradecall india',
    'user account tradecall'
  ];

  return (
    <div className="blog-detail-page">
      {/* Toast notification */}
      {shareToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1f2937',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
          <span>{shareToast}</span>
        </div>
      )}

      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <button
            type="button"
            onClick={() => onNavigate('blog')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-arrow-left"></i> All Articles
          </button>
          <h1 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.3, marginBottom: '16px' }}>
            {blog.title}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.85)', flexWrap: 'wrap' }}>
            <span><i className="fas fa-user-edit"></i> {blog.author || 'TradeCall Team'}</span>
            <span>&middot;</span>
            <span><i className="fas fa-calendar-alt"></i> {dateStr}</span>
            {blog.category && (
              <>
                <span>&middot;</span>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '10px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                  {blog.category}
                </span>
              </>
            )}
            {blog.views !== undefined && (
              <>
                <span>&middot;</span>
                <span><i className="fas fa-eye"></i> {blog.views} views</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: '50px 20px', background: '#f4f6f9' }}>
        <div className="container" style={{ maxWidth: '860px', margin: '0 auto' }}>
          <article style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            {blog.featured_image && (
              <div style={{ maxHeight: '420px', overflow: 'hidden' }}>
                <img
                  src={blog.featured_image}
                  alt={blog.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}

            <div style={{ padding: '40px 36px' }}>
              {/* Top Hashtags (Kept at the top as requested) */}
              {rawTags.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  {rawTags.map((t, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#f3f4f6',
                        color: '#4b5563',
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: 600
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Main Blog Article HTML / Content */}
              {/<[a-z][\s\S]*>/i.test(blog.content) ? (
                <div
                  className="blog-article-content"
                  onClick={(e) => {
                    const target = (e.target as HTMLElement).closest('a');
                    if (!target) return;
                    const href = target.getAttribute('href');
                    if (href && href.startsWith('/') && !href.startsWith('//') && !target.getAttribute('target')) {
                      e.preventDefault();
                      window.history.pushState(null, '', href);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />
              ) : (
                <div
                  className="blog-article-content"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {blog.content}
                </div>
              )}

              {/* ========================================================================= */}
              {/* BLOGGER OPTIONS SECTION (Matching user-provided Blogger UI screenshot)   */}
              {/* 1. Share Icon                                                             */}
              {/* 2. Oval Pill Tags                                                         */}
              {/* 3. Location: Palwal, Haryana 121102, India                                 */}
              {/* 4. Blogger Comment Box (Comment as, Enter Comment, PUBLISH, Notify Me)     */}
              {/* ========================================================================= */}
              <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #e8eaed' }}>
                {/* 1. Share Icon with dropdown */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={handleShareClick}
                    title="Share post"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#5f6368',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f3f4';
                      e.currentTarget.style.color = '#202124';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = '#5f6368';
                    }}
                  >
                    <i className="fas fa-share-alt"></i>
                  </button>

                  {showShareDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 20,
                        background: '#ffffff',
                        borderRadius: '10px',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                        border: '1px solid #dadce0',
                        padding: '8px 0',
                        minWidth: '200px',
                        marginTop: '4px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '9px 16px',
                          background: 'none',
                          border: 'none',
                          fontSize: '13px',
                          color: '#3c4043',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f3f4')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <i className="far fa-copy" style={{ width: '16px', color: '#5f6368' }}></i>
                        <span>Copy Link</span>
                      </button>

                      <a
                        href={`https://wa.me/?text=${encodeURIComponent('Read this article on TradeCall India: ' + blog.title + ' ' + window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 16px',
                          fontSize: '13px',
                          color: '#3c4043',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f3f4')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <i className="fab fa-whatsapp" style={{ width: '16px', color: '#25d366' }}></i>
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 16px',
                          fontSize: '13px',
                          color: '#3c4043',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f3f4')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <i className="fab fa-x-twitter" style={{ width: '16px', color: '#111827' }}></i>
                        <span>Twitter / X</span>
                      </a>

                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 16px',
                          fontSize: '13px',
                          color: '#3c4043',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f3f4')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <i className="fab fa-facebook" style={{ width: '16px', color: '#1877f2' }}></i>
                        <span>Facebook</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* 2. Oval Pill Tags (As displayed in Blogger screenshot) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {pillTags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#f1f3f4',
                        color: '#3c4043',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: 400,
                        display: 'inline-block',
                        lineHeight: 1.4,
                        userSelect: 'none'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 3. Location (As displayed in Blogger screenshot) */}
                <div style={{ fontSize: '13.5px', color: '#5f6368', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Location:</span>
                  <a
                    href="https://maps.google.com/?q=Palwal,+Haryana+121102,+India"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1a73e8', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Palwal, Haryana 121102, India
                  </a>
                </div>

                {/* 4. Blogger Comment Box (As shown in screenshot) */}
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f3f4' }}>
                  {/* Blogger Icon + Comment As */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: '#f57c00',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '20px',
                        fontFamily: "'Segoe UI', Arial, sans-serif",
                        flexShrink: 0
                      }}
                    >
                      B
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <span style={{ fontWeight: 600, color: '#3c4043' }}>Comment as:</span>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={() => setShowAuthorMenu(!showAuthorMenu)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3c4043',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 4px'
                          }}
                        >
                          <span>{commentAuthor}</span>
                          <i className="fas fa-caret-down" style={{ fontSize: '12px', color: '#5f6368' }}></i>
                        </button>
                        {showAuthorMenu && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              zIndex: 15,
                              background: '#fff',
                              borderRadius: '6px',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                              border: '1px solid #dadce0',
                              padding: '4px 0',
                              minWidth: '220px'
                            }}
                          >
                            {['TradeCall India (Google)', 'Guest User', 'Property Buyer / Seller', 'Anonymous'].map((auth) => (
                              <div
                                key={auth}
                                onClick={() => {
                                  setCommentAuthor(auth);
                                  setShowAuthorMenu(false);
                                }}
                                style={{
                                  padding: '7px 14px',
                                  fontSize: '13px',
                                  color: commentAuthor === auth ? '#e65100' : '#3c4043',
                                  fontWeight: commentAuthor === auth ? 700 : 400,
                                  cursor: 'pointer',
                                  background: commentAuthor === auth ? '#fff8e1' : 'transparent'
                                }}
                              >
                                {auth}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comment Input */}
                  <div style={{ marginBottom: '14px' }}>
                    <textarea
                      placeholder="Enter Comment"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        border: 'none',
                        borderBottom: '1px solid #dadce0',
                        padding: '8px 2px',
                        fontSize: '14px',
                        color: '#202124',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        background: 'transparent',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => (e.target.style.borderBottomColor = '#f57c00')}
                      onBlur={(e) => (e.target.style.borderBottomColor = '#dadce0')}
                    />
                  </div>

                  {/* PUBLISH Button & Notify Me */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      onClick={handlePublishComment}
                      disabled={!commentText.trim()}
                      style={{
                        background: commentText.trim() ? '#e65100' : '#f1f3f4',
                        color: commentText.trim() ? '#ffffff' : '#70757a',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 22px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        cursor: commentText.trim() ? 'pointer' : 'default',
                        textTransform: 'uppercase',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      PUBLISH
                    </button>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#5f6368' }}>
                      <input
                        type="checkbox"
                        checked={notifyMe}
                        onChange={(e) => setNotifyMe(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>Notify Me</span>
                    </label>
                  </div>

                  {/* reCAPTCHA disclaimer */}
                  <p style={{ fontSize: '11.5px', color: '#70757a', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    This site is protected by reCAPTCHA and the Google{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8', textDecoration: 'none' }}>
                      Privacy Policy
                    </a>{' '}
                    and{' '}
                    <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8', textDecoration: 'none' }}>
                      Terms of Service
                    </a>{' '}
                    apply.
                  </p>

                  {/* Published comments list */}
                  {comments.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#3c4043', margin: '0 0 6px 0' }}>
                        Comments ({comments.length})
                      </h4>
                      {comments.map((c, i) => (
                        <div key={i} style={{ background: '#f8f9fa', border: '1px solid #e8eaed', borderRadius: '8px', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#202124' }}>{c.author}</span>
                            <span style={{ fontSize: '11px', color: '#80868b' }}>{c.time}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: '#3c4043', whiteSpace: 'pre-line' }}>{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Share & WhatsApp Callout */}
              <div
                style={{
                  marginTop: '36px',
                  paddingTop: '20px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <button
                  type="button"
                  onClick={() => onNavigate('blog')}
                  className="btn-outline"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  <i className="fas fa-arrow-left"></i> Back to Blog
                </button>

                <a
                  href={`https://wa.me/919992292828?text=${encodeURIComponent('Read this article on TradeCall India: ' + blog.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    background: '#25d366',
                    color: '#fff',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <i className="fab fa-whatsapp"></i> Share on WhatsApp
                </a>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
