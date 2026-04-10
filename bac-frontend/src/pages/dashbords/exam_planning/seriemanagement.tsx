import { useEffect, useState } from "react";
import { Plus, Trash2, Save, FileSpreadsheet, Upload } from "lucide-react";
import API from "../../../services/api";
import "../pagecss/seriemanegement.css";

type Serie = {
  id: number;
  nom: string;
  section: string;
  centre: number;
  type?: "added" | "imported" | "existing";
};

type Inscription = {
  id: number;
  num_ins: string;
  serie: string;
};

export default function SerieManagement() {

  const [series, setSeries] = useState<Serie[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [inscriptions, setInscriptions] = useState<Record<number, Inscription[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSerieNom, setNewSerieNom] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSeries, setSavingSeries] = useState<number | null>(null);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [centreName, setCentreName] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 2000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const fetchData = async () => {
    try {
      const [seriesRes, infoRes] = await Promise.all([
        API.get("series/"),
        API.get("general/"),
      ]);
      setSeries(seriesRes.data.map((s: Serie) => ({ ...s, type: "existing" })));
      setSections(infoRes.data.sections || []);
      setCentreName(infoRes.data.centre || "المركز");
      const promises = seriesRes.data.map((serie: Serie) =>
        API.get(`inscriptions/?serie=${serie.id}`).then(res => ({ serieId: serie.id, data: res.data }))
      );
      const results = await Promise.all(promises);
      const map: Record<number, Inscription[]> = {};
      results.forEach(r => map[r.serieId] = r.data);
      setInscriptions(map);
    } catch (err) { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  };

  const handleCreateSerie = async () => {
    if (!newSerieNom.trim() || !selectedSection) return;
    try {
      const res = await API.post("series/", { nom: newSerieNom, section: selectedSection });
      setSeries([{ ...res.data, type: "added" }, ...series]);
      setInscriptions(prev => ({ ...prev, [res.data.id]: [] }));
      setNewSerieNom(""); setSelectedSection(""); setShowAddForm(false);
      setSuccess("تمت إضافة السلسلة بنجاح ✅");
    } catch { setError("خطأ أثناء الإضافة"); }
  };

  const handleDeleteSerie = async (id: number) => {
    if (!window.confirm("هل أنت متأكد؟")) return;
    try {
      await API.delete(`series/${id}/`);
      setSeries(prev => prev.filter(s => s.id !== id));
      setInscriptions(prev => { const newMap = { ...prev }; delete newMap[id]; return newMap; });
      setSuccess("تم حذف السلسلة ✅");
    } catch { setError("خطأ أثناء الحذف"); }
  };

  const handleInscriptionChange = (serieId: number, index: number, value: string) => {
    const current = inscriptions[serieId] || [];
    const updated = [...current];
    const serieObj = series.find(s => Number(s.id) === Number(serieId));
    if (!serieObj) return;
    if (index < updated.length) updated[index].num_ins = value;
    else updated.push({ id: -Date.now(), num_ins: value, serie: serieObj.nom });
    setInscriptions(prev => ({ ...prev, [serieId]: updated }));
  };

  const downloadTemplate = async () => {
    try {
      const res = await API.get("template/", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a"); link.href = url; link.download = "template.xlsx"; link.click();
      window.URL.revokeObjectURL(url); setSuccess("Template téléchargé ✅");
    } catch { setError("Erreur téléchargement template"); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData(); formData.append("file", file);
    try {
      setSuccess("جاري معالجة الملف..."); setError(null);
      const res = await API.post("import-excel/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const importedSeries: Serie[] = res.data.map((s: any) => ({ ...s, type: "imported", centre: 1 }));
      const inscriptionsMap: Record<number, Inscription[]> = {};
      res.data.forEach((s: any) => { inscriptionsMap[s.id] = s.inscriptions.map((num: string, idx: number) => ({ id: -idx - Date.now(), num_ins: num, serie: s.id })); });
      setSeries(importedSeries); setInscriptions(inscriptionsMap); setShowConfirmImport(true);
    } catch (err: any) { setError(err.response?.data?.error || "حدث خطأ أثناء الاستيراد"); }
  };

  const confirmImport = () => { setShowConfirmImport(false); setSuccess("تم تأكيد جميع السلاسل المستوردة ✅"); };

  const saveInscriptions = async (serieId: number) => {
    const serieObj = series.find(s => Number(s.id) === Number(serieId)); if (!serieObj) return;
    setSavingSeries(serieId);
    const payload = { serie: serieObj.nom, inscriptions: (inscriptions[serieId] || []).map(ins => ins.num_ins.trim()).filter(n => n) };
    try { await API.post("inscriptions/bulk/", payload); const updated = await API.get(`inscriptions/?serie=${serieObj.id}`); setInscriptions(prev => ({ ...prev, [serieId]: updated.data })); setSuccess("تم الحفظ بنجاح ✅"); }
    catch { setError("خطأ أثناء الحفظ"); }
    finally { setSavingSeries(null); };
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="container">

  {/* HEADER + ACTIONS */}
  <div className="titre">
    <div className="header-left">
    <h1>ادارة  {centreName}</h1>
    </div>
    <div className="header-right">
      <button  className="btn_secondary" onClick={() => window.history.back()}><Plus style={{ transform: "rotate(45deg)" }} /> رجوع</button>
    </div>
  </div>

  <div className="header-actions">
    <div className="header-left">
      <h1>ادارة السلاسل </h1>
      <p>تنظيم أرقام المترشحين</p>
    </div>

    <div className="header-buttons">
      <button className="btn primary" onClick={() => setShowAddForm(true)}><Plus /> إضافة</button>
      <button className="btn success" onClick={downloadTemplate}><FileSpreadsheet /> Template Excel</button>
      <label className="btn info"><Upload /> Import Excel
        <input type="file" hidden accept=".xlsx" onChange={handleImport} />
      </label>
    </div>
  </div>

  {/* TOAST MESSAGES */}
  {success && <div className="message-center success">{success}</div>}
  {error && <div className="message-center error">{error}</div>}

  {/* FORM AJOUT */}
  {showAddForm && (
    <div className="form">
      <input placeholder="اسم السلسلة" value={newSerieNom} onChange={e => setNewSerieNom(e.target.value)} />
      <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
        <option value="">الشعبة</option>
        {sections.map(s => <option key={s}>{s}</option>)}
      </select>
      <button onClick={handleCreateSerie}>حفظ</button>
    </div>
  )}

  {/* GRIDS SERIES : placé dans un container vertical sous le header */}
  <div className="series-container">
    <div className="series-grid">
      {series.map(serie => {
        const current = inscriptions[serie.id] || [];
        const list = [...current]; while(list.length < 18) list.push({id:-Date.now(), num_ins:"", serie:serie.id});
        return (
          <div key={serie.id} className={`card ${serie.type || ""}`}>
            <h3>{serie.nom} ({serie.section})</h3>
            <div className="inscriptions-grid">
              {list.map((ins,i)=> <input key={i} value={ins.num_ins} placeholder={`رقم ${i+1}`} onChange={e=>handleInscriptionChange(serie.id,i,e.target.value)} />)}
            </div>
            <div className="card-buttons">
              <button onClick={()=>saveInscriptions(serie.id)} disabled={savingSeries===serie.id}><Save /> {savingSeries===serie.id?"جاري الحفظ...":"حفظ"}</button>
              <button onClick={()=>handleDeleteSerie(serie.id)}><Trash2 /> حذف</button>
            </div>
          </div>
        )
      })}
    </div>
  </div>

  {/* CONFIRM IMPORT */}
  {showConfirmImport && <div className="confirm-container">
    <p>هل تريد تأكيد جميع السلاسل المستوردة؟</p>
    <button onClick={confirmImport}>OK</button>
  </div>}

</div>);
}