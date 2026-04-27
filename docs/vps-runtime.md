# VPS Runtime

## Current Host

- SSH alias: `vps-prod`
- user: `tma_agi`
- Tailscale IP: `100.77.157.70`
- SSH port: `4422`
- public MQTT IP: `113.161.220.166`

## Current Deploy Path

- deploy dir: `/home/tma_agi/esp32_loss_power_deploy`
- active compose file on host: `docker-compose.deploy.yml`
- tracked repo equivalent: `docker-compose.vps.yml`

## Current Runtime Shape

- `mosquitto`
- `mongodb`
- `backend`
- `assistant-bot`

Optional debug-only runtime kept on host filesystem but not exposed by default:

- firmware artifact directory: `/home/tma_agi/esp32_loss_power_deploy/firmware-host`
- start on demand: `scripts/start-vps-firmware-host.sh /home/tma_agi/esp32_loss_power_deploy/firmware-host`
- stop after test: `scripts/stop-vps-firmware-host.sh`

Current host exposure:

- MQTT public: `0.0.0.0:1883 -> mosquitto:1883`
- backend host-local only: `127.0.0.1:3000 -> backend:3000`
- MongoDB internal only
- firmware debug host: off by default; only public when explicitly started for OTA diagnostics

## Current VPS-Specific Workarounds

1. Docker image pulls should use a clean client config path:

```bash
DOCKER_CONFIG=/home/tma_agi/empty-docker-config
```

2. Current VPS Compose parser is stricter/older than expected.
   Use `docker-compose.vps.yml` semantics for this host when the regular prod compose path fails.

3. Current working Mosquitto password mount on this VPS is:

```text
./infra/mosquitto/passwd.user:/mosquitto/config/passwd:ro
```

## Current Boot Behavior

- `docker.service` is `enabled`
- `docker.service` is `active`
- all stack services use `restart: unless-stopped`

This means the current containers are expected to auto-start again after Ubuntu reboot, as long as Docker starts normally and the containers were not manually stopped.

## Current Verify Commands

```bash
ssh vps-prod "cd /home/tma_agi/esp32_loss_power_deploy && DOCKER_CONFIG=/home/tma_agi/empty-docker-config docker-compose -f docker-compose.deploy.yml ps"
ssh vps-prod "curl -sS http://127.0.0.1:3000/healthz"
ssh vps-prod "curl -sS http://127.0.0.1:3000/devices/SN005/health"
```

Scripted equivalents:

```bash
scripts/deploy-vps.sh --env-file /path/to/.env.prod --passwd-file /path/to/passwd.user
scripts/verify-vps.sh --device SN005
```

## Current Verified State

- VPS backend health returns `status=ok`
- MQTT broker accepts authenticated device traffic
- `SN005` now publishes to VPS
- `SN005` is `claimed`
- `SN005` is `active`
