import React, { useMemo } from 'react';
import { sanitizeArticleHtml, textToHtml } from '@/lib/articleHtml';

/**
 * The body of one Care Blog piece, rendered the same way on the page and in
 * the editor's preview. Rich pieces carry HTML; the library pieces are plain
 * text and become paragraphs. Both go through the sanitiser first - the
 * `.dc-article` styles in tailwind.css do the rest.
 */
export const ArticleBody: React.FC<{ html: string | null; text: string; className?: string }> = ({ html, text, className }) => {
  const safe = useMemo(() => sanitizeArticleHtml(html && html.trim() ? html : textToHtml(text)), [html, text]);
  return <div className={`dc-article ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: safe }} />;
};
