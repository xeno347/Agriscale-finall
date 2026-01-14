import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

interface VehicleBusyCalendarProps {
  title?: string;
  monthDate?: Date; // starting month
  monthsToShow?: number; // how many consecutive months to display
  busyDates: string[]; // ISO date strings: YYYY-MM-DD
}

const pad = (n: number) => String(n).padStart(2, '0');

const VehicleBusyCalendar: React.FC<VehicleBusyCalendarProps> = ({ 
  title = 'Vehicle Timeline', 
  monthDate = new Date(), 
  monthsToShow = 3,
  busyDates 
}) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const months = Array.from({ length: Math.max(1, monthsToShow) }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1));
  const busySet = new Set(busyDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startLabel = `${start.toLocaleString('default', { month: 'short' })} ${start.getFullYear()}`;
  const endMonth = months[months.length - 1];
  const endLabel = `${endMonth.toLocaleString('default', { month: 'short' })} ${endMonth.getFullYear()}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 text-gray-900 font-bold">
          <CalendarIcon className="w-5 h-5 text-gray-500" /> {title}
        </div>
        <div className="text-xs text-gray-500 font-medium">{startLabel} — {endLabel}</div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((mDate, idx) => {
            const y = mDate.getFullYear();
            const m = mDate.getMonth();
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const firstDay = new Date(y, m, 1).getDay();
            const monthName = mDate.toLocaleString('default', { month: 'long' });

            return (
              <div key={`${y}-${m}-${idx}`} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="text-sm font-bold text-gray-800">{monthName} {y}</div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-7 mb-2">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <div key={d} className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${y}-${pad(m + 1)}-${pad(day)}`;
                      const isBusy = busySet.has(dateStr);
                      const current = new Date(y, m, day);
                      current.setHours(0,0,0,0);
                      const isToday = current.getTime() === today.getTime();

                      return (
                        <div key={day} className="flex justify-center">
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex flex-col items-center justify-center transition-all relative border',
                            isToday ? 'bg-green-600 text-white border-green-600 shadow' :
                            isBusy ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-white text-gray-700 border-gray-200'
                          )}>
                            <span className="text-xs font-medium">{day}</span>
                            {isBusy && <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-blue-600" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600" /> Busy</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-600" /> Today</div>
        </div>
      </div>
    </div>
  );
};

export default VehicleBusyCalendar;
