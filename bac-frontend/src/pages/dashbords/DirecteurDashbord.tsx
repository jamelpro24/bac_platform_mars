import React from "react";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import "./pagecss/dashbord.css";

import {
  Building,
  Calendar,
  School,
  Users
} from "lucide-react";

const DirecteurDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">

      <Header />
      <div className="dashboard-container">
        <h1 className="dashboard-title">لوحة التحكم</h1>
        {/* CARDS */}
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

        </div>

        {/* STATS */}
        <div className="stats">

          <div className="stat-card">
            <h3>عدد الأساتذة</h3>
            <p>15</p>
          </div>

          <div className="stat-card">
            <h3>عدد القاعات</h3>
            <p>24</p>
          </div>

        </div>

      </div>

     

    </div>
  );
};

export default DirecteurDashboard;