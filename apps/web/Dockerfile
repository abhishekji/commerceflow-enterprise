FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.mjs ./
COPY apps/web ./apps/web
# Relative URL so the browser calls the same origin and nginx proxies to the API.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build:web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/web /usr/share/nginx/html
ENV API_UPSTREAM=http://api:3000
EXPOSE 80
