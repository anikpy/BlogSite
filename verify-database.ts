import { initializeDatabase, articleQueries, parseArticleFromDB } from './src/database';

console.log('🔍 Verifying SQLite Database\n');
console.log('='.repeat(60));

initializeDatabase();

const articles = articleQueries.getAll.all();
console.log(`\n📚 Total Articles: ${articles.length}\n`);

articles.forEach((article: any, index: number) => {
  const parsed = parseArticleFromDB(article);
  console.log(`${index + 1}. ${parsed.title}`);
  console.log(`   📁 Category: ${parsed.category}`);
  console.log(`   👤 Author: ${parsed.author}`);
  console.log(`   📅 Published: ${parsed.publishedDate}`);
  console.log(`   👁️  Views: ${parsed.views.toLocaleString()}`);
  console.log(`   🏷️  Tags: ${parsed.tags.join(', ')}`);
  console.log(`   ⭐ Featured: ${parsed.isFeatured ? 'Yes' : 'No'}`);
  console.log('');
});

console.log('='.repeat(60));
console.log('\n✅ Database verification complete!');
console.log('\n🚀 Run "npm run dev" to start your blog server.');
