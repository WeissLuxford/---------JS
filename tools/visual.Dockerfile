FROM mcr.microsoft.com/playwright:v1.63.0-noble
RUN npm install -g playwright-core@1.63.0 && ln -s "$(npm root -g)/playwright-core" /opt/playwright-core
ENV PW_CORE=/opt/playwright-core/index.mjs
WORKDIR /app
