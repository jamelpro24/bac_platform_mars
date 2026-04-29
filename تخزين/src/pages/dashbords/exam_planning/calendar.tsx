import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Users, BookOpen } from "lucide-react";
import API from "../../../services/api";
import Header from "../../../components/Header";
import "../pagecss/dashbord.css";
import "../pagecss/calendor.css";
import { SECTIONS_FIXES } from "../general";

type Jour = { date: string; label: string };

type Session = {
  id: number;
  nom: string;
  jours: Jour[];
};

type Section = { id: number; nom: string };
type Matiere = { id: number; nom: string; heures: number };
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
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
        const [sessionsRes, infoRes, matieresRes, examensRes] = await Promise.all([
          API.get("sessions/"),
          API.get("general/"),
          API.get("matieres/"),
          API.get("examens/"),
        ]);

        setSessions(sessionsRes.data);

        const rawSections: Section[] = infoRes.data.sections || [];
        const sorted = [...rawSections].sort(
          (a, b) => SECTIONS_FIXES.indexOf(a.nom) - SECTIONS_FIXES.indexOf(b.nom)
        );
        setSections(sorted);

        setMatieres(matieresRes.data);
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

  const getExamsForCell = (date: string, sectionId: number): Examen[] =>
    filteredExamens.filter((ex) => ex.date === date && ex.section === sectionId);

  const getDaysInSession = (): Jour[] => {
    if (!selectedSession) return [];
    const session = sessions.find((s) => s.id === selectedSession);
    if (!session?.jours) return [];
    return [...session.jours].sort((a, b) => (a.date < b.date ? -1 : 1));
  };

  const handleCellClick = (date: string, sectionId: number) => {
    setEditingExamen(null);
    setFormData({
      session: selectedSession?.toString() || "",
      date,
      heure_debut: "08:00",
      heure_fin: "10:00",
      matiere: "",
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

  const getMatiereNom = (id: number) =>
    matieres.find((m) => m.id === id)?.nom || "?";

  const getSectionNom = (id: number) =>
    sections.find((s) => s.id === id)?.nom || "?";

  if (loading) return <div className="loading">جاري التحميل...</div>;

  const jours = getDaysInSession();

  return (
    <div className="dashboard exam-calendar-page" dir="rtl">
      <Header />
      <div className="dashboard-container exam-calendar-container">
        <div className="exam-calendar-header">
          <h1 className="dashboard-title exam-calendar-title">جدولة الامتحانات</h1>

          <div className="exam-calendar-actions">
            <button className="exam-calendar-back" onClick={() => navigate("/dashboarddirecteur")}>
              <ArrowLeft size={18} />
              <span>الرئيسية</span>
            </button>

            <div className="exam-calendar-actions-group">
              <button
                className="exam-calendar-action exam-calendar-action-series"
                onClick={() => navigate("/dashboarddirecteur/calendrier/seriemanagement")}
              >
                <Users size={18} />
                <span>إدارة السلاسل</span>
              </button>
              <button
                className="exam-calendar-action exam-calendar-action-matieres"
                onClick={() => navigate("/dashboarddirecteur/calendrier/matieres")}
              >
                <BookOpen size={18} />
                <span>إدارة المواد</span>
              </button>
            </div>
          </div>
        </div>

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

            <div className="form-row">
              <div className="form-group">
                <label>من</label>
                <input
                  type="time"
                  value={formData.heure_debut}
                  onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>إلى</label>
                <input
                  type="time"
                  value={formData.heure_fin}
                  onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>المادة</label>
              <select
                value={formData.matiere}
                onChange={(e) => setFormData({ ...formData, matiere: e.target.value })}
              >
                <option value="">-- اختر المادة --</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>الشعبة</label>
              <input
                type="text"
                value={getSectionNom(Number(formData.section))}
                readOnly
              />
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
