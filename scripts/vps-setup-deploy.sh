#!/bin/bash
set -euo pipefail

echo "=== Postiz VPS Deploy Infrastructure Setup ==="

# Step 1: Create log directory
mkdir -p /home/postiz/app/logs

# Step 2: Create .env.webhook template if it doesn't exist
if [ ! -f /home/postiz/app/.env.webhook ]; then
    cat > /home/postiz/app/.env.webhook <<'EOF'
# Generate with: openssl rand -hex 32
DEPLOY_WEBHOOK_SECRET=CHANGE_ME
EOF
    chmod 600 /home/postiz/app/.env.webhook
fi

# Step 3: Copy webhook service file and enable it
sudo cp /home/postiz/app/scripts/webhook-deploy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable webhook-deploy

# Step 4: Configure fail2ban
sudo tee /etc/fail2ban/jail.d/sshd-custom.conf > /dev/null <<'EOF'
[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
findtime = 600
bantime = 3600
ignoreip = 127.0.0.1/8 ::1
EOF
sudo systemctl restart fail2ban

# Step 5: Open firewall port 9443
sudo ufw allow 9443/tcp comment "Deploy webhook" 2>/dev/null || \
    sudo iptables -A INPUT -p tcp --dport 9443 -j ACCEPT

# Step 6: Install auto-update cron
CRON_CMD="*/5 * * * * /home/postiz/app/scripts/auto-update.sh 2>&1 | head -5 >> /home/postiz/app/logs/auto-update.log"
(crontab -l 2>/dev/null | grep -v "auto-update.sh"; echo "$CRON_CMD") | crontab -

# Step 7: Print next steps
echo ""
echo "=== Setup complete ==="
echo "NEXT STEPS:"
echo "  1. Edit /home/postiz/app/.env.webhook and set DEPLOY_WEBHOOK_SECRET"
echo "     Generate with: openssl rand -hex 32"
echo "  2. Start the webhook: sudo systemctl start webhook-deploy"
echo "  3. Add DEPLOY_WEBHOOK_SECRET to GitHub repo secrets"
echo "  4. Open port 9443 in Hostinger firewall panel (if external firewall exists)"
echo "  5. Test: curl -X POST -H \"Authorization: Bearer YOUR_SECRET\" http://YOUR_VPS_IP:9443/deploy"
