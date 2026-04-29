import React from "react";
import Header from "./header";
import Footer from "./footer";
import "./home.css";
import img from "../../assets/img.png"
import img1 from "../../assets/img1.png"
import img2 from "../../assets/hero.png"
const Home: React.FC = () => {
  return (
    <div className="home">

      <Header />

      <section className="container">

        {/* TEXTE */}
        <div className="presentation">

          <h1>مرحبا بكم في المنصة الأكاديمية</h1>

          <h3>
            منصة تعليمية حديثة تساعد المؤسسات التعليمية
            على إدارة الامتحانات الوطنية تنضيما و برمجيا بطريقة سهلة وفعالة.
          </h3>

          <h3>
            تم تصميم هذه المنصة لتوفير تجربة استعمال
    بسيطة وسريعة لرؤساء المراكز و مساعدينهم.
          </h3>

          <div className="video">

            <h3>فيديو شرح استعمال المنصة</h3>

            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="شرح المنصة"
              allowFullScreen
            ></iframe>

          </div>

        </div>

        {/* IMAGES */}
        <div className="images">

          <img src={img} />
          <img src={img1} />
          <img src={img2} />

        </div>

      </section>

      <Footer />

    </div>
  );
};

export default Home;