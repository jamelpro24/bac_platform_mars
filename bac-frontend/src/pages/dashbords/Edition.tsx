import React from "react";
import { Edit3 } from "lucide-react";

const Edition: React.FC = () => {
  return (
    <div className="dashboard-container" dir="rtl">
      <div className="page-header">
        <h1><Edit3 size={28} /> الكتابة والتنسيق</h1>
        <p>تنسيق وطباعة الوثائق الرسمية</p>
      </div>

      <div className="coming-soon">
        <Edit3 size={64} />
        <h2>جاري العمل على هذه الصفحة</h2>
        <p>سيتم إتاحة هذه الخدمة قريباً</p>
      </div>
    </div>
  );
};

export default Edition;