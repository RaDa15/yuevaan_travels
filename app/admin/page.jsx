import AdminDashboardClient from './AdminDashboardClient';

export const metadata = {
  title: 'Admin Portal',
  description: 'Private reservations portal for Yuevaan Bhutan Travels.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
