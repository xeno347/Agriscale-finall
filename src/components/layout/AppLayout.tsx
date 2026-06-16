import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { mockLeads } from '@/services/mockData';
import { IndianRupee, FileText, Share2, Plus, Trash2, Settings } from 'lucide-react';
import ShareResourceDialog from './ShareResourceDialog';
import CreateProjectDialog from './CreateProjectDialog';
import ProjectSettingsDialog from './ProjectSettingsDialog';
import { getBaseUrl } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

interface ProjectApiItem {
  project_id: string;
  project_name: string;
  project_json: Record<string, unknown>;
  project_s3_key: string;
  created_at: string;
  file_url: string;
}

const PROJECTS_COOKIE_KEY = 'erp_projects_latest';

const AppLayout = ({ children }: AppLayoutProps) => {
  const { token, loading, isTokenValid } = useAuth();

  if (loading) return null;
  if (!token || !isTokenValid()) return <Navigate to="/login" replace />;

  const [leadsComplete, setLeadsComplete] = useState(false);
  const [projects, setProjects] = useState<ProjectApiItem[]>([]);
  const [currentProject, setCurrentProject] = useState('Farm Connect');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const projectOptions = projects.length > 0 ? projects.map((project) => project.project_name) : ['Farm Connect'];
  const showCreateProjectIcon = projects.length !== 1;

  useEffect(() => {
    // Check if all leads are either registered or rejected
    const allComplete = mockLeads.every(
      lead => lead.status === 'registered' || lead.status === 'rejected'
    );
    setLeadsComplete(allComplete);
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const baseUrl = getBaseUrl().replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/admin_project/get_all_projects`);
        if (!response.ok) return;
        const data = await response.json();
        const apiProjects: ProjectApiItem[] = Array.isArray(data?.projects) ? data.projects : [];

        document.cookie = `${PROJECTS_COOKIE_KEY}=${encodeURIComponent(
          JSON.stringify(data),
        )}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;

        setProjects(apiProjects);

        if (apiProjects.length > 0) {
          setCurrentProject(apiProjects[0].project_name);
        }
      } catch {
        // Ignore project fetch failures silently for now.
      }
    };

    fetchProjects();
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar leadsComplete={leadsComplete} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <ShareResourceDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        currentProject={currentProject}
        projectOptions={projectOptions}
      />
      <CreateProjectDialog
        open={isCreateProjectDialogOpen}
        onOpenChange={setIsCreateProjectDialogOpen}
      />
      <ProjectSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        currentProject={currentProject}
      />
    </div>
  );
};

export default AppLayout;
