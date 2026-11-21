import { Suspense } from 'react';
import BookingForm from '@/components/forms/BookingForm';
import { tours } from '@/data/tours';
import { site } from '@/data/site';

export const metadata = {
  title: 'Request to Book — Plan My Trip',
  description:
    'Request to book your private Bhutan journey. No payment now — receive an itemised day-by-day quote from our Thimphu trip designers within 24 hours.',
  alternates: { canonical: '/plan-my-trip' },
  openGraph: {
    title: 'Request to Book — Plan My Trip | Yuevaan Bhutan Travels',
    description:
      'No payment now. Receive an itemised day-by-day quote from our Thimphu trip designers within 24 hours.',
    images: [{ url: `${site.url}/images/tigers-nest.jpg` }],
  },
};

export default function PlanMyTripPage() {
  const tourSummaries = tours.map((t) => ({
    slug: t.slug,
    title: t.title,
    days: t.days,
    nights: t.nights,
    price: t.price,
    heroImage: t.heroImage,
  }));

  return (
    <Suspense
      fallback={
        <main id="main-content" className="rtb-page">
          <div className="container">
            <p className="rtb-title">Request to book</p>
            <p className="rtb-subtitle">Loading your trip planner…</p>
          </div>
        </main>
      }
    >
      <BookingForm tourSummaries={tourSummaries} />
    </Suspense>
  );
}
