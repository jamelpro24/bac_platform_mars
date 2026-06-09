import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import API from "../../services/api";
import "./pagecss/general.css";

type Professeur = { id: number; nom: string; specialite: string };
type SurveillancesItem = { id: number; professeur: number; salle: number; examen: number };

type ProfStat = {
  professeur_id: number;
  nom: string;
  specialite: string;
  count: number;
};

export default function ProfSurveillanceBalance() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/dashboardadmin")
    ? "/dashboardadmin/profs/surveillance"
    : "/dashboarddirecteur/profs/surveillance";

  const [profs, setProfs] = useState<Professeur[]>([]);
  const [surveillances, setSurveillances] = useState<SurveillancesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [survRes, profsRes] = await Promise.all([
          API.get("surveillances/"),
          API.get("professeurs/"),
        ]);
        setSurveillances(survRes.data);
        setProfs(profsRes.data);
      } catch {
        setError("تعذر تحميل جدول التوازن");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo<ProfStat[]>(() => {
    const profMap = new Map<number, Professeur>();
    profs.forEach((p) => profMap.set(p.id, p));

    const countMap = new Map<number, number>();
    surveillances.forEach((s) => {
      countMap.set(s.professeur, (countMap.get(s.professeur) || 0) + 1);
    });

    return Array.from(countMap.entries())
      .map(([profId, count]) => {
        const prof = profMap.get(profId);
        return {
          professeur_id: profId,
          nom: prof?.nom || "غير معروف",
          specialite: prof?.specialite || "-",
          count,
        };
      })
      .sort((a, b) => b.count - a.count || a.nom.localeCompare(b.nom));
  }, [surveillances, profs]);

  const totalAssignments = surveillances.length;

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-container" dir="rtl">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
          <button
            onClick={() => navigate(basePath)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, background: "#f1f3f4", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
          >
            العودة
          </button>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: "1.5rem" }}>
            جدول توازن التعيينات
          </h1>
        </div>

        <div style={{ marginBottom: "1rem", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
          إجمالي {totalAssignments} تعيين حراسة
        </div>

        {loading && (
          <div className="card" style={{ textAlign: "center", padding: "2rem", color: "#1e466e" }}>
            جاري التحميل...
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: "1rem", fontSize: 13, color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="card">
            <div style={{ padding: "1rem 1.25rem", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f1f3f4" }}>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>الأستاذ</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>الاختصاص</th>
                    <th style={{ padding: "8px 10px", textAlign: "center" }}>عدد التعيينات</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((item) => (
                    <tr key={item.professeur_id} style={{ borderBottom: "1px solid #f1f3f4" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{item.nom}</td>
                      <td style={{ padding: "8px 10px", color: "#64748b" }}>{item.specialite}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#1e466e" }}>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
