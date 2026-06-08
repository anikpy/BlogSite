import fs from 'fs';
import path from 'path';
import { 
  initializeDatabase, 
  articleQueries, 
  subscriberQueries,
  serializeArticleForDB 
} from './src/database';
import { Article } from './src/types';

const DB_FILE = path.join(process.cwd(), 'database.json');

console.log('Starting migration from JSON to SQLite...');

// Initialize SQLite database
initializeDatabase();

// Read existing JSON data
if (fs.existsSync(DB_FILE)) {
  try {
    const jsonData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    
    // Migrate articles
    if (jsonData.articles && Array.isArray(jsonData.articles)) {
      console.log(`Migrating ${jsonData.articles.length} articles...`);
      
      for (const article of jsonData.articles) {
        const serialized = serializeArticleForDB(article);
        
        try {
          articleQueries.insert.run(
            article.id,
            article.title,
            article.slug,
            article.category,
            article.summary,
            article.content,
            article.author,
            article.authorRole,
            article.authorAvatar,
            article.publishedDate,
            article.status,
            serialized.isFeatured,
            article.featuredImage,
            serialized.tags,
            article.views,
            article.readingTime,
            article.seoTitle,
            article.seoDescription,
            article.createdAt
          );
          console.log(`✓ Migrated article: ${article.title}`);
        } catch (err: any) {
          if (err.message.includes('UNIQUE constraint failed')) {
            console.log(`⊘ Skipped duplicate article: ${article.title}`);
          } else {
            console.error(`✗ Error migrating article ${article.title}:`, err.message);
          }
        }
      }
    }

    // Migrate subscribers
    if (jsonData.subscribers && Array.isArray(jsonData.subscribers)) {
      console.log(`\nMigrating ${jsonData.subscribers.length} subscribers...`);
      
      for (const email of jsonData.subscribers) {
        try {
          subscriberQueries.insert.run(email, new Date().toISOString());
          console.log(`✓ Migrated subscriber: ${email}`);
        } catch (err: any) {
          if (err.message.includes('UNIQUE constraint failed')) {
            console.log(`⊘ Skipped duplicate subscriber: ${email}`);
          } else {
            console.error(`✗ Error migrating subscriber ${email}:`, err.message);
          }
        }
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nBackup your database.json file and update your server.ts to use SQLite.');
    
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
} else {
  console.log('No database.json found. Starting with fresh SQLite database.');
}
