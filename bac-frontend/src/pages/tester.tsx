import { useState, useEffect } from "react";
import API from "../services/api";

export default function Tester() {
  const [selectedSection, setSelectedSection] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  useEffect(() => {
    API.get("general-info/")
      .then(res =>{
        alert(JSON.stringify(res.data.sections));
         setSections(res.data.sections);}
    )
      .catch(err => console.error(err));
  }, []);
  return (
    <div>
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
    </div>
  );
}