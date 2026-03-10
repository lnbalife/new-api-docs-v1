import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions, linkItems } from '@/lib/layout.shared';
import { Footer } from '@/components/footer';
import {
  FileCode,
  BookOpen,
} from 'lucide-react';
import { getLocalePath } from '@/lib/i18n';

// Navigation items configuration - Only API Reference
const NAV_ITEMS = [
  { key: 'api', icon: BookOpen, path: '/api' },
] as const;

// Internationalization text - Only API Reference
const i18nText: Record<
  string,
  Record<string, { text: string; desc: string }>
> = {
  en: {
    title: { text: 'Documentation', desc: '' },
    apiDocs: { text: 'Apifox Playground', desc: '' },
    api: {
      text: 'API Reference',
      desc: 'Complete API documentation and reference.',
    },
  },
  zh: {
    title: { text: '文档', desc: '' },
    apiDocs: { text: 'Apifox 操练场', desc: '' },
    api: { text: 'API 参考', desc: '完整的 API 文档和参考指南。' },
  },
  ja: {
    title: { text: 'ドキュメント', desc: '' },
    apiDocs: { text: 'Apifox プレイグラウンド', desc: '' },
    api: {
      text: 'API リファレンス',
      desc: '完全な API ドキュメントとリファレンス。',
    },
  },
};

// Get localized text
const getTexts = (lang: string) => i18nText[lang] || i18nText.en;

// Build navigation items
const buildNavItems = (lang: string, docsUrl: string) => {
  const texts = getTexts(lang);
  return NAV_ITEMS.map(({ key, icon: Icon, path }) => ({
    text: texts[key].text,
    desc: texts[key].desc,
    url: `${docsUrl}${path}`,
    Icon,
  }));
};

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang } = await params;
  const texts = getTexts(lang);
  const docsUrl = getLocalePath(lang, 'docs');
  const navItems = buildNavItems(lang, docsUrl);

  return (
    <div className="flex min-h-screen flex-col">
      <HomeLayout
        {...baseOptions(lang)}
        links={[
          // Mobile menu
          {
            type: 'menu',
            on: 'menu',
            text: texts.title.text,
            items: navItems.map(({ text, url, Icon }) => ({
              text,
              url,
              icon: <Icon />,
            })),
          },
          // Desktop navigation
          {
            type: 'main',
            on: 'nav',
            text: texts.title.text,
            url: docsUrl,
          },
          ...linkItems,
        ]}
        className="flex-1 dark:bg-neutral-950 dark:[--color-fd-background:var(--color-neutral-950)]"
      >
        {children}
      </HomeLayout>
      <Footer lang={lang} />
    </div>
  );
}
