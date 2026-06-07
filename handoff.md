# Project Handoff - Web Dashboard Unclaim Device Feature (v1.0.8)

## Summary of Changes
- **Unclaim Device Integration**: Added unclaim device (Hủy liên kết thiết bị) controls in the Controls tab of the Web Dashboard. When clicked, it calls the backend action API to unclaim the device from the tenant. The dashboard lists and device page are updated immediately to filter out the unclaimed device.
- **Backend Validation Resolved**: Made `actorUserId` optional in the Zod parser schema on `/devices/:deviceId/actions` (making it optional for all actions endpoints), and resolved it to the active JWT user ID. This prevents validation errors (400 Bad Request) from the frontend client.
- **File line-limit Compliance**: Kept all files strictly under the project-wide 100-line maximum limit (e.g. `DeviceDetailControls.tsx` is kept at 73 lines).

## Current System State
- Test device `7B34E3EC` (`nhaba`, ESP32) is fully functional and running version `1.0.8`. It is online, reporting telemetry normally.
- Production device `D534E3EC` (`NhaLong`, ESP32) is fully functional, successfully upgraded, online, and running version `1.0.8`.
- Production device `004A936C` (`NLMT_Long`, ESP8266) is fully functional, successfully upgraded, online, and running version `1.0.8`.
- Web Dashboard is fully functional, supporting custom range peak-day analysis, hourly date selection with live rollup, and unclaiming devices.

## Verification & Testing
- **TypeScript and Vite compilation**: Verified frontend compilation via `npm run build` and backend typechecking via `npm run typecheck` which both succeeded with 0 errors.
- **VPS Deployment**: Pulled new backend and frontend container images and successfully verified health endpoint is ok.

## Next Steps
- Monitor device updates and continue regular operations.
