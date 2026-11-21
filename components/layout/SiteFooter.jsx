import Link from 'next/link';
import Icon from '@/components/icons';
import { site } from '@/data/site';

export default function SiteFooter({ siteConfig = site }) {
  const hasSocials = Boolean(siteConfig.social.facebook || siteConfig.social.instagram || siteConfig.social.youtube);

  return (
    <footer className="site-footer" id="contact" role="contentinfo">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Col 1: Brand & Agency Identity */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <img
                src="/logos/yuevaan-logo.png"
                alt="Yuevaan Bhutan Travels"
                width={44}
                height={44}
                loading="lazy"
                className="footer-brand-crest"
              />
              <div>
                <span className="footer-brand-title">{siteConfig.name}</span>
                <span className="footer-brand-sub">{siteConfig.subTagline}</span>
              </div>
            </div>
            <p className="footer-brand-desc">
              Officially licensed Kingdom of Bhutan tour operator based in Thimphu. We curate bespoke cultural odysseys, sacred spiritual pilgrimages, and high-altitude Himalayan treks with complete transparency and authentic local warmth.
            </p>
            {hasSocials ? (
              <div className="footer-social-links">
                {site.social.facebook ? (
                  <a href={site.social.facebook} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Facebook">
                    <Icon name="facebook" size={18} />
                  </a>
                ) : null}
                {site.social.instagram ? (
                  <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Instagram">
                    <Icon name="instagram" size={18} />
                  </a>
                ) : null}
                {site.social.youtube ? (
                  <a href={site.social.youtube} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="YouTube">
                    <Icon name="youtube" size={18} />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Col 2: Explore Navigation */}
          <nav className="footer-col footer-nav-col" aria-label="Footer Exploration Links">
            <h2 className="footer-col-title">EXPLORE</h2>
            <ul className="footer-links-list">
              <li>
                <Link href="/destinations" className="footer-nav-link">
                  Destinations
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="footer-nav-link">
                  Experiences &amp; Activities
                </Link>
              </li>
              <li>
                <Link href="/tours" className="footer-nav-link">
                  Popular Tours
                </Link>
              </li>
              <li>
                <Link href="/travel-guide" className="footer-nav-link">
                  Travel Guide &amp; SDF
                </Link>
              </li>
              <li>
                <Link href="/about" className="footer-nav-link">
                  About Our Agency
                </Link>
              </li>
              <li>
                <Link href="/contact" className="footer-nav-link">
                  Contact Us
                </Link>
              </li>
            </ul>
          </nav>

          {/* Col 3: Contact & Concierge Desk */}
          <div className="footer-col footer-contact-col" aria-label="Contact and Concierge">
            <h2 className="footer-col-title">CONTACT &amp; CONCIERGE</h2>
            <p className="footer-contact-address">
              {siteConfig.contact.footerAddress[0]}
              <br />
              {siteConfig.contact.footerAddress[1] || ''}
            </p>
            <div className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <Icon name="whatsapp" size={16} />
              </span>
              <a
                href={`https://wa.me/${siteConfig.contact.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-contact-link footer-contact-wa"
              >
                WhatsApp: {siteConfig.contact.whatsappLabel}
              </a>
            </div>
            <div className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <Icon name="mail" size={16} />
              </span>
              <a href={`mailto:${siteConfig.contact.email}`} className="footer-contact-link">
                {siteConfig.contact.email}
              </a>
            </div>
            <span className="footer-contact-hours">{siteConfig.contact.hours}</span>
            <div className="footer-quick-actions">
              <Link href="/plan-my-trip" className="footer-action-link">
                Plan Your Custom Journey →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Row: Legal & Back to Top */}
        <div className="footer-bottom-row">
          <div>© 2026 {siteConfig.name}. All rights reserved.</div>
          <div className="footer-legal-links">
            <Link href="/legal#privacy">Privacy Policy</Link>
            <Link href="/legal#terms">Terms &amp; Conditions</Link>
            <Link href="/legal#booking-policy">Booking Policy</Link>
            <a href="#top" className="footer-back-top">Back to top ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
