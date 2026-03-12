import { createOpenAPI } from 'fumadocs-openapi/server';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { API_BASE_URL } from '@/lib/api-config';

async function walkJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    let entries: Array<{ name: string; isDirectory: boolean; isFile: boolean }>;
    try {
      entries = (await readdir(current, { withFileTypes: true })) as any;
    } catch {
      return;
    }
    for (const e of entries as any) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) {
        const rel = path.relative(process.cwd(), full);
        out.push(rel.split(path.sep).join('/'));
      }
    }
  }
  await walk(dir);
  return out;
}

export const openapi = createOpenAPI({
  // Set proxy URL to resolve CORS issues
  proxyUrl: '/api/proxy',
  // Always load generated per-endpoint OpenAPI files (clean single source of truth)
  async input() {
    const files = await walkJsonFiles('./openapi/generated');
    if (files.length === 0) {
      throw new Error(
        'No generated OpenAPI files found in ./openapi/generated. Run: bun run generate:openapi'
      );
    }
    const entries = await Promise.all(
      files.map(async (p) => {
        const raw = await readFile(p, 'utf8');
        const schema = JSON.parse(raw) as Record<string, unknown>;
        // 注入 servers，使 curl 示例和 Try it 使用配置的域名
        if (!schema.servers || !Array.isArray(schema.servers) || schema.servers.length === 0) {
          schema.servers = [{ url: API_BASE_URL, description: 'API Server' }];
        }
        return [p, schema] as const;
      })
    );
    return Object.fromEntries(entries);
  },
});
