import React from "react";
import { FileText } from "lucide-react";

const Rapports: React.FC = () => {
  return (
    <div className="dashboard-container" dir="rtl">
      <div className="page-header">
        <h1><FileText size={28} /> التقارير اليومية</h1>
        <p>التقارير والإحصائيات اليومية</p>
      </div>

      <div className="coming-soon">
        <FileText size={64} />
        <h2>جاري العمل على هذه الصفحة</h2>
        <p>سيتم إتاحة هذه الخدمة قريباً</p>
      </div>
    </div>
  );
};

export default Rapports;