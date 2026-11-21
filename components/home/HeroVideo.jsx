'use client';

import { useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import { site } from '@/data/site';
import styles from './Home.module.css';

export default function HeroVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.muted = true;
    vid.playsInline = true;
    vid.loop = true;

    const startPlayback = () => {
      vid.preload = 'auto';
      const p = vid.play();
      if (p !== undefined) {
        p.catch(() => {
          const playOnTap = () => {
            vid.play().catch(() => {});
          };
          window.addEventListener('click', playOnTap, { once: true });
          window.addEventListener('touchstart', playOnTap, { once: true });
        });
      }
    };

    const warmBuffer = () => {
      vid.preload = 'auto';
    };

    if (!document.documentElement.classList.contains('is-preloading')) {
      startPlayback();
    } else {
      if (!vid.paused) vid.pause();
      if (vid.readyState >= 1 && vid.currentTime > 0.05) {
        vid.currentTime = 0;
      }
      if (document.readyState === 'complete') {
        warmBuffer();
      } else {
        window.addEventListener('load', warmBuffer, { once: true });
      }
    }

    const onReady = () => startPlayback();
    window.addEventListener('hero:ready', onReady);
    return () => {
      window.removeEventListener('load', warmBuffer);
      window.removeEventListener('hero:ready', onReady);
    };
  }, []);

  return (
    <section className="hero-carousel hero-video-only" aria-label="Featured Bhutan Journey">
      <div className="carousel-slide active" data-slide="0">
        <video
          ref={videoRef}
          className="carousel-img"
          loop
          muted
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          preload="metadata"
          poster={site.media.heroPoster}
        >
          {site.media.heroVideos.map((src) => (
            <source key={src} src={src} type="video/mp4" />
          ))}
        </video>
        <div className="carousel-overlay" />
        <div className={`container ${styles.heroContainer}`}>
          <div className="hero-content">
            <h1 className="hero-title">Land in the Last Shangri-La</h1>
            <p className="hero-description">
              Experience the world’s most breathtaking mountain flight into Paro Valley, surrounded by sacred Himalayan
              peaks, ancient fortress dzongs, and authentic Bhutanese hospitality.
            </p>
            <div className="hero-actions">
              <Button href="/plan-my-trip" variant="primary" size="lg">
                <span>Plan my trip</span> →
              </Button>
              <Button href="/tours" variant="outline-white" size="lg">
                Explore itineraries
              </Button>
            </div>
            <div className="hero-trust-row">
              <span><span className="trust-dot" aria-hidden="true" /> All-inclusive transparent quotes</span>
              <span><span className="trust-dot" aria-hidden="true" /> Official Bhutan SDF &amp; visa handled</span>
              <span><span className="trust-dot" aria-hidden="true" /> 24-hour itinerary turnaround</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
