# Quartermaster Deployment Guide

This directory contains configuration files for deploying Quartermaster in production.

## 📁 Directory Structure

```
deployment/
├── systemd/               # Systemd service files
│   └── quartermaster.service
└── reverse-proxies/       # Web server configs
    ├── apache.conf        # Apache 2.4+
    ├── nginx.conf         # Nginx
    └── Caddyfile          # Caddy v2
```

## 🚀 Systemd Service Setup

### 1. Copy service file
```bash
sudo cp deployment/systemd/quartermaster.service /etc/systemd/system/
```

### 2. Edit service file
```bash
sudo nano /etc/systemd/system/quartermaster.service
```

Replace `YOUR_USER` with your username (e.g., `ubuntu`, `admin`)

### 3. Enable and start
```bash
sudo systemctl daemon-reload
sudo systemctl enable quartermaster
sudo systemctl start quartermaster
```

### 4. Check status
```bash
sudo systemctl status quartermaster
sudo journalctl -u quartermaster -f
```

## 🌐 Reverse Proxy Setup

Choose ONE of the following based on your web server:

### Apache

1. **Install Apache & mods:**
```bash
sudo apt install apache2
sudo a2enmod proxy proxy_http ssl rewrite
```

2. **Copy config:**
```bash
sudo cp deployment/reverse-proxies/apache.conf /etc/apache2/sites-available/quartermaster.conf
```

3. **Edit config:**
```bash
sudo nano /etc/apache2/sites-available/quartermaster.conf
```
Replace `bot.yourdomain.com` with your domain

4. **Get SSL certificate:**
```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d bot.yourdomain.com
```

5. **Enable site:**
```bash
sudo a2ensite quartermaster
sudo systemctl reload apache2
```

### Nginx

1. **Install Nginx:**
```bash
sudo apt install nginx
```

2. **Copy config:**
```bash
sudo cp deployment/reverse-proxies/nginx.conf /etc/nginx/sites-available/quartermaster
```

3. **Edit config:**
```bash
sudo nano /etc/nginx/sites-available/quartermaster
```
Replace `bot.yourdomain.com` with your domain

4. **Get SSL certificate:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bot.yourdomain.com
```

5. **Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/quartermaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Caddy

1. **Install Caddy:**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

2. **Copy config:**
```bash
sudo cp deployment/reverse-proxies/Caddyfile /etc/caddy/Caddyfile
```

3. **Edit config:**
```bash
sudo nano /etc/caddy/Caddyfile
```
Replace `bot.yourdomain.com` with your domain

4. **Reload Caddy:**
```bash
sudo systemctl reload caddy
```

*Note: Caddy automatically handles SSL certificates via Let's Encrypt!*

## 🔒 Firewall Configuration

Allow HTTP and HTTPS:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📝 Notes

- Make sure port 4050 is NOT exposed publicly (only localhost)
- The web dashboard will be available at your domain
- Discord OAuth callback URL should match your domain
- Update `.env` with your domain in `CALLBACK_URL` and `DASHBOARD_URL`

## 🆘 Troubleshooting

### Bot not starting
```bash
sudo journalctl -u quartermaster -n 50 --no-pager
```

### Web dashboard not accessible
1. Check if bot is running: `sudo systemctl status quartermaster`
2. Check if port 4050 is listening: `sudo netstat -tulpn | grep 4050`
3. Check reverse proxy config: `sudo nginx -t` or `sudo apache2ctl -t`
4. Check firewall: `sudo ufw status`

### SSL certificate issues
```bash
sudo certbot renew --dry-run
```

## 🏴‍☠️ BarrerSoftware

Built by Captain CP and the Qs.  
Free forever. No subscriptions. No corporate bullshit.

**If it's free, it's free. Period.**
