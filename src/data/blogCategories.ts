export const BLOG_CATEGORIES = [
  'Smart Financing',
  'Negotiation Tactics',
  'First-Time Buyers',
  'Staging & Listing',
  'Market Trends',
  'Neighborhood Spotlights',
  'Demographic Shifts',
  'Policy & Regulations',
  'ROI Calculations',
  'Portfolio Diversification',
  'House Flipping',
  'Tax Strategies',
  'Tenant Screening',
  'Landlord Legalities',
  'Property Management',
  'Tenant Retention',
  'PropTech Innovations',
  'Commercial Real Estate',
  'Industry Mergers',
  'Sustainability & ESG',
  'Delhi-NCR Properties',
  'Palwal-Faridabad Properties'
] as const;

export type BlogCategory = typeof BLOG_CATEGORIES[number];
