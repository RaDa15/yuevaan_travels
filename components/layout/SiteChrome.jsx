'use client';

import { usePathname } from 'next/navigation';

const PORTAL_PREFIXES = ['/admin', '/reservation', '/reservations', '/manager', '/finance', '/owner'];

export default function SiteChrome({ header, mobileBar, footer, children }) {
  const pathname = usePathname() || '';
  const isAdminPortal = PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isAdminPortal) {
    return <>{children}</>;
  }

  return (
    <>
      {header}
      {children}
      {mobileBar}
      {footer}
    </>
  );
}
