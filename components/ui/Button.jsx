import Link from 'next/link';

const VARIANT_CLASSES = {
  primary: 'btn btn-primary',
  whatsapp: 'btn btn-whatsapp',
  neutral: 'btn btn-neutral',
  outline: 'btn btn-outline',
  'outline-white': 'btn btn-outline-white',
  'outline-dark': 'btn btn-outline-dark',
  secondary: 'btn btn-secondary',
  'hero-primary': 'btn-hero-primary',
  'hero-secondary': 'btn-hero-secondary',
  'mix-primary': 'btn-mix-primary',
  'mix-outline': 'btn-mix-outline',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  external = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'hero-btn-lg' : '';
  const baseClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const combined = `${baseClass} ${sizeClass} ${className}`.trim();

  if (href) {
    if (external || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return (
        <a
          href={href}
          className={combined}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          {...rest}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={combined} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={combined} {...rest}>
      {children}
    </button>
  );
}
