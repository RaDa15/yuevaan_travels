'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/data/site';

function getInitialGroup(pathname) {
  if (pathname.startsWith('/destinations')) return 'destinations';
  if (pathname.startsWith('/experiences')) return 'experiences';
  if (pathname.startsWith('/travel-guide')) return 'guide';
  return null;
}

export default function MobileDrawer({ open, onClose, returnFocusRef }) {
  const pathname = usePathname() || '/';
  const [openGroup, setOpenGroup] = useState(() => getInitialGroup(pathname));
  const closeBtnRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        closeBtnRef.current?.focus();
      });
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      document.body.style.overflow = '';
      returnFocusRef?.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const toggleGroup = (key) => {
    setOpenGroup((prev) => (prev === key ? null : key));
  };

  const handleLinkClick = (e, href) => {
    if (pathname === '/destinations' && href.startsWith('/destinations#')) {
      e.preventDefault();
      const region = href.split('#')[1];
      window.dispatchEvent(new CustomEvent('yuevaan:select-region', { detail: { region } }));
    }
    onClose();
  };

  return (
    <div
      id="mobile-nav-drawer"
      className={`mobile-drawer${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
      aria-hidden={!open}
    >
      <div className="mobile-drawer-header">
        <div className="brand-title">Yuevaan Travels</div>
        <button
          ref={closeBtnRef}
          type="button"
          className="close-drawer-btn"
          aria-label="Close navigation"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="mobile-drawer-body">
        {/* 1. Destinations Accordion */}
        <div className="mobile-nav-group">
          <button
            type="button"
            className={`mobile-group-toggle${openGroup === 'destinations' ? ' active' : ''}`}
            aria-expanded={openGroup === 'destinations'}
            onClick={() => toggleGroup('destinations')}
          >
            <span>Destinations</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div className={`mobile-group-links${openGroup === 'destinations' ? ' expanded' : ''}`}>
            {site.nav.destinations.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mobile-sub-link"
                onClick={(e) => handleLinkClick(e, item.href)}
              >
                {item.mobileLabel}
              </Link>
            ))}
          </div>
        </div>

        {/* 2. Experiences & Activities Accordion */}
        <div className="mobile-nav-group">
          <button
            type="button"
            className={`mobile-group-toggle${openGroup === 'experiences' ? ' active' : ''}`}
            aria-expanded={openGroup === 'experiences'}
            onClick={() => toggleGroup('experiences')}
          >
            <span>Experiences &amp; Activities</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div className={`mobile-group-links${openGroup === 'experiences' ? ' expanded' : ''}`}>
            {site.nav.experiences.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mobile-sub-link"
                onClick={() => onClose()}
              >
                {item.mobileLabel}
              </Link>
            ))}
          </div>
        </div>

        {/* 3. Travel Guide Accordion */}
        <div className="mobile-nav-group">
          <button
            type="button"
            className={`mobile-group-toggle${openGroup === 'guide' ? ' active' : ''}`}
            aria-expanded={openGroup === 'guide'}
            onClick={() => toggleGroup('guide')}
          >
            <span>Travel Guide</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div className={`mobile-group-links${openGroup === 'guide' ? ' expanded' : ''}`}>
            {site.nav.travelGuide.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mobile-sub-link"
                onClick={() => onClose()}
              >
                {item.mobileLabel}
              </Link>
            ))}
          </div>
        </div>

        {/* Direct Links */}
        <div className="mobile-drawer-direct">
          <Link
            href="/tours"
            className={`mobile-direct-link${pathname === '/tours' ? ' is-active' : ''}`}
            onClick={() => onClose()}
          >
            Popular Tours
          </Link>
          <Link
            href="/about"
            className={`mobile-direct-link${pathname === '/about' ? ' is-active' : ''}`}
            onClick={() => onClose()}
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className={`mobile-direct-link${pathname === '/contact' ? ' is-active' : ''}`}
            onClick={() => onClose()}
          >
            Contact Us
          </Link>
        </div>
      </div>

      <div className="mobile-drawer-footer">
        <Link href="/plan-my-trip" className="btn btn-neutral mobile-drawer-cta" onClick={() => onClose()}>
          Plan My Trip
        </Link>
      </div>
    </div>
  );
}
