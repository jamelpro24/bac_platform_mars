import React from "react";
import { Phone, MessageCircle } from "lucide-react";
import "./home.css";

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">

        <h2>التسجيل في المنصة</h2>

        <p>
          للتسجيل أو الاستفسار يمكنكم الاتصال أو التواصل عبر الواتساب
        </p>

        <div className="contact-cards">

          <a href="tel:29800443" className="contact-card phone-card">
            <Phone size={22} />
            <span>29800443</span>
          </a>

          <a
            href="https://wa.me/21629800443"
            target="_blank"
            rel="noreferrer"
            className="contact-card whatsapp-card"
          >
            <MessageCircle size={22} />
            <span>واتساب</span>
          </a>

        </div>

        <div className="copyright">
          © 2026 المنصة الأكاديمية
        </div>

      </div>
    </footer>
  );
};

export default Footer;