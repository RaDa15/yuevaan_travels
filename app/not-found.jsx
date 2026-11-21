import Link from 'next/link';
import styles from './not-found.module.css';

export const metadata = {
  title: 'Page Not Found — Yuevaan Bhutan Travels',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main-content" className={`container ${styles.notFoundMain}`}>
      <h1 className="heading-serif-lg">404</h1>
      <p className={`subhead ${styles.notFoundSubhead}`}>
        The page you requested could not be found.
      </p>
      <Link href="/" className={`btn btn-primary ${styles.notFoundCta}`}>
        Return Home
      </Link>
    </main>
  );
}
