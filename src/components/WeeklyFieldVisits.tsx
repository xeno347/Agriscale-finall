import React from "react";
import {
  ClipboardList,
  CheckCircle2,
  Watch,
  User,
  FileText,
  Image as ImageIcon,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ----------------------------- TYPES ----------------------------- */

type CalendarData = Record<string, Array<any>>;

/* ------------------------ HELPER FUNCTIONS ------------------------ */

const normalizeAssignmentStatus = (raw?: string) => {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "unassigned";
  if (s === "unaasigned") return "unassigned";
  return s;
};

const isCompletedAssignmentStatus = (raw?: string) =>
  normalizeAssignmentStatus(raw) === "completed";

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

/* -------------------------- MAIN PAGE -------------------------- */

const FieldVisitPage: React.FC<{ activities: CalendarData }> = ({ activities }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      date: d,
      dateKey: formatDateKey(d),
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: d.getDate(),
    };
  });

  return (
    <main className="flex-1 bg-gray-50 overflow-y-auto">
      {/* ✅ SINGLE SOURCE OF PADDING */}
      <div className="px-6 py-6 space-y-6">

        {/* ===================== TIMELINE ===================== */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-green-700" />
            <h2 className="text-xl font-semibold text-gray-800">Timeline</h2>
          </div>

          <div className="space-y-3">
            {[
              { label: "Jan 05 – Jan 11", percent: "0%", current: true },
              { label: "Dec 29 – Jan 04", percent: "67%" },
              { label: "Dec 22 – Dec 28", percent: "67%" },
              { label: "Dec 15 – Dec 21", percent: "100%" },
            ].map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between rounded-lg px-4 py-3 border",
                  item.current ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"
                )}
              >
                <span className="text-sm font-medium text-gray-700">{item.label}</span>

                <span
                  className={cn(
                    "text-xs font-semibold",
                    item.percent === "100%" ? "text-green-600" : "text-gray-500"
                  )}
                >
                  {item.percent}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ================= WEEKLY FIELD VISITS ================= */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Weekly Field Visits
            </h3>

            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {weekDays[0].dayName} {weekDays[0].dayNum} – {weekDays[6].dayName} {weekDays[6].dayNum}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const isToday = day.dateKey === formatDateKey(new Date());
              const dayActivities = activities[day.dateKey] || [];

              const visits = dayActivities.filter(
                (act: any) =>
                  typeof act.activity === "string" &&
                  act.activity.toLowerCase().includes("visit")
              );

              return (
                <div
                  key={day.dateKey}
                  className={cn(
                    "flex flex-col gap-2 min-h-[140px] rounded-lg p-2 border",
                    isToday ? "bg-blue-50/50 border-blue-200" : "bg-gray-50/50 border-gray-100"
                  )}
                >
                  <div
                    className={cn(
                      "text-center text-xs font-bold mb-1",
                      isToday ? "text-blue-700" : "text-gray-500"
                    )}
                  >
                    {day.dayName}
                    <span className="ml-1 text-sm">{day.dayNum}</span>
                  </div>

                  {visits.length ? (
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[120px] pr-1">
                      {visits.map((visit: any, idx: number) => {
                        const isCompleted =
                          Array.isArray(visit.assignments) &&
                          visit.assignments.some((a: any) =>
                            isCompletedAssignmentStatus(a?.status)
                          );

                        return (
                          <div
                            key={`${visit.calander_id || "v"}-${idx}`}
                            className={cn(
                              "p-2 rounded-md border text-xs shadow-sm",
                              isCompleted
                                ? "bg-green-100 border-green-200 text-green-800"
                                : "bg-white border-gray-200 text-gray-700"
                            )}
                          >
                            <div className="font-bold truncate mb-0.5">{visit.activity}</div>
                            <div className="flex justify-between items-center text-[10px] opacity-80">
                              <span>{visit.farm_id || "—"}</span>
                              {isCompleted ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Watch className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-300 text-[10px] italic">
                      No visits
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
};

export default FieldVisitPage;
