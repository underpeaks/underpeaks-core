'use client';

import { useState } from 'react';
import { FiCheck, FiLock, FiZap } from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────
type Flag = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  paid: boolean;
};

type FlagGroup = {
  title: string;
  flags: Flag[];
};

// ── Flag definitions ──────────────────────────────────────────────────────────
const initialGroups: FlagGroup[] = [
  {
    title: 'Appearance',
    flags: [
      { id: 'dark-mode',       label: 'Dark Mode',             description: 'Allow users to switch between light and dark themes in the app',    enabled: true,  paid: false },
      { id: 'system-theme',    label: 'Follow System Theme',   description: 'Automatically match the device light/dark mode setting',            enabled: true,  paid: false },
    ],
  },
  {
    title: 'Localisation',
    flags: [
      { id: 'multi-language',  label: 'Multi-language Support', description: 'Enable multiple language support in the generated app',            enabled: false, paid: false },
      { id: 'rtl-support',     label: 'RTL Support',            description: 'Right-to-left layout for Arabic, Hebrew and similar languages',    enabled: false, paid: false },
    ],
  },
  {
    title: 'App Behaviour',
    flags: [
      { id: 'offline-mode',    label: 'Offline Mode',           description: 'Cache data locally so the app works without an internet connection', enabled: false, paid: false },
      { id: 'push-notifications', label: 'Push Notifications',  description: 'Enable push notification support via FCM — you provide the keys',  enabled: false, paid: false },
      { id: 'splash-screen',   label: 'Splash Screen',          description: 'Show a branded splash screen when the app launches',               enabled: true,  paid: false },
      { id: 'onboarding',      label: 'Onboarding Flow',        description: 'Show a welcome/onboarding flow for new users',                     enabled: false, paid: false },
    ],
  },
  {
    title: 'Authentication — Paid',
    flags: [
      { id: '2fa',             label: 'Two-Factor Authentication', description: 'Require OTP or authenticator app for login',                    enabled: false, paid: true  },
      { id: 'biometric',       label: 'Biometric Login',        description: 'Fingerprint and Face ID login on mobile',                         enabled: false, paid: true  },
      { id: 'social-login',    label: 'Social Login',           description: 'Google, GitHub, Apple and Facebook OAuth',                        enabled: false, paid: true  },
      { id: 'magic-link',      label: 'Magic Link',             description: 'Passwordless login via email link',                               enabled: false, paid: true  },
      { id: 'sso',             label: 'SSO / SAML',             description: 'Enterprise single sign-on integration',                           enabled: false, paid: true  },
    ],
  },
  {
    title: 'Advanced — Paid',
    flags: [
      { id: 'analytics',       label: 'In-app Analytics',       description: 'Track screen views and events inside the generated app',           enabled: false, paid: true  },
      { id: 'ab-testing',      label: 'A/B Testing',            description: 'Run feature experiments across your user base',                    enabled: false, paid: true  },
      { id: 'feature-gating',  label: 'Feature Gating',         description: 'Show or hide features based on user plan or role',                enabled: false, paid: true  },
    ],
  },
];

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${checked && !disabled ? 'bg-gray-800' : 'bg-gray-300'}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Upgrade prompt ────────────────────────────────────────────────────────────
function UpgradePrompt() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <FiZap size={16} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">Hosted plan required</p>
        <p className="text-[11px] text-amber-600 mt-0.5">
          These features require NXTFlutter's hosted infrastructure. Upgrade to unlock them.
        </p>
      </div>
      <button className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-md hover:bg-amber-600 transition">
        Upgrade
      </button>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, isPaid, children }: { title: string; isPaid?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${isPaid ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className={`px-5 py-3.5 border-b flex items-center gap-2 ${isPaid ? 'border-amber-100 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
        {isPaid && <FiLock size={13} className="text-amber-500 shrink-0" />}
        <h3 className={`text-sm font-semibold ${isPaid ? 'text-amber-800' : 'text-gray-800'}`}>{title}</h3>
        {isPaid && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
            PAID
          </span>
        )}
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FeatureFlagsPage() {
  const [groups, setGroups] = useState<FlagGroup[]>(initialGroups);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const toggleFlag = (groupTitle: string, flagId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.title === groupTitle
          ? { ...g, flags: g.flags.map((f) => (f.id === flagId ? { ...f, enabled: !f.enabled } : f)) }
          : g
      )
    );
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }, 800);
  };

  const freeGroups = groups.filter((g) => !g.flags.every((f) => f.paid));
  const paidGroups = groups.filter((g) => g.flags.every((f) => f.paid));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Feature Flags</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Toggle features that will be included in your generated Flutter and Next.js apps.
        </p>
      </div>

      {/* Free flags */}
      {freeGroups.map((group) => (
        <SectionCard key={group.title} title={group.title}>
          {group.flags.map((flag, i) => (
            <div
              key={flag.id}
              className={`flex items-center gap-4 py-3 ${i < group.flags.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{flag.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{flag.description}</p>
              </div>
              <Toggle
                checked={flag.enabled}
                onChange={() => toggleFlag(group.title, flag.id)}
              />
            </div>
          ))}
        </SectionCard>
      ))}

      {/* Paid flags */}
      <UpgradePrompt />

      {paidGroups.map((group) => (
        <SectionCard key={group.title} title={group.title} isPaid>
          {group.flags.map((flag, i) => (
            <div
              key={flag.id}
              className={`flex items-center gap-4 py-3 ${i < group.flags.length - 1 ? 'border-b border-amber-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">{flag.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{flag.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <FiLock size={12} className="text-amber-400" />
                <Toggle checked={false} onChange={() => {}} disabled />
              </div>
            </div>
          ))}
        </SectionCard>
      ))}

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <FiCheck size={13} /> Saved
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save Flags'}
        </button>
      </div>
    </div>
  );
}