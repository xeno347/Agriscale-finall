import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import axios from "axios"; // CRITICAL: Import axios for S3 upload
import type { Supervisor, SupervisorCreate, SupervisorUpdate } from "@/types/api";

// --- S3 Configuration and API Calls ---
const API_BASE_URL = "http://localhost:8000";

interface UploadResponse {
    upload_url: string;
    file_key: string;
    fields: Record<string, string>;
}

const generateUploadUrl = async (fileName: string, fileType: string): Promise<UploadResponse> => {
    const response = await axios.post<UploadResponse>(
        `${API_BASE_URL}/s3/generate-upload-url`,
        { file_name: fileName, file_type: fileType }
    );
    // Note: The response is adjusted here to provide the direct URL and fields expected for a POST upload
    return response.data;
};

// --- Dummy Config (Adjust to match your S3 region and bucket) ---
const AWS_REGION = 'us-east-1'; // Use your actual AWS region
const S3_BUCKET_NAME = 'your-agriscale-photo-bucket-name'; // Use your actual bucket name
// ------------------------------------


interface SupervisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // This prop now expects the form data including the photo URL
  onSave: (
    data: SupervisorCreate | SupervisorUpdate,
    supervisorId?: string
  ) => void;
  supervisor: Supervisor | null;
}

const availablePlots = [
  "Plot A", "Plot B", "Plot C", "Plot D", 
  "Plot E", "Plot F", "Plot G", "Plot H"
];

export const SupervisorDialog = ({
  open,
  onOpenChange,
  onSave,
  supervisor,
}: SupervisorDialogProps) => {
  const [formData, setFormData] = useState<SupervisorCreate | SupervisorUpdate>({
    name: "",
    email: "",
    phone: "",
    assigned_plots: [],
    photo_url: null, // New field for the S3 URL
  } as SupervisorCreate); // Start with SupervisorCreate defaults

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing data for editing or reset for adding
  useEffect(() => {
    if (supervisor) {
      setFormData({
        name: supervisor.name,
        email: supervisor.email,
        phone: supervisor.phone,
        assigned_plots: supervisor.assigned_plots,
        photo_url: (supervisor as any).photo_url || null, 
      });
      setSelectedFile(null);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        assigned_plots: [],
        photo_url: null,
      } as SupervisorCreate);
      setSelectedFile(null);
    }
  }, [supervisor, open]);


  // --- S3 Upload and Final Save Logic ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let finalPhotoUrl: string | null = (formData as any).photo_url || null; 

    try {
      // 1. Handle File Upload to S3 (if a new file is selected)
      if (selectedFile) {
        toast.info("Uploading photo to S3...");
        
        // A. Get the presigned POST data from FastAPI
        const { upload_url, fields, file_key } = await generateUploadUrl(
          selectedFile.name,
          selectedFile.type
        );
        
        // B. Prepare FormData for direct S3 upload
        const s3FormData = new FormData();
        // Add all required policy fields first
        Object.entries(fields).forEach(([key, value]) => {
            s3FormData.append(key, value);
        });
        // Add the file last (S3 expects the file to be appended with key 'file')
        s3FormData.append('file', selectedFile); 

        // C. Upload file directly to S3 URL
        await axios.post(upload_url, s3FormData, {
            headers: {
                // Ensure proper content type for S3 form upload
                'Content-Type': 'multipart/form-data', 
            },
        });
        
        // D. Construct the final public URL to save in DynamoDB
        // Standard S3 public URL format using the file_key returned by our backend
        finalPhotoUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${file_key}`; 
        
        toast.success("Photo uploaded successfully!");

      }

      // 2. Finalize Form Data for DynamoDB Submission
      const finalData: SupervisorCreate | SupervisorUpdate = {
          ...formData,
          photo_url: finalPhotoUrl, // Include the new or existing URL
      };

      // 3. Submit to FastAPI Supervisor Endpoint
      onSave(finalData, supervisor?.id);
      
      // onSave handles closing the dialog, we just clear the file state
      setSelectedFile(null);

    } catch (error: any) {
      console.error("Submission failed:", error);
      const message = error.response?.data?.detail || "Please check server logs and S3 configuration.";
      toast.error(`Failed to save supervisor: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlot = (plot: string) => {
    // Cast formData to access assigned_plots safely
    const currentPlots = (formData as SupervisorCreate).assigned_plots || [];

    setFormData(prev => ({
      ...prev,
      assigned_plots: currentPlots.includes(plot)
        ? currentPlots.filter(p => p !== plot)
        : [...currentPlots, plot],
    }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setSelectedFile(e.target.files[0]);
      }
  };
  
  const currentPhotoPreview = selectedFile 
    ? URL.createObjectURL(selectedFile) 
    : (formData as any).photo_url;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {supervisor ? "Edit Supervisor" : "Add New Supervisor"}
          </DialogTitle>
          <DialogDescription>
            Fill in the supervisor details and assign plots for management
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* PHOTO UPLOAD SECTION */}
            <div className="space-y-2 sm:col-span-2 flex flex-col items-center">
                <Label htmlFor="photo" className="text-sm font-medium">Supervisor Photo</Label>
                <div className="relative w-32 h-32 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-100">
                    <input 
                        id="photo" 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isSaving}
                    />
                    {/* Display Preview */}
                    {currentPhotoPreview ? (
                        <img 
                            src={currentPhotoPreview} 
                            alt="Supervisor Preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Camera className="w-8 h-8 text-gray-500" />
                    )}
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white text-xs font-semibold opacity-0 hover:opacity-100 transition-opacity">
                        {currentPhotoPreview ? 'Change' : 'Upload'}
                    </div>
                </div>
            </div>
            
            {/* NAME FIELD */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={(formData as any).name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isSaving}
              />
            </div>

            {/* EMAIL FIELD */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={(formData as any).email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isSaving}
              />
            </div>

            {/* PHONE FIELD */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={(formData as any).phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={isSaving}
              />
            </div>
          </div>

          {/* PLOT ASSIGNMENT */}
          <div className="space-y-3">
            <Label>Assign Plots</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {availablePlots.map((plot) => (
                <div key={plot} className="flex items-center space-x-2">
                  <Checkbox
                    id={plot}
                    checked={(formData as SupervisorCreate).assigned_plots?.includes(plot)}
                    onCheckedChange={() => togglePlot(plot)}
                    disabled={isSaving}
                  />
                  <label
                    htmlFor={plot}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {plot}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : supervisor ? "Save Changes" : "Add Supervisor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};