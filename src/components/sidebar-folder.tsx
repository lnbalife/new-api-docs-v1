'use client';

import type { FC, ReactNode } from 'react';
import type * as PageTree from 'fumadocs-core/page-tree';
import {
  SidebarFolder,
  SidebarFolderTrigger,
  SidebarFolderLink,
  SidebarFolderContent,
} from 'fumadocs-ui/components/layout/sidebar';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import { cn } from 'fumadocs-ui/utils/cn';

const AI_MODEL_NAMES = ['AI 模型接口', 'AI Model API', 'AIモデルAPI'];

/** 仅匹配顶层的 "AI 模型接口" 文件夹，其子栏目（音频、聊天等）仍可折叠 */
function isAiModelRootFolder(item: PageTree.Folder): boolean {
  const metaFile = (item as { $ref?: { metaFile?: string } }).$ref?.metaFile;
  if (metaFile != null) {
    const path = metaFile.replace(/\/meta\.json$/, '');
    if (path === 'ai-model' || path.endsWith('/ai-model')) return true;
  }
  const name = typeof item.name === 'string' ? item.name : null;
  return name != null && AI_MODEL_NAMES.includes(name);
}

export const CustomSidebarFolder: FC<{
  item: PageTree.Folder;
  level: number;
  children: ReactNode;
}> = ({ item, level, children }) => {
  const path = useTreePath();
  const isAiModel = isAiModelRootFolder(item);

  if (isAiModel) {
    return (
      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-2 py-2 font-semibold text-fd-foreground',
            'ps-[var(--sidebar-item-offset)]'
          )}
        >
          {item.icon}
          {item.name}
        </div>
        <div
          className={cn(
            'relative',
            level === 1 &&
              "before:content-[''] before:absolute before:w-px before:inset-y-1 before:bg-fd-border before:start-2.5"
          )}
          style={{
            '--sidebar-item-offset': `calc(var(--spacing) * ${(level + 1) * 3})`,
          } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    );
  }

  const defaultOpen = (item.defaultOpen ?? false) || path.includes(item);
  return (
    <SidebarFolder defaultOpen={defaultOpen}>
      {item.index ? (
        <SidebarFolderLink
          href={item.index.url}
          external={item.index.external}
        >
          {item.icon}
          {item.name}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger>
          {item.icon}
          {item.name}
        </SidebarFolderTrigger>
      )}
      <SidebarFolderContent>{children}</SidebarFolderContent>
    </SidebarFolder>
  );
};
