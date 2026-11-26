"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Logo, Mark } from "@/components/Logo";
import { refreshMe, runJob, short, signOut, streamChat, useMe } from "@/lib/client";
import { DEFAULT_CHAT, MODELS, SHOWN_KINDS, getModel, isSoon, mediaCost, priceLabel, usd, type Kind } from "@/lib/models";
import { DotField, Icon, KIND_ICON, MakerMark } from "./art";
import { ConnectModal, KIND_LABEL, MessageView, ModelPicker, Popover, PrivacyMenu, kindVar } from "./parts";
import { deleteChat, download, exportJson, listChats, putChat, uid, wipeChats, type Attachment, type Chat, type ErrKind, type Msg } from "./store";
import s from "./chat.module.css";

type Trial = { left: number; mediaLeft: number; total: number };
const KINDS: Kind[] = SHOWN_KINDS;
const SUGGESTIONS: { kind: Kind; text: string }[] = [
  { kind: "chat", text: "Explain how a hash function works, like I'm twelve" },
  { kind: "image", text: "A lighthouse on a cliff at dusk, soft fog over the water" },
  { kind: "video", text: "Slow push through a foggy pine forest just before sunrise" },
  { kind: "music", text: "Warm lo-fi loop with soft keys and vinyl crackle" },
].filter((g) => SHOWN_KINDS.includes(g.kind as Kind)) as { kind: Kind; text: string }[];
const MAX_IMG = 4 << 20, MAX_TEXT = 200 << 10;
const VIDEO_SECONDS = 6;

const errKind = (msg: string): ErrKind =>
  /used up/i.test(msg) ? "trial" : /balance too low/i.test(msg) ? "balance" : /connect a wallet|api key/i.test(msg) ? "auth" : "other";

function pickModel(kind: Kind, signedIn: boolean, prefer?: string) {
  const p = prefer && getModel(prefer);
  if (p && p.kind === kind && (signedIn || p.free)) return p.id;
  const list = MODELS.filter((m) => m.kind === kind);
  if (!list.length) return pickModel("chat", signedIn); // e.g. a saved chat from a mode that is no longer offered
  if (kind === "chat" && (signedIn || getModel(DEFAULT_CHAT)?.free)) return DEFAULT_CHAT;
  return (list.find((m) => signedIn || m.free) ?? list[0]).id;
}

const blank = (mode: Kind = "chat", signedIn = false): Chat => ({ id: uid(), title: "", mode, model: pickModel(mode, signedIn), messages: [], updatedAt: Date.now() });

/** OpenAI-style messages from history. Media turns and failed turns are left out. */
function toApi(chat: Chat, upto: number, vision: boolean) {
  const out: unknown[] = chat.system?.trim() ? [{ role: "system", content: chat.system.trim() }] : [];
  const msgs = chat.messages.slice(0, upto);
  msgs.forEach((m, i) => {
    const next = msgs[i + 1];
    if (m.role === "assistant" && (m.error || m.media || !m.content)) return;
    if (m.role === "user" && next && (next.media || next.error)) return;
    if (m.role === "assistant") return out.push({ role: "assistant", content: m.content });
    const text = [m.content, ...(m.attachments ?? []).filter((a) => a.text != null).map((a) => `--- ${a.name} ---\n${a.text}`)].join("\n\n");
    const imgs = vision ? (m.attachments ?? []).filter((a) => a.dataUrl) : [];
    out.push({ role: "user", content: imgs.length ? [{ type: "text", text }, ...imgs.map((a) => ({ type: "image_url", image_url: { url: a.dataUrl } }))] : text });
  });
  return out;
}

const readFile = (f: File) =>
  new Promise<Attachment>((res, rej) => {
    const r = new FileReader();
    const img = f.type.startsWith("image/");
    r.onload = () => res({ name: f.name, mime: f.type || "text/plain", ...(img ? { dataUrl: String(r.result) } : { text: String(r.result) }) });
    r.onerror = () => rej(r.error);
    if (img) r.readAsDataURL(f); else r.readAsText(f);
  });
const TEXTISH = /^(text\/|application\/(json|xml|javascript|x-yaml|toml|x-sh))|\.(md|txt|csv|tsv|json|ya?ml|toml|xml|html?|css|jsx?|tsx?|py|rb|go|rs|java|kt|c|h|cpp|cs|php|sh|sql|sol|log|ini|env)$/i;

export default function ChatApp() {
  const { me } = useMe();
  const signedIn = !!me;
  const [chats, setChats] = useState<Chat[]>([]);
  const [chat, setChatState] = useState<Chat>(() => blank());
  const chatRef = useRef(chat);
  const [temporary, setTemporary] = useState(false);
  const [input, setInput] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<{ ctl?: AbortController; status: string } | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [folded, setFolded] = useState(false);
  const [connect, setConnect] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; v: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastModel = useRef<Partial<Record<Kind, string>>>({});

  const setChat = useCallback((f: (c: Chat) => Chat) => {
    chatRef.current = f(chatRef.current);
    setChatState(chatRef.current);
  }, []);
  const reload = useCallback(() => listChats().then(setChats).catch(() => setNotice("Could not read your saved chats from this browser.")), []);
  const loadTrial = useCallback(() => fetch("/api/trial", { cache: "no-store" }).then((r) => r.json()).then(setTrial).catch(() => setNotice("Could not load the free-prompt count. Refresh to try again.")), []);

  // restore history and the chat named in ?c=
  useEffect(() => {
    loadTrial();
    const id = new URLSearchParams(location.search).get("c"); // read before the URL-sync effect below clears it
    listChats().then((all) => {
      setChats(all);
      const found = id && all.find((c) => c.id === id);
      if (found) { chatRef.current = found; setChatState(found); }
    }).catch(() => setNotice("This browser blocks local storage, so chats will not be kept."));
  }, [loadTrial]);

  // keep ?c= in sync
  useEffect(() => {
    const url = new URL(location.href);
    if (chat.messages.length && !temporary) url.searchParams.set("c", chat.id); else url.searchParams.delete("c");
    history.replaceState(null, "", url);
  }, [chat.id, chat.messages.length, temporary]);

  // after sign-in/out, swap a model the account can't use
  useEffect(() => {
    if (me === undefined) return;
    setChat((c) => { const id = pickModel(c.mode, signedIn, c.model); return id === c.model ? c : { ...c, model: id }; });
  }, [me, signedIn, setChat]);

  const save = useCallback(async () => {
    const c = chatRef.current;
    if (temporary || !c.messages.length) return;
    await putChat(c).catch(() => setNotice("Could not save this chat in the browser."));
    reload();
  }, [temporary, reload]);

  const newChat = useCallback((mode: Kind = chatRef.current.mode) => {
    busy?.ctl?.abort();
    const c = blank(mode, signedIn);
    c.model = pickModel(mode, signedIn, lastModel.current[mode]);
    chatRef.current = c;
    setChatState(c);
    setInput(""); setAtts([]); setDrawer(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [busy, signedIn]);

  // keyboard: ⌘/Ctrl+O new chat, ⌘/Ctrl+K search
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "o") { e.preventDefault(); newChat(); }
      if (key === "k") { e.preventDefault(); setFolded(false); setDrawer(true); setTimeout(() => searchRef.current?.focus(), 0); }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [newChat]);

  // keep the newest text in view while it streams, unless the reader scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const model = getModel(chat.model);
  const soon = isSoon(chat.mode); // video/music: shown, nothing can be generated or charged yet
  const setMode = (mode: Kind) => {
    if (busy) return;
    lastModel.current[chat.mode] = chat.model;
    setChat((c) => ({ ...c, mode, model: pickModel(mode, signedIn, lastModel.current[mode]) }));
  };
  const setModel = (id: string) => { lastModel.current[chat.mode] = id; setChat((c) => ({ ...c, model: id })); };


  const afterCall = (ok: boolean, media: boolean) => {
    if (signedIn) return refreshMe();
    if (ok) setTrial((t) => t && { ...t, left: t.left - 1, mediaLeft: media ? t.mediaLeft - 1 : t.mediaLeft });
    loadTrial();
  };

  /** Fills the trailing empty assistant message of the current chat. */
  async function generate() {
    const c = chatRef.current;
    const m = getModel(c.model);
    const prompt = [...c.messages].reverse().find((x) => x.role === "user");
    if (!m || !prompt) return;
    // The reader may open another chat mid-run: keep our own copy and only touch the screen while it is still this chat.
    const onLast = (x: Chat, f: (m: Msg) => Msg) => ({ ...x, messages: x.messages.map((y, i) => (i === x.messages.length - 1 ? f(y) : y)) });
    let local = c;
    const here = () => chatRef.current.id === c.id;
    const patchLast = (f: (m: Msg) => Msg) => { local = onLast(local, f); if (here()) setChat((x) => onLast(x, f)); };
    const free = !signedIn;
    patchLast((x) => ({ ...x, model: m.id, free }));
    if (m.kind === "chat") {
      const ctl = new AbortController();
      setBusy({ ctl, status: "Working…" });
      let text = "", reasoning = "";
      try {
        const receipt = await streamChat(
          { model: m.id, messages: toApi(c, c.messages.length - 1, !!m.vision) },
          {
            signal: ctl.signal,
            delta: (t) => { text += t; patchLast((x) => ({ ...x, content: text })); },
            reasoning: (t) => { reasoning += t; patchLast((x) => ({ ...x, reasoning })); },
          },
        );
        patchLast((x) => ({ ...x, receipt }));
        afterCall(true, false);
      } catch (e) {
        const err = e as Error;
        if (err.name !== "AbortError") patchLast((x) => ({ ...x, error: { message: err.message, kind: errKind(err.message) } }));
        else if (!text) patchLast((x) => ({ ...x, error: { message: "Stopped.", kind: "other" } }));
        afterCall(false, false);
      }
    } else {
      const units = m.kind === "video" ? VIDEO_SECONDS : 1;
      const hold = (mediaCost(m, units) ?? 0) / 1e6;
      setBusy({ status: `Generating… ${free ? "free trial" : `holding ${usd(hold)}`}` });
      try {
        const r = await runJob({ model: m.id, prompt: prompt.content, ...(m.kind === "video" ? { seconds: units } : {}) }, () => {});
        patchLast((x) => ({ ...x, media: r }));
        afterCall(true, true);
      } catch (e) {
        const msg = (e as Error).message;
        patchLast((x) => ({ ...x, error: { message: msg, kind: errKind(msg) } }));
        afterCall(false, true);
      }
    }
    setBusy(null);
    if (!here()) { if (!temporary) await putChat({ ...local, updatedAt: Date.now() }).catch(() => setNotice("Could not save that chat in the browser.")); reload(); return; }
    setChat((x) => ({ ...x, updatedAt: Date.now() }));
    await save();
  }

  async function send(text = input) {
    text = text.trim();
    if (soon) return setNotice(`${KIND_LABEL[chat.mode]} models are coming soon. Nothing was sent or charged.`);
    if (busy || (!text && !atts.length) || !model) return;
    if (model.kind !== "chat" && !text) return setNotice("Describe what to make first.");
    const user: Msg = { id: uid(), role: "user", content: text, ...(atts.length && model.kind === "chat" ? { attachments: atts } : {}) };
    setChat((c) => ({ ...c, title: c.title || (text || atts[0]?.name || "Untitled").slice(0, 80), messages: [...c.messages, user, { id: uid(), role: "assistant", content: "" }] }));
    setInput(""); setAtts([]); setNotice("");
    save(); // keep the prompt even if the page reloads mid-answer
    await generate();
  }

  async function regenerate() {
    if (busy) return;
    setChat((c) => ({ ...c, messages: [...c.messages.slice(0, -1), { id: uid(), role: "assistant", content: "" }] }));
    await generate();
  }

  async function addFiles(files: FileList | null) {
    const out: Attachment[] = [];
    for (const f of Array.from(files ?? [])) {
      const img = f.type.startsWith("image/");
      if (!img && !TEXTISH.test(f.type) && !TEXTISH.test(f.name)) { setNotice(`${f.name}: only images and text files can be attached.`); continue; }
      if (f.size > (img ? MAX_IMG : MAX_TEXT)) { setNotice(`${f.name} is too large (limit ${img ? "4 MB" : "200 KB"}).`); continue; }
      out.push(await readFile(f));
    }
    setAtts((a) => [...a, ...out]);
    if (fileRef.current) fileRef.current.value = "";
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)));
  }, [chats, query]);

  const open = (c: Chat) => { if (busy) busy.ctl?.abort(); chatRef.current = c; setChatState(c); setTemporary(false); setDrawer(false); };
  const remove = async (c: Chat) => {
    if (!confirm(`Delete “${c.title || "Untitled"}”? This cannot be undone.`)) return;
    await deleteChat(c.id);
    if (c.id === chat.id) newChat();
    reload();
  };
  const rename = async () => {
    if (!renaming) return;
    const c = chats.find((x) => x.id === renaming.id);
    setRenaming(null);
    if (!c || !renaming.v.trim()) return;
    const n = { ...c, title: renaming.v.trim() };
    await putChat(n);
    if (n.id === chat.id) setChat((x) => ({ ...x, title: n.title }));
    reload();
  };
  const wipe = async () => {
    if (!confirm("Delete every chat saved in this browser? This cannot be undone.")) return;
    await wipeChats();
    newChat();
    reload();
  };

  const lastIdx = chat.messages.length - 1;
  const imagesDropped = model?.kind === "chat" && !model.vision && atts.some((a) => a.dataUrl);
  const costHint = !model ? "" : !signedIn && model.free ? "Free"
    : model.kind === "chat" ? priceLabel(model) : `~${usd((mediaCost(model, model.kind === "video" ? VIDEO_SECONDS : 1) ?? 0) / 1e6)}`;
  const freeLeft = trial ? Math.max(model?.kind === "chat" ? trial.left : Math.min(trial.left, trial.mediaLeft), 0) : null;

  const kindLocked = (k: Kind) => !isSoon(k) && !signedIn && !MODELS.some((m) => m.kind === k && m.free);
  const openNav = () => (matchMedia("(max-width: 760px)").matches ? setDrawer(true) : setFolded(false));
  const left = trial ? Math.max(trial.left, 0) : 0;
  const mediaOn = trial ? Math.min(Math.max(trial.mediaLeft, 0), left) : 0;
  const free = !signedIn && !!model?.free;
  const priceSub = !model ? "" : free ? (freeLeft != null ? `${freeLeft} left · no wallet` : "no wallet needed") : model.kind === "chat" ? "per 1M, in / out" : model.kind === "video" ? `${VIDEO_SECONDS}s clip` : `per ${model.unit}`;

  return (
    <div className={s.app} data-folded={folded}>
      <button type="button" className={s.overlay} data-open={drawer} onClick={() => setDrawer(false)} aria-label="Close the chat list" tabIndex={drawer ? 0 : -1} />
      <aside className={s.side} data-open={drawer} aria-label="Chats">
        <div className={s.brand}>
          <a href="/" className={s.brandLink}><Logo suffix=" chat" /></a>
          <span className={s.drawerTitle}>Menu</span>
          <button className={`${s.sq} ${s.drawerX}`} onClick={() => setDrawer(false)} aria-label="Close menu"><Icon name="close" size={12} /></button>
        </div>
        <div className={s.sideTop}>
          <div className={s.findRow}>
            <label className={s.find}>
              <Icon name="search" />
              <input ref={searchRef} placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search chats" />
              <kbd>⌘K</kbd>
            </label>
            <button className={s.fold} onClick={() => setFolded(true)} aria-label="Hide sidebar" title="Hide sidebar"><Icon name="fold" /></button>
          </div>
          <button className={s.newChat} onClick={() => newChat()}>
            <Icon name="plus" className={s.newIco} /><span>New chat</span><kbd>⌘O</kbd>
          </button>
        </div>
        <nav className={s.kinds} aria-label="Mode">
          {KINDS.map((k) => (
            <button key={k} className={s.kind} style={kindVar(k)} aria-pressed={chat.mode === k} onClick={() => setMode(k)}
              title={kindLocked(k) ? `${KIND_LABEL[k]} needs a wallet` : KIND_LABEL[k]}>
              <Icon name={KIND_ICON[k]} />
              <span>{KIND_LABEL[k]}</span>
              {kindLocked(k) && <Icon name="lock" size={7} className={s.kindLock} />}
              {isSoon(k) && <span className={s.soonTag}>soon</span>}
            </button>
          ))}
        </nav>
        <div className={s.list}>
          {!chats.length ? (
            <div className={s.emptyScene}>
              <DotField variant="wave" color={`var(--kind-${chat.mode})`} className={s.emptyArt} base={0.07} />
              <p>{temporary ? "Temporary chat: nothing from it is kept." : "Chats you start stay here, on this device only."}</p>
            </div>
          ) : (
            <>
              <div className={s.histHead}><span>History</span><small>this browser only</small></div>
              {!filtered.length && <div className={s.empty}>No chats match.</div>}
              {filtered.map((c) => (
                <div key={c.id} className={s.item} data-active={c.id === chat.id} style={kindVar(c.mode)}>
                  {renaming?.id === c.id ? (
                    <input className="field" autoFocus value={renaming.v} aria-label="Chat name"
                      onChange={(e) => setRenaming({ id: c.id, v: e.target.value })} onBlur={rename}
                      onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setRenaming(null); }} />
                  ) : (
                    <>
                      <button onClick={() => open(c)} title={c.title}><Icon name={KIND_ICON[c.mode]} size={10} className={s.itemIco} />{c.title || "Untitled"}</button>
                      <span className={s.itemAct}>
                        <button className={s.icon} aria-label="Rename" onClick={() => setRenaming({ id: c.id, v: c.title })}>✎</button>
                        <button className={s.icon} aria-label="Delete" onClick={() => remove(c)}><Icon name="close" size={9} /></button>
                      </span>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <div className={s.wallet}>
          <section className={s.purse}>
            <DotField variant="trail" className={s.purseScene} base={0} />
            <div className={s.purseTop}>
              <div className={s.purseBal}>
                <span className={s.purseK}><Icon name="coin" />{signedIn ? "Balance" : "Free trial"}</span>
                {signedIn ? <b className="mono tabnum">{usd(me!.balance)}</b>
                  : <b className="mono tabnum">{trial ? left : "–"}<small>of {trial?.total ?? 30} left</small></b>}
              </div>
              {signedIn ? <a href="/console/credit" className={s.purseBtn}><Icon name="plus" />Add</a>
                : <button className={s.purseBtn} onClick={() => setConnect(true)}><Icon name="coin" />Connect</button>}
            </div>
            {!signedIn && trial && (
              <div className={s.purseTrial}>
                <span className={s.dots} style={{ gridTemplateColumns: `repeat(${trial.total}, minmax(0, 1fr))` }} aria-hidden>
                  {Array.from({ length: trial.total }, (_, i) => (
                    <i key={i} data-on={i < left} data-media={i < mediaOn}
                      style={{ "--n": i, "--m": mediaOn > 1 ? i / (mediaOn - 1) : 0 } as CSSProperties} />
                  ))}
                </span>
                <p className={s.studio}>
                  <span><Icon name="image" style={{ color: "var(--kind-image)" }} /><Icon name="music" style={{ color: "var(--kind-music)" }} /></span>
                  {mediaOn} can still be images
                </p>
              </div>
            )}
            <div className={s.dev}>
              <span className={s.purseK}><Icon name="console" />Wisp Console</span>
              <a href="/console" className={s.devGo}>Open <Icon name="out" size={7} /></a>
              <small>Keys, usage and every model, for builders.</small>
            </div>
          </section>
          <Popover up wrapClass={s.acctWrap} className={s.acct} popClass={s.acctPop} ariaLabel="Account menu"
            label={
              <>
                <span className={s.avatar} aria-hidden>{signedIn ? <MakerMark maker={me!.address} size={16} /> : <Icon name="guest" />}</span>
                <span className={s.acctId}>
                  {me ? <><span className="mono">{short(me.address)}</span><small><i data-on="true" />Signed in</small></>
                    : <><span>Guest</span><small><i />No wallet connected</small></>}
                </span>
                <span className={s.acctCaret} aria-hidden />
              </>
            }>
            {(close) => (
              <div className={s.acctList}>
                {signedIn ? <button onClick={() => { close(); signOut(); }}><span className={s.acctIco}><Icon name="out" /></span><span>Sign out</span></button>
                  : <button className={s.acctConnect} onClick={() => { close(); setConnect(true); }}><span className={s.acctIco}><Icon name="coin" /></span><span>Connect a wallet</span></button>}
                <a href="/console" onClick={close}><span className={s.acctIco}><Icon name="console" /></span><span>Console</span></a>
                <button onClick={async () => { close(); download(await exportJson(), `wisp-chats-${new Date().toISOString().slice(0, 10)}.json`); }}>
                  <span className={s.acctIco}><Icon name="download" /></span><span>Export all chats</span><kbd>JSON</kbd>
                </button>
                <button className={s.acctDanger} onClick={() => { close(); wipe(); }}><span className={s.acctIco}><Icon name="trash" /></span><span>Wipe all chats</span></button>
              </div>
            )}
          </Popover>
        </div>
      </aside>

      <main className={s.main} id="main">
        <DotField variant="signal" still className={s.signal} base={0} color="#fff" />
        <header className={s.top}>
          <div className={s.topL}>
            <button className={`${s.sq} ${s.menuBtn}`} onClick={openNav} aria-label="Open menu"><Icon name="menu" /></button>
            <a href="/" className={s.topMark} aria-label="Wisp home"><Mark size={22} /></a>
            <span className={s.crumb}>{KIND_LABEL[chat.mode]}</span>
            {soon ? <span className={`${s.hideSm} ${s.soonPill}`}>{KIND_LABEL[chat.mode]} · coming soon</span>
              : <ModelPicker className={s.hideSm} mode={chat.mode} value={chat.model} signedIn={signedIn} onPick={setModel} onLocked={() => setConnect(true)} />}
          </div>
          <PrivacyMenu />
          <div className={s.topR}>
            <button className={s.temp} role="switch" aria-checked={temporary} title="Temporary chats are never saved"
              onClick={() => { const t = !temporary; newChat(); setTemporary(t); }}>
              <Icon name="timer" /><span>Temporary</span><span className={s.knob} />
            </button>
          </div>
        </header>

        <div className={s.scroll} ref={scrollRef}>
          {!chat.messages.length ? (
            <section className={s.welcome}>
              <DotField variant="wisp" className={s.stage} base={0.05} />
              <h1>Make anything. Keep it to <em className="serif" style={{ fontStyle: "italic", color: "var(--accent)", letterSpacing: "-0.02em" }}>yourself</em>.</h1>
              <p>Chat, images, video and music on one balance. Your wallet, IP and device are stripped off before a model sees a word.</p>
              <div className={s.starts}>
                {SUGGESTIONS.map((g) => {
                  const m = getModel(pickModel(g.kind, signedIn));
                  const locked = !isSoon(g.kind) && !signedIn && !!m && !m.free;
                  return (
                    <button key={g.kind} className={s.start} style={kindVar(g.kind)} data-locked={locked}
                      onClick={() => { setMode(g.kind); setInput(g.text); inputRef.current?.focus(); }}>
                      <DotField variant={g.kind === "chat" ? "wave" : g.kind} color="var(--k)" className={s.startArt} base={0.05} />
                      <span className={s.startK}>
                        <b>{KIND_LABEL[g.kind]}</b>
                        {isSoon(g.kind) ? <small>Soon</small> : locked ? <small><Icon name="lock" size={8} />Wallet</small> : <Icon name="arrow" size={7} className={s.startGo} />}
                      </span>
                      <span className={s.startT}>{g.text}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className={s.thread} aria-live="polite">
              {chat.messages.map((m, i) => (
                <MessageView key={m.id} m={m} last={i === lastIdx && m.role === "assistant"} streaming={!!busy && i === lastIdx}
                  status={busy?.status} onRegenerate={regenerate} onConnect={() => setConnect(true)} />
              ))}
            </div>
          )}
        </div>

        <div className={s.composerWrap}>
          <form className={s.cx} style={kindVar(chat.mode)} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className={s.screen}>
              {!!atts.length && (
                <div className={s.chips}>
                  {atts.map((a, i) => (
                    <span key={i} className={s.chip}>
                      {a.dataUrl && <img src={a.dataUrl} alt="" />}<span>{a.name}</span>
                      <button type="button" className={s.icon} style={{ width: 22, height: 22 }} aria-label={`Remove ${a.name}`} onClick={() => setAtts((x) => x.filter((_, j) => j !== i))}><Icon name="close" size={9} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className={s.line}>
                <span className={s.cursor} aria-hidden />
                <textarea ref={inputRef} rows={1} value={input} aria-label="Message" className={s.input} disabled={soon}
                  placeholder={soon ? `${KIND_LABEL[chat.mode]} models are coming soon` : chat.mode === "chat" ? "Ask anything" : `Describe the ${chat.mode === "music" ? "song" : chat.mode}`}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
              </div>
              {(notice || imagesDropped) && <div className={s.note}>{notice || `${model?.name} can't see images; pick a vision model or they will be left out.`}</div>}
              <div className={s.tools}>
                <div className={s.modes} role="group" aria-label="Mode">
                  {KINDS.map((k) => (
                    <button key={k} type="button" className={s.mode} style={kindVar(k)} aria-pressed={chat.mode === k} data-locked={kindLocked(k)}
                      aria-label={KIND_LABEL[k]} title={KIND_LABEL[k]} onClick={() => setMode(k)}>
                      <Icon name={KIND_ICON[k]} />{chat.mode === k && <span>{KIND_LABEL[k]}</span>}
                    </button>
                  ))}
                </div>
                {soon ? <span className={`${s.showSm} ${s.soonPill}`}>Coming soon</span>
                  : <ModelPicker className={s.showSm} mode={chat.mode} value={chat.model} signedIn={signedIn} onPick={setModel} onLocked={() => setConnect(true)} />}
                {chat.mode === "chat" && (
                  <>
                    <input ref={fileRef} type="file" multiple hidden accept="image/*,text/*,.md,.json,.csv,.yaml,.yml,.toml,.ts,.tsx,.js,.jsx,.py,.go,.rs,.sol,.sql,.sh" onChange={(e) => addFiles(e.target.files)} />
                    <button type="button" className={s.plus} title="Add images or text files" aria-label="Add images or text files" onClick={() => fileRef.current?.click()}><Icon name="plus" /></button>
                    <Popover up className={s.tool} title="Instructions for this chat" ariaLabel="Instructions"
                      label={<><Icon name="spark" className={chat.system?.trim() ? s.lit : ""} /><span>Instructions</span>{chat.system?.trim() && <b>on</b>}</>}>
                      {() => (
                        <div style={{ width: 320, padding: 6, display: "grid", gap: 6 }}>
                          <label className="label" htmlFor="sys">Instructions for this chat</label>
                          <textarea id="sys" className="field" rows={5} placeholder="e.g. Answer briefly. Use British spelling."
                            value={chat.system ?? ""} onChange={(e) => setChat((c) => ({ ...c, system: e.target.value }))} onBlur={save} />
                        </div>
                      )}
                    </Popover>
                  </>
                )}
                <p className={s.price}><b className="mono">{soon ? "Soon" : costHint}</b><span>{soon ? "nothing is charged" : priceSub}</span></p>
                {busy?.ctl ? <button type="button" className={s.stop} onClick={() => busy.ctl?.abort()}><Icon name="stop" />Stop</button>
                  : <button type="submit" className={s.send} disabled={soon || !!busy || (!input.trim() && !atts.length)}><span>Send</span><span className={s.kbd} aria-hidden>↵</span></button>}
              </div>
            </div>
          </form>
        </div>
      </main>

      <nav className={s.tabbar} aria-label="Mode">
        {KINDS.map((k) => (
          <button key={k} className={s.tab} style={kindVar(k)} aria-pressed={chat.mode === k} data-locked={kindLocked(k)} onClick={() => setMode(k)}>
            <Icon name={KIND_ICON[k]} size={16} /><span>{KIND_LABEL[k]}{isSoon(k) ? " · soon" : ""}</span>
          </button>
        ))}
        <button className={s.tab} onClick={() => setDrawer(true)}><Icon name="menu" size={16} /><span>Menu</span></button>
      </nav>

      {connect && <ConnectModal onClose={() => setConnect(false)} />}
    </div>
  );
}
