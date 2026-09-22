# Cloudflare Container API proof

This is a non-production compatibility probe for the current NestJS API. It
keeps the existing Node/Express/Prisma process model and listens on `PORT=8080`.

CF-API-02 rechecked Windows, known installation paths, services and Ubuntu on
WSL2. No Docker-compatible engine (`docker`, `podman`, or `nerdctl`) exists.
The image and Cloudflare router therefore remain prepared but execution is
unproven.

The image deliberately contains the full repository install. Optimizing image
size and separating build/runtime dependencies belongs to a later experiment,
after the runtime choice is approved.

## Exact prerequisite on this machine

WSL2 2.7.14 and an Ubuntu version-2 distribution already exist. The host is
Windows build 19044, while Docker's current requirement for Windows 10 is
22H2 build 19045 or newer. Bryan therefore needs to:

1. update Windows to a supported build (Windows 10 build 19045+ or a supported
   Windows 11 build);
2. install and start **Docker Desktop for Windows**, using the **WSL 2
   Linux-container backend**; and
3. keep Linux containers selected, not Windows containers.

The recommended per-user Docker Desktop install does not require a machine-wide
installation, but it is still external software and therefore was not
performed automatically.

Official instructions:

<https://docs.docker.com/desktop/setup/install/windows-install/>

After installation, open Docker Desktop, accept its license terms, wait for the
engine to become ready, and run from this worktree:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File experiments/cloudflare-api-container-poc/check-prerequisites.ps1
```

The gate is open only when the script reports all of the following:

```text
CONTAINER_ENGINE_AVAILABLE=YES
DOCKER_SERVER_OS=linux
DOCKER_SERVER_VERSION=<version>
DOCKER_COMPOSE_VERSION=<version>
```

Only after that gate should the image/database/SMTP POC be executed. No
Cloudflare account, production hostname, production database, or production
secret is required for that local test.

The Container router has its own pinned, non-production tool manifest. Its
configuration can be type-generated without deployment using:

```powershell
npm install --prefix experiments/cloudflare-api-container-poc
npm run --prefix experiments/cloudflare-api-container-poc cf:types
```

With Wrangler 4.136.2, CF-API-02 successfully generated the router types and
completed `wrangler deploy --dry-run --containers-rollout=none`. The dry run
bundled the Worker router at 53.31 KiB (13.09 KiB gzip), recognized its Durable
Object binding and Container Dockerfile, and created no Cloudflare resource.
It deliberately skipped the unavailable local image build.
