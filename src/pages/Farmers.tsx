import { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Users, MapPin, Phone, FileText, ShieldCheck, Map as MapIcon, NotebookText, Wallet } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
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
  kyc?: { verified: boolean };
  landMapping?: { totalArea: number; coordinates: unknown[] };
  agreements: unknown[];
  credentials?: FarmerCredentials | null;
  blockAssigned?: string | null;
  createdAt: Date;
};

const Farmers = () => {
  // --- Existing State & Logic ---
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [credentialsDialogFarmerId, setCredentialsDialogFarmerId] = useState<string | null>(null);
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
          profileImageUrl: undefined,
          kyc: kyc ? { verified: true } : undefined,
          landMapping: fd.estimated_land_area != null
            ? { totalArea: fd.estimated_land_area, coordinates: fd.land_coordinates || [] }
            : undefined,
          agreements: item.agreement_data || [],
          credentials: userId != null || password != null ? { userId, password, saved: true } : null,
          blockAssigned: fd.block_assigned ?? fd.block ?? fd.block_name ?? null,
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        };
      });

      setFarmers(transformed);
    } catch (error) {
      console.error('Failed to load farmers:', error);
      toast({ title: 'Error', description: 'Failed to load farmers', variant: 'destructive' });
    } finally {
      setLoading(false);
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
  const verifiedKYC = farmers.filter(f => f.kyc?.verified).length;
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

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
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
          ) : (
            renderDialogBody(data)
          )}
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
        <Button variant="outline" className="gap-2">
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
                <TableHead>ID</TableHead>
                <TableHead>Farmer&apos;s name</TableHead>
                <TableHead>Phone number</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Block assigned</TableHead>
                <TableHead className="text-center">Land</TableHead>
                <TableHead className="text-center">KYC</TableHead>
                <TableHead className="text-center">Agreement</TableHead>
                <TableHead className="text-center">Harvest Logs</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-center">Credential</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredFarmers.map((farmer) => (
                <TableRow key={farmer.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{farmer.id}</TableCell>
                  <TableCell className="font-medium">{farmer.fullName}</TableCell>
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
                      description={farmer.kyc?.verified ? 'Verified' : undefined}
                      icon={<ShieldCheck className="h-4 w-4" />}
                      data={farmer.kyc ?? null}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <IconPopup
                      title="Agreements"
                      description={farmer.agreements?.length ? `${farmer.agreements.length} agreement(s)` : undefined}
                      icon={<FileText className="h-4 w-4" />}
                      data={farmer.agreements ?? []}
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