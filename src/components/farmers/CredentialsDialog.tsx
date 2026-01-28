import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import getBaseUrl from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

export type FarmerCredentials = {
  userId: string | null;
  password: string | null;
  saved: boolean;
};

type Props = {
  farmerId: string;
  credentials: FarmerCredentials | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (next: FarmerCredentials) => void;
  // entity: 'farmer' (default) or 'staff' - when 'staff' a POST will be used to create credentials
  entity?: 'farmer' | 'staff';
  // optional role to send when creating staff credentials
  role?: string;
};

export default function CredentialsDialog({ farmerId, credentials, open, onOpenChange, onSaved, entity = 'farmer', role }: Props) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Draft values (generated but not yet saved).
  const [draftUserId, setDraftUserId] = useState<string | null>(null);
  const [draftPassword, setDraftPassword] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState<boolean>(false);

  // Reset draft whenever dialog opens for a different farmer.
  useEffect(() => {
    if (!open) return;
    setDraftUserId(null);
    setDraftPassword(null);
    setDraftSaved(false);
  }, [open, farmerId]);

  const effectiveUserId = draftUserId ?? credentials?.userId ?? null;
  const effectivePassword = draftPassword ?? credentials?.password ?? null;
  const effectiveSaved = useMemo(() => {
    if (draftUserId != null || draftPassword != null) return draftSaved;
    return credentials?.saved ?? false;
  }, [credentials?.saved, draftPassword, draftSaved, draftUserId]);

  const displayUserId = effectiveUserId ? effectiveUserId : 'Not generated';
  const displayPassword = effectivePassword ? effectivePassword : 'Not Generated';

  const generateCredentials = async () => {
    try {
      setIsGenerating(true);
      const base = getBaseUrl();
      if (entity === 'staff') {
        const url = `${base.replace(/\/$/, '')}/admin_staff/create_redentials`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: farmerId, role: role ?? '' }),
        });

        if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

        const result = await resp.json();
        const nextUserId = result?.user_name ?? result?.userName ?? result?.user_id ?? null;
        const nextPassword = result?.password ?? result?.pass ?? null;

        setDraftUserId(nextUserId);
        setDraftPassword(nextPassword);
        setDraftSaved(false);
      } else {
        const url = `${base.replace(/\/$/, '')}/farmer_managment/generate_farmer_credentials/${encodeURIComponent(farmerId)}`;

        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

        const result = await resp.json();
        const nextUserId = result?.user_id ?? result?.userId ?? null;
        const nextPassword = result?.password ?? null;

        setDraftUserId(nextUserId);
        setDraftPassword(nextPassword);
        setDraftSaved(false);
      }
    } catch (error) {
      console.error('Failed to generate credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate credentials',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCredentials = async () => {
    if (!effectiveUserId || !effectivePassword) {
      toast({
        title: 'Error',
        description: 'Generate credentials first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const base = getBaseUrl();
      if (entity === 'staff') {
        const url = `${base.replace(/\/$/, '')}/admin_staff/save_credentials`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_id: farmerId,
            user_name: effectiveUserId,
            password: effectivePassword,
            role: role ?? '',
          }),
        });

        if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

        // accept either { success:true } or any 2xx response as success
        const result = await resp.json().catch(() => ({}));
        if (result && result?.success === false) throw new Error('Save credentials failed');

        const next = { userId: effectiveUserId, password: effectivePassword, saved: true };
        setDraftSaved(true);
        onSaved(next);
      } else {
        const url = `${base.replace(/\/$/, '')}/farmer_managment/save_credentials`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmer_id: farmerId,
            user_id: effectiveUserId,
            password: effectivePassword,
          }),
        });

        if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

        const result = await resp.json();
        if (result?.success !== true) throw new Error('Save credentials failed');

        const next = { userId: effectiveUserId, password: effectivePassword, saved: true };
        setDraftSaved(true);
        onSaved(next);
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to save credentials',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCredentials = () => {
    toast({
      title: 'Delete credentials',
      description: `Not connected to API yet (Farmer ID: ${farmerId})`,
    });
  };

  const sendCredentials = () => {
    toast({
      title: 'Send Credentials',
      description: `Not connected to API yet (Farmer ID: ${farmerId})`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Credentials</DialogTitle>
          <DialogDescription>Farmer credentials (handle carefully)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="text-muted-foreground">User Id :</div>
            <div className="font-medium break-all">
              <div className="flex items-center gap-2">
                {effectiveSaved ? <Lock className="h-4 w-4 text-muted-foreground" /> : null}
                <span>{displayUserId}</span>
              </div>
            </div>
            <div className="text-muted-foreground">Password :</div>
            <div className="font-medium break-all">
              <div className="flex items-center gap-2">
                {effectiveSaved ? <Lock className="h-4 w-4 text-muted-foreground" /> : null}
                <span>{displayPassword}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            these credentials are hard informations , if exposed it may lead to server hazords .
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={generateCredentials} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate new'}
          </Button>

          <Button
            variant="secondary"
            onClick={saveCredentials}
            disabled={isSaving || isGenerating || effectiveSaved || !effectiveUserId || !effectivePassword}
          >
            {effectiveSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save credentials'}
          </Button>

          <Button variant="outline" onClick={sendCredentials}>
            Send 
          </Button>

          <Button variant="destructive" size="icon" onClick={deleteCredentials} aria-label="Delete credentials">
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
