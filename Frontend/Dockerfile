# Build stage
FROM node:20 AS build
WORKDIR /app
COPY . .
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm install
RUN npm run build -- --output-path=dist

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 