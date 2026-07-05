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
	ListPlus,
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import getBaseUrl from '@/lib/config';
import activitiesData from '@/config/activities.json';

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
	cropType?: 'Paddy' | 'Rahar' | 'Napier';
	activities: PlannerActivity[];
	createdAt: Date;
	updatedAt: Date;
}

const CROP_TYPE_API_MAP: Record<'Paddy' | 'Rahar' | 'Napier', 'paddy' | 'rahar' | 'napier'> = {
	Paddy: 'paddy',
	Rahar: 'rahar',
	Napier: 'napier',
};

// ============================================================
// CONSTANTS - ACTIVITIES LIST
// ============================================================

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
	'Land Preparation',
	'Crop Care',
	'Irrigation',
	'Plantation',
	'Other',
];

// Base activities always come fresh from activities.json. Per-browser customizations
// (edits/deletions of base entries, plus fully custom additions) are layered on top via
// localStorage, so updates to activities.json keep showing up for everyone.
const ACTIVITY_EDITS_STORAGE_KEY = 'cultivation-master-activity-edits';
const ACTIVITY_DELETED_STORAGE_KEY = 'cultivation-master-activity-deleted-ids';
const ACTIVITY_ADDITIONS_STORAGE_KEY = 'cultivation-master-activity-additions';

function loadFromStorage<T>(key: string, fallback: T): T {
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : fallback;
	} catch {
		return fallback;
	}
}

function saveToStorage<T>(key: string, value: T) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// ignore storage failures (e.g. private browsing quota)
	}
}

export const ACTIVITIES: Activity[] = activitiesData as Activity[];

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
	availableActivities: Activity[];
	onSave: (planner: MasterPlanner) => void;
}

const CreateMasterPlanner = ({ planners, availableActivities, onSave }: CreateMasterPlannerProps) => {
	const navigate = useNavigate();
	const { id } = useParams();

	const existingPlanner = id ? planners.find((p) => p.id === id) : null;

	const [plannerName, setPlannerName] = useState(existingPlanner?.name || '');
	const [cropType, setCropType] = useState<'Paddy' | 'Rahar' | 'Napier' | ''>(existingPlanner?.cropType || '');
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
			activityId: availableActivities[0]?.id || '',
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
		return availableActivities.find((a) => a.id === activityId);
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
									<Select value={cropType || 'none'} onValueChange={(value) => setCropType(value === 'none' ? '' : value as 'Paddy' | 'Rahar' | 'Napier')}>
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
											<SelectItem value="Rahar">
												<div className="flex items-center gap-2">
													<Flower2 className="h-4 w-4 text-amber-600" />
													<span>Rahar</span>
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
	activities: Activity[];
	onDelete: (id: string) => void;
	onSaveActivity: (activity: Activity) => void;
	onDeleteActivity: (id: string) => void;
}

const PlannerList = ({ planners, activities, onDelete, onSaveActivity, onDeleteActivity }: PlannerListProps) => {
	const navigate = useNavigate();

	const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
	const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
	const [newActivityName, setNewActivityName] = useState('');
	const [newActivityCategory, setNewActivityCategory] = useState<ActivityCategory>('Other');
	const [newActivityIcon, setNewActivityIcon] = useState<string>('Sprout');

	const resetNewActivityForm = () => {
		setEditingActivityId(null);
		setNewActivityName('');
		setNewActivityCategory('Other');
		setNewActivityIcon('Sprout');
	};

	const startEditActivity = (activity: Activity) => {
		setEditingActivityId(activity.id);
		setNewActivityName(activity.name);
		setNewActivityCategory(activity.category);
		setNewActivityIcon(activity.icon);
	};

	const handleAddActivitySubmit = () => {
		if (!newActivityName.trim()) {
			toast.error('Please enter an activity name');
			return;
		}

		const activity: Activity = {
			id: editingActivityId || `custom-${newActivityName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
			name: newActivityName.trim(),
			category: newActivityCategory,
			icon: newActivityIcon,
		};

		onSaveActivity(activity);
		toast.success(editingActivityId ? 'Activity updated' : 'Activity type added');
		resetNewActivityForm();
	};

	const handleDeleteActivityClick = (id: string) => {
		onDeleteActivity(id);
		if (editingActivityId === id) resetNewActivityForm();
		toast.success('Activity deleted');
	};

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
					<div className="flex gap-3">
						<Button variant="outline" onClick={() => setIsAddActivityOpen(true)} className="gap-2">
							<ListPlus className="h-4 w-4" />
							Add Activity Type
						</Button>
						<Button onClick={() => navigate('/cultivation-master/create')} className="gap-2">
							<Plus className="h-4 w-4" />
							Create New Planner
						</Button>
					</div>
				</div>

				<Dialog
					open={isAddActivityOpen}
					onOpenChange={(open) => {
						setIsAddActivityOpen(open);
						if (!open) resetNewActivityForm();
					}}
				>
					<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Activity Types</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-2">
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">Existing Activities</label>
								<div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
									{activities.length === 0 ? (
										<div className="p-3 text-sm text-muted-foreground italic">No activities yet.</div>
									) : (
										activities.map((activity) => (
											<div key={activity.id} className="flex items-center justify-between gap-2 p-2.5">
												<div className="flex items-center gap-2 min-w-0">
													<ActivityIcon iconName={activity.icon} className="text-primary shrink-0" />
													<div className="min-w-0">
														<div className="text-sm font-medium text-foreground truncate">{activity.name}</div>
														<div className="text-xs text-muted-foreground">{activity.category}</div>
													</div>
												</div>
												<div className="flex items-center gap-1 shrink-0">
													<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditActivity(activity)}>
														<Edit className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 text-destructive hover:text-destructive"
														onClick={() => handleDeleteActivityClick(activity.id)}
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											</div>
										))
									)}
								</div>
							</div>

							<div className="space-y-4 border-t pt-4">
								<label className="text-sm font-medium text-foreground">
									{editingActivityId ? 'Edit Activity' : 'Add New Activity'}
								</label>
								<div className="space-y-2">
									<Input
										placeholder="e.g., Pest Scouting"
										value={newActivityName}
										onChange={(e) => setNewActivityName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Select
										value={newActivityCategory}
										onValueChange={(value) => setNewActivityCategory(value as ActivityCategory)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{ACTIVITY_CATEGORIES.map((category) => (
												<SelectItem key={category} value={category}>
													{category}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Select value={newActivityIcon} onValueChange={setNewActivityIcon}>
										<SelectTrigger>
											<div className="flex items-center gap-2">
												<ActivityIcon iconName={newActivityIcon} className="text-primary" />
												<span>{newActivityIcon}</span>
											</div>
										</SelectTrigger>
										<SelectContent>
											{Object.keys(iconMap).map((iconName) => (
												<SelectItem key={iconName} value={iconName}>
													<div className="flex items-center gap-2">
														<ActivityIcon iconName={iconName} className="text-primary" />
														<span>{iconName}</span>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								{editingActivityId && (
									<Button variant="outline" size="sm" onClick={resetNewActivityForm}>
										Cancel Edit
									</Button>
								)}
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setIsAddActivityOpen(false)}>
								Close
							</Button>
							<Button onClick={handleAddActivitySubmit}>{editingActivityId ? 'Save Changes' : 'Add Activity'}</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

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

	// Base list is always the current activities.json. Customizations layer on top.
	const [activityEdits, setActivityEdits] = useState<Record<string, Activity>>(() =>
		loadFromStorage(ACTIVITY_EDITS_STORAGE_KEY, {} as Record<string, Activity>)
	);
	const [deletedActivityIds, setDeletedActivityIds] = useState<string[]>(() =>
		loadFromStorage(ACTIVITY_DELETED_STORAGE_KEY, [] as string[])
	);
	const [activityAdditions, setActivityAdditions] = useState<Activity[]>(() =>
		loadFromStorage(ACTIVITY_ADDITIONS_STORAGE_KEY, [] as Activity[])
	);

	const availableActivities: Activity[] = [
		...ACTIVITIES
			.filter((activity) => !deletedActivityIds.includes(activity.id))
			.map((activity) => activityEdits[activity.id] || activity),
		...activityAdditions,
	];

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
						const act = availableActivities.find(a => a.name === item.activity);
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

	const isBaseActivityId = (id: string) => ACTIVITIES.some((a) => a.id === id);

	const handleSaveActivity = (activity: Activity) => {
		if (isBaseActivityId(activity.id)) {
			setActivityEdits((prev) => {
				const next = { ...prev, [activity.id]: activity };
				saveToStorage(ACTIVITY_EDITS_STORAGE_KEY, next);
				return next;
			});
			return;
		}

		setActivityAdditions((prev) => {
			const exists = prev.some((a) => a.id === activity.id);
			const next = exists ? prev.map((a) => (a.id === activity.id ? activity : a)) : [...prev, activity];
			saveToStorage(ACTIVITY_ADDITIONS_STORAGE_KEY, next);
			return next;
		});
	};

	const handleDeleteActivity = (id: string) => {
		if (isBaseActivityId(id)) {
			setDeletedActivityIds((prev) => {
				const next = prev.includes(id) ? prev : [...prev, id];
				saveToStorage(ACTIVITY_DELETED_STORAGE_KEY, next);
				return next;
			});
			setActivityEdits((prev) => {
				if (!(id in prev)) return prev;
				const next = { ...prev };
				delete next[id];
				saveToStorage(ACTIVITY_EDITS_STORAGE_KEY, next);
				return next;
			});
			return;
		}

		setActivityAdditions((prev) => {
			const next = prev.filter((a) => a.id !== id);
			saveToStorage(ACTIVITY_ADDITIONS_STORAGE_KEY, next);
			return next;
		});
	};

	if (loading) {
		return <div className="p-8 text-center text-muted-foreground">Loading plans...</div>;
	}

	return (
		<Routes>
			<Route
				path="/"
				element={
					<PlannerList
						planners={planners}
						activities={availableActivities}
						onDelete={handleDelete}
						onSaveActivity={handleSaveActivity}
						onDeleteActivity={handleDeleteActivity}
					/>
				}
			/>
			<Route path="/create" element={<CreateMasterPlanner planners={planners} availableActivities={availableActivities} onSave={handleSave} />} />
			<Route path="/edit/:id" element={<CreateMasterPlanner planners={planners} availableActivities={availableActivities} onSave={handleSave} />} />
		</Routes>
	);
};

export default CultivationMasterModule;
