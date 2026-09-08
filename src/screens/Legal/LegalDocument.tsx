import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Loader2 } from 'lucide-react';

/**
 * Renders one of the static legal documents inside the app's chrome.
 *
 * Until now there were two Terms of Service and two Privacy Policies live at
 * once: the static pages at /terms and /privacy (dated 29 August 2026, naming
 * DATES CARE and the BIN, and the ones Google's OAuth review fetched), and a
 * separate React copy of each (dated October 2025 and January 2025) reached
 * from the in-app menu. Their content differed. Which contract a member had
 * agreed to depended on which link they clicked.
 *
 * The static HTML is now the only source. This screen fetches it and shows
 * its <main> so the in-app route still has a back button and the bottom
 * navigation, and the words are the same words.
 */

interface LegalDocumentProps {
  doc: 'terms' | 'privacy';
  onNavigate: (screen: string) => void;
}

const TITLES: Record<LegalDocumentProps['doc'], string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

export const LegalDocument: React.FC<LegalDocumentProps> = ({ doc, onNavigate }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string>('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setFailed(false);
    fetch(`/${doc}.html`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        if (cancelled) return;
        const parsed = new DOMParser().parseFromString(text, 'text/html');
        const main = parsed.querySelector('main');
        const sub = parsed.querySelector('header p');
        // The static page's own footer links are relative to the static
        // page; inside the app the same documents live at hash routes.
        main?.querySelectorAll('a[href]').forEach((a) => {
          const href = a.getAttribute('href') || '';
          if (href === '/terms' || href === '/terms.html') a.setAttribute('href', '#terms');
          if (href === '/privacy' || href === '/privacy.html') a.setAttribute('href', '#privacy');
        });
        setHtml(main ? main.innerHTML : text);
        setSubtitle(sub?.textContent?.trim() ?? '');
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [doc]);

  return (
    <Layout title={TITLES[doc]} onBack={() => onNavigate('settings')} showClose={false}>
      <div className="px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">{TITLES[doc]}</h1>
          {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}
        </div>

        {failed ? (
          <div className="bg-white rounded-2xl p-6 text-gray-800">
            <p>The document could not be loaded. It is also available at{' '}
              <a className="text-pink-600 underline" href={`/${doc}`}>dates.care/{doc}</a>.
            </p>
          </div>
        ) : html === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
          </div>
        ) : (
          <div
            className="legal-doc bg-white rounded-2xl p-5 sm:p-8 text-gray-800"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
      <style>{`
        .legal-doc h2 { font-size: 1.25rem; font-weight: 700; margin: 2rem 0 .6rem; padding-top: 1.2rem; border-top: 1px solid #e6e6ee; color: #1e2235; }
        .legal-doc h2:first-of-type { border-top: 0; padding-top: 0; margin-top: .4rem; }
        .legal-doc h3 { font-size: 1rem; font-weight: 600; margin: 1.3rem 0 .4rem; color: #1e2235; }
        .legal-doc p, .legal-doc li { color: #33384d; line-height: 1.65; }
        .legal-doc p { margin: .6rem 0; }
        .legal-doc ul { padding-left: 1.3rem; margin: .6rem 0; list-style: disc; }
        .legal-doc li { margin-bottom: .35rem; }
        .legal-doc a { color: #DB2777; text-decoration: underline; }
        .legal-doc .note { background: #fffbeb; border-left: 3px solid #f59e0b; padding: .9rem 1rem; margin: 1.1rem 0; border-radius: 0 8px 8px 0; }
        .legal-doc .danger { background: #fef2f2; border-left: 3px solid #ef4444; padding: .9rem 1rem; margin: 1.1rem 0; border-radius: 0 8px 8px 0; }
        .legal-doc .note p:first-child, .legal-doc .danger p:first-child { margin-top: 0; }
        .legal-doc .note p:last-child, .legal-doc .danger p:last-child { margin-bottom: 0; }
        .legal-doc .caps { font-weight: 600; }
        .legal-doc footer { border-top: 1px solid #e6e6ee; margin-top: 2rem; padding-top: 1rem; font-size: .875rem; color: #5b6076; }
        .legal-doc footer a { margin-right: 1rem; }
      `}</style>
    </Layout>
  );
};
