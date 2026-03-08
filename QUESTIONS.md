# 项目难点与核心代码方案（QUESTIONS）

本文档汇总本项目在实际落地中的关键难点与可复用代码方案示例，覆盖后端（Express + PostgreSQL + Redis）、前端（React + TypeScript）与数据库（SQL/索引）。代码以“骨架/示例”为主，可直接放入 `backend/` 与 `frontend/` 对应目录进行演示或二次开发。

---

## 1. 多条件搜索与分页优化（缓存 + 索引）

- 目标：支持题目按标题/标签/难度/时间等多维过滤，结果稳定排序，深翻页性能不劣化。
- 关键点：组合索引、Keyset Pagination、Redis 条件缓存、全文检索（可选）。

示例：后端搜索服务 `backend/src/services/searchService.ts`
```ts
// backend/src/services/searchService.ts
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

export interface SearchParams {
  keyword?: string;          // 标题或内容关键字
  tagIds?: number[];         // 标签过滤
  difficulty?: 'easy'|'mid'|'hard';
  pageSize?: number;
  cursor?: { createdAt: string; id: number } | null; // keyset 游标
  order?: 'newest'|'hottest';
}

const DEFAULT_SIZE = 20;

export async function searchQuestions(db: Pool, redis: RedisClientType, params: SearchParams) {
  const pageSize = Math.min(params.pageSize ?? DEFAULT_SIZE, 50);
  const cacheKey = `q:search:${JSON.stringify({ ...params, pageSize })}`;

  // 1) 尝试缓存命中
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2) 动态拼接 SQL（仅示意，实际要用参数化避免注入）
  const values: any[] = [];
  const where: string[] = [];

  if (params.keyword) {
    // PostgreSQL 全文检索示例：tsvector + plainto_tsquery
    where.push(`to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_plain,'')) @@ plainto_tsquery($${values.length+1})`);
    values.push(params.keyword);
  }
  if (params.difficulty) {
    where.push(`difficulty = $${values.length+1}`);
    values.push(params.difficulty);
  }
  if (params.tagIds?.length) {
    // 多标签过滤：存在任一标签；若需“必须包含全部标签”，可改为 HAVING COUNT = tagIds.length
    where.push(`id IN (SELECT question_id FROM question_tags WHERE tag_id = ANY($${values.length+1}))`);
    values.push(params.tagIds);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Keyset 分页：按 created_at, id 倒序
  let cursorSql = '';
  if (params.cursor) {
    values.push(params.cursor.createdAt, params.cursor.id);
    cursorSql = `AND (created_at, id) < ($${values.length-1}, $${values.length})`;
  }

  const orderSql = `ORDER BY created_at DESC, id DESC`;

  const sql = `
    SELECT id, title, difficulty, created_at
    FROM questions
    ${whereSql}
    ${whereSql ? '' : 'WHERE 1=1'}
    ${cursorSql}
    ${orderSql}
    LIMIT $${values.length+1}
  `;
  values.push(pageSize + 1); // 取一条判断是否还有下一页

  const { rows } = await db.query(sql, values);
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? { createdAt: items[items.length-1].created_at, id: items[items.length-1].id } : null;

  const result = { items, nextCursor, hasMore };
  await redis.set(cacheKey, JSON.stringify(result), { EX: 60 }); // 短缓存 60s
  return result;
}
```

数据库索引示例：
```sql
-- db/sqls/indices_questions.sql
CREATE INDEX IF NOT EXISTS idx_questions_created_at_id ON questions (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions (difficulty);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags (tag_id, question_id);
-- 全文索引（按需）
CREATE INDEX IF NOT EXISTS idx_questions_tsv ON questions USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_plain,'')));
```

---

## 2. JWT 双 Token 无感刷新机制

- 目标：`access_token` 短期，`refresh_token` 长期，通过 401 自动刷新并重放请求。
- 关键点：Cookie `HttpOnly+Secure+SameSite`、刷新轮换、Redis 白/黑名单。

后端中间件与刷新接口：
```ts
// backend/src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_SECRET!;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ code: 'UNAUTHORIZED' });
  const token = auth.replace('Bearer ', '');
  try {
    (req as any).user = jwt.verify(token, ACCESS_SECRET);
    return next();
  } catch {
    return res.status(401).json({ code: 'EXPIRED' });
  }
}
```
```ts
// backend/src/routes/auth.ts
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import type { RedisClientType } from 'redis';

const router = Router();
const ACCESS_SECRET = process.env.ACCESS_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

export function authRoutes(redis: RedisClientType) {
  router.post('/refresh', async (req, res) => {
    try {
      const token = req.cookies['rt'];
      if (!token) return res.status(401).json({ code: 'NO_RT' });
      const payload = jwt.verify(token, REFRESH_SECRET) as any;

      // 检查 Redis 白名单/版本
      const allow = await redis.get(`rt:${payload.sub}:${payload.v}`);
      if (!allow) return res.status(401).json({ code: 'RT_REVOKED' });

      const newAccess = jwt.sign({ sub: payload.sub, role: payload.role }, ACCESS_SECRET, { expiresIn: '10m' });
      const newVersion = Date.now().toString();
      const newRefresh = jwt.sign({ sub: payload.sub, role: payload.role, v: newVersion }, REFRESH_SECRET, { expiresIn: '14d' });

      // 轮换：删除旧版本，写入新版本
      await redis.del(`rt:${payload.sub}:${payload.v}`);
      await redis.set(`rt:${payload.sub}:${newVersion}`, '1', { EX: 60*60*24*14 });

      res.cookie('rt', newRefresh, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 14*24*3600*1000 });
      return res.json({ access_token: newAccess });
    } catch {
      return res.status(401).json({ code: 'RT_INVALID' });
    }
  });
  return router;
}
```

前端 Axios 拦截重放：
```ts
// frontend/src/api/http.ts
import axios from 'axios';

const http = axios.create({ withCredentials: true });

http.interceptors.response.use(
  r => r,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401 && !config.__retried) {
      config.__retried = true;
      try {
        const { data } = await http.post('/auth/refresh');
        if (data?.access_token) {
          http.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
          config.headers['Authorization'] = `Bearer ${data.access_token}`;
          return http(config);
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default http;
```

---

## 3. 评论树结构与乐观更新

- 目标：支持无限层级回复，根评论分页、子评论按需展开；前端先显后稳（乐观更新）。
- 关键点：物化路径 `path`，`(question_id, path)` 索引；前端 pending 节点回滚。

表结构与索引：
```sql
-- db/sqls/comments.sql
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  parent_id BIGINT,
  path TEXT NOT NULL,            -- 例如 .12.45.90.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_question_path ON comments (question_id, path);
```

插入时计算路径（简化示例）：
```ts
// backend/src/services/commentService.ts
import type { Pool } from 'pg';

export async function addComment(db: Pool, input: { questionId: number; userId: number; content: string; parentId?: number }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let path = '.';
    if (input.parentId) {
      const { rows } = await client.query('SELECT path FROM comments WHERE id = $1', [input.parentId]);
      path = (rows[0]?.path ?? '.') + `${input.parentId}.`;
    }
    const { rows } = await client.query(
      `INSERT INTO comments (question_id, user_id, content, parent_id, path)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
       [input.questionId, input.userId, input.content, input.parentId ?? null, path]
    );
    await client.query('COMMIT');
    return { id: rows[0].id, created_at: rows[0].created_at };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

前端乐观更新（简化）：
```tsx
// frontend/src/features/comments/useAddComment.tsx
import { useState } from 'react';
import http from '@/api/http';

export function useAddComment() {
  const [pendingMap, setPendingMap] = useState<Record<string, any>>({});

  async function add({ questionId, parentId, content }: { questionId: number; parentId?: number; content: string; }) {
    const tempId = `tmp_${Date.now()}`;
    setPendingMap(m => ({ ...m, [tempId]: { id: tempId, content, parentId, status: 'pending' } }));
    try {
      const { data } = await http.post('/comments', { questionId, parentId, content });
      setPendingMap(m => {
        const copy = { ...m };
        delete copy[tempId];
        return copy;
      });
      return data;
    } catch (e) {
      setPendingMap(m => {
        const copy = { ...m };
        copy[tempId] = { ...copy[tempId], status: 'error' };
        return copy;
      });
      throw e;
    }
  }

  return { add, pendingMap };
}
```

---

## 4. Markdown + 富文本双模式题目编辑

- 目标：教师可在 Markdown 或富文本间切换；安全渲染、代码高亮、多媒体上传。
- 关键点：`content_type`、`content_raw`、`content_html` 三分存储；XSS 过滤；云存储直传。

表字段（示例）：
```sql
ALTER TABLE questions
  ADD COLUMN content_type TEXT NOT NULL DEFAULT 'markdown',
  ADD COLUMN content_raw   TEXT NOT NULL DEFAULT '',
  ADD COLUMN content_html  TEXT NOT NULL DEFAULT '';
```

服务端渲染与净化（示例）：
```ts
// backend/src/services/contentService.ts
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function renderContent(input: { type: 'markdown'|'richtext'; raw: string }) {
  const window = new JSDOM('').window as any;
  const purify = DOMPurify(window);
  const html = input.type === 'markdown' ? marked.parse(input.raw) : input.raw;
  const safe = purify.sanitize(html);
  return safe;
}
```

前端编辑器双模式（示意）：
```tsx
// frontend/src/features/editor/QuestionEditor.tsx
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';
const RichEditor = dynamic(() => import('react-quill'), { ssr: false });

export default function QuestionEditor() {
  const [mode, setMode] = useState<'markdown'|'richtext'>('markdown');
  const [value, setValue] = useState('');
  return (
    <div>
      <select value={mode} onChange={e => setMode(e.target.value as any)}>
        <option value="markdown">Markdown</option>
        <option value="richtext">富文本</option>
      </select>
      {mode === 'markdown' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <textarea value={value} onChange={e => setValue(e.target.value)} />
          <div className="preview"><ReactMarkdown>{value}</ReactMarkdown></div>
        </div>
      ) : (
        <RichEditor value={value} onChange={setValue} />
      )}
    </div>
  );
}
```

---

## 5. 统一权限与防刷限流

- 目标：RBAC + 路由中间件校验；登录、发评论等行为限流；安全基线。
- 关键点：角色-资源-动作映射、`express-rate-limit` + Redis、Helmet/CORS。

权限中间件：
```ts
// backend/src/middlewares/permission.ts
import { Request, Response, NextFunction } from 'express';

type Role = 'student'|'teacher'|'admin';
const allowMap: Record<string, Role[]> = {
  'questions:create': ['teacher','admin'],
  'questions:update': ['teacher','admin'],
  'questions:delete': ['admin'],
  'users:list': ['admin'],
};

export function requirePerm(perm: keyof typeof allowMap) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role: Role | undefined = (req as any).user?.role;
    if (role && allowMap[perm].includes(role)) return next();
    return res.status(403).json({ code: 'FORBIDDEN', perm });
  };
}
```

限流中间件：
```ts
// backend/src/middlewares/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
redis.connect();

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.sendCommand(args as any) }),
});
```

---

## 6. SQL 与 N+1 查询治理

- 目标：避免后端循环触发多次相似 SQL；改为一次性 JOIN 或批量查询；必要时使用 DataLoader。

批量查询替代 N+1：
```ts
// backend/src/services/questionService.ts
import type { Pool } from 'pg';

export async function listWithTags(db: Pool, ids: number[]) {
  const { rows } = await db.query(
    `SELECT q.id, q.title, qt.tag_id
     FROM questions q
     LEFT JOIN question_tags qt ON qt.question_id = q.id
     WHERE q.id = ANY($1)`,
     [ids]
  );
  const map: Record<number, { id: number; title: string; tagIds: number[] }> = {};
  for (const r of rows) {
    if (!map[r.id]) map[r.id] = { id: r.id, title: r.title, tagIds: [] };
    if (r.tag_id) map[r.id].tagIds.push(r.tag_id);
  }
  return Object.values(map);
}
```

DataLoader 批处理（可选）：
```ts
// backend/src/utils/tagLoader.ts
import DataLoader from 'dataloader';
import type { Pool } from 'pg';

export function makeTagLoader(db: Pool) {
  return new DataLoader<number, number[]>(async (questionIds) => {
    const { rows } = await db.query(
      `SELECT question_id, tag_id FROM question_tags WHERE question_id = ANY($1)`,
      [questionIds]
    );
    const map = new Map<number, number[]>();
    for (const id of questionIds) map.set(id, []);
    for (const r of rows) map.get(r.question_id)!.push(r.tag_id);
    return questionIds.map(id => map.get(id)!);
  });
}
```

---

## 7. 首屏与列表渲染提速

- 目标：用户可感知速度 < 800ms；列表滚动流畅；网络与渲染双端优化。

前端列表虚拟化与懒加载：
```tsx
// frontend/src/components/QuestionList.tsx
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export default function QuestionList({ items }: { items: { id: number; title: string }[] }) {
  return (
    <div style={{ height: 600 }}>
      <AutoSizer>
        {({ height, width }) => (
          <List height={height} width={width} itemCount={items.length} itemSize={56}>
            {({ index, style }) => <div style={style}>{items[index].title}</div>}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}
```

HTTP 压缩与字段裁剪：
```ts
// backend/src/app.ts
import express from 'express';
import compression from 'compression';
const app = express();
app.use(compression());

app.get('/api/questions', async (req, res) => {
  // 仅返回列表必要字段
  // ...
  res.json({ items: [{ id: 1, title: 'Two Sum' }] });
});
```

CDN 与协商缓存（响应头示例）：
```ts
// backend/src/middlewares/cacheHeaders.ts
import { Request, Response, NextFunction } from 'express';
export function withEtag(req: Request, res: Response, next: NextFunction) {
  const etag = 'W/"questions-v1"';
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  res.setHeader('ETag', etag);
  next();
}
```

---

## 使用说明

- 将以上代码片段放入相应目录（已在注释中标注路径）。
- 环境变量：`ACCESS_SECRET`、`REFRESH_SECRET`、`REDIS_URL` 等需配置。
- 在数据库层应用对应索引 SQL，并用 `EXPLAIN ANALYZE` 验证执行计划。
- 根据你们的现有项目结构适当命名与拆分文件。
