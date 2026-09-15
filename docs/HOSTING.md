# Hosting on a shared Verpex VPS

This guide assumes the Verpex VPS **already hosts other apps** (e.g. a public website and a CMS). HR Track must **coexist** with them.

**Do not** take over ports 80/443 with Caddy, and **do not** stop Nginx/Apache/cPanel that serve the existing sites.

## Strategy (safe coexistence)

| Layer | What happens |
|-------|----------------|
| Existing website + CMS | Keep using the host web server on **80/443** (unchanged) |
| HR Track containers | Run on **localhost only**: web `127.0.0.1:3000`, API `127.0.0.1:4000`, Postgres **not** published |
| Public HTTPS | Add **two new subdomains** and reverse-proxy them through the **existing** Nginx/Apache/cPanel |
| Firewall | Leave 80/443 as they are; do **not** open 3000/4000/5432 publicly |

```text
Internet
   │
   ▼
Existing Nginx / Apache / cPanel  (:80 / :443)
   ├── yoursite.com          → existing website   (unchanged)
   ├── cms.yoursite.com      → existing CMS       (unchanged)
   ├── app.YOURDOMAIN        → 127.0.0.1:3000     (HR web)
   └── api.YOURDOMAIN        → 127.0.0.1:4000     (HR API + /ws)
                                    │
                              Docker Compose
                              (postgres internal only)
```

Use two hostnames (recommended):

| Hostname | Role |
|----------|------|
| `app.YOURDOMAIN` | HR Track web UI |
| `api.YOURDOMAIN` | API + WebSocket + Polar webhook |

Replace `YOURDOMAIN` with the real domain (new subdomains are fine even if the main site stays on another name).

---

## 0. Collect from Verpex + inventory

From the Verpex panel and the server, note:

| Item | Example |
|------|---------|
| Public IPv4 | `203.0.113.10` |
| SSH user / key | `root` or sudo user |
| OS | Ubuntu / Debian / Alma / etc. |
| Existing apps | website domain(s), CMS domain(s) |
| Web stack | Nginx, Apache, LiteSpeed, or cPanel/WHM |

On the VPS, inventory (read-only, do not change yet):

```bash
# What owns 80/443?
sudo ss -tlnp | grep -E ':80|:443'

# Disk / memory headroom (builds need RAM)
df -h
free -h

# Are localhost 3000/4000 free?
sudo ss -tlnp | grep -E ':3000|:4000' || echo "3000/4000 free, good"
```

If something already uses `3000` or `4000`, set different ports in `.env.production` (`WEB_PUBLISH_PORT` / `API_PUBLISH_PORT`) and use those in the proxy configs below.

**RAM:** prefer ≥2 GB free for image builds. If the box is tight, build off-peak or add swap.

---

## 1. SSH in

```bash
ssh root@YOUR_VPS_IP
# or: ssh deploy@YOUR_VPS_IP
```

---

## 2. Deploy user (optional but recommended)

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys   # paste your laptop public key
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Test `ssh deploy@YOUR_VPS_IP` before changing SSH policy.

---

## 3. Firewall, do not break existing sites

If `ufw` is already in use for the website/CMS, **only ensure** SSH + HTTP + HTTPS are allowed. Do **not** reset rules blindly.

```bash
sudo ufw status
# If inactive and you want a minimal policy (only if you understand existing Verpex firewall):
# sudo ufw allow OpenSSH
# sudo ufw allow 80/tcp
# sudo ufw allow 443/tcp
# sudo ufw enable
```

Never allow `3000`, `4000`, or `5432` from the public internet.

---

## 4. Install Docker (does not replace Nginx/Apache)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# log out and back in
docker --version
docker compose version
```

Docker will **not** bind 80/443 unless you enable the optional `tls` Caddy profile, **do not enable that profile on this shared VPS**.

---

## 5. Clone the app

```bash
sudo mkdir -p /opt/hr-system
sudo chown "$USER":"$USER" /opt/hr-system
cd /opt/hr-system
git clone YOUR_REPO_URL .
```

---

## 6. DNS, add subdomains only

Create **A records** (do not change records for the existing website/CMS unless you intend to):

| Type | Name | Value |
|------|------|-------|
| A | `app` | `YOUR_VPS_IP` |
| A | `api` | `YOUR_VPS_IP` |

Wait until they resolve:

```bash
dig +short app.YOURDOMAIN
dig +short api.YOURDOMAIN
```

---

## 7. Production environment

```bash
cd /opt/hr-system
cp .env.production.example .env.production
bash scripts/gen-prod-secrets.sh    # paste into .env.production
nano .env.production
```

Set:

```bash
POSTGRES_PASSWORD=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
INTEGRATION_SECRETS_KEY=...   # AES-256-GCM key for connector secrets; 32+ chars

WEB_DOMAIN=app.YOURDOMAIN
API_DOMAIN=api.YOURDOMAIN

CORS_ORIGIN=https://app.YOURDOMAIN
WEB_APP_URL=https://app.YOURDOMAIN
API_PUBLIC_URL=https://api.YOURDOMAIN
NEXT_PUBLIC_API_URL=https://api.YOURDOMAIN
NEXT_PUBLIC_WS_URL=wss://api.YOURDOMAIN/ws

WEB_PUBLISH_PORT=3000
API_PUBLISH_PORT=4000

SEED_SUPER_ADMIN_EMAIL=you@YOURDOMAIN
SEED_SUPER_ADMIN_PASSWORD=...

# Optional email delivery for in-app notifications (pick one):
# RESEND_API_KEY=re_...
# EMAIL_FROM=HR Track <noreply@YOURDOMAIN>   # default: HR Track <onboarding@resend.dev>
# SMTP_WEBHOOK_URL=https://hooks.example/mail  # POST {to,subject,html,text} if not using Resend
```

Outbound HTTPS: custom REST polling only allows HTTPS (HTTP loopback in non-production). Private IPs are blocked (SSRF). Webhook ingest: `https://api.YOURDOMAIN/v1/webhooks/integrations/:connectionId`.

**Notifications email:** With `RESEND_API_KEY`, the API sends via [Resend](https://resend.com). Without it, set `SMTP_WEBHOOK_URL` to a relay that accepts JSON `{ to, subject, html, text }`. If neither is set, notifications stay in-app (`delivered_local`, or `queued` when `FCM_SERVER_KEY` is present).

`NEXT_PUBLIC_*` are baked into the web image at **build** time, change them later ⇒ rebuild `web`.

Never commit `.env.production`.

---

## 8. Start Docker **without** Caddy

```bash
cd /opt/hr-system
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Confirm localhost only:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
curl -fsS http://127.0.0.1:4000/health
curl -fsSI http://127.0.0.1:3000 | head
```

Existing sites on 80/443 should still work unchanged. Spot-check the website and CMS in a browser.

---

## 9. Reverse proxy through the existing web server

Pick the section that matches the stack you found with `ss` / the panel.

Example files in the repo:

- [`docker/nginx-hr-track.conf.example`](../docker/nginx-hr-track.conf.example)
- [`docker/apache-hr-track.conf.example`](../docker/apache-hr-track.conf.example)

### 9a. Nginx (common on Ubuntu VPS)

1. Ensure upgrade map exists once (e.g. `/etc/nginx/conf.d/connection_upgrade.conf`):

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

2. Copy and edit the example:

```bash
sudo cp /opt/hr-system/docker/nginx-hr-track.conf.example /etc/nginx/sites-available/hr-track.conf
sudo nano /etc/nginx/sites-available/hr-track.conf
# replace YOURDOMAIN; temporarily comment ssl_* lines if certs do not exist yet
sudo ln -sf /etc/nginx/sites-available/hr-track.conf /etc/nginx/sites-enabled/hr-track.conf
```

3. Issue certificates (HTTP-01) without touching other sites:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.YOURDOMAIN -d api.YOURDOMAIN
```

Or obtain certs first, then enable the `ssl_certificate` lines and reload.

4. Test and reload **only** Nginx config (does not restart other apps’ processes beyond reload):

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 9b. Apache (non-cPanel)

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel ssl headers rewrite
sudo cp /opt/hr-system/docker/apache-hr-track.conf.example /etc/apache2/sites-available/hr-track.conf
sudo nano /etc/apache2/sites-available/hr-track.conf   # replace YOURDOMAIN
sudo a2ensite hr-track.conf
sudo certbot --apache -d app.YOURDOMAIN -d api.YOURDOMAIN
sudo apache2ctl configtest && sudo systemctl reload apache2
```

### 9c. cPanel / WHM

Do **not** uninstall cPanel. Typical approach:

1. In cPanel → **Domains** / **Subdomains**: create `app` and `api` pointing at the same account/docroot or a placeholder.
2. Enable **AutoSSL** (or SSL) for both subdomains.
3. Reverse-proxy to Docker:
   - **WHM → Application Manager / Proxy**, or  
   - Edit the subdomain Apache include (e.g. via “Include Editor” / `userdata`) with `ProxyPass` to `http://127.0.0.1:3000/` and `http://127.0.0.1:4000/` (and WebSocket for `/ws` on the API host, see the Apache example).
4. If the panel forces a docroot, prefer proxy over serving static files from that docroot.

Exact cPanel click-paths vary by version; the goal is always: **TLS on the panel, traffic to localhost Docker ports**.

### 9d. LiteSpeed / OpenLiteSpeed

Add two virtual hosts for `app` / `api` with reverse-proxy external apps to `127.0.0.1:3000` and `127.0.0.1:4000`, enable WebSocket proxy for the API vhost, then issue SSL in the panel or with certbot as supported.

---

## 10. Seed (once)

```bash
cd /opt/hr-system
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  node packages/db/dist/seed.js
```

Log in at `https://app.YOURDOMAIN` and rotate admin passwords if you used defaults.

---

## 11. Smoke checks

```bash
curl -fsS https://api.YOURDOMAIN/health
# existing sites still OK:
#   curl -fsSI https://EXISTING_WEBSITE
#   curl -fsSI https://EXISTING_CMS
```

Browser:

1. `https://app.YOURDOMAIN` → login  
2. Live map → WebSocket stable  
3. Confirm website + CMS still load  

---

## 12. Polar billing (when ready)

Uncomment Polar vars in `.env.production`, then:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate api
```

1. Register webhook: `https://api.YOURDOMAIN/v1/webhooks/polar`
2. As super admin, open `/app/plans` → **Sync all to Polar**

Details: [BILLING.md](./BILLING.md).

---

## 13. Backups

```bash
mkdir -p ~/backups
cd /opt/hr-system
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U hr hr_system | gzip > ~/backups/hr-$(date +%Y%m%d).sql.gz
```

Cron example (`crontab -e`):

```cron
0 3 * * * cd /opt/hr-system && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_dump -U hr hr_system | gzip > /home/deploy/backups/hr-$(date +\%Y\%m\%d).sql.gz
```

Copy dumps off the VPS periodically. Keep **one** API container only (jobs are in-process).

---

## 14. Updates

```bash
cd /opt/hr-system
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

No need to touch website/CMS configs unless proxy ports or domains change.

---

## Useful commands

```bash
cd /opt/hr-system
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api web
docker compose -f docker-compose.prod.yml --env-file .env.production exec api sh
```

---

## Troubleshooting

### Existing website/CMS broke after deploy

You likely changed 80/443 or ran `--profile tls` (Caddy). Stop Caddy immediately:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile tls stop caddy
# or: docker rm -f $(docker ps -q --filter publish=80)  # only if you know it is Caddy
```

Restore Nginx/Apache/cPanel if you stopped them. HR Track should use **localhost ports + reverse proxy** only.

### Port 3000/4000 already in use

```bash
sudo ss -tlnp | grep -E ':3000|:4000'
```

Change `WEB_PUBLISH_PORT` / `API_PUBLISH_PORT` in `.env.production`, recreate containers, and update proxy `proxy_pass` targets.

### 502 Bad Gateway from Nginx/Apache

- Containers running? `docker compose ... ps`  
- Local health? `curl -fsS http://127.0.0.1:4000/health`  
- Proxy host/port typos?  
- SELinux/AppArmor rare on Verpex Ubuntu, check error logs: `sudo tail -50 /var/log/nginx/error.log`

### WebSocket fails on live map

API vhost must forward `Upgrade` / `Connection` (Nginx map + headers, or Apache `proxy_wstunnel` for `/ws`).

### Let’s Encrypt fails for new subdomains

DNS must point to this VPS first; existing certs for other domains are unrelated. Use certbot only with `-d app.YOURDOMAIN -d api.YOURDOMAIN`.

### Out of memory during `docker build`

Add swap or build during low traffic; `docker system prune -f` to reclaim space.

---

## Launch checklist (shared VPS)

- [ ] Inventoried existing website + CMS; left their vhosts alone  
- [ ] Did **not** enable Compose `--profile tls` / Caddy on 80/443  
- [ ] Docker publishes only `127.0.0.1:3000` and `127.0.0.1:4000`  
- [ ] Postgres not exposed on the host  
- [ ] DNS A records for `app` + `api` only  
- [ ] Reverse proxy + SSL added for those two hosts  
- [ ] Strong secrets in `.env.production`  
- [ ] Seeded; login + WS OK  
- [ ] Existing website + CMS still work  
- [ ] Backups scheduled  
- [ ] `.env.production` never committed  

---

## Appendix, dedicated VPS only (no other sites)

If this machine later becomes **only** for HR Track and nothing uses 80/443, you may use Caddy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile tls up -d --build
```

**Do not do this while the website and CMS still share the box.**
