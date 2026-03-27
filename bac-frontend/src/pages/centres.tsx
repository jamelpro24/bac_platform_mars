import { useEffect, useState } from "react";
import API from "../services/api";
import "../pages/dashbords/pagecss/dashbord.css";

interface Centre {
  id: number;
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
}

export default function Centres() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [form, setForm] = useState({ nom: "", adresse: "", ville: "", telephone: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchCentres = () => {
    API.get("centres/").then((res) => setCentres(res.data));
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await API.put(`centres/${editId}/`, form);
    } else {
      await API.post("centres/", form);
    }
    setForm({ nom: "", adresse: "", ville: "", telephone: "" });
    setEditId(null);
    setShowForm(false);
    fetchCentres();
  };

  const handleEdit = (c: Centre) => {
    setForm({ nom: c.nom, adresse: c.adresse, ville: c.ville, telephone: c.telephone });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await API.delete(`centres/${id}/`);
      fetchCentres();
    }
  };

  return (
    <div className="dashboard-container" dir="rtl">
      <h2 className="dashboard-title">إدارة المراكز</h2>

      <button
        className="btn btn-success mb-3"
        onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ nom: "", adresse: "", ville: "", telephone: "" }); }}
      >
        {showForm ? "إلغاء" : "إضافة مركز جديد"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-3 mb-4">
          <div className="row g-3">
            <div className="col-md-3">
              <input className="form-control" placeholder="اسم المركز" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div className="col-md-3">
              <input className="form-control" placeholder="العنوان" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div className="col-md-2">
              <input className="form-control" placeholder="المدينة" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
            </div>
            <div className="col-md-2">
              <input className="form-control" placeholder="الهاتف" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100">
                {editId ? "تحديث" : "حفظ"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card p-3">
        <table className="table table-bordered table-hover text-center">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>اسم المركز</th>
              <th>العنوان</th>
              <th>المدينة</th>
              <th>الهاتف</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {centres.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td>{c.nom}</td>
                <td>{c.adresse}</td>
                <td>{c.ville}</td>
                <td>{c.telephone}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-1" onClick={() => handleEdit(c)}>تعديل</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {centres.length === 0 && (
              <tr><td colSpan={6} className="text-muted">لا توجد مراكز بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
