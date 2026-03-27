import React from "react";
import "../pages/acceuil/home.css";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react"; // Ajout de l'icône

const Header: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="header">

      <h4>
        منصة إدارة امتحانات البكالوريا
      </h4>
      <button className="back-button" onClick={() => navigate("/dashboarddirecteur")}>
          <ArrowLeft size={20} />
          <span>الرئيسية</span>
        </button>
    </div>
  );
};

export default Header;