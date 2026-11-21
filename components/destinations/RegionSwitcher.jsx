'use client';

import { useEffect, useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import RegionBlock from './RegionBlock';

const VALID_REGIONS = ['western-bhutan', 'central-bhutan', 'eastern-bhutan', 'southern-bhutan'];

function resolveRegion(raw) {
  const clean = (raw || '').replace('#', '').toLowerCase();
  return VALID_REGIONS.includes(clean) ? clean : 'western-bhutan';
}

export default function RegionSwitcher({ regionsData }) {
  const [activeRegion, setActiveRegion] = useState('western-bhutan');
  const [hasHydrated, setHasHydrated] = useState(false);

  const selectRegion = (slug, shouldScroll = false) => {
    const target = resolveRegion(slug);
    setActiveRegion(target);
    setHasHydrated(true);
    document.documentElement.dataset.destFilter = target;

    const matched = regionsData.find((item) => item.region.slug === target);
    if (matched) {
      document.title = `${matched.region.name} — Yuevaan Bhutan Travels`;
    }

    if (shouldScroll) {
      requestAnimationFrame(() => {
        const el = document.getElementById(target);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 92;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
      });
    }
  };

  useEffect(() => {
    const initial = resolveRegion(window.location.hash);
    const frameId = requestAnimationFrame(() => selectRegion(initial, false));

    const onHashChange = () => {
      selectRegion(window.location.hash, true);
    };

    const onCustomSelect = (e) => {
      const slug = resolveRegion(e.detail?.region);
      window.history.replaceState(null, '', `#${slug}`);
      selectRegion(slug, true);
    };

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('yuevaan:select-region', onCustomSelect);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('yuevaan:select-region', onCustomSelect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentData = regionsData.find((r) => r.region.slug === activeRegion) || regionsData[0];
  const { hero } = currentData.region;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: currentData.region.name },
        ]}
      />

      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        description={hero.desc}
        image={hero.image}
        alt={hero.alt}
      />

      <main id="main-content" className="section">
        <div className="container">
          <div className="dest-regions-container">
            {regionsData.map(({ region, categories, tours }) => (
              <RegionBlock
                key={region.slug}
                region={region}
                categories={categories}
                tours={tours}
                hidden={hasHydrated && region.slug !== activeRegion}
              />
            ))}
          </div>
        </div>
      </main>

      <MixMatchCta
        title="Can’t decide which region to visit?"
        description="Combine Western valleys with Central Bumthang sanctuaries or Eastern cultural adventures into one seamless tailor-made Bhutan journey."
      />
    </>
  );
}
