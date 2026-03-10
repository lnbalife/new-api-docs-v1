'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

export function Provider({
  children,
  i18n,
  lang,
}: {
  children: ReactNode;
  i18n: Parameters<typeof RootProvider>[0]['i18n'];
  lang?: string;
}) {
  return (
    <RootProvider i18n={i18n}>
      {children}
    </RootProvider>
  );
}
