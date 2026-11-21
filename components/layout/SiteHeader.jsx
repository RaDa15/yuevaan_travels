'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/icons';
import { site } from '@/data/site';

export default function SiteHeader({ hamburgerRef, drawerOpen, onOpenDrawer }) {
  const pathname = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);
  const [dismissedMenu, setDismissedMenu] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !drawerOpen) {
        const active = document.activeElement;
        if (active && active.closest?.('.dd')) {
          active.blur();
        }
        setDismissedMenu('all');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const handleLogoClick = () => {
    try {
      sessionStorage.setItem('yuevaan_site_visited', '1');
    } catch {}
    document.documentElement.classList.remove('is-preloading');
    document.documentElement.classList.add('skip-preloader');
    setDismissedMenu('all');
  };

  const handleLinkClick = (e, href, menuKey) => {
    if (pathname === '/destinations' && href.startsWith('/destinations#')) {
      e.preventDefault();
      const region = href.split('#')[1];
      window.dispatchEvent(new CustomEvent('yuevaan:select-region', { detail: { region } }));
    }
    if (document.activeElement?.closest?.('.dd')) {
      document.activeElement.blur();
    }
    setDismissedMenu(menuKey || 'all');
  };

  const isMenuDismissed = (key) => dismissedMenu === 'all' || dismissedMenu === key;

  const isDestinations = pathname.startsWith('/destinations');
  const isExperiences = pathname.startsWith('/experiences');
  const isTours = pathname.startsWith('/tours');
  const isGuide = pathname.startsWith('/travel-guide');

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`} id="top">
      <div className="nav-container">
        <Link
          href="/"
          className="brand-logo"
          aria-label="Yuevaan Travels Home"
          onClick={handleLogoClick}
        >
          <img
            src="/logos/yuevaan-logo.png"
            alt="Yuevaan Bhutan Travels"
            width={44}
            height={44}
            className="brand-crest-img"
          />
          <span className="brand-text-wrap">
            <span className="brand-title">Yuevaan</span>
            <span className="brand-tagline">{site.tagline}</span>
          </span>
        </Link>

        <nav
          className="nav-links"
          aria-label="Main Navigation"
          onMouseLeave={() => setDismissedMenu(null)}
        >
          {/* 1. Destinations Dropdown */}
          <div
            className={`dd${isMenuDismissed('destinations') ? ' is-dismissed' : ''}`}
            onMouseEnter={() => {
              if (dismissedMenu && dismissedMenu !== 'destinations') setDismissedMenu(null);
            }}
            onMouseLeave={() => {
              if (dismissedMenu === 'destinations') setDismissedMenu(null);
            }}
            onFocus={() => setDismissedMenu(null)}
          >
            <Link
              href="/destinations"
              className={`nav-top${isDestinations ? ' active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/destinations', 'destinations')}
            >
              <span>Destinations</span>
              <Icon name="chevronDown" className="chevron-icon" size={13} />
            </Link>
            <div className="dd-panel">
              <div className="dd-menu dd-menu-single">
                {site.nav.destinations.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="dd-item"
                    onClick={(e) => handleLinkClick(e, item.href, 'destinations')}
                  >
                    <span className="dd-title">{item.label}</span>
                    <span className="dd-desc">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Experiences & Activities Dropdown */}
          <div
            className={`dd${isMenuDismissed('experiences') ? ' is-dismissed' : ''}`}
            onMouseEnter={() => {
              if (dismissedMenu && dismissedMenu !== 'experiences') setDismissedMenu(null);
            }}
            onMouseLeave={() => {
              if (dismissedMenu === 'experiences') setDismissedMenu(null);
            }}
            onFocus={() => setDismissedMenu(null)}
          >
            <Link
              href="/experiences"
              className={`nav-top${isExperiences ? ' active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/experiences', 'experiences')}
            >
              <span>Experiences &amp; Activities</span>
              <Icon name="chevronDown" className="chevron-icon" size={13} />
            </Link>
            <div className="dd-panel">
              <div className="dd-menu dd-menu-double">
                {site.nav.experiences.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="dd-item dd-item-icon"
                    onClick={(e) => handleLinkClick(e, item.href, 'experiences')}
                  >
                    <Icon name={item.icon} className="dd-icon" size={18} />
                    <div>
                      <span className="dd-title">{item.label}</span>
                      <span className="dd-desc">{item.desc}</span>
                    </div>
                  </Link>
                ))}
                <Link
                  href="/experiences"
                  className="dd-item-footer"
                  onClick={(e) => handleLinkClick(e, '/experiences', 'experiences')}
                >
                  <span>All experiences and activities</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Popular Tours Direct Link */}
          <div className="dd">
            <Link href="/tours" className={`nav-top${isTours ? ' active' : ''}`}>
              <span>Popular Tours</span>
            </Link>
          </div>

          {/* 4. Travel Guide Dropdown */}
          <div
            className={`dd${isMenuDismissed('guide') ? ' is-dismissed' : ''}`}
            onMouseEnter={() => {
              if (dismissedMenu && dismissedMenu !== 'guide') setDismissedMenu(null);
            }}
            onMouseLeave={() => {
              if (dismissedMenu === 'guide') setDismissedMenu(null);
            }}
            onFocus={() => setDismissedMenu(null)}
          >
            <Link
              href="/travel-guide"
              className={`nav-top${isGuide ? ' active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/travel-guide', 'guide')}
            >
              <span>Travel Guide</span>
              <Icon name="chevronDown" className="chevron-icon" size={13} />
            </Link>
            <div className="dd-panel">
              <div className="dd-menu dd-menu-single">
                {site.nav.travelGuide.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="dd-item"
                    onClick={(e) => handleLinkClick(e, item.href, 'guide')}
                  >
                    <span className="dd-title">{item.label}</span>
                    <span className="dd-desc">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="nav-actions">
          <Link href="/plan-my-trip" className="btn-nav-cta">
            Plan my trip
          </Link>
          <button
            ref={hamburgerRef}
            type="button"
            className="hamburger-btn"
            aria-label="Open Mobile Menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={onOpenDrawer}
          >
            <Icon name="menu" size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
