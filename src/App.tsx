import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Dumbbell,
  FileAudio,
  FolderOutput,
  Headphones,
  LogOut,
  LockKeyhole,
  Mail,
  Menu,
  Mic,
  MoveUpRight,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Square,
  Target,
  TrendingUp,
  Upload,
  Volume2,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Route = 'landing' | 'login' | 'signup' | 'app';
type View = 'overview' | 'new' | 'results' | 'architecture' | 'practice' | 'recordings' | 'compare' | 'rubrics' | 'settings';
type AnalysisMode = 'reference' | 'rubric';

type UserProfile = {
  id: string;
  display_name: string;
  onboarding_completed: boolean;
  primary_goal: string | null;
  selected_contexts: string[];
  experience_level: string | null;
  coaching_priorities: string[];
  feedback_style: string | null;
  detail_level: string | null;
  practice_frequency: string | null;
  upcoming_event_date: string | null;
  personal_goal: string | null;
};

type PracticePlan = {
  id: string;
  title: string;
  goal: string;
  status: string;
  activities: { id: string; title: string; instructions: string; estimated_minutes: number; status: string; position: number }[];
};

type Finding = {
  title: string;
  category: string;
  time: string;
  start: number;
  end: number;
  detail: string;
  observed: string;
  exercise: string;
  tone: 'amber' | 'red' | 'cyan';
  priority?: boolean;
};

const sampleFindings: Finding[] = [
  {
    title: 'A few long pauses are worth revisiting',
    category: 'Pauses & phrasing',
    time: '0:38–0:39',
    start: 38.0,
    end: 39.5,
    detail: 'The timestamp analysis estimated 4 pauses at or above the existing 0.75-second threshold. Pauses can be useful for breathing or emphasis; this is an observation to review, not a claim that every pause was wrong.',
    observed: '4 estimated long pauses · longest 0.96 seconds · 4.2 per minute',
    exercise: 'Replay the marked gap with its surrounding sentence. If the thought feels unfinished, split the sentence into shorter meaningful phrases and place one intentional breath before the transition.',
    tone: 'red',
    priority: true,
  },
  {
    title: 'One phrase runs for a long stretch',
    category: 'Pacing & flow',
    time: '0:13–0:24',
    start: 13.0,
    end: 24.2,
    detail: 'Speech rate increases against the local baseline. The continuous word run without an intentional respiratory boundary can compress meaning.',
    observed: '38 uninterrupted words · 168 wpm / local baseline 124 wpm',
    exercise: 'Practise the same clause with a deliberate breath break at the natural phrase boundary.',
    tone: 'red',
    priority: false,
  },
  {
    title: 'Pitch movement on key phrase',
    category: 'Pitch & emphasis',
    time: '0:44–0:49',
    start: 44.0,
    end: 49.0,
    detail: 'Pitch movement is flatter than the reference window. This is an observable contour difference, not an emotion label.',
    observed: '−22% F0 range / reference window',
    exercise: 'Read the phrase again with one emphasized word that carries the key meaning.',
    tone: 'cyan',
    priority: false,
  },
];

const sampleTranscript = 'Your hands lie open in the long-fresh grass. The finger points look through like rosy blooms. Your eyes smile peace. The pasture gleams and glooms beneath billowing skies that scatter and amass. All round our nest far as the eye can pass. Our golden king cup feels with silver edge where the cow partially skirts the Hawthorn hedge to his visible silence still is the hourglass. Your hands lie open in the long-fresh grass. The finger points look through like rosy blooms. Your eyes smile peace. The pasture gleams and glooms beneath billowing skies that scatter and amass. All round our nest far as the eye can pass. Our golden king cup feels with silver edge where the cow partially skirts the Hawthorn hedge to his visible silence still is the hourglass.';

const DEMO_DURATION = 58;

const navItems: { id: View; label: string; index: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', index: '01', icon: BarChart3 },
  { id: 'new', label: 'New analysis', index: '02', icon: Plus },
  { id: 'results', label: 'Saved analysis', index: '03', icon: FileAudio },
  { id: 'practice', label: 'Practice Studio', index: '04', icon: Dumbbell },
  { id: 'architecture', label: 'Architecture', index: '05', icon: Network },
  { id: 'compare', label: 'Compare attempts', index: '06', icon: ArrowLeft },
  { id: 'rubrics', label: 'Rubrics', index: '07', icon: Target },
  { id: 'settings', label: 'Settings', index: '08', icon: Settings },
];

function getRoute(): Route {
  const path = window.location.pathname;
  if (path === '/login') return 'login';
  if (path === '/signup') return 'signup';
  if (path.startsWith('/app')) return 'app';
  return 'landing';
}

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <button className={`brand ${light ? 'brand-light' : ''}`} onClick={() => navigate('/')} aria-label="SpeechLab home">
      <span className="brand-mark">
        <AudioLines size={18} strokeWidth={2.5} />
      </span>
      <span>
        Speech<span className="brand-text-lab">Lab</span>
      </span>
    </button>
  );
}

function WaveField({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`wave-field ${compact ? 'wave-field-compact' : ''}`} aria-hidden="true" style={{ width: '100%', height: compact ? '90px' : '220px', position: 'relative' }}>
      <svg viewBox="0 0 640 220" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <path d="M0 110 C65 60 82 160 142 115 S225 50 282 105 S369 190 432 110 S519 50 640 85" fill="none" stroke="#E5DED1" strokeWidth="1.5" />
        <path d="M0 85 C74 25 100 145 155 90 S232 10 293 75 S374 175 438 80 S534 5 640 50" fill="none" stroke="#C83218" strokeWidth="2" opacity="0.85" />
        <path d="M0 135 C61 95 93 190 151 130 S235 70 292 125 S381 210 448 125 S550 80 640 120" fill="none" stroke="#6D6860" strokeWidth="1.2" opacity="0.4" />
      </svg>
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = 'outline',
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'outline' | 'acid' | 'primary' | 'secondary' | 'quiet' | 'dark';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const variantClass = variant === 'acid' || variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : variant === 'quiet' ? 'btn-quiet' : 'btn-outline';
  return (
    <button type={type} disabled={disabled} className={`btn ${variantClass} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

/* ==========================================================================
   PAGE 1: LANDING PAGE (Screenshots 1, 2, 3)
   ========================================================================== */

function Landing() {
  const [activeStep, setActiveStep] = useState(1);
  const steps = [
    { num: '01', title: 'Audio capture', desc: 'Record or upload speech into a private, tamper-free workspace.' },
    { num: '02', title: 'Word position', desc: 'Timestamped word alignment isolates pauses, rushed sections, and cadence.' },
    { num: '03', title: 'The pitch shape', desc: 'F0 contour curves expose flat delivery and natural emphasis points.' },
    { num: '04', title: 'Acoustic evidence', desc: 'Measured rate and silence thresholds replace arbitrary gut feel.' },
    { num: '05', title: 'Practise at specific moments', desc: 'Jump back to the exact split-second and rehearse the next take.' },
  ];

  return (
    <div className="site-shell">
      {/* Header (Screenshot 1) */}
      <header className="site-header wrap">
        <Brand />
        <nav className="main-nav">
          <a href="#how">How it works</a>
          <a href="#features">Who it’s for</a>
          <span className="nav-divider" />
          <button className="text-link" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </nav>
        <div className="header-actions">
          <Button variant="primary" onClick={() => navigate('/signup')}>
            Get started <MoveUpRight size={14} />
          </Button>
        </div>
        <button className="mobile-menu" onClick={() => navigate('/signup')} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </header>

      <main>
        {/* Hero Section (Screenshot 1) */}
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> A CLEARER NEXT TAKE STARTS HERE
            </div>
            <h1>
              Hear exactly where
              <br />
              <span className="highlight-text">your speech works,</span>
              <br />
              and where it slips.
            </h1>
            <p className="hero-lede">
              Upload or record a talk. SpeechLab transcribes it, marks the exact moments worth fixing, and shows what to try next with grounded acoustic evidence.
            </p>
            <div className="hero-actions">
              <Button variant="primary" onClick={() => navigate('/signup')}>
                Get started <MoveUpRight size={15} />
              </Button>
              <Button variant="outline" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore how it works <Play size={14} />
              </Button>
            </div>
            <div className="trust-line">
              <ShieldCheck size={16} /> Evidence first. Interpretation second. Private by default.
            </div>
          </div>

          {/* Hero Visual Collage / Polaroid Sticker (Screenshot 1) */}
          <div className="hero-visual">
            <div className="sticker-composition">
              <div className="polaroid-backdrop">
                <div className="polaroid-inner">
                  <WaveField />
                </div>
                <div className="polaroid-caption">LISTEN / MARK / PRACTISE</div>
              </div>

              {/* Die-cut Microphone Sticker Effect */}
              <div className="mic-sticker-wrap">
                <div className="mic-sticker">
                  <div className="mic-grille" />
                  <div className="mic-body">
                    <div className="mic-switch" />
                  </div>
                </div>
              </div>

              {/* Waveform Sticker Badge */}
              <div className="waveform-sticker-badge">
                <div className="sticker-bars">
                  <span style={{ height: '14px' }} />
                  <span style={{ height: '22px' }} />
                  <span style={{ height: '10px' }} />
                  <span style={{ height: '26px' }} />
                  <span style={{ height: '18px' }} />
                  <span style={{ height: '24px' }} />
                  <span style={{ height: '12px' }} />
                  <span style={{ height: '20px' }} />
                </div>
                <span className="music-notes">♫</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ticker Banner */}
        <section className="ticker">
          <div className="ticker-inner">
            <span>PAUSE INTERVALS</span>
            <span>F0 CONTOUR</span>
            <span>SPEECH RATE</span>
            <span>RMS ENERGY</span>
            <span>FORCED ALIGNMENT</span>
            <span>TEMPORAL FLAW GROUNDING</span>
            <span>CONTRASTIVE METRICS</span>
            <span>PAUSE INTERVALS</span>
            <span>F0 CONTOUR</span>
            <span>SPEECH RATE</span>
          </div>
        </section>

        {/* Demonstration Section (Screenshot 2) */}
        <section className="workflow wrap" id="how">
          <div className="section-kicker">02 FROM VOICE TO EVIDENCE</div>
          <div className="demo-showcase-grid">
            <div className="demo-left">
              <span className="eyebrow" style={{ marginTop: '8px' }}>
                A DEMONSTRATION, NOT A REAL ANALYSIS
              </span>
              <h2>
                Make the
                <br />
                moment
                <br />
                <span className="highlight-text">make sense.</span>
              </h2>
              <p>
                SpeechLab turns a recording into a trail you can follow: what was said, where it happened, what was measured, and what to try next.
              </p>
              <div className="demo-timeline-bar">
                <div className="demo-timeline-progress" />
              </div>
            </div>

            {/* Off-White Demonstration Waveform Card (Screenshot 2) */}
            <div className="waveform-demo-card">
              <div className="waveform-demo-top">
                <span className="eyebrow-dot" />
                <span>00:19</span>
              </div>
              <div className="waveform-demo-bars">
                {[18, 34, 46, 28, 54, 40, 62, 50, 70, 58, 38, 48, 20, 24, 32, 28, 20, 14, 22, 16].map((h, i) => (
                  <div
                    key={i}
                    className={`bar ${i <= 10 ? 'active' : 'inactive'}`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <h3 className="waveform-demo-quote">“The idea is clear — let it land.”</h3>
              <div className="waveform-demo-sub">Listening for the useful detail...</div>
            </div>
          </div>

          {/* Interactive Steps Ribbon below demonstration (Screenshot 2) */}
          <div className="demo-step-ribbon">
            {steps.map((st, i) => (
              <button
                key={st.num}
                className={`demo-ribbon-item ${activeStep === i ? 'active' : ''}`}
                onClick={() => setActiveStep(i)}
              >
                <div className="ribbon-num">{st.num}</div>
                <strong>{st.title}</strong>
              </button>
            ))}
          </div>
        </section>

        {/* Feature Section */}
        <section className="feature-section" id="features">
          <div className="wrap">
            <div className="section-kicker">/ WHAT THE SIGNAL CAN SHOW</div>
            <div className="feature-intro">
              <h2>
                Not a score.
                <br />
                <span className="highlight-text">A traceable point of view.</span>
              </h2>
              <p>SpeechLab keeps observation and interpretation distinct, so every recommendation has a visible reason behind it.</p>
            </div>
            <div className="feature-list">
              <article>
                <div className="feature-index">01 / COMPARE</div>
                <div>
                  <h3>Contrastive analysis</h3>
                  <p>Compare two recordings of the same speech with normalized, speaker-agnostic feature traces.</p>
                </div>
                <div className="mini-bars">
                  <i style={{ height: '35%' }} />
                  <i style={{ height: '74%' }} />
                  <i style={{ height: '48%' }} />
                  <i style={{ height: '94%' }} />
                  <i style={{ height: '62%' }} />
                  <i style={{ height: '81%' }} />
                  <i style={{ height: '40%' }} />
                </div>
              </article>
              <article>
                <div className="feature-index">02 / GROUND</div>
                <div>
                  <h3>Temporal flaw grounding</h3>
                  <p>Locate measurable delivery patterns at specific timestamps, not somewhere in a summary.</p>
                </div>
                <div className="mini-timeline">
                  <span />
                  <span />
                  <span className="hot" />
                  <span />
                  <span />
                </div>
              </article>
              <article>
                <div className="feature-index">03 / MEASURE</div>
                <div>
                  <h3>Acoustic evidence</h3>
                  <p>Inspect rate, pause duration, pitch movement, and energy when the method can estimate them reliably.</p>
                </div>
                <div className="feature-quote">
                  <span>“What changed?”</span> <ArrowRight size={16} /> <span>“Where?”</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Research Approach Section */}
        <section className="research wrap" id="research">
          <div className="research-aside">
            <div className="section-kicker">/ RESEARCH NOTE</div>
            <div className="research-stamp">
              R<br />0.1
            </div>
          </div>
          <div className="research-copy">
            <h2>
              Trust the boundary
              <br />
              between <span className="highlight-text">signal</span> and story.
            </h2>
            <p>
              Speech delivery metrics are not a complete evaluation of communication quality. A longer pause may be deliberate. A pitch shift is not proof of emotion. SpeechLab surfaces the measurement and the context so a person can decide what it means.
            </p>
            <div className="principles">
              <div>
                <Check size={16} />
                <span>Versioned rubrics</span>
              </div>
              <div>
                <Check size={16} />
                <span>Reproducible processing</span>
              </div>
              <div>
                <Check size={16} />
                <span>No invented findings</span>
              </div>
              <div>
                <Check size={16} />
                <span>Private recordings</span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section (Screenshot 3) */}
        <section className="final-cta wrap">
          <div className="section-kicker">YOUR NEXT RECORDING IS ENOUGH TO BEGIN.</div>
          <h2>
            Listen closer.
            <br />
            <span className="highlight-text">Move forward.</span>
          </h2>
          <Button variant="primary" onClick={() => navigate('/signup')}>
            Get started <MoveUpRight size={15} />
          </Button>
        </section>
      </main>

      <footer className="site-footer wrap">
        <Brand />
        <span>SPEECHLAB — CONTRASTIVE SPEECH ANALYTICS & TEMPORAL FLAW GROUNDING</span>
        <div>
          <a href="#how">How it works</a>
          <a href="#research">Research</a>
          <button className="text-link" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ==========================================================================
   PAGE 2: AUTHENTICATION / SIGN IN PAGE (Screenshot 4)
   ========================================================================== */

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!email || !password || (isSignup && !name)) {
      setError('Complete every required field to continue.');
      return;
    }
    setLoading(true);
    if (!supabase) {
      // In preview without supabase creds, navigate cleanly to app demo workspace
      setTimeout(() => {
        setLoading(false);
        navigate('/app');
      }, 500);
      return;
    }
    const result = isSignup
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
  };

  return (
    <div className="auth-shell">
      {/* Left visual & branding */}
      <div className="auth-visual">
        <div className="auth-top">
          <Brand />
        </div>

        <div className="auth-visual-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> PRIVATE PRACTICE SPACE
          </div>
          <h1>
            Your voice,
            <br />
            <span className="highlight-text">your workspace.</span>
          </h1>
          <p>Save your sessions, return to useful moments, and build a practice rhythm that belongs to you.</p>
          <button className="results-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to the landing page
          </button>
        </div>

        <div className="auth-bottom">
          <span>ENGLISH / MVP-0.1</span>
          <span>DATA STAYS YOURS</span>
        </div>
      </div>

      {/* Right form card (Screenshot 4) */}
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-card-header">
            <ShieldCheck size={20} />
            <span>{isSignup ? 'Create account securely' : 'Sign in securely'}</span>
          </div>

          <button
            type="button"
            className="google-auth-btn"
            onClick={() => {
              if (supabase) {
                supabase.auth.signInWithOAuth({ provider: 'google' });
              } else {
                navigate('/app');
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">or use email</div>

          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label>
                Full name
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email address
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              Password
              <div className="input-with-icon">
                <LockKeyhole size={16} />
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {!isSignup && (
              <div className="form-row">
                <label className="check-label">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <button type="button" className="form-link">
                  Forgot password?
                </button>
              </div>
            )}

            {error && <div className="form-error" style={{ color: 'var(--color-primary)', fontSize: '12px' }}>{error}</div>}

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Connecting…' : isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to SpeechLab?'}
            <button type="button" onClick={() => navigate(isSignup ? '/login' : '/signup')}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </div>

          <div className="auth-note">
            Google provider setup is required in Supabase before OAuth can complete. Email authentication uses Supabase's secure hosted session flow.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PAGE 3: OVERVIEW / PERSONAL PROGRESS DASHBOARD (Screenshots 9 & 10)
   ========================================================================== */

function Overview({ setView }: { setView: (view: View) => void; profile: UserProfile; plan: PracticePlan; onCompleteActivity: (id: string) => void }) {
  const [dateRange] = useState('Last 30 days');
  const [hoveredPoint, setHoveredPoint] = useState<'pause' | null>(null);

  return (
    <div className="overview-content">
      {/* Dashboard Header (Screenshot 9) */}
      <div className="dashboard-hero">
        <div>
          <button className="results-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={15} /> Back to dashboard
          </button>
          <div className="section-kicker">PERSONAL PROGRESS DASHBOARD</div>
          <h2>Your Speaking Progress</h2>
          <p>
            Follow measured changes across saved, completed transcripts. Each chart uses only the recordings and timestamps that can support that metric.
          </p>
        </div>

        <div className="dashboard-range-pill">
          <span>Showing</span>
          <strong>{dateRange}</strong>
          <small>2 completed takes across all history</small>
        </div>
      </div>

      {/* 4 Metric Cards Grid (Screenshot 9) */}
      <div className="metrics-grid-four">
        <div className="metric-stat-card">
          <div className="metric-icon-badge">
            <BarChart3 size={18} />
          </div>
          <div className="metric-label">ELIGIBLE TAKES</div>
          <div className="metric-value">2</div>
          <div className="metric-sub">Last 30 days with completed transcripts</div>
        </div>

        <div className="metric-stat-card">
          <div className="metric-icon-badge">
            <TrendingUp size={18} />
          </div>
          <div className="metric-label">LATEST SPEAKING PACE</div>
          <div className="metric-value">140 WPM</div>
          <div className="metric-sub">Comparison Of Vernacular And Refined Speech</div>
        </div>

        <div className="metric-stat-card">
          <div className="metric-icon-badge">
            <AudioLines size={18} />
          </div>
          <div className="metric-label">LATEST FILLER RATE</div>
          <div className="metric-value">0.0 fillers/min</div>
          <div className="metric-sub">Comparison Of Vernacular And Refined Speech</div>
        </div>

        <div className="metric-stat-card">
          <div className="metric-icon-badge">
            <Target size={18} />
          </div>
          <div className="metric-label">ACTIVE GOALS</div>
          <div className="metric-value">1</div>
          <div className="metric-sub">Targets being tracked</div>
        </div>
      </div>

      {/* Speaking Pace Over Time Card (Screenshot 9) */}
      <div className="chart-card-full">
        <div className="chart-card-header">
          <div>
            <div className="section-kicker">SPEAKING PACE</div>
            <h3>Pace over time.</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
              Individual words-per-minute measurements from recordings with a recognized word count and positive duration.
            </p>
          </div>
          <TrendingUp size={20} />
        </div>

        <div className="interactive-chart-wrap">
          <svg className="chart-svg-main" viewBox="0 0 800 140" preserveAspectRatio="none">
            <defs>
              <linearGradient id="terracotta-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C83218" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#C83218" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M 50 85 L 400 65 L 750 45" fill="none" stroke="#E5DED1" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M 50 85 L 750 45 L 750 140 L 50 140 Z" className="chart-area-fill" />
            <path d="M 50 85 L 750 45" className="chart-line-terracotta" />
            <circle cx="50" cy="85" className="chart-dot" />
            <circle cx="750" cy="45" className="chart-dot" />
          </svg>
          <div className="chart-axis-labels">
            <span>14 Oct (128 WPM)</span>
            <span>23 Oct (140 WPM)</span>
          </div>
        </div>
      </div>

      {/* 2-Column Pause Analysis Grid (Screenshot 10) */}
      <div className="pause-charts-grid">
        {/* Left Card: Pause Frequency */}
        <div className="pause-chart-card">
          <div className="section-kicker">PAUSE FREQUENCY</div>
          <h3>Long pauses per minute.</h3>
          <p>
            Estimated pauses at or above the existing timestamp threshold, normalized by duration. Long pauses use the existing 0.75-second threshold.
          </p>

          <div className="chart-meta-row">
            <span>2 eligible recordings</span>
            <span>Individual measurements · no smoothing</span>
          </div>

          <div className="interactive-chart-wrap" style={{ height: '120px' }}>
            <svg className="chart-svg-main" viewBox="0 0 400 100" preserveAspectRatio="none">
              <line x1="20" y1="35" x2="380" y2="75" stroke="#C83218" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="20" cy="35" className="chart-dot" />
              <circle
                cx="380"
                cy="75"
                className="chart-dot"
                onMouseEnter={() => setHoveredPoint('pause')}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </svg>
            <div className="chart-axis-labels">
              <span>14 Oct (9.8 pauses/min)</span>
              <span>23 Oct (4.2 pauses/min)</span>
            </div>
          </div>

          {/* Interactive Tooltip Card (Screenshot 10) */}
          <div className={`chart-tooltip-box ${hoveredPoint ? 'active' : ''}`}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '10px', textTransform: 'uppercase' }}>23 Oct 2026</span>
            <strong>Comparison Of Vernacular And Refined Speech</strong>
            <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>4.2 pauses/min</span>
            <button
              onClick={() => setView('results')}
              style={{ display: 'block', color: 'var(--color-heading)', fontSize: '11px', marginTop: '6px', fontWeight: '600' }}
            >
              Open recording ↗
            </button>
          </div>

          <div className="chart-summary-note">
            Long-pause frequency decreased from 9.8 pauses/min to 4.2 pauses/min across 2 recordings. This moves lower, but it is still an observation rather than a quality score.
          </div>
        </div>

        {/* Right Card: Pause Duration */}
        <div className="pause-chart-card">
          <div className="section-kicker">PAUSE DURATION</div>
          <h3>Average long pause.</h3>
          <p>
            Average duration of detected long pauses. A zero value means timestamps were reliable and no qualifying pauses were detected.
          </p>

          <div className="chart-meta-row">
            <span>2 eligible recordings</span>
            <span>Individual measurements · no smoothing</span>
          </div>

          <div className="interactive-chart-wrap" style={{ height: '120px' }}>
            <svg className="chart-svg-main" viewBox="0 0 400 100" preserveAspectRatio="none">
              <line x1="20" y1="60" x2="380" y2="55" stroke="#C83218" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="20" cy="60" className="chart-dot" />
              <circle cx="380" cy="55" className="chart-dot" />
            </svg>
            <div className="chart-axis-labels">
              <span>14 Oct (0.8s)</span>
              <span>23 Oct (0.9s)</span>
            </div>
          </div>

          <div className="chart-tooltip-box">
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '10px', textTransform: 'uppercase' }}>23 Oct 2026</span>
            <strong>Comparison Of Vernacular And Refined Speech</strong>
            <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>0.9 seconds average duration</span>
          </div>

          <div className="chart-summary-note">
            Average long-pause duration increased from 0.8 seconds to 0.9 seconds across 2 recordings. This moves higher; compare similar speaking tasks before drawing conclusions.
          </div>
        </div>
      </div>

      {/* Personal Targets Card (Screenshot 10) */}
      <div className="targets-card">
        <div>
          <div className="section-kicker">PERSONAL TARGETS</div>
          <h3>Goals that stay measurable.</h3>
          <p>
            Targets use the selected date range and only eligible saved recordings. A goal is never completed from missing data.
          </p>
        </div>
        <Button variant="primary" onClick={() => setView('new')}>
          <Plus size={16} /> Add goal
        </Button>
      </div>
    </div>
  );
}

/* ==========================================================================
   PAGE 4: RECORDING WORKSPACE / NEW ANALYSIS (Screenshot 5)
   ========================================================================== */

function NewAnalysis({ setView }: { setView: (view: View) => void }) {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [comparisonType, setComparisonType] = useState<AnalysisMode>('rubric');
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Format seconds to mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startLiveRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      // If mic permissions not granted, fallback to simulated recording
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopLiveRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const triggerAnalysis = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setView('results');
    }, 1200);
  };

  return (
    <div className="new-analysis-content">
      {/* Header Block (Screenshot 5) */}
      <div className="recording-header-block">
        <div className="section-kicker">RECORDING WORKSPACE</div>
        <h2>Make your next take.</h2>
        <p>Capture a real performance, listen back, and save it privately for your practice history.</p>
      </div>

      {/* Pill Segmented Switcher (Screenshot 5) */}
      <div className="pill-segmented-control">
        <button
          type="button"
          className={`pill-segment-btn ${mode === 'record' ? 'active' : ''}`}
          onClick={() => setMode('record')}
        >
          <Mic size={15} /> Record speech
        </button>
        <button
          type="button"
          className={`pill-segment-btn ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => setMode('upload')}
        >
          <Upload size={15} /> Upload audio
        </button>
      </div>

      {/* Mode 1: Record Speech Card (Screenshot 5) */}
      {mode === 'record' && (
        <div className="recording-center-card">
          <div className={`mic-circle-holder ${isRecording ? 'is-recording' : ''}`}>
            <Mic size={30} />
          </div>

          <h3>{isRecording ? 'Recording your speech...' : audioBlobUrl ? 'Take recorded' : 'Ready when you are'}</h3>
          <div className="recording-timer-display">{formatTimer(recordSeconds)}</div>

          <p className="recording-instruction-text">
            Microphone access starts only when you choose Start recording. You can pause, replay, and discard before anything is saved.
          </p>

          {audioBlobUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
              <audio controls src={audioBlobUrl} style={{ width: '100%', maxWidth: '380px' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAudioBlobUrl(null);
                    setRecordSeconds(0);
                  }}
                >
                  <RotateCcw size={15} /> Discard & re-record
                </Button>
                <Button variant="primary" onClick={triggerAnalysis} disabled={isProcessing}>
                  {isProcessing ? 'Processing speech…' : 'Analyse this take'} <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          ) : isRecording ? (
            <button type="button" className="start-record-btn recording" onClick={stopLiveRecording}>
              <Square size={16} fill="white" /> Stop recording
            </button>
          ) : (
            <button type="button" className="start-record-btn" onClick={startLiveRecording}>
              <Mic size={16} /> Start recording
            </button>
          )}
        </div>
      )}

      {/* Mode 2: Upload Audio Panel */}
      {mode === 'upload' && (
        <div className="upload-card-container">
          <label className="upload-dropzone">
            <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <Upload size={28} />
            <strong>{uploadedFile ? uploadedFile.name : 'Drop audio here or browse file'}</strong>
            <span>{uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · WAV, MP3, or M4A` : 'WAV, MP3, or M4A up to 50 MB / private by default'}</span>
          </label>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Transcript (optional but recommended for word alignment)
            </label>
            <textarea
              className="transcript-area"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste or type the text for this recording to ground speech rate, pauses, and pacing against the script…"
            />
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Comparison method</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${comparisonType === 'rubric' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setComparisonType('rubric')}
              >
                Rubric-based analysis
              </button>
              <button
                type="button"
                className={`btn ${comparisonType === 'reference' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setComparisonType('reference')}
              >
                Reference comparison
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Analysis criteria: {comparisonType === 'rubric' ? 'Speech delivery / English / v1.0' : 'Reference window matching / v0.1'}
            </span>
            <Button variant="primary" onClick={triggerAnalysis} disabled={!uploadedFile && !transcript}>
              Start analysis <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   PAGE 5: SAVED ANALYSIS / RESULTS & EVIDENCE (Screenshots 6, 7, 8)
   ========================================================================== */

function ResultsDemo({ profile }: { profile: UserProfile | null }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'rate' | 'pitch' | 'energy'>('rate');
  const [selectedFinding, setSelectedFinding] = useState(0);
  const [copied, setCopied] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= DEMO_DURATION) {
          setPlaying(false);
          return DEMO_DURATION;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const togglePlay = () => setPlaying((p) => !p);
  const scrubTo = (sec: number) => setCurrentTime(Math.max(0, Math.min(DEMO_DURATION, sec)));

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleTranscript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPct = (currentTime / DEMO_DURATION) * 100;

  return (
    <div className="results-demo">
      {/* Top Header Row (Screenshot 6) */}
      <button className="results-back-link" onClick={() => navigate('/app')}>
        <ArrowLeft size={16} /> Back to recordings
      </button>

      <div className="results-main-header">
        <div className="section-kicker">SAVED RECORDING</div>
        <h2>Comparison Of Vernacular And Refined Speech</h2>
        <p>Saved 23 Oct 2026, 11:52 · {profile?.display_name || 'SpeechLab speaker'}</p>
      </div>

      {/* Card 1: Private Playback Card (Screenshot 6) */}
      <div className="playback-card">
        <div className="playback-card-head">
          <div className="audio-icon-holder">
            <Headphones size={22} />
          </div>
          <div>
            <div className="section-kicker">PRIVATE PLAYBACK</div>
            <h3>Listen back to your take.</h3>
          </div>
        </div>

        <div className="playback-controls-row">
          <button className="play-toggle-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>
          <div style={{ flex: 1, position: 'relative', height: '6px', background: 'var(--color-border)', borderRadius: '3px', cursor: 'pointer' }} onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            scrubTo(pct * DEMO_DURATION);
          }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '3px' }} />
          </div>
          <span className="audio-meta-text">
            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60) < 10 ? '0' : ''}{Math.floor(currentTime % 60)} / 0:58
          </span>
          <Volume2 size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        <div className="audio-meta-text">
          1 Comparison Of Vernacular And Refined Speech.mp3 · 1.1 MB · 0:58 · Audio uploaded
        </div>
      </div>

      {/* Card 2: Interactive Acoustic Features & Waveform Track */}
      <div className="waveform-section-card">
        <div className="feature-tabs">
          <button className={activeTab === 'rate' ? 'active' : ''} onClick={() => setActiveTab('rate')}>
            Speech rate
          </button>
          <button className={activeTab === 'pitch' ? 'active' : ''} onClick={() => setActiveTab('pitch')}>
            Pitch contour
          </button>
          <button className={activeTab === 'energy' ? 'active' : ''} onClick={() => setActiveTab('energy')}>
            Energy
          </button>
        </div>

        {/* Feature curve SVG */}
        <div style={{ height: '70px', position: 'relative', margin: '10px 0' }}>
          <svg viewBox="0 0 600 70" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d={activeTab === 'rate' ? 'M0 45 Q150 15 300 48 T600 30' : activeTab === 'pitch' ? 'M0 35 Q120 60 260 20 T600 50' : 'M0 50 Q180 20 340 55 T600 40'}
              fill="none"
              stroke="#C83218"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Interactive Waveform timeline with Finding markers */}
        <div
          className="waveform-track"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            scrubTo(pct * DEMO_DURATION);
          }}
        >
          <div className="waveform-bars">
            {Array.from({ length: 80 }, (_, i) => {
              const h = 25 + Math.sin(i * 0.28) * 45 + (i % 5 === 0 ? 15 : 0);
              const isPast = (i / 80) * 100 <= progressPct;
              return <i key={i} className={isPast ? 'past' : ''} style={{ height: `${h}%` }} />;
            })}
          </div>

          <div className="waveform-playhead" style={{ left: `${progressPct}%` }}>
            <span className="playhead-time">
              {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60) < 10 ? '0' : ''}{Math.floor(currentTime % 60)}
            </span>
          </div>

          {sampleFindings.map((f, index) => {
            const leftPct = (f.start / DEMO_DURATION) * 100;
            const widthPct = ((f.end - f.start) / DEMO_DURATION) * 100;
            return (
              <div
                key={f.title}
                className={`waveform-finding ${index === selectedFinding ? 'selected' : ''}`}
                style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2.5)}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFinding(index);
                  scrubTo(f.start);
                }}
              >
                <span className="finding-num">{index + 1}</span>
              </div>
            );
          })}
        </div>

        <div className="waveform-controls">
          <button onClick={() => scrubTo(currentTime - 5)} disabled={currentTime <= 0}>
            <ArrowLeft size={14} /> −5s
          </button>
          <button onClick={togglePlay}>
            {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => scrubTo(currentTime + 5)} disabled={currentTime >= DEMO_DURATION}>
            +5s <ArrowRight size={14} />
          </button>
          <span className="waveform-time-display">
            {Math.floor(currentTime)}s / {DEMO_DURATION}s
          </span>
        </div>
      </div>

      {/* Card 3: Speech Transcription (Screenshot 7) */}
      <div className="transcription-card">
        <div className="transcription-head">
          <div className="section-kicker">SPEECH TRANSCRIPTION</div>
          <span className="completed-badge">
            <CheckCircle2 size={12} /> TRANSCRIPTION COMPLETED
          </span>
        </div>

        <h3>A written version of your take.</h3>
        <p>Whisper transcription is real provider output. No scores, coaching, or acoustic analysis are added here.</p>

        <div className="transcript-actions-bar">
          <div>
            <strong>Transcript saved</strong>
            <small>The full text and any available word timestamps are shown below.</small>
          </div>
          <Button variant="primary" onClick={() => alert('Whisper pipeline is already completed for this recording.')}>
            Transcribe recording
          </Button>
        </div>

        <div className="transcript-body-box">
          <div className="transcript-body-header">
            <h4>What was said.</h4>
            <Button variant="outline" onClick={handleCopy} className="btn-pill">
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy transcript'}
            </Button>
          </div>
          <p className="transcript-text-content">{sampleTranscript}</p>
        </div>
      </div>

      {/* Card 4: Speech Improvement Coach (Screenshot 8) */}
      <div className="coach-section-card">
        <div className="coach-header-row">
          <div>
            <div className="section-kicker">EVIDENCE-BACKED GUIDANCE</div>
            <h3>Speech Improvement Coach.</h3>
          </div>
          <Target size={24} />
        </div>

        <p>
          Measured findings are separated from practical coaching suggestions so you can choose one useful next move. Priority rules are deterministic: high marks 6+ fillers or 5+ per minute, pace below 90 or above 190 WPM, a 2.5-second pause or 3+ long pauses per minute, a 35+ word uninterrupted run, or 3+ adjacent repeated-word pairs.
        </p>

        <div className="focus-areas-strip">
          <div className="focus-star-badge">
            <Zap size={18} />
          </div>
          <div className="focus-strip-info">
            <strong>2 supported focus areas for this take.</strong>
            <small>134 recognized words · 0:58 of saved audio. The coach uses transcript, word timing, and duration evidence only.</small>
          </div>
          <span className="saved-check-badge">✓ Saved</span>
        </div>

        {/* Individual Coach Findings (Screenshot 8) */}
        {sampleFindings.map((f, i) => (
          <div key={f.title} className="coach-finding-box">
            <div className="finding-item-top">
              <span className="priority-badge">{f.priority ? 'Priority focus' : 'Worth practising'}</span>
              <button
                className="replay-time-link"
                onClick={() => {
                  setSelectedFinding(i);
                  scrubTo(f.start);
                  setPlaying(true);
                }}
              >
                <Clock3 size={13} /> {f.time} Replay segment
              </button>
            </div>

            <h4>{f.title}</h4>
            <p>{f.detail}</p>

            <div className="measured-evidence-bar">
              <span>MEASURED EVIDENCE</span>
              <strong>{f.observed}</strong>
            </div>

            <div className="suggestion-section">
              <div>
                <span className="section-kicker" style={{ display: 'block', marginBottom: '4px' }}>
                  SUGGESTION
                </span>
                <p>{f.exercise}</p>
              </div>
              <button className="practice-this-btn" onClick={() => navigate('/app')}>
                <Play size={13} /> Practice this
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Card 5: Export Panel */}
      <ExportPanel findings={sampleFindings} transcript={sampleTranscript} />
    </div>
  );
}

function ExportPanel({ findings, transcript }: { findings: Finding[]; transcript: string }) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'txt'>('json');

  const download = () => {
    const data = exportFormat === 'json' ? JSON.stringify({ findings, transcript }, null, 2) : transcript;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speechlab-analysis.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-panel">
      <div className="export-header">
        <div>
          <div className="section-kicker">/ EXPORT ANALYSIS</div>
          <h3>Save your evidence</h3>
        </div>
        <FolderOutput size={22} />
      </div>
      <p>Export findings and transcript to keep records of your progress outside SpeechLab.</p>
      <div className="export-formats">
        <button className={exportFormat === 'json' ? 'active' : ''} onClick={() => setExportFormat('json')}>
          JSON
        </button>
        <button className={exportFormat === 'csv' ? 'active' : ''} onClick={() => setExportFormat('csv')}>
          CSV
        </button>
        <button className={exportFormat === 'txt' ? 'active' : ''} onClick={() => setExportFormat('txt')}>
          TXT
        </button>
      </div>
      <div className="export-actions">
        <Button variant="primary" onClick={download}>
          <Download size={15} /> Download {exportFormat.toUpperCase()}
        </Button>
      </div>
    </div>
  );
}

/* ==========================================================================
   SHARED APP SHELL & NAVIGATION
   ========================================================================== */

function Sidebar({
  view,
  setView,
  onSignOut,
  profile,
}: {
  view: View;
  setView: (view: View) => void;
  onSignOut: () => void;
  profile: UserProfile;
}) {
  return (
    <aside className="app-sidebar">
      <Brand />
      <div className="rail-caption" style={{ padding: '0 10px 14px', fontSize: '11px', fontWeight: '600' }}>
        WORKSPACE
      </div>
      <nav className="app-nav">
        {navItems.map(({ id, label, index, icon: Icon }) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
            <span className="nav-index">{index}</span>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="account">
          <div className="avatar">{(profile.display_name || 'SP').slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{profile.display_name || 'SpeechLab speaker'}</strong>
            <small>{profile.primary_goal || 'Practice workspace'}</small>
          </div>
        </div>
        <button
          className="btn btn-quiet"
          onClick={onSignOut}
          style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: '12px' }}
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </aside>
  );
}

function AppHeader({ view, setView }: { view: View; setView: (view: View) => void }) {
  const label = navItems.find((item) => item.id === view)?.label ?? 'Overview';
  return (
    <header className="app-header">
      <div>
        <span className="app-breadcrumb">SPEECHLAB / WORKSPACE /</span>
        <h1>{label}</h1>
      </div>
      <div className="app-header-actions">
        <div className="system-status">
          <span /> ANALYSIS READY
        </div>
        <Button variant="primary" onClick={() => setView('new')}>
          <Plus size={16} /> New analysis
        </Button>
      </div>
    </header>
  );
}

function Workspace({
  onSignOut,
  profile,
  plan,
}: {
  onSignOut: () => void;
  profile: UserProfile | null;
  plan: PracticePlan | null;
}) {
  const [view, setView] = useState<View>('overview');
  const activePlan = useMemo(
    () =>
      plan || {
        id: 'demo-plan',
        title: 'Presentation rhythm baseline',
        goal: 'Clear pacing & measured pauses',
        status: 'active',
        activities: [
          { id: '1', title: 'Record baseline take', instructions: '60–90 seconds prepared passage', estimated_minutes: 5, status: 'pending', position: 1 },
          { id: '2', title: 'Review pause placement', instructions: 'Check pauses at 0.75s threshold', estimated_minutes: 7, status: 'pending', position: 2 },
        ],
      },
    [plan]
  );

  const userProfile: UserProfile = useMemo(
    () =>
      profile || {
        id: 'demo',
        display_name: 'Demo speaker',
        onboarding_completed: true,
        primary_goal: 'Clearer pacing in presentations',
        selected_contexts: ['University'],
        experience_level: 'Intermediate',
        coaching_priorities: ['Pacing', 'Pauses'],
        feedback_style: 'Balanced',
        detail_level: 'Prioritized',
        practice_frequency: 'Weekly',
        upcoming_event_date: null,
        personal_goal: null,
      },
    [profile]
  );

  const content = useMemo(() => {
    switch (view) {
      case 'overview':
        return <Overview setView={setView} profile={userProfile} plan={activePlan} onCompleteActivity={() => {}} />;
      case 'new':
        return <NewAnalysis setView={setView} />;
      case 'results':
        return <ResultsDemo profile={userProfile} />;
      case 'practice':
        return (
          <div className="practice-studio">
            <div className="section-kicker">/ EVIDENCE-LINKED PRACTICE</div>
            <h2>Practice Studio</h2>
            <p>Targeted exercises derived directly from your measured timestamp flaws.</p>
            <div className="playback-card">
              <h3>Exercise: Intentional Breath Breaks</h3>
              <p>Replay the 0:38–0:39 pause from your take, and practice inserting a 0.5s pause before key transition words.</p>
              <Button variant="primary" onClick={() => setView('new')}>Record practice attempt</Button>
            </div>
          </div>
        );
      case 'rubrics':
        return (
          <div className="rubric-page">
            <div className="section-kicker">/ VERSIONED CRITERIA</div>
            <h2>Delivery Rubrics</h2>
            <p>Inspection rules for speech rate, pause duration, and pitch contours.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="settings-page">
            <div className="section-kicker">/ WORKSPACE PREFERENCES</div>
            <h2>Settings & Privacy</h2>
            <p>Your audio and transcripts remain local and private by default.</p>
            <Button variant="outline" onClick={onSignOut}>
              <LogOut size={16} /> Sign out
            </Button>
          </div>
        );
      default:
        return <Overview setView={setView} profile={userProfile} plan={activePlan} onCompleteActivity={() => {}} />;
    }
  }, [view, userProfile, activePlan, onSignOut]);

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} onSignOut={onSignOut} profile={userProfile} />
      <main className="app-main">
        <AppHeader view={view} setView={setView} />
        {content}
      </main>
    </div>
  );
}

/* ==========================================================================
   ROOT COMPONENT & ROUTING
   ========================================================================== */

function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const update = () => setRoute(getRoute());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  useEffect(() => {
    document.title =
      route === 'landing'
        ? 'SpeechLab — Contrastive Speech Analytics & Temporal Flaw Grounding'
        : route === 'app'
        ? 'SpeechLab — Workspace'
        : 'SpeechLab — Sign in';
  }, [route]);

  useEffect(() => {
    if (session && (route === 'login' || route === 'signup')) {
      navigate('/app');
    }
  }, [session, route]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    navigate('/');
  };

  if (route === 'landing') return <Landing />;
  if (route === 'login' || route === 'signup') return <AuthPage mode={route} />;
  return (
    <Workspace
      onSignOut={signOut}
      profile={null}
      plan={null}
    />
  );
}

export default App;
