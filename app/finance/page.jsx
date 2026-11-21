import AdminDashboardClient from '../admin/AdminDashboardClient';

export const metadata = {
  title: 'Finance Portal',
  description: 'Private finance and SDF ledger portal for Yuevaan Bhutan Travels.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FinancePortalPage() {
  return <AdminDashboardClient portalRole="finance" />;
}
