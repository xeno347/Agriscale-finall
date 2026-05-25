// ============================================================
// CULTIVATION MASTER MODULE - SINGLE FILE EXPORT
// ============================================================
// This file contains everything needed for the Cultivation Master module.
// Copy this entire file and adjust imports based on your project structure.
// 
// Required dependencies:
// - react-router-dom
// - lucide-react
// - date-fns
// - sonner (for toast notifications)
// - shadcn/ui components: Button, Card, Input, Select, Table
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
	Plus,
	Calendar,
	Edit,
	Trash2,
	Eye,
	ArrowLeft,
	Save,
	Rows3,
	Rows4,
	Footprints,
	Scissors,
	Tractor,
	Flower2,
	Droplets,
	Layers,
	Shovel,
	Hammer,
	Sprout,
	HelpCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import getBaseUrl from '@/lib/config';

// ============================================================
// TYPES
// ============================================================

export type ActivityCategory =
	| 'Land Preparation'
	| 'Crop Care'
	| 'Irrigation'
	| 'Plantation'
	| 'Other';

export interface Activity {
	id: string;
	name: string;
	category: ActivityCategory;
	icon: string;
}

export type FrequencyType = 'once' | 'every_n_days' | 'weekly';

export interface PlannerActivity {
	id: string;
	sno: number;
	activityId: string;
	dayOffset: number;
	frequency: FrequencyType;
	frequencyValue?: number;
	workQty: number;
}

export interface MasterPlanner {
	id: string;
	name: string;
	cropType?: 'Paddy' | 'Ragi' | 'Napier';
	activities: PlannerActivity[];
	createdAt: Date;
	updatedAt: Date;
}

const CROP_TYPE_API_MAP: Record<'Paddy' | 'Ragi' | 'Napier', 'paddy' | 'ragi' | 'napier'> = {
	Paddy: 'paddy',
	Ragi: 'ragi',
	Napier: 'napier',
};

// ============================================================
// CONSTANTS - ACTIVITIES LIST
// ============================================================

export const ACTIVITIES: Activity[] = [
	{ id: 'bed-making-land', name: 'Bed Making', category: 'Land Preparation', icon: 'Rows3' },
	{ id: 'bed-making-other', name: 'Bed Making', category: 'Other', icon: 'Rows4' },
	{ id: 'field-visits', name: 'Field Visits', category: 'Crop Care', icon: 'Footprints' },
	{ id: 'harvesting', name: 'Harvesting', category: 'Other', icon: 'Scissors' },
	{ id: 'initial-ploughing', name: 'Initial Ploughing', category: 'Land Preparation', icon: 'Tractor' },
	{ id: 'interweeding-fertilization', name: 'Interweeding + Fertilization', category: 'Crop Care', icon: 'Flower2' },
	{ id: 'irrigation', name: 'Irrigation', category: 'Irrigation', icon: 'Droplets' },
	{ id: 'mulching', name: 'Mulching', category: 'Crop Care', icon: 'Layers' },
	{ id: 'ploughing', name: 'Ploughing', category: 'Plantation', icon: 'Shovel' },
	{ id: 'soil-pulverization', name: 'Soil Pulverization', category: 'Land Preparation', icon: 'Hammer' },
	{ id: 'sowing', name: 'Sowing', category: 'Plantation', icon: 'Sprout' },
];

// ============================================================
// DEMO DATA
// ============================================================

export const demoMasterPlanners: MasterPlanner[] = [
	{
		id: 'planner-1',
		name: 'Tomato Cultivation Plan',
		activities: [
			{ id: 'a1', sno: 1, activityId: 'initial-ploughing', dayOffset: 0, frequency: 'once', workQty: 5 },
			{ id: 'a2', sno: 2, activityId: 'soil-pulverization', dayOffset: 3, frequency: 'once', workQty: 5 },
			{ id: 'a3', sno: 3, activityId: 'bed-making-land', dayOffset: 5, frequency: 'once', workQty: 5 },
			{ id: 'a4', sno: 4, activityId: 'sowing', dayOffset: 7, frequency: 'once', workQty: 5 },
			{ id: 'a5', sno: 5, activityId: 'irrigation', dayOffset: 7, frequency: 'every_n_days', frequencyValue: 3, workQty: 5 },
			{ id: 'a6', sno: 6, activityId: 'field-visits', dayOffset: 14, frequency: 'weekly', workQty: 5 },
			{ id: 'a7', sno: 7, activityId: 'interweeding-fertilization', dayOffset: 21, frequency: 'every_n_days', frequencyValue: 14, workQty: 3 },
			{ id: 'a8', sno: 8, activityId: 'mulching', dayOffset: 30, frequency: 'once', workQty: 5 },
			{ id: 'a9', sno: 9, activityId: 'harvesting', dayOffset: 90, frequency: 'every_n_days', frequencyValue: 7, workQty: 2 },
		],
		createdAt: new Date('2024-12-01'),
		updatedAt: new Date('2024-12-15'),
	},
	{
		id: 'planner-2',
		name: 'Rice Paddy Schedule',
		activities: [
			{ id: 'b1', sno: 1, activityId: 'ploughing', dayOffset: 0, frequency: 'once', workQty: 10 },
			{ id: 'b2', sno: 2, activityId: 'bed-making-land', dayOffset: 5, frequency: 'once', workQty: 10 },
			{ id: 'b3', sno: 3, activityId: 'sowing', dayOffset: 10, frequency: 'once', workQty: 10 },
			{ id: 'b4', sno: 4, activityId: 'irrigation', dayOffset: 10, frequency: 'every_n_days', frequencyValue: 2, workQty: 10 },
			{ id: 'b5', sno: 5, activityId: 'harvesting', dayOffset: 100, frequency: 'once', workQty: 10 },
		],
		createdAt: new Date('2024-11-20'),
		updatedAt: new Date('2024-11-25'),
	},
];

// ============================================================
// ACTIVITY ICON COMPONENT
// ============================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
	Rows3,
	Rows4,
	Footprints,
	Scissors,
	Tractor,
	Flower2,
	Droplets,
	Layers,
	Shovel,
	Hammer,
	Sprout,
};

interface ActivityIconProps {
	iconName: string;
	className?: string;
}

const ActivityIcon = ({ iconName, className }: ActivityIconProps) => {
	const IconComponent = iconMap[iconName] || HelpCircle;
	return <IconComponent className={cn('h-4 w-4', className)} />;
};

// ============================================================
// CREATE/EDIT MASTER PLANNER PAGE
// ============================================================

interface CreateMasterPlannerProps {
	planners: MasterPlanner[];
	onSave: (planner: MasterPlanner) => void;
}

const CreateMasterPlanner = ({ planners, onSave }: CreateMasterPlannerProps) => {
	const navigate = useNavigate();
	const { id } = useParams();

	const existingPlanner = id ? planners.find((p) => p.id === id) : null;

	const [plannerName, setPlannerName] = useState(existingPlanner?.name || '');
	const [cropType, setCropType] = useState<'Paddy' | 'Ragi' | 'Napier' | ''>(existingPlanner?.cropType || '');
	const [activities, setActivities] = useState<PlannerActivity[]>(
		existingPlanner?.activities || []
	);

	const applySuggestedPlannerName = () => {
		if (!cropType) return;
		setPlannerName(`${cropType} Cultivation Master Plan`);
	};

	const addActivity = () => {
		const newActivity: PlannerActivity = {
			id: `activity-${Date.now()}`,
			sno: activities.length + 1,
			activityId: ACTIVITIES[0].id,
			dayOffset: 0,
			frequency: 'once',
			workQty: 1,
		};
		setActivities([...activities, newActivity]);
	};

	const removeActivity = (activityId: string) => {
		const updated = activities
			.filter((a) => a.id !== activityId)
			.map((a, idx) => ({ ...a, sno: idx + 1 }));
		setActivities(updated);
	};

	const updateActivity = (activityId: string, field: keyof PlannerActivity, value: any) => {
		setActivities(activities.map((a) => (a.id === activityId ? { ...a, [field]: value } : a)));
	};


	const handleSave = async () => {
		if (!plannerName.trim()) {
			toast.error('Please enter a planner name');
			return;
		}
		if (!cropType) {
			toast.error('Please select a crop type');
			return;
		}
		if (activities.length === 0) {
			toast.error('Please add at least one activity');
			return;
		}

		// Prepare API payload
		const payload = {
			plan_name: plannerName,
			crop_type: CROP_TYPE_API_MAP[cropType],
			plan_list: activities.map((a, idx) => ({
				index: idx + 1,
				activity: getActivity(a.activityId)?.name || a.activityId,
				day_offset: a.dayOffset,
				work_quantity: a.workQty,
				frequency: a.frequency === 'every_n_days' ? 'daily' : a.frequency, // Map to 'daily' if needed
				every_n_days: a.frequency === 'every_n_days' ? (a.frequencyValue || 0) : 0
			}))
		};

		try {
			const baseUrl = getBaseUrl();
			const response = await fetch(`${baseUrl}/admin_cultivation/save_master_cultivation_plan`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				throw new Error('Failed to save plan');
			}
			toast.success('Plan saved to server!');
		} catch (err) {
			toast.error('Failed to save plan to server');
			return;
		}

		const planner: MasterPlanner = {
			id: existingPlanner?.id || `planner-${Date.now()}`,
			name: plannerName,
			cropType,
			activities,
			createdAt: existingPlanner?.createdAt || new Date(),
			updatedAt: new Date(),
		};

		onSave(planner);
		toast.success(existingPlanner ? 'Planner updated successfully!' : 'Planner created successfully!');
		navigate('/cultivation-master');
	};

	const getActivity = (activityId: string) => {
		return ACTIVITIES.find((a) => a.id === activityId);
	};

	const getActivityLabel = (activityId: string) => {
		const activity = getActivity(activityId);
		return activity ? `${activity.name} (${activity.category})` : '';
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<Button variant="ghost" onClick={() => navigate('/cultivation-master')} className="mb-6 gap-2">
					<ArrowLeft className="h-4 w-4" />
					Back to Planners
				</Button>

				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">
							{existingPlanner ? 'Edit Master Planner' : 'Create New Master Planner'}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-lime-50/40 p-4 md:p-5">
							<div className="mb-3 flex items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Planner Basics</p>
								{cropType && (
									<Button type="button" variant="outline" size="sm" className="h-8 border-emerald-200 text-emerald-700" onClick={applySuggestedPlannerName}>
										Use Smart Name
									</Button>
								)}
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<label className="text-sm font-medium text-foreground flex items-center gap-2">
										<Calendar className="h-4 w-4 text-emerald-700" />
										Planner Name
									</label>
									<Input
										placeholder="e.g., Kharif Paddy Plan - East Block"
										value={plannerName}
										onChange={(e) => setPlannerName(e.target.value)}
									/>
									<p className="text-xs text-muted-foreground">
										{plannerName.trim() ? `${plannerName.trim().length} characters` : 'Give this planner a clear, season-ready name'}
									</p>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium text-foreground flex items-center gap-2">
										<Sprout className="h-4 w-4 text-emerald-700" />
										Crop Type
									</label>
									<Select value={cropType || 'none'} onValueChange={(value) => setCropType(value === 'none' ? '' : value as 'Paddy' | 'Ragi' | 'Napier')}>
										<SelectTrigger>
											<SelectValue placeholder="Select crop type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Select crop type</SelectItem>
											<SelectItem value="Paddy">
												<div className="flex items-center gap-2">
													<Droplets className="h-4 w-4 text-sky-600" />
													<span>Paddy</span>
												</div>
											</SelectItem>
											<SelectItem value="Ragi">
												<div className="flex items-center gap-2">
													<Flower2 className="h-4 w-4 text-amber-600" />
													<span>Ragi</span>
												</div>
											</SelectItem>
											<SelectItem value="Napier">
												<div className="flex items-center gap-2">
													<Layers className="h-4 w-4 text-lime-700" />
													<span>Napier</span>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										{cropType ? `Selected crop: ${cropType}` : 'Choose crop to tailor this master planner'}
									</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<h3 className="text-lg font-medium text-foreground">Activities</h3>
								<Button onClick={addActivity} size="sm" className="gap-2">
									<Plus className="h-4 w-4" />
									Add Activity
								</Button>
							</div>

							{activities.length === 0 ? (
								<div className="border border-dashed rounded-lg p-8 text-center">
									<p className="text-muted-foreground mb-4">No activities added yet</p>
									<Button onClick={addActivity} variant="outline" className="gap-2">
										<Plus className="h-4 w-4" />
										Add First Activity
									</Button>
								</div>
							) : (
								<div className="border rounded-lg overflow-hidden overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/50">
												<TableHead className="w-16">S.No</TableHead>
												<TableHead className="min-w-[250px]">Activity</TableHead>
												<TableHead className="w-32">Day Offset</TableHead>
												<TableHead className="w-32">Work Qty (Acres)</TableHead>
												<TableHead className="w-48">Frequency</TableHead>
												<TableHead className="w-32">Every N Days</TableHead>
												<TableHead className="w-16"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{activities.map((activity) => (
												<TableRow key={activity.id}>
													<TableCell className="font-medium">{activity.sno}</TableCell>
													<TableCell>
														<Select
															value={activity.activityId}
															onValueChange={(value) => updateActivity(activity.id, 'activityId', value)}
														>
															<SelectTrigger>
																<div className="flex items-center gap-2">
																	<ActivityIcon iconName={getActivity(activity.activityId)?.icon || ''} className="text-primary" />
																	<span>{getActivityLabel(activity.activityId)}</span>
																</div>
															</SelectTrigger>
															<SelectContent>
																{ACTIVITIES.map((act) => (
																	<SelectItem key={act.id} value={act.id}>
																		<div className="flex items-center gap-2">
																			<ActivityIcon iconName={act.icon} className="text-primary" />
																			<span>{act.name} ({act.category})</span>
																		</div>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<Input
															type="number"
															min={0}
															max={100}
															value={activity.dayOffset}
															onChange={(e) => updateActivity(activity.id, 'dayOffset', parseInt(e.target.value) || 0)}
															className="w-24"
														/>
													</TableCell>
													<TableCell>
														<Input
															type="number"
															min={0.1}
															step={0.1}
															value={activity.workQty}
															onChange={(e) => updateActivity(activity.id, 'workQty', parseFloat(e.target.value) || 1)}
															className="w-24"
														/>
													</TableCell>
													<TableCell>
														<Select
															value={activity.frequency}
															onValueChange={(value: FrequencyType) => updateActivity(activity.id, 'frequency', value)}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="once">Once</SelectItem>
																<SelectItem value="every_n_days">Every N Days</SelectItem>
																<SelectItem value="weekly">Weekly</SelectItem>
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														{activity.frequency === 'every_n_days' && (
															<Input
																type="number"
																min={1}
																value={activity.frequencyValue || 1}
																onChange={(e) => updateActivity(activity.id, 'frequencyValue', parseInt(e.target.value) || 1)}
																className="w-20"
															/>
														)}
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => removeActivity(activity.id)}
															className="text-destructive hover:text-destructive hover:bg-destructive/10"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</div>

						<div className="flex justify-end pt-4 border-t">
							<Button onClick={handleSave} size="lg" className="gap-2">
								<Save className="h-4 w-4" />
								Save Planner
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

// ============================================================
// PLANNER LIST PAGE
// ============================================================

interface PlannerListProps {
	planners: MasterPlanner[];
	onDelete: (id: string) => void;
}

const PlannerList = ({ planners, onDelete }: PlannerListProps) => {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
					<div>
						<h1 className="text-3xl font-bold text-foreground">Cultivation Master</h1>
						<p className="text-muted-foreground mt-1">
							Create and manage week-wise activity planners for your farm
						</p>
					</div>
					<Button onClick={() => navigate('/cultivation-master/create')} className="gap-2">
						<Plus className="h-4 w-4" />
						Create New Planner
					</Button>
				</div>

				{planners.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
							<h3 className="text-lg font-medium text-foreground mb-2">No Planners Yet</h3>
							<p className="text-muted-foreground text-center mb-6">
								Create your first master planner to schedule farm activities
							</p>
							<Button onClick={() => navigate('/cultivation-master/create')} className="gap-2">
								<Plus className="h-4 w-4" />
								Create New Planner
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{planners.map((planner) => (
							<Card key={planner.id} className="hover:shadow-lg transition-shadow">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-5 w-5 text-primary" />
										{planner.name}
									</CardTitle>
									<CardDescription>
										{planner.activities.length} activities • Last updated {format(planner.updatedAt, 'MMM d, yyyy')}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="text-sm text-muted-foreground">
											<p>Day range: 0 - {Math.max(...planner.activities.map((a) => a.dayOffset))} days</p>
										</div>
										<div className="flex gap-2 pt-2">
											<Button
												variant="outline"
												size="sm"
												className="flex-1 gap-1"
												onClick={() => navigate(`/cultivation-master/edit/${planner.id}`)}
											>
												<Eye className="h-3.5 w-3.5" />
												View
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="flex-1 gap-1"
												onClick={() => navigate(`/cultivation-master/edit/${planner.id}`)}
											>
												<Edit className="h-3.5 w-3.5" />
												Edit
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => onDelete(planner.id)}
												className="text-destructive hover:text-destructive"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

// ============================================================
// MAIN CULTIVATION MASTER MODULE COMPONENT
// ============================================================
// Use this as the main entry point. Add these routes to your router:
// <Route path="/cultivation-master/*" element={<CultivationMasterModule />} />
// ============================================================

const CultivationMasterModule = () => {
	const [planners, setPlanners] = useState<MasterPlanner[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchPlans = async () => {
			setLoading(true);
			try {
				const baseUrl = getBaseUrl();
				console.log('Fetching from baseUrl:', baseUrl);
				const response = await fetch(`${baseUrl}/admin_cultivation/get_master_cultivation_plans`);
				if (!response.ok) throw new Error('Failed to fetch plans');
				const data = await response.json();
				// Convert API response to MasterPlanner[]
				const plans: MasterPlanner[] = Object.entries(data.plan || {}).map(([id, plan]: any) => ({
					id,
					name: plan.plan_name,
					activities: (plan.plan_list || []).map((item: any, idx: number) => {
						// Find activityId by name
						const act = ACTIVITIES.find(a => a.name === item.activity);
						return {
							id: `${id}-a${item.index}`,
							sno: item.index,
							activityId: act ? act.id : item.activity,
							dayOffset: item.day_offset,
							frequency: item.frequency === 'daily' ? 'every_n_days' : item.frequency,
							frequencyValue: item.every_n_days || undefined,
							workQty: item.work_quantity,
						};
					}),
					createdAt: plan.created_at ? new Date(plan.created_at) : new Date(),
					updatedAt: plan.created_at ? new Date(plan.created_at) : new Date(),
				}));
				setPlanners(plans);
			} catch (err) {
				setPlanners([]);
			} finally {
				setLoading(false);
			}
		};
		fetchPlans();
	}, []);

	const handleDelete = (id: string) => {
		setPlanners(planners.filter((p) => p.id !== id));
	};

	const handleSave = (planner: MasterPlanner) => {
		const exists = planners.find((p) => p.id === planner.id);
		if (exists) {
			setPlanners(planners.map((p) => (p.id === planner.id ? planner : p)));
		} else {
			setPlanners([...planners, planner]);
		}
	};

	if (loading) {
		return <div className="p-8 text-center text-muted-foreground">Loading plans...</div>;
	}

	return (
		<Routes>
			<Route path="/" element={<PlannerList planners={planners} onDelete={handleDelete} />} />
			<Route path="/create" element={<CreateMasterPlanner planners={planners} onSave={handleSave} />} />
			<Route path="/edit/:id" element={<CreateMasterPlanner planners={planners} onSave={handleSave} />} />
		</Routes>
	);
};

export default CultivationMasterModule;
