export function Icon({ name, className = '', size = 18 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'bird':
      return (
        <svg {...props}>
          <path d="M10 10h4M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3M20 21a2 2 0 0 0 2-2v-3.85c0-1.36-.4-2.69-1.15-3.82L19 9H5l-1.85 2.33A6.94 6.94 0 0 0 2 15.15V19a2 2 0 0 0 2 2z" />
        </svg>
      );
    case 'mountain':
      return (
        <svg {...props}>
          <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
        </svg>
      );
    case 'leaf':
      return (
        <svg {...props}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case 'landmark':
      return (
        <svg {...props}>
          <path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 20 7H4z" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...props}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case 'music':
      return (
        <svg {...props}>
          <path d="M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        </svg>
      );
    case 'compass':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...props}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'home':
      return (
        <svg {...props}>
          <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />
        </svg>
      );
    case 'chevronDown':
      return (
        <svg {...props} strokeWidth={2}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg {...props} strokeWidth={2}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case 'arrowRight':
      return (
        <svg {...props} strokeWidth={2}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...props} strokeWidth={2}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...props} strokeWidth={2}>
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...props} strokeWidth={2}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...props}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...props}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case 'bed':
      return (
        <svg {...props}>
          <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
        </svg>
      );
    case 'car':
      return (
        <svg {...props}>
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props} strokeWidth={2.4}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props} strokeWidth={2}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'external':
      return (
        <svg {...props} strokeWidth={2}>
          <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      );
    case 'map':
      return (
        <svg {...props} strokeWidth={2.2}>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        </svg>
      );
    case 'play':
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...props}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...props}>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...props}>
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
        </svg>
      );
    case 'factDestination':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
          <path d="M8.9 12.2 11 9.3l1.3 1.7.9-1.1 1.9 2.3z" />
        </svg>
      );
    case 'factDuration':
      return (
        <svg {...props} strokeWidth={1.75}>
          <circle cx="8" cy="8" r="2.6" />
          <path d="M8 2.5V4M8 12v1.5M2.5 8H4M12 8h1.5" />
          <path d="M18.5 11.6A4.6 4.6 0 1 0 20.4 19A4 4 0 0 1 18.5 11.6z" />
        </svg>
      );
    case 'factGrade':
      return (
        <svg {...props} strokeWidth={1.75}>
          <rect x="4" y="14" width="3.5" height="6" rx="1" />
          <rect x="10.25" y="9.5" width="3.5" height="10.5" rx="1" />
          <rect x="16.5" y="4.5" width="3.5" height="15.5" rx="1" />
        </svg>
      );
    case 'factActivities':
      return (
        <svg {...props} strokeWidth={1.75}>
          <circle cx="12.5" cy="4.6" r="1.8" />
          <path d="M12 8 10.3 13.2l3.2 3V21M10.3 13.2 8.5 21M12 8l2.8 2.8 2.4.5M17.4 10.2 18.6 21M11.7 8.3l-2.6-.5a1 1 0 0 0-1.1.8l-.7 3.2a1 1 0 0 0 .7 1.2l2.2.6" />
        </svg>
      );
    case 'factStay':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M12 4.5 3 20h18z" />
          <path d="M12 13.5 9.6 20M12 13.5l2.4 6.5M12 4.5 10.8 2.8M12 4.5l1.2-1.7" />
        </svg>
      );
    case 'factHighestPoint':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M2.5 20 9.5 8.5l3.1 5.1 2.4-3.3L21.5 20z" />
          <path d="M9.5 8.5V3.5l3.6 1.3-3.6 1.4" />
        </svg>
      );
    case 'factTransport':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M3 16v-3.3l2.1-4.4A2 2 0 0 1 6.9 7.2h8.4a2 2 0 0 1 1.6.8l2.6 3.5 1.1.4a1 1 0 0 1 .7.9V16" />
          <path d="M3 16h2.7M9.3 16h5.4M18.3 16H21M4.4 11.6h15.4M11.5 7.2v4.4" />
          <circle cx="7.5" cy="16.5" r="1.8" />
          <circle cx="16.5" cy="16.5" r="1.8" />
        </svg>
      );
    case 'factGroupSize':
      return (
        <svg {...props} strokeWidth={1.75}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17.5 14.2a5.5 5.5 0 0 1 3 5.3" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <polygon points="12 2.5 14.95 8.48 21.55 9.44 16.77 14.1 17.9 20.68 12 17.58 6.1 20.68 7.23 14.1 2.45 9.44 9.05 8.48 12 2.5" />
        </svg>
      );
    case 'shieldCheck':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M12 21.5s7.5-3.6 7.5-9.5V5.6L12 3 4.5 5.6V12c0 5.9 7.5 9.5 7.5 9.5z" />
          <path d="m9.2 12.2 2 2 3.8-4" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg {...props} strokeWidth={1.75}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case 'inbox':
      return (
        <svg {...props} strokeWidth={1.75}>
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );
    case 'fileCheck':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props} strokeWidth={1.75}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...props} strokeWidth={1.75}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'clipboardList':
      return (
        <svg {...props} strokeWidth={1.75}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
        </svg>
      );
    case 'printer':
      return (
        <svg {...props} strokeWidth={1.75}>
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      );
    case 'logOut':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case 'userPlus':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      );
    case 'key':
      return (
        <svg {...props} strokeWidth={1.75}>
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props} strokeWidth={1.75}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case 'panelLeft':
      return (
        <svg {...props} strokeWidth={1.75}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props} strokeWidth={1.75}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case 'table':
      return (
        <svg {...props} strokeWidth={1.75}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      );
    case 'kanban':
      return (
        <svg {...props} strokeWidth={1.75}>
          <rect x="3" y="3" width="5" height="18" rx="1" />
          <rect x="10" y="3" width="5" height="12" rx="1" />
          <rect x="17" y="3" width="4" height="15" rx="1" />
        </svg>
      );
    case 'alertCircle':
      return (
        <svg {...props} strokeWidth={1.75}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    default:
      return null;
  }
}

export default Icon;
