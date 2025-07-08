# Build stage
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /app
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .
COPY wwwroot ./wwwroot
EXPOSE 7001
ENV ASPNETCORE_URLS=https://+:7001;http://+:5000
ENTRYPOINT ["dotnet", "SilkyRoad.API.dll"] 