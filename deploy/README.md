# How runwisp.xyz is deployed

- `Caddyfile`: the reverse-proxy block, as live. No `log` directive, so no access log (and no request IPs) is written.
- `wisp.service`: the systemd unit. The app listens on 127.0.0.1 only; secrets come from an env file on the server.
- The app itself writes no per-request log. It logs only startup and errors.

Each deploy is built from a pushed commit with `BUILD_SHA` set to it. The footer and `/api/status` show that commit, so you can compare the live site with this repo.

What you can check from outside, and what you can't, is in the FAQ on the site ("Can I check any of this myself?").
