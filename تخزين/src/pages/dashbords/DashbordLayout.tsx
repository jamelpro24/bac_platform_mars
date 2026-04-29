import React from "react";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div dir="rtl">

      {/* Header */}
      <header className="bg-white shadow fixed top-0 right-0 left-0 z-50 p-3 d-flex justify-content-between">

        <h5 className="text-primary fw-bold">
          مركز الأكاديمية
        </h5>

        <div>
          <i className="bi bi-bell mx-2"></i>
          <i className="bi bi-person mx-2"></i>
          <i className="bi bi-box-arrow-right text-danger mx-2"></i>
        </div>

      </header>

      {/* Sidebar */}
      <div className="bg-dark text-white position-fixed top-0 end-0 vh-100 pt-5" style={{ width: "250px" }}>

        <ul className="list-unstyled p-3">

          <li className="mb-3">🏠 الرئيسية</li>
          <li className="mb-3">📊 المعلومات</li>
          <li className="mb-3">👨‍🏫 الأساتذة</li>
          <li className="mb-3">📝 الامتحانات</li>
          <li className="mb-3">🖨️ الطباعة</li>

        </ul>

      </div>

      {/* Content */}
      <div style={{ marginRight: "250px", marginTop: "70px" }} className="p-4">

        {children}

      </div>

    </div>
  );
};

export default DashboardLayout;