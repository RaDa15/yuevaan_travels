import AdminDashboardClient from '../admin/AdminDashboardClient';

export const metadata = {
  title: 'Desk Manager Portal',
  description: 'Private desk manager portal for Yuevaan Bhutan Travels.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ManagerPortalPage() {
  return <AdminDashboardClient portalRole="manager" />;
}
