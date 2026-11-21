import { Suspense } from 'react';
import ThankYouClient from './ThankYouClient';

export const metadata = {
  title: 'Thank You — Request Received',
  description: 'Your Bhutan travel request has been received by Yuevaan Bhutan Travels.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="rtb-page">
          <div className="container">
            <p className="rtb-title">Thank you — your request was received</p>
          </div>
        </main>
      }
    >
      <ThankYouClient />
    </Suspense>
  );
}
