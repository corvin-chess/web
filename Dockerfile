# CV-199: static Vite build served by nginx with /api and /ws proxied to server.
# Uses the committed chess WASM pkg (no rustc in this image).

FROM node:22-bookworm AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s --retries=10 --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ | grep -qi Corvin
