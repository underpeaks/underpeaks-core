'use client';

/**
 * @file IntegrationsPage.tsx
 * @description
 * The Integrations page for the admin console. It allows users to connect,
 * configure, and disconnect third-party services such as payment processors,
 * email providers, storage buckets, AI APIs, and automation tools.
 *
 * What can the user do on this page?
 * ------------------------------------
 * - Browse all available integrations, filterable by category via tab buttons.
 * - See at a glance which integrations are connected, disconnected, or in error.
 * - Expand any integration card to reveal its configuration fields.
 * - Enter API keys and credentials and click "Save & Connect" to activate.
 * - Disconnect a connected integration, which clears its stored values.
 * - Retry a failed connection for integrations in error state.
 * - Open the integration's official documentation in a new tab.
 *
 * How does the expand/collapse work?
 * ------------------------------------
 * Only one integration card can be open at a time. The `expandedId` state holds
 * the id of the currently open card (or null if none are open). Clicking a card
 * header toggles it — if it was already open, it closes; otherwise it opens and
 * the previous card closes automatically.
 *
 * How does Save & Connect work?
 * ------------------------------
 * Each IntegrationCard manages its own local `values` state for the form fields.
 * When the user clicks "Save & Connect", we simulate an 800ms save delay, then
 * call `onUpdate` to update the integration's status to 'connected' and persist
 * the new values in the parent's state. In production, this would make an API call.
 *
 * ⚠️  Security note:
 * Credential fields (API keys, secrets) use type="password" inputs so the browser
 * masks the values. Never log these field values.
 */

import { useState } from 'react';
import {
  FiCheck, FiX, FiExternalLink, FiAlertCircle,
  FiChevronDown, FiChevronUp, FiRefreshCw, FiZap,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef IntegrationStatus
 * The three possible states an integration can be in:
 *   - 'connected'    — credentials are saved and the connection is active.
 *   - 'disconnected' — not yet configured or manually disconnected.
 *   - 'error'        — was connected but the connection is now failing.
 */
type IntegrationStatus = 'connected' | 'disconnected' | 'error';

/**
 * @typedef IntegrationField
 * Describes a single configurable input field for an integration.
 *
 * @property {string} key         - Unique key used to store the field value in the values map.
 * @property {string} label       - Human-readable label shown above the input.
 * @property {'text'|'password'|'url'} type - Input type; 'password' masks the value in the browser.
 * @property {string} placeholder - Example text shown inside the input when empty.
 */
type IntegrationField = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder: string;
};

/**
 * @typedef Integration
 * Represents a single third-party service integration.
 *
 * @property {string} id                     - Unique identifier (e.g. 'stripe', 'sendgrid').
 * @property {string} name                   - Display name of the service.
 * @property {string} description            - Short description of what the service does.
 * @property {string} category               - Category key used for tab filtering.
 * @property {IntegrationStatus} status      - Current connection state.
 * @property {string} logo                   - Emoji used as the integration's avatar.
 * @property {string} docsUrl                - URL to the integration's official documentation.
 * @property {IntegrationField[]} fields     - The configuration fields the user needs to fill in.
 * @property {Record<string, string>} values - The currently saved field values (keyed by field.key).
 */
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

// ─── Static Data ──────────────────────────────────────────────────────────────

/**
 * The full list of available integrations shown on the page.
 * In production, this would be fetched from an API or configuration file.
 * ⚠️ Partially pre-filled values here are masked display strings — not real credentials.
 */
const initialIntegrations: Integration[] = [
  {
    id: 'stripe', name: 'Stripe', description: 'Accept payments, manage subscriptions and invoices.',
    category: 'payments', status: 'connected', logo: '💳', docsUrl: 'https://stripe.com/docs',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', type: 'text',     placeholder: 'pk_live_…' },
      { key: 'secret_key',      label: 'Secret Key',      type: 'password', placeholder: 'sk_live_…' },
      { key: 'webhook_secret',  label: 'Webhook Secret',  type: 'password', placeholder: 'whsec_…'   },
    ],
    values: { publishable_key: 'pk_live_••••••••3a9f', secret_key: '', webhook_secret: '' },
  },
  {
    id: 'sendgrid', name: 'SendGrid', description: 'Transactional and marketing email delivery at scale.',
    category: 'email', status: 'disconnected', logo: '📧', docsUrl: 'https://docs.sendgrid.com',
    fields: [
      { key: 'api_key',    label: 'API Key',    type: 'password', placeholder: 'SG.…'             },
      { key: 'from_email', label: 'From Email', type: 'text',     placeholder: 'no-reply@you.com' },
    ],
    values: {},
  },
  {
    id: 'twilio', name: 'Twilio', description: 'SMS, WhatsApp, and voice messaging for your users.',
    category: 'email', status: 'disconnected', logo: '📱', docsUrl: 'https://www.twilio.com/docs',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text',     placeholder: 'AC…'        },
      { key: 'auth_token',  label: 'Auth Token',  type: 'password', placeholder: 'your token' },
      { key: 'from_number', label: 'From Number', type: 'text',     placeholder: '+1234567890' },
    ],
    values: {},
  },
  {
    id: 's3', name: 'AWS S3', description: 'Store and serve files, images, and assets at scale.',
    category: 'storage', status: 'error', logo: '🗄️', docsUrl: 'https://docs.aws.amazon.com/s3',
    fields: [
      { key: 'access_key', label: 'Access Key ID',     type: 'text',     placeholder: 'AKIA…'       },
      { key: 'secret_key', label: 'Secret Access Key', type: 'password', placeholder: 'your secret' },
      { key: 'bucket',     label: 'Bucket Name',       type: 'text',     placeholder: 'my-bucket'   },
      { key: 'region',     label: 'Region',            type: 'text',     placeholder: 'us-east-1'   },
    ],
    values: { access_key: 'AKIA••••••••XYZ', secret_key: '', bucket: 'nxtflutter-assets', region: 'us-east-1' },
  },
  {
    id: 'cloudflare-r2', name: 'Cloudflare R2', description: 'S3-compatible object storage with zero egress fees.',
    category: 'storage', status: 'disconnected', logo: '☁️', docsUrl: 'https://developers.cloudflare.com/r2',
    fields: [
      { key: 'account_id', label: 'Account ID',        type: 'text',     placeholder: 'your account id' },
      { key: 'access_key', label: 'Access Key ID',     type: 'text',     placeholder: 'your access key' },
      { key: 'secret_key', label: 'Secret Access Key', type: 'password', placeholder: 'your secret'     },
      { key: 'bucket',     label: 'Bucket Name',       type: 'text',     placeholder: 'my-r2-bucket'    },
    ],
    values: {},
  },
  {
    id: 'openai', name: 'OpenAI', description: 'Add AI-powered features — chat, embeddings, image generation.',
    category: 'ai', status: 'connected', logo: '🤖', docsUrl: 'https://platform.openai.com/docs',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-…'  },
      { key: 'org_id',  label: 'Org ID',  type: 'text',     placeholder: 'org-…' },
    ],
    values: { api_key: 'sk-••••••••••••proj', org_id: '' },
  },
  {
    id: 'google-analytics', name: 'Google Analytics', description: 'Track page views, events, and user behaviour.',
    category: 'analytics', status: 'disconnected', logo: '📊', docsUrl: 'https://developers.google.com/analytics',
    fields: [
      { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
    ],
    values: {},
  },
  {
    id: 'zapier', name: 'Zapier', description: 'Connect to 5,000+ apps and automate workflows.',
    category: 'automation', status: 'disconnected', logo: '⚡', docsUrl: 'https://zapier.com/developer',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/…' },
    ],
    values: {},
  },
  {
    id: 'make', name: 'Make (Integromat)', description: 'Visual automation builder for complex multi-step workflows.',
    category: 'automation', status: 'disconnected', logo: '🔄', docsUrl: 'https://www.make.com/en/help',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hook.make.com/…' },
    ],
    values: {},
  },
];

/**
 * The category filter tabs shown below the toolbar.
 * `id` is matched against integration.category for filtering.
 * `labelKey` maps to a translation key under "integrations.categories".
 */
const categories: { id: string; labelKey: string }[] = [
  { id: 'all',        labelKey: 'all'        },
  { id: 'payments',   labelKey: 'payments'   },
  { id: 'email',      labelKey: 'email'      },
  { id: 'storage',    labelKey: 'storage'    },
  { id: 'ai',         labelKey: 'ai'         },
  { id: 'analytics',  labelKey: 'analytics'  },
  { id: 'automation', labelKey: 'automation' },
];

/**
 * Visual config for each integration status.
 * Each entry provides Tailwind classes for the status badge and its dot indicator.
 * Labels are translated via t() at render time using the statusKey.
 */
const statusConfig: Record<IntegrationStatus, { statusKey: string; className: string; dot: string }> = {
  connected:    { statusKey: 'connected',    className: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  disconnected: { statusKey: 'disconnected', className: 'bg-gray-100 text-gray-500 border-gray-200',  dot: 'bg-gray-300'  },
  error:        { statusKey: 'error',        className: 'bg-red-50 text-red-600 border-red-200',       dot: 'bg-red-500'   },
};

// ─── IntegrationCard Sub-component ───────────────────────────────────────────

/**
 * @component IntegrationCard
 * @description
 * Renders a single integration as a card with a collapsed summary row and
 * an expandable configuration form panel.
 *
 * The card header always shows:
 *   - The integration's emoji logo
 *   - Name and status badge
 *   - Description
 *   - Docs link button and expand/collapse chevron
 *
 * When expanded, the card shows:
 *   - Input fields for each required credential
 *   - Save & Connect, Disconnect (if connected), or Retry (if error) buttons
 *
 * @param {{ integration, expanded, onToggle, onUpdate }} props
 */
function IntegrationCard({
  integration,
  expanded,
  onToggle,
  onUpdate,
  t,
}: {
  integration: Integration;
  expanded: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Integration>) => void;
  t: (key: string, values?: Record<string, any>) => string;
}) {
  /**
   * Local copy of the field values for this card's form.
   * Initialised from the integration's current saved values.
   * ⚠️ Never log these values — they contain API keys and secrets.
   */
  const [values, setValues] = useState<Record<string, string>>(integration.values);

  /** True while the save operation is in progress (shows spinner). */
  const [saving, setSaving] = useState(false);

  /** True for 2 seconds after a successful save (shows tick icon). */
  const [saved, setSaved] = useState(false);

  const sc = statusConfig[integration.status];

  /**
   * @function handleSave
   * Simulates saving credentials with an 800ms delay, then updates the
   * integration status to 'connected' and notifies the parent via onUpdate.
   * In production, this would POST the values to a secure API endpoint.
   * ⚠️ Never log the values object here.
   */
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      onUpdate(integration.id, { values, status: 'connected' });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  /**
   * @function handleDisconnect
   * Clears all saved credential values and sets the integration status back
   * to 'disconnected'. Also collapses the card.
   */
  const handleDisconnect = () => {
    onUpdate(integration.id, { status: 'disconnected', values: {} });
    setValues({});
    onToggle(integration.id);
  };

  return (
    <div className={`bg-white border rounded-lg overflow-hidden transition-shadow hover:shadow-sm ${
      integration.status === 'error' ? 'border-red-200' : 'border-gray-200'
    }`}>

      {/* ── Card Header (always visible) ── */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer"
        onClick={() => onToggle(integration.id)}
      >
        {/* Logo emoji avatar */}
        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-xl shrink-0 select-none">
          {integration.logo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
            {/* Status badge with colour-coded dot */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
              {t(`status.${sc.statusKey}`)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{integration.description}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Error indicator icon */}
          {integration.status === 'error' && (
            <FiAlertCircle size={15} className="text-red-500" />
          )}
          {/* Docs link — stopPropagation prevents the card from toggling when clicked */}
          <button
            type="button"
            title={t('card.viewDocs')}
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

      {/* ── Expanded Configuration Form ── */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 flex flex-col gap-3">

          {/* One input per integration field */}
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

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">

            {/* Save & Connect — always shown */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {saving && <FiRefreshCw size={12} className="animate-spin" />}
              {!saving && saved && <FiCheck size={12} />}
              {saving
                ? t('card.buttons.saving')
                : saved
                ? t('card.buttons.saved')
                : t('card.buttons.saveAndConnect')
              }
            </button>

            {/* Disconnect — only shown when connected */}
            {integration.status === 'connected' && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-500 text-xs font-medium rounded-md hover:bg-red-50 transition"
              >
                <FiX size={12} /> {t('card.buttons.disconnect')}
              </button>
            )}

            {/* Retry — only shown when in error state */}
            {integration.status === 'error' && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition"
              >
                <FiRefreshCw size={12} /> {t('card.buttons.retryConnection')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

/**
 * @component IntegrationsPage
 * @description
 * The root integrations page component. Manages:
 *   - The full list of integration definitions and their current state.
 *   - The active category filter tab.
 *   - Which integration card is currently expanded.
 *   - Applying updates from child cards back to the integrations list.
 *
 * @returns {JSX.Element}
 */
export default function IntegrationsPage() {
  /**
   * t() is the translation function from next-intl.
   * All keys for this page live under the "integrations" namespace in en.json.
   */
  const t = useTranslations('integrations');

  /**
   * The full list of integrations and their current state.
   * Updated when the user saves or disconnects an integration.
   */
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);

  /**
   * The currently selected category tab id.
   * 'all' shows every integration; other values filter by integration.category.
   */
  const [activeCategory, setActiveCategory] = useState<string>('all');

  /**
   * The id of the currently expanded integration card, or null if none are open.
   * Only one card can be open at a time.
   */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /**
   * @function handleToggle
   * Toggles the expanded state of an integration card.
   * If the clicked card is already open, it closes. Otherwise it opens
   * and any previously open card closes automatically.
   *
   * @param {string} id - The id of the card to toggle.
   */
  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  /**
   * @function handleUpdate
   * Applies partial updates to a specific integration in the list.
   * Called by IntegrationCard when the user saves or disconnects.
   *
   * @param {string} id                    - The id of the integration to update.
   * @param {Partial<Integration>} updates - The fields to update (e.g. { status, values }).
   */
  const handleUpdate = (id: string, updates: Partial<Integration>) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  // ─── Derived Data ───────────────────────────────────────────────────────────

  /** The integrations to show, filtered by the active category tab. */
  const filtered = integrations.filter(
    (i) => activeCategory === 'all' || i.category === activeCategory
  );

  /** Number of integrations with status 'connected' — shown in the toolbar. */
  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  /** Number of integrations with status 'error' — shown as a warning in the toolbar. */
  const errorCount = integrations.filter((i) => i.status === 'error').length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-gray-900">{t('toolbar.title')}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            {/* Connected count */}
            <p className="text-xs text-gray-400">
              {t('toolbar.connectedCount', { count: connectedCount })}
            </p>
            {/* Error count — only shown when there are errors */}
            {errorCount > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <FiAlertCircle size={11} />
                {t('toolbar.errorCount', { count: errorCount })}
              </p>
            )}
          </div>
        </div>

        {/* Info banner about how integrations are used */}
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
          <FiZap size={13} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            {t('toolbar.infoBanner')}
          </p>
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
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
            {t(`categories.${cat.labelKey}`)}
          </button>
        ))}
      </div>

      {/* ── Integration Cards List ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              expanded={expandedId === integration.id}
              onToggle={handleToggle}
              onUpdate={handleUpdate}
              t={t}
            />
          ))}

          {/* Empty state — shown when no integrations match the selected category */}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <p className="text-sm">{t('empty')}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}