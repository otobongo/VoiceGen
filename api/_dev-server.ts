// Vite dev-server plugin that runs the /api serverless functions locally in the
// same process as the frontend. A single `npm run dev` exercises the exact same
// handler code Vercel runs in production - no Vercel CLI login, no second
// process, no dev/prod drift.
//
// In production this file is unused: Vercel discovers api/*.ts directly.

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Handler = (req: any, res: any) => unknown | Promise<unknown>;

// Map request path -> handler module path (relative to this file).
const ROUTES: Record<string, string> = {
  '/api/generate-speech': './generate-speech.ts',
  '/api/prepare-copy': './prepare-copy.ts',
  '/api/audit': './audit.ts',
};

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Adapt Node's bare ServerResponse to the small slice of the Vercel response
// API the handlers use: status().json() and setHeader().
function decorateResponse(res: ServerResponse) {
  const vercelRes = res as ServerResponse & {
    status: (code: number) => typeof vercelRes;
    json: (body: unknown) => void;
  };
  vercelRes.status = (code: number) => {
    res.statusCode = code;
    return vercelRes;
  };
  vercelRes.json = (body: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(body));
  };
  return vercelRes;
}

export function apiDevServer(): Plugin {
  return {
    name: 'voicegen-api-dev-server',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const modulePath = ROUTES[url];
        if (!modulePath) {
          next();
          return;
        }

        try {
          const resolved = new URL(modulePath, import.meta.url).pathname;
          const mod = (await server.ssrLoadModule(resolved)) as {
            default: Handler;
          };

          const body = await readJsonBody(req);
          const vercelReq = Object.assign(req, {
            body,
            query: {} as Record<string, string>,
          });
          await mod.default(vercelReq, decorateResponse(res));
        } catch (err) {
          server.config.logger.error(`[api-dev] ${url} failed: ${String(err)}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
          }
          res.end(JSON.stringify({ error: 'DEV_HANDLER_ERROR' }));
        }
      });
    },
  };
}
