import Link from 'next/link';
import Icon from '@/components/icons';
import { getExperience } from '@/lib/selectors';

export default function ConnectedBox({ places, primaryRegion, includedExperiences }) {
  return (
    <div className="pkg-connected-box">
      <div className="pkg-conn-group">
        <span className="pkg-conn-label">Associated Destinations Covered in this Itinerary:</span>
        <div className="pkg-conn-pills">
          {places.map((place) => (
            <Link key={place} href={`/destinations#${primaryRegion}`} className="pkg-conn-pill">
              <Icon name="pin" size={14} />
              <span>{place}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="pkg-conn-group">
        <span className="pkg-conn-label">Included Experiences &amp; Activities:</span>
        <div className="pkg-conn-pills">
          {includedExperiences.map((slug) => {
            const exp = getExperience(slug);
            return (
              <Link key={slug} href={`/experiences/${slug}`} className="pkg-conn-pill">
                <Icon name={exp?.icon || 'compass'} size={14} />
                <span>{exp?.title || slug}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
