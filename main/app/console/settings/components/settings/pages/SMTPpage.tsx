'use client';

import { useState } from 'react';
import { SectionCard, Field, Input, Toggle, SaveButton } from '../shared';

export default function SmtpPage() {
  const [verifyEmail,    setVerifyEmail]    = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [smtpEnabled,    setSmtpEnabled]    = useState(false);

  const showSmtpFields = smtpEnabled || verifyEmail || forgotPassword;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">SMTP Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure outbound email for your project.</p>
      </div>

      <SectionCard title="Email Features">
        <Toggle checked={verifyEmail}    onChange={setVerifyEmail}    label="Enable email verification on sign-up" />
        <Toggle checked={forgotPassword} onChange={setForgotPassword} label="Enable forgot password emails" />
        <Toggle checked={smtpEnabled}    onChange={setSmtpEnabled}    label="Use custom SMTP server" />
      </SectionCard>

      {showSmtpFields && (
        <SectionCard title="SMTP Configuration">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SMTP Host">
              <Input placeholder="smtp.example.com" />
            </Field>
            <Field label="Port">
              <Input placeholder="587" />
            </Field>
          </div>
          <Field label="From Address">
            <Input placeholder="no-reply@example.com" type="email" />
          </Field>
          <Field label="Username">
            <Input placeholder="SMTP username" />
          </Field>
          <Field label="Password">
            <Input placeholder="SMTP password" type="password" />
          </Field>
          <Field label="Encryption">
            <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition">
              <option>TLS</option>
              <option>SSL</option>
              <option>None</option>
            </select>
          </Field>
          <SaveButton />
        </SectionCard>
      )}
    </div>
  );
}