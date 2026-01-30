import { useEffect, useState } from 'react';
import { Plus, Trash2, Map, CheckCircle, Clock, ArrowUp, ArrowDown, Bot, Building, MapIcon, Grid3x3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Farmer } from '@/types/farm';
import getBaseUrl from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

interface LandRow {
  id: number;
  village: string;
  farmerId: string;
  fetchedDetails: string | null;
}

interface Block {
  block_id: string;
  block_name?: string;
  total_area?: number;
}

interface Zone {
  zone_id: string;
  zone_name?: string;
  total_area?: number;
}

interface Cluster {
  cluster_id: string;
  cluster_name?: string;
  total_area?: number;
}

type EntityType = 'cluster' | 'zone' | 'block';

const Blocks = () => {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<EntityType>('cluster');

  // Block State
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockLandRows, setBlockLandRows] = useState<LandRow[]>([
    { id: 1, village: '', farmerId: '', fetchedDetails: null }
  ]);
  const [viewBlock, setViewBlock] = useState<Block | null>(null);
  const [isViewBlockModalOpen, setIsViewBlockModalOpen] = useState(false);

  // Zone State
  const [zones, setZones] = useState<Zone[]>([]);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneLandRows, setZoneLandRows] = useState<LandRow[]>([
    { id: 1, village: '', farmerId: '', fetchedDetails: null }
  ]);
  const [viewZone, setViewZone] = useState<Zone | null>(null);
  const [isViewZoneModalOpen, setIsViewZoneModalOpen] = useState(false);

  // Cluster State
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isClusterModalOpen, setIsClusterModalOpen] = useState(false);
  const [clusterName, setClusterName] = useState('');
  const [clusterLandRows, setClusterLandRows] = useState<LandRow[]>([
    { id: 1, village: '', farmerId: '', fetchedDetails: null }
  ]);
  const [viewCluster, setViewCluster] = useState<Cluster | null>(null);
  const [isViewClusterModalOpen, setIsViewClusterModalOpen] = useState(false);

  // Common State
  const [availableFarms, setAvailableFarms] = useState<Farmer[]>([]);
  const [loadingFarmsForEntity, setLoadingFarmsForEntity] = useState(false);
  const [availableBlocksForZone, setAvailableBlocksForZone] = useState<Block[]>([]);
  const [loadingBlocksForZone, setLoadingBlocksForZone] = useState(false);
  const [availableZonesForCluster, setAvailableZonesForCluster] = useState<Zone[]>([]);
  const [loadingZonesForCluster, setLoadingZonesForCluster] = useState(false);
  const [farmsInBlock, setFarmsInBlock] = useState<any[]>([]);
  const [loadingFarmsInBlock, setLoadingFarmsInBlock] = useState(false);
  const [blocksInZoneView, setBlocksInZoneView] = useState<any[]>([]);
  const [loadingBlocksInZoneView, setLoadingBlocksInZoneView] = useState(false);

  useEffect(() => {
    loadBlocks();
    loadZones();
    loadClusters();
  }, []);

  const loadBlocks = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_blocks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const result = await resp.json();
      setBlocks(result.blocks || []);
    } catch (error) {
      console.error('Failed to load blocks:', error);
      toast({ title: 'Error', description: 'Failed to load blocks', variant: 'destructive' });
    }
  };

  const loadZones = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_zones`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const result = await resp.json();
      setZones(result.zones || []);
    } catch (error) {
      console.error('Failed to load zones:', error);
      toast({ title: 'Error', description: 'Failed to load zones', variant: 'destructive' });
    }
  };

  const loadClusters = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_clusters`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const result = await resp.json();
      setClusters(result.clusters || []);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      toast({ title: 'Error', description: 'Failed to load clusters', variant: 'destructive' });
    }
  };

  const addLandRow = (landRows: LandRow[], setLandRows: (rows: LandRow[]) => void) => {
    setLandRows([
      ...landRows,
      { id: Date.now(), village: '', farmerId: '', fetchedDetails: null }
    ]);
  };

  const removeLandRow = (id: number, landRows: LandRow[], setLandRows: (rows: LandRow[]) => void) => {
    setLandRows(landRows.filter(row => row.id !== id));
  };

  const moveLandRow = (id: number, direction: 'up' | 'down', landRows: LandRow[], setLandRows: (rows: LandRow[]) => void) => {
    setLandRows(prev => {
      const index = prev.findIndex(r => r.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleLandChange = (id: number, field: keyof LandRow, value: string, landRows: LandRow[], setLandRows: (rows: LandRow[]) => void) => {
    setLandRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        if (field === 'farmerId') {
          const selectedFarmer = availableFarms.find(f => f.id.toString() === value);
          if (selectedFarmer) {
            const area = selectedFarmer.landMapping?.totalArea || '0';
            updatedRow.fetchedDetails = `${area} Acres in ${selectedFarmer.village}`;
            updatedRow.village = selectedFarmer.village || '';
          } else {
            updatedRow.fetchedDetails = null;
            updatedRow.village = '';
          }
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const createGenericHandler = (entityType: EntityType, landRows: LandRow[], entityName: string, endpoint: string, resetCallback: () => void) => {
    return async () => {
      const farmerArr = landRows
        .filter(row => !!row.farmerId)
        .map((row, idx) => {
          let area = 0;
          if (row.fetchedDetails) {
            const match = row.fetchedDetails.match(/^(\d+(?:\.\d+)?) Acres/);
            if (match) area = parseFloat(match[1]);
          }
          return {
            farmer_id: row.farmerId,
            village: row.village,
            area,
            priority: idx
          };
        });

      const total = farmerArr.reduce((acc, f) => acc + (f.area || 0), 0);
      const base = getBaseUrl();

      try {
        let payload: any;
        if (entityType === 'zone') {
          // build block_list expected by backend (use landRows passed to handler)
          const block_list = landRows
            .filter(r => !!r.farmerId)
            .map((r, idx) => {
              const blk = availableBlocksForZone.find(b => b.block_id === r.farmerId);
              const area = blk?.total_area ?? (r.fetchedDetails ? parseFloat((r.fetchedDetails.match(/^(\d+(?:\.\d+)?)/) || [0])[0]) : 0);
              return {
                total_area: area || 0,
                block_id: r.farmerId,
                priority: idx
              };
            });
          payload = {
            zone_name: entityName,
            block_list
          };
        } else if (entityType === 'cluster') {
          // build zone_list expected by backend
          const zone_list = landRows
            .filter(r => !!r.farmerId)
            .map((r, idx) => {
              const zn = availableZonesForCluster.find(z => z.zone_id === r.farmerId);
              const area = zn?.total_area ?? (r.fetchedDetails ? parseFloat((r.fetchedDetails.match(/^(\d+(?:\.\d+)?)/) || [0])[0]) : 0);
              return {
                total_area: area || 0,
                zone_id: r.farmerId,
                priority: idx
              };
            });
          payload = {
            cluster_name: entityName,
            zone_list
          };
        } else {
          payload = {
            [`${entityType}_name`]: entityName,
            farmer: farmerArr,
            total_area: total
          };
        }

        const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

        toast({ title: 'Success', description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} created successfully!` });
        resetCallback();

        if (entityType === 'cluster') loadClusters();
        else if (entityType === 'zone') loadZones();
        else if (entityType === 'block') loadBlocks();
      } catch (error) {
        toast({ title: 'Error', description: `Failed to create ${entityType}`, variant: 'destructive' });
      }
    };
  };

  const handleCreateCluster = async () => {
    const zone_list = clusterLandRows
      .filter(r => !!r.farmerId)
      .map((r, idx) => {
        const zn = availableZonesForCluster.find(z => z.zone_id === r.farmerId);
        const area = zn?.total_area ?? (r.fetchedDetails ? parseFloat((r.fetchedDetails.match(/^(\d+(?:\.\d+)?)/) || ['0'])[0]) : 0);
        return {
          total_area: area || 0,
          zone_id: r.farmerId,
          priority: idx
        };
      });

    const payload = {
      zone_list,
      cluster_name: clusterName
    };

    const base = getBaseUrl();
    try {
      console.debug('Creating cluster with payload:', payload);
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/create_cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      toast({ title: 'Success', description: `Cluster created successfully!` });
      setIsClusterModalOpen(false);
      setClusterName('');
      setClusterLandRows([{ id: 1, village: '', farmerId: '', fetchedDetails: null }]);
      loadClusters();
    } catch (error) {
      console.error('Failed to create cluster:', error);
      toast({ title: 'Error', description: 'Failed to create cluster', variant: 'destructive' });
    }
  };

  const handleCreateZone = createGenericHandler('zone', zoneLandRows, zoneName, 'create_zone', () => {
    setIsZoneModalOpen(false);
    setZoneName('');
    setZoneLandRows([{ id: 1, village: '', farmerId: '', fetchedDetails: null }]);
  });

  const handleCreateBlock = createGenericHandler('block', blockLandRows, blockName, 'create_block', () => {
    setIsBlockModalOpen(false);
    setBlockName('');
    setBlockLandRows([{ id: 1, village: '', farmerId: '', fetchedDetails: null }]);
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Farm Hierarchy Management</h1>
          <p className="text-muted-foreground mt-1">Organize farms into clusters, zones, and blocks</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntityType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 items-center">
          <TabsTrigger value="cluster" className="flex items-center justify-center gap-2 text-base py-2 px-3 rounded-md hover:bg-muted/5">
            <Grid3x3 className="w-5 h-5" />
            Clusters
          </TabsTrigger>
          <TabsTrigger value="zone" className="flex items-center justify-center gap-2 text-base py-2 px-3 rounded-md hover:bg-muted/5">
            <Building className="w-5 h-5" />
            Zones
          </TabsTrigger>
          <TabsTrigger value="block" className="flex items-center justify-center gap-2 text-base py-2 px-3 rounded-md hover:bg-muted/5">
            <Map className="w-5 h-5" />
            Blocks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cluster" className="space-y-6">
          {renderEntityContent('cluster', clusters, {
            isModalOpen: isClusterModalOpen,
            setIsModalOpen: setIsClusterModalOpen,
            entityName: clusterName,
            setEntityName: setClusterName,
            landRows: clusterLandRows,
            setLandRows: setClusterLandRows,
            viewEntity: viewCluster,
            setViewEntity: setViewCluster,
            isViewModalOpen: isViewClusterModalOpen,
            setIsViewModalOpen: setIsViewClusterModalOpen,
            handleCreate: handleCreateCluster,
            entityLabel: 'Cluster',
            createEndpoint: 'create_cluster'
          })}
        </TabsContent>

        <TabsContent value="zone" className="space-y-6">
          {renderEntityContent('zone', zones, {
            isModalOpen: isZoneModalOpen,
            setIsModalOpen: setIsZoneModalOpen,
            entityName: zoneName,
            setEntityName: setZoneName,
            landRows: zoneLandRows,
            setLandRows: setZoneLandRows,
            viewEntity: viewZone,
            setViewEntity: setViewZone,
            isViewModalOpen: isViewZoneModalOpen,
            setIsViewModalOpen: setIsViewZoneModalOpen,
            handleCreate: handleCreateZone,
            entityLabel: 'Zone',
            createEndpoint: 'create_zone'
          })}
        </TabsContent>

        <TabsContent value="block" className="space-y-6">
          {renderEntityContent('block', blocks, {
            isModalOpen: isBlockModalOpen,
            setIsModalOpen: setIsBlockModalOpen,
            entityName: blockName,
            setEntityName: setBlockName,
            landRows: blockLandRows,
            setLandRows: setBlockLandRows,
            viewEntity: viewBlock,
            setViewEntity: setViewBlock,
            isViewModalOpen: isViewBlockModalOpen,
            setIsViewModalOpen: setIsViewBlockModalOpen,
            handleCreate: handleCreateBlock,
            entityLabel: 'Block',
            createEndpoint: 'create_block'
          })}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderEntityContent(
    entityType: EntityType,
    entities: any[],
    config: {
      isModalOpen: boolean;
      setIsModalOpen: (open: boolean) => void;
      entityName: string;
      setEntityName: (name: string) => void;
      landRows: LandRow[];
      setLandRows: (rows: LandRow[]) => void;
      viewEntity: any;
      setViewEntity: (entity: any) => void;
      isViewModalOpen: boolean;
      setIsViewModalOpen: (open: boolean) => void;
      handleCreate: () => Promise<void>;
      entityLabel: string;
      createEndpoint: string;
    }
  ) {
    const getEntityStats = () => {
      if (entityType === 'cluster') {
        return [
          { label: 'Total Clusters', value: entities.length, icon: Grid3x3, color: 'text-blue-600' },
          { label: 'Pending Approval', value: '0', icon: Clock, color: 'text-orange-500' },
          { label: 'Active Clusters', value: entities.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total Area', value: `${entities.reduce((acc, e) => acc + (e.total_area || 0), 0)} acres`, icon: null, color: 'text-purple-600' },
        ];
      } else if (entityType === 'zone') {
        return [
          { label: 'Total Zones', value: entities.length, icon: Building, color: 'text-blue-600' },
          { label: 'Pending Approval', value: '0', icon: Clock, color: 'text-orange-500' },
          { label: 'Active Zones', value: entities.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total Area', value: `${entities.reduce((acc, e) => acc + (e.total_area || 0), 0)} acres`, icon: null, color: 'text-purple-600' },
        ];
      } else {
        return [
          { label: 'Total Blocks', value: entities.length, icon: Map, color: 'text-blue-600' },
          { label: 'Pending Approval', value: '0', icon: Clock, color: 'text-orange-500' },
          { label: 'Active Blocks', value: entities.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total Area', value: `${entities.reduce((acc, e) => acc + (e.total_area || 0), 0)} acres`, icon: null, color: 'text-purple-600' },
        ];
      }
    };

    return (
      <>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {getEntityStats().map(stat => (
            <div key={stat.label} className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {stat.icon && <stat.icon className={`w-4 h-4 ${stat.color}`} />}
              </div>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Header & Action */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{config.entityLabel} Management</h2>

          <Dialog
            open={config.isModalOpen}
            onOpenChange={(open) => {
              config.setIsModalOpen(open);
              if (open) {
                setLoadingFarmsForEntity(true);
                const base = getBaseUrl();
                fetch(`${base.replace(/\/$/, '')}/farmer_managment/farm_for_block`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                })
                  .then(async resp => {
                    if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
                    const result = await resp.json();
                    const transformed: Farmer[] = (result.farmers || []).map((item: any) => {
                      const fd = item.farmer_data || {};
                      const kyc = item.kyc_data || null;
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
                        createdAt: item.created_at ? new Date(item.created_at) : new Date(),
                      } as Farmer;
                    });
                    setAvailableFarms(transformed);
                  })
                  .catch(() => {
                    setAvailableFarms([]);
                    toast({ title: 'Error', description: 'Failed to load available farms', variant: 'destructive' });
                  })
                  .finally(() => setLoadingFarmsForEntity(false));

                // if zone modal, also load available blocks to choose from
                if (entityType === 'zone') {
                  setLoadingBlocksForZone(true);
                  fetch(`${base.replace(/\/$/, '')}/farmer_managment/block_for_zone`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                  })
                    .then(async resp => {
                      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
                      const data = await resp.json();
                      setAvailableBlocksForZone(Array.isArray(data) ? data : []);
                    })
                    .catch(() => {
                      setAvailableBlocksForZone([]);
                      toast({ title: 'Error', description: 'Failed to load blocks for zone', variant: 'destructive' });
                    })
                    .finally(() => setLoadingBlocksForZone(false));
                }

                // if cluster modal, load available zones to choose from
                if (entityType === 'cluster') {
                  setLoadingZonesForCluster(true);
                  fetch(`${base.replace(/\/$/, '')}/farmer_managment/zone_for_cluster`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                  })
                    .then(async resp => {
                      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
                      const data = await resp.json();
                      setAvailableZonesForCluster(Array.isArray(data) ? data : []);
                    })
                    .catch(() => {
                      setAvailableZonesForCluster([]);
                      toast({ title: 'Error', description: 'Failed to load zones for cluster', variant: 'destructive' });
                    })
                    .finally(() => setLoadingZonesForCluster(false));
                }
              } else {
                setAvailableFarms([]);
                setAvailableBlocksForZone([]);
                config.setEntityName('');
                config.setLandRows([{ id: 1, village: '', farmerId: '', fetchedDetails: null }]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-green-700 hover:bg-green-800">
                <Plus className="w-4 h-4" /> Create {config.entityLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Create New {config.entityLabel}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Entity Name Input */}
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">{config.entityLabel} Name</label>
                    <Input
                      placeholder={`e.g. ${entityType === 'cluster' ? 'North Region Alpha' : entityType === 'zone' ? 'Zone Central' : 'North Sector Alpha'}`}
                      value={config.entityName}
                      onChange={(e) => config.setEntityName(e.target.value)}
                    />
                  </div>
                  <div className="mb-1">
                    <div className="bg-muted/50 border border-border rounded-lg px-6 py-3 flex flex-col items-center min-w-[120px]">
                      <span className="text-xs text-muted-foreground mb-1">Total Area</span>
                      <span className="text-xl font-bold">
                        {(() => {
                          let total = 0;
                          config.landRows.forEach(row => {
                            if (row.fetchedDetails) {
                              const match = row.fetchedDetails.match(/^(\d+(?:\.\d+)?) Acres/);
                              if (match) total += parseFloat(match[1]);
                            }
                          });
                          return total;
                        })()} acres
                      </span>
                    </div>
                  </div>
                </div>

                {/* For Zone: we'll show blocks in the repeater below (as Add Block) */}

                {/* Add Land / Add Block Repeater */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{entityType === 'zone' ? 'Add Block' : 'Add Land'}</h3>
                    <Button
                      onClick={() => addLandRow(config.landRows, config.setLandRows)}
                      size="sm"
                      variant="outline"
                      className="gap-2 text-green-700 border-green-700 hover:bg-green-50"
                    >
                      <Plus className="w-4 h-4" /> Add Row
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden bg-white/50">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                      <div className="col-span-1 text-center">S.No</div>
                      <div className="col-span-1 text-center">Priority</div>
                      <div className="col-span-4">{entityType === 'zone' ? 'Block' : 'Farmer Name'}</div>
                      <div className="col-span-3">Fetched Details</div>
                      <div className="col-span-3">{entityType === 'zone' ? 'Block Name' : 'Village'}</div>
                      <div className="col-span-1 text-center">Action</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y">
                      {config.landRows.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/20 transition-colors">
                          <div className="col-span-1 text-center text-muted-foreground">{index + 1}</div>

                          <div className="col-span-1 flex items-center justify-center gap-1">
                            <div className="min-w-[28px] h-7 px-2 rounded-md border border-border bg-muted/30 text-xs font-semibold text-muted-foreground flex items-center justify-center">
                              {index}
                            </div>
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={index === 0}
                                onClick={() => moveLandRow(row.id, 'up', config.landRows, config.setLandRows)}
                                aria-label="Move up"
                                title="Move up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={index === config.landRows.length - 1}
                                onClick={() => moveLandRow(row.id, 'down', config.landRows, config.setLandRows)}
                                aria-label="Move down"
                                title="Move down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="col-span-4">
                            {entityType === 'cluster' ? (
                              loadingZonesForCluster ? (
                                <div className="text-xs text-muted-foreground italic px-2">Loading zones...</div>
                              ) : (
                                <select
                                  key={`cluster-select-${row.id}`}
                                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  value={row.farmerId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    config.setLandRows(prev => prev.map(r => {
                                      if (r.id === row.id) {
                                        const zn = availableZonesForCluster.find(z => z.zone_id === val);
                                        return {
                                          ...r,
                                          farmerId: val,
                                          fetchedDetails: zn ? `${zn.total_area} Acres` : null,
                                          village: zn?.zone_name || ''
                                        };
                                      }
                                      return r;
                                    }));
                                  }}
                                >
                                  <option value="">Select Zone</option>
                                  {(() => {
                                    const selectedIds = config.landRows.map(r => r.farmerId).filter(Boolean) as string[];
                                    const options = availableZonesForCluster.filter(z => z.zone_id === row.farmerId || !selectedIds.includes(z.zone_id));
                                    return options.map(z => (
                                      <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                                    ));
                                  })()}
                                </select>
                              )
                            ) : entityType === 'zone' ? (
                              loadingBlocksForZone ? (
                                <div className="text-xs text-muted-foreground italic px-2">Loading blocks...</div>
                              ) : (
                                <select
                                  key={`zone-select-${row.id}`}
                                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  value={row.farmerId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    config.setLandRows(prev => prev.map(r => {
                                      if (r.id === row.id) {
                                        const blk = availableBlocksForZone.find(b => b.block_id === val);
                                        return {
                                          ...r,
                                          farmerId: val,
                                          fetchedDetails: blk ? `${blk.total_area} Acres` : null,
                                          village: blk?.block_name || ''
                                        };
                                      }
                                      return r;
                                    }));
                                  }}
                                >
                                  <option value="">Select Block</option>
                                  {(() => {
                                    const selectedIds = config.landRows.map(r => r.farmerId).filter(Boolean) as string[];
                                    const options = availableBlocksForZone.filter(b => b.block_id === row.farmerId || !selectedIds.includes(b.block_id));
                                    return options.map(b => (
                                      <option key={b.block_id} value={b.block_id}>{b.block_name}</option>
                                    ));
                                  })()}
                                </select>
                              )
                            ) : (
                              loadingFarmsForEntity ? (
                                <div className="text-xs text-muted-foreground italic px-2">Loading farmers...</div>
                              ) : (
                                <select
                                  key={`farmer-select-${row.id}`}
                                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  value={row.farmerId}
                                  onChange={(e) => handleLandChange(row.id, 'farmerId', e.target.value, config.landRows, config.setLandRows)}
                                >
                                  <option value="">Select Farmer</option>
                                  {availableFarms.map(f => (
                                    <option key={f.id} value={f.id}>{f.fullName}</option>
                                  ))}
                                </select>
                              )
                            )}
                          </div>

                          <div className="col-span-3">
                            {row.fetchedDetails ? (
                              <div className="text-sm px-3 py-2 bg-blue-50 text-blue-700 rounded-md border border-blue-100 flex items-center gap-2">
                                <Map className="w-3 h-3" />
                                <span className="truncate">{row.fetchedDetails}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic px-2">{entityType === 'zone' ? 'Select block to fetch' : 'Select farmer to fetch'}</span>
                            )}
                          </div>

                          <div className="col-span-3">
                            <div className="h-9 flex items-center px-3 bg-muted/30 rounded border border-input text-sm text-muted-foreground">
                              {row.village || <span className="italic text-xs">{entityType === 'zone' ? 'Select block' : 'Select farmer'}</span>}
                            </div>
                          </div>

                          <div className="col-span-1 flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeLandRow(row.id, config.landRows, config.setLandRows)}
                              aria-label="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {config.landRows.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      No rows added yet. Click "Add Row" to start.
                    </div>
                  )}
                </div>

                {/* Auto Priority */}
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    className="gap-2 text-blue-700 border-blue-700 hover:bg-blue-50 rounded-full shadow-md"
                    title="Auto Priority"
                    disabled={config.landRows.length === 0 || config.landRows.every(row => !row.farmerId)}
                    onClick={() => {
                      config.setLandRows(prev => {
                        const sorted = [...prev].sort((a, b) => {
                          const areaA = parseFloat(a.fetchedDetails?.split(' ')[0] || '0');
                          const areaB = parseFloat(b.fetchedDetails?.split(' ')[0] || '0');
                          return areaB - areaA;
                        });
                        return sorted;
                      });
                      toast({ title: 'Priority Set', description: 'Farms have been auto-prioritized by area.' });
                    }}
                  >
                    <Bot className="w-5 h-5" />
                    Auto Priority
                  </Button>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => config.setIsModalOpen(false)}>Cancel</Button>
                  <Button
                    onClick={config.handleCreate}
                    className="bg-green-700 hover:bg-green-800"
                    disabled={!config.entityName.trim() || config.landRows.length === 0 || config.landRows.every(row => !row.farmerId)}
                  >
                    Save {config.entityLabel}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Entity List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {entities.length === 0 ? (
            <div className="border border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center text-center h-64 bg-muted/5">
              {entityType === 'cluster' && <Grid3x3 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />}
              {entityType === 'zone' && <Building className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />}
              {entityType === 'block' && <Map className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />}
              <h3 className="font-semibold text-lg text-muted-foreground">No {config.entityLabel}s Created</h3>
              <p className="text-sm text-muted-foreground/80 mt-1 max-w-xs">
                Get started by clicking the "Create {config.entityLabel}" button above to group farmers into manageable {entityType}s.
              </p>
            </div>
          ) : (
            entities.map((entity) => (
              <div
                  key={entity[`${entityType}_id`]}
                  className="group bg-white border border-green-200 rounded-2xl p-0 shadow-md hover:shadow-xl transition-shadow cursor-pointer relative overflow-hidden flex flex-col min-h-[180px]"
                  style={{ boxShadow: '0 4px 24px 0 rgba(16, 185, 129, 0.08)' }}
                  onClick={() => {
                    config.setViewEntity(entity);
                    if (entityType === 'block') {
                      setFarmsInBlock([]);
                      setLoadingFarmsInBlock(true);
                      const base = getBaseUrl();
                      fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_farms_in_block/${entity.block_id}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                      })
                        .then(async resp => {
                          if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
                          const data = await resp.json();
                          setFarmsInBlock(Array.isArray(data.farms) ? data.farms : (data.farms || []));
                        })
                        .catch(err => {
                          console.error('Failed to load farms in block:', err);
                          setFarmsInBlock([]);
                          toast({ title: 'Error', description: 'Failed to load farms for this block', variant: 'destructive' });
                        })
                        .finally(() => setLoadingFarmsInBlock(false));
                    } else {
                      setFarmsInBlock([]);
                    }
                    config.setIsViewModalOpen(true);
                  }}
                >
                <div className="h-2 w-full bg-gradient-to-r from-green-400 via-green-200 to-green-100" />
                <div className="flex-1 flex flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-xl text-green-900 truncate max-w-[70%] group-hover:text-green-700 transition-colors">
                        {entity[`${entityType}_name`] || entity[`${entityType}_id`]}
                      </h3>
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-semibold tracking-wide shadow-sm border border-green-200">
                        ID: {entity[`${entityType}_id`].slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-base font-medium text-green-800">Total Area</span>
                      <span className="text-2xl font-extrabold text-green-900 drop-shadow-sm">
                        {entity.total_area ?? 0} <span className="text-base font-semibold">acres</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <span className="text-xs text-muted-foreground">Click to view details</span>
                    <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs bg-green-50 px-2 py-1 rounded-full border border-green-100">
                      {entityType === 'cluster' && <Grid3x3 className="w-4 h-4 mr-1 text-green-400" />}
                      {entityType === 'zone' && <Building className="w-4 h-4 mr-1 text-green-400" />}
                      {entityType === 'block' && <Map className="w-4 h-4 mr-1 text-green-400" />}
                      {config.entityLabel}
                    </span>
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                  {entityType === 'cluster' && <Grid3x3 className="w-32 h-32 text-green-400" />}
                  {entityType === 'zone' && <Building className="w-32 h-32 text-green-400" />}
                  {entityType === 'block' && <Map className="w-32 h-32 text-green-400" />}
                </div>
              </div>
            ))
          )}
        </div>

        {/* View Entity Modal */}
        <Dialog open={config.isViewModalOpen} onOpenChange={(open) => {
          config.setIsViewModalOpen(open);
          if (!open) setFarmsInBlock([]);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">View {config.entityLabel}</DialogTitle>
            </DialogHeader>

            {config.viewEntity && (
              <div className="space-y-6 py-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">{config.entityLabel} Name</label>
                    <Input value={config.viewEntity[`${entityType}_name`] || ''} readOnly className="bg-muted/30" />
                  </div>
                  <div className="mb-1">
                    <div className="bg-muted/50 border border-border rounded-lg px-6 py-3 flex flex-col items-center min-w-[120px]">
                      <span className="text-xs text-muted-foreground mb-1">Total Area</span>
                      <span className="text-xl font-bold">{config.viewEntity.total_area ?? 0} acres</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Farms in {config.entityLabel}</label>
                  <div className="bg-muted/20 border rounded-lg p-4 min-h-[60px]">
                    {entityType === 'block' ? (
                      loadingFarmsInBlock ? (
                        <div className="text-sm text-muted-foreground italic">Loading farms...</div>
                      ) : farmsInBlock.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">No farms found for this block.</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {farmsInBlock.map((f: any) => (
                            <div key={f.farm_id} className="p-3 border rounded-md bg-white/60 flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-sm">Farm ID: {f.farm_id}</div>
                                <div className="text-xs text-muted-foreground">Farmer ID: {f.farmer_id}</div>
                                <div className="text-xs mt-1">Area: {f.area ?? f.area === 0 ? `${f.area} acres` : 'N/A'}</div>
                                <div className="text-xs">Village: {f.land_data?.village || f.land_data?.village || 'N/A'}</div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <div>Priority: {f.priority ?? '-'}</div>
                                <div className="mt-2">Created: {f.created_at ? new Date(f.created_at).toLocaleDateString() : '-'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-muted-foreground">(Farmer list UI goes here)</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => config.setIsViewModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
};

export default Blocks;
