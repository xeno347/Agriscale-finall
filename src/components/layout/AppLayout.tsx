import { ReactNode, useState, useEffect } from 'react';
import AppSidebar from './AppSidebar';
import { mockLeads } from '@/services/mockData';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [leadsComplete, setLeadsComplete] = useState(false);

  useEffect(() => {
    // Check if all leads are either registered or rejected
    const allComplete = mockLeads.every(
      lead => lead.status === 'registered' || lead.status === 'rejected'
    );
    setLeadsComplete(allComplete);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar leadsComplete={leadsComplete} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
