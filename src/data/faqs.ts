export type FaqCategoryKey = 'all' | 'general' | 'property' | 'business' | 'account' | 'safety';

export interface FaqBlockParagraph {
  type: 'paragraph';
  text: string;
}

export interface FaqBlockList {
  type: 'list';
  items: string[];
}

export type FaqBlock = FaqBlockParagraph | FaqBlockList;

export interface FaqItem {
  id: number;
  question: string;
  category: 'general' | 'property' | 'business' | 'account' | 'safety';
  blocks: FaqBlock[];
}

export interface FaqCategory {
  key: FaqCategoryKey;
  label: string;
  icon: string;
  description: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { key: 'all', label: 'All Questions', icon: 'fas fa-layer-group', description: 'Browse all 35 frequently asked questions' },
  { key: 'general', label: 'General & Overview', icon: 'fas fa-info-circle', description: 'What TradeCall India is and how it works' },
  { key: 'property', label: 'Properties: Buy, Sell, Rent', icon: 'fas fa-home', description: 'Listings, searching, budget, and rental properties' },
  { key: 'business', label: 'Business Directory', icon: 'fas fa-briefcase', description: 'Dealers, builders, contractors, architects & registrations' },
  { key: 'account', label: 'Account & Listings', icon: 'fas fa-user-cog', description: 'Creating accounts, tips, fees, and managing listings' },
  { key: 'safety', label: 'Trust, Safety & Support', icon: 'fas fa-shield-alt', description: 'Due diligence, verification, contacts & assistance' }
];

export const FAQ_NOTICE = {
  title: 'Important Notice & Legal Disclaimer',
  paragraphs: [
  "TradeCall India provides an online property and business listing platform. Unless explicitly stated otherwise for a particular service, listing information is supplied by advertisers and should be independently verified.",
  "TradeCall India does not guarantee property ownership, listing accuracy, business credentials, transaction completion, legal compliance, future appreciation, or investment returns unless a specific written service term expressly provides otherwise.",
  "Buyers, sellers, landlords, tenants, and business users are responsible for verifying relevant information and complying with applicable laws and regulations."
]
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    "id": 1,
    "question": "What is TradeCall India?",
    "category": "general",
    "blocks": [
      {
        "type": "paragraph",
        "text": "TradeCall India is an online property listing and business listing platform designed to help users discover and advertise properties and property-related businesses. Users can explore available properties for sale, purchase, and rent, as well as discover businesses and services associated with the real estate sector."
      },
      {
        "type": "paragraph",
        "text": "The platform aims to bring property seekers, property owners, real estate professionals, and related businesses together in one place."
      }
    ]
  },
  {
    "id": 2,
    "question": "What services does TradeCall India offer?",
    "category": "general",
    "blocks": [
      {
        "type": "paragraph",
        "text": "TradeCall India offers property listing and property-related business listing and registration services, subject to the categories and features available on the website."
      },
      {
        "type": "paragraph",
        "text": "The platform supports property discovery and advertising for different property types and aims to provide online visibility to eligible property-related businesses and service providers."
      },
      {
        "type": "paragraph",
        "text": "Its services may include:"
      },
      {
        "type": "list",
        "items": [
          "Residential property listings",
          "Plots and land listings",
          "Houses, flats, and builder floors",
          "Agricultural land and commercial property listings",
          "Properties available for sale or rent",
          "Property dealer and real estate agency listings",
          "Builder and developer business listings",
          "Construction, architecture, and engineering business listings",
          "Other property-related business and service listings"
        ]
      },
      {
        "type": "paragraph",
        "text": "Visit https://tradecall.in to explore the available categories and services."
      }
    ]
  },
  {
    "id": 3,
    "question": "What types of properties can I list on TradeCall India?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Depending on the categories available on the website, you can advertise different types of properties, including:"
      },
      {
        "type": "list",
        "items": [
          "Residential plots and land",
          "Independent houses and builder floors",
          "Flats and apartments",
          "Agricultural land and farm properties",
          "Commercial shops and office spaces",
          "Industrial properties and industrial land",
          "Houses, flats, and commercial spaces for rent",
          "Other supported property categories"
        ]
      },
      {
        "type": "paragraph",
        "text": "Select the appropriate category when creating your listing and provide accurate property information."
      }
    ]
  },
  {
    "id": 4,
    "question": "Can I buy a property through TradeCall India?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Yes. You can explore available property listings to find properties that match your preferred location, property type, budget, and requirements."
      },
      {
        "type": "paragraph",
        "text": "Once you find a suitable property, contact the advertiser using the contact details provided in the listing. Confirm the price, availability, ownership details, and other relevant information before arranging a visit or proceeding with a transaction."
      }
    ]
  },
  {
    "id": 5,
    "question": "How can I sell my property on TradeCall India?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "To advertise your property, visit https://tradecall.in and follow the available account registration and property listing process."
      },
      {
        "type": "paragraph",
        "text": "Provide complete and accurate information, including:"
      },
      {
        "type": "list",
        "items": [
          "Property type and location",
          "Plot area, land size, or built-up area",
          "Expected selling price",
          "Property features and facilities",
          "Genuine photographs, where supported",
          "Relevant contact information"
        ]
      },
      {
        "type": "paragraph",
        "text": "A clear and informative listing can help prospective buyers understand your property and contact you for further details."
      }
    ]
  },
  {
    "id": 6,
    "question": "How can I list a property for rent?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "You can advertise a house, flat, builder floor, shop, office, or another supported property type for rent by following the listing process on TradeCall India."
      },
      {
        "type": "paragraph",
        "text": "Include the monthly rent, location, property size, available facilities, security deposit, and other relevant rental conditions. Keep the listing updated whenever the property is rented or becomes unavailable."
      }
    ]
  },
  {
    "id": 7,
    "question": "Is registration required to list a property?",
    "category": "account",
    "blocks": [
      {
        "type": "paragraph",
        "text": "You may need to create a user account to access the property listing features. Visit TradeCall India and follow the registration or sign-up instructions displayed on the website."
      },
      {
        "type": "paragraph",
        "text": "Provide accurate information and complete any required verification steps before creating or managing your listings."
      }
    ]
  },
  {
    "id": 8,
    "question": "How do I create a user account on TradeCall India?",
    "category": "account",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Visit https://tradecall.in and look for the registration, sign-up, or account creation option. Enter the requested information and follow the instructions to complete registration."
      },
      {
        "type": "paragraph",
        "text": "After registration, use the account features available to you to manage your property listings, business information, or other supported activities."
      }
    ]
  },
  {
    "id": 9,
    "question": "Can I register my business on TradeCall India?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Yes. TradeCall India offers business listing and registration services for eligible businesses related to the property and real estate sector."
      },
      {
        "type": "paragraph",
        "text": "Business owners can use the available registration options to showcase their business name, category, location, services, description, and contact information, where supported by the platform."
      },
      {
        "type": "paragraph",
        "text": "Visit https://tradecall.in and follow the available business listing or registration process."
      }
    ]
  },
  {
    "id": 10,
    "question": "What types of businesses can be listed on TradeCall India?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "TradeCall India aims to support a range of businesses associated with property, real estate, construction, and related services. Depending on the categories available, eligible businesses may include:"
      },
      {
        "type": "list",
        "items": [
          "Property dealers and real estate agents",
          "Real estate agencies and consultants",
          "Builders and property developers",
          "Construction companies and contractors",
          "Architects and civil engineers",
          "Structural designers and building planning consultants",
          "Interior designers and renovation service providers",
          "Property management service providers",
          "Building material suppliers",
          "Other property-related businesses and service providers"
        ]
      },
      {
        "type": "paragraph",
        "text": "Please check the current business categories on the website before registering."
      }
    ]
  },
  {
    "id": 11,
    "question": "What is the difference between a property listing and a business listing?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "A property listing advertises an individual property available for sale, purchase, or rent. It typically includes the property type, location, area, price, photographs, and contact details."
      },
      {
        "type": "paragraph",
        "text": "A business listing showcases a business and the services it provides. It may include the business name, category, address or service area, description, services, and contact information."
      },
      {
        "type": "paragraph",
        "text": "For example, a property dealer may register their real estate business and separately advertise individual plots, houses, flats, or commercial properties, where supported by the platform."
      }
    ]
  },
  {
    "id": 12,
    "question": "Can property dealers list both their business and their properties?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Yes, where supported by the available website features, property dealers can create a business listing to showcase their real estate services and publish individual property listings to advertise properties they are authorized to market."
      },
      {
        "type": "paragraph",
        "text": "This allows prospective customers to learn about the business and explore the properties being offered. Dealers should ensure that all property information is accurate and that they have the appropriate authority to advertise each property."
      }
    ]
  },
  {
    "id": 13,
    "question": "Can builders and developers register their businesses?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Builders and developers can explore the available business listing options to present their businesses and eligible residential or commercial projects."
      },
      {
        "type": "paragraph",
        "text": "Business descriptions and project listings should accurately state the location, property type, pricing, facilities, approvals, and other relevant details. Any claims about regulatory approvals or project registration should be supported by appropriate documentation."
      }
    ]
  },
  {
    "id": 14,
    "question": "Can architects, civil engineers, and construction companies register?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Eligible architects, civil engineers, construction companies, contractors, structural designers, interior designers, and other property-related service providers can explore the business registration categories available on TradeCall India."
      },
      {
        "type": "paragraph",
        "text": "A business listing can help present the services offered, business location, service area, and contact information to people looking for relevant property and construction services."
      },
      {
        "type": "paragraph",
        "text": "All professional qualifications, licences, and certifications should be described accurately."
      }
    ]
  },
  {
    "id": 15,
    "question": "Why should I register my property-related business on TradeCall India?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "A business listing can help you establish an online presence and make your business information available to people searching for relevant property-related services."
      },
      {
        "type": "paragraph",
        "text": "Potential benefits include:"
      },
      {
        "type": "list",
        "items": [
          "Online visibility for your business",
          "Presentation of your business name and services",
          "Promotion of your business category and location",
          "Opportunities to connect with prospective customers",
          "A convenient way to showcase your business information",
          "The ability to complement your business listing with individual property advertisements, where supported"
        ]
      },
      {
        "type": "paragraph",
        "text": "Actual visibility, enquiries, leads, and business results depend on several factors and are not guaranteed."
      }
    ]
  },
  {
    "id": 16,
    "question": "How can I register a property-related business?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Visit https://tradecall.in and look for the business listing, registration, or account creation option available on the website."
      },
      {
        "type": "paragraph",
        "text": "Follow the instructions and provide the requested information, which may include:"
      },
      {
        "type": "list",
        "items": [
          "Business name",
          "Business category",
          "Address or service area",
          "Contact details",
          "Business description",
          "Products or services offered",
          "Other information requested during registration"
        ]
      },
      {
        "type": "paragraph",
        "text": "Review the applicable website terms and any listing charges before submitting your registration."
      }
    ]
  },
  {
    "id": 17,
    "question": "Can I find properties in Palwal and Faridabad?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Users interested in Palwal, Faridabad, and other locations can explore the property listings available on TradeCall India."
      },
      {
        "type": "paragraph",
        "text": "Depending on the available inventory, you may find residential plots, houses, flats, agricultural land, commercial properties, industrial land, or rental accommodation."
      },
      {
        "type": "paragraph",
        "text": "Property availability, prices, and locations depend on the listings published on the platform."
      }
    ]
  },
  {
    "id": 18,
    "question": "Can I find agricultural land on TradeCall India?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "You can explore available agricultural land and other land listings where these categories are supported."
      },
      {
        "type": "paragraph",
        "text": "Before purchasing agricultural land, check the ownership documents, land area, road access, land-use classification, applicable restrictions, and permitted uses. Eligibility and land-use requirements may depend on state laws and the particular property."
      }
    ]
  },
  {
    "id": 19,
    "question": "How can I find a property within my budget?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Compare available properties based on location, price, size, facilities, and intended use. Contact the advertiser to confirm the latest asking price and negotiate terms where applicable."
      },
      {
        "type": "paragraph",
        "text": "Remember to include stamp duty, registration charges, applicable taxes, brokerage, legal fees, and other transaction expenses when calculating your total budget."
      }
    ]
  },
  {
    "id": 20,
    "question": "Are the property prices displayed on TradeCall India final?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Not necessarily. Advertised prices may be negotiable or indicative, depending on the seller or advertiser."
      },
      {
        "type": "paragraph",
        "text": "Always confirm the current price, payment terms, additional charges, and other conditions directly with the advertiser before making a financial commitment."
      }
    ]
  },
  {
    "id": 21,
    "question": "How do I contact a property owner or dealer?",
    "category": "safety",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Open the relevant property listing and review the contact options provided. Depending on the listing, you may be able to contact the advertiser to request additional details, discuss pricing, arrange a property visit, or clarify transaction conditions."
      },
      {
        "type": "paragraph",
        "text": "Contact options may vary between listings."
      }
    ]
  },
  {
    "id": 22,
    "question": "Are properties listed on TradeCall India verified?",
    "category": "safety",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Users should independently verify property ownership, seller identity, title documents, approvals, encumbrances, boundaries, and other relevant details before completing a transaction."
      },
      {
        "type": "paragraph",
        "text": "Do not assume that a property or advertiser has been independently verified unless TradeCall India explicitly states the scope and status of that verification."
      }
    ]
  },
  {
    "id": 23,
    "question": "Does TradeCall India guarantee property appreciation or investment returns?",
    "category": "safety",
    "blocks": [
      {
        "type": "paragraph",
        "text": "No. Property investment involves risks, and future appreciation or returns cannot be guaranteed."
      },
      {
        "type": "paragraph",
        "text": "Property values may depend on location, infrastructure, demand, market conditions, legal status, and economic developments. Buyers should conduct independent research and seek qualified legal or financial advice where appropriate before making an investment decision."
      }
    ]
  },
  {
    "id": 24,
    "question": "What should I check before purchasing a plot?",
    "category": "safety",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Before purchasing a residential, commercial, or agricultural plot, consider checking:"
      },
      {
        "type": "list",
        "items": [
          "Ownership and title documents",
          "Encumbrances, disputes, and outstanding dues",
          "Approved land use and zoning restrictions",
          "Layout approvals and development permissions, where applicable",
          "Road access and actual plot boundaries",
          "Electricity, water, drainage, and other facilities",
          "Applicable RERA registration requirements, where relevant",
          "Stamp duty, registration charges, and other transaction costs"
        ]
      },
      {
        "type": "paragraph",
        "text": "Consult a qualified property lawyer before finalizing the transaction."
      }
    ]
  },
  {
    "id": 25,
    "question": "How can I make my property listing more attractive?",
    "category": "account",
    "blocks": [
      {
        "type": "paragraph",
        "text": "To improve the quality of your property listing:"
      },
      {
        "type": "list",
        "items": [
          "Use a clear and descriptive title.",
          "Provide accurate location and property size details.",
          "Mention the expected selling price or rent.",
          "Add genuine, clear photographs where supported.",
          "Highlight actual features, facilities, and road access.",
          "Provide correct contact information.",
          "Update the listing when the price or availability changes."
        ]
      },
      {
        "type": "paragraph",
        "text": "Avoid misleading descriptions, unsupported investment claims, and inaccurate photographs."
      }
    ]
  },
  {
    "id": 26,
    "question": "How can I make my business listing more informative?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Create a clear and professional business profile using accurate information."
      },
      {
        "type": "paragraph",
        "text": "Consider including:"
      },
      {
        "type": "list",
        "items": [
          "Correct business name and category",
          "Business address or service area",
          "Description of products and services",
          "Contact information",
          "Genuine business photographs or logo, where supported",
          "Relevant qualifications or certifications, where applicable",
          "Accurate business hours, if the feature is available"
        ]
      },
      {
        "type": "paragraph",
        "text": "Keep your details updated so prospective customers can understand your services and contact you using the correct information."
      }
    ]
  },
  {
    "id": 27,
    "question": "Can I update or remove my property listing?",
    "category": "account",
    "blocks": [
      {
        "type": "paragraph",
        "text": "If your account provides listing management features, sign in and look for the relevant edit, update, deactivate, or delete option."
      },
      {
        "type": "paragraph",
        "text": "If these options are unavailable, use the contact or support information published on TradeCall India. Update or remove listings promptly when a property is sold, rented, withdrawn, or no longer available."
      }
    ]
  },
  {
    "id": 28,
    "question": "Can I update my business listing after registration?",
    "category": "business",
    "blocks": [
      {
        "type": "paragraph",
        "text": "If business management features are available in your account, you may be able to update your business description, location, contact details, services, and other information."
      },
      {
        "type": "paragraph",
        "text": "Keep your business details accurate and current. If editing options are unavailable, contact the website using its published support information."
      }
    ]
  },
  {
    "id": 29,
    "question": "Does TradeCall India charge a registration or listing fee?",
    "category": "account",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Registration fees, property listing charges, business listing fees, promotional packages, and other commercial terms may depend on the services offered by the website."
      },
      {
        "type": "paragraph",
        "text": "Please check the current pricing and terms displayed on TradeCall India or contact the website's support team before purchasing a paid service. Do not assume that all services are free or paid unless the applicable terms clearly state so."
      }
    ]
  },
  {
    "id": 30,
    "question": "Can I advertise more than one property or business?",
    "category": "account",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Multiple property or business listings may be possible depending on the features, account permissions, and listing rules available on the website."
      },
      {
        "type": "paragraph",
        "text": "Follow the applicable process for each listing and ensure that every property or business entry contains accurate, current information. Avoid duplicate or misleading listings."
      }
    ]
  },
  {
    "id": 31,
    "question": "How can tenants find suitable rental properties?",
    "category": "property",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Tenants can explore available rental listings and compare locations, monthly rent, property size, facilities, security deposits, maintenance charges, and lease conditions."
      },
      {
        "type": "paragraph",
        "text": "Contact the advertiser to confirm availability and arrange a visit before paying a deposit. Obtain a written rental agreement and receipts for payments made."
      }
    ]
  },
  {
    "id": 32,
    "question": "What should I do if I find incorrect or suspicious information?",
    "category": "safety",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Do not make payments or share sensitive financial information until you have independently checked the advertiser and property or business details."
      },
      {
        "type": "paragraph",
        "text": "Preserve relevant listing information and report suspicious or misleading content through the reporting or contact channels available on the website. If fraud is suspected, consider contacting the appropriate authorities."
      }
    ]
  },
  {
    "id": 33,
    "question": "Is TradeCall India only for property buyers and sellers?",
    "category": "general",
    "blocks": [
      {
        "type": "paragraph",
        "text": "No. TradeCall India supports property listing and property-related business listing and registration services."
      },
      {
        "type": "paragraph",
        "text": "The platform is intended for property owners, buyers, sellers, landlords, tenants, property dealers, real estate agents, builders, developers, construction companies, architects, civil engineers, and other eligible businesses associated with the property sector."
      },
      {
        "type": "paragraph",
        "text": "Users can explore the relevant services and categories available on the website."
      }
    ]
  },
  {
    "id": 34,
    "question": "How can I contact TradeCall India for assistance?",
    "category": "safety",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Visit https://tradecall.in to explore the website and its available contact or support options."
      },
      {
        "type": "paragraph",
        "text": "For assistance with user registration, property listings, business listings, account access, or other website-related questions, use the contact information published on the website."
      }
    ]
  },
  {
    "id": 35,
    "question": "Why should I use TradeCall India?",
    "category": "general",
    "blocks": [
      {
        "type": "paragraph",
        "text": "TradeCall India aims to make property discovery, property advertising, and property-related business promotion more accessible through an online platform."
      },
      {
        "type": "paragraph",
        "text": "Whether you want to buy a plot, sell a house, rent a flat, advertise agricultural land, promote your real estate agency, register a construction business, or showcase property-related professional services, TradeCall India provides a place to explore the available listing opportunities."
      },
      {
        "type": "paragraph",
        "text": "Explore property and business listing opportunities today at https://tradecall.in."
      }
    ]
  }
];
