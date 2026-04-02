#!/bin/bash

echo "📤 Git Push Helper"
echo "════════════════════════════════════════"

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes to commit"
    exit 0
fi

# Show status
echo ""
echo "📋 Changed files:"
git status --short
echo ""

# Choose action
echo "What do you want to do?"
echo "1) Quick push (auto message)"
echo "2) Push with custom message"
echo "3) Cancel"
read -p "Choice [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        MESSAGE="Update $(date '+%Y-%m-%d %H:%M')"
        ;;
    2)
        read -p "📝 Commit message: " MESSAGE
        if [ -z "$MESSAGE" ]; then
            echo "❌ Message required"
            exit 1
        fi
        ;;
    3)
        echo "❌ Cancelled"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Execute
echo ""
echo "📦 Adding files..."
git add .

echo "💾 Committing: $MESSAGE"
git commit -m "$MESSAGE"

echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ Successfully pushed!"
echo "🔗 Check: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\).git/\1/')"
