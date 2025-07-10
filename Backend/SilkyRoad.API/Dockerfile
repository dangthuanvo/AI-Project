# Build stage
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /app
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS runtime
WORKDIR /app

# Copy published app
COPY --from=build /app/out .

# ✅ Copy seed uploads
COPY seed/uploads /app/seed/uploads

# ✅ Copy entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# ✅ Copy wwwroot to support static serving during build (safe fallback)
COPY wwwroot ./wwwroot

EXPOSE 7001
ENV ASPNETCORE_URLS=http://+:5000

# ✅ Use entrypoint to seed data, then start app
ENTRYPOINT ["/app/entrypoint.sh"]
