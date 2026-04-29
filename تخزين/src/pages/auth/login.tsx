import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.css";

export default function Login() {

  const navigate = useNavigate();

  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");

  const [showPassword,setShowPassword] = useState(false);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);

  const handleLogin = async (e:React.FormEvent) => {

    e.preventDefault();

    setLoading(true);
    setError("");

    try{

      const response = await axios.post(
        "http://127.0.0.1:8000/api/login/",
        {
          username,
          password
        }
      );

      const data = response.data;

      const token = data.access;

      // sauvegarder token
      localStorage.setItem("token",token);
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      // decoder JWT
      const payload = JSON.parse(atob(token.split(".")[1]));

      const role = payload.role;

      // sauvegarder role
      localStorage.setItem("role",role);

      // redirection selon role
      if(role === "admin"){
        navigate("/dashboardadmin");
      }

      else if(role === "directeur"){
        navigate("/dashboarddirecteur");
      }

      else{
        setError("Role non autorisé");
      }

    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    catch(err:unknown){

      setError("اسم المستخدم أو كلمة المرور غير صحيحة");

    }

    setLoading(false);

  };

  return (

    <div className="login-page" dir="rtl">

      <div className="login-card">

        <div className="login-header">
          <h1>المنصة الأكاديمية</h1>
          <p>مرحباً بك، الرجاء تسجيل الدخول</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>

          <div className="form-group">
            <label>اسم المستخدم</label>

            <input
              type="text"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e)=>setUsername(e.target.value)}
              required
            />

          </div>

          <div className="form-group">

            <label>كلمة المرور</label>

            <div className="password-box">

              <input
                type={showPassword ? "text" : "password"}
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                required
              />

              <span
                className="toggle"
                onClick={()=>setShowPassword(!showPassword)}
              >
                {showPassword ? "إخفاء" : "إظهار"}
              </span>

            </div>

          </div>

          {error && (
            <p style={{color:"red",textAlign:"center"}}>
              {error}
            </p>
          )}

          <div className="forgot">
            <a href="#">نسيت كلمة المرور؟</a>
          </div>

          <button className="login-btn" disabled={loading}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>

        </form>

      </div>

    </div>
  );

}