import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import API from "../../services/api";
import "./pagecss/general.css";

interface Professeur {
  id: number;
  nom: string;
}

export default function ProfInvitations() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/dashboardadmin")
    ? "/dashboardadmin/profs"
    : "/dashboarddirecteur/profs";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profs, setProfs] = useState<Professeur[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<number | "">("");

  const planIdsJson = localStorage.getItem("current_plan_ids");
  const planIds: number[] = planIdsJson ? JSON.parse(planIdsJson) : [];
  const planId = parseInt(localStorage.getItem("current_plan_id") || "");

  useEffect(() => {
    API.get("professeurs/")
      .then((res) => setProfs(res.data))
      .catch(() => {});
  }, []);

  const downloadBlob = async (payload: any, filename: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await API.post("download-invitations/", payload, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          setError(parsed.error || "فشل تحميل الدعوات");
        } catch {
          setError("فشل تحميل الدعوات");
        }
      } else {
        setError(e.response?.data?.error || e.message || "فشل تحميل الدعوات");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = () => {
    const payload: any = {};
    if (planIds.length > 0) payload.plan_ids = planIds;
    downloadBlob(payload, "invitations_profs.zip");
  };

  const handleDownloadOne = () => {
    if (!selectedProfId) return;
    const prof = profs.find((p) => p.id === selectedProfId);
    const payload: any = { professeur_id: selectedProfId };
    if (planIds.length > 0) payload.plan_ids = planIds;
    downloadBlob(
      payload,
      `invitation_${prof?.nom || selectedProfId}.docx`
    );
  };

  const handleDownloadPdfAll = async () => {
    setLoading(true);
    setError("");
    try {
      const payload: any = {};
      if (planIds.length > 0) payload.plan_ids = planIds;
      const res = await API.post("download-invitations-pdf/", payload, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "invitations_profs.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      if (e.response?.data instanceof Blob) {
        try { const text = await e.response.data.text(); const parsed = JSON.parse(text); setError(parsed.error || "فشل تحميل PDF"); }
        catch { setError("فشل تحميل PDF"); }
      } else {
        setError(e.response?.data?.error || e.message || "فشل تحميل PDF");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-container" dir="rtl">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
          <button onClick={() => navigate(basePath)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, background: "#f1f3f4", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
            ← العودة
          </button>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: "1.5rem" }}>بطاقات الدعوة</h1>
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          {/* Select professor */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              اختر الأستاذ
            </label>
            <select
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: "100%", maxWidth: 400, padding: "10px 14px", fontSize: 14,
                border: "1px solid #d1d5db", borderRadius: 9, fontFamily: "inherit",
                background: "#fff", color: "#374151",
              }}
            >
              <option value="">-- اختر أستاذا --</option>
              {profs.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleDownloadOne}
              disabled={loading || !selectedProfId}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 600,
                background: loading || !selectedProfId ? "#94a3b8" : "#1F4E79",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: loading || !selectedProfId ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "جاري التحميل..." : "تحميل دعوة الأستاذ"}
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={loading}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 600,
                background: loading ? "#94a3b8" : "#047857",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "جاري التحميل..." : "تحميل كل الدعوات (ZIP)"}
            </button>
            <button
              onClick={handleDownloadPdfAll}
              disabled={loading}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 600,
                background: loading ? "#94a3b8" : "#dc2626",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "جاري التحميل..." : "تحميل PDF للطباعة"}
            </button>
          </div>

          {error && (
            <p style={{ color: "#dc2626", fontSize: 14, marginTop: "1rem" }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
