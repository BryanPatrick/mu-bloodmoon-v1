# Cloudflare Container API proof

This is a non-production compatibility probe for the current NestJS API. It
keeps the existing Node/Express/Prisma process model and listens on `PORT=8080`.

The image was not built during CF-API-01 because no Docker-compatible local
engine (`docker`, `podman`, or `nerdctl`) was installed. The configuration is
therefore prepared but execution remains unproven.

The image deliberately contains the full repository install. Optimizing image
size and separating build/runtime dependencies belongs to a later experiment,
after the runtime choice is approved.
