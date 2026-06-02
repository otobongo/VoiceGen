import React, { useState } from 'react';
import { Play, Pause, ChevronRight, ChevronLeft, Volume2, Mic, Sparkles, Code, Music, Wand2, Waves } from 'lucide-react';
import '../market-view.css';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

const VOICES = [
  { id: 'v1', name: 'Marcus', tag: 'Authoritative Narrator', color: 'bg-blue-500' },
  { id: 'v2', name: 'Elena', tag: 'Conversational', color: 'bg-purple-500' },
  { id: 'v3', name: 'Kai', tag: 'Energetic Youth', color: 'bg-orange-500' },
  { id: 'v4', name: 'Sarah', tag: 'Calm Whisper', color: 'bg-teal-500' },
  { id: 'v5', name: 'David', tag: 'Deep Cinematic', color: 'bg-indigo-500' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin }) => {
  const [activeTab, setActiveTab] = useState('tts');
  const [activeVoice, setActiveVoice] = useState(VOICES[0].id);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="market-view min-h-screen w-full bg-background text-foreground font-sans selection:bg-[var(--color-accent-primary-subtle)] selection:text-[var(--color-accent-primary)] overflow-x-hidden relative">
      
      {/* Aura Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tl from-orange-500/10 to-pink-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[20%] rounded-full bg-gradient-to-r from-cyan-500/5 via-indigo-500/5 to-purple-500/5 blur-[80px] pointer-events-none" />

      {/* Navigation */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-50 relative">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-[var(--color-accent-primary)] rounded-lg shadow-sm">
              <Waves className="w-5 h-5 text-[var(--color-accent-on-accent)]" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">AuraVoice</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Studio Editor</a>
            <a href="#" className="hover:text-foreground transition-colors">Real-time API</a>
            <a href="#" className="hover:text-foreground transition-colors">Voice Cloning</a>
            <a href="#" className="hover:text-foreground transition-colors">Resources</a>
            <a href="#" className="hover:text-foreground transition-colors">Enterprise</a>
            <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden sm:block px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors">
            Contact sales
          </button>
          <button 
            onClick={onNavigateToLogin}
            className="px-5 py-2 rounded-md text-sm font-medium bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)] hover:bg-[var(--color-accent-primary-hover)] transition-colors"
          >
            Go to app
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 pt-20 pb-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <div>
            <h1 className="text-6xl sm:text-7xl font-semibold tracking-tight leading-[1.1] mb-8">
              Synthesize emotion,<br />not just sound
            </h1>
            <div className="flex items-center gap-4">
              <button 
                onClick={onNavigateToLogin}
                className="px-6 py-3 rounded-md text-base font-medium bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)] hover:bg-[var(--color-accent-primary-hover)] transition-colors"
              >
                Get Started
              </button>
              <button className="px-6 py-3 rounded-md text-base font-medium border border-border hover:bg-accent transition-colors">
                Contact sales
              </button>
            </div>
          </div>
          
          <div className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg lg:ml-auto">
            Empowering creators, developers, and enterprises with ultra-realistic, emotionally intelligent text-to-speech. From the Studio Editor for precise content creation to the Real-time API for dynamic experiences.
          </div>
        </div>

        {/* Interactive Demo Card */}
        <div className="w-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden relative">
          
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-border/50 gap-4 bg-accent/20">
            <div className="flex items-center gap-2 bg-background p-1.5 rounded-lg border border-border/50 shadow-sm">
              <button className="px-5 py-2 rounded-md text-sm font-medium bg-background shadow-sm border border-border flex items-center gap-2 text-foreground">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 shadow-inner"></div>
                Studio Editor
              </button>
              <button className="px-5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-400 to-cyan-500 shadow-inner"></div>
                Real-time API
              </button>
              <button className="px-5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-slate-400 to-slate-600 shadow-inner"></div>
                Voice Cloning
              </button>
            </div>
            
            <div className="text-right">
              <h3 className="font-semibold text-foreground text-lg">Text to Speech</h3>
              <p className="text-sm text-muted-foreground">Transform text into lifelike speech with emotional nuances</p>
            </div>
          </div>

          {/* Main Content Split */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] min-h-[450px]">
            
            {/* Left Column - Voices */}
            <div className="border-r border-border/50 flex flex-col bg-accent/5">
              <div className="flex-1 p-4 flex flex-col gap-1">
                {VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setActiveVoice(voice.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-md transition-all group ${
                      activeVoice === voice.id 
                        ? 'bg-background border border-border/50 shadow-sm' 
                        : 'hover:bg-accent/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full ${voice.color} bg-gradient-to-br from-white/30 to-black/30 shadow-inner flex items-center justify-center relative overflow-hidden`}>
                        {activeVoice === voice.id && (
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        )}
                        {activeVoice === voice.id && (
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm z-10" />
                        )}
                      </div>
                      <span className="font-medium text-foreground text-base">{voice.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{voice.tag}</span>
                      {activeVoice === voice.id && (
                        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-sm text-foreground hover:scale-105 transition-transform">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Pagination/Explore */}
              <div className="p-6 border-t border-border/50 flex items-center justify-between bg-background/50">
                <button className="px-5 py-2.5 rounded-md text-sm font-medium border border-border bg-background hover:bg-accent transition-colors shadow-sm">
                  Explore 10,000+ voices
                </button>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Text Input */}
            <div className="flex flex-col bg-background relative">
              <div className="flex-1 p-8 sm:p-12 relative">
                <div className="text-sm text-muted-foreground mb-6 font-medium">Enter your own text</div>
                <div className="text-xl sm:text-2xl leading-relaxed text-foreground font-medium max-w-xl">
                  In the ancient land of Eldoria, where skies shimmered and forests, whispered secrets to the wind, lived a dragon named Zephyros.<br/><br/>
                  <span className="text-muted-foreground/50">[sarcastically]</span> Not the "burn it all down" kind... <span className="text-muted-foreground/50">[giggles]</span> but he was gentle, wise, with eyes like old stars. <span className="text-muted-foreground/50">[whispers]</span> Even the birds fell silent when he passed.
                </div>
              </div>
              
              {/* Bottom Right Controls */}
              <div className="p-8 flex items-center justify-between mt-auto">
                <button className="flex items-center gap-2 text-base font-medium hover:text-foreground text-foreground transition-colors bg-accent/50 px-4 py-2 rounded-md border border-border/50">
                  <span className="text-xl leading-none">🇺🇸</span> English <ChevronRight className="w-4 h-4 rotate-90 text-muted-foreground" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-8 py-3.5 rounded-md text-base font-medium bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)] hover:bg-[var(--color-accent-primary-hover)] transition-colors flex items-center gap-2 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transform duration-200"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="p-6 border-t border-border/50 flex flex-wrap items-center justify-between gap-6 bg-accent/20">
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setActiveTab('tts')}
                className={`px-6 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'tts' 
                    ? 'bg-background border border-border shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                Text to Speech
              </button>
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`px-6 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'analysis' 
                    ? 'bg-background border border-border shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                Script Analysis
              </button>
              <button 
                onClick={() => setActiveTab('clone')}
                className={`px-6 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'clone' 
                    ? 'bg-background border border-border shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                Voice Cloning
              </button>
            </div>
            
            <button 
              onClick={onNavigateToLogin}
              className="px-8 py-3 rounded-md text-base font-medium bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)] hover:bg-[var(--color-accent-primary-hover)] transition-colors shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
