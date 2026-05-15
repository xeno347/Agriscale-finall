import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Link2, FolderTree, Building2, ArrowRightLeft } from "lucide-react";
import { getBaseUrl } from "@/lib/config";

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProject: string;
}

interface ClusterApiItem {
  cluster_id: string;
  cluster_name: string;
  total_area: number;
  created_at: string;
}

const ProjectSettingsDialog = ({ open, onOpenChange, currentProject }: ProjectSettingsDialogProps) => {
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [clusters, setClusters] = useState<ClusterApiItem[]>([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const [clusterLoadError, setClusterLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedClusters([]);
      return;
    }

    const fetchClusters = async () => {
      setIsLoadingClusters(true);
      setClusterLoadError(null);
      try {
        const baseUrl = getBaseUrl().replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/farmer_managment/get_clusters`);
        if (!res.ok) {
          throw new Error(`Failed to fetch clusters (${res.status})`);
        }
        const data = await res.json();
        const apiClusters: ClusterApiItem[] = Array.isArray(data?.clusters) ? data.clusters : [];
        setClusters(apiClusters);
      } catch (error) {
        setClusterLoadError(error instanceof Error ? error.message : "Unable to load clusters");
        setClusters([]);
      } finally {
        setIsLoadingClusters(false);
      }
    };

    fetchClusters();
  }, [open]);

  const toggleCluster = (clusterId: string, checked: boolean) => {
    setSelectedClusters((prev) =>
      checked ? [...prev, clusterId] : prev.filter((item) => item !== clusterId),
    );
  };

  const selectedClusterNames = clusters
    .filter((cluster) => selectedClusters.includes(cluster.cluster_id))
    .map((cluster) => cluster.cluster_name);

  const handleSave = () => {
    toast({
      title: "Project settings updated",
      description: `${currentProject} connected with ${selectedClusters.length} cluster(s).`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Connect the current project with one or more clusters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-4">
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-700" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Project</p>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{currentProject}</p>
              </div>

              <div className="flex items-center justify-center">
                <div className="rounded-full border border-emerald-200 bg-emerald-50 p-2">
                  <ArrowRightLeft className="h-4 w-4 text-emerald-700" />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-emerald-700" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Target Clusters</p>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedClusters.length > 0
                    ? `${selectedClusters.length} cluster(s) selected`
                    : "Select one or more clusters"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Clusters</p>
              <p className="text-xs font-medium text-slate-500">Select multiple if needed</p>
            </div>
            {isLoadingClusters ? (
              <p className="text-sm text-slate-500">Loading clusters...</p>
            ) : clusterLoadError ? (
              <p className="text-sm text-rose-600">{clusterLoadError}</p>
            ) : clusters.length === 0 ? (
              <p className="text-sm text-slate-500">No clusters found.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {clusters.map((cluster) => (
                  <label
                    key={cluster.cluster_id}
                    className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                      selectedClusters.includes(cluster.cluster_id)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedClusters.includes(cluster.cluster_id)}
                      onCheckedChange={(checked) => toggleCluster(cluster.cluster_id, checked === true)}
                    />
                    <div className="flex items-center gap-2">
                      <FolderTree
                        className={`h-4 w-4 ${
                          selectedClusters.includes(cluster.cluster_id) ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      <span className="font-medium">{cluster.cluster_name}</span>
                    </div>
                    <span className="ml-auto text-[11px] text-slate-500">{cluster.total_area} ac</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-emerald-700" />
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Connection Preview</p>
            </div>
            <p className="mt-1 text-sm text-emerald-900">
              {selectedClusters.length > 0
                ? `${currentProject} will be connected to: ${selectedClusterNames.join(", ")}`
                : "No cluster selected yet."}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={selectedClusters.length === 0}>
            Save Cluster Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectSettingsDialog;
