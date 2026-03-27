import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import API from "../../../services/api";
import "../pagecss/session.css";

type Jour = {
  date: string;
  label: string;
};

type Session = {
  id: number;
  nom: string;
  jours: Jour[];
};

export default function SessionsManagement() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const [formData, setFormData] = useState({ nom: "الرئيسية" });
  const [selectedDays, setSelectedDays] = useState<Jour[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ===== FETCH SESSIONS =====
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await API.get("sessions/");
      setSessions(res.data);
    } catch {
      setError("فشل تحميل الدورات");
    } finally {
      setLoading(false);
    }
  };

  // ===== FORMAT DATE ARABIC =====
  const formatDateAr = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
    const months = ["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // ===== HANDLE DAY CLICK =====
  const handleDateClick = (dateStr: string) => {
    if (selectedDays.find(d => d.date === dateStr)) return;

    const maxDays = formData.nom === "الرئيسية" ? 6 : 4;
    if (selectedDays.length >= maxDays) return alert(`أقصى ${maxDays} أيام`);

    const newDay: Jour = { date: dateStr, label: formatDateAr(dateStr) };
    setSelectedDays(prev => [newDay, ...prev]);
  };

  // ===== REMOVE DAY =====
  const removeDay = (date: string) => {
    setSelectedDays(prev => prev.filter(d => d.date !== date));
  };

  // ===== OPEN FORM =====
  const resetForm = () => {
    setFormData({ nom: "الرئيسية" });
    setSelectedDays([]);
    setEditingSession(null);
    setError("");
    setSuccess("");
  };

  const openAddForm = () => resetForm() || setShowForm(true);

  const openEditForm = (session: Session) => {
    setEditingSession(session);
    setFormData({ nom: session.nom });
    setSelectedDays(session.jours || []);
    setShowForm(true);
  };

  // ===== SAVE =====
  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (selectedDays.length === 0) return setError("يرجى اختيار الأيام");

    const maxDays = formData.nom === "الرئيسية" ? 6 : 4;
    if (selectedDays.length !== maxDays)
      return setError(`${formData.nom} يجب أن تحتوي على ${maxDays} أيام`);

    try {
      if (editingSession) {
        const res = await API.put(`sessions/${editingSession.id}/`, {
          nom: formData.nom,
          jours: selectedDays
        });

        setSessions(prev =>
          prev.map(s => (s.id === editingSession.id ? res.data : s))
        );

        setSuccess("تم التعديل بنجاح");
      } else {
        const res = await API.post("sessions/", {
          nom: formData.nom,
          jours: selectedDays
        });

        setSessions(prev => [res.data, ...prev]);

        setSuccess("تمت الإضافة بنجاح");
      }

      setShowForm(false);
      resetForm();
    } catch {
      setError("خطأ أثناء الحفظ");
    }
  };

  // ===== DELETE =====
  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;

    try {
      await API.delete(`sessions/${id}/`);
      setSessions(prev => prev.filter(s => s.id !== id));
      setSuccess("تم الحذف بنجاح");
    } catch {
      setError("خطأ أثناء الحذف");
    }
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="sessions-container">

      {/* HEADER */}
      <div className="sessions-header">
        <button onClick={() => navigate("/dashboarddirecteur/calendrier")}>
          <ArrowLeft size={18} /> رجوع         </button>

        <h1>إدارة الدورات</h1>

        <button onClick={openAddForm}>
          <Plus size={18} /> إضافة
        </button>
      </div>

      {/* ALERTS */}
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {/* FORM */}
      {showForm && (
        <div className="form-card">

          <h3>{editingSession ? "تعديل دورة" : "إضافة دورة"}</h3>

          <div className="form-group">
            <label>نوع الدورة</label>
            <select
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            >
              <option value="الرئيسية">الرئيسية</option>
              <option value="المراقبة">المراقبة</option> {/* Correction ici */}
            </select>
          </div>

          {/* CALENDAR */}
          <div className="calendar-section">
            <h3>📅 اختر الأيام</h3>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="ar"
              direction="rtl"
              height="400px"
              dateClick={(info) => handleDateClick(info.dateStr)}
            />
          </div>

          {/* SELECTED DAYS */}
          <div className="selected-days">
            <h3>📌 الأيام المختارة</h3>
            {selectedDays.length === 0 ? (
              <p>لا يوجد أيام</p>
            ) : (
              <div className="days-list">
                {selectedDays.map((d, i) => (
                  <div key={i} className="day-item">
                    {d.label} <button onClick={() => removeDay(d.date)}>❌</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FORM ACTIONS */}
          <div className="form-actions">
            <button onClick={handleSave}>حفظ</button>
            <button onClick={() => setShowForm(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="table-card">
        <h3>قائمة الدورات</h3>
        <table className="sessions-table">
          <thead>
            <tr>
              <th>النوع</th>
              <th>الأيام المختارة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={3}>لا توجد بيانات</td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.nom}</td>
                  <td>
                    {s.jours?.map((j, i) => (
                      <div key={i}>{j.label}</div>
                    ))}
                  </td>
                  <td>
                    <button onClick={() => openEditForm(s)}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(s.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}