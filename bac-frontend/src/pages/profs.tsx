import { useEffect, useState } from "react";
import API from "../services/api";

interface Centre {
  id: number;
  nom: string;
}

interface Professeur {
  id: number;
  nom: string;
  specialite: string;
  telephone: string;
  centre: number;
}

export default function Profs() {
  const [profs, setProfs] = useState<Professeur[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [form, setForm] = useState({ nom: "", specialite: "", telephone: "", centre: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProfs = () => {
    API.get("professeurs/").then((res) => setProfs(res.data));
  };

  useEffect(() => {
    fetchProfs();
    API.get("centres/").then((res) => setCentres(res.data));
  }, []);

  const getCentreName = (id: number) => centres.find((c) => c.id === id)?.nom || "-";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { nom: form.nom, specialite: form.specialite, telephone: form.telephone, centre: Number(form.centre) };
    if (editId) {
      await API.put(`professeurs/${editId}/`, payload);
    } else {
      await API.post("professeurs/", payload);
    }
    setForm({ nom: "", specialite: "", telephone: "", centre: "" });
    setEditId(null);
    setShowForm(false);
    fetchProfs();
  };

  const handleEdit = (p: Professeur) => {
    setForm({ nom: p.nom, specialite: p.specialite, telephone: p.telephone, centre: String(p.centre) });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await API.delete(`professeurs/${id}/`);
      fetchProfs();
    }
  };

  return (
    <div className="dashboard-container" dir="rtl">
      <h2 className="dashboard-title">إدارة الأساتذة</h2>

      <button
        className="btn btn-success mb-3"
        onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ nom: "", specialite: "", telephone: "", centre: "" }); }}
      >
        {showForm ? "إلغاء" : "إضافة أستاذ جديد"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-3 mb-4">
          <div className="row g-3">
            <div className="col-md-3">
              <input className="form-control" placeholder="الاسم الكامل" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div className="col-md-2">
              <input className="form-control" placeholder="التخصص" value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} required />
            </div>
            <div className="col-md-2">
              <input className="form-control" placeholder="الهاتف" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={form.centre} onChange={(e) => setForm({ ...form, centre: e.target.value })} required>
                <option value="">اختر المركز</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
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
              <th>الاسم</th>
              <th>التخصص</th>
              <th>الهاتف</th>
              <th>المركز</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {profs.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{p.nom}</td>
                <td>{p.specialite}</td>
                <td>{p.telephone}</td>
                <td>{getCentreName(p.centre)}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-1" onClick={() => handleEdit(p)}>تعديل</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {profs.length === 0 && (
              <tr><td colSpan={6} className="text-muted">لا يوجد أساتذة بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
