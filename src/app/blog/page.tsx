import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { Terminal, ArrowLeft, Calendar, User, ArrowRight, BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Blog & Technical Architecture - HiveContext',
  description: 'Deep dives, tutorials, and engineering notes on building autonomous agent memory clouds with CockroachDB.',
};

export default function BlogIndex() {
  const posts = getAllPosts();

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
          <span className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> BLOG &amp; DOCS
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/" className="text-xs uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <Link href="/login" className="bg-white text-black font-bold text-xs uppercase tracking-widest px-4 py-2 rounded hover:bg-red-600 hover:text-white transition-colors">
            Console
          </Link>
        </div>
      </nav>

      {/* Header Banner */}
      <header className="py-16 border-b border-[#1a1a1a] bg-[#0c0c0c]/80 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] uppercase tracking-widest font-bold">
            <span>// ARCHITECTURE &amp; ENGINEERING NOTES</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            The Agent Swarm Blog.
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Discover how we design high-throughput vector indexes, asynchronous ASGI gatekeepers, and persistent collective memory for LLM coding teams.
          </p>
        </div>
      </header>

      {/* Posts List */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16">
        {posts.length === 0 ? (
          <div className="border border-[#222] bg-[#0e0e0e] p-12 text-center rounded">
            <p className="text-slate-500 uppercase tracking-widest text-xs">No articles published yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article 
                key={post.slug}
                className="bg-[#0e0e0e] border border-[#222] hover:border-red-500/50 p-8 rounded transition-all duration-300 relative group shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              >
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500/0 group-hover:border-red-500 transition-colors" />

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3 font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <time dateTime={post.date}>{post.date}</time>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <User className="w-3.5 h-3.5 text-red-500" />
                    <span>{post.author}</span>
                  </span>
                </div>

                <Link href={`/blog/${post.slug}`} className="block group">
                  <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-red-500 transition-colors tracking-tight mb-3">
                    {post.title}
                  </h2>
                </Link>

                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                  {post.excerpt}
                </p>

                <div className="border-t border-[#1a1a1a] pt-4 flex items-center justify-between">
                  <Link 
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white hover:text-red-500 transition-colors"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider">// 4 MIN READ</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-[#1a1a1a] bg-[#060606] py-12 px-4 text-center text-xs text-slate-600">
        <p>HIVE_CONTEXT SYSTEM LOGS // COMPILATION SUCCESSFUL</p>
      </footer>
    </div>
  );
}
