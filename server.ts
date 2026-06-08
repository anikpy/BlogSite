import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Article, VisitorStats } from './src/types';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'database.db');

// Middleware - INCREASE limits to fix PayloadTooLargeError for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SQLite Database Engine
let db: Database.Database;

function initDB() {
  if (!db) {
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');

    // Create Relational Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT,
        summary TEXT,
        content TEXT,
        author TEXT,
        authorRole TEXT,
        authorAvatar TEXT,
        publishedDate TEXT,
        status TEXT,
        isFeatured INTEGER DEFAULT 0,
        featuredImage TEXT,
        tags TEXT, -- JSON Array
        views INTEGER DEFAULT 0,
        readingTime TEXT,
        seoTitle TEXT,
        seoDescription TEXT,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS subscribers (
        email TEXT PRIMARY KEY,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        timestamp TEXT,
        isRead INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS page_visits (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        path TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        dayOfWeek TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
      CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(path);
      CREATE INDEX IF NOT EXISTS idx_page_visits_timestamp ON page_visits(timestamp);
    `);

    // Bootstrap Dynamic page visits if empty
    const countVisitsObj = db.prepare("SELECT COUNT(*) as count FROM page_visits").get() as { count: number };
    if (countVisitsObj.count === 0) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const counts = [1844, 3512, 2204, 5231, 6842, 11048, 9512];
      const insertVisit = db.prepare("INSERT INTO page_visits (id, sessionId, path, timestamp, dayOfWeek) VALUES (?, ?, ?, ?, ?)");
      const runTransaction = db.transaction(() => {
        for (let d = 0; d < days.length; d++) {
          const day = days[d];
          const count = counts[d];
          for (let i = 0; i < count; i++) {
            const id = `visit_${day}_${i}`;
            const sessionId = `sess_${day}_${Math.floor(i / 2.3)}`; // Some repeated to simulate unique users vs total page views
            const timestamp = new Date(Date.now() - (7 - d) * 24 * 60 * 60 * 1000).toISOString();
            insertVisit.run(id, sessionId, '/', timestamp, day);
          }
        }
      });
      runTransaction();
    }

    // Clear out standard non-LLM placeholders if they exist in the database from prior seedings
    db.prepare("DELETE FROM articles WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9')").run();

    // Bootstrap Articles database with new high-quality expert tech blogs
    const countArticles = (db.prepare("SELECT COUNT(*) as count FROM articles").get() as { count: number }).count;
    if (countArticles === 0) {
      const insertStmt = db.prepare(`
        INSERT INTO articles (
          id, title, slug, category, summary, content, author, authorRole, 
          authorAvatar, publishedDate, status, isFeatured, featuredImage, 
          tags, views, readingTime, seoTitle, seoDescription, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 2. Setup the four premium, highly professional AI blogs requested
      const premiumAIBlogs: Article[] = [
        {
          id: 'ai_deepseek_v3_r1',
          title: 'The DeepSeek Ascendancy: DeepSeek-V3 and the Epoch of Ultra-Low Cost Intelligence',
          slug: 'the-deepseek-ascendancy-v3-and-r1-reasoning',
          category: 'Tech',
          summary: 'An architectural breakdown of DeepSeek\'s Mixture-of-Experts neural routing, Multi-Head Latent Attention compression, and how they shattered the GPU cost scaling paradigm.',
          content: `
            <p class="mb-6 font-body-lg text-body-lg text-charcoal-intense">
              The artificial intelligence landscape witnessed a dramatic architectural shift with the release of the DeepSeek-V3 model series and its reasoning-specialised counterpart, DeepSeek-R1. What makes DeepSeek's global rise so historic is not merely matching high-capability Western models on core benchmarks, but doing so with a fraction of the traditional budget. By deploying clever architectural choices over sheer raw cluster expansion, they have successfully redefined the economics of scale.
            </p>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">Compressing KV Cache with MLA</h2>
            <p class="mb-6">
              In standard Transformer models, Key-Value (KV) caching is the central bottleneck restricting high context lengths and batch throughput bounds. DeepSeek introduces <strong>Multi-Head Latent Attention (MLA)</strong> to project keys and values onto a low-rank, compressed bottleneck matrix dynamically inside the feedforward sequence. This drastically cuts cache footprint for each concurrent query.
            </p>

            <!-- CODE REPRESENTATION -->
            <div class="my-10 shadow-lg rounded-xl overflow-hidden border border-cream-dark font-sans">
              <div class="bg-[#131b2e] text-[#7c839b] px-4 py-3 font-mono text-xs flex justify-between items-center border-b border-cream-dark/20">
                <span>multi_head_latent_attention.py</span>
                <span class="text-xs uppercase text-brass-accent font-semibold tracking-wider font-sans">MLA Feedforward Cache Projection</span>
              </div>
              <pre class="bg-[#131b2e] p-6 overflow-x-auto text-[#7c839b] font-mono text-xs md:text-sm leading-relaxed"><code>def project_latent_mla_attention(query_vector, key_value_cache):
    # MLA down-projects both Key and Value vectors into a shared low-rank latent representation (512 dims)
    W_down = get_projection_matrix("bottleneck_projection_weight")
    W_up_k = get_projection_matrix("key_up_projection")
    
    # Compress sequence and uncompress dynamically in-layer
    latent_bottleneck = matmul(key_value_cache, W_down)
    restored_keys = matmul(latent_bottleneck, W_up_k)
    
    attention_scores = matmul(query_vector, restored_keys.transpose()) / sqrt(d_keys)
    return softmax(attention_scores)</code></pre>
            </div>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">DeepSeek-R1: Pure Reinforcement Learning & Chain of Thought</h2>
            <p class="mb-6">
              Unlike classic large-language pipelines which depend primarily on dense supervised instruction datasets (SFT), DeepSeek-R1 utilizes extensive reinforcement learning loops with cold-start rules. It produces a readable "thinking process" enclosed in modular tags, facilitating transparent research pathways, self-correction, and spectacular scores in math, programming and logical operations.
            </p>

            <blockquote class="border-l-4 border-secondary px-8 py-4 my-12 bg-cream-base/10 italic font-headline-md text-headline-md text-on-surface-variant">
              "Brute-force parameter expansion is yielding to algorithmic structural refinement. DeepSeek-V3 represents a watershed moment where clever mathematical routing outclasses raw capital expenditure."
            </blockquote>

            <h3 class="font-headline-md text-headline-md text-primary mt-10 mb-4">Multi-Hop MoE Routing Parameters</h3>
            <p class="mb-6">
              Through their proprietary Mixture-of-Experts routing formulation, only a tiny select fraction (2 out of 64 experts) are triggered per token, ensuring speedy, low-latency execution while retaining the vast context insights of a trillion-parameter knowledge web.
            </p>
          `,
          author: 'Anik Admin',
          authorRole: 'System Administrator',
          authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5vTgbsr1E8Hhy4Y-JjHUZfuVLzXs5nqz51rwxSXGwSn0Z_w-lwx6mY7BRE0kJ8stMNUsoEm616tggpFxo-lGs9kyZhfYlRahxysK0tEVrhkm_6XFO1_NPP5NX_NTDeS5SSCgS4oZ2NDJXw10D0o_aCYUSbV4PdAEdMOCtZulbggSlMUQ-Sk12p4p-TJ8CUSNBkNZRq2srjgHvnggNnjig4JMj8pGNIh58FtOhe-tRfJSyEmuxZlIej-kTDMFuOzUvdXaGleArmuM7',
          publishedDate: 'Jun 7, 2026',
          status: 'Published',
          isFeatured: true, // Mark DeepSeek as the featured article for outstanding showcase
          featuredImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop',
          tags: ['AI', 'DeepSeek', 'MoE', 'MachineLearning'],
          views: 1845,
          readingTime: '7 min read',
          seoTitle: 'DeepSeek-V3 & R1 MoE Architecture Analysis | LLM Review Pro',
          seoDescription: 'Uncover the deep math behind MLA compression, hardware routing rules, and the reinforcement learning structure of DeepSeek models.',
          createdAt: '2026-06-07T08:00:00Z'
        },
        {
          id: 'ai_openai_o1_o3',
          title: 'Inside OpenAI\'s o1 and o3-mini Reasoning Engines: The Shift to Inference Compute',
          slug: 'openai-gpt-o1-o3-inference-scaling',
          category: 'Tech',
          summary: 'How Reinforcement Learning-based Chain of Thought training transforms standard next-token predictions into rigorous system-2 deliberative reasoning.',
          content: `
            <p class="mb-6 font-body-lg text-body-lg text-charcoal-intense">
              For several seasons, the artificial intelligence frontier followed the pre-training scaling laws: larger datasets, massive cluster sizes, and greater dense parameter configurations. However, with pre-training datasets reaching physical boundaries, OpenAI shifted the bottleneck to a complementary dimension with o1 and o3-mini: <strong>inference-time scaling</strong>.
            </p>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">Transitioning from System 1 to System 2</h2>
            <p class="mb-6">
              In cognitive psychology, <em>System 1</em> represents immediate, intuitive response pathways, while <em>System 2</em> involves slow, deliberate reasoning. Standard autoregressive models write token-by-token immediately without the ability to correct course. OpenAI\'s o1 and o3-mini models, through intensive Reinforcement Learning, formulate a comprehensive hidden chain of thought.
            </p>

            <!-- CODE REPRESENTATION -->
            <div class="my-10 shadow-lg rounded-xl overflow-hidden border border-cream-dark font-sans">
              <div class="bg-[#131b2e] text-[#7c839b] px-4 py-3 font-mono text-xs flex justify-between items-center border-b border-cream-dark/20">
                <span>inference_searching_node.go</span>
                <span class="text-xs uppercase text-brass-accent font-semibold tracking-wider font-sans">Tree Search Evaluation Loop</span>
              </div>
              <pre class="bg-[#131b2e] p-6 overflow-x-auto text-[#7c839b] font-mono text-xs md:text-sm leading-relaxed"><code>type Node struct {
    Steps []string
    Score float64
}

func EvalTreeReasoning(prompt string) string {
    root := InitReasoningTree(prompt)
    for !root.AllPathsExhausted() {
        stepCandidate := root.SampleCandidateStep()
        likelihood := EvaluateCoTPath(stepCandidate)
        if likelihood > 0.92 {
            root.CommitStep(stepCandidate) // Keep moving downstream
        } else {
            root.Backtrack() // Discard hypothesis and select branch
        }
    }
    return root.GetFinalSynthesis()
}</code></pre>
            </div>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">The o3-mini Core Advantage</h2>
            <p class="mb-6">
              While high-speed models like GPT-4o remain dominant for fast conversational triggers, o3-mini represents a monumental leap in coding precision and math calculations. By adjusting the reasoning token length parameters, developers can direct the model to spend more inference compute resources in resolving incredibly complex system bugs.
            </p>

            <blockquote class="border-l-4 border-secondary px-8 py-4 my-12 bg-cream-base/10 italic font-headline-md text-headline-md text-on-surface-variant">
              "The next decade of model scaling will not be won with larger datasets alone, but with the CPU and GPU hours allocated during the very seconds the model takes to think before answering."
            </blockquote>
          `,
          author: 'Anik Admin',
          authorRole: 'System Administrator',
          authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5vTgbsr1E8Hhy4Y-JjHUZfuVLzXs5nqz51rwxSXGwSn0Z_w-lwx6mY7BRE0kJ8stMNUsoEm616tggpFxo-lGs9kyZhfYlRahxysK0tEVrhkm_6XFO1_NPP5NX_NTDeS5SSCgS4oZ2NDJXw10D0o_aCYUSbV4PdAEdMOCtZulbggSlMUQ-Sk12p4p-TJ8CUSNBkNZRq2srjgHvnggNnjig4JMj8pGNIh58FtOhe-tRfJSyEmuxZlIej-kTDMFuOzUvdXaGleArmuM7',
          publishedDate: 'Jun 6, 2026',
          status: 'Published',
          isFeatured: false,
          featuredImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop',
          tags: ['AI', 'OpenAI', 'GPT', 'ReasoningModels'],
          views: 985,
          readingTime: '6 min read',
          seoTitle: 'Inside OpenAI o1 & o3-mini Systems | LLM Review Pro',
          seoDescription: 'Unpack the technical mechanics of inference-time scaling, hidden chains of thought, and reinforced learning parameters.',
          createdAt: '2026-06-06T09:00:00Z'
        },
        {
          id: 'ai_claude_35_sonnet',
          title: 'The Aesthetic of Eloquence: Why Claude 3.5 Sonnet Became the Premier Developer Choice',
          slug: 'the-aesthetic-of-eloquence-claude-3-5-sonnet',
          category: 'Programming',
          summary: 'Analysing the literary composure, codebase synthesising precision, and interactive Artifact sandbox ecosystem of Anthropic’s flagship family.',
          content: `
            <p class="mb-6 font-body-lg text-body-lg text-charcoal-intense">
              While other models vie for raw mathematical benchmark crowns, Anthropic\'s Claude 3.5 Sonnet has captured the desktop hearts of developers, programmers, and technical writers worldwide. Its secret lies in the synthesis of structural elegance, a deep literary composure, and a highly functional interface paradigm.
            </p>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">Interactive Layouts via Artifacts</h2>
            <p class="mb-6">
              A major leap in active user product engagement was the introduction of <strong>Artifacts</strong>. By spinning up localized sandbox containers next to the dialogue window, Claude allows users to preview React pages, compiled SVGs, game canvases, and complex layout logic in real-time, removing the latency of pasting code blocks locally.
            </p>

            <!-- CODE REPRESENTATION -->
            <div class="my-10 shadow-lg rounded-xl overflow-hidden border border-cream-dark font-sans">
              <div class="bg-[#131b2e] text-[#7c839b] px-4 py-3 font-mono text-xs flex justify-between items-center border-b border-cream-dark/20">
                <span>claude_system_directives.xml</span>
                <span class="text-xs uppercase text-brass-accent font-semibold tracking-wider font-sans">Anthropic Artifact Tag rules</span>
              </div>
              <pre class="bg-[#131b2e] p-6 overflow-x-auto text-[#7c839b] font-mono text-xs md:text-sm leading-relaxed"><code>&lt;anthropic_instructions&gt;
  &lt;artifact_generation_rules&gt;
    &lt;rule&gt;Trigger when content represents a self-contained document exceeding 15 lines of code.&lt;/rule&gt;
    &lt;rule&gt;Do not blend verbose explanations inside the artifact space; keep files clean and fully compilable.&lt;/rule&gt;
    &lt;rule&gt;Support standard styling parameters via Tailwind utility declarations exclusively.&lt;/rule&gt;
  &lt;/artifact_generation_rules&gt;
&lt;/anthropic_instructions&gt;</code></pre>
            </div>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">Agentic Coding Precision</h2>
            <p class="mb-6">
              In coding contexts, Claude 3.5 Sonnet demonstrates remarkable spatial attention. It is highly capable of parsing deep tree structures, remembering active multi-file code dependencies, and composing highly modular scripts that minimize code rot and trailing brackets common in lesser architectures.
            </p>

            <blockquote class="border-l-4 border-secondary px-8 py-4 my-12 bg-cream-base/10 italic font-headline-md text-headline-md text-on-surface-variant">
              "Claude demonstrates that tone matters. A model that communicates with descriptive precision and respects layouts becomes a natural extension of our thinking mind."
            </blockquote>
          `,
          author: 'Anik Admin',
          authorRole: 'System Administrator',
          authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5vTgbsr1E8Hhy4Y-JjHUZfuVLzXs5nqz51rwxSXGwSn0Z_w-lwx6mY7BRE0kJ8stMNUsoEm616tggpFxo-lGs9kyZhfYlRahxysK0tEVrhkm_6XFO1_NPP5NX_NTDeS5SSCgS4oZ2NDJXw10D0o_aCYUSbV4PdAEdMOCtZulbggSlMUQ-Sk12p4p-TJ8CUSNBkNZRq2srjgHvnggNnjig4JMj8pGNIh58FtOhe-tRfJSyEmuxZlIej-kTDMFuOzUvdXaGleArmuM7',
          publishedDate: 'Jun 5, 2026',
          status: 'Published',
          isFeatured: false,
          featuredImage: 'https://images.unsplash.com/photo-1541462608141-27b2c7453166?w=1200&auto=format&fit=crop',
          tags: ['AI', 'Claude', 'Anthropic', 'AgenticAI'],
          views: 1230,
          readingTime: '5 min read',
          seoTitle: 'Claude 3.5 Sonnet Design & Logic | LLM Review Pro',
          seoDescription: 'Master the principles of Artifact generation, advanced XML prompt containment, and clean coding with Claude.',
          createdAt: '2026-06-05T12:00:00Z'
        },
        {
          id: 'ai_stepfun_models',
          title: 'Stepfun and the Frontier of Trillion-Parameter Multi-Modal Supermodels',
          slug: 'stepfun-unveiling-hyper-context-multimodality',
          category: 'Tech',
          summary: 'An investigative deep-dive into Stepfun\'s multimodal scaling techniques, trillion-parameter MoE architectures, and their real-world impact in enterprise visual-linguistic tasks.',
          content: `
            <p class="mb-6 font-body-lg text-body-lg text-charcoal-intense">
              While Western models attract a substantial portion of public focus, Chinese startups like Stepfun have quietly achieved monumental progress in scaling trillion-parameter <strong>Mixture-of-Experts (MoE)</strong> neural pipelines and delivering native unified multi-modality.
            </p>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">Trillion-Parameter sparse MoE Architecture</h2>
            <p class="mb-6">
              Stepfun's flagship series executes on highly refined routing algorithms. Rather than loading an entire massive model into memory, its Mixture of Experts maps tokens exclusively to 2 active specialized sub-expert structures. This enables vast specialized capability boundaries (such as detailed medical or legal calculations) without causing server lag or increasing token pricing.
            </p>

            <!-- CODE REPRESENTATION -->
            <div class="my-10 shadow-lg rounded-xl overflow-hidden border border-cream-dark font-sans">
              <div class="bg-[#131b2e] text-[#7c839b] px-4 py-3 font-mono text-xs flex justify-between items-center border-b border-cream-dark/20">
                <span>sparse_moe_routing.py</span>
                <span class="text-xs uppercase text-brass-accent font-semibold tracking-wider font-sans">Dynamic Expert Dispatcher</span>
              </div>
              <pre class="bg-[#131b2e] p-6 overflow-x-auto text-[#7c839b] font-mono text-xs md:text-sm leading-relaxed"><code>def route_moe_layers(input_tokens, expert_registry):
    # Calculate sparse Softmax routing vectors for 64 active sub-experts
    gating_scores = softmax(matmul(input_tokens, Gating_Weights))
    top_two_experts = get_top_k_indices(gating_scores, k=2)
    
    # Send values dynamically, preserving backprop pathways
    path_outputs = [expert_registry[i](input_tokens) for i in top_two_experts]
    fused_representation = sum(gating_scores[i] * path_outputs[idx] for idx, i in enumerate(top_two_experts))
    return fused_representation</code></pre>
            </div>

            <h2 class="font-headline-lg text-headline-lg text-primary mt-12 mb-6">Millions of Context Window Tokens</h2>
            <p class="mb-6">
              One of Stepfun\'s defining features is its massive sequence attention spans. It cleanly processes millions of context tokens, permitting users to upload thick developer manuals, entire databases, or hours of high-definition video frames while retaining precise spatial and temporal query accuracy.
            </p>

            <h3 class="font-headline-md text-headline-md text-primary mt-10 mb-4">Unified Visual-Auditory-Linguistic Synthesiser</h3>
            <p class="mb-6">
              Instead of chaining discrete speech-to-text translators, Stepfun utilizes a single, multi-dimensional token space where auditory waves, pixel grids, and text letters are projected onto a cohesive neural manifold, producing extremely high fidelity speech and responsive vision capabilities.
            </p>
          `,
          author: 'Anik Admin',
          authorRole: 'System Administrator',
          authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5vTgbsr1E8Hhy4Y-JjHUZfuVLzXs5nqz51rwxSXGwSn0Z_w-lwx6mY7BRE0kJ8stMNUsoEm616tggpFxo-lGs9kyZhfYlRahxysK0tEVrhkm_6XFO1_NPP5NX_NTDeS5SSCgS4oZ2NDJXw10D0o_aCYUSbV4PdAEdMOCtZulbggSlMUQ-Sk12p4p-TJ8CUSNBkNZRq2srjgHvnggNnjig4JMj8pGNIh58FtOhe-tRfJSyEmuxZlIej-kTDMFuOzUvdXaGleArmuM7',
          publishedDate: 'Jun 4, 2026',
          status: 'Published',
          isFeatured: false,
          featuredImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop',
          tags: ['AI', 'Stepfun', 'Multimodal', 'LargeLanguageModels'],
          views: 754,
          readingTime: '5 min read',
          seoTitle: 'Stepfun Trillion-Parameter MoE Architecture | LLM Review Pro',
          seoDescription: 'Explore Stepfun\'s innovative Mixture of Experts gating pathways, long context sequences, and multi-modal manifolds.',
          createdAt: '2026-06-04T15:00:00Z'
        }
      ];

      for (const a of premiumAIBlogs) {
        insertStmt.run(
          a.id,
          a.title,
          a.slug,
          a.category,
          a.summary,
          a.content,
          a.author,
          a.authorRole,
          a.authorAvatar,
          a.publishedDate,
          a.status,
          a.isFeatured ? 1 : 0,
          a.featuredImage,
          JSON.stringify(a.tags),
          a.views,
          a.readingTime,
          a.seoTitle,
          a.seoDescription,
          a.createdAt
        );
      }
    }
  }
  return db;
}

// REST Backend APIs
// 0. POST login for admin authentication (aniklpu01@gmail.com / 12345678)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'aniklpu01@gmail.com' && password === '12345678') {
    return res.json({
      success: true,
      token: 'vellum_vector_admin_token_2026',
      user: {
        email: 'aniklpu01@gmail.com',
        role: 'Administrator',
        name: 'Anik Admin'
      }
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator email or password.'
    });
  }
});

// Helper validation middleware for Admin-only interactions
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new MemoryCacheManager();

const requireAdminAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer vellum_vector_admin_token_2026') {
    return res.status(401).json({ error: 'Unauthorized: Admin authorization token is missing or invalid' });
  }
  next();
};

// 1. GET all articles from SQLite
app.get('/api/articles', (req, res) => {
  try {
    const { category, status } = req.query;
    const cacheKey = `articles_list_cat_${category || 'all'}_status_${status || 'all'}`;
    const cachedData = apiCache.get<Article[]>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const database = initDB();
    const stmt = database.prepare("SELECT * FROM articles ORDER BY createdAt DESC");
    const rows = stmt.all() as any[];

    // Parse structures
    let articlesList: Article[] = rows.map((r) => ({
      ...r,
      isFeatured: r.isFeatured === 1,
      tags: JSON.parse(r.tags || '[]')
    }));

    // In-memory filters (extremely fast + SQL injection proof)
    if (category) {
      articlesList = articlesList.filter(
        (a) => a.category.toLowerCase() === (category as string).toLowerCase()
      );
    }

    if (status && status !== 'all') {
      articlesList = articlesList.filter(
        (a) => a.status.toLowerCase() === (status as string).toLowerCase()
      );
    }

    // Cache the listing for 1 minute (60000ms), cleared instantly on admin updates
    apiCache.set(cacheKey, articlesList, 60000);
    res.json(articlesList);
  } catch (err) {
    console.error("SQL Retrieval Error:", err);
    res.status(500).json({ error: 'Failed to access journal database.' });
  }
});

// 2. GET single article by slug from SQLite (Increments view stat dynamically!)
app.get('/api/articles/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    const cacheKey = `article_slug_${slug}`;
    const cachedData = apiCache.get<Article>(cacheKey);
    
    if (cachedData) {
      // Async views increment so client page load has exactly 0ms DB block!
      setImmediate(() => {
        try {
          const dbAsync = initDB();
          dbAsync.prepare("UPDATE articles SET views = views + 1 WHERE slug = ?").run(slug);
          
          const statsRow = dbAsync.prepare("SELECT value FROM stats WHERE key = 'visitorStats'").get() as { value: string } | undefined;
          if (statsRow) {
            const statsObj = JSON.parse(statsRow.value);
            statsObj.pageViews += 1;
            if (Math.random() > 0.7) {
              statsObj.uniqueVisitors += 1;
              statsObj.totalVisitors += 1;
            }
            dbAsync.prepare("UPDATE stats SET value = ? WHERE key = 'visitorStats'").run(JSON.stringify(statsObj));
          }
        } catch (e) {
          console.error("Background view increment failed:", e);
        }
      });
      return res.json(cachedData);
    }

    const database = initDB();
    const selectStmt = database.prepare("SELECT * FROM articles WHERE slug = ?");
    const row = selectStmt.get(slug) as any;

    if (!row) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment views on individual article
    database.prepare("UPDATE articles SET views = views + 1 WHERE slug = ?").run(slug);

    // Update pageview analytics in stats
    const statsRow = database.prepare("SELECT value FROM stats WHERE key = 'visitorStats'").get() as { value: string } | undefined;
    if (statsRow) {
      const statsObj = JSON.parse(statsRow.value);
      statsObj.pageViews += 1;
      if (Math.random() > 0.7) {
        statsObj.uniqueVisitors += 1;
        statsObj.totalVisitors += 1;
      }
      database.prepare("UPDATE stats SET value = ? WHERE key = 'visitorStats'").run(JSON.stringify(statsObj));
    }

    const updatedRow = {
      ...row,
      views: row.views + 1,
      isFeatured: row.isFeatured === 1,
      tags: JSON.parse(row.tags || '[]')
    };

    // Cache the single article for 30 seconds to absorb concurrent client surges
    apiCache.set(cacheKey, updatedRow, 30000);
    res.json(updatedRow);
  } catch (err) {
    console.error("SQL Error in Slug retrieval:", err);
    res.status(500).json({ error: 'Database transaction failed.' });
  }
});

// 3. POST write or rewrite article (persist new editorial) in SQLite
app.post('/api/articles', requireAdminAuth, (req, res) => {
  try {
    const database = initDB();
    const newArticle: Partial<Article> = req.body;

    if (!newArticle.title || !newArticle.content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Generate clean slug
    const titleSlug = (newArticle.title || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const slug = titleSlug || 'untitled-post';

    // Check if article with this id or slug already exists to update
    let existing: { id: string; views: number; createdAt: string; slug: string } | undefined;
    if (newArticle.id) {
      existing = database.prepare("SELECT id, views, createdAt, slug FROM articles WHERE id = ?").get(newArticle.id) as any;
    }
    if (!existing) {
      existing = database.prepare("SELECT id, views, createdAt, slug FROM articles WHERE slug = ?").get(slug) as any;
    }

    const article: Article = {
      id: existing ? existing.id : (newArticle.id || Date.now().toString()),
      title: newArticle.title,
      slug: slug,
      category: newArticle.category || 'Tech',
      summary: newArticle.summary || (newArticle.content.replace(/<[^>]*>/g, '').slice(0, 150) + '...'),
      content: newArticle.content,
      author: newArticle.author || 'Anik Admin',
      authorRole: newArticle.authorRole || 'System Administrator',
      authorAvatar: newArticle.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
      publishedDate: newArticle.publishedDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: (newArticle.status as 'Draft' | 'Published') || 'Draft',
      isFeatured: newArticle.isFeatured || false,
      featuredImage: newArticle.featuredImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop',
      tags: newArticle.tags || ['General'],
      views: existing ? existing.views : 0,
      readingTime: newArticle.readingTime || '5 min read',
      seoTitle: newArticle.seoTitle || `${newArticle.title} | LLM Review Pro`,
      seoDescription: newArticle.seoDescription || newArticle.summary || '',
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };

    // If newly published post is marked featured, reset other features
    if (article.isFeatured) {
      database.prepare("UPDATE articles SET isFeatured = 0").run();
    }

    if (existing) {
      // Update
      database.prepare(`
        UPDATE articles SET
          title = ?,
          category = ?,
          summary = ?,
          content = ?,
          author = ?,
          authorRole = ?,
          authorAvatar = ?,
          publishedDate = ?,
          status = ?,
          isFeatured = ?,
          featuredImage = ?,
          tags = ?,
          readingTime = ?,
          seoTitle = ?,
          seoDescription = ?,
          slug = ?
        WHERE id = ?
      `).run(
        article.title,
        article.category,
        article.summary,
        article.content,
        article.author,
        article.authorRole,
        article.authorAvatar,
        article.publishedDate,
        article.status,
        article.isFeatured ? 1 : 0,
        article.featuredImage,
        JSON.stringify(article.tags),
        article.readingTime,
        article.seoTitle,
        article.seoDescription,
        slug,
        existing.id
      );
    } else {
      // Insert
      database.prepare(`
        INSERT INTO articles (
          id, title, slug, category, summary, content, author, authorRole,
          authorAvatar, publishedDate, status, isFeatured, featuredImage,
          tags, views, readingTime, seoTitle, seoDescription, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
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
        article.isFeatured ? 1 : 0,
        article.featuredImage,
        JSON.stringify(article.tags),
        article.views,
        article.readingTime,
        article.seoTitle,
        article.seoDescription,
        article.createdAt
      );
    }

    // Clear relevant caches instantly
    apiCache.clear();

    res.json(article);
  } catch (err) {
    console.error("SQL Error in Slug writing/updating:", err);
    res.status(500).json({ error: 'Database write failed.' });
  }
});

// 3.5. DELETE single article by ID from SQLite (secured with admin credentials)
app.delete('/api/articles/:id', requireAdminAuth, (req, res) => {
  try {
    const database = initDB();
    const { id } = req.params;

    // Check if article exists
    const existing = database.prepare("SELECT * FROM articles WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Delete
    database.prepare("DELETE FROM articles WHERE id = ?").run(id);

    // Clear caches instantly on deletion
    apiCache.clear();

    res.json({ success: true, message: 'Article safely deleted.' });
  } catch (err) {
    console.error("SQL Error in article deletion:", err);
    res.status(500).json({ error: 'Database deletion failed.' });
  }
});

// 4. GET dynamic layout stats & history configurations for analytics from SQLite
app.get('/api/analytics', requireAdminAuth, (req, res) => {
  try {
    const database = initDB();

    // Query 1. Total page views count (from real tracked page_visits rows)
    const pvObj = database.prepare("SELECT COUNT(*) as count FROM page_visits").get() as { count: number };
    const pageViews = pvObj.count;

    // Query 2. Unique visitors count
    const uvObj = database.prepare("SELECT COUNT(DISTINCT sessionId) as count FROM page_visits").get() as { count: number };
    const uniqueVisitors = uvObj.count;

    // Query 3. Total visitors count (let's use unique view sessions as baseline)
    const totalVisitors = uniqueVisitors;

    // Query 4. Get active articles, drafts, subscribers, and contact messages
    const articlesCountObj = database.prepare("SELECT COUNT(*) as count FROM articles").get() as { count: number };
    const draftsCountObj = database.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'Draft'").get() as { count: number };
    const subscribersCountObj = database.prepare("SELECT COUNT(*) as count FROM subscribers").get() as { count: number };
    const messagesCountObj = database.prepare("SELECT COUNT(*) as count FROM contact_messages").get() as { count: number };
    const unreadMessagesCountObj = database.prepare("SELECT COUNT(*) as count FROM contact_messages WHERE isRead = 0").get() as { count: number };

    // Query 5. Build dynamic visitorHistory by retrieving counts grouped by dayOfWeek
    const historyRows = database.prepare(`
      SELECT dayOfWeek, COUNT(*) as count 
      FROM page_visits 
      GROUP BY dayOfWeek
    `).all() as { dayOfWeek: string; count: number }[];

    // Ensure all days of the week are represented in the history response to prevent graph breakage
    const daysOrdered = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const historyMap = new Map<string, number>();
    daysOrdered.forEach(d => historyMap.set(d, 0));
    historyRows.forEach(row => {
      if (historyMap.has(row.dayOfWeek)) {
        historyMap.set(row.dayOfWeek, row.count);
      }
    });

    const visitorHistory = daysOrdered.map(day => ({
      day,
      count: historyMap.get(day) || 0
    }));

    const stats: VisitorStats = {
      totalVisitors,
      uniqueVisitors,
      pageViews,
      visitorHistory
    };

    res.json({
      stats,
      totalArticles: articlesCountObj.count,
      draftsCount: draftsCountObj.count,
      subscribersCount: subscribersCountObj.count,
      messagesCount: messagesCountObj.count,
      unreadMessagesCount: unreadMessagesCountObj.count
    });
  } catch (err) {
    console.error("SQL Analytics failed:", err);
    res.status(500).json({ error: "Analytics sync failure." });
  }
});

// 4.5. POST log a live page or essay view in SQLite page_visits table
app.post('/api/track-view', (req, res) => {
  try {
    const database = initDB();
    const { path, sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId parameter is required' });
    }

    const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = days[new Date().getDay()];

    database.prepare(`
      INSERT INTO page_visits (id, sessionId, path, timestamp, dayOfWeek)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sessionId, path || '/', timestamp, dayOfWeek);

    res.json({ success: true, message: 'View tracked successfully.' });
  } catch (err) {
    console.error("SQL dynamic page tracking failed:", err);
    res.status(500).json({ error: 'Internal tracking failed.' });
  }
});

// 5. POST news subscription in SQLite
app.post('/api/subscribe', (req, res) => {
  try {
    const database = initDB();
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    database.prepare("INSERT OR IGNORE INTO subscribers (email, timestamp) VALUES (?, ?)").run(email, new Date().toISOString());

    res.json({ success: true, message: 'Subscribed to Weekly Insight!' });
  } catch (err) {
    console.error("SQL Subscriber error:", err);
    res.status(500).json({ error: "Subscription pipeline failure." });
  }
});

// 6. POST Submit Contact Form Message
app.post('/api/contact', (req, res) => {
  try {
    const database = initDB();
    const { name, email, subject, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: 'Valid email and message body are required' });
    }

    const id = Date.now().toString();
    const timestamp = new Date().toISOString();

    database.prepare(`
      INSERT INTO contact_messages (id, name, email, subject, message, timestamp, isRead)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(id, name || '', email, subject || '', message, timestamp);

    res.json({ success: true, message: 'Your message has been safely received.' });
  } catch (err) {
    console.error("SQL Support contact submit failed:", err);
    res.status(500).json({ error: "Contact delivery pipeline crashed." });
  }
});

// 7. GET All Contact Form Messages (Admin Secured)
app.get('/api/contact', requireAdminAuth, (req, res) => {
  try {
    const database = initDB();
    const messages = database.prepare("SELECT * FROM contact_messages ORDER BY timestamp DESC").all() as any[];
    const mapped = messages.map(m => ({
      ...m,
      isRead: m.isRead === 1
    }));
    res.json(mapped);
  } catch (err) {
    console.error("SQL Support messages fetch failed:", err);
    res.status(500).json({ error: "Could not fetch customer messages." });
  }
});

// 8. POST Mark Contact Message as Read (Admin Secured)
app.post('/api/contact/:id/read', requireAdminAuth, (req, res) => {
  try {
    const database = initDB();
    const { id } = req.params;
    database.prepare("UPDATE contact_messages SET isRead = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err) {
    console.error("SQL Read flag update failed:", err);
    res.status(500).json({ error: "Could not edit message state." });
  }
});

// 9. DELETE Contact Message (Admin Secured)
app.delete('/api/contact/:id', requireAdminAuth, (req, res) => {
  try {
    const database = initDB();
    const { id } = req.params;
    database.prepare("DELETE FROM contact_messages WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err) {
    console.error("SQL Message deletion failed:", err);
    res.status(500).json({ error: "Could not remove message entry." });
  }
});

// 10. Dynamic robots.txt
app.get('/robots.txt', (req, res) => {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /login

Sitemap: ${baseUrl}/sitemap.xml
`);
});

// 11. Dynamic ads.txt for high compliance with Google AdSense crawler
app.get('/ads.txt', (req, res) => {
  const pubId = process.env.ADSENSE_PUB_ID || 'pub-xxxxxxxxxxxxxxxx';
  res.type('text/plain');
  res.send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
});

// 12. Dynamic sitemap.xml for SEO indexing optimization
app.get('/sitemap.xml', (req, res) => {
  try {
    const cacheKey = 'dynamic_sitemap_xml';
    const cachedSitemap = apiCache.get<string>(cacheKey);
    if (cachedSitemap) {
      res.type('application/xml');
      return res.send(cachedSitemap);
    }

    const database = initDB();
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const activeArticles = database.prepare("SELECT slug, publishedDate, createdAt FROM articles WHERE status = 'Published'").all() as any[];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>2026-06-07</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>2026-06-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>2026-06-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>2026-06-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>2026-06-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

    for (const art of activeArticles) {
      const artDate = art.publishedDate ? new Date(art.publishedDate).toISOString().split('T')[0] : '2026-06-07';
      xml += `
  <url>
    <loc>${baseUrl}/post/${art.slug}</loc>
    <lastmod>${artDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    }

    xml += `\n</urlset>`;
    
    // Cache the XML sitemap layout for 1 hour to protect database cycles
    apiCache.set(cacheKey, xml, 3600000);

    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error("Failed to build dynamic XML sitemap:", err);
    res.status(500).send('<error>Could not generate sitemap</error>');
  }
});

// Start dev or production asset pipeline
async function serveApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Aggressive cache settings for Vite production static bundle hashed assets
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '365d',
      immutable: true,
      fallthrough: false
    }));

    // Standard short expiration caching for HTML router and assets in dist folder
    app.use(express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, no-cache, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'public, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Editorial Server listening at http://localhost:${PORT}`);
  });
}

serveApp();

