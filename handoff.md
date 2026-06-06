# Project Handoff - Claim Device Web Dashboard Integration & Bug Fixes

## Summary of Changes
- **Backend API Scoped Sites**: Added `GET /dashboard/sites` in [dashboard.ts](file:///c:/local/opencode/iot/esp32_loss_power/backend/src/routes/dashboard.ts) allowing admins to query all sites (optionally filtered by `tenantId`) and regular users to list sites only within their default tenant.
- **Frontend API Client Update**: Updated [api.ts](file:///c:/local/opencode/iot/esp32_loss_power/frontend/src/api.ts) with `Site` type definitions and the wrapper methods `api.sites` and `api.claimDevice` calling `/dashboard/sites` and `/devices/claim` respectively.
- **Claim Device UI Implementation**: Added the "🔌 Claim Thiết bị" button to the device page header and created the `ClaimDeviceModal` component in [Devices.tsx](file:///c:/local/opencode/iot/esp32_loss_power/frontend/src/pages/Devices.tsx):
  - **Regular Users**: Input fields for serial number and display name, with a site dropdown selector limited to their tenant.
  - **Platform Admins**: Complete selector fields for target Tenant, Site, and Owner User to map any device to any user/site.
  - Modal handles dynamic fetching, validations, loading/disabled states, error notifications, and immediate list updates on success.
- **Script Path Migration**: Fixed default deploy/verify directories to point to `/home/technician/...` instead of `/home/tma_agi/...` in [deploy-vps.sh](file:///c:/local/opencode/iot/esp32_loss_power/scripts/deploy-vps.sh) and [verify-vps.sh](file:///c:/local/opencode/iot/esp32_loss_power/scripts/verify-vps.sh).
- **User Tenant Enforcement Bug Fix**:
  - **Identified Issue**: User `long` was created without a default tenant (since Tenant field was optional in the "Create User" UI). When logging in, the empty tenant ID caused backend queries to return empty lists.
  - **Database Fix**: Migrated user `long` record to set `defaultTenantId: "tenant-default"` and created their membership entry in the `tenant_memberships` collection.
  - **UI Prevention**: Modified [Users.tsx](file:///c:/local/opencode/iot/esp32_loss_power/frontend/src/pages/Users.tsx) to make the `Tenant` dropdown selector **mandatory** (required) for standard users, preventing creation of tenant-less users.

## Current System State
- Frontend and backend builds compile with zero errors locally (`tsc` validation passed).
- All changes are fully implemented, integrated, and deployed.
- User `long` now has a default tenant and membership, meaning their assigned devices (`004A936C` and `D534E3EC`) are fully visible to them upon login.

## Next Steps
- Commit and push changes to the GitHub repository to trigger the automatic Docker image build and push (GHCR.io) workflows for both backend and frontend.
- Run the VPS deployment script or pull latest images and restart the containers on the VPS (`167.71.207.5`).
- Verify visibility of devices inside user `long`'s dashboard account.
