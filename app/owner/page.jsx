import AdminDashboardClient from '../admin/AdminDashboardClient';

export const metadata = {
  title: 'Owner Executive Portal',
  description: 'Private owner executive and statutory settings portal for Yuevaan Bhutan Travels.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OwnerPortalPage() {
  return <AdminDashboardClient portalRole="super_admin" />;
}
