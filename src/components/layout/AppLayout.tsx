import { ReactNode, useState, useEffect } from 'react';
import AppSidebar from './AppSidebar';
import { mockLeads } from '@/services/mockData';
import { IndianRupee, FileText, Share2, Plus, Trash2, Settings } from 'lucide-react';
import ShareResourceDialog from './ShareResourceDialog';
import CreateProjectDialog from './CreateProjectDialog';
import ProjectSettingsDialog from './ProjectSettingsDialog';
import { getBaseUrl } from '@/lib/config';

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
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Current Project
              </p>
              <select
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
                className="mt-1 w-[220px] max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
              >
                {projectOptions.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex w-[62px] flex-col items-center gap-1">
                <button
                  type="button"
                  title="Report"
                  className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 hover:shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5 transition-transform group-hover:scale-105" />
                </button>
                <span className="text-[10px] font-semibold leading-none text-slate-600">Report</span>
              </div>

              <div className="flex w-[62px] flex-col items-center gap-1">
                <button
                  type="button"
                  title="Share Resources"
                  onClick={() => setIsShareDialogOpen(true)}
                  className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 hover:shadow-sm"
                >
                  <Share2 className="h-3.5 w-3.5 transition-transform group-hover:scale-105" />
                </button>
                <span className="text-[10px] font-semibold leading-none text-slate-600">Share</span>
              </div>

              <div className="flex w-[62px] flex-col items-center gap-1">
                <button
                  type="button"
                  title="Financials"
                  className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 hover:shadow-sm"
                >
                  <IndianRupee className="h-3.5 w-3.5 transition-transform group-hover:scale-105" />
                </button>
                <span className="text-[10px] font-semibold leading-none text-slate-600">Financials</span>
              </div>

              {showCreateProjectIcon && (
                <div className="flex w-[62px] flex-col items-center gap-1">
                  <button
                    type="button"
                    title="Create New Project"
                    onClick={() => setIsCreateProjectDialogOpen(true)}
                    className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 hover:shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 transition-transform group-hover:scale-105" />
                  </button>
                  <span className="text-[10px] font-semibold leading-none text-slate-600">Create</span>
                </div>
              )}

              <div className="flex w-[62px] flex-col items-center gap-1">
                <button
                  type="button"
                  title="Delete Project"
                  className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50/60 hover:text-rose-600 hover:shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5 transition-transform group-hover:scale-105" />
                </button>
                <span className="text-[10px] font-semibold leading-none text-rose-600">Delete</span>
              </div>

              <div className="flex w-[62px] flex-col items-center gap-1">
                <button
                  type="button"
                  title="Settings"
                  onClick={() => setIsSettingsDialogOpen(true)}
                  className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 hover:shadow-sm"
                >
                  <Settings className="h-3.5 w-3.5 transition-transform group-hover:scale-105" />
                </button>
                <span className="text-[10px] font-semibold leading-none text-slate-600">Settings</span>
              </div>
            </div>
          </div>
        </header>

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
