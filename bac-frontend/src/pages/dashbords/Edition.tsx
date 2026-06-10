import React, { useState } from "react";
import { Download, Edit3, FileText, Loader, UserRound } from "lucide-react";
import API from "../../services/api";

type AgentForm = {
  centre: string;
  agent: string;
  agent2: string;
  fonction: string;
  date_reu: string;
  temp: string;
  nom_admin: string;
};

const initialForm: AgentForm = {
  centre: "",
  agent: "",
  agent2: "",
  fonction: "",
  date_reu: "",
  temp: "",
  nom_admin: "",
};

const Edition: React.FC = () => {
  const [form, setForm] = useState<AgentForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field: keyof AgentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const downloadDocument = async (docId: string, label: string) => {
    const res = await API.get(`download-document/${docId}/`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${label || "agent"}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateAgent = async () => {
    if (!form.agent.trim() || !form.fonction.trim() || !form.date_reu.trim()) {
      setError("الرجاء إدخال اسم العون والصفة والتاريخ.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await API.post("generate-agent/", form);
      await downloadDocument(res.data.doc_id, res.data.label);
      setSuccess("تم إنشاء وتحميل وثيقة العون بنجاح.");
    } catch (err: any) {
      setError(err?.response?.data?.error || "تعذر إنشاء الوثيقة. تحقق من الخادم أو من تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d5dbe3",
    borderRadius: 8,
    padding: "11px 12px",
    fontSize: 15,
    fontFamily: "inherit",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#374151",
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 7,
  };

  return (
    <div className="dashboard-container" dir="rtl" style={{ maxWidth: 1120 }}>
      <div className="page-header" style={{ marginBottom: 18 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Edit3 size={28} />
          الكتابة والتنسيق
        </h1>
        <p>إنشاء وثيقة الأعوان باستعمال نموذج Word: model_agent.docx</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 18, alignItems: "start" }}>
        <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label>
              <span style={labelStyle}>المركز</span>
              <input value={form.centre} onChange={(e) => updateField("centre", e.target.value)} style={fieldStyle} placeholder="يستعمل مركز المستخدم إذا ترك فارغا" />
            </label>

            <label>
              <span style={labelStyle}>الصفة / الخطة</span>
              <input value={form.fonction} onChange={(e) => updateField("fonction", e.target.value)} style={fieldStyle} placeholder="مثال: عون كتابة وتنسيق" />
            </label>

            <label>
              <span style={labelStyle}>العون الأول</span>
              <input value={form.agent} onChange={(e) => updateField("agent", e.target.value)} style={fieldStyle} placeholder="اسم ولقب العون" />
            </label>

            <label>
              <span style={labelStyle}>العون الثاني</span>
              <input value={form.agent2} onChange={(e) => updateField("agent2", e.target.value)} style={fieldStyle} placeholder="اختياري" />
            </label>

            <label>
              <span style={labelStyle}>تاريخ الاجتماع / التكليف</span>
              <input type="date" value={form.date_reu} onChange={(e) => updateField("date_reu", e.target.value)} style={fieldStyle} />
            </label>

            <label>
              <span style={labelStyle}>التوقيت</span>
              <input value={form.temp} onChange={(e) => updateField("temp", e.target.value)} style={fieldStyle} placeholder="مثال: 08:00" />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle}>اسم المدير</span>
              <input value={form.nom_admin} onChange={(e) => updateField("nom_admin", e.target.value)} style={fieldStyle} placeholder="يستعمل اسم المدير من الحساب إذا ترك فارغا" />
            </label>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "#fff5f5", color: "#b42318", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
              {success}
            </div>
          )}

          <button
            onClick={generateAgent}
            disabled={loading}
            style={{
              marginTop: 18,
              width: "100%",
              height: 44,
              border: "none",
              borderRadius: 8,
              background: loading ? "#9aa0a6" : "#1e466e",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            {loading ? <Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={18} />}
            {loading ? "جاري إنشاء الوثيقة..." : "إنشاء وتحميل وثيقة Word"}
          </button>
        </section>

        <aside style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 18 }}>
          <div style={{ width: 54, height: 54, borderRadius: 8, background: "#e8f0fe", color: "#1e466e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <FileText size={28} />
          </div>
          <h2 style={{ margin: "0 0 10px", color: "#1f2937", fontSize: 18 }}>نموذج الأعوان</h2>
          <p style={{ margin: "0 0 14px", color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>
            يتم ملء المتغيرات الموجودة داخل نموذج Word ثم تحميل ملف DOCX جاهز للطباعة.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1e466e", fontWeight: 700, fontSize: 13 }}>
            <UserRound size={17} />
            الحقول من الحساب مثل المندوبية والسنة الدراسية تضاف آليا من الخادم.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Edition;
