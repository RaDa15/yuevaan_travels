import AdminDashboardClient from '../admin/AdminDashboardClient';

export const metadata = {
  title: 'Reservations Portal',
  description: 'Private reservations desk portal for Yuevaan Bhutan Travels.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReservationPortalPage() {
  return <AdminDashboardClient portalRole="reservation" />;
}
