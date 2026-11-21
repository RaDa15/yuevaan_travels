import Link from 'next/link';
import Icon from '@/components/icons';
import {
  parseCompoundSpec,
  parseDestinationSpec,
  parseGradeSpec,
  parseGroupSizeSpec,
  parseHighestPointSpec,
} from '@/lib/format';
import { getExperience } from '@/lib/selectors';
import styles from './PackageDetail.module.css';

const GRADE_SEGMENTS = [1, 2, 3, 4, 5];

function SpecCell({ item }) {
  return (
    <div className="pkg-spec-item">
      <span className={item.featured ? 'pkg-spec-icon pkg-spec-icon-featured' : 'pkg-spec-icon'}>
        <Icon name={item.icon} size={24} />
      </span>
      <div className={styles.specTextWrap}>
        <span className="pkg-spec-label">{item.label}</span>
        <span className={item.metric ? 'pkg-spec-value pkg-spec-value-metric' : 'pkg-spec-value'}>
          {item.href ? (
            <Link href={item.href} className={styles.specLink}>
              {item.primary}
            </Link>
          ) : (
            item.primary
          )}
        </span>
        {item.secondary ? <span className={styles.specSub}>{item.secondary}</span> : null}
        {item.gradeLevel ? (
          <span
            className={styles.gradeMeter}
            role="img"
            aria-label={`Difficulty level ${item.gradeLevel} of 5`}
          >
            {GRADE_SEGMENTS.map((seg) => (
              <span
                key={seg}
                className={
                  seg <= item.gradeLevel
                    ? `${styles.gradeBar} ${styles.gradeBarActive}`
                    : styles.gradeBar
                }
              />
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function SpecsGrid({ tour }) {
  const primaryRegion = tour.regions[0];
  const primaryCategory = tour.categories[0];
  const categoryLabels = tour.categories
    .map((slug) => getExperience(slug)?.title || slug)
    .join(' & ');

  const dest = parseDestinationSpec(tour.specs.destinationLabel);
  const grade = parseGradeSpec(tour.specs.grade);
  const stay = parseCompoundSpec(tour.specs.stay);
  const high = parseHighestPointSpec(tour.specs.highestPoint);
  const trans = parseCompoundSpec(tour.specs.transport);
  const group = parseGroupSizeSpec(tour.specs.groupSize);

  const topRow = [
    {
      icon: 'factDestination',
      label: 'Destination',
      primary: dest.primary,
      secondary: dest.secondary,
      href: `/destinations#${primaryRegion}`,
    },
    {
      icon: 'factDuration',
      label: 'Duration',
      primary: `${tour.days} ${tour.days === 1 ? 'day' : 'days'}`,
      secondary: `${tour.nights} ${tour.nights === 1 ? 'night' : 'nights'}`,
    },
    {
      icon: 'factGrade',
      label: 'Grade',
      primary: grade.primary,
      gradeLevel: grade.level,
    },
    {
      icon: 'factActivities',
      label: 'Activities',
      primary: categoryLabels,
      href: `/experiences/${primaryCategory}`,
    },
  ];

  const bottomRow = [
    {
      icon: 'factStay',
      label: 'Stay',
      primary: stay.primary,
      secondary: stay.secondary,
    },
    {
      icon: 'factHighestPoint',
      label: 'Highest point',
      primary: high.primary,
      secondary: high.secondary,
      featured: true,
      metric: true,
    },
    {
      icon: 'factTransport',
      label: 'Transport',
      primary: trans.primary,
      secondary: trans.secondary,
    },
    {
      icon: 'factGroupSize',
      label: 'Group size',
      primary: group.primary,
      secondary: group.secondary,
    },
  ];

  return (
    <div className="pkg-specs-grid">
      <div className="pkg-specs-row pkg-specs-row-top">
        {topRow.map((item) => (
          <SpecCell key={item.label} item={item} />
        ))}
      </div>
      <div className="pkg-specs-row">
        {bottomRow.map((item) => (
          <SpecCell key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}
