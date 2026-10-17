# Live updates: VPN test installation

Target: Windows 7 SP1 x64, IIS 7.5, .NET Framework 4.8, SQL Server 2005.
This package does not install/change the Linux service and does not open public access.
Linux SignalR 0.1.1 is already installed and tested separately.

## Prerequisites

- Back up EkmekSiparis before applying schema changes. Stop the IIS site for the switch.
- Apply migrations 012, 013 and 014 in EkmekSiparis, in order, after confirming version 11.
  Migration 012 retains an unused historical outbox table for schema sequence compatibility;
  order writers do not access either notification table.
- Migration 014 removes password expiry for customer/driver accounts and time expiry
  for admin/driver sessions. It does not generate or shorten PINs. Reset incompatible
  existing customer PINs to four ASCII digits and driver PINs to two ASCII digits
  through the admin panel; no shared default PIN is assigned. Customer first-change
  requirement remains, driver forced change is removed. Old login names remain valid
  until an admin explicitly changes them. Keep database backup for schema rollback.
- Grant SELECT, UPDATE on dbo.RealtimeDeliveryState to the verified app DB user.
  See database/permissions/013_realtime_delivery_state.sql (example is commented out).
- Copy the currently working encrypted Web.config to the new release on the SAME Windows machine.
  Preserve existing connection strings and other app settings. Do not deploy empty package connections.
- Apply the established restricted IIS ACLs to the new release before saving secrets:
  Administrators/SYSTEM full control, YepasSmokePool and IUSR read/execute, no ordinary-user write access.
- Both Windows server and admin workstation must resolve yepas-gateway.test to 192.168.5.135
  and trust the verified Caddy root. Test HTTPS with no certificate validation bypass.

## Configure the new release while it is offline

Run tools/Yepas.AdminTool.exe as administrator with --configure-realtime, --site-path,
--hub-url and --publish-url. The tool prompts for the SAME Base64 shared key already stored
in Linux /etc/yepas-realtime/service.env. Never pass the key as a command argument or send it in chat.
Hidden keyboard/paste input is accepted; press Enter after entering the key.

Endpoints for the current VPN setup:

- Hub: https://yepas-gateway.test:9443/hubs/orders
- Publisher: https://yepas-gateway.test:9443/internal/orders-changed

The tool protects appSettings with machine-bound DPAPI BEFORE saving; existing
connectionStrings remain untouched. Existing key/URL settings are replaced idempotently.
Do not copy this encrypted configuration to a different machine.
Keep the site stopped if configuration fails; the previous release remains the rollback target.

Linux /etc/yepas-realtime/service.env must allow the exact admin page Origin
(currently https://192.168.5.230:8443) and contain the same shared key.
Do not expose the environment file/key or disable TLS validation.
The publisher and auto-export executable use the site's decrypted settings on this machine.

## Switch and verify

Point the existing IIS site to the new release, preserving pool and HTTPS bindings, then start it.
Check login and normal order API first. Keep the stable daily export task enabled;
this release does NOT replace the 00:01 scheduled task.

- Admin opens a WebSocket to Linux /hubs/orders with a short-lived admin ticket.
- Customer/admin order write commits first, then attempts an isolated signed publication.
- No browser polling; reconnect/focus refresh is allowed. Server worker reconciles committed
  source state every 10 seconds and only acknowledges a successful publication.
- Verify order create/update/cancel and the pending-export indicator with an admin page left open.
- Verify role rejection, session expiry/reconnect and preserving an unsaved edit draft.
- Stop only the Linux realtime service to test isolation: order writes must still succeed;
  after restart the open admin page must recover and show authoritative current data.

Do not call the deployment complete until these end-to-end tests pass.
Public DNS/api.yepas.com.tr and internet exposure are deferred by user decision (2026-10-17).
