import { useState, useEffect } from 'react';
import { getBlogs, getImageUrl } from '../services/api';
import { toMetaDescription } from '../utils/seo';
import { DEFAULT_BLOG_ARTICLES } from '../data/defaultBlogs';
import { BLOG_CATEGORIES } from '../data/blogCategories';
import type { NavigateFunction } from '../types';

export interface BlogPageProps {
  onNavigate: NavigateFunction;
}

interface BlogArticle {
  id: number | string;
  slug?: string;
  permalink?: string;
  title: string;
  category?: string;
  author?: string;
  created_at?: string;
  featured_image?: string;
  image_url?: string;
  content: string;
  views?: number;
}

export default function BlogPage({ onNavigate }: BlogPageProps) {
  const [articles, setArticles] = useState<BlogArticle[]>(DEFAULT_BLOG_ARTICLES);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchBlogs = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await getBlogs();
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        if (data && data.length > 0) {
          const mapped: BlogArticle[] = data.map((b) => ({
            id: b.id,
            slug: b.permalink || String(b.id),
            permalink: b.permalink,
            title: b.title,
            category: b.category,
            author: b.author,
            created_at: b.created_at,
            featured_image: b.image_url ? getImageUrl(b.image_url) : undefined,
            content: b.content
          }));
          setArticles(mapped);
        }
      } catch {
        // Keep default articles
      } finally {
        setLoading(false);
      }
    };
    void fetchBlogs();
  }, []);

  const categories = ['All', ...BLOG_CATEGORIES];

  const filteredArticles = activeCategory === 'All'
    ? articles
    : articles.filter(a => (a.category || '').toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="blog-page">
      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>
            <i className="fas fa-newspaper"></i> TradeCall India Blog
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            Property market insights, tips, and guides for NCR Haryana
          </p>
        </div>
      </section>

      <section style={{ padding: '50px 20px', background: '#f4f6f9' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
                {activeCategory === 'All' ? 'Latest Articles' : `${activeCategory} Articles`}
              </h2>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                Showing {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {categories.map(cat => {
                const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '7px 16px',
                      border: isActive ? '1.5px solid #0c6253' : '1px solid #e5e7eb',
                      background: isActive ? '#0c6253' : '#fff',
                      color: isActive ? '#fff' : '#4b5563',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 8px rgba(12, 98, 83, 0.25)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#0c6253';
                        e.currentTarget.style.color = '#0c6253';
                        e.currentTarget.style.background = '#f0fdf9';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.color = '#4b5563';
                        e.currentTarget.style.background = '#fff';
                      }
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#0c6253', marginBottom: '12px' }}></i>
              <p>Loading articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', background: '#fff', borderRadius: '14px' }}>
              <p>No articles found for this category.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filteredArticles.map(blog => {
                const dateStr = blog.created_at
                  ? new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'May 2025';
                const imageSrc = blog.featured_image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=350&fit=crop';
                const snippet = toMetaDescription(blog.content, 110);

                return (
                  <div
                    key={blog.id || blog.slug}
                    className="blog-card"
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onClick={() => onNavigate('blog-detail', blog.slug || blog.id)}
                  >
                    <div style={{ position: 'relative', height: '190px', background: '#e5e7eb' }}>
                      <img
                        src={imageSrc}
                        alt={blog.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=350&fit=crop';
                        }}
                      />
                      {blog.category && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(12,98,83,0.9)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            textTransform: 'uppercase'
                          }}
                        >
                          {blog.category}
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', color: '#0c6253', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        {blog.author || 'Real Estate'} &middot; {dateStr}
                      </div>

                      <h3 style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.35, marginBottom: '10px', color: '#1a1a2e' }}>
                        {blog.title}
                      </h3>

                      <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6, marginBottom: '16px', flex: 1 }}>
                        {snippet}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0c6253', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          Read More <i className="fas fa-arrow-right" style={{ fontSize: '11px' }}></i>
                        </span>
                        {blog.views !== undefined && (
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            <i className="fas fa-eye" style={{ marginRight: '4px' }}></i>
                            {blog.views}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
