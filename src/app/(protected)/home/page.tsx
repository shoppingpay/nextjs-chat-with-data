import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { redirectIfPasswordChangeRequired } from "@/lib/password-change-guard";

const stats = [
  {
    helper: "Ready for inference",
    icon: <BrainCircuit aria-hidden="true" className="h-5 w-5" />,
    label: "Active models",
    tone: "accent" as const,
    trend: "Stable",
    value: "0",
  },
  {
    helper: "No queued jobs",
    icon: <Clock3 aria-hidden="true" className="h-5 w-5" />,
    label: "Training jobs",
    trend: "Idle",
    value: "0",
  },
  {
    helper: "No machine registered",
    icon: <Activity aria-hidden="true" className="h-5 w-5" />,
    label: "Machine status",
    trend: "Waiting",
    value: "0",
  },
  {
    helper: "PostgreSQL connected",
    icon: <Database aria-hidden="true" className="h-5 w-5" />,
    label: "Data sources",
    trend: "Online",
    value: "1",
  },
];

const chartBars = [42, 58, 46, 72, 64, 88, 70, 76, 92, 84, 68, 80];
const activities = [
  {
    event: "Authentication service ready",
    owner: "System",
    status: "Healthy",
    time: "Today",
  },
  {
    event: "Session idle policy enforced",
    owner: "Security",
    status: "Active",
    time: "Today",
  },
  {
    event: "Model workspace initialized",
    owner: "Operations",
    status: "Ready",
    time: "Today",
  },
];

export default async function HomePage() {
  await redirectIfPasswordChangeRequired();

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[10px] border border-[#21262d] bg-[#161b22] p-4 shadow-none lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge>Model operations</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[#e6edf3] sm:text-3xl">
            Home dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8b949e]">
            Monitor operational health, training readiness, and recent system
            activity from a responsive SaaS dashboard workspace.
          </p>
        </div>
        <Button type="button" variant="secondary">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#1d9e75]" />
          System ready
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#e6edf3]">
                Chart section
              </h2>
              <p className="mt-1 text-sm text-[#8b949e]">
                Training throughput overview for the current cycle.
              </p>
            </div>
            <Badge className="border-[#30363d] bg-[#21262d] text-[#8b949e]">
              Last 12 periods
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex h-80 items-end gap-3 rounded-[10px] border border-[#21262d] bg-[#0f141b] p-5">
              {chartBars.map((height, index) => (
                <div className="flex flex-1 flex-col items-center gap-3" key={index}>
                  <div className="flex h-56 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-[#1d9e75] shadow-sm transition hover:bg-[#ef9f27]"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[#8b949e]">{index + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-[#e6edf3]">
              Error state
            </h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              Operational issues will appear here when detected.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-[10px] border border-[#1d9e75]/25 bg-[#1d9e75]/10 p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1d9e75]/20 text-[#1d9e75]">
                  <AlertTriangle aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#e6edf3]">
                    No active errors
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#8b949e]">
                    Error state is ready and will keep critical failures visible
                    without disrupting the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#e6edf3]">
              Recent activity
            </h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              Latest operational events from the workspace.
            </p>
          </div>
          <Badge className="border-[#30363d] bg-[#21262d] text-[#8b949e]">
            Activity table
          </Badge>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="overflow-hidden rounded-[10px] border border-[#21262d]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#0f141b] text-xs uppercase text-[#8b949e]">
                  <tr>
                    <th className="px-5 py-4">Event</th>
                    <th className="px-5 py-4">Owner</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] bg-[#161b22]">
                  {activities.map((activity) => (
                    <tr
                      className="transition hover:bg-[#1c2128]"
                      key={activity.event}
                    >
                      <td className="px-5 py-4 font-medium text-[#e6edf3]">
                        {activity.event}
                      </td>
                      <td className="px-5 py-4 text-[#8b949e]">
                        {activity.owner}
                      </td>
                      <td className="px-5 py-4">
                        <Badge>{activity.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right text-[#8b949e]">
                        {activity.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="Activity rows will appear once jobs, machines, or audit events are available."
              title="No activity yet"
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
