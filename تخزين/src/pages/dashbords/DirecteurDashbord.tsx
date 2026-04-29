import React from "react";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import "./pagecss/dashbord.css";

import { Building, Calendar, School, Users, Award, Edit3, BookOpen, FileText } from "lucide-react";

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
            <h3>رزنامة الامتحانات</h3>
            <p>تنظيم الامتحانات (توقيت وسلاسل)</p>
          </div>

          <div className="card" onClick={() => navigate("salles")}>
            <School size={40} className="icon orange" />
            <h3>تحضير وثائق</h3>
            <p>تصميم القاعات وبطاقات الحضور</p>
          </div>

          <div className="card" onClick={() => navigate("profs")}>
            <Users size={40} className="icon purple" />
            <h3>الاساتذة</h3>
            <p>برمجة الاساتذة</p>
          </div>
        </div>

        <div className="cards cards-row2">
          <div className="card" onClick={() => navigate("badges")}>
            <Award size={40} className="icon blue" />
            <h3>شارات (Badge)</h3>
            <p>إدارة شارات وعلامات المترشحين</p>
          </div>

          <div className="card" onClick={() => navigate("matieres")}>
            <BookOpen size={40} className="icon orange" />
            <h3>مواد اختيارية</h3>
            <p>إدارة المواد الاختيارية للشعب</p>
          </div>

          <div className="card" onClick={() => navigate("edition")}>
            <Edit3 size={40} className="icon green" />
            <h3>الكتابة تنسيق و عملة</h3>
            <p>تنسيق وطباعة الوثائق الرسمية</p>
          </div>

          <div className="card" onClick={() => navigate("rapports")}>
            <FileText size={40} className="icon purple" />
            <h3>التقارير اليومية</h3>
            <p>التقارير والإحصائيات اليومية</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirecteurDashboard;

