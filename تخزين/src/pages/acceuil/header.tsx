import React from "react";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../assets/logo.png"
const Header: React.FC = () => {
    const navigate = useNavigate();
  return (
    <header className="header">

      <div className="title">
        
        <img src={Logo} className="logo" height={64}/>
        <h1 ><strong>المنصة الأكاديمية الذكية</strong></h1>
      </div>

      <button className="login-b" onClick={() => navigate("/auth/login")}>
        <LogIn size={36} />
        تسجيل الدخول
      </button>

    </header>
  );
};

export default Header;