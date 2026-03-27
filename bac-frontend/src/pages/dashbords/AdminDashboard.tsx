import { useEffect, useState } from "react";
import API from "../../services/api";
import { Building, School, Users, ClipboardList, Calendar, FileText } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    centres: 0,
    salles: 0,
    professeurs: 0,
    candidats: 0,
    examens: 0,
    surveillances: 0,
  });

  useEffect(() => {
    Promise.all([
      API.get("centres/"),
      API.get("salles/"),
      API.get("professeurs/"),
      API.get("candidats/"),
      API.get("examens/"),
      API.get("surveillances/"),
    ]).then(([c, s, p, ca, ex, su]) => {
      setStats({
        centres: c.data.length,
        salles: s.data.length,
        professeurs: p.data.length,
        candidats: ca.data.length,
        examens: ex.data.length,
        surveillances: su.data.length,
      });
    });
  }, []);

  const cards = [
    { label: "المراكز", value: stats.centres, icon: <Building size={32} />, color: "#1e9e57" },
    { label: "القاعات", value: stats.salles, icon: <School size={32} />, color: "#3b82f6" },
    { label: "الأساتذة", value: stats.professeurs, icon: <Users size={32} />, color: "#f59e0b" },
    { label: "المترشحون", value: stats.candidats, icon: <ClipboardList size={32} />, color: "#8b5cf6" },
    { label: "الامتحانات", value: stats.examens, icon: <Calendar size={32} />, color: "#ef4444" },
    { label: "الحراسات", value: stats.surveillances, icon: <FileText size={32} />, color: "#06b6d4" },
  ];

  return (
    <div dir="rtl" style={{ padding: "30px" }}>
      <h2 style={{ marginBottom: "30px", fontFamily: "Almarai" }}>لوحة تحكم المشرف</h2>
      <div className="row g-4">
        {cards.map((card) => (
          <div className="col-md-4 col-sm-6" key={card.label}>
            <div
              className="card p-4 text-center"
              style={{
                borderTop: `4px solid ${card.color}`,
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ color: card.color, marginBottom: "10px" }}>{card.icon}</div>
              <h3 style={{ fontSize: "2rem", fontWeight: "bold", color: "#333" }}>{card.value}</h3>
              <p style={{ color: "#666", fontSize: "1.1rem" }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
