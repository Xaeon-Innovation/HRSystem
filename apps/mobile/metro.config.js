const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const http = require("node:http");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const API_PROXY_TARGET =
  process.env.EXPO_API_PROXY_TARGET ?? "http://127.0.0.1:4000";

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

/**
 * Proxy /v1 and /health to the Fastify API so browser previews that only
 * forward Metro (:8081) still reach Postgres-backed routes.
 */
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      const url = req.url ?? "";
      if (!url.startsWith("/v1") && !url.startsWith("/health")) {
        return metroMiddleware(req, res, next);
      }

      const target = new URL(url, API_PROXY_TARGET);
      const headers = { ...req.headers, host: target.host };
      delete headers["origin"];

      const proxyReq = http.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port,
          path: target.pathname + target.search,
          method: req.method,
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );
      proxyReq.on("error", (err) => {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "API proxy failed",
            detail: String(err.message ?? err),
            target: API_PROXY_TARGET,
          }),
        );
      });
      req.pipe(proxyReq);
    };
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
