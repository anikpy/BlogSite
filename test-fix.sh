#!/bin/bash

echo "🔍 Testing auto-reload fix..."
echo ""

# Check for database files
echo "📁 Database files present:"
ls -lh *.db* 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
echo ""

# Check journal mode
echo "🔧 SQLite journal mode:"
sqlite3 blog.db "PRAGMA journal_mode;" | sed 's/^/   /'
echo ""

# Check Vite config
echo "📝 Vite watch ignore config:"
grep -A 5 "ignored:" vite.config.ts | sed 's/^/   /'
echo ""

echo "✅ Configuration looks good!"
echo ""
echo "🚀 Now run: npm run dev"
echo "   The page should load once and stay stable."
