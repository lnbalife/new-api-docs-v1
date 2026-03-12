import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions, linkItems } from '@/lib/layout.shared';
import { Footer } from '@/components/footer';
import { CustomSidebarFolder } from '@/components/sidebar-folder';
// AI feature temporarily disabled
// import { AISearchTrigger } from '@/components/search';
import 'katex/dist/katex.min.css';
import { notFound } from 'next/navigation';
import { i18n } from '@/lib/i18n';

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang } = await params;

  // Check if the language is valid, prevent invalid language codes (e.g. 'api') from causing errors
  if (!i18n.languages.includes(lang as (typeof i18n.languages)[number])) {
    notFound();
  }

  const base = baseOptions(lang);

  return (
    <DocsLayout
      {...base}
      tabMode="top"
      tree={source.pageTree[lang]}
      links={linkItems.filter((item) => item.type === 'icon')}
      sidebar={{
        components: {
          Folder: CustomSidebarFolder,
        },
      }}
    >
      {children}
      <Footer lang={lang} />
      {/* AI feature temporarily disabled */}
      {/* <AISearchTrigger /> */}
    </DocsLayout>
  );
}
