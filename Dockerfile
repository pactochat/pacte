# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build # or "tsc" if you have a build script
EXPOSE 3000

ENV OPENAI_API_KEY=YOUR_KEY_HERE
CMD ["node", "dist/index.js"]
