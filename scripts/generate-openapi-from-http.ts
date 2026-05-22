import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

type HttpTxtRoot = {
  success: boolean;
  data: HttpEndpoint[];
};

type HttpEndpoint = {
  id: number;
  name: string;
  description?: string;
  overrideRemote?: boolean;
  patchTargetIds?: number[];
  descriptionAppend?: string;
  operationId?: string;
  method: string;
  path: string;
  tags?: string[];
  moduleId?: number;
  requestBody?: {
    type?: string; // "none" | "application/json" | "multipart/form-data" ...
    parameters?: Array<{
      name: string;
      required?: boolean;
      description?: string;
      type?: string; // "file" | "string" | "integer" ...
      schema?: Record<string, unknown>;
      example?: unknown;
      examples?: unknown[];
    }>;
    jsonSchema?: Record<string, unknown>;
    mediaType?: string;
    required?: boolean;
    description?: string;
    examples?: Array<{
      mediaType?: string;
      value?: unknown;
      name?: string;
    }>;
  };
  parameters?: {
    path?: Array<HttpParameter>;
    query?: Array<HttpParameter>;
    header?: Array<HttpParameter>;
    cookie?: Array<HttpParameter>;
  };
  responses?: Array<{
    code: number;
    name?: string;
    description?: string;
    contentType?: string; // "json" | "noContent" ...
    mediaType?: string;
    jsonSchema?: Record<string, unknown>;
    headers?: Array<unknown>;
  }>;
  codeSamples?: Array<{
    lang: string;
    label?: string;
    source?: string;
    id?: string;
  }>;
  auth?: {
    type?: string;
  };
  securityScheme?: {
    schemeGroups?: Array<{
      schemeIds?: number[];
    }>;
    required?: boolean;
  };
};

type HttpParameter = {
  name: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
  type?: string;
  example?: unknown;
  examples?: unknown[];
};

type ExampleContext = 'default' | 'image' | 'image-edit' | 'video';

type SchemaDefItem = {
  id?: string; // "#/definitions/224065305"
  schema?: { jsonSchema?: Record<string, unknown> };
  items?: SchemaDefItem[];
};

function sanitizePathPart(input: string): string {
  // Windows-safe file/folder names
  return input
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-') // illegal chars
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '') // no trailing dots
    .trim()
    .slice(0, 120);
}

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'endpoint';
}

function toOpenApiParam(
  p: HttpParameter,
  where: 'path' | 'query' | 'header' | 'cookie'
) {
  const schema = p.schema ?? (p.type ? { type: p.type } : { type: 'string' });
  const example =
    p.example !== undefined
      ? p.example
      : inferExampleForParameter(p, where, schema);
  return {
    name: p.name,
    in: where,
    required: where === 'path' ? true : !!p.required,
    description: p.description || undefined,
    ...(example !== undefined ? { example } : {}),
    schema,
  };
}

function buildSchemaExample(
  schema: any,
  nameHint = 'field',
  required = false,
  context: ExampleContext = 'default'
): unknown {
  if (!schema || typeof schema !== 'object') return undefined;

  if (schema.example !== undefined) return deepClone(schema.example);
  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return deepClone(schema.examples[0]);
  }

  if (nameHint === 'messages') {
    if (context === 'image' || context === 'image-edit') {
      return [
        {
          role: 'user',
          content:
            context === 'image-edit'
              ? '\u628a\u56fe\u7247\u4e2d\u7684\u81ea\u884c\u8f66\u6539\u6210\u7ea2\u8272\uff0c\u4fdd\u6301\u80cc\u666f\u548c\u6784\u56fe\u4e0d\u53d8'
              : '\u753b\u4e00\u53ea\u6234\u7740\u8d1d\u96f7\u5e3d\u7684\u5c0f\u732b\uff0c\u767d\u8272\u80cc\u666f\uff0c\u63d2\u753b\u98ce\u683c',
        },
      ];
    }

    return [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请描述图片中的商品卖点。' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/product.jpg' },
          },
        ],
      },
    ];
  }

  if (nameHint === 'content' && (schema.oneOf || schema.anyOf)) {
    if (context === 'image' || context === 'image-edit') {
      return context === 'image-edit'
        ? '\u628a\u56fe\u7247\u4e2d\u7684\u81ea\u884c\u8f66\u6539\u6210\u7ea2\u8272\uff0c\u4fdd\u6301\u80cc\u666f\u548c\u6784\u56fe\u4e0d\u53d8'
        : '\u753b\u4e00\u53ea\u6234\u7740\u8d1d\u96f7\u5e3d\u7684\u5c0f\u732b\uff0c\u767d\u8272\u80cc\u666f\uff0c\u63d2\u753b\u98ce\u683c';
    }

    return [
      { type: 'text', text: '请描述图片中的商品卖点。' },
      {
        type: 'image_url',
        image_url: { url: 'https://example.com/product.jpg' },
      },
    ];
  }

  const type = String(schema.type || '').toLowerCase();

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    if (nameHint === 'role') return 'user';
    if (nameHint === 'stream') return false;
    if (nameHint === 'response_format') return 'url';
    if (nameHint === 'quality') return 'medium';
    if (nameHint === 'size') return '1024x1024';
    if (nameHint === 'duration' || nameHint === 'seconds') return '5';
    if (nameHint === 'aspect_ratio') return '16:9';
    if (nameHint === 'mode') return 'std';
    return deepClone(schema.enum[0]);
  }

  if (type === 'object' && schema.properties && typeof schema.properties === 'object') {
    const out: Record<string, unknown> = {};
    const requiredSet = new Set<string>(
      Array.isArray(schema.required) ? schema.required : []
    );
    for (const [key, value] of Object.entries(schema.properties)) {
      const child = buildSchemaExample(value, key, requiredSet.has(key), context);
      if (child !== undefined) out[key] = child;
    }
    return out;
  }

  if (type === 'array' && schema.items && typeof schema.items === 'object') {
    const item = buildSchemaExample(
      schema.items,
      `${nameHint}_item`,
      required,
      context
    );
    return item === undefined ? [] : [item];
  }

  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return false;

  const name = nameHint.toLowerCase();
  if (name.includes('anthropic-version')) return '2023-06-01';
  if (
    name.includes('api_key') ||
    name.includes('apikey') ||
    name.includes('api-key')
  ) {
    return 'sk-your-api-key';
  }
  if (name === 'key') return 'AIzaSyExampleKey';
  if (name.includes('callback') || name.includes('webhook')) {
    return 'https://your.domain/callback';
  }
  if (name.includes('task_id') || name === 'id') return 'task_xxx';
  if (name.includes('model')) return 'gpt-4o';
  if (name.includes('negative_prompt')) return 'blurry, low quality';
  if (
    name.includes('prompt') ||
    name.includes('text') ||
    name.includes('message')
  ) {
    const contextual = textExampleForContext(context);
    if (contextual) return contextual;
    return '请描述图片中的商品卖点。';
  }
  if (name.includes('image')) return 'https://example.com/image.jpg';
  if (name.includes('video')) return 'https://example.com/video.mp4';
  if (name.includes('audio')) return 'https://example.com/audio.mp3';
  if (name.includes('name')) return 'example-name';
  if (name.includes('description')) return '示例描述';
  if (name.includes('type')) return 'example-type';

  return required ? '示例值' : undefined;
}

function inferExampleForParameter(
  p: HttpParameter,
  where: 'path' | 'query' | 'header' | 'cookie',
  schema: Record<string, unknown>,
  context: ExampleContext = 'default'
): unknown {
  const name = p.name.toLowerCase();
  const type = String(schema.type || p.type || 'string').toLowerCase();

  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }
  if (schema.example !== undefined) return schema.example;

  if (name === 'anthropic-version') return '2023-06-01';
  if (name === 'x-api-key' || name === 'x-goog-api-key') return 'sk-your-api-key';
  if (name === 'key') return 'AIzaSyExampleKey';
  if (name.includes('authorization') || name.includes('bearer')) return 'Bearer sk-your-api-key';
  if (name.includes('callback') || name.includes('webhook'))
    return 'https://your.domain/callback';
  if (name.includes('task_id') || name === 'id') return 'task_xxx';
  if (name.includes('model')) return 'gpt-4o';
  if (name.includes('negative_prompt')) return 'blurry, low quality';
  if (name.includes('prompt') || name.includes('text') || name.includes('message')) {
    const contextual = textExampleForContext(context);
    if (contextual) return contextual;
    return '请描述图片中的商品卖点。';
  }
  if (name.includes('image')) return 'https://example.com/image.jpg';
  if (name.includes('video')) return 'https://example.com/video.mp4';
  if (name.includes('audio')) return 'https://example.com/audio.mp3';
  if (name.includes('name')) return 'example-name';
  if (name.includes('description')) return '示例描述';

  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return false;
  return buildSchemaExample(schema, p.name, false, context);
}

function textExampleForContext(context: ExampleContext): string | undefined {
  if (context === 'video') {
    return '手持镜头穿过清晨的咖啡店，阳光从窗边扫过桌面';
  }
  if (context === 'image-edit') {
    return '把图片中的自行车改成红色，保持背景和构图不变';
  }
  if (context === 'image') {
    return '画一只戴着贝雷帽的小猫，白色背景，插画风格';
  }
  return undefined;
}

function extractDefinitionsFromApifoxProject(
  project: unknown
): Map<string, any> {
  const map = new Map<string, any>();

  function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    const maybeId = typeof node.id === 'string' ? node.id : undefined;
    const match = maybeId?.match(/^#\/definitions\/(\d+)$/);
    const jsonSchema = node?.schema?.jsonSchema;
    if (match && jsonSchema && typeof jsonSchema === 'object') {
      map.set(match[1], jsonSchema);
    }
    const items = node.items;
    if (Array.isArray(items)) {
      for (const it of items) walk(it);
    }
  }

  const root = project as any;
  const schemaCollection = root?.schemaCollection;
  if (Array.isArray(schemaCollection)) {
    for (const top of schemaCollection) walk(top);
  }

  return map;
}

type OpenApiSecuritySchemeObject = Record<string, unknown>;

function extractSecuritySchemesFromApifoxProject(
  project: unknown
): Map<number, { name: string; scheme: OpenApiSecuritySchemeObject }> {
  const out = new Map<
    number,
    { name: string; scheme: OpenApiSecuritySchemeObject }
  >();
  const root = project as any;
  const collection = root?.securitySchemeCollection;
  if (!Array.isArray(collection)) return out;

  for (const group of collection) {
    const items = group?.items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const id = typeof item?.id === 'number' ? item.id : undefined;
      const name = typeof item?.name === 'string' ? item.name : undefined;
      const cfg = item?.authConfigs;
      if (!id || !name || !cfg || typeof cfg !== 'object') continue;

      // Apifox stores OAS-like shape in authConfigs
      // We map to OpenAPI 3.x Security Scheme Object.
      const type = cfg.type;
      let scheme: OpenApiSecuritySchemeObject | undefined;

      if (type === 'http') {
        scheme = {
          type: 'http',
          scheme: cfg.scheme,
          description: cfg.description || undefined,
        };
      } else if (type === 'apiKey') {
        scheme = {
          type: 'apiKey',
          in: cfg.in,
          name: cfg.name,
          description: cfg.description || undefined,
        };
      } else if (type === 'oauth2') {
        scheme = {
          type: 'oauth2',
          flows: cfg.flows,
          description: cfg.description || undefined,
        };
      } else {
        // Unknown type; keep minimal so UI can still render
        scheme = {
          type: String(type || 'http'),
          description: cfg.description || undefined,
        };
      }

      out.set(id, { name, scheme });
    }
  }

  return out;
}

function deepClone<T>(x: T): T {
  return x ? (JSON.parse(JSON.stringify(x)) as T) : x;
}

function applyLocalEndpointPatch(
  target: HttpEndpoint,
  source: HttpEndpoint
): HttpEndpoint {
  const description = [target.description, source.descriptionAppend]
    .filter(Boolean)
    .join('\n\n');

  return {
    ...target,
    ...(description ? { description } : {}),
    ...(source.requestBody
      ? { requestBody: { ...target.requestBody, ...source.requestBody } }
      : {}),
  };
}

function resolveSchemaRefs(
  schema: any,
  defs: Map<string, any>,
  visiting = new Set<string>()
): any {
  if (!schema || typeof schema !== 'object') return schema;

  // Resolve direct $ref
  const ref = typeof schema.$ref === 'string' ? schema.$ref : undefined;
  const match = ref?.match(/^#\/definitions\/(\d+)$/);
  if (match) {
    const id = match[1];
    if (visiting.has(id)) {
      // cycle protection
      return {
        type: 'object',
        description: `Cyclic $ref to #/definitions/${id}`,
      };
    }
    const def = defs.get(id);
    if (!def) {
      return {
        type: 'object',
        description: `Unresolved $ref: #/definitions/${id}`,
      };
    }
    visiting.add(id);
    const resolved = resolveSchemaRefs(deepClone(def), defs, visiting);
    visiting.delete(id);
    return resolved;
  }

  // Recurse into composite keywords / properties / items etc.
  const out: any = Array.isArray(schema) ? [] : { ...schema };
  const keys = Object.keys(out);
  for (const k of keys) {
    const v = out[k];
    if (Array.isArray(v)) {
      out[k] = v.map((it) => resolveSchemaRefs(it, defs, visiting));
    } else if (v && typeof v === 'object') {
      out[k] = resolveSchemaRefs(v, defs, visiting);
    }
  }
  return out;
}

function buildRequestBody(ep: HttpEndpoint, defs: Map<string, any>) {
  const rb = ep.requestBody;
  if (!rb) return undefined;
  const context = inferExampleContext(ep);
  const t = rb.type?.toLowerCase();
  if (!t || t === 'none') return undefined;

  const mediaType =
    rb.mediaType ||
    (t.includes('/') ? rb.type : undefined) ||
    'application/json';
  const explicitExample = extractRequestBodyExample(rb, mediaType);

  // multipart/form-data etc: build schema from parameters
  if (
    Array.isArray(rb.parameters) &&
    rb.parameters.length > 0 &&
    !rb.jsonSchema
  ) {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const p of rb.parameters) {
      if (!p?.name) continue;
      const propSchema =
        p.schema ??
        (p.type === 'file'
          ? { type: 'string', format: 'binary' }
          : p.type
            ? { type: p.type }
            : { type: 'string' });
      const example =
        p.example !== undefined
          ? p.example
          : inferExampleForRequestProperty(p.name, propSchema, context);
      properties[p.name] = {
        ...propSchema,
        description: p.description || propSchema.description,
        ...(example !== undefined ? { example } : {}),
      };
      if (p.required) required.push(p.name);
    }

    return {
      required: !!rb.required,
      description: rb.description || undefined,
      content: {
        [mediaType]: {
          schema: {
            type: 'object',
            properties,
            ...(required.length > 0 ? { required } : {}),
          },
        },
      },
    };
  }

  if (rb.jsonSchema && typeof rb.jsonSchema === 'object') {
    const schema = resolveSchemaRefs(deepClone(rb.jsonSchema), defs);
    const example = explicitExample ?? buildSchemaExample(schema, 'field', false, context);
    return {
      required: !!rb.required,
      description: rb.description || undefined,
      content: {
        [mediaType]: {
          schema,
          ...(example !== undefined ? { example } : {}),
        },
      },
    };
  }

  return {
    required: !!rb.required,
    content: {
      [mediaType]: {
        schema: { type: 'object' },
      },
    },
  };
}

function extractRequestBodyExample(
  rb: NonNullable<HttpEndpoint['requestBody']>,
  mediaType: string
): unknown {
  const examples = rb.examples;
  if (!Array.isArray(examples) || examples.length === 0) return undefined;

  const selected =
    examples.find((example) => !example.mediaType || example.mediaType === mediaType) ??
    examples[0];
  if (!selected || selected.value === undefined) return undefined;

  if (typeof selected.value === 'string') {
    try {
      return JSON.parse(selected.value);
    } catch {
      return selected.value;
    }
  }

  return deepClone(selected.value);
}

function inferExampleForRequestProperty(
  name: string,
  schema: Record<string, unknown>,
  context: ExampleContext = 'default'
): unknown {
  return inferExampleForParameter({ name }, 'query', schema, context);
}

function inferExampleContext(ep: HttpEndpoint): ExampleContext {
  const text = [
    ep.path,
    ep.name,
    ep.description,
    ...(ep.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (text.includes('video') || text.includes('视频')) return 'video';
  if (text.includes('edit') || text.includes('编辑') || text.includes('edits')) {
    return 'image-edit';
  }
  if (text.includes('image') || text.includes('图像') || text.includes('图片')) {
    return 'image';
  }
  return 'default';
}

function injectSchemaExamples(schema: any, requiredHint?: Set<string>): any {
  if (!schema || typeof schema !== 'object') return schema;

  if (schema.example !== undefined || schema.examples?.length > 0) {
    return schema;
  }

  const type = String(schema.type || '').toLowerCase();
  const enumValues = Array.isArray(schema.enum) ? schema.enum : [];
  if (enumValues.length > 0) {
    return { ...schema, example: enumValues[0] };
  }

  if (type === 'object' && schema.properties && typeof schema.properties === 'object') {
    const required = new Set<string>(Array.isArray(schema.required) ? schema.required : []);
    const next = { ...schema, properties: {} as Record<string, any> };
    for (const [key, value] of Object.entries(schema.properties)) {
      next.properties[key] = injectSchemaExamples(value, required);
      if (
        required.has(key) &&
        next.properties[key] &&
        next.properties[key].example === undefined &&
        (!Array.isArray(next.properties[key].examples) || next.properties[key].examples.length === 0)
      ) {
        const example = inferExampleForRequestProperty(key, next.properties[key]);
        if (example !== undefined) {
          next.properties[key] = { ...next.properties[key], example };
        }
      }
    }
    return next;
  }

  if (type === 'array' && schema.items && typeof schema.items === 'object') {
    const items = injectSchemaExamples(schema.items);
    if (items && items.example === undefined && items.examples?.length !== 0) {
      const example = inferExampleForRequestProperty('item', items);
      if (example !== undefined) {
        return { ...schema, items, example: [example] };
      }
    }
    return { ...schema, items };
  }

  return schema;
}

function buildResponses(ep: HttpEndpoint, defs: Map<string, any>) {
  const res: Record<string, any> = {};
  for (const r of ep.responses ?? []) {
    const code = String(r.code);
    const mediaType = r.mediaType || 'application/json';
    const isNoContent = (r.contentType || '').toLowerCase() === 'nocontent';

    if (isNoContent || !r.jsonSchema) {
      res[code] = { description: r.description || r.name || 'Response' };
      continue;
    }

    res[code] = {
      description: r.description || r.name || 'Response',
      content: {
        [mediaType]: {
          schema: resolveSchemaRefs(deepClone(r.jsonSchema), defs),
        },
      },
    };
  }

  // OpenAPI requires at least one response
  if (Object.keys(res).length === 0) {
    res['200'] = { description: 'OK' };
  }

  return res;
}

function normalizeMethod(method: string): string {
  return method.trim().toLowerCase();
}

function groupByModuleId(moduleId?: number) {
  // From observed data:
  // - 6656265: AI 模型接口
  // - 6660656: 后台管理接口
  if (moduleId === 6660656) return 'management';
  return 'ai-model';
}

/** AI 模型接口中排除的栏目（不生成 OpenAPI 文档） */
const EXCLUDED_AI_MODEL_TAGS = [
  '补全（Completions）',
  '模型（Models）',
  '审查（Moderations）',
  '重排序（Rerank）',
  '未实现（Unimplemented）',
];

function isExcludedAiModelTag(tag: string): boolean {
  const firstPart = tag.split('/')[0]?.trim() || '';
  return EXCLUDED_AI_MODEL_TAGS.some((ex) => firstPart === ex);
}

function isModelListEndpoint(ep: HttpEndpoint): boolean {
  return ep.path === '/v1/models';
}

async function readHttpSource(): Promise<HttpTxtRoot> {
  const localFile = process.env.HTTP_SOURCE_FILE?.trim();
  if (localFile) {
    const raw = await readFile(localFile, 'utf8');
    return JSON.parse(raw) as HttpTxtRoot;
  }

  const DEFAULT_URL =
    'https://api.apifox.com/api/v1/projects/7484041/http-apis';
  const url = process.env.HTTP_SOURCE_URL?.trim() || DEFAULT_URL;
  if (url) {
    const headersRaw = process.env.HTTP_SOURCE_HEADERS?.trim();
    const headers = headersRaw
      ? (JSON.parse(headersRaw) as Record<string, string>)
      : undefined;
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) throw new Error(`HTTP_SOURCE_URL fetch failed: ${res.status}`);
    return (await res.json()) as HttpTxtRoot;
  }
  throw new Error('No http source configured.');
}

async function readLocalHttpSources(): Promise<HttpEndpoint[]> {
  const dir = './openapi';
  let entries: Array<{ name: string; isFile: () => boolean }>;
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as any;
  } catch {
    return [];
  }

  const endpoints: HttpEndpoint[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.http-apis.json')) continue;

    const filePath = path.join(dir, entry.name);
    const raw = await readFile(filePath, 'utf8');
    const root = JSON.parse(raw) as HttpTxtRoot;
    if (!root?.success || !Array.isArray(root.data)) {
      throw new Error(`Invalid local http source: ${filePath}`);
    }
    endpoints.push(...root.data);
  }

  if (endpoints.length > 0) {
    console.log(`✅ Loaded ${endpoints.length} local endpoint(s) from ${dir}`);
  }
  return endpoints;
}

async function tryReadApifoxProjectDefs(): Promise<Map<string, any>> {
  const p =
    process.env.APIFOX_PROJECT_FILE?.trim() || './openapi/NewAPI.apifox.json';
  try {
    const raw = await readFile(p, 'utf8');
    const project = JSON.parse(raw) as unknown;
    const defs = extractDefinitionsFromApifoxProject(project);
    const schemes = extractSecuritySchemesFromApifoxProject(project);
    if (defs.size > 0) {
      console.log(`✅ Loaded ${defs.size} schema definitions from ${p}`);
    } else {
      console.log(`⚠ No schema definitions found in ${p}`);
    }
    if (schemes.size > 0) {
      console.log(`✅ Loaded ${schemes.size} security scheme(s) from ${p}`);
    } else {
      console.log(`⚠ No security schemes found in ${p}`);
    }
    return defs;
  } catch {
    console.log(`⚠ Apifox project file not found or unreadable: ${p}`);
    return new Map();
  }
}

async function tryReadApifoxProjectSecuritySchemes(): Promise<
  Map<number, { name: string; scheme: OpenApiSecuritySchemeObject }>
> {
  const p =
    process.env.APIFOX_PROJECT_FILE?.trim() || './openapi/NewAPI.apifox.json';
  try {
    const raw = await readFile(p, 'utf8');
    const project = JSON.parse(raw) as unknown;
    return extractSecuritySchemesFromApifoxProject(project);
  } catch {
    return new Map();
  }
}

function buildSecurity(
  ep: HttpEndpoint,
  schemes: Map<number, { name: string; scheme: OpenApiSecuritySchemeObject }>
): {
  security?: Array<Record<string, string[]>>;
  securitySchemes?: Record<string, any>;
} {
  const usedSchemeIds =
    ep.securityScheme?.schemeGroups?.flatMap((g) => g.schemeIds ?? []) ?? [];

  const uniqueIds = Array.from(new Set(usedSchemeIds)).filter(
    (x) => typeof x === 'number'
  );

  const authType = (ep.auth?.type || '').toLowerCase();
  const needsAuthExplicit =
    authType === 'securityscheme' || ep.securityScheme?.required === true;

  // Some items in `http-apis` rely on inherited auth settings and may return `{}`.
  // Infer auth requirement from module + description conventions.
  const desc = (ep.description || '').trim();
  const isExplicitNoAuth = desc.includes('🔓') || desc.includes('无需鉴权');
  const isManagement = ep.moduleId === 6660656;
  const isAiModel = ep.moduleId === 6656265;

  const needsAuthInferred =
    !needsAuthExplicit &&
    !isExplicitNoAuth &&
    (isAiModel ||
      // management endpoints are mostly protected unless explicitly marked public
      isManagement);

  const needsAuth = needsAuthExplicit || needsAuthInferred;

  const idsToUse =
    uniqueIds.length > 0
      ? uniqueIds
      : needsAuth
        ? // prefer the canonical BearerAuth (571886) when available
          schemes.has(571886)
          ? [571886]
          : schemes.has(583570)
            ? [583570]
            : Array.from(schemes.keys())
        : [];

  if (!needsAuth || idsToUse.length === 0) return {};

  const securitySchemes: Record<string, any> = {};
  const securityObj: Record<string, string[]> = {};

  for (const id of idsToUse) {
    const entry = schemes.get(id);
    if (!entry) continue;
    securitySchemes[entry.name] = entry.scheme;
    securityObj[entry.name] = [];
  }

  if (Object.keys(securityObj).length === 0) return {};

  return { security: [securityObj], securitySchemes };
}

async function main() {
  const outRoot = process.env.OPENAPI_OUT_DIR?.trim() || './openapi/generated';

  const shouldClean =
    (process.env.OPENAPI_CLEAN?.trim().toLowerCase() || 'true') !== 'false';

  // Clean old output to prevent stale files unless running an incremental source.
  if (shouldClean) {
    await rm(outRoot, { recursive: true, force: true });
  }
  await mkdir(outRoot, { recursive: true });

  const defs = await tryReadApifoxProjectDefs();
  const securitySchemes = await tryReadApifoxProjectSecuritySchemes();
  const root = await readHttpSource();
  if (!root?.success || !Array.isArray(root.data)) {
    throw new Error(
      'Invalid http source: expected { success: true, data: [] }'
    );
  }
  if (!process.env.HTTP_SOURCE_FILE?.trim()) {
    const localEndpoints = await readLocalHttpSources();
    const patchEndpoints = localEndpoints.filter(
      (ep) => !ep.overrideRemote && ep.patchTargetIds?.length
    );
    const overriddenRemoteKeys = new Set(
      localEndpoints
        .filter((ep) => ep.overrideRemote)
        .map((ep) => `${normalizeMethod(ep.method || 'get')} ${ep.path}`)
    );
    root.data = root.data
      .filter(
        (ep) =>
          !overriddenRemoteKeys.has(
            `${normalizeMethod(ep.method || 'get')} ${ep.path}`
          )
      )
      .map((ep) => {
        const endpointKey = `${normalizeMethod(ep.method || 'get')} ${ep.path}`;
        return patchEndpoints
          .filter(
            (patch) =>
              `${normalizeMethod(patch.method || 'get')} ${patch.path}` ===
                endpointKey && patch.patchTargetIds?.includes(ep.id)
          )
          .reduce(
            (patched, patch) => applyLocalEndpointPatch(patched, patch),
            ep
          );
      });
    root.data.push(
      ...localEndpoints.filter(
        (ep) => ep.overrideRemote || !ep.patchTargetIds?.length
      )
    );
  }

  let count = 0;
  const usedOperationIds = new Set<string>();

  for (const ep of root.data) {
    const group = groupByModuleId(ep.moduleId);
    const tags = (ep.tags && ep.tags.length > 0 ? ep.tags : ['default']).map(
      (t) => t || 'default'
    );
    if (
      group === 'ai-model' &&
      isExcludedAiModelTag(tags[0]) &&
      !isModelListEndpoint(ep)
    ) {
      continue;
    }
    const tagPathParts = tags[0].split('/').map(sanitizePathPart);

    const method = normalizeMethod(ep.method || 'get');
    const opBase =
      ep.operationId?.trim() ||
      `${method}-${ep.path}`.replace(/[{}]/g, '').replace(/\/+/g, '-');
    let operationId = slugify(opBase).replace(/-+/g, '-');
    if (usedOperationIds.has(operationId)) {
      operationId = `${operationId}-${ep.id}`;
    }
    usedOperationIds.add(operationId);

    const fileBase = `${method}-${slugify(ep.path)}-${operationId}-${ep.id}`;
    const fileName = `${sanitizePathPart(fileBase)}.json`;

    const outDir = path.join(outRoot, group, ...tagPathParts);
    await mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, fileName);

    const sec = buildSecurity(ep, securitySchemes);

      const doc = {
        openapi: '3.1.0',
        info: {
          title: ep.name || operationId,
          version: '1.0.0',
          description: ep.description || undefined,
        },
        tags: tags.map((name) => ({ name })),
        ...(ep.codeSamples?.length
          ? {
              'x-codeSamples': ep.codeSamples.map((sample) => ({
                lang: sample.lang,
                label: sample.label,
                source: sample.source || '',
              })),
            }
          : {}),
        ...(sec.securitySchemes
          ? { components: { securitySchemes: sec.securitySchemes } }
          : {}),
      paths: {
        [ep.path]: {
          [method]: {
            tags,
            summary: ep.name || undefined,
            description: ep.description || undefined,
            operationId,
            parameters: [
              ...(ep.parameters?.path ?? []).map((p) =>
                toOpenApiParam(p, 'path')
              ),
              ...(ep.parameters?.query ?? []).map((p) =>
                toOpenApiParam(p, 'query')
              ),
              ...(ep.parameters?.header ?? []).map((p) =>
                toOpenApiParam(p, 'header')
              ),
              ...(ep.parameters?.cookie ?? []).map((p) =>
                toOpenApiParam(p, 'cookie')
              ),
            ],
            ...(buildRequestBody(ep, defs)
              ? { requestBody: buildRequestBody(ep, defs) }
              : {}),
            ...(sec.security ? { security: sec.security } : {}),
            responses: buildResponses(ep, defs),
          },
        },
      },
    };

    await writeFile(outFile, JSON.stringify(doc, null, 2), 'utf8');
    count++;
  }

  console.log(
    `✅ Generated ${count} per-endpoint OpenAPI files into ${outRoot}`
  );
  console.log('Tip: set HTTP_SOURCE_URL to override the default Apifox URL.');
}

main().catch((err) => {
  console.error('❌ Failed to generate OpenAPI from http source:', err);
  process.exit(1);
});
