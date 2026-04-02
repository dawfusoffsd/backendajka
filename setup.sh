#!/bin/bash

echo "🔍 Git Diagnosis"
echo "════════════════════════════════════════"
echo ""

# Check if git initialized
if [ ! -d .git ]; then
    echo "❌ Git not initialized"
    echo "Run: git init"
    exit 1
else
    echo "✅ Git initialized"
fi

# Check git status
echo ""
echo "📋 Git Status:"
git status

# Check remote
echo ""
echo "🌐 Remote repositories:"
git remote -v

# Check branches
echo ""
echo "🌿 Branches:"
git branch -a

# Check commits
echo ""
echo "📝 Recent commits:"
git log --oneline -5 2>/dev/null || echo "No commits yet"

echo ""
echo "════════════════════════════════════════"