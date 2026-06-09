import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';
import { Download, Save, Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─────────────────────────────────────────────────────────────
// Types & data
// ─────────────────────────────────────────────────────────────

type DayStatus = 'P' | 'A' | 'PL' | 'PH';

interface Employee {
	id: string;
	name: string;
	department: string;
	designation: string;
}

interface StatusMeta {
	key: DayStatus;
	label: string;
	tooltip: string;
	bg: string;
	thText: string;
	tdText: string;
}

const EMPLOYEES: Employee[] = [
	{ id: 'EMP001', name: 'Rajesh Kumar',  department: 'Field Operations', designation: 'Senior Field Officer'    },
	{ id: 'EMP002', name: 'Priya Singh',   department: 'Administration',   designation: 'HR Manager'              },
	{ id: 'EMP003', name: 'Amit Patel',    department: 'Operations',       designation: 'Operations Coordinator'  },
	{ id: 'EMP004', name: 'Neha Gupta',    department: 'Finance',          designation: 'Finance Officer'         },
	{ id: 'EMP005', name: 'Suresh Verma',  department: 'Field Operations', designation: 'Field Officer'           },
];

const STATUS: StatusMeta[] = [
	{ key: 'P',  label: 'P',  tooltip: 'Present',      bg: 'bg-emerald-500', thText: 'text-emerald-400', tdText: 'text-emerald-600' },
	{ key: 'A',  label: 'A',  tooltip: 'Absent',       bg: 'bg-red-500',     thText: 'text-red-400',     tdText: 'text-red-500'     },
	{ key: 'PL', label: 'PL', tooltip: 'Paid Leave',   bg: 'bg-blue-500',    thText: 'text-blue-400',    tdText: 'text-blue-500'    },
	{ key: 'PH', label: 'PH', tooltip: 'Paid Holiday', bg: 'bg-violet-500',  thText: 'text-violet-400',  tdText: 'text-violet-500'  },
];

const MONTHS = [
	'January','February','March','April','May','June',
	'July','August','September','October','November','December',
];
const YEARS = [2024, 2025, 2026, 2027];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

const AttendanceModule = () => {
	const today    = new Date();
	const todayStr = format(today, 'yyyy-MM-dd');

	const [month, setMonth] = useState(today.getMonth());
	const [year,  setYear]  = useState(today.getFullYear());
	const [map,   setMap]   = useState<Record<string, DayStatus | null>>({});

	const days = eachDayOfInterval({
		start: startOfMonth(new Date(year, month)),
		end:   endOfMonth(new Date(year, month)),
	});

	const getStatus = (empId: string, date: string): DayStatus | null =>
		map[`${empId}_${date}`] ?? null;

	const toggle = (empId: string, date: string, status: DayStatus) =>
		setMap(prev => ({
			...prev,
			[`${empId}_${date}`]: prev[`${empId}_${date}`] === status ? null : status,
		}));

	const rowTotals = (empId: string) => {
		const t = { P: 0, A: 0, PL: 0, PH: 0 };
		days.forEach(d => {
			const s = getStatus(empId, format(d, 'yyyy-MM-dd'));
			if (s) t[s]++;
		});
		return t;
	};

	const presentToday = EMPLOYEES.filter(e => getStatus(e.id, todayStr) === 'P').length;
	const absentToday  = EMPLOYEES.filter(e => getStatus(e.id, todayStr) === 'A').length;
	const markedToday  = EMPLOYEES.filter(e => getStatus(e.id, todayStr) !== null).length;
	const rate         = markedToday > 0 ? Math.round((presentToday / markedToday) * 100) : 0;

	const rowBg = (i: number) => i % 2 === 0 ? 'bg-white' : 'bg-slate-50';

	return (
		<div className="space-y-6">

			{/* ── Page header ── */}
			<div className="flex flex-col sm:flex-row justify-between items-start gap-3">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance Management</h1>
					<p className="text-gray-500 mt-1 text-sm">{format(today, 'EEEE, MMMM d, yyyy')}</p>
				</div>
				<div className="flex gap-2 shrink-0">
					<Button variant="outline" size="sm" className="gap-2">
						<Download className="w-4 h-4" />Export CSV
					</Button>
					<Button
						size="sm"
						className="gap-2 bg-emerald-600 hover:bg-emerald-700"
						onClick={() => toast.success('Attendance saved successfully!')}
					>
						<Save className="w-4 h-4" />Save Changes
					</Button>
				</div>
			</div>

			{/* ── Stats cards ── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{([
					{
						label: 'Total Staff', value: EMPLOYEES.length, sub: 'Registered employees',
						Icon: Users, bg: 'bg-slate-50', ring: 'bg-slate-200', iconCls: 'text-slate-600', valCls: 'text-slate-800', labelCls: 'text-slate-500',
					},
					{
						label: 'Present Today', value: presentToday, sub: `of ${EMPLOYEES.length} employees`,
						Icon: UserCheck, bg: 'bg-emerald-50', ring: 'bg-emerald-200', iconCls: 'text-emerald-700', valCls: 'text-emerald-700', labelCls: 'text-emerald-600',
					},
					{
						label: 'Absent Today', value: absentToday, sub: `of ${EMPLOYEES.length} employees`,
						Icon: UserX, bg: 'bg-red-50', ring: 'bg-red-200', iconCls: 'text-red-600', valCls: 'text-red-600', labelCls: 'text-red-500',
					},
					{
						label: 'Attendance Rate', value: `${rate}%`, sub: 'Of marked employees',
						Icon: TrendingUp, bg: 'bg-blue-50', ring: 'bg-blue-200', iconCls: 'text-blue-700', valCls: 'text-blue-700', labelCls: 'text-blue-600',
					},
				] as const).map(({ label, value, sub, Icon, bg, ring, iconCls, valCls, labelCls }) => (
					<Card key={label} className={cn('border-0 shadow-sm', bg)}>
						<CardContent className="pt-5 pb-4">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className={cn('text-[11px] font-semibold uppercase tracking-wide', labelCls)}>{label}</p>
									<p className={cn('text-3xl font-bold mt-1 leading-none', valCls)}>{value}</p>
									<p className="text-xs text-gray-400 mt-1.5">{sub}</p>
								</div>
								<div className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center', ring)}>
									<Icon className={cn('w-5 h-5', iconCls)} />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* ── Register card ── */}
			<Card className="shadow-sm overflow-hidden border">

				{/* Controls bar */}
				<div className="px-5 py-3.5 bg-gray-50 border-b flex flex-wrap items-center gap-4">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-600">Month</span>
						<Select value={month.toString()} onValueChange={v => setMonth(+v)}>
							<SelectTrigger className="w-36 h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
							<SelectContent>
								{MONTHS.map((m, i) => (
									<SelectItem key={m} value={i.toString()}>{m}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-600">Year</span>
						<Select value={year.toString()} onValueChange={v => setYear(+v)}>
							<SelectTrigger className="w-24 h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
							<SelectContent>
								{YEARS.map(y => (
									<SelectItem key={y} value={y.toString()}>{y}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="ml-auto flex flex-wrap items-center gap-3">
						{STATUS.map(s => (
							<span key={s.key} className="flex items-center gap-1.5 text-xs text-gray-500">
								<span className={cn('w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center', s.bg)}>
									{s.label}
								</span>
								{s.tooltip}
							</span>
						))}
					</div>
				</div>

				{/* Scrollable table */}
				<div className="overflow-x-auto">
					<table className="border-collapse text-sm" style={{ minWidth: 'max-content' }}>
						<thead>
							{/* ── Row 1: date numbers ── */}
							<tr>
								<th className="sticky left-0 z-30 bg-gray-900 border-r border-gray-700 w-10 py-3 text-gray-400 text-xs font-medium text-center">#</th>
								<th className="sticky left-[40px] z-30 bg-gray-900 border-r border-gray-700 w-[170px] py-3 px-3 text-left text-gray-100 text-xs font-semibold">Employee</th>
								<th className="sticky left-[210px] z-30 bg-gray-900 border-r border-gray-700 w-[120px] py-3 px-3 text-left text-gray-100 text-xs font-semibold">Department</th>
								<th className="sticky left-[330px] z-30 bg-gray-900 border-r-2 border-gray-600 w-[140px] py-3 px-3 text-left text-gray-100 text-xs font-semibold">Designation</th>

								{days.map(d => {
									const isWknd  = d.getDay() === 0 || d.getDay() === 6;
									const isTdy   = format(d, 'yyyy-MM-dd') === todayStr;
									return (
										<th key={d.toISOString()} colSpan={4}
											className={cn(
												'border-r-2 border-gray-700 py-2 text-center',
												isTdy  ? 'bg-emerald-700' :
												isWknd ? 'bg-amber-900/50' : 'bg-gray-900'
											)}
										>
											<div className={cn('text-base font-bold leading-none',
												isTdy  ? 'text-white' :
												isWknd ? 'text-amber-300' : 'text-gray-200'
											)}>
												{format(d, 'd')}
											</div>
											<div className={cn('text-[10px] mt-0.5',
												isTdy  ? 'text-emerald-200' :
												isWknd ? 'text-amber-400/70' : 'text-gray-500'
											)}>
												{format(d, 'EEE')}
											</div>
										</th>
									);
								})}

								{/* Summary column headers */}
								<th className="sticky right-24 z-30 bg-gray-900 border-l-2 border-gray-600 w-8 py-3 text-center text-[11px] font-bold text-emerald-400">P</th>
								<th className="sticky right-16 z-30 bg-gray-900 border-l border-gray-700 w-8 py-3 text-center text-[11px] font-bold text-red-400">A</th>
								<th className="sticky right-8  z-30 bg-gray-900 border-l border-gray-700 w-8 py-3 text-center text-[11px] font-bold text-blue-400">PL</th>
								<th className="sticky right-0  z-30 bg-gray-900 border-l border-gray-700 w-8 py-3 text-center text-[11px] font-bold text-violet-400">PH</th>
							</tr>

							{/* ── Row 2: P/A/PL/PH sub-labels ── */}
							<tr>
								<th className="sticky left-0 z-30 bg-gray-800 border-b-2 border-r border-gray-700 w-10 h-7" />
								<th className="sticky left-[40px] z-30 bg-gray-800 border-b-2 border-r border-gray-700 w-[170px]" />
								<th className="sticky left-[210px] z-30 bg-gray-800 border-b-2 border-r border-gray-700 w-[120px]" />
								<th className="sticky left-[330px] z-30 bg-gray-800 border-b-2 border-r-2 border-gray-600 w-[140px]" />

								{days.map(d => {
									const isWknd = d.getDay() === 0 || d.getDay() === 6;
									const isTdy  = format(d, 'yyyy-MM-dd') === todayStr;
									return STATUS.map((s, si) => (
										<th
											key={`sh_${format(d, 'yyyy-MM-dd')}_${s.key}`}
											title={s.tooltip}
											className={cn(
												'border-b-2 py-1 text-center text-[10px] font-bold w-7',
												si === 3 ? 'border-r-2 border-gray-600' : 'border-r border-gray-700',
												isTdy  ? 'bg-emerald-800' :
												isWknd ? 'bg-amber-900/30' : 'bg-gray-800',
												s.thText
											)}
										>
											{s.label}
										</th>
									));
								})}

								<th className="sticky right-24 z-30 bg-gray-800 border-b-2 border-l-2 border-gray-600 w-8" />
								<th className="sticky right-16 z-30 bg-gray-800 border-b-2 border-l border-gray-700 w-8" />
								<th className="sticky right-8  z-30 bg-gray-800 border-b-2 border-l border-gray-700 w-8" />
								<th className="sticky right-0  z-30 bg-gray-800 border-b-2 border-l border-gray-700 w-8" />
							</tr>
						</thead>

						<tbody>
							{EMPLOYEES.map((emp, idx) => {
								const bg = rowBg(idx);
								const t  = rowTotals(emp.id);
								return (
									<tr key={emp.id} className={cn('border-b border-gray-100 hover:brightness-95 transition-all', bg)}>

										{/* Sticky left: # */}
										<td className={cn('sticky left-0 z-20 border-r border-gray-200 px-2 py-3 text-center text-xs text-gray-400 w-10', bg)}>
											{idx + 1}
										</td>

										{/* Sticky left: name */}
										<td className={cn('sticky left-[40px] z-20 border-r border-gray-200 px-3 py-3 w-[170px]', bg)}>
											<div className="font-semibold text-gray-800 text-xs truncate">{emp.name}</div>
											<div className="text-[10px] text-gray-400 mt-0.5">{emp.id}</div>
										</td>

										{/* Sticky left: dept */}
										<td className={cn('sticky left-[210px] z-20 border-r border-gray-200 px-3 py-3 text-xs text-gray-600 w-[120px] truncate', bg)}>
											{emp.department}
										</td>

										{/* Sticky left: designation */}
										<td className={cn('sticky left-[330px] z-20 border-r-2 border-gray-300 px-3 py-3 text-xs text-gray-600 w-[140px] truncate', bg)}>
											{emp.designation}
										</td>

										{/* Day × Status cells */}
										{days.map(d => {
											const ds     = format(d, 'yyyy-MM-dd');
											const cur    = getStatus(emp.id, ds);
											const isWknd = d.getDay() === 0 || d.getDay() === 6;
											const isTdy  = ds === todayStr;

											return STATUS.map((s, si) => {
												const active = cur === s.key;
												return (
													<td
														key={`${emp.id}_${ds}_${s.key}`}
														onClick={() => toggle(emp.id, ds, s.key)}
														title={`${emp.name} — ${s.tooltip} — ${format(d, 'MMM d')}`}
														className={cn(
															'py-2 text-center cursor-pointer transition-colors w-7 select-none',
															si === 3 ? 'border-r-2 border-r-gray-200' : 'border-r border-r-gray-100',
															!active && isWknd ? 'bg-amber-50/70' : '',
															!active && isTdy  ? 'bg-emerald-50/40' : '',
															!active && 'hover:bg-gray-100',
														)}
													>
														{active ? (
															<span className={cn(
																'inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold text-white shadow-sm mx-auto',
																s.bg
															)}>
																{s.label}
															</span>
														) : (
															<span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-200 mx-auto" />
														)}
													</td>
												);
											});
										})}

										{/* Sticky right: row totals */}
										<td className={cn('sticky right-24 z-20 border-l-2 border-gray-200 w-8 py-3 text-center text-xs font-bold', t.P  ? 'text-emerald-600' : 'text-gray-300', bg)}>
											{t.P  || '—'}
										</td>
										<td className={cn('sticky right-16 z-20 border-l border-gray-100 w-8 py-3 text-center text-xs font-bold', t.A  ? 'text-red-500'     : 'text-gray-300', bg)}>
											{t.A  || '—'}
										</td>
										<td className={cn('sticky right-8  z-20 border-l border-gray-100 w-8 py-3 text-center text-xs font-bold', t.PL ? 'text-blue-500'    : 'text-gray-300', bg)}>
											{t.PL || '—'}
										</td>
										<td className={cn('sticky right-0  z-20 border-l border-gray-100 w-8 py-3 text-center text-xs font-bold', t.PH ? 'text-violet-500'  : 'text-gray-300', bg)}>
											{t.PH || '—'}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
};

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────

export const HRMSModule = () => (
	<div className="p-6">
		<AttendanceModule />
	</div>
);
export default HRMSModule;
