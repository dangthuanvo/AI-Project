# Build stage
FROM node:18 AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build --prod

# Runtime stage
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist/silky-road .
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]