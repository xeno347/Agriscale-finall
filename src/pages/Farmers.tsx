import { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Users, MapPin, Phone, FileText, ShieldCheck, Map as MapIcon, NotebookText, Wallet, Check, Flag } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import CredentialsDialog, { type FarmerCredentials } from '@/components/farmers/CredentialsDialog';
import getBaseUrl from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

type FarmerRow = {
  id: string;
  fullName: string;
  phoneNumber: string;
  alternatePhone?: string | null;
  village: string;
  taluka?: string | null;
  district: string;
  state: string;
  profileImageUrl?: string;
  // `kyc` can include the full KYC object returned by backend (adhar, pan, IFSC, etc.)
  kyc?: any;
  landMapping?: { totalArea: number; coordinates: unknown[] };
  agreements: unknown[];
  credentials?: FarmerCredentials | null;
  blockAssigned?: string | null;
  createdAt: Date;
  documents?: Record<string, any> | null;
};

const Farmers = () => {
  // --- Existing State & Logic ---
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [credentialsDialogFarmerId, setCredentialsDialogFarmerId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [flagging, setFlagging] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_farmers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();

      const transformed: FarmerRow[] = (result.farmers || []).map((item: any) => {
        const fd = item.farmer_data || {};
        const kyc = item.kyc_data || null;
        const rawCreds = item.credentials_data ?? item.credentials ?? fd.credentials ?? null;
        const userId = rawCreds?.user_id ?? rawCreds?.userId ?? rawCreds?.username ?? null;
        const password = rawCreds?.password ?? rawCreds?.pass ?? null;

        return {
          id: item.farmer_id,
          fullName: fd.full_name || 'Unknown',
          phoneNumber: fd.phone_number || 'N/A',
          alternatePhone: fd.alternate_phone_number ?? null,
          village: fd.village || 'N/A',
          taluka: fd.taluka ?? null,
          district: fd.district || 'N/A',
          state: fd.state || 'N/A',
          // Try common places for profile photo URL returned by backend
          profileImageUrl:
            item.documents?.profile_photo?.url ||
            item.profile_photo ||
            fd.profile_photo_url ||
            fd.profile_image_url ||
            undefined,
          kyc: kyc || undefined,
          landMapping: fd.estimated_land_area != null
            ? { totalArea: fd.estimated_land_area, coordinates: fd.land_coordinates || [] }
            : undefined,
          agreements: item.agreement_data || [],
          credentials: userId != null || password != null ? { userId, password, saved: true } : null,
          blockAssigned: fd.block_assigned ?? fd.block ?? fd.block_name ?? null,
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
          documents: item.documents || null,
        };
      });

      setFarmers(transformed);
      // Initialize flagged state from backend response if present
      try {
        const flaggedMap: Record<string, boolean> = {};
        (result.farmers || []).forEach((it: any) => {
          if (it?.farmer_id && it?.flagged && (it.flagged.flagged === true || it.flagged === true)) {
            flaggedMap[it.farmer_id] = true;
          }
        });
        setFlagged(flaggedMap);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('Failed to load farmers:', error);
      toast({ title: 'Error', description: 'Failed to load farmers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (farmerId: string) => {
    // If currently flagged, just unflag locally
    if (flagged[farmerId]) {
      setFlagged(prev => ({ ...prev, [farmerId]: false }));
      return;
    }

    setFlagging(prev => ({ ...prev, [farmerId]: true }));
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/make_farmer_flagged`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_id: farmerId }),
      });

      let body: any = null;
      try { body = await resp.json(); } catch { body = null; }

      if (!resp.ok || body?.success !== true) {
        console.error('Failed to flag farmer', resp.status, body);
        toast({ title: 'Error', description: 'Failed to flag farmer', variant: 'destructive' });
        return;
      }

      setFlagged(prev => ({ ...prev, [farmerId]: true }));
      toast({ title: 'Success', description: 'Farmer flagged', variant: 'success' });
    } catch (err) {
      console.error('Failed to call flag API', err);
      toast({ title: 'Error', description: 'Failed to flag farmer', variant: 'destructive' });
    } finally {
      setFlagging(prev => {
        const copy = { ...prev };
        delete copy[farmerId];
        return copy;
      });
    }
  };

  // --- Filtering & Stats ---
  const filteredFarmers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return farmers;

    return farmers.filter(farmer =>
      farmer.fullName.toLowerCase().includes(q) ||
      farmer.village.toLowerCase().includes(q) ||
      farmer.district.toLowerCase().includes(q)
    );
  }, [farmers, searchQuery]);

  const totalArea = farmers.reduce((acc, f) => acc + (f.landMapping?.totalArea || 0), 0);
  // consider KYC present if backend returned kyc_data
  const verifiedKYC = farmers.filter(f => !!f.kyc).length;
  const totalAgreements = farmers.reduce((acc, f) => acc + f.agreements.length, 0);

  const renderDialogBody = (data: unknown) => {
    if (data == null) {
      return <div className="min-h-8" />;
    }

    if (Array.isArray(data) && data.length === 0) {
      return <div className="min-h-8" />;
    }

    return (
      <pre className="max-h-80 overflow-auto rounded-md bg-muted/30 p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  const IconPopup = ({
    title,
    description,
    icon,
    data,
  }: {
    title: string;
    description?: string;
    icon: React.ReactNode;
    data: unknown;
  }) => {
    // Normalize possible coordinate shapes to [[lat,lng], ...]
    const normalizedCoords: [number, number][] | null = (() => {
      if (!data) return null;
      // If data is an object with coordinates property
      const asAny = data as any;
      const coords = asAny?.coordinates ?? asAny?.landCoordinates ?? asAny;
      if (!coords) return null;
      if (!Array.isArray(coords) || coords.length === 0) return null;
      // If elements are objects with lat/lng
      if (typeof coords[0] === 'object' && coords[0] !== null && 'lat' in coords[0]) {
        return coords.map((c: any) => [Number(c.lat), Number(c.lng)]);
      }
      // If elements are arrays [lat,lng] or [lng,lat] heuristics
      if (Array.isArray(coords[0]) && coords[0].length >= 2) {
        // Assume [lat,lng] ordering used across app
        return coords.map((c: any) => [Number(c[0]), Number(c[1])]);
      }
      // If coords is a flat numeric array [lat, lng]
      if (typeof coords[0] === 'number' && coords.length >= 2) {
        return [[Number(coords[0]), Number(coords[1])]];
      }
      return null;
    })();

    // Fix default marker icon paths for Leaflet inside this component
    const DefaultIcon = L.icon({
      iconUrl: iconUrl as string,
      shadowUrl: iconShadow as string,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    // @ts-ignore
    L.Marker.prototype.options.icon = DefaultIcon;

    const asAny = data as any;
    const kyc = asAny?.kyc ?? null;
    const documents = asAny?.documents ?? null;

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="h-9 w-9 hover:bg-gray-100 bg-transparent p-0">
            {icon}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          {normalizedCoords ? (
            <div className="h-72 w-full rounded-md overflow-hidden">
              <MapContainer
                center={[normalizedCoords[0][0], normalizedCoords[0][1]]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                />
                <Polygon positions={normalizedCoords as any} pathOptions={{ color: '#f03' }} />
                <Marker position={[normalizedCoords[0][0], normalizedCoords[0][1]] as any}>
                  <Popup>Land mapping (first point)</Popup>
                </Marker>
              </MapContainer>
            </div>
          ) : (() => {
            // Agreements view: if caller passed { agreement, documents }
            const agreementObj = (asAny?.agreement !== undefined) ? asAny.agreement : null;
            const docs = (asAny?.documents !== undefined) ? asAny.documents : documents;

            if (agreementObj) {
              // Agreement may be object or array
              const first = Array.isArray(agreementObj) ? agreementObj[0] : agreementObj;
              const lease = first?.lease_rent ?? first?.leaseRent ?? null;
              const start = first?.agreement_start_date ?? first?.agreementStart ?? null;
              const end = first?.agreement_end_date ?? first?.agreementEnd ?? null;

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Agreement Details</h3>
                    </div>
                    {lease != null && (
                      <div className="text-sm font-medium text-muted-foreground">Lease: ₹{Number(lease).toLocaleString('en-IN')}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-xs text-muted-foreground">Agreement Start</div>
                    <div className="text-sm">{start ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">Agreement End</div>
                    <div className="text-sm">{end ?? '—'}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Agreement Document</div>
                    {docs && (docs.agreement?.url || docs.agreement_file?.url || docs?.agreement_url) ? (
                      <div className="flex items-center gap-2">
                        <a href={docs.agreement?.url || docs.agreement_file?.url || docs?.agreement_url} target="_blank" rel="noreferrer">
                          <Button className="h-8 px-3 text-sm border border-gray-300 bg-white hover:bg-gray-50">View Agreement</Button>
                        </a>
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No agreement document available</div>
                    )}
                  </div>
                </div>
              );
            }

            // Fallback to KYC/documents rendering if present
            if (kyc || documents) {
              return (
                <div className="space-y-4">
                  {/* KYC summary */}
                  {kyc && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                          <h3 className="text-sm font-medium">KYC Details</h3>
                        </div>
                        {documents && Object.keys(documents).length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Check className="w-4 h-4" />
                            <span>Verified with documents</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-xs text-muted-foreground">Aadhaar Number</div>
                        <div className="text-sm">{kyc.adhar_number ?? '—'}</div>

                        <div className="text-xs text-muted-foreground">PAN Number</div>
                        <div className="text-sm">{kyc.pan_numnber ?? '—'}</div>

                        <div className="text-xs text-muted-foreground">Account Number</div>
                        <div className="text-sm">{kyc.accound_number ?? '—'}</div>

                        <div className="text-xs text-muted-foreground">IFSC</div>
                        <div className="text-sm">{kyc.IFSC_code ?? '—'}</div>

                        <div className="text-xs text-muted-foreground">Address</div>
                        <div className="text-sm col-span-1">{kyc.permanent_address ?? '—'}</div>
                      </div>
                    </div>
                  )}

                  {/* Documents list */}
                  {documents && Object.keys(documents).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="w-4 h-4" />
                        <span>Documents</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(documents).map(([key, val]) => {
                          const valTyped = val as any;
                          return (
                          <div key={key} className="flex items-center justify-between gap-3 rounded-md border p-2">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium">{key.replace(/_/g, ' ')}</div>
                              <div className="text-xs text-muted-foreground">{(function(key){
                                if (!key) return '';
                                try{
                                  const k = String(key);
                                  if (k.length <= 3) return k.replace(/./g, '*');
                                  return k.slice(0,3) + '***********';
                                }catch{ return '' }
                              })(valTyped?.s3_key)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {valTyped?.url ? (
                                <a href={valTyped.url} target="_blank" rel="noreferrer">
                                  <Button className="h-8 px-3 text-sm border border-gray-300 bg-white hover:bg-gray-50">View</Button>
                                </a>
                              ) : (
                                <Button className="h-8 px-3 text-sm border border-gray-300 bg-gray-100" disabled>View</Button>
                              )}
                              {valTyped?.url && <Check className="w-4 h-4 text-green-600" />}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return <div className="py-6 text-center text-sm text-muted-foreground">No data found</div>;
          })()
          }
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Farmers</h1>
          <p className="text-muted-foreground mt-1">Manage registered farmers</p>
        </div>
      </div>

      {/* Stats - Exact Layout Preserved */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Farmers', value: farmers.length, icon: Users, color: 'text-primary' },
          { label: 'Total Land Area', value: `${totalArea} acres`, icon: null, color: 'text-blue-600' }, 
          { label: 'KYC Verified', value: verifiedKYC, icon: null, color: 'text-green-600' }, 
          { label: 'Agreements', value: totalAgreements, icon: null, color: 'text-orange-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-5 shadow-sm border border-border bg-white">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter - Exact Layout Preserved */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, village, or district..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2 border border-gray-300 bg-white hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Rows / Table View */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Farmer&apos;s name</TableHead>
                <TableHead className="text-center">Flag</TableHead>
                <TableHead>Phone number</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Block</TableHead>
                <TableHead className="text-center">Land</TableHead>
                <TableHead className="text-center">KYC</TableHead>
                <TableHead className="text-center">Agreement</TableHead>
                <TableHead className="text-center">Harvest</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-center">Credential</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredFarmers.map((farmer) => (
                <TableRow key={farmer.id} className={flagged[farmer.id] ? 'bg-red-50' : undefined}>
                  <TableCell className="py-2">
                    {farmer.profileImageUrl ? (
                      <img src={farmer.profileImageUrl} alt="profile" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted/20" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{farmer.fullName}</div>
                    <div className="text-xs text-muted-foreground">ID: {farmer.id}</div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      onClick={() => toggleFlag(farmer.id)}
                      disabled={!!flagging[farmer.id]}
                      className={`h-9 w-9 p-0 hover:bg-gray-100 bg-transparent ${flagged[farmer.id] ? 'text-red-600' : 'text-muted-foreground'}`}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{farmer.phoneNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {farmer.village}
                        {farmer.district ? `, ${farmer.district}` : ''}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>{farmer.blockAssigned ?? ''}</TableCell>

                  <TableCell className="text-center">
                    <IconPopup
                      title="Land Mapping"
                      description={farmer.landMapping?.totalArea != null ? `${farmer.landMapping.totalArea} acres` : undefined}
                      icon={<MapIcon className="h-4 w-4" />}
                      data={farmer.landMapping ?? null}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <IconPopup
                      title="KYC"
                      description={farmer.kyc ? 'KYC data available' : undefined}
                      icon={<ShieldCheck className="h-4 w-4" />}
                      data={{ kyc: farmer.kyc ?? null, documents: farmer.documents ?? null }}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <IconPopup
                      title="Agreements"
                      description={farmer.agreements && (Array.isArray(farmer.agreements) ? (farmer.agreements.length ? `${farmer.agreements.length} agreement(s)` : undefined) : 'Agreement details')}
                      icon={<FileText className="h-4 w-4" />}
                      data={{ agreement: farmer.agreements ?? null, documents: farmer.documents ?? null }}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <IconPopup
                      title="Harvest Logs"
                      icon={<NotebookText className="h-4 w-4" />}
                      data={null}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <IconPopup
                      title="Payments"
                      icon={<Wallet className="h-4 w-4" />}
                      data={null}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <CredentialsDialog
                      farmerId={farmer.id}
                      credentials={farmer.credentials}
                      open={credentialsDialogFarmerId === farmer.id}
                      onOpenChange={(nextOpen) => setCredentialsDialogFarmerId(nextOpen ? farmer.id : null)}
                      onSaved={(next) =>
                        setFarmers(prev => prev.map(f => (f.id === farmer.id ? { ...f, credentials: next } : f)))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Farmers;