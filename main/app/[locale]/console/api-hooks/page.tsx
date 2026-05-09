'use client';

import { useState } from 'react';
import {
  FiCode, FiCopy, FiCheck, FiPlay, FiPlus, FiTrash2,
  FiChevronDown, FiChevronUp, FiKey, FiLock, FiUnlock,
  FiEdit2, FiX, FiZap, FiEye, FiEyeOff,
} from 'react-icons/fi';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type EndpointType = 'auto' | 'custom';

type Endpoint = {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  type: EndpointType;
  model?: string;
  auth: boolean;
};

type ApiKey = {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  active: boolean;
};

const mockEndpoints: Endpoint[] = [
  { id: '1',  method: 'GET',    path: '/api/data/products',       description: 'List all products with filtering and pagination', type: 'auto',   model: 'Products', auth: false },
  { id: '2',  method: 'GET',    path: '/api/data/products/:id',   description: 'Get a single product by ID',                     type: 'auto',   model: 'Products', auth: false },
  { id: '3',  method: 'POST',   path: '/api/data/products',       description: 'Create a new product',                          type: 'auto',   model: 'Products', auth: true  },
  { id: '4',  method: 'PUT',    path: '/api/data/products/:id',   description: 'Update a product by ID',                        type: 'auto',   model: 'Products', auth: true  },
  { id: '5',  method: 'DELETE', path: '/api/data/products/:id',   description: 'Delete a product by ID',                        type: 'auto',   model: 'Products', auth: true  },
  { id: '6',  method: 'GET',    path: '/api/data/orders',         description: 'List all orders with filtering and pagination',  type: 'auto',   model: 'Orders',   auth: true  },
  { id: '7',  method: 'GET',    path: '/api/data/orders/:id',     description: 'Get a single order by ID',                      type: 'auto',   model: 'Orders',   auth: true  },
  { id: '8',  method: 'POST',   path: '/api/data/orders',         description: 'Create a new order',                            type: 'auto',   model: 'Orders',   auth: true  },
  { id: '9',  method: 'PUT',    path: '/api/data/orders/:id',     description: 'Update an order by ID',                         type: 'auto',   model: 'Orders',   auth: true  },
  { id: '10', method: 'GET',    path: '/api/data/users',          description: 'List all users',                                type: 'auto',   model: 'Users',    auth: true  },
  { id: '11', method: 'GET',    path: '/api/data/users/:id',      description: 'Get a single user by ID',                       type: 'auto',   model: 'Users',    auth: true  },
  { id: '12', method: 'POST',   path: '/api/custom/checkout',     description: 'Create order, send email, decrement stock',     type: 'custom', auth: true  },
  { id: '13', method: 'GET',    path: '/api/custom/sales-report', description: 'Aggregated sales report across models',         type: 'custom', auth: true  },
  { id: '14', method: 'POST',   path: '/api/custom/webhook',      description: 'Inbound webhook receiver',                      type: 'custom', auth: false },
];

const mockApiKeys: ApiKey[] = [
  { id: '1', name: 'Production Key', key: 'nxt_live_4f8a2b9c3d1e7f6a5b4c3d2e1f0a9b8c', created: '10 Jan 2025', lastUsed: '25 Apr 2025', active: true  },
  { id: '2', name: 'Dev Key',        key: 'nxt_test_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', created: '15 Jan 2025', lastUsed: '24 Apr 2025', active: true  },
  { id: '3', name: 'CI/CD Key',      key: 'nxt_test_9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4', created: '1 Mar 2025',  lastUsed: 'Never',       active: false },
];

const queryParams = [
  { param: 'limit',   type: 'number', description: 'Max results to return (default: 20)'         },
  { param: 'offset',  type: 'number', description: 'Number of results to skip for pagination'     },
  { param: 'where',   type: 'string', description: 'Filter: field:operator:value (repeatable)'    },
  { param: 'orderBy', type: 'string', description: 'Sort: field:asc or field:desc'                },
  { param: 'select',  type: 'string', description: 'Comma-separated fields to return'             },
];

const operators = [
  { op: 'eq',   example: 'status:eq:active'     },
  { op: 'neq',  example: 'status:neq:draft'      },
  { op: 'gt',   example: 'price:gt:100'          },
  { op: 'gte',  example: 'price:gte:100'         },
  { op: 'lt',   example: 'price:lt:500'          },
  { op: 'lte',  example: 'price:lte:500'         },
  { op: 'like', example: 'name:like:shoe'        },
  { op: 'in',   example: 'status:in:active,paid' },
];

const methodColors: Record<HttpMethod, string> = {
  GET:    'bg-green-50 text-green-700 border-green-200',
  POST:   'bg-blue-50 text-blue-700 border-blue-200',
  PUT:    'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  PATCH:  'bg-purple-50 text-purple-700 border-purple-200',
};

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border w-14 text-center shrink-0 ${methodColors[method]}`}>
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition shrink-0"
    >
      {copied ? <FiCheck size={13} className="text-green-500" /> : <FiCopy size={13} />}
    </button>
  );
}

function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [response, setResponse] = useState('');
  const [loading,  setLoading]  = useState(false);

  const exampleUrl = `https://yourapp.com${endpoint.path}${endpoint.method === 'GET' ? '?limit=20&offset=0' : ''}`;

  const runTest = () => {
    setLoading(true);
    setTimeout(() => {
      setResponse(JSON.stringify({
        data: endpoint.method === 'GET'
          ? [{ id: '1', name: 'Example Item', status: 'active', created_at: new Date().toISOString() }]
          : { success: true, id: Date.now().toString() },
        total:   endpoint.method === 'GET' ? 1     : undefined,
        limit:   endpoint.method === 'GET' ? 20    : undefined,
        offset:  endpoint.method === 'GET' ? 0     : undefined,
        hasMore: endpoint.method === 'GET' ? false : undefined,
      }, null, 2));
      setLoading(false);
    }, 800);
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
        onClick={() => setExpanded((v) => !v)}
      >
        <MethodBadge method={endpoint.method} />
        <p className="text-sm font-mono text-gray-800 flex-1 truncate">{endpoint.path}</p>
        <p className="text-xs text-gray-400 hidden md:block flex-1 truncate">{endpoint.description}</p>

        <div className="flex items-center gap-2 shrink-0">
          {endpoint.model && (
            <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium hidden sm:block">
              {endpoint.model}
            </span>
          )}
          {endpoint.type === 'custom' && (
            <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full font-medium hidden sm:block">
              Custom
            </span>
          )}
          {endpoint.auth
            ? <FiLock size={12} className="text-amber-500" title="Requires auth" />
            : <FiUnlock size={12} className="text-gray-300" title="Public" />
          }
          <CopyButton text={exampleUrl} />
          <button
            onClick={(e) => { e.stopPropagation(); setTestOpen((v) => !v); }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-gray-100 hover:bg-gray-800 hover:text-white text-gray-600 rounded transition opacity-0 group-hover:opacity-100"
          >
            <FiPlay size={10} /> Test
          </button>
          {expanded ? <FiChevronUp size={14} className="text-gray-400" /> : <FiChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Example Request</p>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-md">
                <span className={`text-[10px] font-bold ${
                  endpoint.method === 'GET'    ? 'text-green-400' :
                  endpoint.method === 'POST'   ? 'text-blue-400'  :
                  endpoint.method === 'DELETE' ? 'text-red-400'   : 'text-amber-400'
                }`}>{endpoint.method}</span>
                <p className="text-xs text-gray-300 font-mono flex-1 truncate">{exampleUrl}</p>
                <CopyButton text={exampleUrl} />
              </div>
            </div>

            {endpoint.auth && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Required Headers</p>
                <div className="px-3 py-2 bg-gray-900 rounded-md">
                  <p className="text-xs font-mono text-gray-300">
                    Authorization: Bearer <span className="text-amber-400">{'<your-api-key>'}</span>
                  </p>
                </div>
              </div>
            )}

            {testOpen && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Test</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={runTest}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition w-fit"
                  >
                    <FiPlay size={11} />
                    {loading ? 'Running…' : 'Send Request'}
                  </button>
                  {response && (
                    <pre className="text-[11px] bg-gray-900 text-green-400 font-mono p-3 rounded-md overflow-x-auto">
                      {response}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomEndpointDrawer({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (e: Endpoint) => void;
}) {
  const [method,      setMethod]      = useState<HttpMethod>('POST');
  const [path,        setPath]        = useState('/api/custom/');
  const [description, setDescription] = useState('');
  const [auth,        setAuth]        = useState(true);
  const [code,        setCode]        = useState(
`// Custom endpoint handler
// Call your generic API, add business logic, integrate services

export async function handler(req, res) {
  const { productId, quantity } = req.body;
  const product = await fetch(\`/api/data/products/\${productId}\`);
  // Your business logic here
  return res.json({ success: true });
}`
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-16 right-0 bottom-0 w-full max-w-lg bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">New Custom Endpoint</h2>
            <p className="text-xs text-gray-400 mt-0.5">Write business logic that calls the generic API</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
              >
                {(['GET','POST','PUT','DELETE','PATCH'] as HttpMethod[]).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-gray-700">Path</label>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/api/custom/my-endpoint"
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this endpoint do?"
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Authentication</label>
            <div className="flex gap-2">
              <button onClick={() => setAuth(true)}  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${auth  ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <FiLock size={12} /> Required
              </button>
              <button onClick={() => setAuth(false)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${!auth ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <FiUnlock size={12} /> Public
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-semibold text-gray-700">Handler Code</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-md bg-gray-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition resize-none"
            />
          </div>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={() => { onCreate({ id: Date.now().toString(), method, path, description, type: 'custom', auth }); onClose(); }}
            disabled={!path.trim()}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 transition"
          >
            Create Endpoint
          </button>
        </div>
      </div>
    </>
  );
}

function ApiKeysSection() {
  const [keys,       setKeys]       = useState<ApiKey[]>(mockApiKeys);
  const [newName,    setNewName]    = useState('');
  const [revealed,   setRevealed]   = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const maskKey = (key: string) => key.slice(0, 12) + '••••••••••••••••••••' + key.slice(-4);

  const createKey = () => {
    if (!newName.trim()) return;
    const chars = 'abcdef0123456789';
    const rand  = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setKeys((prev) => [...prev, {
      id:       Date.now().toString(),
      name:     newName.trim(),
      key:      `nxt_live_${rand}`,
      created:  new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      lastUsed: 'Never',
      active:   true,
    }]);
    setNewName('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-700">API Keys</p>
          <p className="text-[10px] text-gray-400">Keep these secret</p>
        </div>
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{k.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${k.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {k.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-mono text-gray-400">{revealed.has(k.id) ? k.key : maskKey(k.key)}</p>
                <button onClick={() => toggleReveal(k.id)} className="text-gray-400 hover:text-gray-600">
                  {revealed.has(k.id) ? <FiEyeOff size={11} /> : <FiEye size={11} />}
                </button>
                <CopyButton text={k.key} />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Created {k.created} · Last used {k.lastUsed}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {deletingId === k.id ? (
                <>
                  <button onClick={() => { setKeys((prev) => prev.filter((key) => key.id !== k.id)); setDeletingId(null); }} className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition"><FiCheck size={13} /></button>
                  <button onClick={() => setDeletingId(null)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><FiX size={13} /></button>
                </>
              ) : (
                <button onClick={() => setDeletingId(k.id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition"><FiTrash2 size={13} /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-bold text-gray-700">Create New Key</p>
        </div>
        <div className="px-5 py-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createKey()}
            placeholder="Key name e.g. Mobile App"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
          />
          <button
            onClick={createKey}
            disabled={!newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 transition"
          >
            <FiKey size={13} /> Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApiPage() {
  const [activeTab,  setActiveTab]  = useState<'endpoints' | 'keys' | 'reference'>('endpoints');
  const [filterModel,setFilterModel]= useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'custom'>('all');
  const [endpoints,  setEndpoints]  = useState<Endpoint[]>(mockEndpoints);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search,     setSearch]     = useState('');

  const models = ['all', ...Array.from(new Set(mockEndpoints.filter((e) => e.model).map((e) => e.model!)))];

  const filtered = endpoints.filter((e) => {
    const matchModel  = filterModel === 'all' || e.model === filterModel;
    const matchType   = filterType  === 'all' || e.type  === filterType;
    const matchSearch = e.path.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    return matchModel && matchType && matchSearch;
  });

  const tabs = [
    { id: 'endpoints', label: 'Endpoints', count: endpoints.length },
    { id: 'keys',      label: 'API Keys',  count: mockApiKeys.filter((k) => k.active).length },
    { id: 'reference', label: 'Reference', count: null },
  ] as const;

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">API</h1>
          <p className="text-xs text-gray-400 mt-0.5">Generic endpoints auto-generated from your models</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
        >
          <FiPlus size={15} /> Custom Endpoint
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 flex gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {activeTab === 'endpoints' && (
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search endpoints…"
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition w-56"
              />
              <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white text-xs font-medium">
                {(['all', 'auto', 'custom'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-2 capitalize border-r border-gray-200 last:border-0 transition-colors ${filterType === t ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white text-xs font-medium">
                {models.map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterModel(m)}
                    className={`px-3 py-2 capitalize border-r border-gray-200 last:border-0 transition-colors ${filterModel === m ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_1fr_auto] gap-x-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Method</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Path</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Description</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Actions</p>
              </div>
              {filtered.map((e) => <EndpointRow key={e.id} endpoint={e} />)}
              {filtered.length === 0 && (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <p className="text-sm">No endpoints match your filter</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="max-w-2xl mx-auto">
            <ApiKeysSection />
          </div>
        )}

        {activeTab === 'reference' && (
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-gray-800">Query Parameters</p>
                <p className="text-xs text-gray-400 mt-0.5">Available on all GET endpoints</p>
              </div>
              <div className="divide-y divide-gray-100">
                {queryParams.map((p) => (
                  <div key={p.param} className="flex items-start gap-4 px-5 py-3">
                    <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800 shrink-0">{p.param}</code>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">{p.type}</span>
                    <p className="text-xs text-gray-600">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-gray-800">Filter Operators</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Use with the <code className="bg-gray-100 px-1 rounded">where</code> parameter as{' '}
                  <code className="bg-gray-100 px-1 rounded">field:operator:value</code>
                </p>
              </div>
              <div className="grid grid-cols-2 divide-y divide-gray-100">
                {operators.map((o) => (
                  <div key={o.op} className="flex items-center gap-3 px-5 py-3 border-r border-gray-100 odd:border-r even:border-r-0">
                    <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800 w-10 text-center shrink-0">{o.op}</code>
                    <code className="text-xs font-mono text-gray-500">{o.example}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-gray-800">Full Example</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <p className="text-xs text-gray-500">Fetch active products under R500, sorted by price, returning only id/name/price:</p>
                <div className="flex items-start gap-2 px-3 py-3 bg-gray-900 rounded-md">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap flex-1">{`GET /api/data/products
  ?where=status:eq:active
  &where=price:lt:500
  &orderBy=price:asc
  &select=id,name,price
  &limit=20
  &offset=0`}</pre>
                  <CopyButton text={`/api/data/products?where=status:eq:active&where=price:lt:500&orderBy=price:asc&select=id,name,price&limit=20&offset=0`} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Response:</p>
                <pre className="text-xs bg-gray-900 text-green-400 font-mono p-3 rounded-md overflow-x-auto">{`{
  "data": [
    { "id": "1", "name": "Running Shoes", "price": 299 },
    { "id": "2", "name": "Yoga Mat",      "price": 149 }
  ],
  "total":   2,
  "limit":   20,
  "offset":  0,
  "hasMore": false
}`}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomEndpointDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreate={(e) => setEndpoints((prev) => [...prev, e])}
      />
    </div>
  );
}