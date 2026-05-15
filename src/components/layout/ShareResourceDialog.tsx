import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ShareResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProject: string;
  projectOptions: string[];
}

const resourceOptions = [
  "Inventory items",
  "Fleet",
  "Human Resources",
  "Land",
] as const;

type ResourceOption = (typeof resourceOptions)[number];

const ShareResourceDialog = ({
  open,
  onOpenChange,
  currentProject,
  projectOptions,
}: ShareResourceDialogProps) => {
  const initialSelection = useMemo(
    () =>
      resourceOptions.reduce<Record<ResourceOption, boolean>>((acc, option) => {
        acc[option] = false;
        return acc;
      }, {} as Record<ResourceOption, boolean>),
    [],
  );

  const [targetProject, setTargetProject] = useState(
    projectOptions.find((project) => project !== currentProject) ?? "",
  );
  const [selectedResources, setSelectedResources] = useState(initialSelection);

  const selectedCount = Object.values(selectedResources).filter(Boolean).length;

  const handleResourceToggle = (resource: ResourceOption, checked: boolean) => {
    setSelectedResources((prev) => ({
      ...prev,
      [resource]: checked,
    }));
  };

  const resetForm = () => {
    setTargetProject(projectOptions.find((project) => project !== currentProject) ?? "");
    setSelectedResources(initialSelection);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = () => {
    const resources = resourceOptions.filter((resource) => selectedResources[resource]);

    toast({
      title: "Resource share initiated",
      description: `${resources.join(", ")} shared from ${currentProject} to ${targetProject}.`,
    });

    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Resources Across Projects</DialogTitle>
          <DialogDescription>
            Share selected resources from one project to another while keeping master data consistent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="source-project" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source Project
              </label>
              <input
                id="source-project"
                value={currentProject}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
              />
            </div>
            <div>
              <label htmlFor="target-project" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Target Project
              </label>
              <select
                id="target-project"
                value={targetProject}
                onChange={(e) => setTargetProject(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              >
                {projectOptions
                  .filter((project) => project !== currentProject)
                  .map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Resources to Share</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {resourceOptions.map((resource) => (
                <label key={resource} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Checkbox
                    checked={selectedResources[resource]}
                    onCheckedChange={(checked) => handleResourceToggle(resource, checked === true)}
                  />
                  <span className="font-medium">{resource}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!targetProject || selectedCount === 0}
          >
            Share Resources
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareResourceDialog;
