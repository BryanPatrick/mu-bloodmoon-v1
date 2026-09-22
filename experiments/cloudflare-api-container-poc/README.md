# Cloudflare Container API proof

This directory defines the non-production Worker router for the current
NestJS/Express/Prisma API. The Container image is built from the repository
root `Dockerfile.cloudflare-poc` by Cloudflare Workers Builds; local Docker is
not required.

The remote proof uses Node 22, builds NestJS, generates the Prisma Linux client,
publishes one `lite` image and runs at most one sleeping shadow instance. It has
no custom domain or production route. Container Internet access and every known
operational/financial mutation flag are disabled.

The current runtime cannot boot without a database because
`PrismaService.onModuleInit()` eagerly connects before Nest opens port 8080.
With the deliberately nonexistent synthetic database, Cloudflare reports a
port-check crash and `/api/health` and `/api/ready` return HTTP 500. Do not use
production to bypass this gate. Resume database-dependent tests only with an
explicitly approved disposable MySQL/MariaDB.

The resource is intentionally retained as an isolated shadow pending Bryan's
cleanup decision.
