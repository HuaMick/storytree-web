# storytree-web — hosted Keystatic editor image (Cloud Run).
#
# Builds ONLY the editor target (PUBLIC_STORYTREE_WEB_EDITOR=github): a standalone
# @astrojs/node server that serves the static marketing pages PLUS Keystatic's
# on-demand /keystatic + /api/keystatic routes. The public here.now site is built
# and deployed separately (npm run build → static) and never uses this image.
#
# The GitHub App credentials (KEYSTATIC_GITHUB_CLIENT_ID / _CLIENT_SECRET /
# KEYSTATIC_SECRET) are injected at RUNTIME from Secret Manager — never baked in.
# PUBLIC_KEYSTATIC_GITHUB_APP_SLUG is a plain (non-secret) runtime env var.

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:editor

# ---- runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# The standalone server reads HOST/PORT; Cloud Run injects PORT (defaults to 8080).
ENV HOST=0.0.0.0
ENV PORT=8080
# Bundled SSR output + node_modules (Vite externalises some runtime deps, so the
# full module tree from the build stage is the safe, simple thing to ship).
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 8080
CMD ["node", "./dist/server/entry.mjs"]
