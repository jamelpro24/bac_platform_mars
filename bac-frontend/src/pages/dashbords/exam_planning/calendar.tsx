import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Calendar, Users, Save, Upload } from "lucide-react";
import API from "../../../services/api";
import Header from "../../../components/Header";
import "../pagecss/calendor.css";
import { SECTIONS_FIXES } from "../general";

type Jour = { date: string; label: string };

function _sectionKey(n: string): string {
  const words = n.trim().split(/\s+/).map(w => {
    while (true) {
      if (w.startsWith("ال") && w.length > 2) { w = w.slice(2); continue; }
      if (w.startsWith("و")) { w = w.slice(1); continue; }
      break;
    }
    return w;
  }).filter(Boolean);
  return [...new Set(words)].sort().join(" ");
}

type Session = {
  id: number;
  nom: string;
  jours: Jour[];
};

type Section = { id: number; nom: string };
type Matiere = { id: number; nom: string };
type MatiereSectionInfo = { id: number; matiere: number; section: number; heures: number; matiere_nom: string; type: string; section_nom: string };
type Examen = {
  id: number;
  session: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  matiere: number;
  section: number;
};

export default function ExamCalendar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sectionKeyMap, setSectionKeyMap] = useState<Map<string, number[]>>(new Map());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matiereSections, setMatiereSections] = useState<MatiereSectionInfo[]>([]);
  const [examens, setExamens] = useState<Examen[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExamen, setEditingExamen] = useState<Examen | null>(null);
  const [formData, setFormData] = useState({
    session: "",
    date: "",
    heure_debut: "",
    heure_fin: "",
    matiere: "",
    section: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, infoRes, matieresRes, msRes, examensRes] = await Promise.all([
          API.get("sessions/"),
          API.get("general/"),
          API.get("matieres/"),
          API.get("matieres-sections/"),
          API.get("examens/"),
        ]);

        setSessions(sessionsRes.data);

        const rawSections: Section[] = infoRes.data.sections || [];
        const grouped = new Map<string, Section[]>();
        for (const s of rawSections) {
          const key = _sectionKey(s.nom);
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(s);
        }
        // Pick best section per group (prefer SECTIONS_FIXES, else first by id)
        const bestSections: Section[] = [];
        const keyMap = new Map<string, number[]>();
        for (const [key, group] of grouped) {
          let best = group[0];
          for (const s of group) {
            const bestIdx = SECTIONS_FIXES.indexOf(best.nom);
            const curIdx = SECTIONS_FIXES.indexOf(s.nom);
            if (curIdx >= 0 && (bestIdx < 0 || curIdx < bestIdx)) best = s;
          }
          bestSections.push(best);
          keyMap.set(key, group.map(g => g.id));
        }
        bestSections.sort((a, b) => SECTIONS_FIXES.indexOf(a.nom) - SECTIONS_FIXES.indexOf(b.nom));
        setSections(bestSections);
        setSectionKeyMap(keyMap);

        setMatieres(matieresRes.data);
        setMatiereSections(msRes.data);
        setExamens(examensRes.data);

        if (sessionsRes.data.length > 0) setSelectedSession(sessionsRes.data[0].id);
      } catch (err) {
        console.error("Erreur chargement données", err);
        setError("Erreur de chargement des données");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredExamens = examens.filter((ex) => ex.session === selectedSession);

  const getExamsForCell = (date: string, sectionId: number): Examen[] => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return [];
    const key = _sectionKey(sec.nom);
    const groupIds = sectionKeyMap.get(key) || [sectionId];
    return filteredExamens.filter((ex) => ex.date === date && groupIds.includes(ex.section));
  };

  const getDaysInSession = (): Jour[] => {
    if (!selectedSession) return [];
    const session = sessions.find((s) => s.id === selectedSession);
    if (!session?.jours) return [];
    return [...session.jours].sort((a, b) => (a.date < b.date ? -1 : 1));
  };

  const handleCellClick = (date: string, sectionId: number) => {
    setEditingExamen(null);
    const sectionMats = getMatieresForSection(sectionId);
    const firstMat = sectionMats.length > 0 ? sectionMats[0] : null;
    const heureDebut = "08:00";
    let heureFin = "09:00";
    if (firstMat) {
      heureFin = calcHeureFin(heureDebut, firstMat.heures);
    }
    setFormData({
      session: selectedSession?.toString() || "",
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      matiere: firstMat ? firstMat.matiere.toString() : "",
      section: sectionId.toString(),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (
      !formData.session ||
      !formData.date ||
      !formData.heure_debut ||
      !formData.heure_fin ||
      !formData.matiere ||
      !formData.section
    ) {
      setError("جميع الحقول مطلوبة");
      return;
    }
    try {
      if (editingExamen) {
        const response = await API.put(`examens/${editingExamen.id}/`, formData);
        setExamens((prev) =>
          prev.map((e) => (e.id === editingExamen.id ? response.data : e))
        );
        setSuccess("تم تعديل الامتحان بنجاح");
      } else {
        const response = await API.post("examens/", formData);
        setExamens((prev) => [...prev, response.data]);
        setSuccess("تم إضافة الامتحان بنجاح");
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الامتحان؟")) {
      try {
        await API.delete(`examens/${id}/`);
        setExamens((prev) => prev.filter((e) => e.id !== id));
        setSuccess("تم حذف الامتحان بنجاح");
      } catch {
        setError("حدث خطأ أثناء الحذف");
      }
    }
  };

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(""); setError(""); setSuccess("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (selectedSession) form.append("session_id", String(selectedSession));
      const res = await API.post("import-examens/", form);
      const data = res.data;
      const parts = [];
      if (data.created_matieres) parts.push(`${data.created_matieres} مادة`);
      if (data.created_durees) parts.push(`${data.created_durees} مدة`);
      if (data.created_examens) parts.push(`${data.created_examens} امتحان`);
      setImportResult(`✓ ${parts.join("، ") || "لا جديد"}` + (data.total_errors ? ` | ${data.total_errors} خطأ` : ""));
      if (data.errors?.length) setError(data.errors.slice(0, 3).join(" | "));
      const [examensRes, matieresRes, msRes] = await Promise.all([
        API.get("examens/"),
        API.get("matieres/"),
        API.get("matieres-sections/"),
      ]);
      setExamens(examensRes.data);
      setMatieres(matieresRes.data);
      setMatiereSections(msRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "خطأ في الاستيراد");
    }
    setImporting(false);
    e.target.value = "";
  };

  const handleSaveTemplate = async () => {
    setError("");
    setSuccess("");
    try {
      await API.post("template-examens/");
      setSuccess("تم حفظ جدول الامتحانات كقالب");
    } catch {
      setError("فشل حفظ القالب");
    }
  };

  const handleRestoreTemplate = async () => {
    if (!window.confirm("سيتم استبدال جدول الامتحانات الحالي بالقالب المحفوظ. هل أنت متأكد؟")) return;
    setError("");
    setSuccess("");
    try {
      const res = await API.post("template-examens/restore/");
      const count = res.data.restored || 0;
      setSuccess(`تم استيراد ${count} امتحان من القالب`);
      const examensRes = await API.get("examens/");
      setExamens(examensRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "فشل استيراد القالب");
    }
  };

  const _groupIdsForSection = (sectionId: number): number[] => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return [sectionId];
    const key = _sectionKey(sec.nom);
    return sectionKeyMap.get(key) || [sectionId];
  };

  const getMatieresForSection = (sectionId: number) => {
    const groupIds = _groupIdsForSection(sectionId);
    return matiereSections.filter((ms) => groupIds.includes(ms.section));
  };

  const getMatiereDuree = (matiereId: number, sectionId: number): number | null => {
    const groupIds = _groupIdsForSection(sectionId);
    const ms = matiereSections.find((m) => m.matiere === matiereId && groupIds.includes(m.section));
    return ms ? ms.heures : null;
  };

  const calcHeureFin = (heureDebut: string, dureeHeures: number): string => {
    const [h, m] = heureDebut.split(":").map(Number);
    const totalMinutes = h * 60 + m + dureeHeures * 60;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = Math.round(totalMinutes % 60);
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "matiere" && value && next.heure_debut) {
        const duree = getMatiereDuree(Number(value), Number(next.section));
        if (duree) next.heure_fin = calcHeureFin(next.heure_debut, duree);
      }
      if (field === "heure_debut" && value && next.matiere) {
        const duree = getMatiereDuree(Number(next.matiere), Number(next.section));
        if (duree) next.heure_fin = calcHeureFin(value, duree);
      }
      return next;
    });
  };

  const getMatiereNom = (id: number) => {
    const nom = matieres.find((m) => m.id === id)?.nom || "?";
    return nom === "علوم تجريبية" ? "علوم التجريبية" : nom;
  };

  const getSectionNom = (id: number) => {
    const found = sections.find((s) => s.id === id);
    if (found) return found.nom;
    // Check if id is in a dedup group
    for (const ids of sectionKeyMap.values()) {
      if (ids.includes(id)) {
        const kept = sections.find(s => ids.includes(s.id));
        return kept?.nom || "?";
      }
    }
    return "?";
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  const jours = getDaysInSession();

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-container">
        <h1 className="dashboard-title">جدولة الامتحانات</h1>

      {/* Sélecteur de session */}
      <div className="top-cards">
        <div className="card">
          <h3><Calendar size={18} /> الدورة</h3>
          <select
            value={selectedSession ?? ""}
            onChange={(e) => setSelectedSession(Number(e.target.value))}
          >
            {sessions.length === 0 && <option value="">لا توجد دورات</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
          <button
            className="add-session-btn"
            onClick={() => navigate("/dashboarddirecteur/calendrier/sessionmanagement")}
          >
            <Plus size={16} /> إضافة دورة
          </button>
        </div>

        <div className="card">
          <h3><Users size={18} /> الشعب النشطة</h3>
          <div className="sections-list">
            {sections.length === 0 ? (
              <span className="no-sections">لم يتم اختيار أي شعبة — اذهب إلى المعطيات العامة</span>
            ) : (
              sections.map((s) => (
                <span key={s.id} className="section-tag">{s.nom}</span>
              ))
            )}
          </div>
        </div>

        {/* Boutons vers serie et matiere management */}
        <div className="card">
          <h3>إدارة السلاسل والمكونات</h3>
          <div className="action-buttons">
            <button
              className="add-session-btn"
              onClick={() => navigate("/dashboarddirecteur/calendrier/seriemanagement")}
            >
              <Plus size={16} /> إدارة السلاسل
            </button>
            <button
              className="add-session-btn"
              onClick={() => navigate("/dashboarddirecteur/calendrier/matieres")}
            >
              <Plus size={16} /> إدارة المواد
            </button>
          </div>
        </div>

        {/* Boutons template */}
        <div className="card">
          <h3>قالب الجدول</h3>
          <div className="action-buttons">
            <button className="add-session-btn" onClick={handleSaveTemplate}>
              <Save size={16} /> حفظ القالب
            </button>
            <button className="add-session-btn" onClick={handleRestoreTemplate}>
              <Upload size={16} /> استيراد القالب
            </button>
          </div>
        </div>

        {/* Import Excel */}
        <div className="card">
          <h3>استيراد جدول Excel</h3>
          <p style={{fontSize:12,color:"#5f6368",margin:"4px 0 10px"}}>الأعمدة: type | duree | matiere | section | date | heure_debut | heure_fin</p>
          <div className="action-buttons">
            <input type="file" accept=".xlsx,.xls" style={{display:"none"}} id="excel-upload"
              onChange={handleExcelUpload} />
            <button className="add-session-btn" disabled={importing} onClick={() => document.getElementById('excel-upload')!.click()}>
              <Upload size={16} /> {importing ? "جاري الاستيراد..." : "رفع Excel"}
            </button>
          </div>
          {importResult && <p style={{fontSize:13,color:"#166534",marginTop:8}}>{importResult}</p>}
        </div>
      </div>

      {/* Grille calendrier */}
      {sections.length === 0 || jours.length === 0 ? (
        <div className="empty-state">
          <p>يرجى إضافة دورة وشعب من صفحة المعطيات العامة أولاً</p>
        </div>
      ) : (
        <div className="exam-grid">
          <div className="grid-header">
            <div className="corner-cell">الشعبة / اليوم</div>
            {jours.map((jour) => (
              <div key={jour.date} className="day-header">
                <span>{jour.label}</span>
                <small>{jour.date}</small>
              </div>
            ))}
          </div>

          {sections.map((section) => (
            <div key={section.id} className="grid-row">
              <div className="section-cell">{section.nom}</div>
              {jours.map((jour) => {
                const examsInCell = getExamsForCell(jour.date, section.id);
                return (
                  <div
                    key={jour.date}
                    className="exam-cell"
                    onClick={() => handleCellClick(jour.date, section.id)}
                  >
                    {examsInCell.map((ex) => (
                      <div key={ex.id} className="exam-card">
                        <div className="exam-header">
                          <span className="exam-matiere">{getMatiereNom(ex.matiere)}</span>
                          <div className="exam-actions-mini">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExamen(ex);
                                setFormData({
                                  session: ex.session.toString(),
                                  date: ex.date,
                                  heure_debut: ex.heure_debut,
                                  heure_fin: ex.heure_fin,
                                  matiere: ex.matiere.toString(),
                                  section: ex.section.toString(),
                                });
                                setShowModal(true);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ex.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="exam-time">
                          {ex.heure_debut.slice(0, 5)} – {ex.heure_fin.slice(0, 5)}
                        </div>
                      </div>
                    ))}
                    <div className="add-exam-hint">+</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingExamen ? "تعديل امتحان" : "إضافة امتحان"}</h3>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <div className="form-group">
              <label>التاريخ</label>
              <input type="date" value={formData.date} readOnly />
            </div>

            <div className="form-group">
              <label>الشعبة</label>
              <input
                type="text"
                value={getSectionNom(Number(formData.section))}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>المادة</label>
              <select
                value={formData.matiere}
                onChange={(e) => handleFieldChange("matiere", e.target.value)}
              >
                <option value="">-- اختر المادة --</option>
                {getMatieresForSection(Number(formData.section)).map((ms) => (
                  <option key={ms.matiere} value={ms.matiere}>
                    {ms.matiere_nom} ({ms.heures}h)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>من</label>
                <input
                  type="time"
                  value={formData.heure_debut}
                  onChange={(e) => handleFieldChange("heure_debut", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>إلى</label>
                <input
                  type="time"
                  value={formData.heure_fin}
                  onChange={(e) => handleFieldChange("heure_fin", e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="save-btn" onClick={handleSave}>حفظ</button>
              {editingExamen && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDelete(editingExamen.id)}
                >
                  حذف
                </button>
              )}
              <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
