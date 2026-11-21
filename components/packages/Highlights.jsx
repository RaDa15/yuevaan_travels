import Icon from '@/components/icons';
import styles from './PackageDetail.module.css';

export default function Highlights({ items }) {
  return (
    <section className="pkg-section">
      <div>
        <span className="pkg-badge-row">
          <span className="pkg-badge-dot" aria-hidden="true" />
          HIGHLIGHTS
        </span>
        <h2 className="pkg-section-title">Why you’ll love this journey</h2>
      </div>
      <ul className="pkg-highlight-list">
        {items.map((item) => (
          <li key={item} className="pkg-highlight-item">
            <Icon name="check" size={20} className={styles.highlightCheck} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
