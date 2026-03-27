import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function PreparationDocs() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    API.get("general-info/")
      .then(res => setSections(res.data.sections))
      .catch(err => console.error(err));
  }, []);
 useEffect(() => {
  if (!selectedSection) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeries([]); // نفرغ إذا ما فماش اختيار
    return;
  }

  API.get(`series/?section=${selectedSection}`)
    .then(res => setSeries(res.data))
    .catch(err => console.error(err));
}, [selectedSection]);


  return (
    <div dir="rtl" className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-4 rounded shadow">
        <h1 className="text-xl font-bold">تحضير الوثائق</h1>

        <div className="flex gap-2">
          <button onClick={() => navigate("/")} className="bg-gray-600 text-white px-4 py-2 rounded">
            الرئيسية
          </button>

          <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-4 py-2 rounded">
            رجوع
          </button>
        </div>
      </div>

     

      {/* SECTION */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">الشعبة</h2>

      <label>اختر الشعبة:</label>
      <select
        value={selectedSection}
        onChange={(e) => setSelectedSection(e.target.value)}
      >
        <option value="">-- اختر --</option>
        {sections.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
   {selectedSection && series.length > 0 && (
  <select>
    <option value="">-- اختر السلسلة --</option>
    {series.map((s) => (
      <option key={s.id} value={s.nom}>
        {s.nom}
      </option>
    ))}
  </select>
)}
        
      </div>
</div>
  );      
}