'use client';

import { useState } from 'react';
import { FiSearch, FiChevronDown, FiChevronUp, FiBook, FiCode, FiMessageSquare, FiExternalLink, FiMail, FiCheck } from 'react-icons/fi';

const faqs = [
  {
    id: 1,
    question: 'How do I connect my database?',
    answer: 'Go to Settings → Overview and select your database type. NXTFlutter supports Supabase, Firebase, PostgreSQL, MySQL, and MongoDB. Enter your connection credentials and click Save — the platform will test the connection automatically.',
  },
  {
    id: 2,
    question: 'What is the difference between self-hosted and hosted?',
    answer: 'Self-hosted is free and open source — you run it on your own server and manage your own database. Hosted (console.nxtflutter.com) is a managed service with two tiers: Pro (dedicated schema) and Enterprise (dedicated database), and includes integrations, advanced auth, and white-labelling.',
  },
  {
    id: 3,
    question: 'How do I generate a Flutter or Next.js app?',
    answer: 'App generation is coming in a future release. You will be able to define your models and pages inside the CMS and generate a fully working Flutter or Next.js app from them with one click.',
  },
  {
    id: 4,
    question: 'How does the generic API work?',
    answer: 'All data endpoints follow a single pattern: GET /api/data/[model], POST /api/data/[model], PUT /api/data/[model]/[id], DELETE /api/data/[model]/[id]. You can filter using query strings with operators like eq, neq, gt, gte, lt, lte, like, and in.',
  },
  {
    id: 5,
    question: 'Can I use my own domain for the console?',
    answer: 'Custom domains for the console are a paid feature available on the hosted plan. On self-hosted you can configure your own reverse proxy (e.g. Nginx or Caddy) to serve the console on any domain you control.',
  },
  {
    id: 6,
    question: 'How do I enable 2FA or social login?',
    answer: 'Advanced auth features including 2FA, social login, magic link, biometric login, and SSO are paid features available on the hosted Pro or Enterprise plan. You can see them under Theming → Feature Flags — they appear locked with an upgrade prompt on the free tier.',
  },
];

const docLinks = [
  { icon: FiBook,         label: 'Getting Started',      href: 'https://docs.nxtflutter.com/getting-started',  description: 'Set up your first project in minutes.' },
  { icon: FiCode,         label: 'API Reference',         href: 'https://docs.nxtflutter.com/api',              description: 'Full reference for all API endpoints and operators.' },
  { icon: FiMessageSquare, label: 'Community Forum',      href: 'https://community.nxtflutter.com',             description: 'Ask questions and share projects with the community.' },
];

const apiEndpoints = [
  { method: 'GET',    path: '/api/data/[model]',     description: 'List all records for a model. Supports filtering, sorting, pagination.' },
  { method: 'POST',   path: '/api/data/[model]',     description: 'Create a new record.' },
  { method: 'PUT',    path: '/api/data/[model]/[id]', description: 'Update an existing record by ID.' },
  { method: 'DELETE', path: '/api/data/[model]/[id]', description: 'Delete a record by ID.' },
];

const methodColor: Record<string, string> = {
  GET:    'bg-green-100 text-green-700',
  POST:   'bg-blue-100 text-blue-700',
  PUT:    'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

function FaqItem({ faq }: { faq: typeof faqs[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{faq.question}</span>
        {open ? <FiChevronUp size={15} className="text-gray-400 shrink-0" /> : <FiChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpCenterPage() {
  const [search,       setSearch]       = useState('');
  const [contactName,  setContactName]  = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg,   setContactMsg]   = useState('');
  const [submitted,    setSubmitted]    = useState(false);

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    if (!contactName || !contactEmail || !contactMsg) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
    }, 3000);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition";

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Header + search ── */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="text-sm text-gray-500 mt-1">Find answers, read the docs, or get in touch.</p>
          <div className="relative mt-5 max-w-lg mx-auto">
            <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FAQs…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            />
          </div>
        </div>

        {/* ── Docs / resource links ── */}
       <div>
  <h2 className="text-sm font-semibold text-gray-700 mb-3">Resources</h2>

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {docLinks.map((link) => (
      <a
        key={link.label}
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="group block p-3 border rounded-lg hover:bg-gray-50 transition"
      >
        <div className="flex items-center justify-between">
          <link.icon size={18} className="text-gray-500" />
          <FiExternalLink
            size={13}
            className="text-gray-300 group-hover:text-gray-500 transition"
          />
        </div>

        <p className="text-sm font-semibold text-gray-800">
          {link.label}
        </p>

        <p className="text-xs text-gray-400 leading-relaxed">
          {link.description}
        </p>
      </a>
    ))}
  </div>
</div>

        {/* ── FAQ ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Frequently Asked Questions
            {search && <span className="ml-2 text-gray-400 font-normal">— {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''}</span>}
          </h2>
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-10 bg-white border border-gray-200 rounded-xl">
              <p className="text-sm font-medium text-gray-500">No results for "{search}"</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term or contact support below.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredFaqs.map((faq) => <FaqItem key={faq.id} faq={faq} />)}
            </div>
          )}
        </div>

        {/* ── API guide ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">API Quick Reference</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs text-gray-500 font-mono">Base URL: <span className="text-gray-800">/api/data/[model]</span></p>
            </div>
            {apiEndpoints.map((ep, i) => (
              <div key={ep.method + ep.path} className={`flex items-start gap-4 px-5 py-3.5 ${i < apiEndpoints.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${methodColor[ep.method]}`}>
                  {ep.method}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-mono text-gray-700">{ep.path}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ep.description}</p>
                </div>
              </div>
            ))}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 font-medium mb-1">Query operators</p>
              <p className="text-xs text-gray-400 font-mono">eq, neq, gt, gte, lt, lte, like, in</p>
              <p className="text-xs text-gray-400 font-mono mt-1">?where=status:eq:active&orderBy=price:asc&limit=20&offset=0</p>
            </div>
          </div>
        </div>

        {/* ── Contact form ──
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Contact Support</h2>
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FiCheck size={20} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800">Message sent!</p>
                <p className="text-xs text-gray-400">We'll get back to you as soon as possible.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Name</label>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Anton Wentzel" className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" type="email" className={inputClass} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Message</label>
                  <textarea
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder="Describe your issue or question…"
                    rows={4}
                    className={inputClass + ' resize-none'}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={!contactName || !contactEmail || !contactMsg}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <FiMail size={13} />
                    Send message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div> */}

      </div>
    </div>
  );
}