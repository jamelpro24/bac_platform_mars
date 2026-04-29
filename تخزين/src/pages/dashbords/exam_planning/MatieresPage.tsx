import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import Header from "../../../components/Header";
import "../pagecss/dashbord.css";
import "../pagecss/matieres.css";
const API = "http://localhost:8000/api";

interface Section { id: number; nom: string; }
interface Matiere { id: number; nom: string; }
interface MatiereSection { id: number; matiere: number; matiere_nom?: string; section: number; section_nom: string; heures: number; }
interface LogEntry { id: number; type: "success" | "error" | "info"; message: string; time: string; }

function getToken() { 
  return localStorage.getItem("access") || ""; 
}
function headers() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }

export default function MatieresPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matiereSections, setMatiereSections] = useState<MatiereSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"matieres" | "durees">("matieres");
  const [mForm, setMForm] = useState({ nom: "" });
  const [mEditId, setMEditId] = useState<number | null>(null);
  const [mError, setMError] = useState("");
  const [mSubmitting, setMSubmitting] = useState(false);
  const [msForm, setMsForm] = useState({ matiere: "", section: "", heures: "2" });
  const [msEditId, setMsEditId] = useState<number | null>(null);
  const [msError, setMsError] = useState("");
  const [msSubmitting, setMsSubmitting] = useState(false);
  const [searchM, setSearchM] = useState("");
  const [searchMs, setSearchMs] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [confirmDel, setConfirmDel] = useState<{ type: "m" | "ms"; id: number; nom: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  let logId = 0;

  function addLog(type: LogEntry["type"], message: string) {
    const time = new Date().toLocaleTimeString("ar-TN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [{ id: logId++, type, message, time }, ...prev.slice(0, 39)]);
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rS, rM, rMs] = await Promise.all([
        fetch(`${API}/general/`, { headers: headers() }),
        fetch(`${API}/matieres/`, { headers: headers() }),
        fetch(`${API}/matieres-sections/`, { headers: headers() }),
      ]);
      if (rS.ok) { const d = await rS.json(); setSections(d.sections || []); }
      if (rM.ok) { const d: Matiere[] = await rM.json(); setMatieres(d); addLog("info", `تم تحميل ${d.length} مادة`); }
      if (rMs.ok) { const d: MatiereSection[] = await rMs.json(); setMatiereSections(d); addLog("info", `تم تحميل ${d.length} مدة خاصة`); }
    } catch (e: any) { addLog("error", `خطأ: ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function submitMatiere(e: React.FormEvent) {
    e.preventDefault(); setMError("");
    const nom = mForm.nom.trim();
    if (!nom) { setMError("اسم المادة مطلوب"); return; }
    setMSubmitting(true);
    try {
      const url = mEditId ? `${API}/matieres/${mEditId}/` : `${API}/matieres/`;
      const res = await fetch(url, { method: mEditId ? "PUT" : "POST", headers: headers(), body: JSON.stringify({ nom }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.nom?.[0] || err.detail || `HTTP ${res.status}`); }
      const data: Matiere = await res.json();
      if (mEditId) { setMatieres(prev => prev.map(m => m.id === mEditId ? data : m)); addLog("success", `تم تعديل "${data.nom}"`); }
      else { setMatieres(prev => [...prev, data]); addLog("success", `تمت إضافة "${data.nom}"`); }
      setMForm({ nom: "" }); setMEditId(null);
    } catch (e: any) { setMError(e.message); addLog("error", e.message); }
    finally { setMSubmitting(false); }
  }

  async function deleteMatiere(id: number) {
    setConfirmDel(null);
    try {
      const res = await fetch(`${API}/matieres/${id}/`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const nom = matieres.find(m => m.id === id)?.nom || "";
      setMatieres(prev => prev.filter(m => m.id !== id));
      setMatiereSections(prev => prev.filter(ms => ms.matiere !== id));
      addLog("success", `تم حذف "${nom}"`);
      if (mEditId === id) { setMForm({ nom: "" }); setMEditId(null); }
    } catch (e: any) { addLog("error", e.message); }
  }

  async function submitMs(e: React.FormEvent) {
    e.preventDefault(); setMsError("");
    const matiere = parseInt(msForm.matiere);
    const section = parseInt(msForm.section);
    const heures = parseInt(msForm.heures);
    if (!matiere) { setMsError("اختر مادة"); return; }
    if (!section) { setMsError("اختر شعبة"); return; }
    if (isNaN(heures) || heures < 1) { setMsError("المدة غير صالحة"); return; }
    if (!msEditId) {
      const exists = matiereSections.find(ms => ms.matiere === matiere && ms.section === section);
      if (exists) { setMsError("هذه المادة لديها مدة لهذه الشعبة مسبقاً"); return; }
    }
    setMsSubmitting(true);
    try {
      const url = msEditId ? `${API}/matieres-sections/${msEditId}/` : `${API}/matieres-sections/`;
      const res = await fetch(url, { method: msEditId ? "PUT" : "POST", headers: headers(), body: JSON.stringify({ matiere, section, heures }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || `HTTP ${res.status}`); }
      const data: MatiereSection = await res.json();
      const mNom = matieres.find(m => m.id === matiere)?.nom || "";
      const sNom = sections.find(s => s.id === section)?.nom || "";
      if (msEditId) { setMatiereSections(prev => prev.map(ms => ms.id === msEditId ? data : ms)); addLog("success", `تم تعديل "${mNom}" / "${sNom}" → ${heures}h`); }
      else { setMatiereSections(prev => [...prev, data]); addLog("success", `تمت إضافة "${mNom}" / "${sNom}" — ${heures}h`); }
      setMsForm({ matiere: "", section: "", heures: "2" }); setMsEditId(null);
    } catch (e: any) { setMsError(e.message); addLog("error", e.message); }
    finally { setMsSubmitting(false); }
  }

  async function deleteMs(id: number) {
    setConfirmDel(null);
    try {
      const res = await fetch(`${API}/matieres-sections/${id}/`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ms = matiereSections.find(x => x.id === id);
      const mNom = matieres.find(m => m.id === ms?.matiere)?.nom || "";
      setMatiereSections(prev => prev.filter(x => x.id !== id));
      addLog("success", `تم حذف مدة "${mNom}"`);
      if (msEditId === id) { setMsForm({ matiere: "", section: "", heures: "2" }); setMsEditId(null); }
    } catch (e: any) { addLog("error", e.message); }
  }

  const filteredM = matieres.filter(m => m.nom.toLowerCase().includes(searchM.toLowerCase()));
  const filteredMs = matiereSections.filter(ms => {
    const mNom = matieres.find(m => m.id === ms.matiere)?.nom || "";
    return (mNom.toLowerCase().includes(searchMs.toLowerCase()) || ms.section_nom.toLowerCase().includes(searchMs.toLowerCase()))
      && (filterSection ? ms.section === parseInt(filterSection) : true);
  });

  const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1.5px solid #e8eaed", borderRadius: 9, fontFamily: "inherit", background: "#fafafa", color: "#1a1a2e", outline: "none" };
  const th: React.CSSProperties = { padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#5f6368", background: "#f8f9fa", borderBottom: "1px solid #e8eaed" };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #f1f3f4", color: "#202124" };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid #e8eaed", overflow: "hidden" };

  const logColor = { success: "#1a7f5a", error: "#c0392b", info: "#1a56db" };
  const logBg = { success: "#f0fdf8", error: "#fff5f5", info: "#eff6ff" };

  return (
    <div className="dashboard matieres-page" dir="rtl">
      <Header />
      <div className="dashboard-container matieres-dashboard-container">
        <div className="matieres-page-header">
          <div className="matieres-page-title">
            <h1 className="dashboard-title">إدارة المواد</h1>
            <p className="matieres-page-subtitle">
              {matieres.length} مادة · {matiereSections.length} مدة خاصة
            </p>
          </div>

          <div className="matieres-page-actions">
            <button className="matieres-action matieres-action-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
              <span>رجوع</span>
            </button>
            <button className="matieres-action matieres-action-calendar" onClick={() => navigate("/dashboarddirecteur/calendrier")}>
              <Calendar size={18} />
              <span>الروزنامة</span>
            </button>
            <button className="matieres-action matieres-action-series" onClick={() => navigate("/dashboarddirecteur/calendrier/seriemanagement")}>
              <Users size={18} />
              <span>إدارة السلاسل</span>
            </button>
          </div>
        </div>

        <div className="matieres-container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: "1.5rem" }}>
          {[{ label: "إجمالي المواد", value: matieres.length, color: "#4f46e5" }, { label: "الشعب", value: sections.length, color: "#0891b2" }, { label: "مدد خاصة", value: matiereSections.length, color: "#059669" }].map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: "1rem 1.25rem" }}>
              <p style={{ fontSize: 12, color: "#5f6368", margin: "0 0 4px" }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.25rem", alignItems: "start" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div style={{ display: "flex", background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 4 }}>
              {(["matieres", "durees"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 500, border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", background: tab === t ? "#4f46e5" : "transparent", color: tab === t ? "#fff" : "#5f6368", transition: "all .2s" }}>
                  {t === "matieres" ? "المواد" : "المدد الخاصة"}
                </button>
              ))}
            </div>

            {tab === "matieres" && (
              <div style={card}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f1f3f4" }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>{mEditId ? "✏️ تعديل مادة" : "➕ إضافة مادة"}</h2>
                </div>
                <form onSubmit={submitMatiere} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#5f6368", display: "block", marginBottom: 5 }}>اسم المادة</label>
                    <input style={inp} type="text" value={mForm.nom} onChange={e => setMForm({ nom: e.target.value })} placeholder="مثال: الرياضيات"
                      onFocus={e => (e.target.style.borderColor = "#4f46e5")} onBlur={e => (e.target.style.borderColor = "#e8eaed")} />
                  </div>
                  {mError && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c0392b" }}>{mError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={mSubmitting} style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, background: mEditId ? "#f59e0b" : "#4f46e5", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", opacity: mSubmitting ? 0.7 : 1 }}>
                      {mSubmitting ? "..." : mEditId ? "حفظ" : "إضافة"}
                    </button>
                    {mEditId && <button type="button" onClick={() => { setMEditId(null); setMForm({ nom: "" }); setMError(""); }} style={{ padding: "9px 14px", fontSize: 13, background: "#f1f3f4", color: "#5f6368", border: "1px solid #e8eaed", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>إلغاء</button>}
                  </div>
                </form>
              </div>
            )}

            {tab === "durees" && (
              <div style={card}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f1f3f4" }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>{msEditId ? "✏️ تعديل مدة" : "➕ إضافة مدة خاصة"}</h2>
                </div>
                <form onSubmit={submitMs} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {[{ label: "المادة", key: "matiere", opts: matieres.map(m => ({ id: m.id, nom: m.nom })), ph: "-- اختر مادة --" }, { label: "الشعبة", key: "section", opts: sections.map(s => ({ id: s.id, nom: s.nom })), ph: "-- اختر شعبة --" }].map(({ label, key, opts, ph }) => (
                    <div key={key}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "#5f6368", display: "block", marginBottom: 5 }}>{label}</label>
                      <select value={(msForm as any)[key]} onChange={e => setMsForm({ ...msForm, [key]: e.target.value })} style={inp}
                        onFocus={e => (e.target.style.borderColor = "#059669")} onBlur={e => (e.target.style.borderColor = "#e8eaed")}>
                        <option value="">{ph}</option>
                        {opts.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#5f6368", display: "block", marginBottom: 5 }}>المدة (ساعات)</label>
                    <input style={inp} type="number" min={1} max={10} value={msForm.heures} onChange={e => setMsForm({ ...msForm, heures: e.target.value })}
                      onFocus={e => (e.target.style.borderColor = "#059669")} onBlur={e => (e.target.style.borderColor = "#e8eaed")} />
                  </div>
                  {msError && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c0392b" }}>{msError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={msSubmitting} style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, background: msEditId ? "#f59e0b" : "#059669", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", opacity: msSubmitting ? 0.7 : 1 }}>
                      {msSubmitting ? "..." : msEditId ? "حفظ" : "إضافة"}
                    </button>
                    {msEditId && <button type="button" onClick={() => { setMsEditId(null); setMsForm({ matiere: "", section: "", heures: "2" }); setMsError(""); }} style={{ padding: "9px 14px", fontSize: 13, background: "#f1f3f4", color: "#5f6368", border: "1px solid #e8eaed", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>إلغاء</button>}
                  </div>
                </form>
              </div>
            )}

            <div style={card}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f1f3f4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>سجل العمليات</h2>
                {logs.length > 0 && <button onClick={() => setLogs([])} style={{ fontSize: 11, color: "#9aa0a6", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>مسح</button>}
              </div>
              <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
                {logs.length === 0
                  ? <p style={{ color: "#9aa0a6", fontSize: 12, margin: 0, textAlign: "center", padding: "1rem 0" }}>لا توجد عمليات</p>
                  : logs.map(log => (
                    <div key={log.id} style={{ display: "flex", gap: 7, padding: "6px 9px", borderRadius: 7, background: logBg[log.type], fontSize: 11 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: logColor[log.type], flexShrink: 0, marginTop: 3 }} />
                      <span style={{ flex: 1, color: "#374151", lineHeight: 1.5 }}>{log.message}</span>
                      <span style={{ color: "#9aa0a6", flexShrink: 0 }}>{log.time}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div style={card}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f1f3f4", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f46e5" }} />
                <h3 style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>قائمة المواد</h3>
                <input type="text" placeholder="بحث..." value={searchM} onChange={e => setSearchM(e.target.value)} style={{ ...inp, width: 180 }}
                  onFocus={e => (e.target.style.borderColor = "#4f46e5")} onBlur={e => (e.target.style.borderColor = "#e8eaed")} />
                <button onClick={fetchAll} style={{ padding: "8px 11px", background: "#f1f3f4", border: "1px solid #e8eaed", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>↻</button>
              </div>
              {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "#9aa0a6", fontSize: 13 }}>جاري التحميل...</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["الرقم", "اسم المادة", "عدد الشعب", "الإجراءات"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredM.length === 0
                      ? <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "#9aa0a6", padding: "2rem" }}>{searchM ? "لا نتائج" : "لا توجد مواد"}</td></tr>
                      : filteredM.map((m, i) => {
                        const cnt = matiereSections.filter(ms => ms.matiere === m.id).length;
                        return (
                          <tr key={m.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f0f4ff")}
                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}>
                            <td style={{ ...td, color: "#9aa0a6" }}>#{m.id}</td>
                            <td style={{ ...td, fontWeight: 500 }}>{m.nom}</td>
                            <td style={td}>
                              {cnt > 0
                                ? <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{cnt} شعبة</span>
                                : <span style={{ color: "#d1d5db", fontSize: 11 }}>—</span>}
                            </td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => { setMEditId(m.id); setMForm({ nom: m.nom }); setTab("matieres"); setMError(""); }}
                                  style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f3f4")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>تعديل</button>
                                <button onClick={() => setConfirmDel({ type: "m", id: m.id, nom: m.nom })}
                                  style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, background: "#fff", color: "#c0392b", border: "1px solid #fecaca", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>حذف</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
              <div style={{ padding: "8px 14px", borderTop: "1px solid #f1f3f4", fontSize: 11, color: "#9aa0a6" }}>{filteredM.length} من {matieres.length} مادة</div>
            </div>

            <div style={card}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f1f3f4", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                <h3 style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>المدد الخاصة بكل شعبة</h3>
                <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={{ ...inp, width: 150 }}
                  onFocus={e => (e.target.style.borderColor = "#059669")} onBlur={e => (e.target.style.borderColor = "#e8eaed")}>
                  <option value="">كل الشعب</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                <input type="text" placeholder="بحث..." value={searchMs} onChange={e => setSearchMs(e.target.value)} style={{ ...inp, width: 150 }}
                  onFocus={e => (e.target.style.borderColor = "#059669")} onBlur={e => (e.target.style.borderColor = "#e8eaed")} />
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["المادة", "الشعبة", "المدة", "الإجراءات"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredMs.length === 0
                    ? <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "#9aa0a6", padding: "2rem" }}>{searchMs || filterSection ? "لا نتائج" : "لا توجد مدد مسجلة"}</td></tr>
                    : filteredMs.map((ms, i) => {
                      const mNom = matieres.find(m => m.id === ms.matiere)?.nom || ms.matiere_nom || `#${ms.matiere}`;
                      return (
                        <tr key={ms.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf8")}
                          onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}>
                          <td style={{ ...td, fontWeight: 500 }}>{mNom}</td>
                          <td style={td}><span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{ms.section_nom}</span></td>
                          <td style={td}><span style={{ background: "#fefce8", color: "#854d0e", borderRadius: 20, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{ms.heures}h</span></td>
                          <td style={td}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => { setMsEditId(ms.id); setMsForm({ matiere: String(ms.matiere), section: String(ms.section), heures: String(ms.heures) }); setTab("durees"); setMsError(""); }}
                                style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f1f3f4")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>تعديل</button>
                              <button onClick={() => setConfirmDel({ type: "ms", id: ms.id, nom: `${mNom} / ${ms.section_nom}` })}
                                style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, background: "#fff", color: "#c0392b", border: "1px solid #fecaca", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>حذف</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <div style={{ padding: "8px 14px", borderTop: "1px solid #f1f3f4", fontSize: 11, color: "#9aa0a6" }}>{filteredMs.length} من {matiereSections.length} مدة</div>
            </div>
          </div>
        </div>
      </div>

      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} onClick={() => setConfirmDel(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.75rem", maxWidth: 380, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#fff5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: "1rem" }}>🗑️</div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#202124", margin: "0 0 8px" }}>تأكيد الحذف</h3>
            <p style={{ color: "#5f6368", fontSize: 13, margin: "0 0 1.5rem", lineHeight: 1.7 }}>
              هل أنت متأكد من حذف <strong style={{ color: "#202124" }}>"{confirmDel.nom}"</strong>؟
              {confirmDel.type === "m" && matiereSections.filter(ms => ms.matiere === confirmDel.id).length > 0 && (
                <span style={{ display: "block", marginTop: 6, color: "#c0392b", fontSize: 12 }}>⚠️ سيتم حذف جميع المدد الخاصة بهذه المادة أيضاً.</span>
              )}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => confirmDel.type === "m" ? deleteMatiere(confirmDel.id) : deleteMs(confirmDel.id)}
                style={{ flex: 1, padding: "9px 0", background: "#c0392b", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>حذف</button>
              <button onClick={() => setConfirmDel(null)}
                style={{ flex: 1, padding: "9px 0", background: "#f1f3f4", color: "#5f6368", border: "1px solid #e8eaed", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
