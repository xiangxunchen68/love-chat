// 勳貝的家：選單、訊息長按功能、相簿、記事本、行事曆、活動、Keep、表情包、設定
import { collection, addDoc, doc, setDoc, getDocs, deleteDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const LC = window.LC;
const db = LC.db, toast = LC.toast, confirmBox = LC.confirmBox;

// ---------- 小工具 ----------
function h(tag, attrs) {
  const e = document.createElement(tag);
  attrs = attrs || {};
  Object.keys(attrs).forEach(k => {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) return;
    if (k === "class") e.className = v;
    else if (k.slice(0, 2) === "on") e[k] = v;
    else e.setAttribute(k, v);
  });
  for (let i = 2; i < arguments.length; i++) {
    [].concat(arguments[i]).forEach(c => { if (c !== null && c !== undefined && c !== false && c !== "") e.append(c); });
  }
  return e;
}
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const fmtDate = ms => { const d = new Date(ms); return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate(); };
const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const allMsgs = () => Array.from(LC.msgs.values()).filter(m => !LC.hidden.has(m.id)).sort((a, b) => a.ms - b.ms);
const isVideo = f => (f.type || "").indexOf("video/") === 0;
function download(url, name) { const a = h("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove(); }

// ---------- 樣式 ----------
document.head.append(h("style", {}, [
  ".panel{position:fixed;inset:0;z-index:7;background:var(--bg);display:flex;flex-direction:column}",
  ".ph{display:flex;align-items:center;gap:8px;padding:12px 14px;padding-top:max(12px,env(safe-area-inset-top));background:var(--pink);color:#fff;font-weight:700;font-size:17px}",
  ".ph button{background:rgba(255,255,255,.25);color:#fff;border:0;border-radius:10px;padding:6px 10px;font-size:14px;font-weight:400}",
  ".ph .sp{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".pb{flex:1;overflow-y:auto;padding:12px;padding-bottom:max(16px,env(safe-area-inset-bottom))}",
  ".mgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}",
  ".mgrid button{background:#fff;border:0;border-radius:14px;padding:12px 0;font-size:12px;color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.06)}",
  ".mgrid button span{display:block;font-size:26px;margin-bottom:4px}",
  ".pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}",
  ".pgrid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;display:block}",
  ".card{background:#fff;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);cursor:pointer}",
  ".card .t{font-weight:600;word-break:break-word} .card .s,.hint{font-size:13px;color:var(--muted);margin-top:3px;white-space:pre-wrap}",
  ".empty{text-align:center;color:var(--muted);margin-top:40px}",
  ".btn{background:var(--pink);color:#fff;border:0;border-radius:12px;padding:10px 14px;font-size:15px}",
  ".btn.ghost{background:#fff;color:var(--pink-d);border:1px solid var(--pink)}",
  ".btn.danger{background:#fff;color:#d33;border:1px solid #f3c2cc}",
  ".fld{width:100%;padding:10px 12px;border:1px solid #f3c2cc;border-radius:12px;font-size:16px;font-family:inherit;margin-bottom:6px;background:#fff;color:var(--text)}",
  "textarea.fld{min-height:160px;resize:vertical}",
  ".row2{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}",
  ".lbl{font-size:13px;color:var(--muted);margin:16px 0 6px}",
  ".cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}",
  ".cal .wd{font-size:12px;color:var(--muted)}",
  ".cal .d{background:#fff;border-radius:10px;padding:7px 0 5px;font-size:15px;min-height:46px;cursor:pointer}",
  ".cal .d.o{visibility:hidden} .cal .d.today{box-shadow:inset 0 0 0 2px var(--pink)} .cal .d.sel{background:var(--mine)}",
  ".cal .d i{display:block;font-style:normal;font-size:10px;line-height:1.2;color:var(--pink-d);overflow:hidden;white-space:nowrap}",
  ".calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:700}",
  ".calh button{background:#fff;border:0;border-radius:10px;padding:6px 14px;font-size:18px}",
  ".colors{display:flex;gap:12px} .colors button{width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #ddd}",
  "video.full{width:100%;max-height:70vh;background:#000;border-radius:12px}",
  ".sheet{position:fixed;inset:0;z-index:7;background:rgba(0,0,0,.35);display:flex;align-items:flex-end}",
  ".sheetBox{background:#fff;width:100%;border-radius:18px 18px 0 0;padding:14px 12px;padding-bottom:max(14px,env(safe-area-inset-bottom))}",
  ".sprev{font-size:13px;color:var(--muted);padding:0 4px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".agrid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}",
  ".agrid button{background:none;border:0;padding:8px 2px;font-size:12px;color:var(--text)}",
  ".agrid button span{display:block;font-size:24px;margin-bottom:4px}",
  ".shotBar{position:fixed;left:0;right:0;bottom:0;z-index:6;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;padding:10px 14px;padding-bottom:max(10px,env(safe-area-inset-bottom));box-shadow:0 -2px 10px rgba(0,0,0,.08)}",
  ".stk{position:relative} .stk img{object-fit:contain!important;background:#fff}",
  ".stk button{position:absolute;top:3px;right:3px;border:0;border-radius:50%;width:24px;height:24px;background:rgba(0,0,0,.5);color:#fff;font-size:12px}"
].join("\n")));

// ---------- 全螢幕頁面 ----------
function panel(title, right) {
  const cleanups = [];
  const body = h("div", { class: "pb" });
  const close = () => { p.remove(); cleanups.forEach(f => f()); };
  const p = h("div", { class: "panel" },
    h("div", { class: "ph" }, h("button", { onclick: close }, "‹ 返回"), h("span", { class: "sp" }, title), right || null),
    body);
  document.body.append(p);
  return { p: p, body: body, close: close, onClose: f => cleanups.push(f) };
}

// 通用表單
function form(title, fields, init, onSave, onDelete) {
  const pn = panel(title);
  const inputs = {};
  fields.forEach(f => {
    pn.body.append(h("div", { class: "lbl" }, f[1]));
    const el = f[2] === "textarea" ? h("textarea", { class: "fld" }) : h("input", { class: "fld", type: f[2] || "text" });
    el.value = (init && init[f[0]]) || "";
    inputs[f[0]] = el;
    pn.body.append(el);
  });
  const row = h("div", { class: "row2" }, h("button", { class: "btn", onclick: async () => {
    const v = {};
    Object.keys(inputs).forEach(k => { v[k] = inputs[k].value.trim(); });
    try { await onSave(v); pn.close(); toast("已儲存"); } catch (e) { toast(e.message || "儲存失敗"); }
  } }, "儲存"));
  if (onDelete) row.append(h("button", { class: "btn danger", onclick: () => confirmBox("確定要刪除嗎？", "刪除", async () => {
    try { await onDelete(); pn.close(); } catch (e) { toast("刪除失敗"); }
  }) }, "刪除"));
  pn.body.append(row);
  return pn;
}

// ---------- 主選單 ----------
function openMenu() {
  const items = [
    ["🖼️", "照片", photos], ["🎬", "影片", () => fileList(true)], ["📚", "相簿", albums], ["📁", "檔案", () => fileList(false)],
    ["📝", "記事本", notes], ["📅", "行事曆", calendar], ["🎉", "活動", events], ["🔗", "連結", links],
    ["🔖", "Keep", keepPanel], ["⚙️", "設定", settings]
  ];
  const pn = panel("選單");
  pn.body.append(h("div", { class: "mgrid" }, items.map(it =>
    h("button", { onclick: () => { pn.close(); it[2](); } }, h("span", {}, it[0]), it[1]))));
}

// ---------- 照片 ----------
function photos() {
  const pn = panel("照片");
  const imgs = allMsgs().filter(m => m.img).reverse();
  if (!imgs.length) { pn.body.append(h("p", { class: "empty" }, "聊天裡還沒有照片")); return; }
  pn.body.append(h("div", { class: "pgrid" }, imgs.map(m => h("img", { src: m.img, loading: "lazy", onclick: () => LC.view(m.img) }))));
}

// ---------- 影片和檔案（切成小塊存進資料庫，上限 15 MB） ----------
const MAX = 15 * 1024 * 1024, CH = 512 * 1024;
function b64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
async function sendFile(f) {
  if (f.size > MAX) { toast("檔案太大了，上限 15 MB"); return; }
  try {
    const ref = doc(collection(db, "files"));
    const buf = new Uint8Array(await f.arrayBuffer());
    const n = Math.max(1, Math.ceil(buf.length / CH));
    for (let i = 0; i < n; i++) {
      toast("上傳中 " + Math.round(i / n * 100) + "%");
      await setDoc(doc(db, "files", ref.id, "chunks", String(i).padStart(4, "0")), { d: b64(buf.subarray(i * CH, (i + 1) * CH)) });
    }
    const meta = { id: ref.id, name: f.name || "檔案", size: f.size, type: f.type || "application/octet-stream", n: n };
    await setDoc(ref, Object.assign({}, meta, { uid: LC.me.uid, ts: serverTimestamp() }));
    await LC.send({ file: meta });
    toast("已傳送");
  } catch (e) { toast("上傳失敗"); }
}
const blobCache = new Map();
async function getBlobUrl(meta) {
  if (blobCache.has(meta.id)) return blobCache.get(meta.id);
  toast("下載中…");
  const snap = await getDocs(collection(db, "files", meta.id, "chunks"));
  const parts = snap.docs.sort((a, b) => a.id.localeCompare(b.id)).map(d => {
    const s = atob(d.data().d); const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  });
  const url = URL.createObjectURL(new Blob(parts, { type: meta.type }));
  blobCache.set(meta.id, url);
  return url;
}
async function openFile(meta) {
  try {
    const url = await getBlobUrl(meta);
    if (isVideo(meta)) {
      const pn = panel(meta.name);
      pn.body.append(h("video", { class: "full", src: url, controls: "", playsinline: "", autoplay: "" }),
        h("div", { class: "row2" }, h("button", { class: "btn ghost", onclick: () => download(url, meta.name) }, "下載")));
    } else if ((meta.type || "").indexOf("image/") === 0) LC.view(url);
    else download(url, meta.name);
  } catch (e) { toast("下載失敗"); }
}
function renderFile(b, meta) {
  const v = isVideo(meta);
  b.append(h("div", { class: "fn" }, (v ? "🎬 影片" : "📄 " + meta.name)),
    h("div", { class: "fs" }, fmtSize(meta.size) + " · 點一下" + (v ? "播放" : "開啟")));
  b.onclick = () => openFile(meta);
}
function fileList(video) {
  const pick = h("input", { type: "file", hidden: "", accept: video ? "video/*" : null });
  const pn = panel(video ? "影片" : "檔案", h("button", { onclick: () => pick.click() }, "＋ 傳送"));
  pick.onchange = () => { const f = pick.files[0]; pick.value = ""; if (f) { pn.close(); sendFile(f); } };
  pn.body.append(pick, h("p", { class: "hint" }, "單一檔案上限 15 MB"));
  const items = allMsgs().filter(m => m.file && isVideo(m.file) === video).reverse();
  if (!items.length) pn.body.append(h("p", { class: "empty" }, video ? "還沒有影片" : "還沒有檔案"));
  items.forEach(m => pn.body.append(h("div", { class: "card", onclick: () => openFile(m.file) },
    h("div", { class: "t" }, (video ? "🎬 " : "📄 ") + m.file.name),
    h("div", { class: "s" }, fmtSize(m.file.size) + " · " + fmtDate(m.ms) + " · " + LC.who(m.uid)))));
}

// ---------- 相簿 ----------
function albums() {
  const pn = panel("相簿", h("button", { onclick: () => form("新相簿", [["name", "相簿名稱"]], {}, async v => {
    if (!v.name) throw new Error("請輸入相簿名稱");
    await addDoc(collection(db, "albums"), { name: v.name, count: 0, uid: LC.me.uid, ts: serverTimestamp() });
  }) }, "＋ 新相簿"));
  pn.onClose(onSnapshot(query(collection(db, "albums"), orderBy("ts", "desc")), snap => {
    pn.body.replaceChildren();
    if (snap.empty) pn.body.append(h("p", { class: "empty" }, "還沒有相簿，按右上角新增"));
    snap.forEach(d => {
      const a = d.data();
      pn.body.append(h("div", { class: "card", onclick: () => album(d.id, a) },
        h("div", { class: "t" }, "📚 " + a.name), h("div", { class: "s" }, (a.count || 0) + " 張")));
    });
  }, () => toast("讀取失敗")));
}
function album(id, a) {
  const pick = h("input", { type: "file", accept: "image/*", multiple: "", hidden: "" });
  const pn = panel(a.name, h("button", { onclick: () => pick.click() }, "＋ 加照片"));
  const grid = h("div", { class: "pgrid" });
  let count = a.count || 0;
  pn.body.append(pick, grid, h("div", { class: "row2" }, h("button", { class: "btn danger", onclick: () =>
    confirmBox("要刪除整本相簿「" + a.name + "」嗎？", "刪除", async () => {
      const ps = await getDocs(collection(db, "albums", id, "photos"));
      await Promise.all(ps.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "albums", id));
      pn.close();
    }) }, "刪除相簿")));
  pick.onchange = async () => {
    const fs = Array.from(pick.files); pick.value = "";
    for (let i = 0; i < fs.length; i++) {
      toast("上傳中 " + (i + 1) + "/" + fs.length);
      try { await addDoc(collection(db, "albums", id, "photos"), { img: await LC.compress(fs[i]), uid: LC.me.uid, ts: serverTimestamp() }); }
      catch (e) { toast("有一張照片上傳失敗"); }
    }
    toast("完成");
  };
  pn.onClose(onSnapshot(query(collection(db, "albums", id, "photos"), orderBy("ts")), snap => {
    grid.replaceChildren.apply(grid, snap.docs.map(d => h("img", { src: d.data().img, loading: "lazy", onclick: () => LC.view(d.data().img) })));
    if (snap.empty) grid.append(h("p", { class: "empty", style: "grid-column:1/-1" }, "按右上角加照片"));
    if (!snap.metadata.hasPendingWrites && snap.size !== count) { count = snap.size; updateDoc(doc(db, "albums", id), { count: count }).catch(() => {}); }
  }, () => toast("讀取失敗")));
}

// ---------- 記事本 ----------
function notes() {
  const pn = panel("記事本", h("button", { onclick: () => editNote() }, "＋ 新增"));
  pn.onClose(onSnapshot(query(collection(db, "notes"), orderBy("updated", "desc")), snap => {
    pn.body.replaceChildren();
    if (snap.empty) pn.body.append(h("p", { class: "empty" }, "還沒有記事，按右上角新增"));
    snap.forEach(d => {
      const n = d.data();
      pn.body.append(h("div", { class: "card", onclick: () => editNote(d.id, n) },
        h("div", { class: "t" }, n.title || "（無標題）"),
        h("div", { class: "s" }, (n.body || "").slice(0, 80)),
        h("div", { class: "s" }, LC.who(n.uid) + " · " + fmtDate(n.updated))));
    });
  }, () => toast("讀取失敗")));
}
function editNote(id, n) {
  form(id ? "編輯記事" : "新增記事", [["title", "標題"], ["body", "內容", "textarea"]], n || {}, async v => {
    if (!v.title && !v.body) throw new Error("寫點什麼吧");
    const data = { title: v.title, body: v.body, updated: Date.now(), uid: LC.me.uid };
    if (id) await updateDoc(doc(db, "notes", id), data); else await addDoc(collection(db, "notes"), data);
  }, id ? () => deleteDoc(doc(db, "notes", id)) : null);
}

// ---------- 活動 ----------
function editEvent(id, e) {
  form(id ? "編輯活動" : "新增活動", [["title", "活動名稱"], ["date", "日期", "date"], ["time", "時間（可不填）", "time"], ["note", "備註", "textarea"]],
    e || {}, async v => {
      if (!v.title || !v.date) throw new Error("請填活動名稱和日期");
      const data = { title: v.title, date: v.date, time: v.time, note: v.note, uid: LC.me.uid };
      if (id) await updateDoc(doc(db, "events", id), data); else await addDoc(collection(db, "events"), data);
    }, id ? () => deleteDoc(doc(db, "events", id)) : null);
}
function daysFromToday(date) {
  return Math.round((new Date(date + "T00:00:00") - new Date(ymd(new Date()) + "T00:00:00")) / 86400000);
}
function eventCard(e) {
  const n = daysFromToday(e.date);
  const tag = n === 0 ? "就是今天！" : n > 0 ? "還有 " + n + " 天" : (-n) + " 天前";
  return h("div", { class: "card", onclick: () => editEvent(e.id, e) },
    h("div", { class: "t" }, "🎉 " + e.title),
    h("div", { class: "s" }, e.date.split("-").join("/") + (e.time ? " " + e.time : "") + " · " + tag),
    e.note ? h("div", { class: "s" }, e.note) : null);
}
function events() {
  const pn = panel("活動", h("button", { onclick: () => editEvent() }, "＋ 新增"));
  pn.onClose(onSnapshot(query(collection(db, "events"), orderBy("date")), snap => {
    pn.body.replaceChildren();
    const today = ymd(new Date());
    const all = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    const up = all.filter(e => e.date >= today), past = all.filter(e => e.date < today).reverse();
    if (!all.length) pn.body.append(h("p", { class: "empty" }, "還沒有活動，按右上角新增"));
    if (up.length) pn.body.append(h("div", { class: "lbl" }, "即將到來"));
    up.forEach(e => pn.body.append(eventCard(e)));
    if (past.length) pn.body.append(h("div", { class: "lbl" }, "已經過去"));
    past.forEach(e => pn.body.append(eventCard(e)));
  }, () => toast("讀取失敗")));
}

// ---------- 行事曆 ----------
function annLabel(key) {
  const s = LC.start; if (!s) return "";
  if (key === s) return "在一起紀念日";
  if (key.slice(5) === s.slice(5) && key > s) return (Number(key.slice(0, 4)) - Number(s.slice(0, 4))) + " 週年";
  const days = Math.round((new Date(key + "T00:00:00") - new Date(s + "T00:00:00")) / 86400000) + 1;
  if (days > 0 && days % 100 === 0) return "第 " + days + " 天";
  return "";
}
function calendar() {
  const cur = new Date(); cur.setDate(1);
  let sel = ymd(new Date()), evs = [];
  const pn = panel("行事曆");
  const draw = () => {
    pn.body.replaceChildren();
    const y = cur.getFullYear(), m = cur.getMonth();
    pn.body.append(h("div", { class: "calh" },
      h("button", { onclick: () => { cur.setMonth(m - 1); draw(); } }, "‹"),
      y + " 年 " + (m + 1) + " 月",
      h("button", { onclick: () => { cur.setMonth(m + 1); draw(); } }, "›")));
    const g = h("div", { class: "cal" }, "日一二三四五六".split("").map(w => h("div", { class: "wd" }, w)));
    const first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(), today = ymd(new Date());
    for (let i = 0; i < first; i++) g.append(h("div", { class: "d o" }));
    for (let d = 1; d <= n; d++) {
      const key = ymd(new Date(y, m, d));
      const marks = evs.filter(e => e.date === key).map(e => e.title);
      const ann = annLabel(key); if (ann) marks.unshift("💕" + ann);
      g.append(h("div", { class: "d" + (key === today ? " today" : "") + (key === sel ? " sel" : ""), onclick: () => { sel = key; draw(); } },
        String(d), marks.length ? h("i", {}, marks.length > 1 ? "●".repeat(Math.min(marks.length, 3)) : marks[0].slice(0, 5)) : null));
    }
    pn.body.append(g, h("div", { class: "lbl" }, sel.split("-").join("/")));
    const ann = annLabel(sel);
    if (ann) pn.body.append(h("div", { class: "card" }, h("div", { class: "t" }, "💕 " + ann)));
    evs.filter(e => e.date === sel).forEach(e => pn.body.append(eventCard(e)));
    pn.body.append(h("button", { class: "btn ghost", onclick: () => editEvent(null, { date: sel }) }, "＋ 在這天新增活動"));
  };
  pn.onClose(onSnapshot(query(collection(db, "events"), orderBy("date")), snap => {
    evs = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); draw();
  }, () => toast("讀取失敗")));
  draw();
}

// ---------- 連結 ----------
function links() {
  const pn = panel("連結");
  const re = /https?:\/\/[^\s<>"']+/g;
  const items = [];
  allMsgs().forEach(m => { ((m.text || "").match(re) || []).forEach(u => items.push({ u: u, m: m })); });
  if (!items.length) pn.body.append(h("p", { class: "empty" }, "聊天裡還沒有連結"));
  items.reverse().forEach(it => pn.body.append(h("a", { class: "card", href: it.u, target: "_blank", rel: "noopener", style: "display:block;text-decoration:none;color:inherit" },
    h("div", { class: "t", style: "word-break:break-all;color:var(--pink-d)" }, it.u),
    h("div", { class: "s" }, fmtDate(it.m.ms) + " · " + LC.who(it.m.uid)))));
}

// ---------- Keep ----------
async function keep(m) {
  const data = { uid: m.uid, ms: m.ms, at: Date.now() };
  ["text", "img", "stkImg", "sticker", "file"].forEach(k => { if (m[k]) data[k] = m[k]; });
  try { await addDoc(collection(db, "users", LC.me.uid, "keep"), data); toast("已存到 Keep"); } catch (e) { toast("儲存失敗"); }
}
function keepPanel() {
  const pn = panel("Keep");
  pn.onClose(onSnapshot(query(collection(db, "users", LC.me.uid, "keep"), orderBy("at", "desc")), snap => {
    pn.body.replaceChildren();
    if (snap.empty) pn.body.append(h("p", { class: "empty" }, "長按訊息選「Keep」就會存到這裡\n只有你自己看得到"));
    snap.forEach(d => {
      const k = d.data(), c = h("div", { class: "card", style: "cursor:default" });
      const pic = k.img || k.stkImg;
      if (pic) c.append(h("img", { src: pic, style: "max-width:100%;max-height:240px;border-radius:10px;display:block;cursor:zoom-in", onclick: () => LC.view(pic) }));
      else if (k.file) c.append(h("div", { class: "t", style: "cursor:pointer", onclick: () => openFile(k.file) }, (isVideo(k.file) ? "🎬 " : "📄 ") + k.file.name));
      else c.append(h("div", { style: "white-space:pre-wrap;word-break:break-word" }, k.text || k.sticker || ""));
      c.append(h("div", { class: "row2", style: "justify-content:space-between;align-items:center" },
        h("span", { class: "s" }, LC.who(k.uid) + " · " + fmtDate(k.ms)),
        h("button", { class: "btn danger", style: "padding:4px 10px;font-size:13px", onclick: () => confirmBox("要從 Keep 移除嗎？", "移除", () => deleteDoc(d.ref)) }, "移除")));
      pn.body.append(c);
    });
  }, () => toast("讀取失敗")));
}

// ---------- 訊息長按選單 ----------
let menuOpen = false;
function msgMenu(id) {
  const m = LC.msgs.get(id);
  if (!m || menuOpen) return;
  menuOpen = true;
  const mine = m.uid === LC.me.uid, text = m.text || "", pv = LC.preview(m);
  const acts = [
    ["↩️", "回覆", () => LC.setReply(id)],
    text ? ["📋", "複製", () => copy(text)] : null,
    text ? ["✂️", "選擇並複製", () => selectCopy(text)] : null,
    ["🔖", "Keep", () => keep(m)],
    ["📤", "分享", () => share(m)],
    text ? ["📝", "記事本", () => editNote(null, { title: text.split("\n")[0].slice(0, 20), body: text })] : null,
    ["📅", "行事曆", () => editEvent(null, { title: pv.slice(0, 30), date: ymd(new Date()) })],
    ["📢", "設為公告", () => setDoc(doc(db, "settings", "main"), { pin: { id: id, text: pv.slice(0, 80) } }, { merge: true }).then(() => toast("已設為公告"), () => toast("設定失敗"))],
    ["📸", "截圖", () => startShot(id)],
    mine ? ["↪️", "收回", () => confirmBox("要收回這則訊息嗎？兩邊都會消失。", "收回", () => deleteDoc(doc(db, "messages", id)).catch(() => toast("收回失敗")))] : null,
    ["🗑️", "刪除", () => confirmBox("只會從你的畫面刪除，對方還看得到。", "刪除", () => setDoc(doc(db, "users", LC.me.uid, "hidden", id), { at: Date.now() }).catch(() => toast("刪除失敗")))]
  ].filter(Boolean);
  const sheet = h("div", { class: "sheet" });
  const close = () => { sheet.remove(); menuOpen = false; };
  sheet.onclick = e => { if (e.target === sheet) close(); };
  sheet.append(h("div", { class: "sheetBox" },
    h("div", { class: "sprev" }, LC.who(m.uid) + "：" + pv.slice(0, 80)),
    h("div", { class: "agrid" }, acts.map(a => h("button", { onclick: () => { close(); a[2](); } }, h("span", {}, a[0]), a[1])))));
  document.body.append(sheet);
}
async function copy(t) {
  try { await navigator.clipboard.writeText(t); toast("已複製"); } catch (e) { selectCopy(t); }
}
function selectCopy(t) {
  const pn = panel("選擇並複製");
  const ta = h("textarea", { class: "fld", readonly: "", style: "min-height:50vh;user-select:text;-webkit-user-select:text" });
  ta.value = t;
  pn.body.append(h("p", { class: "hint" }, "長按文字，拖曳選取你要的部分再複製"), ta);
}
async function share(m) {
  try {
    if (m.text || m.sticker) {
      if (navigator.share) await navigator.share({ text: m.text || m.sticker }); else await copy(m.text || m.sticker);
      return;
    }
    let blob, name;
    if (m.img || m.stkImg) { blob = await (await fetch(m.img || m.stkImg)).blob(); name = "photo." + (blob.type.split("/")[1] || "jpg"); }
    else if (m.file) { blob = await (await fetch(await getBlobUrl(m.file))).blob(); name = m.file.name; }
    else return;
    const f = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] });
    else download(URL.createObjectURL(blob), name);
  } catch (e) { if (e.name !== "AbortError") toast("無法分享"); }
}

// ---------- 截圖：選好幾則訊息，變成一張圖 ----------
function startShot(id) {
  const list = LC.list;
  list.classList.add("selecting");
  const picked = new Set([id]);
  const first = LC.els.get(id); if (first) first.classList.add("picked");
  const count = h("span", {});
  const upd = () => { count.textContent = "已選 " + picked.size + " 則"; };
  const onClick = e => {
    const row = e.target.closest(".row"); if (!row) return;
    e.stopPropagation(); e.preventDefault();
    const rid = row.dataset.id;
    if (picked.has(rid)) { picked.delete(rid); row.classList.remove("picked"); } else { picked.add(rid); row.classList.add("picked"); }
    upd();
  };
  list.addEventListener("click", onClick, true);
  let bar;
  const end = () => {
    list.classList.remove("selecting"); list.removeEventListener("click", onClick, true);
    list.querySelectorAll(".picked").forEach(r => r.classList.remove("picked"));
    bar.remove();
  };
  bar = h("div", { class: "shotBar" },
    h("button", { class: "btn ghost", onclick: end }, "取消"), count,
    h("button", { class: "btn", onclick: () => { const rows = Array.from(list.children).filter(r => picked.has(r.dataset.id)); end(); makeShot(rows); } }, "產生截圖"));
  document.body.append(bar); upd();
  toast("點選要截進去的訊息");
}
async function makeShot(rows) {
  if (!rows.length) return;
  toast("截圖中…");
  try {
    if (!window.html2canvas) await new Promise((res, rej) => {
      const s = h("script", { src: "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" });
      s.onload = res; s.onerror = rej; document.head.append(s);
    });
    const box = h("div", { style: "position:fixed;left:-10000px;top:0;width:380px;padding:14px 10px;background:" + getComputedStyle(document.body).backgroundColor });
    rows.forEach(r => { const c = r.cloneNode(true); c.hidden = false; box.append(c); });
    document.body.append(box);
    const canvas = await window.html2canvas(box, { scale: 2, backgroundColor: null });
    box.remove();
    const url = canvas.toDataURL("image/png");
    const pn = panel("截圖");
    pn.body.append(h("img", { src: url, style: "width:100%;border-radius:12px;display:block" }),
      h("div", { class: "row2" },
        h("button", { class: "btn", onclick: () => share({ img: url }) }, "分享"),
        h("button", { class: "btn ghost", onclick: () => download(url, "勳貝的家截圖.png") }, "下載")));
  } catch (e) { toast("截圖失敗"); }
}

// ---------- 表情包 ----------
function stickerImg(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 320 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      let out = c.toDataURL("image/webp", 0.85);
      if (out.indexOf("data:image/webp") !== 0) out = c.toDataURL("image/png");
      res(out);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function stickerPanel() {
  const pick = h("input", { type: "file", accept: "image/*", multiple: "", hidden: "" });
  const pn = panel("我們的表情包", h("button", { onclick: () => pick.click() }, "＋ 上傳"));
  const grid = h("div", { class: "pgrid" });
  pn.body.append(pick, h("p", { class: "hint" }, "上傳的圖片會變成你們兩個都能用的貼圖，去背的 PNG 效果最好。\n在聊天室按 😊 就能用。"), grid);
  pick.onchange = async () => {
    const fs = Array.from(pick.files); pick.value = "";
    for (let i = 0; i < fs.length; i++) {
      toast("上傳中 " + (i + 1) + "/" + fs.length);
      try { await addDoc(collection(db, "stickers"), { img: await stickerImg(fs[i]), uid: LC.me.uid, ts: serverTimestamp() }); }
      catch (e) { toast("有一張上傳失敗"); }
    }
    toast("新增完成");
  };
  pn.onClose(onSnapshot(query(collection(db, "stickers"), orderBy("ts")), snap => {
    grid.replaceChildren.apply(grid, snap.docs.map(d => h("div", { class: "stk" },
      h("img", { src: d.data().img }),
      h("button", { onclick: () => confirmBox("要刪除這個表情包嗎？", "刪除", () => deleteDoc(d.ref)) }, "✕"))));
    if (snap.empty) grid.append(h("p", { class: "empty", style: "grid-column:1/-1" }, "還沒有表情包，按右上角上傳"));
  }, () => toast("讀取失敗")));
}

// ---------- 設定 ----------
function settings() {
  const pn = panel("設定");
  const b = pn.body;

  b.append(h("div", { class: "lbl" }, "對方的暱稱（只有你看得到）"));
  const nk = h("input", { class: "fld", placeholder: "例如：寶貝" }); nk.value = LC.nick;
  b.append(nk, h("button", { class: "btn", onclick: async () => {
    try { await setDoc(doc(db, "users", LC.me.uid, "prefs", "main"), { nick: nk.value.trim().slice(0, 20) }, { merge: true }); toast("已更新暱稱"); }
    catch (e) { toast("儲存失敗"); }
  } }, "儲存暱稱"));

  b.append(h("div", { class: "lbl" }, "在一起的日期（兩個人會一起變）"));
  const dt = h("input", { class: "fld", type: "date" }); dt.value = LC.start;
  b.append(dt, h("button", { class: "btn", onclick: async () => {
    if (!dt.value) return;
    try { await setDoc(doc(db, "settings", "main"), { start: dt.value }, { merge: true }); toast("已更新"); } catch (e) { toast("儲存失敗"); }
  } }, "儲存日期"));

  b.append(h("div", { class: "lbl" }, "主題顏色（兩個人會一起變）"));
  b.append(h("div", { class: "colors" }, LC.COLORS.map((c, i) => h("button", { style: "background:" + c[0], onclick: () => {
    LC.applyColor(i);
    setDoc(doc(db, "settings", "main"), { color: i }, { merge: true }).catch(() => toast("儲存失敗"));
  } }))));

  b.append(h("div", { class: "lbl" }, "表情包"));
  b.append(h("button", { class: "btn ghost", onclick: stickerPanel }, "管理我們的表情包"));

  b.append(h("div", { class: "lbl" }, "小提示"));
  b.append(h("div", { class: "card", style: "cursor:default" }, h("div", { class: "s" },
    "• 長按訊息：回覆、複製、Keep、收回、截圖…\n• 長按「送出」：悄悄傳送，對方不會有提示音\n• 打電話前會先跳確認，不怕誤觸")));

  b.append(h("div", { class: "lbl" }, "帳號"));
  b.append(h("div", { class: "card", style: "cursor:default" }, h("div", { class: "s" }, "目前登入：" + (LC.me.email || ""))));
  b.append(h("button", { class: "btn danger", onclick: () => confirmBox("確定要登出嗎？", "登出", () => LC.signOut()) }, "登出"));
}

window.LCX = { openMenu: openMenu, msgMenu: msgMenu, renderFile: renderFile, sendFile: sendFile, addSticker: stickerPanel };
