import { Link, useLocation } from "react-router-dom";
import {
  Building,
  School,
  Users,
  Calendar,
  ClipboardList,
  FileText,
  Home,
  LogOut,
} from "lucide-react";

type SidebarProps = {
  open: boolean;
};

export default function Sidebar({ open }: SidebarProps) {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/dashboardadmin")
    ? "/dashboardadmin"
    : "/dashboarddirecteur";

  const links = [
    { to: basePath, label: "الرئيسية", icon: <Home size={20} /> },
    { to: `${basePath}/general`, label: "المعطيات العامة", icon: <Building size={20} /> },
     { to: `${basePath}/calendrier`, label: "رزنامة الامتحانات", icon: <ClipboardList size={20} /> },
    { to: `${basePath}/salles`, label: "تصميم القاعات", icon: <School size={20} /> },
    { to: `${basePath}/profs`, label: "الأساتذة", icon: <Users size={20} /> },
   
    { to: `${basePath}/examens`, label: "الامتحانات", icon: <Calendar size={20} /> },
    { to: `${basePath}/surveillance`, label: "الحراسة", icon: <FileText size={20} /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  return (
    <aside className={`sidebar ${open ? "open" : "closed"}`}>
      <div style={{ padding: "20px 10px" }}>
        <h4 style={{ textAlign: "center", marginBottom: "20px", fontFamily: "Almarai" }}>
          المنصة الأكاديمية
        </h4>
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="nav-link"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                direction: "rtl",
              }}
            >
              {link.icon}
              {open && <span>{link.label}</span>}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              direction: "rtl",
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: "16px",
              marginTop: "20px",
            }}
          >
            <LogOut size={20} />
            {open && <span>تسجيل الخروج</span>}
          </button>
        </nav>
      </div>
    </aside>
  );
}
