import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { Terminal, ArrowLeft, Calendar, User, Share2, BookOpen } from 'lucide-react';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: 'Post Not Found - HiveContext' };
  }
  return {
    title: `${post.title} - HiveContext Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#080808] text-slate-300 font-mono relative selection:bg-red-600 selection:text-white">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#141414_1px,transparent_1px),linear-gradient(to_bottom,#141414_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="font-bold text-white tracking-widest text-lg">HIVE_CONTEXT</span>
          </Link>
          <span className="text-slate-600">/</span>
          <Link href="/blog" className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> BLOG
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/blog" className="text-xs uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Articles</span>
          </Link>
          <Link href="/login" className="bg-white text-black font-bold text-xs uppercase tracking-widest px-4 py-2 rounded hover:bg-red-600 hover:text-white transition-colors">
            Console
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16 relative z-10">
        {/* Article Header */}
        <header className="border-b border-[#222] pb-10 mb-12 space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <time dateTime={post.date}>{post.date}</time>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <User className="w-3.5 h-3.5 text-red-500" />
              <span>{post.author}</span>
            </span>
            <span>&bull;</span>
            <span className="text-amber-500 font-bold uppercase tracking-widest">// CLOUD ARCHITECTURE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed italic border-l-2 border-red-600 pl-4 bg-[#111] py-2">
            {post.excerpt}
          </p>
        </header>

        {/* Markdown Content */}
        <article className="prose prose-invert prose-slate max-w-none 
          prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white
          prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-[#222] prose-h2:pb-3 prose-h2:mt-12
          prose-h3:text-xl prose-h3:text-emerald-400
          prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-sm sm:prose-p:text-base
          prose-a:text-red-400 prose-a:no-underline hover:prose-a:underline
          prose-code:text-emerald-400 prose-code:bg-[#121212] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-[#262626]
          prose-pre:bg-[#0c0c0c] prose-pre:border prose-pre:border-[#222] prose-pre:p-6 prose-pre:rounded-lg prose-pre:shadow-[0_0_30px_rgba(0,0,0,0.8)]
          prose-blockquote:border-l-4 prose-blockquote:border-red-600 prose-blockquote:bg-[#121212]/80 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r prose-blockquote:italic prose-blockquote:text-slate-300
          prose-ul:list-disc prose-ul:pl-6 prose-li:text-slate-300
          prose-ol:list-decimal prose-ol:pl-6
          prose-strong:text-white prose-strong:font-bold">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </article>

        {/* Article Footer */}
        <div className="mt-16 pt-8 border-t border-[#222] flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#0e0e0e] p-6 rounded border">
          <div className="space-y-1">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Enjoyed this technical breakdown?</div>
            <p className="text-xs text-slate-500">Deploy your own multi-tenant vector memory swarm in under 60 seconds.</p>
          </div>
          <Link 
            href="/login"
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] flex-shrink-0"
          >
            Start Free Workspace
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#1a1a1a] bg-[#060606] py-12 px-4 text-center text-xs text-slate-600 mt-20">
        <p>HIVE_CONTEXT SYSTEM LOGS // ARTICLE STREAM TERMINATED</p>
      </footer>
    </div>
  );
}
