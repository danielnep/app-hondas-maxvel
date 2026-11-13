FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.js ./
COPY server ./server
COPY src ./src
COPY assets ./assets
COPY central.html index.html manifest.webmanifest sw.js ./
EXPOSE 8000
CMD ["node", "server.js"]
