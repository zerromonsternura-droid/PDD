# Dockerfile for PDD Test.kz application

FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose port
EXPOSE 3000

# Default environment variables (can be overridden by compose or runtime)
ENV PORT=3000
ENV DB_USER=postgres
ENV DB_PASS=123456
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_MAIN=postgres
ENV DB_USERS=pdd_users

CMD ["node", "server.js"]
