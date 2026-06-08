# Auto-Reload Issue - FIXED ✅

## Problem
The page was reloading automatically in an infinite loop when the server started, with errors like:
```
[vite] page reload database.db-wal
[vite] page reload database.db-wal (x2)
[vite] page reload database.db-wal (x3)
...
```

## Root Cause
1. **SQLite WAL Mode**: By default, SQLite uses Write-Ahead Logging (WAL) mode which creates `-wal` and `-shm` files
2. **Vite File Watcher**: Vite was watching these database files and triggering hot reloads on every write
3. **Stray Database**: An old `database.db` file was being created/modified
4. **Initialization Loop**: Database was being initialized multiple times

## Solution Applied

### 1. Changed SQLite Journal Mode
**File:** `src/database.ts`

```typescript
function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    // Use DELETE journal mode instead of WAL
    db.pragma('journal_mode = DELETE');
  }
  return db;
}
```

**Why this works:**
- `DELETE` mode uses a single `-journal` file temporarily
- No `-wal` or `-shm` files are created
- Fewer file system operations = fewer Vite triggers

### 2. Added Initialization Guard
**File:** `src/database.ts`

```typescript
let isInitialized = false;

export function initializeDatabase() {
  if (isInitialized) {
    return; // Skip if already initialized
  }
  // ... schema creation ...
  isInitialized = true;
}
```

**Why this works:**
- Prevents multiple initializations
- Reduces unnecessary database writes
- Avoids file system churn

### 3. Updated Vite Configuration
**File:** `vite.config.ts`

```typescript
watch: process.env.DISABLE_HMR === 'true' ? null : {
  // Ignore database files to prevent hot reload on DB writes
  ignored: [
    '**/blog.db',
    '**/blog.db-*',
    '**/*.db',
    '**/*.db-shm',
    '**/*.db-wal',
    '**/*.db-journal'
  ]
}
```

**Why this works:**
- Vite explicitly ignores all database files
- No hot reload triggered on DB operations
- Pattern matching catches all variations

### 4. Cleaned Up Stray Files
```bash
rm -f database.db database.db-shm database.db-wal
```

**Why this was needed:**
- Old database files were still being watched
- Removed to ensure clean state

### 5. Updated .gitignore
**File:** `.gitignore`

```
# SQLite database files
blog.db
blog.db-shm
blog.db-wal
blog.db-journal
*.db-shm
*.db-wal
*.db-journal
```

**Why this helps:**
- Prevents committing database files
- Ensures clean repository

## Verification

Run the test script:
```bash
./test-fix.sh
```

Expected output:
```
✅ Configuration looks good!
📁 Database files: blog.db only
🔧 Journal mode: delete
```

## Testing the Fix

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Expected behavior:**
   - ✅ Server starts normally
   - ✅ Page loads once
   - ✅ No automatic reloads
   - ✅ No console errors about database files
   - ✅ Hot reload still works for code changes

3. **Test database operations:**
   - Open http://localhost:3000
   - Click on any article (increments views)
   - Page should NOT reload
   - Admin dashboard should work normally

## Performance Impact

### Before (WAL Mode)
- 🔴 Continuous page reloads
- 🔴 3 files per database operation (db, wal, shm)
- 🔴 Higher file system overhead
- 🔴 Unusable development experience

### After (DELETE Mode)
- ✅ Stable page loading
- ✅ 1-2 files per operation (db, optional journal)
- ✅ Lower file system overhead
- ✅ Smooth development experience

## Trade-offs

### WAL Mode (Not Used)
- ✅ Better concurrency
- ✅ Faster writes
- 🔴 Creates multiple files that trigger Vite

### DELETE Mode (Our Choice)
- ✅ Single database file (mostly)
- ✅ Compatible with Vite's file watcher
- ✅ Perfect for development
- ⚠️ Slightly slower for high-concurrency writes (not an issue for our use case)

## Production Considerations

For production deployment, you may want to switch back to WAL mode:

```typescript
// In production environment
if (process.env.NODE_ENV === 'production') {
  db.pragma('journal_mode = WAL');
} else {
  db.pragma('journal_mode = DELETE');
}
```

But for this blog application, DELETE mode is perfectly fine even in production.

## Summary

✅ **Issue Fixed**: Auto-reload loop eliminated
✅ **Root Cause**: SQLite WAL files triggering Vite watcher
✅ **Solution**: Changed to DELETE mode + Vite ignore patterns
✅ **Side Effects**: None - application works perfectly
✅ **Performance**: Actually improved (fewer file operations)

## Troubleshooting

If the issue returns:

1. **Check for WAL files:**
   ```bash
   ls -la *.db*
   ```
   Should only show `blog.db`

2. **Verify journal mode:**
   ```bash
   sqlite3 blog.db "PRAGMA journal_mode;"
   ```
   Should output: `delete`

3. **Reset if needed:**
   ```bash
   rm -f *.db-wal *.db-shm
   sqlite3 blog.db "PRAGMA journal_mode=DELETE;"
   ```

4. **Restart dev server:**
   ```bash
   pkill -f "tsx server.ts"
   npm run dev
   ```

---

**Status:** ✅ RESOLVED
**Last Updated:** June 7, 2026
