import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { bot } from "./bot/bot.js";
import { env } from "./config/env.js";
import { Logger } from "./utils/logger/index.js";

export function startWebhookServer(): Server {
  const secretPath = `/${env.WEBHOOK_SECRET}`;

  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method === "POST" && req.url === secretPath) {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }
        try {
          const update = JSON.parse(body);
          await bot.handleUpdate(update);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("ok");
        } catch (error) {
          Logger.error(["Webhook update handling failed", error as Error]);
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("bad request");
        }
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
    },
  );

  server.listen(env.PORT, () => {
    Logger.info(`Webhook server listening on port ${env.PORT}`);
  });

  return server;
}