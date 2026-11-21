export default function Badge({ children, variant = 'card', className = '' }) {
  if (variant === 'card') {
    return <span className={`catalog-card-badge ${className}`.trim()}>{children}</span>;
  }
  if (variant === 'tour') {
    return <span className={`tour-badge ${className}`.trim()}>{children}</span>;
  }
  if (variant === 'pill') {
    return <span className={`pkg-pill-badge ${className}`.trim()}>{children}</span>;
  }
  return <span className={`hero-eyebrow-pill ${className}`.trim()}>{children}</span>;
}
