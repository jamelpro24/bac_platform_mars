import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import "./pagecss/general.css";

export default function ProfCalendrier() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/dashboardadmin")
    ? "/dashboardadmin/profs"
    : "/dashboarddirecteur/profs";

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-container" dir="rtl">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
          <button onClick={() => navigate(basePath)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, background: "#f1f3f4", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
            ← العودة
          </button>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: "1.5rem" }}>الرزنامة العامة</h1>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p style={{ fontSize: 48, margin: "0 0 1rem" }}>🚧</p>
          <p style={{ fontSize: 16, color: "#64748b" }}>قريباً — جدول الحراسة لكل الأساتذة</p>
        </div>
      </div>
    </div>
  );
}
