import Database from 'better-sqlite3';
import path from 'path';
import { Article, VisitorStats } from './types';

const DB_PATH = path.join(process.cwd(), 'blog.db');
let db: Database.Database;
let isInitialized = false;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    // Use DELETE journal mode to avoid WAL files that trigger Vite reloads
    db.pragma('journal_mode = DELETE');
  }
  return db;
}

// Initialize database schema
export function initializeDatabase() {
  if (isInitialized) {
    return; // Skip if already initialized
  }
  
  const database = getDatabase();
  console.log('Initializing database schema...');
  // Create articles table
  database.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      authorRole TEXT NOT NULL,
      authorAvatar TEXT NOT NULL,
      publishedDate TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Draft', 'Published')),
      isFeatured INTEGER NOT NULL DEFAULT 0,
      featuredImage TEXT NOT NULL,
      tags TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      readingTime TEXT NOT NULL,
      seoTitle TEXT NOT NULL,
      seoDescription TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // Create stats table
  database.exec(`
    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      totalVisitors INTEGER NOT NULL DEFAULT 0,
      uniqueVisitors INTEGER NOT NULL DEFAULT 0,
      pageViews INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Create visitor history table
  database.exec(`
    CREATE TABLE IF NOT EXISTS visitor_history (
      day TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Create subscribers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      subscribedAt TEXT NOT NULL
    )
  `);

  // Initialize stats if not exists
  const statsCount = database.prepare('SELECT COUNT(*) as count FROM stats').get() as { count: number };
  if (statsCount.count === 0) {
    database.prepare(`
      INSERT INTO stats (id, totalVisitors, uniqueVisitors, pageViews)
      VALUES (1, 42892, 18441, 128502)
    `).run();

    const days = [
      { day: 'Mon', count: 18000 },
      { day: 'Tue', count: 35000 },
      { day: 'Wed', count: 22000 },
      { day: 'Thu', count: 52000 },
      { day: 'Fri', count: 68000 },
      { day: 'Sat', count: 110000 },
      { day: 'Sun', count: 95000 }
    ];

    const insertHistory = database.prepare('INSERT INTO visitor_history (day, count) VALUES (?, ?)');
    for (const day of days) {
      insertHistory.run(day.day, day.count);
    }
  }

  isInitialized = true;
  console.log('Database initialized successfully');
}

// Article operations - initialized lazily after tables are created
function getArticleQueries() {
  const database = getDatabase();
  return {
    getAll: database.prepare(`
      SELECT * FROM articles 
      ORDER BY createdAt DESC
    `),

    getBySlug: database.prepare(`
      SELECT * FROM articles 
      WHERE slug = ?
    `),

    getByCategory: database.prepare(`
      SELECT * FROM articles 
      WHERE category = ? 
      ORDER BY createdAt DESC
    `),

    getByStatus: database.prepare(`
      SELECT * FROM articles 
      WHERE status = ? 
      ORDER BY createdAt DESC
    `),

    getByCategoryAndStatus: database.prepare(`
      SELECT * FROM articles 
      WHERE category = ? AND status = ? 
      ORDER BY createdAt DESC
    `),

    insert: database.prepare(`
      INSERT INTO articles (
        id, title, slug, category, summary, content, author, authorRole, 
        authorAvatar, publishedDate, status, isFeatured, featuredImage, 
        tags, views, readingTime, seoTitle, seoDescription, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    update: database.prepare(`
      UPDATE articles SET
        title = ?, category = ?, summary = ?, content = ?, author = ?,
        authorRole = ?, authorAvatar = ?, publishedDate = ?, status = ?,
        isFeatured = ?, featuredImage = ?, tags = ?, readingTime = ?,
        seoTitle = ?, seoDescription = ?
      WHERE slug = ?
    `),

    incrementViews: database.prepare(`
      UPDATE articles SET views = views + 1 WHERE slug = ?
    `),

    unfeatureAll: database.prepare(`
      UPDATE articles SET isFeatured = 0 WHERE isFeatured = 1
    `),

    delete: database.prepare(`
      DELETE FROM articles WHERE slug = ?
    `)
  };
}

// Stats operations
function getStatsQueries() {
  const database = getDatabase();
  return {
    get: database.prepare('SELECT * FROM stats WHERE id = 1'),
    
    incrementPageViews: database.prepare(`
      UPDATE stats SET pageViews = pageViews + 1 WHERE id = 1
    `),

    incrementVisitors: database.prepare(`
      UPDATE stats SET 
        totalVisitors = totalVisitors + 1,
        uniqueVisitors = uniqueVisitors + 1
      WHERE id = 1
    `),

    getHistory: database.prepare('SELECT * FROM visitor_history ORDER BY day')
  };
}

// Subscriber operations
function getSubscriberQueries() {
  const database = getDatabase();
  return {
    getAll: database.prepare('SELECT * FROM subscribers ORDER BY subscribedAt DESC'),
    
    insert: database.prepare(`
      INSERT INTO subscribers (email, subscribedAt) 
      VALUES (?, ?)
    `),

    exists: database.prepare('SELECT COUNT(*) as count FROM subscribers WHERE email = ?')
  };
}

// Export lazy-initialized queries
export const articleQueries = new Proxy({} as ReturnType<typeof getArticleQueries>, {
  get(target, prop) {
    const queries = getArticleQueries();
    return queries[prop as keyof typeof queries];
  }
});

export const statsQueries = new Proxy({} as ReturnType<typeof getStatsQueries>, {
  get(target, prop) {
    const queries = getStatsQueries();
    return queries[prop as keyof typeof queries];
  }
});

export const subscriberQueries = new Proxy({} as ReturnType<typeof getSubscriberQueries>, {
  get(target, prop) {
    const queries = getSubscriberQueries();
    return queries[prop as keyof typeof queries];
  }
});

// Helper functions
export function parseArticleFromDB(row: any): Article {
  return {
    ...row,
    isFeatured: Boolean(row.isFeatured),
    tags: JSON.parse(row.tags)
  };
}

export function serializeArticleForDB(article: Article | Partial<Article>): any {
  return {
    ...article,
    isFeatured: article.isFeatured ? 1 : 0,
    tags: JSON.stringify(article.tags || [])
  };
}

export function getStats(): VisitorStats {
  const database = getDatabase();
  const stats = database.prepare('SELECT * FROM stats WHERE id = 1').get() as any;
  const history = database.prepare('SELECT * FROM visitor_history ORDER BY day').all() as any[];
  
  return {
    totalVisitors: stats.totalVisitors,
    uniqueVisitors: stats.uniqueVisitors,
    pageViews: stats.pageViews,
    visitorHistory: history.map(h => ({ day: h.day, count: h.count }))
  };
}

export { getDatabase as db };
