import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  Dumbbell,
  FileAudio,
  FileText,
  FlaskConical,
  FolderOutput,
  Headphones,
  Lightbulb,
  LogOut,
  LockKeyhole,
  Menu,
  Mic2,
  MoveUpRight,
  Network,
  Pause,
  Play,
  Plus,
  Radio,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

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
};

const sampleFindings: Finding[] = [
  { title: 'Extended pause', category: 'Pauses & phrasing', time: '00:18.4 — 00:20.1', start: 18.4, end: 20.1, detail: 'The pause is longer than the selected rubric’s preferred range. Review the surrounding phrase before changing it.', observed: '1.8 s pause / rubric preferred 0.3–0.9 s', exercise: 'Replay this region, then make one deliberate adjustment while keeping the surrounding phrasing intact.', tone: 'amber' },
  { title: 'Rate shift', category: 'Pacing', time: '00:34.0 — 00:41.6', start: 34.0, end: 41.6, detail: 'Speech rate increases against the local baseline. Try grouping the next clause into one deliberate breath.', observed: '168 wpm / local baseline 124 wpm', exercise: 'Practise the same clause with a deliberate breath break at the natural phrase boundary.', tone: 'red' },
  { title: 'Emphasis contour', category: 'Pitch & emphasis', time: '00:52.2 — 00:56.0', start: 52.2, end: 56.0, detail: 'Pitch movement is flatter than the reference window. This is an observable contour difference, not an emotion label.', observed: '−22% F0 range / reference window', exercise: 'Read the phrase again with one emphasized word that carries the key meaning.', tone: 'cyan' },
];

const sampleTranscript = 'Welcome to the overview of our quarterly results. As you can see on the first slide, the overall trajectory has been positive. However, there are some areas where we need to focus more attention. Let me walk you through the key highlights, and then I will take your questions at the end.';

const DEMO_DURATION = 72;

const navItems: { id: View; label: string; index: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', index: '01', icon: BarChart3 },
  { id: 'new', label: 'New analysis', index: '02', icon: Plus },
  { id: 'architecture', label: 'Architecture', index: '03', icon: Network },
  { id: 'practice', label: 'Practice Studio', index: '04', icon: Dumbbell },
  { id: 'recordings', label: 'Recordings', index: '05', icon: FileAudio },
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
  return <button className={`brand ${light ? 'brand-light' : ''}`} onClick={() => navigate('/')} aria-label="SpeechLab home"><span className="brand-mark"><AudioLines size={18} strokeWidth={2.5} /></span>Speech<span>Lab</span></button>;
}

function WaveField({ compact = false }: { compact?: boolean }) {
  return <div className={`wave-field ${compact ? 'wave-field-compact' : ''}`} aria-hidden="true">
    <div className="field-label">LIVE SIGNAL / 04:12</div>
    <svg viewBox="0 0 640 430" preserveAspectRatio="none">
      <path className="wave wave-back" d="M0 255 C65 205 82 304 142 260 S225 195 282 246 S369 329 432 251 S519 190 640 226" />
      <path className="wave wave-middle" d="M0 230 C74 172 100 290 155 236 S232 153 293 218 S374 316 438 222 S534 145 640 190" />
      <path className="wave wave-front" d="M0 277 C61 239 93 332 151 275 S235 212 292 269 S381 350 448 268 S550 224 640 260" />
      <path className="wave pulse" d="M0 243 L92 243 L111 190 L130 299 L149 227 L181 243 L263 243 L276 211 L291 276 L306 243 L390 243 L407 169 L425 304 L444 243 L520 243 L540 207 L554 281 L572 243 L640 243" />
      <line x1="88" x2="88" y1="70" y2="360" className="scan-line" />
      <line x1="410" x2="410" y1="70" y2="360" className="scan-line scan-line-two" />
    </svg>
    <div className="field-axis"><span>00:00</span><span>02:06</span><span>04:12</span></div>
  </div>;
}

type ArchitectureLayer = { id: string; index: string; name: string; short: string; purpose: string; inputs: string; outputs: string; dependency: string; status: 'implemented' | 'planned'; accent: 'acid' | 'cyan' | 'blue' | 'red' };

const architectureLayers: ArchitectureLayer[] = [
  { id: 'audio', index: '01', name: 'Audio input', short: 'Recording + transcript', purpose: 'Accepts the participant recording and the transcript used to define the evidence set.', inputs: 'WAV / MP3 / M4A, plain text', outputs: 'Private recording metadata, transcript', dependency: 'Supabase Auth + private storage boundary', status: 'implemented', accent: 'acid' },
  { id: 'alignment', index: '02', name: 'Speech alignment', short: 'Words → timestamps', purpose: 'Maps transcript words and phrases to audio time so findings can point to an exact region.', inputs: 'Audio + transcript', outputs: 'Word and phrase timestamps', dependency: 'WhisperX or MFA service boundary', status: 'planned', accent: 'cyan' },
  { id: 'features', index: '03', name: 'Acoustic features', short: 'Rate / pauses / pitch / energy', purpose: 'Extracts measurable time-series features without turning them into claims about confidence or emotion.', inputs: 'Validated audio', outputs: 'Rate, pause, F0, RMS measurements', dependency: 'Python audio-processing service', status: 'planned', accent: 'blue' },
  { id: 'contrastive', index: '04', name: 'Contrastive analysis', short: 'Participant ↔ reference', purpose: 'Compares compatible recordings using normalized windows and preserves the method used for the comparison.', inputs: 'Feature series + compatible reference', outputs: 'Feature deltas and comparable windows', dependency: 'Analysis pipeline v0.1', status: 'planned', accent: 'cyan' },
  { id: 'rubric', index: '05', name: 'Rubric + findings', short: 'Deviation → evidence', purpose: 'Applies versioned criteria and grounds a supported finding at a precise timestamp.', inputs: 'Measurements + rubric version', outputs: 'Timestamped findings and explanations', dependency: 'Rubric definitions in Supabase', status: 'implemented', accent: 'red' },
  { id: 'coaching', index: '06', name: 'Personalized coaching', short: 'Evidence → practice', purpose: 'Ranks supported findings against the user’s goals and practice preferences without changing the measurements.', inputs: 'Findings + profile + history', outputs: 'Prioritized recommendation and exercise', dependency: 'Practice plan + feedback tables', status: 'implemented', accent: 'acid' },
  { id: 'progress', index: '07', name: 'Storage + progress', short: 'Sessions over time', purpose: 'Keeps recordings, analyses, rubric versions, plans, activity status, and feedback in one private history.', inputs: 'Session artifacts and user actions', outputs: 'Comparable practice history', dependency: 'Supabase RLS data model', status: 'implemented', accent: 'blue' },
];

function ArchitectureExplorer({ embedded = false }: { embedded?: boolean }) {
  const [selectedId, setSelectedId] = useState('features');
  const [zoom, setZoom] = useState(1);
  const [tilt, setTilt] = useState({ x: -4, y: 7 });
  const [wireframe, setWireframe] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const selected = architectureLayers.find((layer) => layer.id === selectedId) || architectureLayers[0];
  const pinLayer = (id: string) => setPinned((items) => items.includes(id) ? items : [...items, id]);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => { dragStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => { if (!dragStart.current || paused) return; setTilt({ x: Math.max(-18, Math.min(18, -4 + (event.clientY - dragStart.current.y) * .08)), y: Math.max(-20, Math.min(20, 7 + (event.clientX - dragStart.current.x) * .08)) }); };
  const onPointerUp = () => { dragStart.current = null; };
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => { event.preventDefault(); setZoom((value) => Math.max(.72, Math.min(1.34, value - event.deltaY * .0007))); };
  const reset = () => { setZoom(1); setTilt({ x: -4, y: 7 }); setExploded(false); setWireframe(false); };
  const drop = (event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (architectureLayers.some((layer) => layer.id === id)) { pinLayer(id); setSelectedId(id); } };
  return <section className={`architecture-explorer ${embedded ? 'architecture-embedded' : ''}`}>
    <div className="architecture-heading"><div><div className="section-kicker">/ SYSTEM MAP / SPEECHLAB PIPELINE</div><h2>See how the signal<br /><span>moves through us.</span></h2><p>Every layer below reflects the planned or implemented product architecture. Select a block to inspect its contract.</p></div><div className="architecture-status"><span className="architecture-live-dot" /> {architectureLayers.filter((layer) => layer.status === 'implemented').length} IMPLEMENTED / {architectureLayers.filter((layer) => layer.status === 'planned').length} PLANNED</div></div>
    <div className="architecture-layout"><div className="architecture-stage-wrap"><div className="architecture-toolbar"><button onClick={reset}>RESET VIEW</button><button onClick={() => setWireframe((value) => !value)} className={wireframe ? 'active' : ''}>WIREFRAME</button><button onClick={() => setExploded((value) => !value)} className={exploded ? 'active' : ''}>EXPLODE</button><button onClick={() => setPaused((value) => !value)}>{paused ? 'RESUME FLOW' : 'PAUSE FLOW'}</button><span>DRAG TO ROTATE / SCROLL TO ZOOM</span></div><div className={`architecture-stage ${wireframe ? 'wireframe' : ''} ${paused ? 'paused' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel} onDragOver={(event) => event.preventDefault()} onDrop={drop} role="application" aria-label="Interactive SpeechLab architecture explorer"><div className="architecture-grid" /><div className="architecture-plane" style={{ transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoom})` }}><svg className="architecture-connections" viewBox="0 0 720 640" aria-hidden="true"><path d="M360 48 V594" />{architectureLayers.slice(0, -1).map((layer, index) => <circle key={layer.id} cx={index % 2 ? 465 : 255} cy={84 + index * 80} r="4" />)}</svg>{architectureLayers.map((layer, index) => { const left = index % 2 ? 52 : 18; const top = 4 + index * 13.4; return <button draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', layer.id)} key={layer.id} className={`architecture-node node-${layer.accent} ${selectedId === layer.id ? 'selected' : ''} ${pinned.includes(layer.id) ? 'pinned' : ''}`} style={{ left: `${left}%`, top: `${top}%`, transform: `translateZ(${exploded ? (index % 2 ? 42 : -30) : 0}px)` }} onClick={() => setSelectedId(layer.id)}><span className="node-index">{layer.index}</span><span><strong>{layer.name}</strong><small>{layer.short}</small></span><i className={`status-dot ${layer.status}`} /></button>; })}</div><div className="architecture-drop-hint">DROP A PIPELINE LAYER TO PIN ITS TRACE</div></div><div className="architecture-tokens"><span>TRACE TOKENS</span>{architectureLayers.filter((layer) => !pinned.includes(layer.id)).slice(0, 5).map((layer) => <button key={layer.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', layer.id)}><span className={`token-dot token-${layer.accent}`} />{layer.name}</button>)}</div></div><aside className="architecture-detail"><div className="detail-top"><span className="section-kicker">LAYER / {selected.index}</span><span className={`detail-status ${selected.status}`}>{selected.status}</span></div><h3>{selected.name}</h3><p className="detail-short">{selected.short}</p><div className="detail-block"><span>PURPOSE</span><p>{selected.purpose}</p></div><div className="detail-block"><span>INPUTS</span><p>{selected.inputs}</p></div><div className="detail-block"><span>OUTPUTS</span><p>{selected.outputs}</p></div><div className="detail-block"><span>BACKEND DEPENDENCY</span><p>{selected.dependency}</p></div><button className="detail-code" disabled><span>OPEN CODE</span><small>Integration surface not connected</small><ArrowRight size={15} /></button><div className="detail-legend"><span><i className="status-dot implemented" /> Implemented in prototype</span><span><i className="status-dot planned" /> Planned integration</span></div></aside></div>
  </section>;
}

function Button({ children, onClick, variant = 'outline', type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'outline' | 'acid' | 'quiet' | 'dark'; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} disabled={disabled} className={`btn btn-${variant}`} onClick={onClick}>{children}</button>;
}

function Landing() {
  const [activeStep, setActiveStep] = useState(1);
  const steps = [
    ['01', 'Record or upload', 'Bring a recording and transcript into one focused workspace.'],
    ['02', 'Compare delivery', 'Use a same-text reference or an explicit, versioned rubric.'],
    ['03', 'Find the moment', 'Jump from a measurable deviation to the exact audio region.'],
    ['04', 'Practise with intent', 'Return to the signal, not a vague score, and try again.'],
  ];
  return <div className="site-shell">
    <header className="site-header wrap"><Brand /><nav className="main-nav"><a href="#how">How it works</a><a href="#architecture">Architecture</a><a href="#features">Analysis features</a><a href="#research">Research approach</a></nav><div className="header-actions"><button className="text-link" onClick={() => navigate('/login')}>Sign in</button><Button variant="acid" onClick={() => navigate('/signup')}>Start analysing <ArrowRight size={15} /></Button></div><button className="mobile-menu" aria-label="Open menu"><Menu size={21} /></button></header>
    <main>
      <section className="hero wrap">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> CONTRASTIVE SPEECH ANALYTICS / 01</div><h1>Every pause tells a story.<br /><em>Every pattern has evidence.</em></h1><p className="hero-lede">Understand how you speak, where your delivery changes, and what you can improve. Explore speech through precise acoustic measurements and timestamp-grounded feedback.</p><div className="hero-actions"><Button variant="acid" onClick={() => navigate('/signup')}>Analyse your speech <ArrowDownRight size={17} /></Button><Button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>Explore the demo <Play size={15} /></Button></div><div className="trust-line"><ShieldCheck size={15} /> Evidence first. Interpretation second. <span>Private by default.</span></div></div>
        <div className="hero-visual"><div className="visual-note">SIGNAL STUDY / 001 <span>●</span></div><WaveField /><div className="visual-caption"><span>ACOUSTIC FIELD</span><span>REFERENCE / PARTICIPANT</span></div></div>
      </section>
      <section className="ticker"><div className="ticker-inner"><span>PAUSE INTERVALS</span><span>F0 CONTOUR</span><span>SPEECH RATE</span><span>RMS ENERGY</span><span>FORCED ALIGNMENT</span><span>TIMESTAMPED FINDINGS</span></div></section><div id="architecture"><ArchitectureExplorer embedded /></div>
      <section className="workflow wrap" id="how"><div className="section-kicker">/ THE WORKFLOW</div><div className="section-heading"><h2>A clearer path from <span>audio</span> to action.</h2><p>The interface is built around the moment something changes. Move through the signal without losing the human context.</p></div><div className="workflow-grid"><div className="step-list">{steps.map(([number, title, text], i) => <button key={number} className={`step-item ${activeStep === i ? 'is-active' : ''}`} onClick={() => setActiveStep(i)}><span className="step-number">{number}</span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={17} /></button>)}</div><div className="workflow-stage"><div className="stage-top"><span>SESSION / PRACTICE-01</span><span className="stage-status"><span /> ANALYSIS READY</span></div><WaveField compact /><div className="stage-finding"><div className="finding-marker">FINDING / 02</div><strong>{steps[activeStep][1]}</strong><p>{steps[activeStep][2]}</p><button onClick={() => navigate('/app')}><span>Open sample analysis</span><MoveUpRight size={15} /></button></div></div></div></section>
      <section className="feature-section" id="features"><div className="wrap"><div className="section-kicker">/ WHAT THE SIGNAL CAN SHOW</div><div className="feature-intro"><h2>Not a score.<br /><span>A traceable point of view.</span></h2><p>SpeechLab keeps observation and interpretation distinct, so every recommendation has a visible reason behind it.</p></div><div className="feature-list"><article><div className="feature-index">01 / COMPARE</div><div><h3>Contrastive analysis</h3><p>Compare two recordings of the same speech with normalized, speaker-agnostic feature traces.</p></div><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></article><article><div className="feature-index">02 / GROUND</div><div><h3>Temporal flaw grounding</h3><p>Locate measurable delivery patterns at specific timestamps, not somewhere in a summary.</p></div><div className="mini-timeline"><span /><span /><span className="hot" /><span /><span /></div></article><article><div className="feature-index">03 / MEASURE</div><div><h3>Acoustic evidence</h3><p>Inspect rate, pause duration, pitch movement, and energy when the method can estimate them reliably.</p></div><div className="feature-wave"><WaveField compact /></div></article><article><div className="feature-index">04 / PRACTISE</div><div><h3>Actionable feedback</h3><p>Understand what was measured, why it matters to the selected rubric, and what to try next.</p></div><div className="feature-quote">“What changed?” <ArrowRight size={16} /> “Where?”</div></article></div></div></section>
      <section className="research wrap" id="research"><div className="research-aside"><div className="section-kicker">/ RESEARCH NOTE</div><div className="research-stamp">R<br />0.1</div></div><div className="research-copy"><h2>Trust the boundary<br />between <span>signal</span> and story.</h2><p>Speech delivery metrics are not a complete evaluation of communication quality. A longer pause may be deliberate. A pitch shift is not proof of emotion. SpeechLab surfaces the measurement and the context so a person can decide what it means.</p><div className="principles"><div><Check size={16} /><span>Versioned rubrics</span></div><div><Check size={16} /><span>Reproducible processing</span></div><div><Check size={16} /><span>No invented findings</span></div><div><Check size={16} /><span>Private recordings</span></div></div></div></section>
      <section className="final-cta wrap"><div><div className="section-kicker">/ START WITH ONE RECORDING</div><h2>Make the invisible<br /><span>audible.</span></h2></div><Button variant="acid" onClick={() => navigate('/signup')}>Start analysing <ArrowRight size={16} /></Button></section>
    </main>
    <footer className="site-footer wrap"><Brand /><span>CONTRASTIVE SPEECH ANALYTICS / 2026</span><div><a href="#research">Privacy</a><a href="#research">Research notes</a><a href="#how">Documentation</a></div></footer>
  </div>;
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (!email || !password || (isSignup && !name)) { setError('Complete every required field to continue.'); return; }
    setLoading(true);
    if (!supabase) { setError('Authentication is not connected in this preview. Add the project connection to enable account access.'); setLoading(false); return; }
    const result = isSignup ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } }) : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
  };
  return <div className="auth-shell"><div className="auth-visual"><div className="auth-top"><Brand light /><span>PRIVATE WORKSPACE / {isSignup ? 'CREATE' : 'ACCESS'}</span></div><div className="auth-visual-content"><div className="eyebrow"><span className="eyebrow-dot" /> SPEECHLAB / SIGNAL ROOM</div><h1>Make your<br /><em>delivery visible.</em></h1><WaveField /><p>Precise observations for people who want to practise with more intention.</p></div><div className="auth-bottom">ENGLISH / MVP-0.1 <span>DATA STAYS YOURS</span></div></div><div className="auth-form-side"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={15} /> Back to SpeechLab</button><div className="auth-form-wrap"><div className="section-kicker">/ {isSignup ? 'NEW PRACTICE SPACE' : 'RETURNING SPEAKER'}</div><h2>{isSignup ? 'Start with a signal.' : 'Welcome back.'}</h2><p>{isSignup ? 'Create a private workspace for your speech practice.' : 'Continue where your last analysis left off.'}</p><form onSubmit={submit}>{isSignup && <label>NAME<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>}<label>EMAIL<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>PASSWORD<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>{!isSignup && <div className="form-row"><label className="check-label"><input type="checkbox" /> <span>Remember session</span></label><button className="form-link" type="button">Forgot password?</button></div>}{error && <div className="form-error"><X size={15} /> {error}</div>}<Button type="submit" variant="acid" disabled={loading}>{loading ? 'Connecting…' : isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></Button></form><div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to SpeechLab?'} <button onClick={() => navigate(isSignup ? '/login' : '/signup')}>{isSignup ? 'Sign in' : 'Create account'}</button></div><div className="auth-note"><LockKeyhole size={14} /> Your recordings are private by default. SpeechLab does not use them for model training without separate consent.</div></div></div></div>;
}

const demoProfile: UserProfile = {
  id: 'demo', display_name: 'Demo speaker', onboarding_completed: true, primary_goal: 'Clearer pacing in academic presentations', selected_contexts: ['Classroom or university'], experience_level: 'I can speak, but I want to improve.', coaching_priorities: ['Speaking at an appropriate pace', 'Managing pauses and phrasing'], feedback_style: 'A balance of explanations and practical exercises', detail_level: 'Give me a few prioritized recommendations.', practice_frequency: 'A few times per week', upcoming_event_date: null, personal_goal: null,
};
const demoPlan: PracticePlan = { id: 'demo-plan', title: 'Build a steadier presentation rhythm', goal: 'Clearer pacing in academic presentations', status: 'active', activities: [{ id: 'demo-activity', title: 'Record a short baseline passage', instructions: 'Choose 60–90 seconds of a prepared presentation and keep the transcript nearby.', estimated_minutes: 5, status: 'pending', position: 1 }, { id: 'demo-activity-2', title: 'Review pause placement', instructions: 'Listen once without changing anything. Mark one pause that helps meaning and one that interrupts the phrase.', estimated_minutes: 7, status: 'pending', position: 2 }] };

const onboardingSteps = [
  { label: 'Purpose', title: 'What would you like to improve through SpeechLab?', options: ['College presentations and academic speaking', 'Job interviews and professional communication', 'Public speaking and conference presentations', 'Debates and structured arguments', 'Storytelling and expressive delivery', 'Everyday spoken communication', 'English-speaking practice', 'Other'] },
  { label: 'Context', title: 'Where do you expect to use these skills most often?', options: ['Classroom or university', 'Interviews or workplace meetings', 'Large audiences or conferences', 'Online presentations or video calls', 'Informal conversations', 'Competitions or evaluated speeches', 'Other'] },
  { label: 'Priorities', title: 'Which aspects of your delivery would you most like to work on?', options: ['Speaking at an appropriate pace', 'Managing pauses and phrasing', 'Using pitch variation and emphasis', 'Improving the audibility and consistency of delivery', 'Making important phrases easier to follow', 'Matching a reference delivery', 'Understanding my speech patterns', 'Tracking progress across attempts'] },
  { label: 'Feedback', title: 'How would you prefer to receive feedback?', options: ['Short, direct recommendations', 'Step-by-step explanations', 'Detailed acoustic evidence and measurements', 'A balance of explanations and practical exercises'] },
  { label: 'Routine', title: 'How often would you realistically like to practise?', options: ['A few minutes when I have time', 'A few times per week', 'Daily short sessions', 'I am preparing for a specific event'] },
];

type OnboardingDraft = { purpose: string[]; personalGoal: string; contexts: string[]; experience: string; priorities: string[]; feedbackStyle: string; detailLevel: string; frequency: string; eventDate: string };

function Onboarding({ displayName, onComplete }: { displayName: string; onComplete: (profile: UserProfile, plan: PracticePlan) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({ purpose: [], personalGoal: '', contexts: [], experience: '', priorities: [], feedbackStyle: '', detailLevel: 'Give me a few prioritized recommendations.', frequency: '', eventDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = onboardingSteps[step];
  const selected = step === 0 ? draft.purpose : step === 1 ? draft.contexts : step === 2 ? draft.priorities : step === 3 ? [draft.feedbackStyle] : [draft.frequency];
  const toggle = (option: string) => {
    if (step === 3) { setDraft((value) => ({ ...value, feedbackStyle: option })); return; }
    if (step === 4) { setDraft((value) => ({ ...value, frequency: option })); return; }
    const key = step === 0 ? 'purpose' : step === 1 ? 'contexts' : 'priorities';
    setDraft((value) => { const values = value[key]; const next = values.includes(option) ? values.filter((item) => item !== option) : [...values, option]; return { ...value, [key]: next }; });
  };
  const continueStep = () => { if (step < onboardingSteps.length - 1) { setStep((value) => value + 1); return; } void saveProfile(); };
  const saveProfile = async () => {
    setSaving(true); setError('');
    const primaryGoal = draft.purpose[0] || 'Understand my speech patterns';
    const profile: UserProfile = { id: supabase ? (await supabase.auth.getUser()).data.user?.id || 'unknown' : 'demo', display_name: displayName || 'SpeechLab speaker', onboarding_completed: true, primary_goal: primaryGoal, selected_contexts: draft.contexts, experience_level: draft.experience || 'I can speak, but I want to improve.', coaching_priorities: draft.priorities, feedback_style: draft.feedbackStyle || 'A balance of explanations and practical exercises', detail_level: draft.detailLevel, practice_frequency: draft.frequency || 'A few times per week', upcoming_event_date: draft.eventDate || null, personal_goal: draft.personalGoal || null };
    const plan: PracticePlan = { id: 'new-plan', title: `Practice plan / ${primaryGoal.toLowerCase()}`, goal: primaryGoal, status: 'active', activities: [{ id: 'activity-1', title: 'Record a short baseline passage', instructions: 'Choose 60–90 seconds that match your context. Your first recording establishes a baseline; it does not define your ability.', estimated_minutes: 5, status: 'pending', position: 1 }, { id: 'activity-2', title: 'Review one measurable pattern', instructions: 'Open the timestamped evidence and choose one supported observation to practise without changing the rest of your delivery.', estimated_minutes: 8, status: 'pending', position: 2 }, { id: 'activity-3', title: 'Record the same passage again', instructions: 'Keep the passage and rubric consistent so the next comparison remains meaningful.', estimated_minutes: 5, status: 'pending', position: 3 }] };
    if (supabase) {
      const { error: profileError } = await supabase.from('user_profiles').upsert({ id: profile.id, display_name: profile.display_name, onboarding_completed: true, primary_goal: profile.primary_goal, selected_contexts: profile.selected_contexts, experience_level: profile.experience_level, coaching_priorities: profile.coaching_priorities, feedback_style: profile.feedback_style, detail_level: profile.detail_level, practice_frequency: profile.practice_frequency, upcoming_event_date: profile.upcoming_event_date, personal_goal: profile.personal_goal, updated_at: new Date().toISOString() });
      if (profileError) { console.error('profile save failed', profileError); setError('We could not save your practice preferences. Please try again.'); setSaving(false); return; }
      const { data: savedPlan, error: planError } = await supabase.from('practice_plans').insert({ title: plan.title, goal: plan.goal, associated_preferences: { contexts: profile.selected_contexts, priorities: profile.coaching_priorities, frequency: profile.practice_frequency }, plan_version: '1.0' }).select('id, title, goal, status').maybeSingle();
      if (planError || !savedPlan) { console.error('practice plan save failed', planError); setError('Your preferences were saved, but the practice plan could not be created.'); setSaving(false); return; }
      const { data: savedActivities, error: activityError } = await supabase.from('practice_activities').insert(plan.activities.map((activity) => ({ plan_id: savedPlan.id, position: activity.position, title: activity.title, instructions: activity.instructions, targeted_features: profile.coaching_priorities, estimated_minutes: activity.estimated_minutes }))).select('id, title, instructions, estimated_minutes, status, position');
      if (activityError) { console.error('practice activities save failed', activityError); setError('Your plan was created, but its activities could not be saved.'); setSaving(false); return; }
      onComplete(profile, { ...savedPlan, activities: savedActivities || [] });
    } else { onComplete(profile, plan); }
    setSaving(false);
  };
  return <div className="onboarding-shell"><div className="onboarding-rail"><Brand light /><div className="onboarding-rail-copy"><div className="section-kicker">/ BUILD YOUR PRACTICE SPACE</div><h1>Understand.<br /><span>Measure.</span><br />Practise.</h1><p>Your preferences help prioritize relevant coaching. Your measurements will always come from your recordings and the methods used.</p></div><div className="onboarding-rail-foot">PRIVATE BY DEFAULT / ENGLISH / 0{step + 1} OF 0{onboardingSteps.length}</div></div><main className="onboarding-main"><div className="onboarding-progress"><span>SETUP / {current.label.toUpperCase()}</span><div>{onboardingSteps.map((item, index) => <i key={item.label} className={index <= step ? 'active' : ''} />)}</div></div><div className="onboarding-question"><div className="section-kicker">STEP 0{step + 1} / {current.label.toUpperCase()}</div><h2>{current.title}</h2><p>{step === 0 ? 'This helps us frame your first practice plan without assuming what you need.' : step === 1 ? 'Different contexts call for different practice conditions.' : step === 2 ? 'These are priorities, not diagnoses. We will look for supporting evidence first.' : step === 3 ? 'You can always expand into the technical evidence later.' : 'Choose a rhythm that feels realistic, not aspirational.'}</p><div className="onboarding-options">{current.options.map((option) => <button key={option} className={selected.includes(option) ? 'selected' : ''} onClick={() => toggle(option)}><span>{selected.includes(option) ? <Check size={14} /> : ''}</span>{option}</button>)}</div>{step === 0 && <label className="onboarding-text">OPTIONAL / WHAT WOULD A SUCCESSFUL IMPROVEMENT LOOK LIKE?<textarea value={draft.personalGoal} onChange={(event) => setDraft((value) => ({ ...value, personalGoal: event.target.value }))} placeholder="I want to explain technical concepts clearly without rushing…" /></label>}{step === 1 && <label className="onboarding-text">OPTIONAL / EXPERIENCE LEVEL<input value={draft.experience} onChange={(event) => setDraft((value) => ({ ...value, experience: event.target.value }))} placeholder="e.g. I speak regularly and want more precise feedback" /></label>}{step === 3 && <label className="onboarding-text">DETAIL LEVEL<select value={draft.detailLevel} onChange={(event) => setDraft((value) => ({ ...value, detailLevel: event.target.value }))}><option>Give me the most important one or two improvements.</option><option>Give me a few prioritized recommendations.</option><option>Show me the complete analysis with technical details.</option></select></label>}{step === 4 && <label className="onboarding-text">OPTIONAL / UPCOMING EVENT DATE<input type="date" value={draft.eventDate} onChange={(event) => setDraft((value) => ({ ...value, eventDate: event.target.value }))} /></label>}{error && <div className="form-error"><X size={15} /> {error}</div>}<div className="onboarding-actions"><Button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Back</Button><Button variant="acid" onClick={continueStep} disabled={saving}>{saving ? 'Building plan…' : step === onboardingSteps.length - 1 ? 'Build my practice plan' : 'Continue'} <ArrowRight size={16} /></Button></div></div></main></div>;
}

function Sidebar({ view, setView, onSignOut, profile }: { view: View; setView: (view: View) => void; onSignOut: () => void; profile: UserProfile }) {
  return <aside className="app-sidebar"><Brand light /><div className="rail-caption">WORKSPACE</div><nav className="app-nav">{navItems.map(({ id, label, index, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><span className="nav-index">{index}</span><Icon size={16} /><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><button className="help-link"><CircleHelp size={16} /> Research notes</button><div className="account"><div className="avatar">{profile.display_name.slice(0, 2).toUpperCase()}</div><div><strong>{profile.display_name || 'SpeechLab speaker'}</strong><small>{profile.primary_goal || 'Practice workspace'}</small></div><ChevronDown size={15} /></div><button className="exit-link" onClick={onSignOut}><LogOut size={14} /> Log out</button></div></aside>;
}

function AppHeader({ view, setView }: { view: View; setView: (view: View) => void }) {
  const label = navItems.find((item) => item.id === view)?.label ?? 'Overview';
  return <header className="app-header"><div><span className="app-breadcrumb">SPEECHLAB / WORKSPACE /</span><h1>{view === 'architecture' ? 'Architecture explorer' : label}</h1></div><div className="app-header-actions"><div className="system-status"><span /> ANALYSIS SERVICE / DEMO MODE</div><Button variant="acid" onClick={() => setView('new')}><Plus size={16} /> New analysis</Button></div></header>;
}

function Overview({ setView, profile, plan, onCompleteActivity }: { setView: (view: View) => void; profile: UserProfile; plan: PracticePlan; onCompleteActivity: (activityId: string) => void }) {
  const nextActivity = plan.activities.find((activity) => activity.status !== 'completed');
  const priorities = profile.coaching_priorities.slice(0, 2).join(' / ') || 'Evidence-grounded delivery practice';
  return <div className="overview-content"><section className="welcome-row"><div><div className="section-kicker">/ YOUR PRACTICE SPACE</div><h2>Focus: <span>{profile.primary_goal || 'understanding your speech patterns'}</span></h2><p>{profile.personal_goal || `Your coaching priorities: ${priorities}. Start with a recording so SpeechLab can establish a baseline without making assumptions.`}</p><Button variant="acid" onClick={() => setView('new')}>Begin new analysis <ArrowRight size={16} /></Button></div><div className="overview-signal"><WaveField compact /><div><span>{profile.practice_frequency?.toUpperCase() || 'PRACTICE WHEN READY'}</span><strong>{plan.activities.length} step plan</strong></div></div></section><section className="plan-panel"><div className="plan-heading"><div><div className="section-kicker">/ ACTIVE PRACTICE PLAN</div><h3>{plan.title}</h3><p>Built from your preferences. Measurements remain independent from your experience level or goals.</p></div><span className="plan-status">● ACTIVE / V{plan.id === 'demo-plan' ? 'DEMO' : '1.0'}</span></div><div className="activity-list">{plan.activities.map((activity) => <div className={`activity-row ${activity.id === nextActivity?.id ? 'next' : ''}`} key={activity.id}><span className="activity-index">0{activity.position}</span><div><strong>{activity.title}</strong><small>{activity.instructions}</small></div><span className="activity-duration">{activity.estimated_minutes} MIN</span></div>)}</div></section><section className="empty-workspace"><div className="empty-number">01</div><div className="empty-copy"><div className="section-kicker">/ NEXT STEP</div><h3>{nextActivity?.title || 'Your plan is ready for a reassessment.'}</h3><p>{nextActivity?.instructions || 'Create another comparable recording when you are ready to inspect a supported change.'}</p><div className="activity-actions"><button onClick={() => setView('new')}>Open next activity <ArrowRight size={15} /></button>{nextActivity && <button onClick={() => onCompleteActivity(nextActivity.id)}>Mark complete <Check size={15} /></button>}</div></div><div className="empty-side"><span className="empty-icon"><Mic2 size={21} /></span><span>NO CLAIMS WITHOUT EVIDENCE</span></div></section><section className="demo-callout"><div><span className="eyebrow-dot" /><span className="section-kicker">/ EXPLORE BEFORE YOU UPLOAD</span><h3>See how a grounded finding works.</h3><p>This clearly labelled sample uses illustrative measurements to demonstrate the interaction model.</p></div><button onClick={() => setView('results')}>Open sample analysis <MoveUpRight size={15} /></button></section></div>;
}

function UploadPanel({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  const inputChange = (event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0] ?? null);
  return <div className="upload-box">{file ? <div className="uploaded-file"><div className="file-icon"><FileAudio size={22} /></div><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB / ready for validation</span></div><button onClick={() => onFile(null)} aria-label="Remove file"><X size={17} /></button></div> : <label className="upload-empty"><input type="file" accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a" onChange={inputChange} /><Upload size={22} /><strong>Drop audio here or browse</strong><span>WAV, MP3, or M4A / private by default</span></label>}</div>;
}

function NewAnalysis({ setView }: { setView: (view: View) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('reference');
  const [started, setStarted] = useState(false);
  const start = () => { if (file && transcript.trim()) setStarted(true); };
  return <div className="new-analysis-content"><div className="analysis-intro"><div><div className="section-kicker">/ BUILD YOUR EVIDENCE SET</div><h2>One recording.<br /><span>Clearer questions.</span></h2><p>Keep the inputs explicit. Real processing begins only when the analysis service is connected.</p></div><div className="pipeline-label"><span className="pipeline-dot" /> PIPELINE / {started ? 'QUEUED' : 'WAITING FOR INPUT'}</div></div><div className="analysis-grid"><div className="analysis-main"><div className="workflow-block"><div className="block-heading"><span>01</span><div><h3>Upload participant audio</h3><p>The recording you want to understand.</p></div></div><UploadPanel file={file} onFile={setFile} /></div><div className="workflow-block"><div className="block-heading"><span>02</span><div><h3>Review the transcript</h3><p>Paste the exact text when you already have it.</p></div></div><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste or type the transcript for this recording…" /><div className="field-meta"><span>{transcript.length} characters</span><span><FileText size={13} /> Plain text only</span></div></div><div className="workflow-block"><div className="block-heading"><span>03</span><div><h3>Choose your comparison</h3><p>Two honest ways to read the same signal.</p></div></div><div className="mode-switch"><button className={mode === 'reference' ? 'selected' : ''} onClick={() => setMode('reference')}><Radio size={18} /><span><strong>Reference comparison</strong><small>Compare against the same speech.</small></span><span className="mode-check">{mode === 'reference' && <Check size={14} />}</span></button><button className={mode === 'rubric' ? 'selected' : ''} onClick={() => setMode('rubric')}><Target size={18} /><span><strong>Rubric-based analysis</strong><small>Evaluate against delivery criteria.</small></span><span className="mode-check">{mode === 'rubric' && <Check size={14} />}</span></button></div>{mode === 'reference' ? <div className="reference-note"><ArrowRight size={15} /> Reference upload becomes available after the participant recording is validated.</div> : <div className="rubric-select"><span>SELECT RUBRIC</span><strong>Speech delivery / English / v1.0</strong><ChevronDown size={16} /></div>}</div></div><aside className="analysis-aside"><div className="aside-heading"><span>SESSION CHECK</span><SlidersHorizontal size={16} /></div><div className={`check-row ${file ? 'done' : ''}`}><span>{file ? <Check size={14} /> : '01'}</span><div><strong>Audio attached</strong><small>{file ? 'Ready for metadata extraction' : 'Waiting for a recording'}</small></div></div><div className={`check-row ${transcript.trim() ? 'done' : ''}`}><span>{transcript.trim() ? <Check size={14} /> : '02'}</span><div><strong>Transcript provided</strong><small>{transcript.trim() ? 'Ready for alignment' : 'Needed for speech rate'}</small></div></div><div className="aside-divider" /><div className="honest-note"><ShieldCheck size={17} /><div><strong>What happens next?</strong><p>Audio validation, alignment, feature extraction, then findings. No score is created when a required measurement is missing.</p></div></div><Button variant="acid" onClick={start} disabled={!file || !transcript.trim()}>{started ? 'Analysis queued' : 'Start analysis'} <ArrowRight size={16} /></Button>{started && <div className="queued-note"><Clock3 size={15} /> Demo mode: the analysis service is not configured, so no fabricated result was created.</div>}<button className="cancel-link" onClick={() => setView('overview')}>Save and return to overview</button></aside></div></div>;
}

function formatTime(seconds: number): string { const m = Math.floor(seconds / 60); const s = (seconds % 60).toFixed(1); return `${String(m).padStart(2, '0')}:${s.padStart(4, '0')}`; }

function SynchronizedWaveform({ currentTime, playing, onScrub, selected, setSelected }: { currentTime: number; playing: boolean; onScrub: (time: number) => void; selected: number; setSelected: (index: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeFeature, setActiveFeature] = useState<'rate' | 'pitch' | 'energy'>('rate');
  const [dragging, setDragging] = useState(false);
  const progressPct = (currentTime / DEMO_DURATION) * 100;
  const handleScrub = (clientX: number) => { if (!trackRef.current) return; const rect = trackRef.current.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)); onScrub(pct * DEMO_DURATION); };
  const onPointerDownScrub = (event: React.PointerEvent<HTMLDivElement>) => { setDragging(true); handleScrub(event.clientX); event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMoveScrub = (event: React.PointerEvent<HTMLDivElement>) => { if (!dragging) return; handleScrub(event.clientX); };
  const onPointerUpScrub = () => setDragging(false);
  const featurePaths: Record<string, string> = { rate: 'M0 70 C60 65 80 40 120 55 S180 90 220 50 S280 30 320 60 S380 95 420 45 S480 20 520 55 S580 85 640 40 S700 50 740 30', pitch: 'M0 55 C40 30 70 80 110 45 S170 20 210 60 S270 90 310 35 S370 15 410 50 S470 85 510 40 S570 25 610 55 S680 75 740 35', energy: 'M0 60 C50 50 80 75 130 55 S190 35 240 65 S300 80 350 50 S410 25 460 60 S520 85 570 45 S630 40 680 60 S730 55 740 50' };
  return <div className="result-visual"><div className="feature-tabs"><button className={activeFeature === 'rate' ? 'active' : ''} onClick={() => setActiveFeature('rate')}>Speech rate</button><button className={activeFeature === 'pitch' ? 'active' : ''} onClick={() => setActiveFeature('pitch')}>Pitch contour</button><button className={activeFeature === 'energy' ? 'active' : ''} onClick={() => setActiveFeature('energy')}>Energy</button></div><div className="feature-plot"><div className="plot-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 740 110" preserveAspectRatio="none"><path d={featurePaths[activeFeature]} /></svg><div className="plot-labels"><span>00:00</span><span>00:30</span><span>01:00</span><span>01:12</span></div></div><div className="waveform-track" ref={trackRef} onPointerDown={onPointerDownScrub} onPointerMove={onPointerMoveScrub} onPointerUp={onPointerUpScrub} onPointerLeave={onPointerUpScrub} role="slider" aria-label="Audio timeline" aria-valuenow={Math.round(currentTime)} aria-valuemin={0} aria-valuemax={DEMO_DURATION} tabIndex={0} onKeyDown={(e) => { if (e.key === 'ArrowLeft') onScrub(Math.max(0, currentTime - 2)); if (e.key === 'ArrowRight') onScrub(Math.min(DEMO_DURATION, currentTime + 2)); }}><div className="waveform-bars">{Array.from({ length: 96 }, (_, i) => { const seed = Math.sin(i * 0.31) * Math.cos(i * 0.17); const heightPct = 28 + Math.abs(seed) * 65 + (i % 7 === 0 ? 10 : 0); const barPct = (i / 96) * 100; const isPast = barPct < progressPct; const inFinding = sampleFindings.some((f) => currentTime >= f.start && currentTime <= f.end); return <i key={i} className={isPast ? 'past' : ''} style={{ height: `${heightPct}%` }} data-in-finding={inFinding} />; })}</div><div className="waveform-progress" style={{ width: `${progressPct}%` }} /><div className="waveform-playhead" style={{ left: `${progressPct}%` }}><span className="playhead-time">{formatTime(currentTime)}</span></div>{sampleFindings.map((item, i) => { const leftPct = (item.start / DEMO_DURATION) * 100; const widthPct = ((item.end - item.start) / DEMO_DURATION) * 100; return <button key={item.title} className={`waveform-finding ${i === selected ? 'selected' : ''} marker-${item.tone}`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }} onClick={(e) => { e.stopPropagation(); setSelected(i); onScrub(item.start); }} aria-label={`Finding ${i + 1}: ${item.title} at ${item.time}`}><span className="finding-num">{i + 1}</span></button>; })}</div><div className="waveform-controls"><button onClick={() => onScrub(Math.max(0, currentTime - 5))} disabled={currentTime <= 0}><ArrowLeft size={15} /> −5s</button><button className="waveform-play-btn" onClick={() => { const next = playing ? currentTime : currentTime; onScrub(next); }}><span className={`play-state ${playing ? 'playing' : ''}`} /> {playing ? 'Playing' : 'Play'} </button><button onClick={() => onScrub(Math.min(DEMO_DURATION, currentTime + 5))} disabled={currentTime >= DEMO_DURATION}>+5s <ArrowRight size={15} /></button><span className="waveform-time-display">{formatTime(currentTime)} / {formatTime(DEMO_DURATION)}</span></div></div>;
}

function ExportPanel({ findings, transcript }: { findings: Finding[]; transcript: string }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'txt' | 'csv'>('json');
  const [connected, setConnected] = useState(false);
  const buildExport = (format: 'json' | 'txt' | 'csv'): string => {
    const timestamp = new Date().toISOString();
    if (format === 'json') return JSON.stringify({ exported_at: timestamp, pipeline: 'demo', rubric: 'Speech delivery / English / v1.0', findings: findings.map((f, i) => ({ index: i + 1, title: f.title, category: f.category, time_range: f.time, start_s: f.start, end_s: f.end, observed: f.observed, detail: f.detail, exercise: f.exercise })), transcript }, null, 2);
    if (format === 'csv') return ['index,title,category,start_s,end_s,observed,detail'].concat(findings.map((f, i) => `${i + 1},"${f.title}","${f.category}",${f.start},${f.end},"${f.observed}","${f.detail.replace(/"/g, '""')}"`)).join('\n');
    const lines = [`SpeechLab Analysis Export / ${timestamp}`, 'Pipeline: DEMO / Rubric: Speech delivery v1.0', '--- FINDINGS ---'];
    findings.forEach((f, i) => { lines.push(`[${i + 1}] ${f.title} (${f.category})`, `  Time: ${f.time}`, `  Observed: ${f.observed}`, `  Detail: ${f.detail}`, `  Try: ${f.exercise}`, ''); });
    lines.push('--- TRANSCRIPT ---', transcript);
    return lines.join('\n');
  };
  const downloadFile = (content: string, filename: string, mime: string) => { const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
  const handleDownload = () => { setExportError(''); const content = buildExport(exportFormat); downloadFile(content, `speechlab-analysis-${Date.now()}.${exportFormat}`, exportFormat === 'json' ? 'application/json' : exportFormat === 'csv' ? 'text/csv' : 'text/plain'); };
  const handleGoogleDrive = async () => { setExporting(true); setExportError(''); const content = buildExport('json'); const blob = new Blob([content], { type: 'application/json' }); const file = new File([blob], `speechlab-analysis-${Date.now()}.json`, { type: 'application/json' }); try { const w = window as unknown as { __googleDrivePicker?: (file: File) => Promise<void> }; if (w.__googleDrivePicker) { await w.__googleDrivePicker(file); setConnected(true); } else { downloadFile(content, file.name, 'application/json'); setExportError('Google Drive is not connected yet. Your file was downloaded instead — connect Drive in Settings to send exports directly.'); } } catch { setExportError('Export to Google Drive failed. Your file was not uploaded.'); } finally { setExporting(false); } };
  return <div className="export-panel"><div className="export-header"><div><div className="section-kicker">/ EXPORT ANALYSIS</div><h3>Save your evidence</h3></div><FolderOutput size={20} /></div><p>Export findings and transcript to keep records of your progress outside SpeechLab.</p><div className="export-formats"><button className={exportFormat === 'json' ? 'active' : ''} onClick={() => setExportFormat('json')}>JSON</button><button className={exportFormat === 'csv' ? 'active' : ''} onClick={() => setExportFormat('csv')}>CSV</button><button className={exportFormat === 'txt' ? 'active' : ''} onClick={() => setExportFormat('txt')}>TXT</button></div><div className="export-actions"><Button variant="acid" onClick={handleDownload}><Download size={15} /> Download {exportFormat.toUpperCase()}</Button><Button onClick={handleGoogleDrive} disabled={exporting}><FolderOutput size={15} /> {exporting ? 'Uploading…' : connected ? 'Re-send to Drive' : 'Send to Google Drive'}</Button></div>{exportError && <div className="export-note"><ShieldCheck size={14} /> {exportError}</div>}<div className="export-disclaimer"><span className="eyebrow-dot" /> Illustrative sample data — no real audio was processed.</div></div>;
}

function ResultsDemo({ profile }: { profile: UserProfile | null }) {
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const lastTickRef = useRef<number>(0);
  useEffect(() => {
    if (!playing) return;
    lastTickRef.current = performance.now();
    const tick = (now: number) => { const delta = (now - lastTickRef.current) / 1000; lastTickRef.current = now; setCurrentTime((prev) => { const next = prev + delta; if (next >= DEMO_DURATION) { setPlaying(false); return DEMO_DURATION; } const inFinding = sampleFindings.some((f) => next >= f.start && next <= f.end); if (inFinding) { const f = sampleFindings.find((fnd) => next >= fnd.start && next <= fnd.end); if (f && sampleFindings.indexOf(f) !== selected) setSelected(sampleFindings.indexOf(f)); } return next; }); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, selected]);
  const togglePlay = () => { if (currentTime >= DEMO_DURATION) { setCurrentTime(0); setPlaying(true); } else { setPlaying((p) => !p); } };
  const scrubTo = (time: number) => { setCurrentTime(time); const inFinding = sampleFindings.some((f) => time >= f.start && time <= f.end); if (inFinding) { const f = sampleFindings.find((fnd) => time >= fnd.start && time <= fnd.end); if (f) setSelected(sampleFindings.indexOf(f)); } };
  const finding = sampleFindings[selected];
  return <div className="results-demo"><div className="demo-result-header"><div><div className="section-kicker">/ SAMPLE ANALYSIS / ILLUSTRATIVE DATA</div><h2>Practice speech / first pass</h2></div><button onClick={togglePlay} className="play-button">{playing ? <Pause size={18} /> : <Play size={18} />} {playing ? 'Pause sample' : 'Play sample'}</button></div><div className="score-strip"><div><span>RUBRIC SCORE</span><strong>—</strong><small>Unavailable in demo data</small></div><div><span>DETECTED REGIONS</span><strong>03</strong><small>Illustrative findings</small></div><div><span>PIPELINE</span><strong>DEMO</strong><small>No real audio processed</small></div></div><SynchronizedWaveform currentTime={currentTime} playing={playing} onScrub={scrubTo} selected={selected} setSelected={setSelected} /><div className="results-body"><div className="finding-detail"><div className="detail-header-row"><div><div className={`finding-badge badge-${finding.tone}`}>{finding.category}</div><h3>{finding.title}</h3><div className="finding-time"><Clock3 size={14} /> {finding.time}</div></div><div className="finding-measure"><span>OBSERVED MEASUREMENT</span><strong>{finding.observed}</strong><small>Illustrative sample value</small></div></div><EvidenceInspector finding={finding} profile={profile} /><button className="replay-button" onClick={() => { scrubTo(finding.start); setPlaying(true); }}><Headphones size={16} /> Replay region</button></div><div className="results-side"><div className="transcript-panel"><div className="transcript-header"><span>TRANSCRIPT</span><small>{sampleTranscript.length} chars</small></div><p className="transcript-text">{sampleTranscript}</p></div><ExportPanel findings={sampleFindings} transcript={sampleTranscript} /></div></div></div>;
}

function Workspace({ onSignOut, profile, plan, onProfileComplete }: { onSignOut: () => void; profile: UserProfile | null; plan: PracticePlan | null; onProfileComplete: (profile: UserProfile, plan: PracticePlan) => void }) {
  const [view, setView] = useState<View>('overview');
  const [currentPlan, setCurrentPlan] = useState<PracticePlan | null>(plan);
  if (!profile || !profile.onboarding_completed) return <Onboarding displayName={profile?.display_name || 'SpeechLab speaker'} onComplete={(nextProfile, nextPlan) => { setCurrentPlan(nextPlan); onProfileComplete(nextProfile, nextPlan); }} />;
  const activePlan = currentPlan || plan || demoPlan;
  const completeActivity = async (activityId: string) => {
    setCurrentPlan({ ...activePlan, activities: activePlan.activities.map((activity) => activity.id === activityId ? { ...activity, status: 'completed' } : activity) });
    if (supabase && activityId !== 'demo-activity') {
      const { error } = await supabase.from('practice_activities').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', activityId);
      if (error) console.error('activity update failed', error);
    }
  };
  const handleProfileUpdate = (updates: Partial<UserProfile>) => { onProfileComplete({ ...profile, ...updates }, activePlan); };
  const content = view === 'overview' ? <Overview setView={setView} profile={profile} plan={activePlan} onCompleteActivity={completeActivity} /> : view === 'new' ? <NewAnalysis setView={setView} /> : view === 'results' ? <ResultsDemo profile={profile} /> : view === 'architecture' ? <ArchitectureExplorer /> : view === 'practice' ? <PracticeStudio profile={profile} plan={activePlan} onCompleteActivity={completeActivity} /> : view === 'rubrics' ? <RubricTemplates /> : view === 'compare' ? <Compare setView={setView} /> : view === 'settings' ? <SettingsView profile={profile} onProfileUpdate={handleProfileUpdate} onSignOut={onSignOut} /> : <Recordings setView={setView} />;
  return <div className="app-shell"><Sidebar view={view} setView={setView} onSignOut={onSignOut} profile={profile} /><main className="app-main"><AppHeader view={view} setView={setView} />{content}</main></div>;
}

function EvidenceInspector({ finding, profile }: { finding: Finding; profile: UserProfile | null }) {
  const [showTechnical, setShowTechnical] = useState(false);
  const isBeginner = profile?.experience_level === 'I am just getting started.';
  return <div className="evidence-inspector"><div className="evidence-sections"><div className="evidence-section"><div className="evidence-label"><Lightbulb size={14} /> OBSERVATION</div><p>{finding.detail}</p></div><div className="evidence-section"><div className="evidence-label"><BarChart3 size={14} /> MEASUREMENT</div><p className="evidence-measure-text">{finding.observed}</p><small className="evidence-time-range">Time range: {finding.time}</small></div><div className="evidence-section"><div className="evidence-label"><FlaskConical size={14} /> INTERPRETATION</div><p>{finding.detail}</p>{isBeginner && <small className="evidence-hint">This is explained in plain language. Expand technical details for the full measurement context.</small>}</div><div className="evidence-section"><div className="evidence-label"><Zap size={14} /> ACTION</div><p>{finding.exercise}</p></div></div><button className="evidence-expand" onClick={() => setShowTechnical((v) => !v)}>{showTechnical ? 'Hide' : 'Show'} technical details <ChevronDown size={14} className={showTechnical ? 'evidence-chevron-open' : ''} /></button>{showTechnical && <div className="evidence-technical"><div className="evidence-tech-row"><span>DETECTION METHOD</span><strong>{finding.tone === 'amber' ? 'pause-duration-rubric-0.1' : finding.tone === 'red' ? 'rate-deviation-0.1' : 'f0-contour-comparison-0.1'}</strong></div><div className="evidence-tech-row"><span>CONFIDENCE</span><strong>{finding.tone === 'cyan' ? 'Low — pitch estimation may be unreliable' : 'Medium — aligned window comparison'}</strong></div><div className="evidence-tech-row"><span>RUBRIC VERSION</span><strong>1.0 / English</strong></div><div className="evidence-tech-row"><span>PIPELINE</span><strong>prototype-0.1 / illustrative sample</strong></div></div>}</div>;
}

function RubricTemplates() {
  const [selectedRubric, setSelectedRubric] = useState(0);
  const templates = [
    { name: 'Job interview delivery', context: 'Interviews and workplace meetings', criteria: [{ name: 'Pacing', measurement: 'Speech rate in aligned windows', range: '120–180 wpm', auto: true }, { name: 'Pauses', measurement: 'Pause interval and placement', range: '0.3–1.2 s', auto: true }, { name: 'Pitch variation', measurement: 'F0 range where reliably estimated', range: 'Context-dependent', auto: false }, { name: 'Clarity', measurement: 'Not scored without validated method', range: 'N/A', auto: false }] },
    { name: 'Classroom presentation', context: 'Classroom or university', criteria: [{ name: 'Pacing', measurement: 'Speech rate in aligned windows', range: '110–170 wpm', auto: true }, { name: 'Pauses', measurement: 'Pause interval at phrase boundaries', range: '0.3–0.9 s', auto: true }, { name: 'Emphasis', measurement: 'Pitch movement on key terms', range: 'Context-dependent', auto: false }, { name: 'Clarity', measurement: 'Not scored without validated method', range: 'N/A', auto: false }] },
    { name: 'Declamation', context: 'Competitions or evaluated speeches', criteria: [{ name: 'Pacing', measurement: 'Speech rate variation across passages', range: 'Context-dependent', auto: true }, { name: 'Pauses', measurement: 'Intentional pause placement', range: 'Context-dependent', auto: true }, { name: 'Pitch variation', measurement: 'F0 range and contour shape', range: 'Context-dependent', auto: false }, { name: 'Energy', measurement: 'RMS energy variation', range: 'Context-dependent', auto: false }] },
    { name: 'Persuasive speaking', context: 'Debates and structured arguments', criteria: [{ name: 'Pacing', measurement: 'Speech rate in aligned windows', range: '130–190 wpm', auto: true }, { name: 'Pauses', measurement: 'Strategic pause before key points', range: '0.5–1.5 s', auto: true }, { name: 'Emphasis', measurement: 'Pitch and energy on persuasive markers', range: 'Context-dependent', auto: false }, { name: 'Clarity', measurement: 'Not scored without validated method', range: 'N/A', auto: false }] },
    { name: 'Extemporaneous speech', context: 'Public speaking and spontaneous delivery', criteria: [{ name: 'Pacing', measurement: 'Speech rate consistency', range: '120–170 wpm', auto: true }, { name: 'Pauses', measurement: 'Hesitation vs intentional pauses', range: 'Context-dependent', auto: true }, { name: 'Filler detection', measurement: 'Not scored without validated method', range: 'N/A', auto: false }, { name: 'Clarity', measurement: 'Not scored without validated method', range: 'N/A', auto: false }] },
    { name: 'General public speaking', context: 'Any context', criteria: [{ name: 'Pacing', measurement: 'Speech rate in aligned windows', range: '120–180 wpm', auto: true }, { name: 'Pauses', measurement: 'Pause interval and local context', range: '0.3–1.2 s', auto: true }, { name: 'Pitch variation', measurement: 'Voiced F0 movement where reliable', range: 'Context-dependent', auto: false }, { name: 'Energy', measurement: 'RMS energy consistency', range: 'Context-dependent', auto: false }] },
  ];
  const rubric = templates[selectedRubric];
  return <div className="rubric-page"><div className="section-kicker">/ VERSIONED CRITERIA</div><h2>Rubrics that show<br /><span>their working.</span></h2><p>Each criterion names the measurement, its preferred range, and the limits of interpretation. Criteria marked as auto-evaluated are checked by the analysis pipeline when audio processing is connected.</p><div className="rubric-templates-layout"><div className="rubric-template-list">{templates.map((t, i) => <button key={t.name} className={`rubric-template-btn ${i === selectedRubric ? 'active' : ''}`} onClick={() => setSelectedRubric(i)}><strong>{t.name}</strong><small>{t.context}</small></button>)}</div><div className="rubric-template-detail"><div className="rubric-template-header"><div><div className="section-kicker">SELECTED RUBRIC</div><h3>{rubric.name}</h3><small>Version 1.0 / English / Read-only system rubric</small></div><ShieldCheck size={20} /></div><div className="rubric-criteria-list">{rubric.criteria.map((c) => <div className="rubric-criterion-row" key={c.name}><div><strong>{c.name}</strong><small>{c.measurement}</small></div><div className="rubric-criterion-meta"><span className="rubric-range">{c.range}</span><span className={`rubric-auto ${c.auto ? 'auto' : 'manual'}`}>{c.auto ? 'AUTO' : 'MANUAL'}</span></div></div>)}</div><div className="rubric-template-foot"><span className="eyebrow-dot" /> Content-quality criteria are not scored. Acoustic delivery analysis is separate from content evaluation.</div></div></div></div>;
}

function PracticeStudio({ profile, plan, onCompleteActivity }: { profile: UserProfile; plan: PracticePlan; onCompleteActivity: (activityId: string) => void }) {
  const exercisesFromFindings = sampleFindings.map((f, i) => ({ id: `practice-finding-${i}`, title: f.title, skill: f.category, reason: f.detail, segment: f.time, instructions: f.exercise, source: 'sample-finding' as const }));
  const planExercises = plan.activities.filter((a) => a.status !== 'completed').map((a) => ({ id: a.id, title: a.title, skill: profile.coaching_priorities[0] || 'General delivery', reason: a.instructions, segment: 'Full recording', instructions: a.instructions, source: 'plan' as const }));
  const allExercises = [...exercisesFromFindings, ...planExercises];
  const [activeExercise, setActiveExercise] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const exercise = allExercises[activeExercise] || allExercises[0];
  if (!exercise) return <div className="simple-page"><div className="section-kicker">/ PRACTICE STUDIO</div><h2>No exercises<br /><span>available yet.</span></h2><p>Complete an analysis or add a practice plan to see evidence-linked exercises here.</p></div>;
  const markComplete = () => { setCompleted((prev) => [...new Set([...prev, exercise.id])]); if (exercise.source === 'plan') onCompleteActivity(exercise.id); };
  return <div className="practice-studio"><div className="section-kicker">/ PRACTICE STUDIO</div><h2>Evidence-linked<br /><span>practice.</span></h2><p>Each exercise connects to a real finding or your practice plan. Completing an exercise does not prove improvement — record another comparable attempt to measure change.</p><div className="practice-layout"><div className="practice-exercise-list">{allExercises.map((ex, i) => <button key={ex.id} className={`practice-exercise-btn ${i === activeExercise ? 'active' : ''} ${completed.includes(ex.id) ? 'done' : ''}`} onClick={() => setActiveExercise(i)}><span className="practice-exercise-num">{String(i + 1).padStart(2, '0')}</span><div><strong>{ex.title}</strong><small>{ex.skill} / {ex.segment}</small></div>{completed.includes(ex.id) && <Check size={15} />}</button>)}</div><div className="practice-exercise-detail"><div className="practice-detail-header"><div><div className={`practice-source-badge ${exercise.source}`}>{exercise.source === 'sample-finding' ? 'FROM FINDING' : 'FROM PLAN'}</div><h3>{exercise.title}</h3></div></div><div className="practice-detail-block"><span>SKILL BEING TARGETED</span><p>{exercise.skill}</p></div><div className="practice-detail-block"><span>WHY THIS EXERCISE</span><p>{exercise.reason}</p></div><div className="practice-detail-block"><span>RELEVANT SEGMENT</span><p>{exercise.segment}</p></div><div className="practice-detail-block"><span>INSTRUCTIONS</span><p>{exercise.instructions}</p></div><div className="practice-detail-block"><span>SUCCESS CRITERION</span><p>Record the same passage again and compare the measurement at the same timestamp. A change in measurement is observable; whether it constitutes improvement depends on your delivery goal.</p></div><div className="practice-actions"><Button variant="acid" onClick={markComplete} disabled={completed.includes(exercise.id)}>{completed.includes(exercise.id) ? 'Completed' : 'Mark complete'} {completed.includes(exercise.id) ? <Check size={15} /> : null}</Button><Button onClick={() => setActiveExercise((i) => Math.min(allExercises.length - 1, i + 1))} disabled={activeExercise >= allExercises.length - 1}>Next exercise <ArrowRight size={15} /></Button></div></div></div></div>;
}

function SettingsView({ profile, onProfileUpdate, onSignOut }: { profile: UserProfile; onProfileUpdate: (updates: Partial<UserProfile>) => void; onSignOut: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [draft, setDraft] = useState({ primary_goal: profile.primary_goal || '', feedback_style: profile.feedback_style || '', detail_level: profile.detail_level || '', practice_frequency: profile.practice_frequency || '', experience_level: profile.experience_level || '' });
  const goalOptions = ['College presentations and academic speaking', 'Job interviews and professional communication', 'Public speaking and conference presentations', 'Debates and structured arguments', 'Storytelling and expressive delivery', 'Everyday spoken communication', 'English-speaking practice'];
  const feedbackOptions = ['Short, direct recommendations', 'Step-by-step explanations', 'Detailed acoustic evidence and measurements', 'A balance of explanations and practical exercises'];
  const detailOptions = ['Give me the most important one or two improvements.', 'Give me a few prioritized recommendations.', 'Show me the complete analysis with technical details.'];
  const frequencyOptions = ['A few minutes when I have time', 'A few times per week', 'Daily short sessions', 'I am preparing for a specific event'];
  const experienceOptions = ['I am just getting started.', 'I can speak, but I want to improve.', 'I speak regularly and want more precise feedback.', 'I am experienced and want detailed performance analysis.'];
  const save = async () => {
    setSaving(true);
    if (supabase) {
      const { error } = await supabase.from('user_profiles').update({ primary_goal: draft.primary_goal, feedback_style: draft.feedback_style, detail_level: draft.detail_level, practice_frequency: draft.practice_frequency, experience_level: draft.experience_level, updated_at: new Date().toISOString() }).eq('id', profile.id);
      if (error) { console.error('settings save failed', error); setSaving(false); return; }
      await supabase.from('user_preference_history').insert({ preference_name: 'primary_goal', new_value: JSON.stringify(draft.primary_goal), source: 'user_edit' });
    }
    onProfileUpdate({ primary_goal: draft.primary_goal, feedback_style: draft.feedback_style, detail_level: draft.detail_level, practice_frequency: draft.practice_frequency, experience_level: draft.experience_level });
    setEditing(false); setSaving(false); setSavedMsg('Preferences saved. Future coaching will reflect your updated priorities.'); setTimeout(() => setSavedMsg(''), 4000);
  };
  const deleteAllData = async () => {
    if (!supabase || !confirm('This will permanently delete your recordings, analyses, findings, and practice plans. Your account will remain. This cannot be undone.')) return;
    const { error: recError } = await supabase.from('recordings').delete().eq('user_id', profile.id);
    if (recError) { console.error('delete failed', recError); return; }
    const { error: planError } = await supabase.from('practice_plans').delete().eq('user_id', profile.id);
    if (planError) console.error('plan delete failed', planError);
    setSavedMsg('Your recordings, analyses, and practice plans have been deleted.'); setTimeout(() => setSavedMsg(''), 5000);
  };
  const handleLogout = () => { setSavedMsg('Logged out successfully.'); setTimeout(() => onSignOut(), 800); };
  return <div className="settings-page"><div className="section-kicker">/ WORKSPACE SETTINGS</div><h2>Keep the practice<br /><span>private and focused.</span></h2>{savedMsg && <div className="settings-saved-msg"><ShieldCheck size={15} /> {savedMsg}</div>}<div className="settings-sections"><div className="settings-section"><div className="settings-section-head"><div><span>PROFILE</span><strong>{profile.display_name}</strong></div>{!editing && <button onClick={() => setEditing(true)}>Edit preferences</button>}</div>{editing ? <div className="settings-edit-grid"><label>PRIMARY GOAL<select value={draft.primary_goal} onChange={(e) => setDraft((d) => ({ ...d, primary_goal: e.target.value }))}><option value="">Select a goal</option>{goalOptions.map((o) => <option key={o}>{o}</option>)}</select></label><label>EXPERIENCE LEVEL<select value={draft.experience_level} onChange={(e) => setDraft((d) => ({ ...d, experience_level: e.target.value }))}><option value="">Select level</option>{experienceOptions.map((o) => <option key={o}>{o}</option>)}</select></label><label>FEEDBACK STYLE<select value={draft.feedback_style} onChange={(e) => setDraft((d) => ({ ...d, feedback_style: e.target.value }))}><option value="">Select style</option>{feedbackOptions.map((o) => <option key={o}>{o}</option>)}</select></label><label>DETAIL LEVEL<select value={draft.detail_level} onChange={(e) => setDraft((d) => ({ ...d, detail_level: e.target.value }))}><option value="">Select detail</option>{detailOptions.map((o) => <option key={o}>{o}</option>)}</select></label><label>PRACTICE FREQUENCY<select value={draft.practice_frequency} onChange={(e) => setDraft((d) => ({ ...d, practice_frequency: e.target.value }))}><option value="">Select frequency</option>{frequencyOptions.map((o) => <option key={o}>{o}</option>)}</select></label><div className="settings-edit-actions"><Button variant="acid" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button><Button onClick={() => { setEditing(false); setDraft({ primary_goal: profile.primary_goal || '', feedback_style: profile.feedback_style || '', detail_level: profile.detail_level || '', practice_frequency: profile.practice_frequency || '', experience_level: profile.experience_level || '' }); }}>Cancel</Button></div></div> : <div className="settings-readonly"><div><span>Primary goal</span><strong>{profile.primary_goal || 'Not set'}</strong></div><div><span>Experience</span><strong>{profile.experience_level || 'Not set'}</strong></div><div><span>Feedback style</span><strong>{profile.feedback_style || 'Not set'}</strong></div><div><span>Detail level</span><strong>{profile.detail_level || 'Not set'}</strong></div><div><span>Practice frequency</span><strong>{profile.practice_frequency || 'Not set'}</strong></div></div>}</div><div className="settings-section"><div className="settings-section-head"><div><span>PRIVACY & DATA</span><strong>Your recordings are private by default</strong></div></div><div className="settings-privacy-info"><p>Recordings are stored in your private Supabase storage. They are never used for model training without separate explicit consent.</p><p>If an external speech-processing service is connected, you will be notified before any audio is sent to it.</p></div><div className="settings-danger-zone"><div><strong>Delete all recordings and analyses</strong><small>Permanently removes your recordings, analyses, findings, and practice plans. Your account remains.</small></div><button className="settings-delete-btn" onClick={deleteAllData}><Trash2 size={15} /> Delete my data</button></div></div><div className="settings-section"><div className="settings-section-head"><div><span>SESSION</span><strong>Sign out of your workspace</strong></div></div><div className="settings-privacy-info"><p>End your current session. You will be returned to the landing page and will need to sign in again to access your workspace.</p></div><Button variant="outline" onClick={handleLogout}><LogOut size={15} /> Log out</Button></div></div></div>;
}

function Recordings({ setView }: { setView: (view: View) => void }) { return <div className="simple-page"><div className="section-kicker">/ PRIVATE LIBRARY</div><h2>Your recordings<br /><span>will live here.</span></h2><p>No recordings have been uploaded yet. Start a new analysis to add your first private speech.</p><Button variant="acid" onClick={() => setView('new')}>Upload recording <Upload size={16} /></Button></div>; }
function Compare({ setView }: { setView: (view: View) => void }) { return <div className="simple-page"><div className="section-kicker">/ PROGRESS STUDY</div><h2>Compare attempts<br /><span>when there are two.</span></h2><p>Comparable attempts need the same transcript and rubric context. Create your first two analyses to see aligned changes in rate, pauses, and pitch variation.</p><div className="compare-empty"><span>01</span><span>PARTICIPANT / NO COMPATIBLE ANALYSES YET</span></div><Button variant="acid" onClick={() => setView('new')}>Create first analysis <ArrowRight size={16} /></Button></div>; }

function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(hasSupabaseConfig ? null : demoProfile);
  const [plan, setPlan] = useState<PracticePlan | null>(hasSupabaseConfig ? null : demoPlan);
  const [authChecked, setAuthChecked] = useState(!hasSupabaseConfig);
  const [profileChecked, setProfileChecked] = useState(!hasSupabaseConfig);
  useEffect(() => { const update = () => setRoute(getRoute()); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update); }, []);
  useEffect(() => { document.title = route === 'landing' ? 'SpeechLab — Every pause tells a story' : route === 'app' ? 'SpeechLab — Workspace' : 'SpeechLab — Access'; }, [route]);
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setAuthChecked(true); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAuthChecked(true); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    const client = supabase;
    if (!client || route !== 'app' || !session) return;
    let mounted = true;
    setProfileChecked(false);
    const loadProfile = async () => {
      const { data: savedProfile, error: profileError } = await client.from('user_profiles').select('id, display_name, onboarding_completed, primary_goal, selected_contexts, experience_level, coaching_priorities, feedback_style, detail_level, practice_frequency, upcoming_event_date, personal_goal').eq('id', session.user.id).maybeSingle();
      if (profileError) console.error('profile load failed', profileError);
      if (!mounted) return;
      setProfile(savedProfile ? { ...savedProfile, selected_contexts: savedProfile.selected_contexts || [], coaching_priorities: savedProfile.coaching_priorities || [] } : { ...demoProfile, id: session.user.id, display_name: session.user.user_metadata.display_name || session.user.email?.split('@')[0] || 'SpeechLab speaker', onboarding_completed: false });
      const { data: savedPlan } = await client.from('practice_plans').select('id, title, goal, status, practice_activities(id, title, instructions, estimated_minutes, status, position)').eq('user_id', session.user.id).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (savedPlan) setPlan({ ...savedPlan, activities: savedPlan.practice_activities || [] });
      setProfileChecked(true);
    };
    void loadProfile();
    return () => { mounted = false; };
  }, [route, session]);
  useEffect(() => { if (route === 'app' && hasSupabaseConfig && authChecked && !session) navigate('/login'); }, [route, session, authChecked]);
  useEffect(() => { if ((route === 'login' || route === 'signup') && hasSupabaseConfig && authChecked && session) navigate('/app'); }, [route, session, authChecked]);
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setSession(null); setProfile(null); setPlan(null); navigate('/'); };
  const handleProfileComplete = (nextProfile: UserProfile, nextPlan: PracticePlan) => { setProfile(nextProfile); setPlan(nextPlan); };
  const body = useMemo(() => route === 'landing' ? <Landing /> : route === 'login' || route === 'signup' ? <AuthPage mode={route} /> : <Workspace onSignOut={signOut} profile={profile} plan={plan} onProfileComplete={handleProfileComplete} />, [route, profile, plan]);
  if (route === 'app' && hasSupabaseConfig && (!authChecked || !profileChecked)) return <div className="loading-screen">LOADING YOUR PRIVATE PRACTICE SPACE…</div>;
  return body;
}

export default App;
