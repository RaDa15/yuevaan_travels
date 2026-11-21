import Link from 'next/link';
import Icon from '@/components/icons';
import { site } from '@/data/site';

export default function MobileBar({ siteConfig = site }) {
  return (
    <div className="m-bar">
      <a
        href={`https://wa.me/${siteConfig.contact.whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="m-bar-wa"
        aria-label="WhatsApp Concierge"
      >
        <Icon name="whatsapp" size={22} />
      </a>
      <Link href="/plan-my-trip" className="m-bar-plan">
        Plan my trip
      </Link>
    </div>
  );
}
