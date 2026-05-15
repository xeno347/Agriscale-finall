// ============================================================
// PAYROLL & ATTENDANCE MODULE
// ============================================================
// Main superset module containing:
// - Attendance Management
// - Payroll Management
// - HR Operations
// ============================================================

import { useState } from 'react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';
import {
	Plus,
	Edit,
	Trash2,
	Eye,
	ArrowLeft,
	Save,
	Users,
	Calendar,
	DollarSign,
	Clock,
	Download,
	Filter,
	Search,
	CheckCircle,
	XCircle,
	AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface Employee {
	id: string;
	name: string;
	email: string;
	department: string;
	designation: string;
	joinDate: string;
	baseSalary: number;
	status: 'active' | 'inactive' | 'on-leave';
}

interface AttendanceRecord {
	id: string;
	employeeId: string;
	employeeName: string;
	date: string;
	status: 'present' | 'absent' | 'half-day' | 'leave';
	checkIn?: string;
	checkOut?: string;
	remarks?: string;
}

interface PayrollRecord {
	id: string;
	employeeId: string;
	employeeName: string;
	month: string;
	year: number;
	baseSalary: number;
	deductions: number;
	additions: number;
	netSalary: number;
	status: 'draft' | 'approved' | 'paid';
	paymentDate?: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_EMPLOYEES: Employee[] = [
	{
		id: 'EMP001',
		name: 'Rajesh Kumar',
		email: 'rajesh@farmconnect.com',
		department: 'Field Operations',
		designation: 'Senior Field Officer',
		joinDate: '2023-01-15',
		baseSalary: 35000,
		status: 'active',
	},
	{
		id: 'EMP002',
		name: 'Priya Singh',
		email: 'priya@farmconnect.com',
		department: 'Administration',
		designation: 'HR Manager',
		joinDate: '2023-03-20',
		baseSalary: 40000,
		status: 'active',
	},
	{
		id: 'EMP003',
		name: 'Amit Patel',
		email: 'amit@farmconnect.com',
		department: 'Operations',
		designation: 'Operations Coordinator',
		joinDate: '2023-06-10',
		baseSalary: 28000,
		status: 'active',
	},
	{
		id: 'EMP004',
		name: 'Neha Gupta',
		email: 'neha@farmconnect.com',
		department: 'Finance',
		designation: 'Finance Officer',
		joinDate: '2023-02-01',
		baseSalary: 32000,
		status: 'active',
	},
	{
		id: 'EMP005',
		name: 'Suresh Verma',
		email: 'suresh@farmconnect.com',
		department: 'Field Operations',
		designation: 'Field Officer',
		joinDate: '2023-05-15',
		baseSalary: 25000,
		status: 'on-leave',
	},
];

const MOCK_ATTENDANCE: AttendanceRecord[] = [
	{
		id: 'ATT001',
		employeeId: 'EMP001',
		employeeName: 'Rajesh Kumar',
		date: format(new Date(), 'yyyy-MM-dd'),
		status: 'present',
		checkIn: '09:00',
		checkOut: '17:30',
	},
	{
		id: 'ATT002',
		employeeId: 'EMP002',
		employeeName: 'Priya Singh',
		date: format(new Date(), 'yyyy-MM-dd'),
		status: 'present',
		checkIn: '09:15',
		checkOut: '18:00',
	},
	{
		id: 'ATT003',
		employeeId: 'EMP003',
		employeeName: 'Amit Patel',
		date: format(new Date(), 'yyyy-MM-dd'),
		status: 'absent',
		remarks: 'Medical emergency',
	},
	{
		id: 'ATT004',
		employeeId: 'EMP004',
		employeeName: 'Neha Gupta',
		date: format(new Date(), 'yyyy-MM-dd'),
		status: 'half-day',
		checkIn: '09:00',
		checkOut: '13:00',
	},
];

const MOCK_PAYROLL: PayrollRecord[] = [
	{
		id: 'PAY001',
		employeeId: 'EMP001',
		employeeName: 'Rajesh Kumar',
		month: 'April',
		year: 2026,
		baseSalary: 35000,
		deductions: 5250,
		additions: 2000,
		netSalary: 31750,
		status: 'paid',
		paymentDate: '2026-04-30',
	},
	{
		id: 'PAY002',
		employeeId: 'EMP002',
		employeeName: 'Priya Singh',
		month: 'April',
		year: 2026,
		baseSalary: 40000,
		deductions: 6000,
		additions: 1500,
		netSalary: 35500,
		status: 'paid',
		paymentDate: '2026-04-30',
	},
	{
		id: 'PAY003',
		employeeId: 'EMP003',
		employeeName: 'Amit Patel',
		month: 'May',
		year: 2026,
		baseSalary: 28000,
		deductions: 4200,
		additions: 1000,
		netSalary: 24800,
		status: 'approved',
	},
	{
		id: 'PAY004',
		employeeId: 'EMP004',
		employeeName: 'Neha Gupta',
		month: 'May',
		year: 2026,
		baseSalary: 32000,
		deductions: 4800,
		additions: 1500,
		netSalary: 28700,
		status: 'draft',
	},
];

// ============================================================
// ATTENDANCE MODULE
// ============================================================

const AttendanceModule = () => {
	const navigate = useNavigate();
	const [attendance, setAttendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
	const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
	const [selectedEmployee, setSelectedEmployee] = useState<string>('');
	const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
	const [editingId, setEditingId] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState<string>('all');

	const handleMarkAttendance = (employeeId: string, status: AttendanceRecord['status']) => {
		const existingRecord = attendance.find(
			(a) => a.employeeId === employeeId && a.date === selectedDate
		);

		if (existingRecord) {
			setAttendance(
				attendance.map((a) =>
					a.id === existingRecord.id ? { ...a, status, id: existingRecord.id } : a
				)
			);
			toast.success(`Attendance updated for ${status}`);
		} else {
			const employee = employees.find((e) => e.id === employeeId);
			if (employee) {
				const newRecord: AttendanceRecord = {
					id: `ATT${Date.now()}`,
					employeeId,
					employeeName: employee.name,
					date: selectedDate,
					status,
				};
				setAttendance([...attendance, newRecord]);
				toast.success('Attendance marked successfully');
			}
		}
	};

	const handleDeleteAttendance = (id: string) => {
		setAttendance(attendance.filter((a) => a.id !== id));
		toast.success('Attendance record deleted');
	};

	const filteredAttendance = attendance
		.filter((a) => a.date === selectedDate)
		.filter((a) => (filterStatus === 'all' ? true : a.status === filterStatus))
		.filter((a) => a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));

	const getStatusColor = (status: AttendanceRecord['status']) => {
		switch (status) {
			case 'present':
				return 'bg-green-100 text-green-800';
			case 'absent':
				return 'bg-red-100 text-red-800';
			case 'half-day':
				return 'bg-yellow-100 text-yellow-800';
			case 'leave':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getStatusIcon = (status: AttendanceRecord['status']) => {
		switch (status) {
			case 'present':
				return <CheckCircle className="w-4 h-4" />;
			case 'absent':
				return <XCircle className="w-4 h-4" />;
			case 'half-day':
				return <AlertCircle className="w-4 h-4" />;
			case 'leave':
				return <Calendar className="w-4 h-4" />;
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-3xl font-bold">Attendance Management</h2>
					<p className="text-gray-600">Track and manage employee attendance</p>
				</div>
				<Button onClick={() => navigate('/hrms')} variant="outline" size="sm">
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Mark Attendance</CardTitle>
					<CardDescription>Select date and mark attendance for employees</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium mb-2 block">Date</label>
							<Input
								type="date"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
							/>
						</div>
						<div>
							<label className="text-sm font-medium mb-2 block">Employee</label>
							<Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
								<SelectTrigger>
									<SelectValue placeholder="Select employee" />
								</SelectTrigger>
								<SelectContent>
									{employees.map((emp) => (
										<SelectItem key={emp.id} value={emp.id}>
											{emp.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{selectedEmployee && (
						<div className="flex gap-2 pt-4">
							<Button
								onClick={() => handleMarkAttendance(selectedEmployee, 'present')}
								className="flex-1"
								variant="outline"
							>
								<CheckCircle className="w-4 h-4 mr-2" />
								Present
							</Button>
							<Button
								onClick={() => handleMarkAttendance(selectedEmployee, 'absent')}
								className="flex-1"
								variant="outline"
							>
								<XCircle className="w-4 h-4 mr-2" />
								Absent
							</Button>
							<Button
								onClick={() => handleMarkAttendance(selectedEmployee, 'half-day')}
								className="flex-1"
								variant="outline"
							>
								<AlertCircle className="w-4 h-4 mr-2" />
								Half Day
							</Button>
							<Button
								onClick={() => handleMarkAttendance(selectedEmployee, 'leave')}
								className="flex-1"
								variant="outline"
							>
								<Calendar className="w-4 h-4 mr-2" />
								Leave
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex justify-between items-center">
						<div>
							<CardTitle>Attendance Records - {format(new Date(selectedDate), 'MMM dd, yyyy')}</CardTitle>
							<CardDescription>View and manage daily attendance</CardDescription>
						</div>
						<div className="flex gap-2">
							<div className="relative">
								<Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
								<Input
									placeholder="Search employee..."
									className="pl-10 w-48"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							<Select value={filterStatus} onValueChange={setFilterStatus}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="present">Present</SelectItem>
									<SelectItem value="absent">Absent</SelectItem>
									<SelectItem value="half-day">Half Day</SelectItem>
									<SelectItem value="leave">Leave</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Check In</TableHead>
									<TableHead>Check Out</TableHead>
									<TableHead>Remarks</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredAttendance.length > 0 ? (
									filteredAttendance.map((record) => {
										const employee = employees.find((e) => e.id === record.employeeId);
										return (
											<TableRow key={record.id}>
												<TableCell className="font-medium">{record.employeeName}</TableCell>
												<TableCell>{employee?.department}</TableCell>
												<TableCell>
													<Badge className={getStatusColor(record.status)}>
														{getStatusIcon(record.status)}
														<span className="ml-1">{record.status}</span>
													</Badge>
												</TableCell>
												<TableCell>{record.checkIn || '-'}</TableCell>
												<TableCell>{record.checkOut || '-'}</TableCell>
												<TableCell>{record.remarks || '-'}</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDeleteAttendance(record.id)}
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})
								) : (
									<TableRow>
										<TableCell colSpan={7} className="text-center py-4 text-gray-500">
											No attendance records for this date
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// ============================================================
// PAYROLL MODULE
// ============================================================

const PayrollModule = () => {
	const navigate = useNavigate();
	const [payroll, setPayroll] = useState<PayrollRecord[]>(MOCK_PAYROLL);
	const [employees] = useState<Employee[]>(MOCK_EMPLOYEES);
	const [selectedMonth, setSelectedMonth] = useState<string>('May');
	const [selectedYear, setSelectedYear] = useState<number>(2026);
	const [filterStatus, setFilterStatus] = useState<string>('all');
	const [searchTerm, setSearchTerm] = useState('');

	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const years = [2024, 2025, 2026, 2027];

	const handleGeneratePayroll = () => {
		toast.success('Payroll generated successfully for all employees');
	};

	const handleApprovePayroll = (id: string) => {
		setPayroll(
			payroll.map((p) => (p.id === id ? { ...p, status: 'approved' } : p))
		);
		toast.success('Payroll approved');
	};

	const handlePayPayroll = (id: string) => {
		setPayroll(
			payroll.map((p) =>
				p.id === id ? { ...p, status: 'paid', paymentDate: format(new Date(), 'yyyy-MM-dd') } : p
			)
		);
		toast.success('Payment processed successfully');
	};

	const filteredPayroll = payroll
		.filter((p) => p.month === selectedMonth && p.year === selectedYear)
		.filter((p) => (filterStatus === 'all' ? true : p.status === filterStatus))
		.filter((p) => p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));

	const getStatusBadgeColor = (status: PayrollRecord['status']) => {
		switch (status) {
			case 'draft':
				return 'bg-gray-100 text-gray-800';
			case 'approved':
				return 'bg-blue-100 text-blue-800';
			case 'paid':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const totalBaseSalary = filteredPayroll.reduce((sum, p) => sum + p.baseSalary, 0);
	const totalDeductions = filteredPayroll.reduce((sum, p) => sum + p.deductions, 0);
	const totalAdditions = filteredPayroll.reduce((sum, p) => sum + p.additions, 0);
	const totalNetSalary = filteredPayroll.reduce((sum, p) => sum + p.netSalary, 0);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-3xl font-bold">Payroll Management</h2>
					<p className="text-gray-600">Manage employee salaries and payments</p>
				</div>
				<Button onClick={() => navigate('/hrms')} variant="outline" size="sm">
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back
				</Button>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Total Base Salary</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">₹{totalBaseSalary.toLocaleString()}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Total Deductions</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">₹{totalDeductions.toLocaleString()}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Total Additions</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">₹{totalAdditions.toLocaleString()}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Total Net Salary</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">₹{totalNetSalary.toLocaleString()}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<div className="flex justify-between items-center">
						<div>
							<CardTitle>Payroll Records</CardTitle>
							<CardDescription>Process and manage employee payroll</CardDescription>
						</div>
						<Button onClick={handleGeneratePayroll} size="sm">
							<Plus className="w-4 h-4 mr-2" />
							Generate Payroll
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label className="text-sm font-medium mb-2 block">Month</label>
							<Select value={selectedMonth} onValueChange={setSelectedMonth}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{months.map((month) => (
										<SelectItem key={month} value={month}>
											{month}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm font-medium mb-2 block">Year</label>
							<Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map((year) => (
										<SelectItem key={year} value={year.toString()}>
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm font-medium mb-2 block">Status</label>
							<Select value={filterStatus} onValueChange={setFilterStatus}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="approved">Approved</SelectItem>
									<SelectItem value="paid">Paid</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm font-medium mb-2 block">Search</label>
							<div className="relative">
								<Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
								<Input
									placeholder="Search employee..."
									className="pl-10"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
						</div>
					</div>

					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Department</TableHead>
									<TableHead className="text-right">Base Salary</TableHead>
									<TableHead className="text-right">Deductions</TableHead>
									<TableHead className="text-right">Additions</TableHead>
									<TableHead className="text-right">Net Salary</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredPayroll.length > 0 ? (
									filteredPayroll.map((record) => {
										const employee = employees.find((e) => e.id === record.employeeId);
										return (
											<TableRow key={record.id}>
												<TableCell className="font-medium">{record.employeeName}</TableCell>
												<TableCell>{employee?.department}</TableCell>
												<TableCell className="text-right">₹{record.baseSalary.toLocaleString()}</TableCell>
												<TableCell className="text-right text-red-600">-₹{record.deductions.toLocaleString()}</TableCell>
												<TableCell className="text-right text-green-600">+₹{record.additions.toLocaleString()}</TableCell>
												<TableCell className="text-right font-semibold">₹{record.netSalary.toLocaleString()}</TableCell>
												<TableCell>
													<Badge className={getStatusBadgeColor(record.status)}>
														{record.status}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex gap-2">
														{record.status === 'draft' && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleApprovePayroll(record.id)}
															>
																<CheckCircle className="w-4 h-4" />
															</Button>
														)}
														{record.status === 'approved' && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handlePayPayroll(record.id)}
															>
																<DollarSign className="w-4 h-4" />
															</Button>
														)}
														<Button variant="ghost" size="sm">
															<Download className="w-4 h-4" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									})
								) : (
									<TableRow>
										<TableCell colSpan={8} className="text-center py-4 text-gray-500">
											No payroll records found
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// ============================================================
// HRMS DASHBOARD (Main Superset)
// ============================================================

const HRMSDashboard = () => {
	const navigate = useNavigate();
	const [employees] = useState<Employee[]>(MOCK_EMPLOYEES);
	const [attendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
	const [payroll] = useState<PayrollRecord[]>(MOCK_PAYROLL);

	const activeEmployees = employees.filter((e) => e.status === 'active').length;
	const presentToday = attendance.filter((a) => a.status === 'present').length;
	const pendingPayroll = payroll.filter((p) => p.status === 'draft').length;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-4xl font-bold">Payroll & Attendance</h1>
				<p className="text-gray-600 mt-2">Manage attendance, payroll, and employee operations</p>
			</div>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-2">
							<Users className="w-4 h-4" />
							Total Employees
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{employees.length}</div>
						<p className="text-sm text-gray-600 mt-1">{activeEmployees} active</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-2">
							<Calendar className="w-4 h-4" />
							Present Today
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-green-600">{presentToday}</div>
						<p className="text-sm text-gray-600 mt-1">Out of {employees.length}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-2">
							<DollarSign className="w-4 h-4" />
							Pending Payroll
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-orange-600">{pendingPayroll}</div>
						<p className="text-sm text-gray-600 mt-1">Records in draft</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-2">
							<Clock className="w-4 h-4" />
							On Leave
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-blue-600">
							{employees.filter((e) => e.status === 'on-leave').length}
						</div>
						<p className="text-sm text-gray-600 mt-1">Employees</p>
					</CardContent>
				</Card>
			</div>

			{/* Modules */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('attendance')}>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Calendar className="w-5 h-5" />
							Attendance Management
						</CardTitle>
						<CardDescription>Track and manage employee attendance records</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-gray-600">
							Mark daily attendance, view records, and generate reports.
						</p>
						<Button className="mt-4 w-full">
							Access Module
							<ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
						</Button>
					</CardContent>
				</Card>

				<Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('payroll')}>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5" />
							Payroll Management
						</CardTitle>
						<CardDescription>Process salaries and manage payments</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-gray-600">
							Generate payroll, manage deductions, and process payments.
						</p>
						<Button className="mt-4 w-full">
							Access Module
							<ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Recent Activity */}
			<Card>
				<CardHeader>
					<CardTitle>Employee Directory</CardTitle>
					<CardDescription>Active employees in the system</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Designation</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employees.slice(0, 5).map((emp) => (
									<TableRow key={emp.id}>
										<TableCell className="font-medium">{emp.name}</TableCell>
										<TableCell>{emp.email}</TableCell>
										<TableCell>{emp.department}</TableCell>
										<TableCell>{emp.designation}</TableCell>
										<TableCell>
											<Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
												{emp.status}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// ============================================================
// MAIN ROUTER
// ============================================================

export const HRMSModule = () => {
	return (
		<Routes>
			<Route path="/" element={<HRMSDashboard />} />
			<Route path="/attendance/*" element={<AttendanceModule />} />
			<Route path="/payroll/*" element={<PayrollModule />} />
		</Routes>
	);
};

export default HRMSModule;
