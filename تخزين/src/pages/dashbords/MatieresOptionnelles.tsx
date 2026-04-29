import React from "react";
import { BookOpen } from "lucide-react";

const MatieresOptionnelles: React.FC = () => {
  return (
    <div className="dashboard-container" dir="rtl">
      <div className="page-header">
        <h1><BookOpen size={28} /> المواد الاختيارية</h1>
        <p>إدارة المواد الاختيارية للشعب</p>
      </div>

      <div className="coming-soon">
        <BookOpen size={64} />
        <h2>جاري العمل على هذه الصفحة</h2>
        <p>سيتم إتاحة هذه الخدمة قريباً</p>
      </div>
    </div>
  );
};

export default MatieresOptionnelles;