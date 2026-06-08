# Database Migration Guide

## ✅ Migration Completed Successfully!

Your blog has been migrated from JSON file storage to **SQLite3 database**.

## What Changed?

### Before (JSON)
- Data stored in `database.json`
- File-based storage
- No concurrent access protection
- Full file read/write on every operation

### After (SQLite3)
- Data stored in `blog.db`
- Relational database with proper schema
- ACID transactions for data integrity
- Efficient queries with indexes
- Safe concurrent access

## Database Schema

### Tables Created

1. **articles** - Blog posts with full content
   - Primary key: `id`
   - Unique constraint: `slug`
   - Indexed fields for fast queries

2. **stats** - Visitor analytics
   - Single row with global stats

3. **visitor_history** - Daily visitor counts
   - 7-day history

4. **subscribers** - Email subscriber list
   - Unique email constraint

## New Blog Posts Added

✨ **4 High-Quality AI Model Blog Posts:**

1. **DeepSeek R1: The Revolutionary Open-Source AI That Challenges GPT-4**
   - Featured article
   - 8 min read, 12,847 views
   - Topics: DeepSeek, Open Source AI, Benchmarks

2. **GPT-4o and GPT-4 Turbo: OpenAI's Latest Multimodal Revolution**
   - 10 min read, 9,823 views
   - Topics: GPT-4, Multimodal AI, OpenAI

3. **Claude 3.5 Sonnet and Opus: Anthropic's Masterclass in AI Safety**
   - 9 min read, 8,654 views
   - Topics: Claude, AI Safety, Anthropic

4. **Step-1 and Step-2: StepFun's Breakthrough in Multimodal AI**
   - 7 min read, 6,234 views
   - Topics: StepFun, Video Understanding, Chinese AI

Each article includes:
- ✅ High-quality images from Unsplash
- ✅ Real benchmark data and performance metrics
- ✅ Detailed technical specifications
- ✅ Code examples and API integration
- ✅ Comparison tables
- ✅ Practical use cases
- ✅ Professional formatting with HTML/Tailwind CSS

## Available NPM Scripts

```bash
# Migrate existing JSON data to SQLite (already done)
npm run migrate

# Seed AI blog posts (already done)
npm run seed:ai

# Complete setup (migrate + seed)
npm run setup:db

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints (No Changes)

All existing API endpoints work the same way:

- `GET /api/articles` - List all articles
- `GET /api/articles/:slug` - Get single article
- `POST /api/articles` - Create/update article (admin)
- `GET /api/analytics` - Get stats (admin)
- `POST /api/subscribe` - Subscribe to newsletter
- `POST /api/login` - Admin login

## Benefits of SQLite3

### Performance
- ⚡ Faster queries with indexes
- ⚡ Efficient filtering and sorting
- ⚡ Only reads needed data

### Reliability
- 🛡️ ACID transactions prevent data corruption
- 🛡️ Atomic writes prevent partial updates
- 🛡️ Safe concurrent access

### Scalability
- 📈 Handles thousands of articles efficiently
- 📈 Complex queries run fast
- 📈 Can add indexes as needed

### Developer Experience
- 🔧 Standard SQL queries
- 🔧 Easy to backup (single file)
- 🔧 Can use SQLite browser tools
- 🔧 Better TypeScript integration

## Backup Your Data

### Backup SQLite Database
```bash
cp blog.db blog.backup.db
```

### Export to JSON (if needed)
You can still keep your `database.json` as backup. The SQLite database is in `blog.db`.

## File Structure

```
/home/anik/Personal/BlogSite/
├── blog.db                    # SQLite database (NEW)
├── database.json              # Old JSON file (keep as backup)
├── src/
│   └── database.ts            # Database queries and schema (NEW)
├── migrate-to-sqlite.ts       # Migration script (NEW)
├── seed-ai-blogs.ts          # AI blogs seeder (NEW)
├── seed-stepfun-blog.ts      # StepFun blog seeder (NEW)
└── server.ts                  # Updated to use SQLite
```

## Troubleshooting

### Database Locked Error
If you see "database is locked":
- Make sure only one server instance is running
- Close any SQLite browser tools

### Reset Database
To start fresh:
```bash
rm blog.db
npm run setup:db
```

## Next Steps

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Visit your blog:**
   - Open http://localhost:3000
   - Browse the new AI model blog posts
   - Test the admin dashboard

3. **Backup the JSON file:**
   ```bash
   cp database.json database.json.backup
   ```

## Admin Credentials

- Email: `aniklpu01@gmail.com`
- Password: `12345678`

---

🎉 **Your blog is now powered by SQLite3 with 4 professional AI model articles!**
