FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
# Pinned to patch CVE-2026-92392 (nginx:alpine's base curl was 8.22.0-r0, vulnerable).
RUN apk add --no-cache curl=8.23.0-r0
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
