'use client';

/**
 * ActivityFeed.tsx
 *
 * Shows the last 10 activity log events from nxf_system_activity_logs.
 * Maps action codes to human-readable labels and icons.
 * Used on the dashboard below the KPI bar.
 */

import { FiLogIn, FiLogOut, FiActivity, FiUser, FiZap } from 'react-icons/fi';

export interface ActivityEvent {
  id:          string;
  user_id:     string;
  user_label:  string;
  action:      string;
  context:     Record<string, any>;
  created_at:  string;
}

interface Props {
  events: ActivityEvent[];
  loading: boolean;
}

// ── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  label: string;
  icon:  React.ReactNode;
  colour: string;
}> = {
  user_login:   { label: 'Logged in',    icon: <FiLogIn size={13} />,    colour: 'text-green-600 bg-green-50'  },
  user_logout:  { label: 'Logged out',   icon: <FiLogOut size={13} />,   colour: 'text-gray-500 bg-gray-100'  },
  user_online:  { label: 'Online',       icon: <FiActivity size={13} />, colour: 'text-blue-600 bg-blue-50'   },
  user_offline: { label: 'Went offline', icon: <FiUser size={13} />,     colour: 'text-gray-400 bg-gray-50'   },
};

function getConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    label:  action.replace(/_/g, ' '),
    icon:   <FiZap size={13} />,
    colour: 'text-violet-600 bg-violet-50',
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1">
            <div className="h-2.5 bg-gray-200 rounded w-3/4 mb-1" />
            <div className="h-2 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityFeed({ events, loading }: Props) {
  return (
    <div style={{ backgroundColor: '#ffffff' }} className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        <p className="text-xs text-gray-400 mt-0.5">Last 10 events across all users</p>
      </div>

      {loading ? (
        <Skeleton />
      ) : events.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          No activity recorded yet
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {events.map((event) => {
            const cfg = getConfig(event.action);
            return (
              <div key={event.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                {/* Action icon badge */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.colour}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800">
                    <span className="font-semibold">{event.user_label}</span>
                    {' · '}
                    <span className="text-gray-500">{cfg.label}</span>
                  </p>
                  {/* Context keys — e.g. IP address if stored */}
                  {event.context?.ip && (
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{event.context.ip}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(event.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}