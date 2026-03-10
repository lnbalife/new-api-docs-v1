import Link from 'next/link';
import { Github, BookOpen } from 'lucide-react';
import { Hero } from './page.client';
import { getLocalePath, i18n } from '@/lib/i18n';
import Image from 'next/image';

const contentMap: Record<
  string,
  {
    badge: string;
    title: string;
    subtitle: string;
    highlight: string;
    getStarted: string;
    github: string;
    partnersTitle: string;
    partnersSubtitle: string;
    sponsorPartnersTitle: string;
    sponsorPartnersSubtitle: string;
    devContributorsTitle: string;
    docsContributorsTitle: string;
  }
> = {
  en: {
    badge: 'The Foundation of Your AI Universe',
    title: 'Connect all AI providers, manage your AI assets,',
    subtitle: 'build the',
    highlight: 'future',
    getStarted: 'Getting Started',
    github: 'GitHub',
    partnersTitle: 'Our Partners & Clients',
    partnersSubtitle: 'In no particular order',
    sponsorPartnersTitle: 'Sponsor Partners',
    sponsorPartnersSubtitle: 'Trusted sponsor collaborations',
    devContributorsTitle: 'Development Contributors',
    docsContributorsTitle: 'Documentation Contributors',
  },
  zh: {
    badge: '人工智能应用基座',
    title: '承载 AI 应用，管理数字资产，',
    subtitle: '连接',
    highlight: '未来',
    getStarted: '快速开始',
    github: 'GitHub',
    partnersTitle: '我们的合作伙伴与客户',
    partnersSubtitle: '排名不分先后',
    sponsorPartnersTitle: '赞助合作伙伴',
    sponsorPartnersSubtitle: '值得信赖的赞助合作',
    devContributorsTitle: '开发贡献者',
    docsContributorsTitle: '文档贡献者',
  },
  ja: {
    badge: 'あなたの AI ユニバースの基盤',
    title: 'すべての AI プロバイダーを接続し、AI アセットを管理し、',
    subtitle: '',
    highlight: '未来を構築',
    getStarted: 'はじめに',
    github: 'GitHub',
    partnersTitle: '私たちのパートナーとお客様',
    partnersSubtitle: '順不同',
    sponsorPartnersTitle: 'スポンサーパートナー',
    sponsorPartnersSubtitle: '信頼できるスポンサー協力',
    devContributorsTitle: '開発貢献者',
    docsContributorsTitle: 'ドキュメント貢献者',
  },
} as const;

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const content = contentMap[lang] || contentMap.en;

  return (
    <main className="text-landing-foreground dark:text-landing-foreground-dark pt-4 pb-6 md:pb-12">
      <div className="relative mx-auto flex h-[70vh] max-h-[900px] min-h-[600px] w-full max-w-[1400px] overflow-hidden rounded-2xl border bg-origin-border">
        <Hero />
        <div className="z-2 flex size-full flex-col px-4 max-md:items-center max-md:text-center md:p-12">
          <p className="border-brand/50 text-brand mt-12 w-fit rounded-full border p-2 text-xs font-medium">
            {content.badge}
          </p>
          <h1 className="leading-tighter my-8 text-4xl font-medium xl:mb-12 xl:text-5xl">
            {content.title}
            <br />
            {content.subtitle}{' '}
            <span className="text-brand">{content.highlight}</span>.
          </h1>
          <div className="flex w-fit flex-row flex-wrap items-center justify-center gap-4">
            <Link
              href={getLocalePath(lang, 'docs')}
              className="bg-brand text-brand-foreground hover:bg-brand-200 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-medium tracking-tight transition-colors max-sm:text-sm"
            >
              <BookOpen className="size-4" />
              {content.getStarted}
            </Link>
            
          </div>
        </div>
      </div>




    </main>
  );
}

export async function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}
