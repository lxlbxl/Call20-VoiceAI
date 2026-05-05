# Call20 Frontend Dockerfile
FROM node:18-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install

# Copy source and build (skip tsc, vite build handles transpilation)
COPY . .
RUN npx vite build

# Use Nginx to serve the build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Add a basic nginx config if needed, or just use default
CMD ["nginx", "-g", "daemon off;"]
