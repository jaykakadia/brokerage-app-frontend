import { useState, useEffect } from 'react';
import { getBlogs, getImageUrl } from '../services/api';
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
  const defaultArticles: BlogArticle[] = [
    {
      id: 1,
      slug: 'property-prices-in-palwal-2025-complete-guide',
      title: 'Property Prices in Palwal 2025: Complete Guide',
      category: 'Buy',
      author: 'TradeCall Team',
      created_at: '2025-05-15',
      featured_image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=350&fit=crop',
      content: 'Real estate market update for 2025. Discover upcoming developments, circle rates, and price trends across prime locations in Palwal.'
    },
    {
      id: 2,
      slug: 'best-localities-to-buy-flat-in-faridabad',
      title: 'Best Localities to Buy Flat in Faridabad',
      category: 'Buy',
      author: 'TradeCall Team',
      created_at: '2025-04-28',
      featured_image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=350&fit=crop',
      content: 'Top residential areas for flat buyers in Greater Faridabad and Neharpar belt with proximity to Metro and Expressways.'
    },
    {
      id: 3,
      slug: 'commercial-property-investment-near-nh-19',
      title: 'Commercial Property Investment Near NH-19',
      category: 'Invest',
      author: 'TradeCall Team',
      created_at: '2025-04-10',
      featured_image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&h=350&fit=crop',
      content: 'High ROI opportunities along the National Highway corridor connecting Delhi, Faridabad, Palwal, and Mathura.'
    },
    {
      id: 4,
      slug: 'how-to-post-a-free-listing-on-tradecall-india',
      title: 'How to Post a Free Listing on TradeCall India',
      category: 'Rent',
      author: 'TradeCall Team',
      created_at: '2025-03-22',
      featured_image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=350&fit=crop',
      content: 'A comprehensive step-by-step guide for property owners and brokers to list residential and commercial units without fees.'
    },
    {
      id: 5,
      slug: 'gurugram-vs-faridabad-which-is-better-to-buy',
      title: 'Gurugram vs Faridabad: Which is Better to Buy?',
      category: 'Buy',
      author: 'TradeCall Team',
      created_at: '2025-03-05',
      featured_image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=350&fit=crop',
      content: 'Detailed comparison for homebuyers evaluating connectivity, price per square foot, rental yields, and future appreciation.'
    },
    {
      id: 6,
      slug: 'agricultural-land-investment-in-haryana-2025',
      title: 'Agricultural Land Investment in Haryana 2025',
      category: 'Invest',
      author: 'TradeCall Team',
      created_at: '2025-02-18',
      featured_image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=350&fit=crop',
      content: 'Legal guide and top investment locations for agricultural and farmhouse plots along KMP Expressway.'
    }
  ];

  const [articles, setArticles] = useState<BlogArticle[]>(defaultArticles);
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

  const categories = ['All', 'Buy', 'Rent', 'Invest'];

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a2e' }}>
              Latest Articles
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '8px 18px',
                    border: activeCategory === cat ? '1.5px solid #0c6253' : '1.5px solid #e5e7eb',
                    background: activeCategory === cat ? '#0c6253' : '#fff',
                    color: activeCategory === cat ? '#fff' : '#6b7280',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
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
                const snippet = blog.content ? (blog.content.length > 110 ? blog.content.substring(0, 110) + '...' : blog.content) : '';

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
