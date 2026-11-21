import Link from 'next/link';
import Icon from '@/components/icons';

export default function Breadcrumb({ items, variant = 'default' }) {
  if (variant === 'package') {
    return (
      <nav className="pkg-breadcrumb-nav" aria-label="Breadcrumb">
        <ol className="pkg-breadcrumb-list">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={item.label} className="breadcrumb-item">
                {idx > 0 ? <span aria-hidden="true">›</span> : null}
                {isLast || !item.href ? (
                  <span aria-current="page" className="breadcrumb-current">{item.label}</span>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb-nav">
      <div className="container">
        <ol className="breadcrumb-list">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={item.label} className="breadcrumb-item">
                {idx > 0 ? (
                  <span className="breadcrumb-sep" aria-hidden="true">
                    <Icon name="chevronRight" size={14} />
                  </span>
                ) : null}
                {isLast || !item.href ? (
                  <span className="breadcrumb-current" aria-current="page">{item.label}</span>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
