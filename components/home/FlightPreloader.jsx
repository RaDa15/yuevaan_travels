'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function FlightPreloader() {
  const [phase, setPhase] = useState('idle'); // idle | rotating | taking-off | sketching | hidden
  const [removed, setRemoved] = useState(false);
  const progressBarRef = useRef(null);
  const loadCountRef = useRef(null);
  const dismissedRef = useRef(false);
  const readyFiredRef = useRef(false);

  const fireHeroReady = useCallback(() => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    document.documentElement.classList.remove('is-preloading');
    document.documentElement.classList.add('skip-preloader');
    document.body.style.overflow = '';
    window.dispatchEvent(new Event('hero:ready'));
  }, []);

  const setProgressDisplay = useCallback((ratio) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${clamped.toFixed(4)})`;
    }
    if (loadCountRef.current) {
      loadCountRef.current.textContent = `${Math.round(clamped * 100)}%`;
    }
  }, []);

  const dismissNow = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setProgressDisplay(1);
    setPhase('hidden');
    fireHeroReady();
    setTimeout(() => setRemoved(true), 580);
  }, [fireHeroReady, setProgressDisplay]);

  useEffect(() => {
    let alreadyVisited = false;
    try {
      alreadyVisited = sessionStorage.getItem('yuevaan_site_visited') === '1';
      sessionStorage.setItem('yuevaan_site_visited', '1');
    } catch {}

    const hasPreloadingFlag = document.documentElement.classList.contains('is-preloading');
    const skip =
      document.documentElement.classList.contains('skip-preloader') ||
      (alreadyVisited && !hasPreloadingFlag);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (skip || reduceMotion) {
      const id = requestAnimationFrame(() => {
        setPhase('hidden');
        setRemoved(true);
        fireHeroReady();
      });
      return () => cancelAnimationFrame(id);
    }

    document.body.style.overflow = 'hidden';
    const startStamp = performance.now();
    const totalSequenceMs = 2950;
    let pageLoaded = document.readyState === 'complete';
    let rafId = null;
    let dismissTimer = null;

    const scheduleDismiss = () => {
      if (dismissedRef.current || !pageLoaded || dismissTimer) return;
      const elapsed = performance.now() - startStamp;
      const wait = Math.max(0, totalSequenceMs + 180 - elapsed);
      dismissTimer = setTimeout(dismissNow, wait);
    };

    const updateProgress = () => {
      if (dismissedRef.current) return;
      const elapsed = performance.now() - startStamp;
      const targetMax = pageLoaded ? 1 : 0.88;
      const rawRatio = Math.min(elapsed / totalSequenceMs, targetMax);
      const easedRatio = 1 - Math.pow(1 - rawRatio, 1.3);
      setProgressDisplay(easedRatio);

      if (rawRatio >= 0.63) {
        setPhase((prev) => (prev !== 'sketching' && prev !== 'hidden' ? 'sketching' : prev));
      } else if (rawRatio >= 0.49) {
        setPhase((prev) => (prev === 'idle' || prev === 'rotating' ? 'taking-off' : prev));
      } else if (rawRatio >= 0.38) {
        setPhase((prev) => (prev === 'idle' ? 'rotating' : prev));
      }

      if (rawRatio < 1 || !pageLoaded) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };
    rafId = requestAnimationFrame(updateProgress);

    const onLoad = () => {
      pageLoaded = true;
      scheduleDismiss();
    };

    if (pageLoaded) {
      scheduleDismiss();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    // Hard stop at 3,400 ms per BR-14
    const hardStopTimer = setTimeout(() => {
      pageLoaded = true;
      dismissNow();
    }, 3400);

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !dismissedRef.current) {
        dismissNow();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (dismissTimer) clearTimeout(dismissTimer);
      clearTimeout(hardStopTimer);
      window.removeEventListener('load', onLoad);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [dismissNow, fireHeroReady, setProgressDisplay]);

  if (removed) return null;

  const rigClasses = ['preloader-aero-rig'];
  if (phase !== 'idle') rigClasses.push('is-rotating');
  if (phase === 'taking-off' || phase === 'sketching' || phase === 'hidden') {
    rigClasses.push('is-taking-off');
  }
  if (phase === 'sketching' || phase === 'hidden') {
    rigClasses.push('is-sketching');
  }

  return (
    <div
      id="flight-preloader"
      className={`flight-preloader${phase === 'hidden' ? ' is-hidden' : ''}`}
      aria-hidden="true"
      onClick={dismissNow}
    >
      <div className="preloader-stage">
        <div className={rigClasses.join(' ')} id="preloaderPlaneWrapper">
          <svg
            className="preloader-aero-svg"
            viewBox="15 -28 390 218"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="presentation"
          >
            <defs>
              <clipPath id="aeroRunwayClip">
                <rect x="80" y="146" width="270" height="14" />
              </clipPath>
              <linearGradient id="aeroWingGrad" x1="180" y1="126" x2="232" y2="142" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00528E" />
                <stop offset="100%" stopColor="#0067B1" />
              </linearGradient>
              <linearGradient id="aeroStreamGrad" x1="110" y1="0" x2="325" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0067B1" stopOpacity="0" />
                <stop offset="55%" stopColor="#0067B1" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id="bottomIvoryBlend" x1="0" y1="162" x2="0" y2="190" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FAF8F5" stopOpacity="0" />
                <stop offset="100%" stopColor="#FAF8F5" stopOpacity="0.96" />
              </linearGradient>
              <clipPath id="dorsalLogoClip">
                <circle cx="216" cy="99" r="13.2" />
              </clipPath>
              <filter id="brushFeather" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4.5" />
              </filter>
              <filter id="mistBlur" x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="5.5" />
              </filter>
              <mask id="taktsangDrawMask" maskUnits="userSpaceOnUse" x="-5" y="-5" width="300" height="205">
                <rect x="-5" y="-5" width="300" height="205" fill="#000000" />
                <g filter="url(#brushFeather)" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path className="ts-mask-stroke ts-m1" d="M56 176 Q54 108 72 44 L134 50 L102 114" strokeWidth="46" />
                  <path className="ts-mask-stroke ts-m2" d="M112 36 Q152 46 188 74 L138 98" strokeWidth="44" />
                  <path className="ts-mask-stroke ts-m3" d="M122 128 L164 64 L204 82 L152 126" strokeWidth="48" />
                  <path className="ts-mask-stroke ts-m4" d="M202 70 L252 62 L232 120 L262 154" strokeWidth="46" />
                  <path className="ts-mask-stroke ts-m5" d="M36 148 L96 140 L122 170 L185 152 L236 176" strokeWidth="48" />
                </g>
                <rect className="ts-mask-fill" x="18" y="22" width="260" height="170" fill="#FFFFFF" />
              </mask>
            </defs>

            <g className="taktsang-layer">
              <g mask="url(#taktsangDrawMask)">
                <image
                  className="taktsang-sketch-img"
                  href="/preloader/taktsang-sketch-alpha.webp"
                  x="18"
                  y="22"
                  width="254"
                  height="170"
                  preserveAspectRatio="xMidYMid meet"
                />
                <image
                  className="taktsang-color-img"
                  href="/preloader/taktsang-color-alpha.webp"
                  x="18"
                  y="22"
                  width="254"
                  height="170"
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
              <rect x="15" y="164" width="270" height="28" fill="url(#bottomIvoryBlend)" />
            </g>

            <g className="valley-mist-layer">
              <ellipse cx="222" cy="146" rx="54" ry="8" fill="#FAF8F5" fillOpacity="0.72" filter="url(#mistBlur)" />
              <ellipse cx="142" cy="166" rx="68" ry="10" fill="#FAF8F5" fillOpacity="0.65" filter="url(#mistBlur)" />
              <ellipse cx="258" cy="76" rx="44" ry="6" fill="#FAF8F5" fillOpacity="0.58" filter="url(#mistBlur)" />
              <path d="M198 78 Q228 73 256 76" stroke="#0067B1" strokeOpacity="0.18" strokeWidth="0.9" strokeLinecap="round" />
              <path d="M174 148 Q208 142 246 146" stroke="#0F172A" strokeOpacity="0.14" strokeWidth="0.85" strokeLinecap="round" />
            </g>

            <g className="aero-datum-wrap">
              <g className="aero-piece aero-datum">
                <line x1="80" y1="152" x2="350" y2="152" stroke="#0F172A" strokeOpacity="0.24" strokeWidth="1.4" strokeLinecap="round" />
                <g clipPath="url(#aeroRunwayClip)">
                  <g className="aero-runway-ticks">
                    <line x1="68" y1="156" x2="84" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                    <line x1="116" y1="156" x2="132" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                    <line x1="164" y1="156" x2="180" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                    <line x1="212" y1="156" x2="228" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                    <line x1="260" y1="156" x2="276" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                    <line x1="308" y1="156" x2="324" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                    <line x1="356" y1="156" x2="372" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                    <line x1="404" y1="156" x2="420" y2="156" stroke="#0067B1" strokeOpacity="0.28" strokeWidth="1.2" />
                  </g>
                </g>
              </g>
            </g>

            <g transform="translate(218, 124)">
              <g className="aero-climb-vector">
                <g transform="translate(-218, -124)">
                  <g transform="translate(206, 152)">
                    <g className="aero-rotator">
                      <g transform="translate(-206, -152)">
                        <g className="aero-piece aero-gear">
                          <g className="aero-gear-retract">
                            <line x1="206" y1="133" x2="206" y2="148.5" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
                            <line x1="206" y1="135" x2="212" y2="146" stroke="#0F172A" strokeWidth="1.1" strokeOpacity="0.65" />
                            <circle cx="202.2" cy="148.6" r="3.4" fill="#0F172A" />
                            <circle cx="202.2" cy="148.6" r="1.2" fill="#FAF8F5" />
                            <circle cx="209.8" cy="148.6" r="3.4" fill="#0F172A" />
                            <circle cx="209.8" cy="148.6" r="1.2" fill="#FAF8F5" />
                            <line x1="280.5" y1="133.5" x2="282.5" y2="149" stroke="#0F172A" strokeWidth="1.7" strokeLinecap="round" />
                            <circle cx="282.5" cy="149" r="3" fill="#0F172A" />
                            <circle cx="282.5" cy="149" r="1" fill="#FAF8F5" />
                          </g>
                        </g>

                        <g className="aero-piece aero-fuselage">
                          <path
                            d="M122 121.5 L154 114.5 L283 114.5 C297.5 114.5 311 121 313.5 125.8 C314 126.9 313.2 128.4 311.5 129.6 C305 133 292 134 278 134 L178 134 C158 134 137 128 122 123.5 Z"
                            fill="#FFFFFF"
                            stroke="#0F172A"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                          <path d="M188 133.8 C196 136 226 136 238 133.8" fill="#FAF8F5" stroke="#0F172A" strokeWidth="1.2" />
                          <line x1="158" y1="125.6" x2="293" y2="125.6" stroke="#0067B1" strokeWidth="1.6" strokeLinecap="round" />
                          <line x1="152" y1="127.6" x2="287" y2="127.6" stroke="#D97706" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.85" />
                          <text
                            className="aero-fuselage-wordmark"
                            x="202"
                            y="123.3"
                            textAnchor="middle"
                            fill="#0067B1"
                            fontSize="6.8"
                            fontWeight="700"
                            letterSpacing="1.2"
                          >
                            YUEVAAN
                          </text>
                          <g fill="#0067B1">
                            <rect x="234" y="119" width="3" height="3.2" rx="1.1" />
                            <rect x="242" y="119" width="3" height="3.2" rx="1.1" />
                            <rect x="250" y="119" width="3" height="3.2" rx="1.1" />
                            <rect x="258" y="119" width="3" height="3.2" rx="1.1" />
                            <rect x="266" y="119" width="3" height="3.2" rx="1.1" />
                            <rect x="274" y="119" width="3" height="3.2" rx="1.1" />
                          </g>
                          <g transform="translate(166.5, 120.8) scale(0.75)">
                            <polygon points="0,-4.4 2.4,-2 0,0.4 -2.4,-2" fill="#0067B1" />
                            <polygon points="-2.7,-1.7 -0.3,0.7 -2.7,3.1 -5.1,0.7" fill="#16A34A" />
                            <polygon points="2.7,-1.7 5.1,0.7 2.7,3.1 0.3,0.7" fill="#0F172A" />
                            <polygon points="0,1 2.4,3.4 0,5.8 -2.4,3.4" fill="#DC2626" />
                          </g>
                          <path d="M122 121.5 L117.5 122 L122 123.5" fill="#0F172A" />
                        </g>

                        <g className="aero-piece aero-livery-crest">
                          <line x1="205" y1="114.6" x2="208.8" y2="111.3" stroke="#0067B1" strokeWidth="1.1" strokeLinecap="round" />
                          <line x1="227" y1="114.6" x2="223.2" y2="111.3" stroke="#0067B1" strokeWidth="1.1" strokeLinecap="round" />
                          <circle cx="216" cy="99" r="14.2" fill="#FFFFFF" stroke="#0067B1" strokeWidth="1.15" />
                          <image
                            href="/logos/yuevaan-logo.png"
                            x="202.5"
                            y="85.5"
                            width="27"
                            height="27"
                            clipPath="url(#dorsalLogoClip)"
                          />
                        </g>

                        <g className="aero-piece aero-cockpit">
                          <path d="M289 116.5 L299 118.4 L305 122.4 L289 122.4 Z" fill="#0F172A" />
                          <line x1="294.5" y1="117.5" x2="294.5" y2="122.4" stroke="#FAF8F5" strokeWidth="0.9" strokeOpacity="0.7" />
                          <path d="M296 118.8 L302.5 121.5" stroke="#0067B1" strokeWidth="1" strokeOpacity="0.75" />
                        </g>

                        <g className="aero-piece aero-nacelle">
                          <path d="M214 132 L229 132 L226 136 L212 136 Z" fill="#0067B1" fillOpacity="0.2" stroke="#0F172A" strokeWidth="1.1" />
                          <path
                            d="M211 135.2 L235.5 134.8 C238.5 135 239.2 138.2 238.5 141.6 C238 142.8 236.5 143.3 234 143.3 L211 142.4 Z"
                            fill="#FFFFFF"
                            stroke="#0F172A"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <line x1="234" y1="135.2" x2="234" y2="143" stroke="#0067B1" strokeWidth="1.8" />
                          <path d="M211 137 L207 137.8 L207 140.4 L211 141.2 Z" fill="#0F172A" />
                        </g>

                        <g className="aero-piece aero-wing">
                          <path
                            d="M229 127.8 L182 141.4 L177 135.8 L175 135.8 L178 142.4 L184 142.8 L206 133.2 L229 127.8 Z"
                            fill="url(#aeroWingGrad)"
                            stroke="#0F172A"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                          <line x1="176.5" y1="136.2" x2="178.8" y2="140.2" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" />
                        </g>

                        <g className="aero-piece aero-empennage">
                          <path d="M153 114.8 L131 85.5 L119 85.5 L129.5 117.5 Z" fill="#0067B1" stroke="#0F172A" strokeWidth="1.4" strokeLinejoin="round" />
                          <path d="M138.5 95.5 L125.5 95.5 L128 103 L144 103 Z" fill="#F4C44A" />
                          <path d="M144 103 L128 103 L129.5 107.8 L147.8 107.8 Z" fill="#D97706" />
                          <path d="M135 118.2 L113.5 123.6 L110 123.6 L124 117.8 Z" fill="#0067B1" stroke="#0F172A" strokeWidth="1.2" strokeLinejoin="round" />
                        </g>

                        <g className="aero-piece aero-airflow">
                          <path className="aero-streamline" d="M150 107 C205 106 268 107 316 119" stroke="url(#aeroStreamGrad)" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="28 18" />
                          <path className="aero-streamline aero-streamline-wake" d="M128 140 C152 140 176 140 202 139.5" stroke="#0067B1" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="18 14" />
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>
        <div className="preloader-progress-wrap">
          <div className="preloader-progress-track">
            <div className="preloader-progress-bar" ref={progressBarRef} id="preloaderProgressBar" />
          </div>
          <span className="preloader-progress-count" ref={loadCountRef} id="preloaderLoadCount">
            0%
          </span>
        </div>
      </div>
    </div>
  );
}
