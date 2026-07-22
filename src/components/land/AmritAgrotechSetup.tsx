import { useState } from 'react';
import { Loader2, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import getBaseUrl from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

export type AmritAgrotechSetupProps = {
  onCreated: (farmerId: string) => void;
};

const AmritAgrotechSetup = ({ onCreated }: AmritAgrotechSetupProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: '',
    farmingOption: 'Lease Farming',
    village: '',
    district: '',
    state: '',
    estimatedLandArea: '',
    waterAvailable: true,
    adharNumber: '',
    panNumber: '',
    permanentAddress: '',
    accountNumber: '',
    ifscCode: '',
  });

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const required: Array<[string, string]> = [
      ['Phone number', form.phoneNumber],
      ['Village', form.village],
      ['District', form.district],
      ['State', form.state],
      ['Estimated land area', form.estimatedLandArea],
      ['Aadhaar number', form.adharNumber],
      ['PAN number', form.panNumber],
      ['Permanent address', form.permanentAddress],
      ['Bank account number', form.accountNumber],
      ['IFSC code', form.ifscCode],
    ];
    const missing = required.find(([, value]) => !value.trim());
    if (missing) {
      toast({ title: 'Missing fields', description: `${missing[0]} is required.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const base = getBaseUrl().replace(/\/$/, '');

      const leadResp = await fetch(`${base}/farmer_managment/lead_contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: 'AmritAgrotech',
          phone_number: form.phoneNumber.trim(),
          lead_source: 'internal_setup',
          farming_option: form.farmingOption,
          village: form.village.trim(),
          district: form.district.trim(),
          state: form.state.trim(),
          estimated_land_area: Number(form.estimatedLandArea),
          water_available: form.waterAvailable,
        }),
      });
      const leadBody = await leadResp.json().catch(() => null);
      if (!leadResp.ok || leadBody?.success !== true || !leadBody?.lead_id) {
        throw new Error(leadBody?.message || 'Failed to create lead record');
      }

      const registerResp = await fetch(`${base}/farmer_managment/register_farmer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadBody.lead_id,
          adhar_number: form.adharNumber.trim(),
          pan_numnber: form.panNumber.trim(),
          permanent_address: form.permanentAddress.trim(),
          accound_number: form.accountNumber.trim(),
          IFSC_code: form.ifscCode.trim(),
        }),
      });
      const registerBody = await registerResp.json().catch(() => null);
      if (!registerResp.ok || registerBody?.success !== true || !registerBody?.farmer_id) {
        throw new Error(registerBody?.message || 'Failed to register AmritAgrotech');
      }

      toast({ title: 'Success', description: 'AmritAgrotech has been set up.', variant: 'success' });
      onCreated(registerBody.farmer_id);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Setup failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Sprout className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Set up AmritAgrotech</h1>
        <p className="text-sm text-muted-foreground">
          This one-time setup creates the AmritAgrotech record that all Lands and Plots will belong to.
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Phone number</Label>
          <Input value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Farming option</Label>
          <Select value={form.farmingOption} onValueChange={(v) => setField('farmingOption', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Lease Farming">Lease Farming</SelectItem>
              <SelectItem value="Contract Farming">Contract Farming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Village</Label>
          <Input value={form.village} onChange={(e) => setField('village', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>District</Label>
          <Input value={form.district} onChange={(e) => setField('district', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>State</Label>
          <Input value={form.state} onChange={(e) => setField('state', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Estimated land area (acres)</Label>
          <Input
            type="number"
            value={form.estimatedLandArea}
            onChange={(e) => setField('estimatedLandArea', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Aadhaar number</Label>
          <Input value={form.adharNumber} onChange={(e) => setField('adharNumber', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>PAN number</Label>
          <Input value={form.panNumber} onChange={(e) => setField('panNumber', e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Permanent address</Label>
          <Input value={form.permanentAddress} onChange={(e) => setField('permanentAddress', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Bank account number</Label>
          <Input value={form.accountNumber} onChange={(e) => setField('accountNumber', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>IFSC code</Label>
          <Input value={form.ifscCode} onChange={(e) => setField('ifscCode', e.target.value)} />
        </div>
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={saving}>
        {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        Create AmritAgrotech
      </Button>
    </div>
  );
};

export default AmritAgrotechSetup;
