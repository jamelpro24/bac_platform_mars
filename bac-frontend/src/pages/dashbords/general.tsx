import { useEffect, useState } from "react";
import API from "../../services/api";
import "./pagecss/general.css";
import Header from "../../components/Header";

type Section = {
  id: number;
  nom: string;
};

type GeneralData = {
  centre: { id: number; nom: string } | null;
  annee_scolaire: string;
  delegation: string;
  nombre_candidats: number;
  nombre_salles: number;
  sections: Section[];
};

const delegationsList = [
  "تونس 1", "أريانة", "بن عروس", "منوبة",
  "نابل", "زغوان", "بنزرت", "تونس 2",
  "باجة", "جندوبة", "الكاف", "سليانة",
  "سوسة", "المنستير", "المهدية",
  "صفاقس", "القيروان", "القصرين", "سيدي بوزيد",
  "قابس", "مدنين", "تطاوين",
  "قفصة", "توزر", "قبلي"
];

export default function General() {
  const [data, setData] = useState<GeneralData>({
    centre: null,
    annee_scolaire: "",
    delegation: "",
    nombre_candidats: 0,
    nombre_salles: 0,
    sections: []
  });

  const [centreInput, setCentreInput] = useState("");
  const [newSection, setNewSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================= FETCH =================
  const fetchData = async () => {
    try {
      const res = await API.get("general-info/");
      setData(res.data);

      // ✅ نعبّي input فقط إذا centre موجود
      if (res.data.centre) {
        setCentreInput(res.data.centre.nom);
      }
    } catch (err) {
      setError("Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= CREATE CENTRE =================
  const createCentre = async () => {
    if (!centreInput.trim()) return;

    try {
      await API.post("centres/", { nom: centreInput });
      fetchData();
      setSuccess("تم إنشاء المركز");
    } catch (err: any) {
      console.log(err.response?.data);
      setError("Erreur création centre");
    }
  };

  // ================= SAVE =================
  const saveData = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        annee_scolaire: data.annee_scolaire,
        delegation: data.delegation,
        nombre_candidats: data.nombre_candidats,
        nombre_salles: data.nombre_salles
      };

      await API.put("general-info/", payload);

      setSuccess("تم حفظ البيانات بنجاح");
    } catch (err: any) {
      console.log(err.response?.data);
      setError("فشل حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  // ================= SECTIONS =================
  const addSection = async () => {
    if (!newSection.trim()) return;

    try {
      await API.post("sections/", { nom: newSection });
      setNewSection("");
      fetchData();
    } catch (err: any) {
      console.log(err.response?.data);
      setError("Erreur ajout section");
    }
  };

  const removeSection = async (id: number) => {
    try {
      await API.delete(`sections/${id}/`);
      fetchData();
    } catch {
      setError("Erreur suppression");
    }
  };

  // ================= UI =================
  if (loading) return <h2 style={{ textAlign: "center" }}>جاري التحميل...</h2>;

  return (
    <div className="general">
      <Header />

      <div className="dashboard-container">
        <h1 className="dashboard-title">المعطيات العامة</h1>

        <div className="general-grid">

          {/* ✅ CENTRE */}
          <div className="card">
            <h3>مركز الامتحان</h3>

            <input
              type="text"
              value={centreInput}
              disabled={!!data.centre}
              onChange={(e) => setCentreInput(e.target.value)}
            />

            {!data.centre && (
              <button onClick={createCentre}>
                إنشاء المركز
              </button>
            )}
          </div>

          {/* Année */}
          <div className="card">
            <h3>السنة الدراسية</h3>
            <input
              type="text"
              value={data.annee_scolaire}
              onChange={(e) =>
                setData({ ...data, annee_scolaire: e.target.value })
              }
            />
          </div>

          {/* Delegation */}
          <div className="card">
            <h3>الولاية</h3>
            <select
              value={data.delegation}
              onChange={(e) =>
                setData({ ...data, delegation: e.target.value })
              }
            >
              <option value="">-- اختر الولاية --</option>
              {delegationsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Candidats */}
          <div className="card">
            <h3>عدد المترشحين</h3>
            <input
              type="number"
              value={data.nombre_candidats}
              onChange={(e) =>
                setData({
                  ...data,
                  nombre_candidats: Number(e.target.value)
                })
              }
            />
          </div>

          {/* Salles */}
          <div className="card">
            <h3>عدد القاعات</h3>
            <input
              type="number"
              value={data.nombre_salles}
              onChange={(e) =>
                setData({
                  ...data,
                  nombre_salles: Number(e.target.value)
                })
              }
            />
          </div>

          {/* Sections */}
          <div className="card full">
            <h3>الشعب</h3>

            <div className="tags">
              {data.sections.map((s) => (
                <span
                  key={s.id}
                  className="tag"
                  onClick={() => removeSection(s.id)}
                >
                  {s.nom} ✖
                </span>
              ))}
            </div>

            <div className="add-section">
              <input
                type="text"
                placeholder="إضافة شعبة"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
              />
              <button onClick={addSection}>إضافة</button>
            </div>
          </div>

        </div>

        {/* Save */}
        <div className="save-section">
          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          <button
            onClick={saveData}
            disabled={saving}
            className="save-btn"
          >
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      </div>
    </div>
  );
}