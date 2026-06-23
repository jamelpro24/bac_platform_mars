import { useEffect, useState } from "react";
import API from "../../services/api";
import "./pagecss/general.css";
import Header from "../../components/Header";
import { useNavigate, useLocation } from "react-router-dom";

type Section = {
  id: number;
  nom: string;
};

type GeneralData = {
  centre: string;
  annee_scolaire: string;
  delegation: string;
  nombre_candidats: number;
  nombre_salles: number;
  nom_admin: string;
  sections: Section[];
};

// eslint-disable-next-line react-refresh/only-export-components
export const SECTIONS_FIXES = [
  "الآداب",
  "رياضيات",
  "علوم تجريبية",
  "علوم تقنية",
  "الاقتصاد و التصرف",
  "علوم إعلامية",
  "رياضة",
];

const delegationsList = [
  "تونس 1", "أريانة", "بن عروس", "منوبة",
  "نابل", "زغوان", "بنزرت", "تونس 2",
  "باجة", "جندوبة", "الكاف", "سليانة",
  "سوسة", "المنستير", "المهدية",
  "صفاقس", "القيروان", "القصرين", "سيدي بوزيد",
  "قابس", "مدنين", "تطاوين",
  "قفصة", "توزر", "قبلي"
];

const normalizeText = (text: string) => {
  const words = text.trim().normalize("NFC").split(/\s+/).map(w => {
    while (true) {
      if (w.startsWith("ال") && w.length > 2) { w = w.slice(2); continue; }
      if (w.startsWith("و")) { w = w.slice(1); continue; }
      break;
    }
    return w;
  }).filter(Boolean);
  return [...new Set(words)].sort().join(" ");
};

export default function General() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/dashboardadmin") ? "/dashboardadmin" : "/dashboarddirecteur";
  const [data, setData] = useState<GeneralData>({
    centre: "",
    annee_scolaire: "",
    delegation: "",
    nombre_candidats: 0,
    nombre_salles: 0,
    nom_admin: "",
    sections: []
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    try {
      const response = await API.get("general/");
      setData(response.data);
    } catch (err: any) {
      console.error(err.response?.data);
      setError("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSectionActive = (nom: string) =>
    data.sections.some((s) => normalizeText(s.nom) === normalizeText(nom));

  const toggleSection = async (nom: string) => {
    const existing = data.sections.find(
      (s) => normalizeText(s.nom) === normalizeText(nom)
    );

    if (existing) {
      try {
        await API.delete(`delete-section/${existing.id}/`);
        setData((prev) => ({
          ...prev,
          sections: prev.sections.filter((s) => s.id !== existing.id),
        }));
      } catch {
        setError("خطأ في حذف الشعبة");
      }
    } else {
      try {
        const res = await API.post("add-section/", { nom: normalizeText(nom) });
        setData((prev) => ({
          ...prev,
          sections: [...prev.sections, res.data],
        }));
        setError("");
      } catch (err: any) {
        console.error("Erreur add-section:", err.response?.status, err.response?.data);
        setError(err.response?.data?.error || "خطأ في إضافة الشعبة");
      }
    }
  };

  const saveData = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        annee_scolaire: data.annee_scolaire,
        delegation: data.delegation,
        nombre_candidats: data.nombre_candidats,
        nombre_salles: data.nombre_salles,
        nom_admin: data.nom_admin,
      };
      await API.put("general/", payload);
      setSuccess("تم حفظ البيانات بنجاح");
    } catch (err: any) {
      console.error(err.response?.data);
      setError("فشل حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <h2 style={{ textAlign: "center" }}>جاري التحميل...</h2>;

  return (
    <div className="general">
      <Header />

      <div className="dashboard-container">
        <h1 className="dashboard-title">المعطيات العامة</h1>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <div className="nav-section">
          <h2 className="section-title">الانتقال إلى</h2>
          <div className="nav-buttons">
            <button className="nav-btn" onClick={() => navigate(`${basePath}/calendrier/seriemanagement`)}>
              إدارة السلاسل والقائمة الاسمية
            </button>
          </div>
        </div>

        <div className="general-grid">

          <div className="card">
            <h3>مركز الامتحان</h3>
            <input
              type="text"
              value={data.centre || "لم يتم تحديد المركز"}
              readOnly
            />
          </div>

          <div className="card">
            <h3>رئيس مركز الامتحان</h3>
            <input
              type="text"
              value={data.nom_admin}
              onChange={(e) => setData({ ...data, nom_admin: e.target.value })}
            />
          </div>

          <div className="card">
            <h3>السنة الدراسية</h3>
            <input
              type="text"
              value={data.annee_scolaire}
              onChange={(e) => setData({ ...data, annee_scolaire: e.target.value })}
            />
          </div>

          <div className="card">
            <h3>الولاية</h3>
            <select
              value={data.delegation}
              onChange={(e) => setData({ ...data, delegation: e.target.value })}
            >
              <option value="">-- اختر الولاية --</option>
              {delegationsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="card">
            <h3>عدد المترشحين</h3>
            <input
              type="number"
              value={data.nombre_candidats}
              onChange={(e) => setData({ ...data, nombre_candidats: Number(e.target.value) })}
            />
          </div>

          <div className="card">
            <h3>عدد القاعات</h3>
            <input
              type="number"
              value={data.nombre_salles}
              onChange={(e) => setData({ ...data, nombre_salles: Number(e.target.value) })}
            />
          </div>

          <div className="card full">
            <h3>الشعب</h3>
            <p className="card-hint">انقر على الشعبة لإضافتها أو إزالتها من مركزك</p>

            <div className="sections-toggle-grid">
              {SECTIONS_FIXES.map((nom) => {
                const active = isSectionActive(nom);
                return (
                  <button
                    key={nom}
                    type="button"
                    className={`section-toggle-btn ${active ? "active" : ""}`}
                    onClick={() => toggleSection(nom)}
                  >
                    <span className="section-icon">{active ? "✓" : "+"}</span>
                    {nom}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        <div className="save-section">
          <button onClick={saveData} disabled={saving} className="save-btn">
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      </div>
    </div>
  );
}
