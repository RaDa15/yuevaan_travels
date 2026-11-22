export const site = {
  name: 'Yuevaan Bhutan Travels',
  tagline: 'TRAVELS · BHUTAN',
  subTagline: 'Kingdom of Bhutan · Licensed Tour Operator',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yuevaantravels.bt',

  contact: {
    address: [
      'Yuevaan Bhutan Travels',
      'Norzin Lam, Post Box 1422',
      'Thimphu, Kingdom of Bhutan',
    ],
    footerAddress: [
      'Norzin Lam, Post Box 1422',
      'Thimphu, Kingdom of Bhutan',
    ],
    whatsappNumber: '97577611423',
    whatsappLabel: '+975 77 611 423',
    email: 'concierge@yuevaantravels.bt',
    hours: 'Mon–Sat: 9:00 AM – 6:00 PM BTT (Bhutan Standard Time)',
    emergencyHours: 'Emergency Guest Assistance: 24/7 on WhatsApp',
  },

  licence: {
    authority: 'Department of Tourism',
    number: 'DoT/TO/2026/1042',
  },

  fees: {
    sdf: {
      internationalUsdPerNight: 100,
      indianNuPerNight: 1200,
      childDiscountPct: 50,
      childAgeMin: 6,
      childAgeMax: 11,
      adultAgeMin: 12,
      validUntil: '2029-12-31',
    },
    visaUsd: 40,
    gstPct: 5,
    gstAppliesTo: 'tour package components (not SDF, visa or flights)',
  },

  nav: {
    destinations: [
      {
        label: 'Western Bhutan',
        href: '/destinations#western-bhutan',
        desc: 'Paro, Thimphu, Punakha, Haa & Gasa',
        mobileLabel: 'Western Bhutan (Paro, Thimphu, Punakha)',
      },
      {
        label: 'Central Bhutan',
        href: '/destinations#central-bhutan',
        desc: 'Bumthang, Trongsa & Zhemgang',
        mobileLabel: 'Central Bhutan (Bumthang, Trongsa)',
      },
      {
        label: 'Eastern Bhutan',
        href: '/destinations#eastern-bhutan',
        desc: 'Trashigang, Mongar & Merak–Sakteng',
        mobileLabel: 'Eastern Bhutan (Trashigang, Mongar)',
      },
      {
        label: 'Southern Bhutan',
        href: '/destinations#southern-bhutan',
        desc: 'Gelephu, Royal Manas & Phuentsholing',
        mobileLabel: 'Southern Bhutan (Gelephu, Manas)',
      },
    ],
    experiences: [
      { label: 'Bird watching', mobileLabel: 'Bird Watching', href: '/experiences/bird-watching', desc: '770+ species & cranes', icon: 'bird' },
      { label: 'Trekking & hiking', mobileLabel: 'Trekking & Hiking', href: '/experiences/trekking-hiking', desc: 'Day hikes to high passes', icon: 'mountain' },
      { label: 'Nature & wildlife', mobileLabel: 'Nature & Wildlife', href: '/experiences/nature-wildlife', desc: 'Takin & pristine parks', icon: 'leaf' },
      { label: 'Cultural experiences', mobileLabel: 'Cultural Experiences', href: '/experiences/cultural-experiences', desc: 'Dzongs, living heritage & arts', icon: 'landmark' },
      { label: 'Spiritual experiences', mobileLabel: 'Spiritual Experiences', href: '/experiences/spiritual-experiences', desc: 'Meditation & blessings', icon: 'flame' },
      { label: 'Festivals & events', mobileLabel: 'Festivals & Events', href: '/experiences/festivals-events', desc: 'Sacred mask dances & Tshechus', icon: 'music' },
      { label: 'Adventure activities', mobileLabel: 'Adventure Activities', href: '/experiences/adventure-activities', desc: 'Rafting, biking & expeditions', icon: 'compass' },
      { label: 'Photography tours', mobileLabel: 'Photography Tours', href: '/experiences/photography-tours', desc: 'Dawn vistas & Himalayan light', icon: 'camera' },
      { label: 'Local experiences', mobileLabel: 'Local Experiences', href: '/experiences/local-experiences', desc: 'Farmhouses, textiles & stone baths', icon: 'home' },
    ],
    travelGuide: [
      { label: 'Bhutan travel guide', mobileLabel: 'Bhutan Travel Guide', href: '/travel-guide#bhutan-travel-guide', desc: 'Know before you go' },
      { label: 'Visa and entry requirements', mobileLabel: 'Visa & Entry Requirements', href: '/travel-guide#visa-and-entry-requirements', desc: 'How the tourist visa works' },
      { label: 'Sustainable Development Fee (SDF)', mobileLabel: 'Sustainable Development Fee (SDF)', href: '/travel-guide#sustainable-development-fee', desc: 'Transparent daily levy rates' },
      { label: 'Best time to visit', mobileLabel: 'Best Time to Visit', href: '/travel-guide#best-time-to-visit', desc: 'Month-by-month guide' },
      { label: 'Transportation', mobileLabel: 'Transportation', href: '/travel-guide#transportation', desc: 'Drukair flights, roads & SUVs' },
      { label: 'FAQs', mobileLabel: 'FAQs', href: '/travel-guide#faqs', desc: 'Quick answers to common questions' },
    ],
  },

  social: {
    facebook: '',
    instagram: '',
    youtube: '',
  },

  accreditations: [
    { id: 'dot', label: 'Department of Tourism', org: 'Department of Tourism Bhutan', logo: '/logos/tourism-bhutan.png' },
    { id: 'abto', label: 'ABTO Member', org: 'Association of Bhutanese Tour Operators (ABTO)', logo: '/logos/abto.png' },
    { id: 'bcci', label: 'BCCI Accredited', org: 'Bhutan Chamber of Commerce & Industry (BCCI)', logo: '/logos/bcci.png' },
    { id: 'drukair', label: 'Drukair Partner', org: 'Drukair Royal Bhutan Airlines Official Partner', logo: '/logos/drukair.png' },
    { id: 'gab', label: 'GAB Certified Guides', org: 'Guide Association of Bhutan (GAB)', logo: '/logos/gab.png' },
    { id: 'dcr', label: 'Druk Car Rental', org: 'Druk Car Rental Service Bhutan', logo: '/logos/dcr.png' },
    { id: 'tripme', label: 'trip.me Specialist', org: 'trip.me Verified Bhutan Travel Specialist', logo: '/logos/tripme.png' },
    { id: 'royal-gov', label: 'DoT Licensed Operator', org: 'Kingdom of Bhutan Royal Government Licence', logo: '/logos/royal-gov-crest.png' },
    { id: 'yuevaan', label: 'Yuevaan Bhutan', org: 'Yuevaan Bhutan Travels — Thimphu Headquarters', logo: '/logos/bhutan-crest.png' },
  ],

  stats: [
    { value: '12+ Years', label: 'In Bhutanese Tourism' },
    { value: '1,800+', label: 'Delighted Travelers' },
    { value: '99.4%', label: '5-Star Reviews' },
  ],

  aboutStats: [
    { value: '100% Local', label: 'Bhutanese Staff' },
    { value: 'Licensed', label: 'DoT Certified Operator' },
    { value: 'Zero', label: 'Middleman Markups' },
  ],

  media: {
    heroVideos: [
      '/videos/bhutan-home-film-web.mp4',
      '/videos/Bhutan-Home-Film%20No-Text%204K.mp4',
      '/videos/flight-preloader.mp4',
      '/videos/paro-valley-loop.mp4',
    ],
    heroPoster: '/images/flight-himalayas.jpg',
    filmUrl:
      process.env.NEXT_PUBLIC_FILM_URL ||
      '/videos/discover-bhutan-film-web.mp4',
    filmPoster: '/images/tigers-nest.jpg',
  },

  packageDefaults: {
    alert: {
      title: 'Guaranteed Departures: Flexible Dates Tailored to Your Calendar',
      text: 'This signature itinerary operates on your preferred private dates with your own personal Bhutanese guide and private driver. All official permits, visas, and SDF levies are handled seamlessly.',
    },
    overnight: 'Handpicked Heritage Lodge / Deluxe Camp · Full Board Included',
    sidebarPerks: [
      'No deposit required until itinerary confirmed',
      'Guaranteed 24-hour response from Thimphu desk',
      'Private guide, luxury SUV & handpicked hotels',
    ],
    faqs: [
      {
        q: 'How does Bhutan visa processing work?',
        a: 'Yuevaan Bhutan Travels processes your official visa clearance directly with the Department of Tourism and Department of Immigration. All we require is a color passport copy valid for at least 6 months. Your e-visa clearance is issued within 3 to 5 business days and emailed to you.',
      },
      {
        q: 'What is the Sustainable Development Fee (SDF)?',
        a: 'The SDF is a mandatory Royal Government levy per adult per night that funds free universal healthcare, education, environmental conservation, and sustainable tourism infrastructure across Bhutan. It is 100% included in all our tour package prices.',
      },
    ],
  },

  travellerOptions: {
    nationalities: [
      'Bhutan',
      'United States',
      'United Kingdom',
      'Australia',
      'Canada',
      'Germany',
      'France',
      'Switzerland',
      'Singapore',
      'Japan',
      'India',
      'Bangladesh',
      'Maldives',
      'Other International Passport',
    ],
    phoneCodes: ['+975', '+1', '+44', '+61', '+49', '+33', '+41', '+65', '+81', '+91', '+880'],
    partyOptions: [
      'Couple (2 adults)',
      'Solo traveller',
      'Family with children',
      'Small group (3–6 persons)',
      'Group of 7+ persons',
    ],
  },
};
