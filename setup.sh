#!/bin/bash

cd /root/back/backendajka

echo "🔧 Fixing PORT issue..."

# Replace PORT in server.js
sed -i 's/const PORT = process.env.PORT || 5000/const PORT = process.env.PORT || 80/g' src/server.js

# Verify
grep "const PORT" src/server.js

# Commit
git add src/server.js
git commit -m "Fix PORT to 80"

# Deploy
echo ""
echo "🚀 Deploying fix..."
caprover deploy --appName backend

echo ""
echo "✅ Done! Wait 30 seconds then test:"
echo "   curl http://backend.47.84.106.100.sslip.io/health"
