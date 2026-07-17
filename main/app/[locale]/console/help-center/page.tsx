'use client';

/**
 * @file HelpCenterPage.tsx
 * @description
 * The Help Center page for the admin console. It gives users a single place
 * to find answers, read documentation, and explore the API reference.
 *
 * What sections does this page have?
 * ------------------------------------
 * 1. Header + Search
 *    A title, subtitle, and a search input that filters the FAQ list in real time.
 *
 * 2. Resources
 *    Three quick-link cards pointing to external documentation, the API reference,
 *    and the community forum. Each opens in a new tab.
 *
 * 3. Frequently Asked Questions (FAQ)
 *    An accordion list of common questions and answers. The list is filtered
 *    live as the user types in the search box. Shows a "no results" state
 *    when no FAQs match the search term.
 *
 * 4. API Quick Reference
 *    A compact reference table showing the four core API endpoint patterns
 *    (GET, POST, PUT, DELETE) with their paths and descriptions.
 *    Also shows the supported query string operators.
 *
 * Note: The Contact Support form is present in the code but commented out.
 * It is preserved here for future use — all its text is translated in en.json.
 *
 * How does FAQ search work?
 * --------------------------
 * The search input is a controlled input tied to the `search` state.
 * On every keystroke, `filteredFaqs` is recalculated by filtering the `faqs`
 * array — checking if the search term appears in either the question or answer
 * text (case-insensitive). The filtered array is then rendered in place of the full list.
 */

import { useState } from 'react';
import {
  FiSearch, FiChevronDown, FiChevronUp, FiBook, FiCode,
  FiMessageSquare, FiExternalLink, FiMail, FiCheck,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';

// ─── Static Data ──────────────────────────────────────────────────────────────

/**
 * The full list of FAQ entries shown on the page.
 * Each entry has a numeric `id` (used as a React key), a `question` string,
 * and an `answer` string.
 *
 * Note: question and answer text is hardcoded here as English strings.
 * If you need to translate FAQs, move them into en.json under "helpCenter.faqs"
 * and reference them by key.
 */
const faqs = [
  {
    id: 1,
    question: 'How do I connect my database?',
    answer: 'Go to Settings → Overview and select your database type. Underpeaks supports Supabase, Firebase, PostgreSQL, MySQL, and MongoDB. Enter your connection credentials and click Save — the platform will test the connection automatically.',
  },
  {
    id: 2,
    question: 'What is the difference between self-hosted and hosted?',
    answer: 'Self-hosted is free and open source — you run it on your own server and manage your own database. Hosted (console.underpeaks.com) is a managed service with two tiers: Pro (dedicated schema) and Enterprise (dedicated database), and includes integrations, advanced auth, and white-labelling.',
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

/**
 * External resource links shown in the Resources section.
 * Each entry has an icon component, a label, an href, and a short description.
 * Labels and descriptions are translated via t() at render time.
 */
const docLinks = [
  { icon: FiBook,          key: 'gettingStarted', href: 'https://docs.underpeaks.com/getting-started' },
  { icon: FiCode,          key: 'apiReference',   href: 'https://docs.underpeaks.com/api'             },
  { icon: FiMessageSquare, key: 'community',       href: 'https://community.underpeaks.com'            },
];

/**
 * The four core API endpoint patterns shown in the API Quick Reference section.
 * method is used as a key for the colour map and displayed as a badge.
 * descriptionKey maps to a translation key for the endpoint's description.
 */
const apiEndpoints = [
  { method: 'GET',    path: '/api/data/[model]',      descriptionKey: 'get'    },
  { method: 'POST',   path: '/api/data/[model]',      descriptionKey: 'post'   },
  { method: 'PUT',    path: '/api/data/[model]/[id]', descriptionKey: 'put'    },
  { method: 'DELETE', path: '/api/data/[model]/[id]', descriptionKey: 'delete' },
];

/**
 * Maps HTTP method names to their Tailwind badge colour classes.
 * Used to colour-code the method badges in the API Quick Reference table.
 */
const methodColor: Record<string, string> = {
  GET:    'bg-green-100 text-green-700',
  POST:   'bg-blue-100 text-blue-700',
  PUT:    'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

// ─── FaqItem Sub-component ────────────────────────────────────────────────────

/**
 * @component FaqItem
 * @description
 * A single accordion item in the FAQ list. Shows the question as a clickable
 * header. Clicking it toggles the answer panel open or closed.
 *
 * Uses local `open` state — each FAQ item manages its own open/closed state
 * independently of the others.
 *
 * @param {{ faq: typeof faqs[0] }} props
 * @returns {JSX.Element}
 */
function FaqItem({ faq }: { faq: typeof faqs[0] }) {
  /** Whether this specific FAQ item's answer panel is currently visible. */
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Question row — clickable toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{faq.question}</span>
        {/* Chevron icon rotates to indicate open/closed state */}
        {open
          ? <FiChevronUp size={15} className="text-gray-400 shrink-0" />
          : <FiChevronDown size={15} className="text-gray-400 shrink-0" />
        }
      </button>

      {/* Answer panel — only rendered when open is true */}
      {open && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

/**
 * @component HelpCenterPage
 * @description
 * The main Help Center page. Manages search state and the (currently hidden)
 * contact form state. Renders all four sections of the help center.
 *
 * @returns {JSX.Element}
 */
export default function HelpCenterPage() {
  /**
   * t() is the translation function from next-intl.
   * All keys for this page live under the "helpCenter" namespace in en.json.
   */
  const t = useTranslations('helpCenter');

  // ─── State ──────────────────────────────────────────────────────────────────

  /** The current value of the FAQ search input. Filters the FAQ list in real time. */
  const [search, setSearch] = useState('');

  /**
   * Contact form fields — preserved for when the contact form is re-enabled.
   * Currently the form section is commented out in the JSX below.
   */
  const [contactName,  setContactName]  = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg,   setContactMsg]   = useState('');

  /**
   * Whether the contact form has been successfully submitted.
   * When true, a success confirmation replaces the form for 3 seconds.
   */
  const [submitted, setSubmitted] = useState(false);

  // ─── Derived Data ────────────────────────────────────────────────────────────

  /**
   * Filter the FAQ list based on the current search term.
   * Checks both the question and answer text, case-insensitively.
   * When search is empty, all FAQs are shown.
   */
  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /**
   * @function handleSubmit
   * @description
   * Handles contact form submission (for future use when the form is re-enabled).
   * Validates that all fields are filled, then shows a success state for 3 seconds
   * before resetting the form back to its empty state.
   */
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

  /** Shared Tailwind class string for all contact form text inputs and textarea. */
  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition";

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Header + Search ── */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('header.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('header.subtitle')}</p>

          {/* FAQ search input */}
          <div className="relative mt-5 max-w-lg mx-auto">
            <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            />
          </div>
        </div>

        {/* ── Resources Section ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('resources.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {docLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group block p-3 border rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <link.icon size={18} className="text-gray-500" />
                  <FiExternalLink size={13} className="text-gray-300 group-hover:text-gray-500 transition" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {t(`resources.links.${link.key}.label`)}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t(`resources.links.${link.key}.description`)}
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* ── FAQ Section ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {t('faq.title')}
            {/*
             * Show result count when the user is actively searching.
             * Uses plural-aware translation key to handle "1 result" vs "2 results".
             */}
            {search && (
              <span className="ml-2 text-gray-400 font-normal">
                — {t('faq.resultCount', { count: filteredFaqs.length })}
              </span>
            )}
          </h2>

          {filteredFaqs.length === 0 ? (
            /* No results state */
            <div className="text-center py-10 bg-white border border-gray-200 rounded-xl">
              <p className="text-sm font-medium text-gray-500">
                {t('faq.noResults', { query: search })}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t('faq.noResultsHint')}
              </p>
            </div>
          ) : (
            /* FAQ accordion list */
            <div className="flex flex-col gap-2">
              {filteredFaqs.map((faq) => <FaqItem key={faq.id} faq={faq} />)}
            </div>
          )}
        </div>

        {/* ── API Quick Reference Section ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('api.title')}</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

            {/* Base URL row */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs text-gray-500 font-mono">
                {t('api.baseUrl')} <span className="text-gray-800">/api/data/[model]</span>
              </p>
            </div>

            {/* Endpoint rows */}
            {apiEndpoints.map((ep, i) => (
              <div
                key={ep.method + ep.path}
                className={`flex items-start gap-4 px-5 py-3.5 ${i < apiEndpoints.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* HTTP method badge — colour coded */}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${methodColor[ep.method]}`}>
                  {ep.method}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-mono text-gray-700">{ep.path}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t(`api.endpoints.${ep.descriptionKey}`)}
                  </p>
                </div>
              </div>
            ))}

            {/* Query operators reference */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 font-medium mb-1">{t('api.operators.title')}</p>
              <p className="text-xs text-gray-400 font-mono">{t('api.operators.list')}</p>
              <p className="text-xs text-gray-400 font-mono mt-1">{t('api.operators.example')}</p>
            </div>
          </div>
        </div>

        {/*
         * ── Contact Support Form (currently hidden) ──
         * This section is preserved for future use. Uncomment the block below
         * to re-enable it. All its translation keys are already in en.json.
         *
         * <div>
         *   <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('contact.title')}</h2>
         *   <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
         *     {submitted ? (
         *       <div className="flex flex-col items-center justify-center py-8 gap-3">
         *         <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
         *           <FiCheck size={20} className="text-green-600" />
         *         </div>
         *         <p className="text-sm font-semibold text-gray-800">{t('contact.success.title')}</p>
         *         <p className="text-xs text-gray-400">{t('contact.success.subtitle')}</p>
         *       </div>
         *     ) : (
         *       <div className="flex flex-col gap-4">
         *         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         *           <div className="flex flex-col gap-1.5">
         *             <label className="text-xs font-medium text-gray-600">{t('contact.fields.name')}</label>
         *             <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t('contact.fields.namePlaceholder')} className={inputClass} />
         *           </div>
         *           <div className="flex flex-col gap-1.5">
         *             <label className="text-xs font-medium text-gray-600">{t('contact.fields.email')}</label>
         *             <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={t('contact.fields.emailPlaceholder')} type="email" className={inputClass} />
         *           </div>
         *         </div>
         *         <div className="flex flex-col gap-1.5">
         *           <label className="text-xs font-medium text-gray-600">{t('contact.fields.message')}</label>
         *           <textarea value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} placeholder={t('contact.fields.messagePlaceholder')} rows={4} className={inputClass + ' resize-none'} />
         *         </div>
         *         <div className="flex justify-end">
         *           <button onClick={handleSubmit} disabled={!contactName || !contactEmail || !contactMsg} className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
         *             <FiMail size={13} />
         *             {t('contact.submit')}
         *           </button>
         *         </div>
         *       </div>
         *     )}
         *   </div>
         * </div>
         */}

      </div>
    </div>
  );
}