#!/bin/bash

echo "🚀 Starting Deployment for Service-V9..."

# 1. Install any new dependencies (just in case)
echo "📦 Installing dependencies..."
npm install

# 2. Build the frontend (Generates the new hashed files)
echo "🏗️  Building Frontend..."
npm run build

# 3. Fix the Backend (Restarts the PM2 process)
echo "🔄 Restarting PM2 Process..."
pm2 restart Service-V9-Prod

# 4. Restart Nginx
echo "🌐 Restarting Nginx Web Server..."
sudo systemctl restart nginx

# 5. Clean up the logs
echo "🧹 Flushing old logs..."
pm2 flush

echo "------------------------------------------"
echo "📊 SERVICE STATUS REPORT:"
echo "------------------------------------------"

# Show PM2 status for your specific app
pm2 status Service-V9-Prod

# Show Nginx status (briefly)
sudo systemctl status nginx --no-pager | grep -E "Active:|Main PID"

echo "------------------------------------------"
echo "✅ Deployment Complete! Your site is now updated."
echo "💡 Tip: Don't forget to 'Purge Everything' in Cloudflare if you don't see changes."
