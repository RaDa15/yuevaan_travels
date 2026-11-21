'use client';

import { useState } from 'react';
import { formatUSD } from '@/lib/format';
import styles from '../Admin.module.css';

function compactUsd(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return '$0';
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `$${amount}`;
}

export function VolumeLineChart({ series, rangeDays, onRangeChange }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 540;
  const height = 210;
  const pad = { top: 18, right: 16, bottom: 32, left: 32 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVal = Math.max(
    4,
    ...series.map((d) => Math.max(d.bookings, d.inquiries))
  );
  const stepX = series.length > 1 ? plotW / (series.length - 1) : plotW;

  const toX = (i) => pad.left + (series.length > 1 ? i * stepX : plotW / 2);
  const toY = (v) => pad.top + plotH - (v / maxVal) * plotH;

  const bookingsPts = series.map((d, i) => `${toX(i).toFixed(1)},${toY(d.bookings).toFixed(1)}`).join(' ');
  const inquiriesPts = series.map((d, i) => `${toX(i).toFixed(1)},${toY(d.inquiries).toFixed(1)}`).join(' ');

  const bookingsArea =
    series.length > 0
      ? `M ${toX(0).toFixed(1)} ${(pad.top + plotH).toFixed(1)} ` +
        series.map((d, i) => `L ${toX(i).toFixed(1)} ${toY(d.bookings).toFixed(1)}`).join(' ') +
        ` L ${toX(series.length - 1).toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`
      : '';

  const yTicks = [0, Math.round(maxVal / 2), maxVal];
  const activePoint = hoverIdx !== null && series[hoverIdx] ? series[hoverIdx] : null;

  return (
    <section className={styles.chartCard} aria-label="Booking and inquiry volume over time">
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Bookings &amp; Inquiries Volume</h3>
          <p className={styles.chartSub}>
            {activePoint
              ? `${activePoint.label}: ${activePoint.bookings} bookings · ${activePoint.inquiries} inquiries`
              : `Incoming requests across the last ${rangeDays} days`}
          </p>
        </div>
        <div className={styles.chartRangeGroup} role="group" aria-label="Chart time range">
          {[
            { days: 7, label: '7D' },
            { days: 30, label: '30D' },
            { days: 90, label: '90D' },
            { days: 365, label: '1Y' },
          ].map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => onRangeChange(opt.days)}
              className={`${styles.miniTab}${rangeDays === opt.days ? ` ${styles.miniTabActive}` : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotAccent}`} />
          Tour Bookings
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotNeutral}`} />
          General Inquiries
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label={`Line chart showing bookings and inquiries over the last ${rangeDays} days`}
      >
        {yTicks.map((t) => {
          const y = toY(t);
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} className={styles.gridLine} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className={styles.axisLabel}>
                {t}
              </text>
            </g>
          );
        })}

        {bookingsArea ? <path d={bookingsArea} className={styles.areaAccent} /> : null}
        {bookingsPts ? <polyline points={bookingsPts} className={styles.lineAccent} /> : null}
        {inquiriesPts ? <polyline points={inquiriesPts} className={styles.lineNeutral} /> : null}

        {series.map((d, i) => {
          const x = toX(i);
          const showLabel = series.length <= 7 || i % 2 === 0 || i === series.length - 1;
          return (
            <g
              key={`${d.label}-${i}`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <rect
                x={Math.max(pad.left, x - stepX / 2)}
                y={pad.top}
                width={Math.max(18, stepX)}
                height={plotH}
                className={styles.hitZone}
              />
              {hoverIdx === i ? (
                <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} className={styles.hoverRule} />
              ) : null}
              <circle cx={x} cy={toY(d.bookings)} r={hoverIdx === i ? 5 : 3.2} className={styles.pointAccent} />
              <circle cx={x} cy={toY(d.inquiries)} r={hoverIdx === i ? 5 : 3.2} className={styles.pointNeutral} />
              {showLabel ? (
                <text x={x} y={height - 10} textAnchor="middle" className={styles.axisLabel}>
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function FunnelBarChart({ stages }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const rowH = 38;
  const width = 520;
  const height = stages.length * rowH + 14;
  const barX = 96;
  const maxBarW = 285;

  const barClassFor = (key) => {
    if (key === 'confirmed') return styles.fillSuccess;
    if (key === 'quoted' || key === 'contacted') return styles.fillAccent;
    if (key === 'archived') return styles.fillMuted;
    return styles.fillNeutral;
  };

  return (
    <section className={styles.chartCard} aria-label="Sales pipeline funnel">
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Booking Pipeline Funnel</h3>
          <p className={styles.chartSub}>Lead progression &amp; USD value by stage</p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label="Horizontal bar chart of bookings by status stage"
      >
        {stages.map((s, idx) => {
          const y = idx * rowH + 8;
          const barW = s.count > 0 ? Math.max(10, Math.round((s.count / maxCount) * maxBarW)) : 0;
          return (
            <g key={s.key}>
              <text x={0} y={y + 18} className={styles.barLabel}>
                {s.label}
              </text>
              <rect x={barX} y={y + 5} width={maxBarW} height={18} rx={9} className={styles.barTrack} />
              {barW > 0 ? (
                <rect x={barX} y={y + 5} width={barW} height={18} rx={9} className={barClassFor(s.key)} />
              ) : null}
              <text x={barX + maxBarW + 12} y={y + 18} className={styles.barValue}>
                {s.count} · {compactUsd(s.usd)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function MonthlyDeparturesChart({ months }) {
  const width = 540;
  const height = 226;
  const pad = { top: 26, right: 16, bottom: 38, left: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (months.length === 0) {
    return (
      <section className={styles.chartCard} aria-label="Departures and revenue by travel month">
        <div className={styles.chartHead}>
          <div>
            <h3 className={styles.chartTitle}>Departures &amp; SDF Revenue by Month</h3>
            <p className={styles.chartSub}>Agency package net vs. Bhutan SDF/visa pass-through</p>
          </div>
        </div>
        <div className={styles.chartEmpty}>
          No active booking departure dates yet. Upcoming bookings will appear grouped by travel month.
        </div>
      </section>
    );
  }

  const maxUsd = Math.max(1000, ...months.map((m) => m.totalUsd));
  const slotW = plotW / months.length;
  const barW = Math.min(34, Math.max(14, slotW * 0.56));
  const yTicks = [0, Math.round(maxUsd / 2), maxUsd];

  return (
    <section className={styles.chartCard} aria-label="Departures and revenue by travel month">
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Departures &amp; SDF Revenue by Month</h3>
          <p className={styles.chartSub}>Peak Spring/Autumn load · Agency net vs. Govt. SDF/visa</p>
        </div>
      </div>

      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotAccent}`} />
          Agency Package Net
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotNeutral}`} />
          Govt. SDF &amp; Visa
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label="Stacked bar chart of monthly departures and SDF revenue"
      >
        {yTicks.map((t) => {
          const y = pad.top + plotH - (t / maxUsd) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} className={styles.gridLine} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className={styles.axisLabel}>
                {compactUsd(t)}
              </text>
            </g>
          );
        })}

        {months.map((m, idx) => {
          const cx = pad.left + idx * slotW + slotW / 2;
          const x = cx - barW / 2;
          const sdfH = Math.round((m.sdfUsd / maxUsd) * plotH);
          const netH = Math.round((m.netUsd / maxUsd) * plotH);
          const sdfY = pad.top + plotH - sdfH;
          const netY = sdfY - netH;
          return (
            <g key={m.ym}>
              {sdfH > 0 ? <rect x={x} y={sdfY} width={barW} height={sdfH} rx={3} className={styles.fillNeutral} /> : null}
              {netH > 0 ? <rect x={x} y={netY} width={barW} height={netH} rx={3} className={styles.fillAccent} /> : null}
              <text x={cx} y={Math.max(14, netY - 6)} textAnchor="middle" className={styles.axisSmallVal}>
                {m.count}
              </text>
              <text x={cx} y={height - 12} textAnchor="middle" className={styles.axisLabel}>
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function TopToursChart({ tours }) {
  if (tours.length === 0) {
    return (
      <section className={styles.chartCard} aria-label="Top requested tours">
        <div className={styles.chartHead}>
          <div>
            <h3 className={styles.chartTitle}>Most Requested Tours</h3>
            <p className={styles.chartSub}>Demand across Yuevaan&apos;s 25 itineraries</p>
          </div>
        </div>
        <div className={styles.chartEmpty}>
          Tour demand rankings will populate as soon as tour booking requests arrive.
        </div>
      </section>
    );
  }

  const maxCount = Math.max(1, ...tours.map((t) => t.count));
  const rowH = 38;
  const width = 520;
  const height = tours.length * rowH + 8;
  const maxBarW = 240;
  const barX = 195;

  return (
    <section className={styles.chartCard} aria-label="Top requested tours">
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Most Requested Tours</h3>
          <p className={styles.chartSub}>Ranked by booking requests &amp; pipeline USD</p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label="Horizontal bar chart of most requested Bhutan tour packages"
      >
        {tours.map((t, idx) => {
          const y = idx * rowH + 6;
          const barW = Math.max(12, Math.round((t.count / maxCount) * maxBarW));
          const shortTitle = t.title.length > 26 ? `${t.title.slice(0, 25)}…` : t.title;
          return (
            <g key={t.slug}>
              <text x={0} y={y + 18} className={styles.barLabel}>
                {shortTitle}
              </text>
              <rect x={barX} y={y + 6} width={maxBarW} height={15} rx={7} className={styles.barTrack} />
              <rect
                x={barX}
                y={y + 6}
                width={barW}
                height={15}
                rx={7}
                className={idx === 0 ? styles.fillAccent : styles.fillNeutral}
              />
              <text x={barX + maxBarW + 10} y={y + 18} className={styles.barValue}>
                {t.count} ({compactUsd(t.usd)})
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function NationalityDonutChart({ mix }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, mix.total);
  const intlFrac = mix.total > 0 ? mix.intlCount / total : 1;
  const indianFrac = mix.total > 0 ? mix.indianCount / total : 0;
  const intlLen = intlFrac * circumference;
  const indianLen = indianFrac * circumference;

  return (
    <section className={styles.chartCard} aria-label="Traveller nationality and SDF tariff mix">
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Nationality &amp; SDF Tariff Mix</h3>
          <p className={styles.chartSub}>International USD SDF vs. Indian Regional SDF</p>
        </div>
      </div>

      <div className={styles.donutLayout}>
        <svg
          viewBox="0 0 156 156"
          className={styles.donutSvg}
          role="img"
          aria-label={`Donut chart: ${mix.intlCount} international and ${mix.indianCount} Indian nationals`}
        >
          <circle cx="78" cy="78" r={radius} className={styles.donutTrack} />
          {mix.total > 0 ? (
            <>
              <circle
                cx="78"
                cy="78"
                r={radius}
                className={styles.donutAccent}
                strokeDasharray={`${intlLen.toFixed(2)} ${circumference.toFixed(2)}`}
                transform="rotate(-90 78 78)"
              />
              {indianLen > 0 ? (
                <circle
                  cx="78"
                  cy="78"
                  r={radius}
                  className={styles.donutSuccess}
                  strokeDasharray={`${indianLen.toFixed(2)} ${circumference.toFixed(2)}`}
                  strokeDashoffset={(-intlLen).toFixed(2)}
                  transform="rotate(-90 78 78)"
                />
              ) : null}
            </>
          ) : null}
          <text x="78" y="74" textAnchor="middle" className={styles.donutCenterVal}>
            {mix.total}
          </text>
          <text x="78" y="92" textAnchor="middle" className={styles.donutCenterSub}>
            Travellers
          </text>
        </svg>

        <div className={styles.donutLegendCol}>
          <div className={styles.tariffPills}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotAccent}`} />
              International: <strong>{mix.intlCount}</strong>
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotSuccess}`} />
              India (Nu. SDF): <strong>{mix.indianCount}</strong>
            </span>
          </div>

          {mix.topCountries.length === 0 ? (
            <p className={styles.chartSub}>No nationality data recorded yet.</p>
          ) : (
            <ul className={styles.countryList}>
              {mix.topCountries.map((c) => (
                <li key={c.country} className={styles.countryRow}>
                  <span>{c.country}</span>
                  <strong>{c.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function HealthGaugesCard({ health }) {
  const gauges = [
    {
      label: 'Auto-Email Success',
      pct: health.emailDeliveryPct,
      meta: health.emailAttempted > 0 ? `${health.emailSentCount}/${health.emailAttempted} delivered` : 'No sends yet',
      tone: health.emailDeliveryPct >= 95 ? styles.donutSuccess : styles.donutDanger,
    },
    {
      label: '24h SLA Compliance',
      pct: health.slaCompliancePct,
      meta: health.slaMeasured > 0 ? `${health.slaMet}/${health.slaMeasured} within 24h` : 'All on track',
      tone: health.slaCompliancePct >= 90 ? styles.donutAccent : styles.donutWarning,
    },
    {
      label: 'Visa & SDF Readiness',
      pct: health.visaReadinessPct,
      meta:
        health.upcomingChecklistTotal > 0
          ? `${health.upcomingChecklistDone}/${health.upcomingChecklistTotal} steps done`
          : 'No upcoming trips',
      tone: health.visaReadinessPct >= 80 ? styles.donutSuccess : styles.donutAccent,
    },
  ];

  const r = 34;
  const circ = 2 * Math.PI * r;

  return (
    <section className={styles.chartCard} aria-label="Operations and email health">
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Desk &amp; Delivery Health</h3>
          <p className={styles.chartSub}>Email reliability, 24h reply SLA &amp; departure readiness</p>
        </div>
      </div>

      <div className={styles.gaugesGrid}>
        {gauges.map((g) => {
          const dash = ((Math.min(100, Math.max(0, g.pct)) / 100) * circ).toFixed(2);
          return (
            <div key={g.label} className={styles.gaugeItem}>
              <svg viewBox="0 0 88 88" className={styles.gaugeSvg} role="img" aria-label={`${g.label}: ${g.pct}%`}>
                <circle cx="44" cy="44" r={r} className={styles.gaugeTrack} />
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  className={g.tone}
                  strokeDasharray={`${dash} ${circ.toFixed(2)}`}
                  transform="rotate(-90 44 44)"
                />
                <text x="44" y="49" textAnchor="middle" className={styles.gaugeVal}>
                  {g.pct}%
                </text>
              </svg>
              <strong className={styles.gaugeLabel}>{g.label}</strong>
              <span className={styles.gaugeMeta}>{g.meta}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function formatBreakdownSummary(usd) {
  return formatUSD(usd || 0);
}
