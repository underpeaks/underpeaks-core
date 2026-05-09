'use client';

import { useState } from 'react';
import {
  FiCheck, FiX, FiExternalLink, FiAlertCircle,
  FiChevronDown, FiChevronUp, FiRefreshCw, FiZap,
} from 'react-icons/fi';

type IntegrationStatus = 'connected' | 'disconnected' | 'error';

type IntegrationField = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder: string;
};

type Integration = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  logo: string;
  docsUrl: string;
  fields: IntegrationField[];
  values: Record<string, string>;
};

const initialIntegrations: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments, manage subscriptions and invoices.',
    category: 'payments',
    status: 'connected',
    logo: '💳',
    docsUrl: 'https://stripe.com/docs',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', type: 'text',     placeholder: 'pk_live_…' },
      { key: 'secret_key',      label: 'Secret Key',      type: 'password', placeholder: 'sk_live_…' },
      { key: 'webhook_secret',  label: 'Webhook Secret',  type: 'password', placeholder: 'whsec_…'   },
    ],
    values: { publishable_key: 'pk_live_••••••••3a9f', secret_key: '', webhook_secret: '' },
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Transactional and marketing email delivery at scale.',
    category: 'email',
    status: 'disconnected',
    logo: '📧',
    docsUrl: 'https://docs.sendgrid.com',
    fields: [
      { key: 'api_key',    label: 'API Key',    type: 'password', placeholder: 'SG.…'             },
      { key: 'from_email', label: 'From Email', type: 'text',     placeholder: 'no-reply@you.com' },
    ],
    values: {},
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS, WhatsApp, and voice messaging for your users.',
    category: 'email',
    status: 'disconnected',
    logo: '📱',
    docsUrl: 'https://www.twilio.com/docs',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text',     placeholder: 'AC…'        },
      { key: 'auth_token',  label: 'Auth Token',  type: 'password', placeholder: 'your token' },
      { key: 'from_number', label: 'From Number', type: 'text',     placeholder: '+1234567890' },
    ],
    values: {},
  },
  {
    id: 's3',
    name: 'AWS S3',
    description: 'Store and serve files, images, and assets at scale.',
    category: 'storage',
    status: 'error',
    logo: '🗄️',
    docsUrl: 'https://docs.aws.amazon.com/s3',
    fields: [
      { key: 'access_key', label: 'Access Key ID',     type: 'text',     placeholder: 'AKIA…'       },
      { key: 'secret_key', label: 'Secret Access Key', type: 'password', placeholder: 'your secret' },
      { key: 'bucket',     label: 'Bucket Name',       type: 'text',     placeholder: 'my-bucket'   },
      { key: 'region',     label: 'Region',            type: 'text',     placeholder: 'us-east-1'   },
    ],
    values: { access_key: 'AKIA••••••••XYZ', secret_key: '', bucket: 'nxtflutter-assets', region: 'us-east-1' },
  },
  {
    id: 'cloudflare-r2',
    name: 'Cloudflare R2',
    description: 'S3-compatible object storage with zero egress fees.',
    category: 'storage',
    status: 'disconnected',
    logo: '☁️',
    docsUrl: 'https://developers.cloudflare.com/r2',
    fields: [
      { key: 'account_id', label: 'Account ID',        type: 'text',     placeholder: 'your account id' },
      { key: 'access_key', label: 'Access Key ID',     type: 'text',     placeholder: 'your access key' },
      { key: 'secret_key', label: 'Secret Access Key', type: 'password', placeholder: 'your secret'     },
      { key: 'bucket',     label: 'Bucket Name',       type: 'text',     placeholder: 'my-r2-bucket'    },
    ],
    values: {},
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Add AI-powered features — chat, embeddings, image generation.',
    category: 'ai',
    status: 'connected',
    logo: '🤖',
    docsUrl: 'https://platform.openai.com/docs',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-…'  },
      { key: 'org_id',  label: 'Org ID',  type: 'text',     placeholder: 'org-…' },
    ],
    values: { api_key: 'sk-••••••••••••proj', org_id: '' },
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track page views, events, and user behaviour.',
    category: 'analytics',
    status: 'disconnected',
    logo: '📊',
    docsUrl: 'https://developers.google.com/analytics',
    fields: [
      { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
    ],
    values: {},
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5,000+ apps and automate workflows.',
    category: 'automation',
    status: 'disconnected',
    logo: '⚡',
    docsUrl: 'https://zapier.com/developer',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/…' },
    ],
    values: {},
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Visual automation builder for complex multi-step workflows.',
    category: 'automation',
    status: 'disconnected',
    logo: '🔄',
    docsUrl: 'https://www.make.com/en/help',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hook.make.com/…' },
    ],
    values: {},
  },
];

const categories: { id: string; label: string }[] = [
  { id: 'all',        label: 'All'         },
  { id: 'payments',   label: 'Payments'    },
  { id: 'email',      label: 'Email & SMS' },
  { id: 'storage',    label: 'Storage'     },
  { id: 'ai',         label: 'AI'          },
  { id: 'analytics',  label: 'Analytics'   },
  { id: 'automation', label: 'Automation'  },
];

const statusConfig: Record<IntegrationStatus, { label: string; className: string; dot: string }> = {
  connected:    { label: 'Connected',    className: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  disconnected: { label: 'Disconnected', className: 'bg-gray-100 text-gray-500 border-gray-200',  dot: 'bg-gray-300'  },
  error:        { label: 'Error',        className: 'bg-red-50 text-red-600 border-red-200',       dot: 'bg-red-500'   },
};

function IntegrationCard({
  integration,
  expanded,
  onToggle,
  onUpdate,
}: {
  integration: Integration;
  expanded: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Integration>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(integration.values);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const sc = statusConfig[integration.status];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      onUpdate(integration.id, { values, status: 'connected' });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const handleDisconnect = () => {
    onUpdate(integration.id, { status: 'disconnected', values: {} });
    setValues({});
    onToggle(integration.id);
  };

  return (
    <div className={`bg-white border rounded-lg overflow-hidden transition-shadow hover:shadow-sm ${
      integration.status === 'error' ? 'border-red-200' : 'border-gray-200'
    }`}>
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer"
        onClick={() => onToggle(integration.id)}
      >
        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-xl shrink-0 select-none">
          {integration.logo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
              {sc.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{integration.description}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {integration.status === 'error' && (
            <FiAlertCircle size={15} className="text-red-500" />
          )}
          <button
            type="button"
            title="View docs"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            onClick={(e) => { e.stopPropagation(); window.open(integration.docsUrl, '_blank'); }}
          >
            <FiExternalLink size={13} />
          </button>
          {expanded
            ? <FiChevronUp size={15} className="text-gray-400" />
            : <FiChevronDown size={15} className="text-gray-400" />
          }
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 flex flex-col gap-3">
          {integration.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">{field.label}</label>
              <input
                type={field.type === 'password' ? 'password' : 'text'}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition font-mono"
              />
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {saving && <FiRefreshCw size={12} className="animate-spin" />}
              {!saving && saved && <FiCheck size={12} />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save & Connect'}
            </button>

            {integration.status === 'connected' && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-500 text-xs font-medium rounded-md hover:bg-red-50 transition"
              >
                <FiX size={12} /> Disconnect
              </button>
            )}

            {integration.status === 'error' && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition"
              >
                <FiRefreshCw size={12} /> Retry Connection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [integrations,   setIntegrations]   = useState<Integration[]>(initialIntegrations);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedId,     setExpandedId]     = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleUpdate = (id: string, updates: Partial<Integration>) => {
    setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const filtered = integrations.filter(
    (i) => activeCategory === 'all' || i.category === activeCategory
  );

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const errorCount     = integrations.filter((i) => i.status === 'error').length;

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-gray-900">Integrations</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-gray-400">{connectedCount} connected</p>
            {errorCount > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <FiAlertCircle size={11} />
                {errorCount} error{errorCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
          <FiZap size={13} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Connected integrations are available in custom endpoints and code generation
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 flex overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setActiveCategory(cat.id); setExpandedId(null); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeCategory === cat.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              expanded={expandedId === integration.id}
              onToggle={handleToggle}
              onUpdate={handleUpdate}
            />
          ))}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <p className="text-sm">No integrations in this category</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}