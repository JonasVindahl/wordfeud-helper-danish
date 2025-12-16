# Cloudflare + Nginx/Apache Security Setup Guide

## Your Current Architecture

```
Browser → Cloudflare CDN → cloudflared tunnel → Nginx/Apache → Wordfeud App
```

## Security Headers Configuration

With this setup, you have **three places** where you can set security headers:

1. **Cloudflare Dashboard** (CDN level - recommended for global headers)
2. **Nginx/Apache** (Server level - recommended for app-specific headers)
3. **Application meta tags** (Already implemented - fallback only)

---

## 1️⃣ Cloudflare Dashboard Configuration (RECOMMENDED)

### Step-by-Step:

1. **Log in to Cloudflare Dashboard**
2. **Select your domain**
3. **Go to: Rules → Transform Rules → HTTP Response Headers**
4. **Click "Create Rule"**

### Create Rule: Security Headers

**Rule Name:** `Wordfeud Security Headers`

**When incoming requests match:**
- Field: `Hostname`
- Operator: `equals`
- Value: `your-domain.com` (or use wildcard for all: `*`)

**Then:**

Add the following headers:

| Header Name | Value |
|-------------|-------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=(), usb=()` |
| `X-XSS-Protection` | `1; mode=block` |

### Enable HSTS (if using HTTPS):

5. **Go to: SSL/TLS → Edge Certificates**
6. **Enable "Always Use HTTPS"** (recommended)
7. **Enable "HTTP Strict Transport Security (HSTS)"**
   - Max Age: `12 months` (31536000 seconds)
   - Include subdomains: ✅ Yes (if applicable)
   - Preload: ✅ Yes (optional, but recommended)

---

## 2️⃣ Nginx Configuration (Server Level)

### Option A: Include Security Headers File

1. **Upload the security headers file:**
   ```bash
   # Copy the security headers file to your Nginx config directory
   sudo cp .nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
   ```

2. **Include it in your site configuration:**
   ```nginx
   # /etc/nginx/sites-available/wordfeud (or your site config)
   server {
       listen 80;
       server_name your-domain.com;

       root /var/www/wordfeud;
       index index.html;

       # Include security headers
       include /etc/nginx/snippets/security-headers.conf;

       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

3. **Test and reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option B: Inline Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/wordfeud;
    index index.html;

    # Security Headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

---

## 3️⃣ Apache Configuration (if using Apache behind Nginx)

If you're using Nginx as reverse proxy with Apache backend:

1. **Enable mod_headers:**
   ```bash
   sudo a2enmod headers
   sudo systemctl restart apache2
   ```

2. **Option A: Use .htaccess file:**
   ```bash
   # Copy .htaccess-security-headers to your web root
   cp .htaccess-security-headers /var/www/wordfeud/.htaccess
   ```

3. **Option B: Add to VirtualHost:**
   ```apache
   <VirtualHost *:8080>
       ServerName your-domain.com
       DocumentRoot /var/www/wordfeud

       # Include security headers
       Include /etc/apache2/conf-available/security-headers.conf

       <Directory /var/www/wordfeud>
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```

---

## 4️⃣ Cloudflare Tunnel (cloudflared) Configuration

Your `cloudflared` tunnel should be configured to pass headers through. Check your config:

```yaml
# ~/.cloudflared/config.yml or /etc/cloudflared/config.yml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/credentials.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:80
    # No need to add headers here - let Nginx/Apache handle it
  - service: http_status:404
```

**Important:** Cloudflared passes headers from your origin server (Nginx/Apache) to Cloudflare, so configure headers at Nginx/Apache level OR Cloudflare Dashboard level.

---

## 🎯 Recommended Approach

For your setup (Nginx/Apache + Cloudflare), I recommend:

### **Priority 1: Set Headers at Nginx/Apache Level**
✅ Full control over headers
✅ Works even if Cloudflare is bypassed
✅ Easier to version control

### **Priority 2: Additional Headers at Cloudflare Level**
✅ HSTS configuration (easier in Cloudflare Dashboard)
✅ Global rate limiting
✅ DDoS protection
✅ WAF rules

---

## 🧪 Testing Your Headers

After configuration, test your security headers:

### 1. Online Tools:
- **Security Headers:** https://securityheaders.com
- **Mozilla Observatory:** https://observatory.mozilla.org
- **SSL Labs:** https://www.ssllabs.com/ssltest/ (for HTTPS/HSTS)

### 2. Browser DevTools:
```bash
# Open DevTools (F12) → Network tab → Refresh page → Click on document
# → Headers tab → Check "Response Headers"
```

### 3. Command Line (curl):
```bash
curl -I https://your-domain.com
```

Expected output should include:
```
content-security-policy: default-src 'self'; ...
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: no-referrer
permissions-policy: geolocation=(), ...
```

---

## 🔐 Cloudflare Additional Security Features

Since you're using Cloudflare, enable these:

### 1. **SSL/TLS Settings:**
- **SSL/TLS Encryption Mode:** Full (Strict) - recommended if you have valid SSL on origin
- **Minimum TLS Version:** 1.2 or higher
- **Automatic HTTPS Rewrites:** ON

### 2. **Security Settings:**
- **Security Level:** Medium or High
- **Challenge Passage:** 30 minutes
- **Browser Integrity Check:** ON

### 3. **Firewall Rules:**
Create a rule to block malicious patterns:
- Field: `HTTP Request Header`
- Operator: `contains`
- Value: `<script`, `javascript:`, `data:text/html`
- Action: `Block`

### 4. **Rate Limiting (optional):**
Prevent abuse by limiting requests per IP:
- Requests per minute: 60-100 (adjust as needed)
- Action: Challenge or Block

### 5. **Bot Fight Mode:**
- Enable "Bot Fight Mode" in Security → Bots
- Helps prevent automated attacks

---

## 📋 Quick Deployment Checklist

- [ ] Copy `.nginx-security-headers.conf` to Nginx snippets directory
- [ ] Include security headers in Nginx site configuration
- [ ] Test Nginx config: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] (If using Apache) Copy `.htaccess-security-headers` to web root
- [ ] Configure Cloudflare Transform Rules for security headers
- [ ] Enable Cloudflare HSTS
- [ ] Enable Cloudflare "Always Use HTTPS"
- [ ] Test headers with: `curl -I https://your-domain.com`
- [ ] Test with securityheaders.com
- [ ] Verify no console errors in browser

---

## 🆘 Troubleshooting

### Headers not appearing:
1. **Check Nginx/Apache config syntax**
2. **Verify mod_headers is enabled** (Apache)
3. **Check Cloudflare Transform Rules are active**
4. **Clear browser cache and Cloudflare cache**

### Cloudflare Cache Issues:
```bash
# Purge Cloudflare cache after header changes
# Go to: Caching → Configuration → Purge Everything
```

### Conflicting Headers:
If you set headers in BOTH Nginx AND Cloudflare, Cloudflare's headers will typically take precedence. Choose one location to avoid conflicts.

---

## 💡 Pro Tips

1. **Start with Nginx headers first**, then verify they work
2. **Use Cloudflare for HSTS** (easier to manage, includes preload list)
3. **Set cache rules carefully** - don't cache the HTML file with security headers for too long
4. **Monitor Cloudflare Analytics** for blocked requests
5. **Test in incognito mode** to avoid cached headers

---

Need help with specific configuration? Let me know your exact setup! 🚀
