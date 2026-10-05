import { useState, useEffect } from 'react';
import { setSeo, toMetaDescription } from '../utils/seo';
import { getBlogDetail, getImageUrl } from '../services/api';
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

export default function BlogDetailPage({ blogIdentifier, onNavigate }: BlogDetailPageProps) {
  const [blog, setBlog] = useState<BlogArticleDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        } else {
          setError('Article not found');
        }
      } catch {
        setError('Article could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    if (blogIdentifier) {
      void fetchBlog();
    }
  }, [blogIdentifier]);

  useEffect(() => {
    if (!blog || !blogIdentifier) return;
    setSeo({
      title: blog.title,
      description: toMetaDescription(blog.content),
      path: `/blog/${blogIdentifier}`,
      image: blog.featured_image
    });
  }, [blog, blogIdentifier]);

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

  return (
    <div className="blog-detail-page">
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
              {blog.tags && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  {blog.tags.split(',').map((t, i) => (
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
                      #{t.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  color: '#374151',
                  fontSize: '16px',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line'
                }}
              >
                {blog.content}
              </div>

              {/* Share & WhatsApp Callout */}
              <div
                style={{
                  marginTop: '40px',
                  paddingTop: '24px',
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
