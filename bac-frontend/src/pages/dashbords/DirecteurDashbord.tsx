import React from "react";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import "./pagecss/dashbord.css";

import {
  Building,
  Calendar,
  School,
  Users,
  Award,
  BookOpen,
  FileText,
  Edit3
} from "lucide-react";

const DirecteurDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-container">
        <h1 className="dashboard-title">لوحة التحكم</h1>
        
        <div className="cards">
          <div className="card" onClick={() => navigate("general", { replace: false })}>
            <Building size={40} className="icon green" />
            <h3>معطيات عامة</h3>
            <p>إدارة البيانات الأساسية</p>
          </div>

          <div className="card" onClick={() => navigate("calendrier", { replace: false })}>
            <Calendar size={40} className="icon blue" />
            <h3>رزنامة الامتحانات </h3>
            <p>تنظيم الامتحانات (توقيت و سلاسل)</p>
          </div>

          <div className="card" onClick={() => navigate("salles")}>
            <School size={40} className="icon orange" />
            <h3>تحضير وثائق</h3>
            <p> تصميم القاعات و بطاقات الحضور </p>
          </div>

          <div className="card" onClick={() => navigate("profs")}>
            <Users size={40} className="icon purple" />
            <h3>الأساتذة</h3>
            <p>برمجة الأساتذة</p>
          </div>

          <div className="card" onClick={() => navigate("badges")}>
            <Award size={40} className="icon gold" />
            <h3>الشارات</h3>
            <p>إدارة شارات و علامات المترشحين</p>
          </div>

          <div className="card" onClick={() => navigate("matieres-optionnelles")}>
            <BookOpen size={40} className="icon teal" />
            <h3>المواد الاختيارية</h3>
            <p>إدارة المواد الاختيارية</p>
          </div>

          <div className="card" onClick={() => navigate("edition")}>
            <Edit3 size={40} className="icon pink" />
            <h3>الكتابة والتنسيق</h3>
            <p>تنسيق و طباعة الوثائق</p>
          </div>

          <div className="card" onClick={() => navigate("rapports")}>
            <FileText size={40} className="icon red" />
            <h3>التقارير اليومية</h3>
            <p>التقارير و الإحصائيات</p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default DirecteurDashboard;