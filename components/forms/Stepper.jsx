import styles from './Forms.module.css';

export default function Stepper({ label, note, value, min = 0, max = 12, onChange }) {
  return (
    <div className="rtb-traveller-row">
      <div>
        <span className="rtb-traveller-label">{label}</span>
        <span className="rtb-traveller-note">{note}</span>
      </div>
      <div className={styles.stepperGroup}>
        <button
          type="button"
          className={styles.stepperBtn}
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className={styles.stepperVal} aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={styles.stepperBtn}
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
