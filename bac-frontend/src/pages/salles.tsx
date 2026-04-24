import { useEffect, useState } from "react";
import { FileText, Download, Printer, ChevronDown, ChevronUp, X, CheckCircle, Loader, Clock } from "lucide-react";
import API from "../services/api";


type Matiere = { id: number; nom: string };
type Section = { id: number; nom: string };
type Salle   = { id: number; numero: number };
type Serie   = { id: number; nom: string; section: number; section_nom?: string };

type Examen = {
  id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  matiere: number;
  section: number;
  session: number;
};

type SalleAssignment = {
  salle_id: number;
  series: number[];
};

type GeneratedDoc = {
  doc_id: string;
  label: string;
  type: "presence" | "plan";
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-TN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function fmtTime(t: string) { return t.slice(0, 5); }

export default function DocumentsPage() {
  const [examens,  setExamens]  = useState<Examen[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [salles,   setSalles]   = useState<Salle[]>([]);
  const [series,   setSeries]   = useState<Serie[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const [assignments,    setAssignments]    = useState<SalleAssignment[]>([]);
  const [activeSalle,    setActiveSalle]    = useState<number | null>(null);

  const [layout, setLayout] = useState<"16" | "18">("18");

  // --- Plan de salle ---
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState("");
  const [dlError,    setDlError]    = useState("");
  const [docs,       setDocs]       = useState<GeneratedDoc[]>([]);
  const [showModal,  setShowModal]  = useState(false);

  // --- بطاقات الحضور ---
  const [heure,        setHeure]        = useState("");
  const [presenceDocs, setPresenceDocs] = useState<GeneratedDoc[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [eR, mR, iR, sallR, serR] = await Promise.all([
          API.get("examens/"),
          API.get("matieres/"),
          API.get("general/"),
          API.get("salles/"),
          API.get("series/"),
        ]);
        setExamens(eR.data);
        setMatieres(mR.data);
        setSections(iR.data.sections || []);
        setSalles(sallR.data);
        setSeries(serR.data);
        if (iR.data.layout_preference) setLayout(iR.data.layout_preference);
      } catch { /* ignoré */ }
      finally { setLoading(false); }
    })();
  }, []);

  const getMatiere          = (id: number) => matieres.find(m => m.id === id)?.nom || "?";
  const getSection          = (id: number) => sections.find(s => s.id === id)?.nom || "?";
  const getSeriesForSection = (sectionId: number) => series.filter(s => s.section === sectionId);
  const assignedSerieIds    = assignments.flatMap(a => a.series);

  const selectExamen = (ex: Examen) => {
    setSelectedExamen(ex);
    setAssignments([]);
    setActiveSalle(null);
    setDocs([]);
    setPresenceDocs([]);
    setGenError("");
    setDlError("");
    setHeure(ex.heure_debut ? fmtTime(ex.heure_debut) : "");
  };

  const addSalle = (salleId: number) => {
    if (assignments.find(a => a.salle_id === salleId)) return;
    setAssignments(prev => [...prev, { salle_id: salleId, series: [] }]);
    setActiveSalle(salleId);
  };

  const toggleSerie = (salleId: number, serieId: number) => {
    setAssignments(prev => prev.map(a => {
      if (a.salle_id !== salleId) return a;
      const has = a.series.includes(serieId);
      return { ...a, series: has ? a.series.filter(s => s !== serieId) : [...a.series, serieId] };
    }));
  };

  const removeSalle = (salleId: number) => {
    setAssignments(prev => prev.filter(a => a.salle_id !== salleId));
    if (activeSalle === salleId) setActiveSalle(null);
  };

  // ==================== Génération unifiée ====================
  const generateAll = async () => {
    if (!selectedExamen) return;
    if (assignments.length === 0)                     { setGenError("أضف قاعة واحدة على الأقل"); return; }
    if (assignments.some(a => a.series.length === 0)) { setGenError("كل قاعة يجب أن تحتوي على سلسلة واحدة على الأقل"); return; }

    setGenerating(true); setGenError(""); setDocs([]); setPresenceDocs([]);

    const sallesPayload = assignments.map(a => ({
      salle_id:     a.salle_id,
      salle_numero: salles.find(s => s.id === a.salle_id)?.numero,
      series: a.series.map(sid => {
        const sr = series.find(s => s.id === sid);
        return { id: sid, nom: sr?.nom, section_id: sr?.section };
      }),
    }));

    const [planRes, presRes] = await Promise.allSettled([
      API.post("generate/", {
        examen_id:   selectedExamen.id,
        matiere:     getMatiere(selectedExamen.matiere),
        section:     getSection(selectedExamen.section),
        date:        selectedExamen.date,
        heure_debut: selectedExamen.heure_debut,
        heure_fin:   selectedExamen.heure_fin,
        layout,
        salles:      sallesPayload,
      }),
      API.post("generate-presence/", {
        matiere: getMatiere(selectedExamen.matiere),
        date:    selectedExamen.date,
        heure:   heure || fmtTime(selectedExamen.heure_debut),
        salles:  sallesPayload,
      }),
    ]);

    const planDocs: GeneratedDoc[]  = planRes.status  === "fulfilled" ? (planRes.value.data.documents  || planRes.value.data || []) : [];
    const presDocs: GeneratedDoc[]  = presRes.status  === "fulfilled" ? (presRes.value.data.documents  || [])                        : [];

    const errors: string[] = [];
    if (planRes.status === "rejected") errors.push((planRes.reason as any)?.response?.data?.error || "خطأ في مخطط القاعة");
    if (presRes.status === "rejected") errors.push((presRes.reason as any)?.response?.data?.error || "خطأ في بطاقات الحضور");
    if (errors.length) setGenError(errors.join(" | "));

    setDocs(planDocs);
    setPresenceDocs(presDocs);
    if (planDocs.length || presDocs.length) setShowModal(true);

    setGenerating(false);
  };

  // ==================== Téléchargement ====================
  const download = async (docId: string, label: string) => {
    setDlError("");
    try {
      const res = await API.get(`download/${docId}/`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (res.data.type === "application/json") {
        const text = await (res.data as Blob).text();
        setDlError(JSON.parse(text).error || "خطأ في التحميل");
        return;
      }
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url; link.download = `${label}.docx`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setDlError(`خطأ أثناء التحميل: ${e.response?.status || e.message}`);
    }
  };

  const downloadAll = () => [...docs, ...presenceDocs].forEach(d => download(d.doc_id, d.label));

  const handleLayoutChange = async (value: "16" | "18") => {
    setLayout(value);
    try { await API.put("general/", { layout_preference: value }); } catch { /* silencieux */ }
  };

  const c = {
    card:  { background: "#fff", borderRadius: 16, border: "1px solid #e8eaed", overflow: "hidden" as const },
    hd:    { padding: "1rem 1.25rem", borderBottom: "1px solid #f1f3f4", display: "flex", alignItems: "center", gap: 10 },
    pad:   { padding: "1.25rem" },
    badge: (color: string, bg: string): React.CSSProperties => ({
      background: bg, color, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 600 as const, display: "inline-block",
    }),
    btn: (bg: string, color = "#fff"): React.CSSProperties => ({
      background: bg, color, border: "none", borderRadius: 10, padding: "9px 18px",
      fontSize: 13, fontWeight: 600 as const, cursor: "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
    }),
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, fontFamily: "'Cairo',sans-serif", color: "#1e466e" }}>
      جاري التحميل...
    </div>
  );

  const sallesDisponibles = salles.filter(s => !assignments.find(a => a.salle_id === s.id));
  const seriesForExamen   = selectedExamen ? getSeriesForSection(selectedExamen.section) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fa", padding: "1.5rem", direction: "rtl", fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e466e", margin: 0 }}>إعداد وثائق الامتحانات</h1>
          <p style={{ color: "#5f6368", fontSize: 13, margin: "4px 0 0" }}>بطاقات الحضور · مخطط القاعة</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.25rem", alignItems: "start" }}>

          {/* ==================== COLONNE GAUCHE ==================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Étape 1 : choix examen */}
            <div style={c.card}>
              <div style={c.hd}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1a56db" }}>1</div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>اختر الامتحان</h2>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa" }}>
                      {["التاريخ", "المادة", "الشعبة", "الوقت", ""].map(h => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {examens.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#9aa0a6", fontSize: 13 }}>لا توجد امتحانات</td></tr>
                    ) : examens.map((ex, i) => {
                      const selected = selectedExamen?.id === ex.id;
                      return (
                        <tr key={ex.id}
                          style={{ background: selected ? "#e8f0fe" : i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer", transition: "background .15s" }}
                          onClick={() => selectExamen(ex)}
                          onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#f0f4ff"; }}
                          onMouseLeave={e => { if (!selected) e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"; }}
                        >
                          <td style={{ padding: "10px 12px", fontSize: 12, color: "#202124" }}>{fmtDate(ex.date)}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "#202124" }}>{getMatiere(ex.matiere)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={c.badge("#0f6e56", "#e1f5ee")}>{getSection(ex.section)}</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 12, color: "#5f6368" }}>{fmtTime(ex.heure_debut)} – {fmtTime(ex.heure_fin)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            {selected && <CheckCircle size={16} color="#1a56db" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Étape 2 : salles + séries */}
            {selectedExamen && (
              <div style={c.card}>
                <div style={c.hd}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#b45309" }}>2</div>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0, flex: 1 }}>تعيين القاعات والسلاسل</h2>
                  <span style={c.badge("#166534", "#f0fdf4")}>{getMatiere(selectedExamen.matiere)} — {fmtDate(selectedExamen.date)}</span>
                </div>
                <div style={c.pad}>

                  {/* Layout */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem", padding: "12px 14px", background: "#f8f9fa", borderRadius: 10, border: "1px solid #e8eaed" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>تصميم القاعة:</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["16", "18"] as const).map(v => (
                        <button key={v} onClick={() => handleLayoutChange(v)}
                          style={{
                            padding: "7px 22px", fontSize: 14, fontWeight: 700,
                            borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                            border: `2px solid ${layout === v ? "#1a56db" : "#d1d5db"}`,
                            background: layout === v ? "#1a56db" : "#fff",
                            color: layout === v ? "#fff" : "#374151",
                            transition: "all .2s",
                          }}>
                          {v} مقعد
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: "#9aa0a6", marginRight: "auto" }}>
                      {layout === "16" ? "نموذج 16 مترشح / قاعة" : "نموذج 18 مترشح / قاعة"}
                    </span>
                  </div>

                  {/* Heure pour bطاقات الحضور */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", padding: "10px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
                    <Clock size={15} color="#b45309" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>توقيت بطاقة الحضور:</span>
                    <input
                      type="time"
                      value={heure}
                      onChange={e => setHeure(e.target.value)}
                      style={{ border: "1.5px solid #d1d5db", borderRadius: 8, padding: "5px 10px", fontSize: 13, fontFamily: "inherit", color: "#202124", background: "#fff" }}
                    />
                    <span style={{ fontSize: 11, color: "#9aa0a6" }}>يُستخدم في بطاقات الحضور فقط</span>
                  </div>

                  {/* Boutons ajout salle */}
                  {sallesDisponibles.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: 13, color: "#5f6368", alignSelf: "center" }}>إضافة قاعة:</span>
                      {sallesDisponibles.map(s => (
                        <button key={s.id} onClick={() => addSalle(s.id)}
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 500, background: "#fff", color: "#374151", border: "1.5px dashed #d1d5db", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "#1a56db")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "#d1d5db")}>
                          + قاعة {s.numero}
                        </button>
                      ))}
                    </div>
                  )}

                  {assignments.length === 0 && (
                    <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1.5rem 0" }}>أضف قاعة للبدء</p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {assignments.map(a => {
                      const salle = salles.find(s => s.id === a.salle_id);
                      const open  = activeSalle === a.salle_id;
                      return (
                        <div key={a.salle_id} style={{ border: `1.5px solid ${open ? "#1a56db" : "#e8eaed"}`, borderRadius: 12, overflow: "hidden", transition: "border-color .2s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: open ? "#e8f0fe" : "#f8f9fa", cursor: "pointer" }}
                            onClick={() => setActiveSalle(open ? null : a.salle_id)}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "#202124", flex: 1 }}>قاعة {salle?.numero}</span>
                            <span style={c.badge(a.series.length ? "#166534" : "#9aa0a6", a.series.length ? "#f0fdf4" : "#f1f3f4")}>
                              {a.series.length} سلسلة
                            </span>
                            {open ? <ChevronUp size={16} color="#5f6368" /> : <ChevronDown size={16} color="#5f6368" />}
                            <button onClick={e => { e.stopPropagation(); removeSalle(a.salle_id); }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: 2 }}>
                              <X size={15} />
                            </button>
                          </div>
                          {open && (
                            <div style={{ padding: "12px 14px", display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                              {seriesForExamen.length === 0 ? (
                                <p style={{ color: "#9aa0a6", fontSize: 12 }}>لا توجد سلاسل لهذه الشعبة</p>
                              ) : seriesForExamen.map(sr => {
                                const checked  = a.series.includes(sr.id);
                                const assigned = !checked && assignedSerieIds.includes(sr.id);
                                return (
                                  <button key={sr.id} disabled={assigned}
                                    onClick={() => toggleSerie(a.salle_id, sr.id)}
                                    style={{
                                      padding: "6px 14px", fontSize: 12, fontWeight: 500, borderRadius: 20,
                                      border: `1.5px solid ${checked ? "#1a56db" : assigned ? "#e8eaed" : "#d1d5db"}`,
                                      background: checked ? "#e8f0fe" : "#fff",
                                      color: checked ? "#1a56db" : assigned ? "#c0c4cc" : "#374151",
                                      cursor: assigned ? "not-allowed" : "pointer",
                                      fontFamily: "inherit", opacity: assigned ? 0.5 : 1,
                                    }}>
                                    {checked ? "✓ " : ""}{sr.nom}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================== COLONNE DROITE ==================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Résumé */}
            <div style={c.card}>
              <div style={c.hd}>
                <FileText size={16} color="#1e466e" />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>ملخص</h2>
              </div>
              <div style={c.pad}>
                {!selectedExamen ? (
                  <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>اختر امتحاناً للبدء</p>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.25rem" }}>
                      {[
                        { label: "المادة",  value: getMatiere(selectedExamen.matiere) },
                        { label: "الشعبة",  value: getSection(selectedExamen.section) },
                        { label: "التاريخ", value: fmtDate(selectedExamen.date) },
                        { label: "الوقت",   value: `${fmtTime(selectedExamen.heure_debut)} – ${fmtTime(selectedExamen.heure_fin)}` },
                        { label: "التصميم", value: `${layout} مقعد` },
                        { label: "القاعات", value: `${assignments.length} قاعة` },
                        { label: "السلاسل", value: `${assignedSerieIds.length} سلسلة` },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f1f3f4", paddingBottom: 8 }}>
                          <span style={{ color: "#5f6368" }}>{row.label}</span>
                          <span style={{ fontWeight: 500, color: row.label === "التصميم" ? "#1a56db" : "#202124" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {assignments.map(a => {
                      const salle = salles.find(s => s.id === a.salle_id);
                      return (
                        <div key={a.salle_id} style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>قاعة {salle?.numero}</p>
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                            {a.series.length === 0
                              ? <span style={{ fontSize: 11, color: "#9aa0a6" }}>لا توجد سلاسل</span>
                              : a.series.map(sid => {
                                  const sr = series.find(s => s.id === sid);
                                  return <span key={sid} style={c.badge("#1a56db", "#e8f0fe")}>{sr?.nom}</span>;
                                })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Erreurs */}
                    {genError && (
                      <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c0392b", margin: "0.75rem 0 0" }}>
                        {genError}
                      </div>
                    )}

                    {/* زر واحد لإنشاء جميع الوثائق */}
                    <button onClick={generateAll} disabled={generating}
                      style={{ ...c.btn(generating ? "#9aa0a6" : "#1e466e"), width: "100%", justifyContent: "center", marginTop: "1.25rem", padding: "13px 0", fontSize: 14 }}>
                      {generating
                        ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> جاري الإنشاء...</>
                        : <><Printer size={15} /> إنشاء جميع الوثائق</>}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Légende types de documents */}
            <div style={c.card}>
              <div style={c.hd}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>الوثائق المُنشأة</h2>
              </div>
              <div style={c.pad}>
                {[
                  { icon: "📋", label: "بطاقات الحضور", desc: "قائمة المترشحين لكل قاعة وسلسلة", color: "#e8f0fe" },
                  { icon: "🗺️", label: "مخطط القاعة",   desc: "ترتيب المقاعد وتوزيع السلاسل",   color: "#f0fdf4" },
                ].map(doc => (
                  <div key={doc.label} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f3f4" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: doc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{doc.icon}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>{doc.label}</p>
                      <p style={{ fontSize: 11, color: "#5f6368", margin: "2px 0 0" }}>{doc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== Modal موحّد لجميع الوثائق ==================== */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "2rem", maxWidth: 500, width: "100%", direction: "rtl", fontFamily: "'Cairo',sans-serif", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px" }}>✅</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#202124", margin: "0 0 4px" }}>وثائقك جاهزة للتحميل</h3>
              <p style={{ fontSize: 13, color: "#5f6368", margin: 0 }}>
                {docs.length} مخطط قاعة · {presenceDocs.length} بطاقة حضور
              </p>
            </div>

            {dlError && (
              <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#c0392b", marginBottom: 12 }}>
                {dlError}
              </div>
            )}

            {/* مخططات القاعة */}
            {docs.length > 0 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#5f6368", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>🗺️ مخططات القاعة</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
                  {docs.map(doc => (
                    <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #d1fae5" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>{doc.label}</p>
                        <p style={{ fontSize: 11, color: "#5f6368", margin: "1px 0 0" }}>.docx</p>
                      </div>
                      <button onClick={() => download(doc.doc_id, doc.label)} style={c.btn("#1e466e")}>
                        <Download size={14} /> تحميل
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* بطاقات الحضور */}
            {presenceDocs.length > 0 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#5f6368", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>📋 بطاقات الحضور</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
                  {presenceDocs.map(doc => (
                    <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#e8f0fe", borderRadius: 10, border: "1px solid #c7d7f9" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>{doc.label}</p>
                        <p style={{ fontSize: 11, color: "#5f6368", margin: "1px 0 0" }}>.docx</p>
                      </div>
                      <button onClick={() => download(doc.doc_id, doc.label)} style={c.btn("#0f6e56")}>
                        <Download size={14} /> تحميل
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={downloadAll} style={{ ...c.btn("#1e466e"), flex: 1, justifyContent: "center" }}>
                <Download size={15} /> تحميل الكل ({docs.length + presenceDocs.length})
              </button>
              <button onClick={() => setShowModal(false)} style={{ ...c.btn("#f1f3f4", "#374151"), flex: 1, justifyContent: "center" }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}