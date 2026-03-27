import { useEffect, useState } from "react";
import API from "../services/api";

interface Serie {
  id: number;
  numero: string;
  centre: number;
}

interface Centre {
  id: number;
  nom: string;
}

interface Candidat {
  id: number;
  num_ins: string;
  serie: number;
}

export default function Candidats() {
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [form, setForm] = useState({ num_ins: "", serie: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Serie form
  const [serieForm, setSerieForm] = useState({ numero: "", centre: "" });
  const [showSerieForm, setShowSerieForm] = useState(false);

  const fetchCandidats = () => {
    API.get("candidats/").then((res) => setCandidats(res.data));
  };
  const fetchSeries = () => {
    API.get("series/").then((res) => setSeries(res.data));
  };

  useEffect(() => {
    fetchCandidats();
    fetchSeries();
    API.get("centres/").then((res) => setCentres(res.data));
  }, []);

  const getSerieName = (id: number) => series.find((s) => s.id === id)?.numero || "-";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { num_ins: form.num_ins, serie: Number(form.serie) };
    if (editId) {
      await API.put(`candidats/${editId}/`, payload);
    } else {
      await API.post("candidats/", payload);
    }
    setForm({ num_ins: "", serie: "" });
    setEditId(null);
    setShowForm(false);
    fetchCandidats();
  };

  const handleSerieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await API.post("series/", { numero: serieForm.numero, centre: Number(serieForm.centre) });
    setSerieForm({ numero: "", centre: "" });
    setShowSerieForm(false);
    fetchSeries();
  };

  const handleEdit = (c: Candidat) => {
    setForm({ num_ins: c.num_ins, serie: String(c.serie) });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await API.delete(`candidats/${id}/`);
      fetchCandidats();
    }
  };

  return (
    <div className="dashboard-container" dir="rtl">
      <h2 className="dashboard-title">إدارة المترشحين</h2>

      <div className="d-flex gap-2 mb-3">
        <button
          className="btn btn-success"
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ num_ins: "", serie: "" }); }}
        >
          {showForm ? "إلغاء" : "إضافة مترشح"}
        </button>
        <button
          className="btn btn-outline-primary"
          onClick={() => setShowSerieForm(!showSerieForm)}
        >
          {showSerieForm ? "إلغاء" : "إضافة شعبة"}
        </button>
      </div>

      {showSerieForm && (
        <form onSubmit={handleSerieSubmit} className="card p-3 mb-3">
          <h6>إضافة شعبة جديدة</h6>
          <div className="row g-3">
            <div className="col-md-4">
              <input className="form-control" placeholder="رقم الشعبة" value={serieForm.numero} onChange={(e) => setSerieForm({ ...serieForm, numero: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <select className="form-select" value={serieForm.centre} onChange={(e) => setSerieForm({ ...serieForm, centre: e.target.value })} required>
                <option value="">اختر المركز</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <button type="submit" className="btn btn-primary w-100">حفظ الشعبة</button>
            </div>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-3 mb-4">
          <div className="row g-3">
            <div className="col-md-4">
              <input className="form-control" placeholder="رقم التسجيل" value={form.num_ins} onChange={(e) => setForm({ ...form, num_ins: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <select className="form-select" value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} required>
                <option value="">اختر الشعبة</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>{s.numero}</option>
                ))}
              </select>
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
              <th>رقم التسجيل</th>
              <th>الشعبة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {candidats.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td>{c.num_ins}</td>
                <td>{getSerieName(c.serie)}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-1" onClick={() => handleEdit(c)}>تعديل</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {candidats.length === 0 && (
              <tr><td colSpan={4} className="text-muted">لا يوجد مترشحون بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
