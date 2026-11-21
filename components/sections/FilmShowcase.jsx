'use client';

import { useState } from 'react';
import Icon from '@/components/icons';
import Reveal from '@/components/ui/Reveal';
import { site } from '@/data/site';
import styles from '@/components/home/Home.module.css';

export default function FilmShowcase() {
  const [status, setStatus] = useState('poster'); // poster | playing | error

  const handlePlay = () => {
    if (!site.media.filmUrl) {
      setStatus('error');
      return;
    }
    setStatus('playing');
  };

  return (
    <section className="section film-showcase-section" aria-labelledby="discover-film-heading">
      <div className="container">
        <Reveal className="section-center-header">
          <h2 id="discover-film-heading" className="heading-serif-lg">
            Discover the Kingdom on film
          </h2>
          <p className="subhead">
            Step inside the Dragon Kingdom—from misty Paro pine valleys and cliffside monasteries to timeless village hospitality.
          </p>
        </Reveal>

        <Reveal delay={90} className="film-player-shell">
          <div className="film-player-frame" id="discoverFilmFrame">
            {status === 'poster' ? (
              <button
                type="button"
                id="discoverFilmTrigger"
                className="film-poster-trigger"
                aria-label="Play Discover Bhutan Film"
                onClick={handlePlay}
              >
                <img
                  src={site.media.filmPoster}
                  alt="Tiger's Nest monastery perched above Paro Valley — click to watch Discover Bhutan film"
                  width={1280}
                  height={720}
                  loading="lazy"
                  className="film-poster-img"
                />
                <div className="film-poster-scrim" />
                <div className="film-play-center">
                  <span className="film-play-circle" aria-hidden="true">
                    <Icon name="play" size={26} className={styles.playSvg} />
                  </span>
                  <span className="film-play-label">Watch Full Film · HD 1080p</span>
                </div>
                <div className="film-caption-bar">
                  <div>
                    <div className="film-caption-title">
                      Discover Bhutan — Journey Through the Last Shangri-La
                    </div>
                    <div className="film-caption-meta">
                      Paro · Thimphu · Punakha · Sacred Himalayan Trails
                    </div>
                  </div>
                  <span className={styles.filmPlayHint}>Click to play →</span>
                </div>
              </button>
            ) : status === 'playing' ? (
              <video
                className="film-video-el"
                controls
                autoPlay
                playsInline
                preload="metadata"
                poster={site.media.filmPoster}
                src={site.media.filmUrl}
                onError={() => setStatus('error')}
              />
            ) : (
              <div className={styles.filmFallbackBox}>
                <img
                  src={site.media.filmPoster}
                  alt="Tiger's Nest monastery above Paro Valley"
                  width={1280}
                  height={720}
                  className={styles.filmFallbackImg}
                />
                <div className={styles.filmFallbackMsg} role="status">
                  The film couldn’t load — try again later.
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
