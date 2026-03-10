interface FooterProps {
  lang: string;
}

// ============================================
// Translations (only text that differs by language)
// ============================================
interface FooterTranslation {
  copyright: string;
}

const translations: Record<string, FooterTranslation> = {
  zh: {
    copyright: '© 2026 NodeKey. All Rights Reserved.',
  },
  en: {
    copyright: '© 2026 NodeKey. All Rights Reserved.',
  },
  ja: {
    copyright: '© 2026 NodeKey. All Rights Reserved.',
  },
};



// ============================================
// Footer Component
// ============================================
export function Footer({ lang }: FooterProps) {
  const t = translations[lang] || translations.en;

  return (
    <footer className="border-fd-border bg-fd-card/30 mt-auto border-t backdrop-blur-sm">
      <div className="mx-auto max-w-[1400px] px-6 py-12">

        {/* Bottom: Copyright and Social */}
        <div className="border-fd-border flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          {/* Left: Copyright and Beian */}
          <div className="text-fd-muted-foreground flex flex-col gap-2 text-xs">
            <p>{t.copyright}</p>
            
          </div>

         
        </div>
      </div>
    </footer>
  );
}
