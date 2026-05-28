'use client';

/**
 * SystemStatus.tsx
 *
 * Shows project name, DB type, and quick collection counts.
 * Data comes from /api/dashboard/stats.
 */

import {
  FiDatabase, FiServer, FiTag, FiCheckCircle,
} from 'react-icons/fi';

interface Props {
  project: {
    project_id:   string;
    project_name: string;
    db_type:      string;
  } | null;
  counts: {
    users:        number;
    pages:        number;
    models:       number;
    menu_items:   number;
    media_files:  number;
    storage_bytes:number;
  };
  loading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0)         return '0 B';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const DB_LABELS: Record<string, string> = {
  firebase:   'Firebase Firestore',
  supabase:   'Supabase',
  mongodb:    'MongoDB',
  mysql:      'MySQL',
  postgresql: 'PostgreSQL',
};

export function SystemStatus({ project, counts, loading }: Props) {
  const rows = [
    { label: 'Users',       value: counts.users        },
    { label: 'Pages',       value: counts.pages        },
    { label: 'Models',      value: counts.models       },
    { label: 'Menu Items',  value: counts.menu_items   },
    { label: 'Media Files', value: counts.media_files  },
    { label: 'Storage',     value: formatBytes(counts.storage_bytes), raw: true },
  ];

  return (
    <div style={{ backgroundColor: '#ffffff' }} className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">System Status</h2>
        <p className="text-xs text-gray-400 mt-0.5">Project config and collection counts</p>
      </div>

      {loading ? (
        <div className="p-5 flex flex-col gap-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-100 rounded w-full" />
          ))}
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-4">

          {/* Project info */}
          {project && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FiTag size={13} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Project</p>
                  <p className="text-xs font-semibold text-gray-800">{project.project_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FiDatabase size={13} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Database</p>
                  <p className="text-xs font-semibold text-gray-800">
                    {DB_LABELS[project.db_type] ?? project.db_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FiServer size={13} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mode</p>
                  <p className="text-xs font-semibold text-gray-800">Self-hosted</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FiCheckCircle size={13} className="text-green-500 shrink-0" />
                <p className="text-xs text-green-600 font-medium">System operational</p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Collection Counts</p>
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {row.raw ? row.value : Number(row.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}