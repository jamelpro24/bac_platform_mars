import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import "./pagecss/general.css";

const cards = [
  {
    title: "قائمة الأساتذة",
    desc: "إضافة، تعديل، حذف واستيراد الأساتذة",
    icon: "👨‍🏫",
    path: "liste",
    color: "#4f46e5",
  },
  {
    title: "برمجة المراقبة",
    desc: "توزيع الأساتذة على قاعات الامتحان",
    icon: "📋",
    path: "surveillance",
    color: "#0891b2",
  },
  {
    title: "بطاقات دعوة",
    desc: "إنشاء واستعراض دعوات الأساتذة",
    icon: "📄",
    path: "invitations",
    color: "#059669",
  },
  {
    title: "الرزنامة العامة",
    desc: "جدول المراقبة لكل الأساتذة",
    icon: "📅",
    path: "calendrier",
    color: "#d97706",
  },
];

export default function ProfsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/dashboardadmin")
    ? "/dashboardadmin/profs"
    : "/dashboarddirecteur/profs";

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-container" dir="rtl">
        <h1 className="dashboard-title">إدارة الأساتذة</h1>
        <div className="general-grid" style={{ marginTop: "2rem" }}>
          {cards.map((c) => (
            <div
              key={c.path}
              className="card"
              style={{ cursor: "pointer", textAlign: "center", padding: "2rem 1.5rem" }}
              onClick={() => navigate(`${basePath}/${c.path}`)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ fontSize: 48, marginBottom: "0.75rem" }}>{c.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: c.color, margin: "0 0 6px" }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
