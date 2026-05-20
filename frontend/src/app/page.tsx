"use client"

import Link from "next/link"
import { ArrowRight, Bot, Cpu, Globe, Mic, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

// Brand logo SVG matching the image
const BrandLogo = () => (
  <svg className="size-8 md:size-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="#FF4D2E" strokeWidth="8" />
    <path d="M40 30V70" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" />
    <path d="M60 30V60L52 68" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M52 68H68" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" />
  </svg>
)

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col font-sans selection:bg-[var(--primary)]/30">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 transition-transform hover:scale-105 duration-300">
            <BrandLogo />
            <div>
              <div className="flex items-baseline font-bold text-xl md:text-2xl tracking-tight text-[var(--foreground)]">
                <span>call</span>
                <span className="text-[var(--primary)] font-extrabold ml-0.5">20</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/login" className="text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              Sign In
            </Link>
            <Button asChild className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold shadow-lg shadow-[var(--primary)]/20 transition-all hover:shadow-[var(--primary)]/40 hover:-translate-y-0.5">
              <Link href="/register">
                Start Building <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 md:pt-36 md:pb-40">
          {/* Decorative Gradients */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,var(--primary)_0%,transparent_60%)] opacity-10 blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/30 to-transparent pointer-events-none" />
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs md:text-sm font-semibold mb-8 animate-fade-in">
              <Zap className="size-4" />
              <span>The Premier African Voice AI Infrastructure</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-[var(--foreground)] animate-slide-up max-w-4xl mx-auto leading-tight">
              Deploy Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-orange-400">Voice Agents</span> in Minutes.
            </h1>
            
            <p className="text-lg md:text-xl text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "100ms" }}>
              Call20 empowers fintechs, enterprises, and resellers to launch white-labeled conversational AI over global telecom networks. Zero latency. Infinite scale.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <Button asChild size="lg" className="w-full sm:w-auto bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-bold text-lg h-14 px-8 shadow-xl shadow-[var(--primary)]/25 transition-all hover:scale-105">
                <Link href="/register">
                  Create Reseller Account
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 font-bold text-lg hover:bg-[var(--muted)]/50 transition-colors">
                <Link href="/login">
                  Access Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Matrix Section */}
        <section className="py-24 bg-[var(--card)] border-y border-[var(--border)] relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--foreground)] mb-4">Enterprise-Grade Architecture</h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">Everything you need to operate a massive Voice AI organization out of the box.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Bot,
                  title: "Cognitive AI Agents",
                  description: "Deploy highly intelligent conversational agents powered by leading LLMs and custom RAG knowledge bases."
                },
                {
                  icon: Globe,
                  title: "Global Telecom Stack",
                  description: "Instant provisioning of localized phone numbers (DIDs) with built-in SIP trunking and low-latency routing."
                },
                {
                  icon: Cpu,
                  title: "White-Label Reselling",
                  description: "Full multi-tenant architecture allowing you to provision, bill, and manage sub-accounts effortlessly."
                },
                {
                  icon: Mic,
                  title: "Ultra-Low Latency Speech",
                  description: "Proprietary voice orchestration ensures human-like response times critical for customer service flows."
                },
                {
                  icon: Zap,
                  title: "Real-Time Webhooks",
                  description: "Push transcripts, recordings, and extracted analytical data to your CRM or internal systems instantly."
                },
                {
                  icon: ShieldCheck,
                  title: "Bank-Grade Security",
                  description: "End-to-end encryption, strict role-based access controls, and comprehensive compliance auditing."
                }
              ].map((feature, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors group">
                  <div className="size-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="size-6 text-[var(--primary)]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-[var(--foreground)]">{feature.title}</h3>
                  <p className="text-[var(--muted-foreground)] leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--primary)]/5 pointer-events-none" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Ready to scale your voice operations?</h2>
            <p className="text-lg text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto">
              Join leading organizations building the next generation of automated voice experiences on Call20.
            </p>
            <Button asChild size="lg" className="bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90 font-bold text-lg h-14 px-10 transition-transform hover:scale-105">
              <Link href="/register">
                Start Now for Free
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)] py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
            <BrandLogo />
            <div className="font-bold text-xl tracking-tight text-[var(--foreground)]">
              <span>call</span><span className="text-[var(--primary)] ml-0.5">20</span>
            </div>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] font-medium">
            &copy; {new Date().getFullYear()} Call20 Reseller Infrastructure. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}