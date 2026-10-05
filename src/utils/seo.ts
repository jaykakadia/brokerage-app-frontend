export const SITE_URL = 'https://tradecall.in';
export const SITE_NAME = 'TradeCall India';

const DEFAULT_TITLE = 'TradeCall India - Property & Business Directory in Palwal, Haryana';
const DEFAULT_DESCRIPTION =
  'Buy, sell or rent flats, plots, houses and commercial property in Palwal, Faridabad and the NCR with zero brokerage. Contact verified owners directly and find local businesses on TradeCall India.';

export interface SeoOptions {
  /** Page title; the site name is appended unless it is already in it. */
  title?: string;
  description?: string;
  /** Path of the page's main URL, e.g. "/about". Defaults to the current path. */
  path?: string;
  image?: string;
  /** Keep private pages (account, admin, login…) out of search results. */
  noindex?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Collapses whitespace and cuts text to a search-snippet length. */
export function toMetaDescription(text?: string | null, max = 160): string {
  const clean = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/** Updates the title, description, canonical URL and social-preview tags for the current page. */
export function setSeo({ title, description, path, image, noindex = false }: SeoOptions = {}): void {
  const fullTitle = !title ? DEFAULT_TITLE : title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${path ?? window.location.pathname}`;

  document.title = fullTitle;
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  setCanonical(url);

  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', url);
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', desc);
  if (image) {
    const absolute = image.startsWith('/') ? `${SITE_URL}${image}` : image;
    setMeta('property', 'og:image', absolute);
    setMeta('name', 'twitter:image', absolute);
  }
}

/** Title, description and main URL for each page that isn't a single listing or blog post. */
export const PAGE_SEO: Record<string, SeoOptions> = {
  home: { path: '/' },
  'business-directory': {
    title: 'Business Directory - Local Businesses in Palwal & NCR',
    description: 'Find trusted local businesses in Palwal, Faridabad and the NCR: builders, interior designers, contractors, property dealers and more. Unlock contact details on TradeCall India.',
    path: '/business-directory'
  },
  advertise: {
    title: 'Advertise Your Property or Business',
    description: 'Promote your property or business on TradeCall India with Featured Listings and banner packages, and reach buyers and tenants across Palwal and the NCR.',
    path: '/advertise'
  },
  blog: {
    title: 'Property Blog - Real Estate Tips & Guides for Palwal & NCR',
    description: 'Real estate news, buying and renting guides, and property tips for Palwal, Faridabad and the NCR from TradeCall India.',
    path: '/blog'
  },
  about: {
    title: 'About Us',
    description: 'TradeCall India is a Palwal-based property and business directory helping people buy, sell and rent property in the NCR with zero brokerage.',
    path: '/about'
  },
  contact: {
    title: 'Contact Us',
    description: 'Get in touch with TradeCall India in Palwal, Haryana. Call or WhatsApp 9992292828 or email support.tradecall@gmail.com.',
    path: '/contact'
  },
  terms: { title: 'Terms of Use', path: '/Terms-of-use-tradecall-India' },
  privacy: { title: 'Privacy Policy', path: '/privacy' },
  login: { title: 'Sign In or Register', noindex: true },
  'admin-login': { title: 'Admin Login', noindex: true },
  'post-listing': {
    title: 'Post Your Property for Free',
    description: 'List your flat, plot, house, shop or business for free on TradeCall India and get enquiries from buyers and tenants in Palwal and the NCR directly on your phone.',
    path: '/post-listing'
  },
  account: { title: 'My Account', noindex: true },
  admin: { title: 'Admin', noindex: true }
};
