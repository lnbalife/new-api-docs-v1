/**
 * API 文档中 curl 请求与交互式调试的域名配置
 * 用于 OpenAPI 文档页的请求示例和 Try it 功能
 */
export const API_BASE_URL =
  process.env.API_BASE_URL ??
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3300'
    : 'https://nodekey.biandianyun.com');
