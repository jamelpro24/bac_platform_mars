import React from "react";
import { Award } from "lucide-react";

const Badges: React.FC = () => {
  return (
    <div className="dashboard-container" dir="rtl">
      <div className="page-header">
        <h1><Award size={28} /> إدارة الشارات</h1>
        <p>إدارة شارات وعلامات المترشحين</p>
      </div>

      <div className="coming-soon">
        <Award size={64} />
        <h2>جاري العمل على هذه الصفحة</h2>
        <p>سيتم إتاحة هذه الخدمة قريباً</p>
      </div>
    </div>
  );
};

export default Badges;