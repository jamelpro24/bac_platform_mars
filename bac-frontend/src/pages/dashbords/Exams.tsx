import { useEffect, useState } from "react";
import API from "../../services/api";

interface Matiere {
  id: number;
  nom: string;
}

interface Examen {
  id: number;
  matiere: number;
  date: string;
}

export default function Exams() {
  const [examens, setExamens] = useState<Examen[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [form, setForm] = useState({ matiere: "", date: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Matiere form
  const [matiereForm, setMatiereForm] = useState({ nom: "" });
  const [showMatiereForm, setShowMatiereForm] = useState(false);

  const fetchExamens = () => {
    API.get("examens/").then((res) => setExamens(res.data));
  };
  const fetchMatieres = () => {
    API.get("matieres/").then((res) => setMatieres(res.data));
  };

  useEffect(() => {
    fetchExamens();
    fetchMatieres();
  }, []);

  const getMatiereName = (id: number) => matieres.find((m) => m.id === id)?.nom || "-";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { matiere: Number(form.matiere), date: form.date };
    if (editId) {
      await API.put(`examens/${editId}/`, payload);
    } else {
      await API.post("examens/", payload);
    }
    setForm({ matiere: "", date: "" });
    setEditId(null);
    setShowForm(false);
    fetchExamens();
  };

  const handleMatiereSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await API.post("matieres/", { nom: matiereForm.nom });
    setMatiereForm({ nom: "" });
    setShowMatiereForm(false);
    fetchMatieres();
  };

  const handleEdit = (ex: Examen) => {
    setForm({ matiere: String(ex.matiere), date: ex.date });
    setEditId(ex.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await API.delete(`examens/${id}/`);
      fetchExamens();
    }
  };

  return (
    <div className="dashboard-container" dir="rtl">
      <h2 className="dashboard-title">إدارة الامتحانات</h2>

      <div className="d-flex gap-2 mb-3">
        <button
          className="btn btn-success"
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ matiere: "", date: "" }); }}
        >
          {showForm ? "إلغاء" : "إضافة امتحان"}
        </button>
        <button
          className="btn btn-outline-primary"
          onClick={() => setShowMatiereForm(!showMatiereForm)}
        >
          {showMatiereForm ? "إلغاء" : "إضافة مادة"}
        </button>
      </div>

      {showMatiereForm && (
        <form onSubmit={handleMatiereSubmit} className="card p-3 mb-3">
          <h6>إضافة مادة جديدة</h6>
          <div className="row g-3">
            <div className="col-md-8">
              <input className="form-control" placeholder="اسم المادة" value={matiereForm.nom} onChange={(e) => setMatiereForm({ nom: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <button type="submit" className="btn btn-primary w-100">حفظ المادة</button>
            </div>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-3 mb-4">
          <div className="row g-3">
            <div className="col-md-4">
              <select className="form-select" value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} required>
                <option value="">اختر المادة</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <input className="form-control" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="col-md-4">
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
              <th>المادة</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {examens.map((ex, i) => (
              <tr key={ex.id}>
                <td>{i + 1}</td>
                <td>{getMatiereName(ex.matiere)}</td>
                <td>{ex.date}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-1" onClick={() => handleEdit(ex)}>تعديل</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(ex.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {examens.length === 0 && (
              <tr><td colSpan={4} className="text-muted">لا توجد امتحانات بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
