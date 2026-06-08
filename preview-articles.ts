import { initializeDatabase, articleQueries, parseArticleFromDB } from './src/database';

console.log('\n📰 AI Model Blog Posts Preview\n');
console.log('='.repeat(80));

initializeDatabase();

// Get only AI category articles
const aiArticles = articleQueries.getByCategory.all('AI');

aiArticles.forEach((article: any, index: number) => {
  const parsed = parseArticleFromDB(article);
  console.log(`\n${index + 1}. ${parsed.title}`);
  console.log('─'.repeat(80));
  console.log(`📝 Summary: ${parsed.summary}`);
  console.log(`\n👤 Author: ${parsed.author} (${parsed.authorRole})`);
  console.log(`📅 Published: ${parsed.publishedDate}`);
  console.log(`⏱️  Reading Time: ${parsed.readingTime}`);
  console.log(`👁️  Views: ${parsed.views.toLocaleString()}`);
  console.log(`🏷️  Tags: ${parsed.tags.join(', ')}`);
  console.log(`🖼️  Image: ${parsed.featuredImage}`);
  console.log(`🔗 URL: /articles/${parsed.slug}`);
  console.log(`⭐ Featured: ${parsed.isFeatured ? 'YES' : 'No'}`);
  
  // Show content preview (first 200 chars)
  const contentText = parsed.content.replace(/<[^>]*>/g, '').trim();
  const preview = contentText.substring(0, 200) + '...';
  console.log(`\n📄 Content Preview:\n${preview}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n✨ All AI articles are ready to view!');
console.log('🚀 Start server with: npm run dev');
console.log('🌐 Visit: http://localhost:3000\n');
