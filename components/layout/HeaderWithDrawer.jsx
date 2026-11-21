'use client';

import { useEffect, useRef, useState } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import MobileDrawer from '@/components/layout/MobileDrawer';

if (typeof window !== 'undefined' && typeof window.__cleanExtAttrs === 'function') {
  window.__cleanExtAttrs(document.documentElement);
}

export default function HeaderWithDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef(null);

  useEffect(() => {
    if (typeof window.__cleanExtAttrs === 'function') {
      window.__cleanExtAttrs(document.documentElement);
    }
  }, []);

  return (
    <>
      <SiteHeader
        hamburgerRef={hamburgerRef}
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        returnFocusRef={hamburgerRef}
      />
    </>
  );
}
