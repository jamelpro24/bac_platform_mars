import { useEffect, useState } from "react";
import API from "../services/api";
import "../pages/dashbords/pagecss/dashbord.css";
import "../pages/dashbords/pagecss/profs.css";

interface Professeur {
  id: number;
  identifiant_unique: string;
  nom: string;
  specialite: string;
  institution: string;
  telephone: string;
  centre: number | string;
  centre_name?: string;
}

interface ImportPreview {
  identifiant_unique: string;
  nom: string;
  specialite: string;
  institution: string;
}

interface ImportResponse {
  message: string;
  created: number;
  updated: number;
  total: number;
  preview: ImportPreview[];
}

export default function Profs() {
  const [profs, setProfs] = useState<Professeur[]>([]);
  const [form, setForm] = useState({
    identifiant_unique: "",
    nom: "",
    specialite: "",
    institution: "",
    centre: "",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingImport, setLoadingImport] = useState(false);

  const fetchProfs = () => {
    API.get("professeurs/").then((res) => setProfs(res.data));
  };

  useEffect(() => {
    fetchProfs();
  }, []);

  const resetForm = () => {
    setForm({
      identifiant_unique: "",
      nom: "",
      specialite: "",
      institution: "",
      centre: "",
    });
    setEditId(null);
    setShowForm(false);
  };

  const getCentreName = (prof: Professeur) => prof.centre_name || String(prof.centre || "-");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const payload = {
      identifiant_unique: form.identifiant_unique,
      nom: form.nom,
      specialite: form.specialite,
      institution: form.institution,
      centre: form.centre,
    };

    if (editId) {
      await API.put(`professeurs/${editId}/`, payload);
    } else {
      await API.post("professeurs/", payload);
    }

    resetForm();
    fetchProfs();
  };

  const handleEdit = (p: Professeur) => {
    setForm({
      identifiant_unique: p.identifiant_unique || "",
      nom: p.nom,
      specialite: p.specialite,
      institution: p.institution || "",
      centre: p.centre_name || String(p.centre || ""),
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الأستاذ؟")) {
      await API.delete(`professeurs/${id}/`);
      fetchProfs();
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      setErrorMessage("يرجى اختيار ملف PDF.");
      return;
    }

    setLoadingImport(true);
    setErrorMessage("");
    setImportResult(null);

    const data = new FormData();
    data.append("file", pdfFile);
    if (form.centre.trim()) {
      data.append("centre", form.centre.trim());
    }

    try {
      const res = await API.post<ImportResponse>("professeurs/import-pdf/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      setPdfFile(null);
      fetchProfs();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || "فشل استيراد ملف PDF.");
    } finally {
      setLoadingImport(false);
    }
  };

  const handleTextImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      setErrorMessage("يرجى لصق النص الخاص بقائمة الأساتذة.");
      return;
    }

    setLoadingImport(true);
    setErrorMessage("");
    setImportResult(null);

    try {
      const payload = {
        text: importText,
        centre: form.centre.trim(),
      };
      const res = await API.post<ImportResponse>("professeurs/import-text/", payload);
      setImportResult(res.data);
      setImportText("");
      fetchProfs();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || "فشل استيراد النص.");
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="dashboard-container profs-page" dir="rtl">
      <h2 className="dashboard-title">إدارة الأساتذة</h2>

      <div className="card p-3 mb-4 profs-section-card">
        <div className="profs-intro mb-3">
          <h5 className="mb-1">استيراد PDF</h5>
          <p className="text-muted mb-0">
            سيتم استخراج الأعمدة التالية: المعرف الوحيد، الاسم واللقب، مادة التدريس، المؤسسة.
          </p>
        </div>

        <form onSubmit={handleImport}>
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label d-block">ملف PDF</label>
              <label className="btn w-100 profs-upload-button">
                اختيار ملف
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  hidden
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
              </label>
              <div className="form-text text-truncate profs-filename">
                {pdfFile?.name || "لم يتم اختيار أي ملف"}
              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label">المركز</label>
              <input
                className="form-control"
                placeholder="اكتب اسم المركز"
                value={form.centre}
                onChange={(e) => setForm({ ...form, centre: e.target.value })}
              />
            </div>

            <div className="col-md-3">
              <button type="submit" className="btn btn-primary w-100 profs-primary-btn" disabled={loadingImport}>
                {loadingImport ? "جاري الاستيراد..." : "استيراد PDF"}
              </button>
            </div>
          </div>
        </form>

        <hr className="my-4" />

        <form onSubmit={handleTextImport}>
          <div className="mb-3">
            <label className="form-label">لصق نص الوثيقة</label>
            <textarea
              className="form-control"
              rows={8}
              placeholder="ألصق هنا النص المستخرج من ملف PDF..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>

          <div className="d-flex justify-content-end">
            <button type="submit" className="btn btn-outline-primary profs-outline-btn" disabled={loadingImport}>
              {loadingImport ? "جاري الاستيراد..." : "استيراد النص"}
            </button>
          </div>
        </form>

        {errorMessage && <div className="alert alert-danger mt-3 mb-0">{errorMessage}</div>}

        {importResult && (
          <div className="mt-3">
            <div className="alert alert-success mb-3">{importResult.message}</div>
            {importResult.preview.length > 0 && (
              <div className="table-responsive profs-table-wrap">
                <table className="table table-bordered table-sm text-center profs-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المعرف الوحيد</th>
                      <th>الاسم واللقب</th>
                      <th>مادة التدريس</th>
                      <th>المؤسسة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.preview.map((item, index) => (
                      <tr key={`${item.identifiant_unique}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{item.identifiant_unique}</td>
                        <td>{item.nom}</td>
                        <td>{item.specialite}</td>
                        <td>{item.institution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        className="btn btn-success mb-3 profs-primary-btn"
        onClick={() => {
          setShowForm(!showForm);
          if (showForm) {
            resetForm();
          } else {
            setEditId(null);
            setForm({
              identifiant_unique: "",
              nom: "",
              specialite: "",
              institution: "",
              centre: "",
            });
          }
        }}
      >
        {showForm ? "إلغاء" : "إضافة أستاذ"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-3 mb-4 profs-form-card">
          <div className="row g-3">
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="المعرف الوحيد"
                value={form.identifiant_unique}
                onChange={(e) => setForm({ ...form, identifiant_unique: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="الاسم واللقب"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="مادة التدريس"
                value={form.specialite}
                onChange={(e) => setForm({ ...form, specialite: e.target.value })}
                required
              />
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="المؤسسة"
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
              />
            </div>
            <div className="col-md-1">
              <input
                className="form-control"
                placeholder="المركز"
                value={form.centre}
                onChange={(e) => setForm({ ...form, centre: e.target.value })}
              />
            </div>
            <div className="col-md-1">
              <button type="submit" className="btn btn-primary w-100 profs-primary-btn">
                {editId ? "تحديث" : "حفظ"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card p-3 profs-form-card">
        <div className="table-responsive profs-table-wrap">
          <table className="table table-bordered table-hover text-center profs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المعرف الوحيد</th>
                <th>الاسم واللقب</th>
                <th>مادة التدريس</th>
                <th>المؤسسة</th>
                <th>المركز</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {profs.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.identifiant_unique || "-"}</td>
                  <td>{p.nom}</td>
                  <td>{p.specialite}</td>
                  <td>{p.institution || "-"}</td>
                  <td>{getCentreName(p)}</td>
                  <td>
                    <button className="btn btn-sm btn-warning me-1" onClick={() => handleEdit(p)}>
                      تعديل
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
              {profs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted profs-empty">
                    لا يوجد أساتذة مسجلون حاليا.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}