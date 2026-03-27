import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Users } from "lucide-react";
import API from "../../../services/api";
import "../pagecss/calendor.css";

type Jour = { date: string; label: string };

type Session = {
  id: number;
  nom: string;
  jours: Jour[];
};

type Serie = { id: number; nom: string; section: string };
type Matiere = { id: number; nom: string; heures: number };
type Salle = { id: number; numero: number };
type Examen = {
  id: number;
  session: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  matiere: number;
  section: string;      // ← champ ajouté
  // salle et serie ne sont plus utilisés
};

export default function ExamCalendar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [examens, setExamens] = useState<Examen[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExamen, setEditingExamen] = useState<Examen | null>(null);
  const [modalDay, setModalDay] = useState<string>("");
  const [modalSectionName, setModalSectionName] = useState<string>("");
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
        const [sessionsRes, infoRes, seriesRes, matieresRes, sallesRes, examensRes] =
          await Promise.all([
            API.get("sessions/"),
            API.get("general-info/"),
            API.get("series/"),
            API.get("matieres/"),
            API.get("salles/"),
            API.get("examens/"),
          ]);
        setSessions(sessionsRes.data);
        setSections((infoRes.data.sections || []).sort());
        setSeries(seriesRes.data);
        setMatieres(matieresRes.data);
        setSalles(sallesRes.data);
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

  // Récupère les examens pour une date et une section données
  const getExamsForCell = (date: string, sectionName: string): Examen[] => {
    return filteredExamens.filter(
      (ex) => ex.date === date && ex.section === sectionName
    );
  };

  // Récupère les jours de la session sélectionnée (triés par date)
  const getDaysInSession = (): Jour[] => {
    if (!selectedSession) return [];
    const session = sessions.find((s) => s.id === selectedSession);
    if (!session || !session.jours) return [];
    return [...session.jours].sort((a, b) => (a.date < b.date ? -1 : 1));
  };

  const handleCellClick = (date: string, sectionName: string) => {
    setEditingExamen(null);
    setModalDay(date);
    setModalSectionName(sectionName);
    setFormData({
      session: selectedSession?.toString() || "",
      date: date,
      heure_debut: "08:00",
      heure_fin: "10:00",
      matiere: "",
      section: sectionName,   // pré-rempli avec la section de la ligne
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
      } catch (err) {
        setError("حدث خطأ أثناء الحذف");
      }
    }
  };

  const getMatiereNom = (id: number) =>
    matieres.find((m) => m.id === id)?.nom || "?";

  if (loading) return <div className="loading">جاري التحميل...</div>;

  const jours = getDaysInSession();

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="back-button" onClick={() => navigate("/dashboarddirecteur")}>
          <ArrowLeft size={20} />
          <span>الرئيسية</span>
        </button>
        <h1 className="page-title">جدولة الامتحانات</h1>
        <button
          className="manage-series-btn"
          onClick={() => navigate("/dashboarddirecteur/calendrier/seriemanagement")}
        >
          <Users size={20} /> إدارة السلاسل
        </button>
      </div>

      <div className="top-cards">
        <div className="card">
          <h3>
            الدورة <Calendar size={18} />
          </h3>
          <input
            type="text"
            value={
              sessions.find((s) => s.id === selectedSession)?.nom ||
              "يرجى إضافة دورة أولاً"
            }
            readOnly
          />
          <button
            className="add-session-btn"
            onClick={() => navigate("/dashboarddirecteur/calendrier/sessionmanagement")}
          >
            <Plus size={16} /> إضافة دورة
          </button>
        </div>

        <div className="card">
          <h3>
            الشعب <Users size={18} />
          </h3>
          <div className="sections-list">
            {sections.map((s) => (
              <span key={s} className="section-tag">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="exam-grid">
        <div className="grid-header">
          <div className="corner-cell">الشعبة / اليوم</div>
          {jours.map((jour) => (
            <div key={jour.date} className="day-header">
              {jour.label}
            </div>
          ))}
        </div>

        {sections.map((sectionName) => (
          <div key={sectionName} className="grid-row">
            <div className="section-cell">{sectionName}</div>
            {jours.map((jour) => {
              const dateStr = jour.date;
              const examsInCell = getExamsForCell(dateStr, sectionName);
              return (
                <div
                  key={dateStr}
                  className="exam-cell"
                  onClick={() => handleCellClick(dateStr, sectionName)}
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
                              setModalDay(ex.date);
                              setModalSectionName(sectionName);
                              setFormData({
                                session: ex.session.toString(),
                                date: ex.date,
                                heure_debut: ex.heure_debut,
                                heure_fin: ex.heure_fin,
                                matiere: ex.matiere.toString(),
                                section: ex.section,
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
                        {ex.heure_debut.slice(0, 5)} - {ex.heure_fin.slice(0, 5)}
                      </div>
                      {/* Affichage optionnel d'autres détails (ici on n'affiche ni salle ni série) */}
                    </div>
                  ))}
                  <div className="add-exam-hint">+</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingExamen ? "تعديل امتحان" : "إضافة امتحان"}</h3>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
            <form>
              <div className="form-group">
                <label>التاريخ</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  readOnly
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>من</label>
                  <input
                    type="time"
                    value={formData.heure_debut}
                    onChange={(e) =>
                      setFormData({ ...formData, heure_debut: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>إلى</label>
                  <input
                    type="time"
                    value={formData.heure_fin}
                    onChange={(e) =>
                      setFormData({ ...formData, heure_fin: e.target.value })
                    }
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
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>الشعبة</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  readOnly   // la section est déterminée par la ligne cliquée
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="save-btn" onClick={handleSave}>
                  حفظ
                </button>
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}