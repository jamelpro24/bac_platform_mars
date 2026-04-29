import { useEffect, useState } from "react";
import API from "../services/api";

interface Professeur {
  id: number;
  nom: string;
}

interface Salle {
  id: number;
  numero: string;
}

interface Examen {
  id: number;
  matiere: number;
  date: string;
}

interface Matiere {
  id: number;
  nom: string;
}

interface SurveillanceItem {
  id: number;
  professeur: number;
  salle: number;
  examen: number;
}

export default function Surveillance() {
  const [surveillances, setSurveillances] = useState<SurveillanceItem[]>([]);
  const [profs, setProfs] = useState<Professeur[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [examens, setExamens] = useState<Examen[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [form, setForm] = useState({ professeur: "", salle: "", examen: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchSurveillances = () => {
    API.get("surveillances/").then((res) => setSurveillances(res.data));
  };

  useEffect(() => {
    fetchSurveillances();
    API.get("professeurs/").then((res) => setProfs(res.data));
    API.get("salles/").then((res) => setSalles(res.data));
    API.get("examens/").then((res) => setExamens(res.data));
    API.get("matieres/").then((res) => setMatieres(res.data));
  }, []);

  const getProfName = (id: number) => profs.find((p) => p.id === id)?.nom || "-";
  const getSalleNum = (id: number) => salles.find((s) => s.id === id)?.numero || "-";
  const getExamenLabel = (id: number) => {
    const ex = examens.find((e) => e.id === id);
    if (!ex) return "-";
    const mat = matieres.find((m) => m.id === ex.matiere);
    return `${mat?.nom || "-"} (${ex.date})`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { professeur: Number(form.professeur), salle: Number(form.salle), examen: Number(form.examen) };
    if (editId) {
      await API.put(`surveillances/${editId}/`, payload);
    } else {
      await API.post("surveillances/", payload);
    }
    setForm({ professeur: "", salle: "", examen: "" });
    setEditId(null);
    setShowForm(false);
    fetchSurveillances();
  };

  const handleEdit = (s: SurveillanceItem) => {
    setForm({ professeur: String(s.professeur), salle: String(s.salle), examen: String(s.examen) });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await API.delete(`surveillances/${id}/`);
      fetchSurveillances();
    }
  };

  return (
    <div className="dashboard-container" dir="rtl">
      <h2 className="dashboard-title">إدارة الحراسة</h2>

      <button
        className="btn btn-success mb-3"
        onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ professeur: "", salle: "", examen: "" }); }}
      >
        {showForm ? "إلغاء" : "إضافة حراسة جديدة"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-3 mb-4">
          <div className="row g-3">
            <div className="col-md-3">
              <select className="form-select" value={form.professeur} onChange={(e) => setForm({ ...form, professeur: e.target.value })} required>
                <option value="">اختر الأستاذ</option>
                {profs.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={form.salle} onChange={(e) => setForm({ ...form, salle: e.target.value })} required>
                <option value="">اختر القاعة</option>
                {salles.map((s) => (
                  <option key={s.id} value={s.id}>{s.numero}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={form.examen} onChange={(e) => setForm({ ...form, examen: e.target.value })} required>
                <option value="">اختر الامتحان</option>
                {examens.map((ex) => {
                  const mat = matieres.find((m) => m.id === ex.matiere);
                  return (
                    <option key={ex.id} value={ex.id}>{mat?.nom || "-"} ({ex.date})</option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-primary w-100">{editId ? "تحديث" : "حفظ"}</button>
            </div>
          </div>
        </form>
      )}

      <div className="card p-3">
        <table className="table table-bordered table-hover text-center">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>الأستاذ</th>
              <th>القاعة</th>
              <th>الامتحان</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {surveillances.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td>{getProfName(s.professeur)}</td>
                <td>{getSalleNum(s.salle)}</td>
                <td>{getExamenLabel(s.examen)}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-1" onClick={() => handleEdit(s)}>تعديل</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {surveillances.length === 0 && (
              <tr><td colSpan={5} className="text-muted">لا توجد حراسات بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
