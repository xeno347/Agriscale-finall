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
	activities: PlannerActivity[];
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================
// CONSTANTS - ACTIVITIES LIST (hardcoded; every plan is Napier)
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
	availableActivities: Activity[];
	onSave: (planner: MasterPlanner) => void;
	embedded?: boolean;
	onClose?: () => void;
}

const CreateMasterPlanner = ({ planners, availableActivities, onSave, embedded = false, onClose }: CreateMasterPlannerProps) => {
	const navigate = useNavigate();
	const { id } = useParams();

	const existingPlanner = id ? planners.find((p) => p.id === id) : null;

	const [plannerName, setPlannerName] = useState(existingPlanner?.name || '');
	const [activities, setActivities] = useState<PlannerActivity[]>(
		existingPlanner?.activities || []
	);

	const applySuggestedPlannerName = () => {
		setPlannerName('Napier Cultivation Master Plan');
	};

	const addActivity = () => {
		const newActivity: PlannerActivity = {
			id: `activity-${Date.now()}`,
			sno: activities.length + 1,
			activityId: availableActivities[0]?.id || '',
			dayOffset: 0,
			frequency: 'once',
			workQty: 1,
		};
		setActivities([...activities, newActivity]);
	};

	const loadAllActivities = () => {
		if (availableActivities.length === 0) {
			toast.error('No activities available');
			return;
		}

		setActivities(availableActivities.map((activity, index) => ({
			id: `planner-${activity.id}-${Date.now()}-${index}`,
			sno: index + 1,
			activityId: activity.id,
			dayOffset: index,
			frequency: 'once',
			workQty: 1,
		})));
		toast.success(`${availableActivities.length} activities loaded`);
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
		if (activities.length === 0) {
			toast.error('Please add at least one activity');
			return;
		}

		// Prepare API payload
		const payload = {
			plan_name: plannerName,
			crop_type: 'napier',
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
			activities,
			createdAt: existingPlanner?.createdAt || new Date(),
			updatedAt: new Date(),
		};

		onSave(planner);
		toast.success(existingPlanner ? 'Planner updated successfully!' : 'Planner created successfully!');
		if (embedded) {
			onClose?.();
		} else {
			navigate('/cultivation-master');
		}
	};

	const getActivity = (activityId: string) => {
		return availableActivities.find((a) => a.id === activityId);
	};

	const getActivityLabel = (activityId: string) => {
		const activity = getActivity(activityId);
		return activity ? `${activity.name} (${activity.category})` : '';
	};

	return (
		<div className={embedded ? '' : 'min-h-screen bg-background'}>
			<div className={embedded ? '' : 'container mx-auto px-4 py-8'}>
				{!embedded && (
					<Button variant="ghost" onClick={() => navigate('/cultivation-master')} className="mb-6 gap-2">
						<ArrowLeft className="h-4 w-4" />
						Back to Planners
					</Button>
				)}

				<Card className={cn('rounded-2xl bg-white', embedded ? 'border-0 shadow-none' : 'border border-slate-200 shadow-sm')}>
					{!embedded && (
						<CardHeader className="px-6 pt-6 md:px-8 md:pt-8">
							<CardTitle className="text-2xl font-bold text-[#0D3A35] md:text-3xl">
								{existingPlanner ? 'Edit Master Planner' : 'Create New Master Planner'}
							</CardTitle>
						</CardHeader>
					)}
					<CardContent className={cn(embedded ? 'space-y-5 p-0' : 'space-y-7 px-6 pb-6 md:px-8 md:pb-8')}>
						<div className={cn('rounded-xl bg-white', embedded ? 'p-0' : 'p-5 md:p-6')}>
							<div className="mb-3 flex justify-end">
								<Button type="button" variant="outline" size="sm" className="h-8 border-[#0D3A35]/20 text-[#0D3A35] hover:bg-[#0D3A35]/5" onClick={applySuggestedPlannerName}>
									Use Smart Name
								</Button>
							</div>
							<div className="grid grid-cols-1 gap-4">
								<div className="space-y-1.5">
									<label className="flex items-center gap-2 text-sm font-bold text-[#0D3A35]">
										<Calendar className="h-4 w-4" />
										Planner Name
									</label>
									<Input
										placeholder="e.g., Napier Cultivation Master Plan"
										value={plannerName}
										onChange={(e) => setPlannerName(e.target.value)}
										className="h-10 rounded-xl border-slate-200 bg-white text-sm"
									/>
									<p className="text-xs font-medium text-emerald-900/60">
										{plannerName.trim() ? `${plannerName.trim().length} characters` : 'Give this planner a clear, season-ready name'}
									</p>
								</div>
								<div className="flex items-center gap-2 rounded-lg border border-[#0D3A35]/15 bg-[#0D3A35]/5 px-3 py-2 text-sm font-semibold text-[#0D3A35]">
									<Sprout className="h-4 w-4" />
									Crop: Napier
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-xl font-bold text-[#0D3A35]">Activities</h3>
								<Button onClick={addActivity} className="h-10 gap-2 rounded-xl bg-[#0D3A35] px-5 font-bold hover:bg-[#092b27]">
									<Plus className="h-4 w-4" />
									Add Activity
								</Button>
							</div>

							{activities.length === 0 ? (
								<div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
									<p className="mb-4 text-base font-medium text-emerald-900/60">No activities loaded yet</p>
									<Button onClick={loadAllActivities} variant="outline" className="h-10 gap-2 rounded-xl border-slate-200 px-5 font-bold text-[#0D3A35] hover:bg-[#0D3A35]/5">
										<Plus className="h-4 w-4" />
										Load Activities
									</Button>
								</div>
							) : (
								<div className="overflow-hidden rounded-2xl border border-slate-200">
									<Table>
										<TableHeader>
											<TableRow className="bg-[#0D3A35] hover:bg-[#0D3A35]">
												<TableHead className="w-16 text-white/80">S.No</TableHead>
												<TableHead className="min-w-[250px] text-white">Activity</TableHead>
												<TableHead className="w-32 text-white">Day Offset</TableHead>
												<TableHead className="w-32 text-white">Work Qty</TableHead>
												<TableHead className="w-48 text-white">Frequency</TableHead>
												<TableHead className="w-32 text-white">Every N Days</TableHead>
												<TableHead className="w-16 text-white"></TableHead>
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
																{availableActivities.map((act) => (
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
															className="w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
														/>
													</TableCell>
													<TableCell>
														<Input
															type="number"
															min={0.1}
															step={0.1}
															value={activity.workQty}
															onChange={(e) => updateActivity(activity.id, 'workQty', parseFloat(e.target.value) || 1)}
															className="w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
																className="w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

						<div className="flex justify-end border-t border-slate-200 pt-4">
							<Button onClick={handleSave} size="lg" className="h-11 gap-2 rounded-xl bg-[#0D3A35] px-8 font-bold hover:bg-[#092b27]">
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
	activities: Activity[];
	onDelete: (id: string) => void;
	onSavePlanner: (planner: MasterPlanner) => void;
}

const PlannerList = ({ planners, activities, onDelete, onSavePlanner }: PlannerListProps) => {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
					<div>
						<h1 className="text-3xl font-bold text-foreground">Operations Master</h1>
						<p className="text-muted-foreground mt-1">
							Create and manage Napier cultivation master plans
						</p>
					</div>
				</div>

				<section className="rounded-xl border bg-card p-5 shadow-sm">
					<div className="mb-5">
						<div>
							<h2 className="text-xl font-semibold text-foreground">Create Cultivation Plan</h2>
							<p className="text-sm text-muted-foreground">Create and manage week-wise cultivation planners using the existing plan workflow.</p>
						</div>
					</div>
					<div className="mb-6">
						<CreateMasterPlanner
							embedded
							planners={planners}
							availableActivities={activities}
							onSave={onSavePlanner}
						/>
					</div>
					{planners.length === 0 ? (
						<div className="rounded-lg border border-dashed py-14 text-center">
							<Calendar className="mx-auto mb-4 h-14 w-14 text-muted-foreground/50" />
							<h3 className="mb-2 text-lg font-medium text-foreground">No Planners Yet</h3>
							<p className="mb-6 text-muted-foreground">Create your first master planner to schedule farm activities</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{planners.map((planner) => {
								const maxDayOffset = planner.activities.length
									? Math.max(...planner.activities.map((a) => a.dayOffset))
									: 0;

								return (
									<Card key={planner.id} className="overflow-hidden rounded-xl border border-[#0D3A35]/15 bg-white shadow-sm transition-shadow hover:shadow-md">
										<div className="h-1.5 bg-[#0D3A35]" />
										<CardHeader className="space-y-2 px-4 pb-2 pt-4">
											<div className="flex items-start justify-between gap-3">
												<div className="flex min-w-0 items-start gap-2">
													<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0D3A35]/10 text-[#0D3A35]">
														<Calendar className="h-4 w-4" />
													</div>
													<div className="min-w-0">
														<CardTitle className="line-clamp-2 text-lg font-extrabold leading-tight text-[#0D3A35]">
															{planner.name}
														</CardTitle>
														<CardDescription className="mt-1 text-xs font-semibold text-[#0D3A35]/60">
															{planner.activities.length} activities • Updated {format(planner.updatedAt, 'MMM d, yyyy')}
														</CardDescription>
													</div>
												</div>
												<span className="shrink-0 rounded-full bg-[#0D3A35]/10 px-2.5 py-1 text-xs font-bold text-[#0D3A35]">
													Napier
												</span>
											</div>
										</CardHeader>
										<CardContent className="px-4 pb-4">
											<div className="space-y-3">
												<div className="grid grid-cols-2 gap-2 text-sm">
													<div className="rounded-lg bg-[#0D3A35]/5 px-3 py-2">
														<p className="text-xs font-semibold text-[#0D3A35]/55">Day Range</p>
														<p className="font-bold text-[#0D3A35]">0 - {maxDayOffset} days</p>
													</div>
													<div className="rounded-lg bg-[#0D3A35]/5 px-3 py-2">
														<p className="text-xs font-semibold text-[#0D3A35]/55">Plan Steps</p>
														<p className="font-bold text-[#0D3A35]">{planner.activities.length}</p>
													</div>
												</div>
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														className="h-9 flex-1 gap-1 rounded-lg border-[#0D3A35]/15 font-bold text-[#0D3A35] hover:bg-[#0D3A35]/5"
														onClick={() => navigate(`/cultivation-master/edit/${planner.id}`)}
													>
														<Edit className="h-3.5 w-3.5" />
														Edit
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => onDelete(planner.id)}
														className="h-9 rounded-lg border-red-100 px-3 text-destructive hover:bg-red-50 hover:text-destructive"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</section>
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
		const fetchAll = async () => {
			setLoading(true);
			const baseUrl = getBaseUrl();

			try {
				const response = await fetch(`${baseUrl}/admin_cultivation/get_master_cultivation_plans`);
				if (!response.ok) throw new Error('Failed to fetch plans');
				const data = await response.json();
				// Convert API response to MasterPlanner[]
				const plans: MasterPlanner[] = Object.entries(data.plan || {}).map(([id, plan]: any) => ({
					id,
					name: plan.plan_name,
					activities: (plan.plan_list || []).map((item: any) => {
						// Find activityId by name
						const act = ACTIVITIES.find((a) => a.name === item.activity);
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
		fetchAll();
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
		return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
	}

	return (
		<Routes>
			<Route
				path="/"
				element={
					<PlannerList
						planners={planners}
						activities={ACTIVITIES}
						onDelete={handleDelete}
						onSavePlanner={handleSave}
					/>
				}
			/>
			<Route path="/create" element={<CreateMasterPlanner planners={planners} availableActivities={ACTIVITIES} onSave={handleSave} />} />
			<Route path="/edit/:id" element={<CreateMasterPlanner planners={planners} availableActivities={ACTIVITIES} onSave={handleSave} />} />
		</Routes>
	);
};

export default CultivationMasterModule;
