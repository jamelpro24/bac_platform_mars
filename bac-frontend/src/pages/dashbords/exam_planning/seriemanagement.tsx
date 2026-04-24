import { useEffect, useState } from "react";
import { Plus, Trash2, Save, FileSpreadsheet, Upload } from "lucide-react";
import API from "../../../services/api";
import "../pagecss/seriemanegement.css";

type Section = { id: number; nom: string };
type Serie = {
  id: number;
  nom: string;
  section: number;
  section_nom?: string;
  type?: "added" | "imported" | "existing";
};

type Inscription = {
  id: number;
  num_ins: string;
  nom_prenom: string;
  cin?: string;
  section: string;
  serie: number;
};

const GRID_SIZE = 18;

function buildList(serieId: number, current: Inscription[]): Inscription[] {
  const safe = Array.isArray(current) ? current : [];
  const filled = [...safe];
  while (filled.length < GRID_SIZE) {
    filled.push({
      id: -(serieId * 1000 + filled.length),
      num_ins: "",
      nom_prenom: "",
      cin: "",
      section: "",
      serie: serieId,
    });
  }
  return filled;
}

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
  const [candidatsImported, setCandidatsImported] = useState(false);
  const [seriesImported, setSeriesImported] = useState(false);
  const [importingC, setImportingC] = useState(false);
  const [importingS, setImportingS] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const fetchData = async () => {
    try {
      const [seriesRes, infoRes] = await Promise.all([
        API.get("series/"),
        API.get("general/"),
      ]);

      const fetchedSeries: Serie[] = seriesRes.data.map((s: any) => ({
        ...s,
        type: "existing" as const,
      }));
      setSeries(fetchedSeries);
      setSections(infoRes.data.sections || []);
      setCentreName(infoRes.data.centre || "المركز");

      if (fetchedSeries.length > 0) setSeriesImported(true);

      try {
        const candRes = await API.get("candidats-count/");
        if (candRes.data?.count > 0) setCandidatsImported(true);
      } catch {
        /* non bloquant */
      }

      const promises = fetchedSeries.map((serie: Serie) =>
        API.get(`inscriptions/?serie=${encodeURIComponent(serie.nom)}`)
          .then((res) => ({
            serieId: serie.id,
            data: Array.isArray(res.data) ? (res.data as Inscription[]) : [],
          }))
          .catch(() => ({ serieId: serie.id, data: [] as Inscription[] }))
      );

      const results = await Promise.all(promises);
      const map: Record<number, Inscription[]> = {};
      results.forEach((r) => {
        map[r.serieId] = r.data;
      });
      setInscriptions(map);
    } catch {
      setError("خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleImportCandidats = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const fd = new FormData();
    fd.append("file", e.target.files[0]);
    setImportingC(true);
    try {
      const res = await API.post("import-candidats/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCandidatsImported(true);
      setSuccess(res.data.message || "تم استيراد القائمة الاسمية ✅");
    } catch (err: any) {
      setError(err.response?.data?.error || "خطأ أثناء استيراد القائمة الاسمية");
    } finally {
      setImportingC(false);
      e.target.value = "";
    }
  };

  const handleImportSeries = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (importingS) return;
    if (!e.target.files?.length) return;

    const fd = new FormData();
    fd.append("file", e.target.files[0]);

    setImportingS(true);

    try {
      const res = await API.post("import-excel/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data;
      const importedSeries = data.series || [];

      const newSeries: Serie[] = importedSeries.map((s: any) => ({
        id: s.id,
        nom: s.serie,
        section: s.section_id ?? 0,
        section_nom: s.section ?? "",
        type: "imported" as const,
      }));

      const newInscriptions: Record<number, Inscription[]> = {};

      importedSeries.forEach((s: any) => {
        const raw = Array.isArray(s.inscriptions) ? s.inscriptions : [];
        newInscriptions[s.id] = raw.slice(0, GRID_SIZE).map((n: any, idx: number) => ({
          id: n.id ?? -(s.id * 1000 + idx),
          num_ins: (n.num_ins || "").toString().trim(),
          nom_prenom: (n.nom_prenom || "").toString(),
          cin: (n.cin || "").toString(),
          section: (n.section || "").toString(),
          serie: s.id,
        }));
      });

      setSeries(newSeries);
      setInscriptions(newInscriptions);
      setSeriesImported(true);

      let message = `✅ تم استيراد ${newSeries.length} سلسلة بنجاح`;
      if (data.skipped > 0) {
        message += `\n⚠️ تم تجاهل ${data.skipped} رقم مترشح غير موجودين`;
      }

      if (data.errors?.length) {
        setError(data.errors.join("\n"));
        // Afficher aussi un message de succès partiel si des séries ont été créées
        if (newSeries.length > 0) {
          setSuccess(message);
        }
      } else {
        setSuccess(message);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "خطأ أثناء استيراد السلاسل");
    } finally {
      setImportingS(false);
      e.target.value = "";
      // Réinitialiser aussi l'input caché
      const hiddenInput = document.getElementById("import-series-file") as HTMLInputElement;
      if (hiddenInput) hiddenInput.value = "";
    }
  };

  const handleCreateSerie = async () => {
    if (!newSerieNom.trim() || !selectedSection) return;
    try {
      const res = await API.post("series/", {
        nom: newSerieNom,
        section: Number(selectedSection),
      });
      setSeries((prev) => [{ ...res.data, type: "added" as const }, ...prev]);
      setInscriptions((prev) => ({ ...prev, [res.data.id]: [] }));
      setNewSerieNom("");
      setSelectedSection("");
      setShowAddForm(false);
      setSuccess("تمت إضافة السلسلة بنجاح ✅");
    } catch {
      setError("خطأ أثناء الإضافة");
    }
  };

  const handleDeleteSerie = async (id: number) => {
    if (!window.confirm("هل أنت متأكد؟")) return;
    try {
      await API.delete(`series/${id}/`);
      setSeries((prev) => prev.filter((s) => s.id !== id));
      setInscriptions((prev) => {
        const m = { ...prev };
        delete m[id];
        return m;
      });
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
    const serieObj = series.find((s) => s.id === serieId);
    if (!serieObj) return;
    const items = (inscriptions[serieId] || [])
      .filter((ins) => ins.num_ins.trim() !== "")
      .map((ins) => ({
        num_ins: ins.num_ins.trim(),
        nom_prenom: ins.nom_prenom?.trim() || "",
        cin: ins.cin?.trim() || "",
        section: ins.section?.trim() || "",
      }));
    if (items.length > GRID_SIZE) {
      setError(`لا يمكن تجاوز ${GRID_SIZE} مترشح`);
      return;
    }
    if (new Set(items.map((i) => i.num_ins)).size !== items.length) {
      setError("توجد أرقام مكررة");
      return;
    }
    setSavingSeries(serieId);
    try {
      await API.post("inscriptions/bulk/", {
        serie: serieObj.nom,
        inscriptions: items,
      });
      const updated = await API.get(`inscriptions/?serie=${encodeURIComponent(serieObj.nom)}`);
      setInscriptions((prev) => ({
        ...prev,
        [serieId]: Array.isArray(updated.data) ? updated.data : [],
      }));
      setSuccess("تم الحفظ بنجاح ✅");
    } catch (err: any) {
      setError(err.response?.data?.error || "خطأ أثناء الحفظ");
    } finally {
      setSavingSeries(null);
    }
  };

  const getSectionNom = (id: number) => sections.find((s) => s.id === id)?.nom || String(id);

  if (loading) return <div className="loading">جاري التحميل...</div>;

  // La page devient utilisable dès que les candidats sont importés
  const pageReady = candidatsImported;

  return (
    <div className="container" style={{ padding: 20 }}>
      {success && <div className="message-center success">{success}</div>}
      {error && <div className="message-center error">{error}</div>}

  <div className="titre">
    <div className="header-left">
    <h1>ادارة  {centreName}</h1>
    </div>
    <div className="header-right">
          <button className="btn_secondary" onClick={() => window.history.back()}>
            <Plus style={{ transform: "rotate(45deg)" }} /> رجوع
          </button>
        </div>
      </div>

      {/* Bannières d'import */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: "16px 20px",
            border: `2px solid ${candidatsImported ? "#2ecc71" : "#f1c40f"}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1 }}>
            {candidatsImported ? (
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#1e8449" }}>
                ✅ القائمة الاسمية محملة
              </p>
            ) : (
              <>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#b7950b" }}>
                  الخطوة 1 — يجب عليك تحميل القائمة الاسمية في صيغتها Excel ليمكنك المتابعة
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
                  الأعمدة: رقم المترشح | الإسم و اللقب | رقم بطاقة التعريف الوطنية | الشعبة
                </p>
              </>
            )}
          </div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: importingC ? "#95a5a6" : candidatsImported ? "#2ecc71" : "#f1c40f",
              color: "white",
              padding: "10px 22px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: importingC ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {importingC ? (
              <>⏳ جاري...</>
            ) : candidatsImported ? (
              <>
                <Upload size={16} /> تحديث القائمة
              </>
            ) : (
              <>
                <Upload size={18} /> رفع القائمة الاسمية
              </>
            )}
            <input
              type="file"
              hidden
              accept=".xlsx"
              disabled={importingC}
              onChange={handleImportCandidats}
            />
          </label>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: "16px 20px",
            border: `2px solid ${seriesImported ? "#2ecc71" : candidatsImported ? "#3498db" : "#e2e8f0"}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            opacity: candidatsImported ? 1 : 0.5,
          }}
        >
          <div style={{ flex: 1 }}>
            {seriesImported ? (
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#1e8449" }}>
                ✅ ملف السلاسل محمّل — {series.length} سلسلة
              </p>
            ) : (
              <>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: 16,
                    color: candidatsImported ? "#1e466e" : "#aaa",
                  }}
                >
                  الخطوة 2 — رفع ملف السلاسل
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
                  الأعمدة: Serie | num_ins
                </p>
              </>
            )}
          </div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: importingS
                ? "#95a5a6"
                : !candidatsImported
                ? "#bdc3c7"
                : seriesImported
                ? "#2ecc71"
                : "#3498db",
              color: "white",
              padding: "10px 22px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: !candidatsImported || importingS ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {importingS ? (
              <>⏳ جاري...</>
            ) : seriesImported ? (
              <>
                <Upload size={16} /> تحديث السلاسل
              </>
            ) : (
              <>
                <Upload size={18} /> رفع ملف السلاسل
              </>
            )}
            <input
              type="file"
              hidden
              accept=".xlsx"
              disabled={!candidatsImported || importingS}
              onChange={handleImportSeries}
            />
          </label>
    </div>
  </div>

      {/* Contenu principal (flou si candidats non importés) */}
      <div
        style={{
          filter: pageReady ? "none" : "blur(4px)",
          pointerEvents: pageReady ? "auto" : "none",
          userSelect: pageReady ? "auto" : "none",
          transition: "filter 0.3s",
        }}
      >
  <div className="header-actions">
    <div className="header-left">
            <h1>إدارة السلاسل</h1>
      <p>تنظيم أرقام المترشحين</p>
    </div>

    <div className="header-buttons">
            <button className="btn primary" onClick={() => setShowAddForm(true)}>
              <Plus /> إضافة
            </button>
            <button
              className="btn secondary"
              onClick={() => document.getElementById("import-series-file")?.click()}
              disabled={!candidatsImported || importingS}
            >
              <Upload size={18} /> استيراد السلاسل
            </button>
            <button
              className="btn success"
              onClick={async () => {
                try {
                  const res = await API.get("template/", { responseType: "blob" });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "template.xlsx";
                  a.click();
                  window.URL.revokeObjectURL(url);
                  setSuccess("Template téléchargé ✅");
                } catch {
                  setError("Erreur téléchargement template");
                }
              }}
            >
              <FileSpreadsheet /> Template Excel
            </button>
    </div>
  </div>

        {/* Input caché pour l'import des séries depuis la barre d'outils */}
        <input
          id="import-series-file"
          type="file"
          hidden
          accept=".xlsx"
          disabled={!candidatsImported || importingS}
          onChange={handleImportSeries}
        />

  {showAddForm && (
    <div className="form">
            <input
              placeholder="اسم السلسلة"
              value={newSerieNom}
              onChange={(e) => setNewSerieNom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSerie()}
            />
            <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
        <option value="">الشعبة</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
      </select>
      <button onClick={handleCreateSerie}>حفظ</button>
            <button onClick={() => setShowAddForm(false)}>إلغاء</button>
    </div>
  )}

  {/* GRIDS SERIES : placé dans un container vertical sous le header */}
  <div className="series-container">
    <div className="series-grid">
            {series.map((serie) => {
              const real = Array.isArray(inscriptions[serie.id]) ? inscriptions[serie.id] : [];
              const displayList = buildList(serie.id, real);
        return (
          <div key={serie.id} className={`card ${serie.type || ""}`}>
                  <h3>
                    {serie.nom}{" "}
                    <span>({serie.section_nom || getSectionNom(serie.section)})</span>
                  </h3>
                  <p className="serie-count">
                    {real.length} / {GRID_SIZE} مترشح
                  </p>
            <div className="inscriptions-grid">
                    {displayList.map((ins, i) => (
                      <input
                        key={ins.id}
                        value={ins.num_ins}
                        placeholder={`رقم ${i + 1}`}
                        onChange={(e) => {
                          setInscriptions((prev) => {
                            const full = buildList(
                              serie.id,
                              Array.isArray(prev[serie.id]) ? prev[serie.id] : []
                            );
                            full[i] = { ...full[i], num_ins: e.target.value };
                            return { ...prev, [serie.id]: full };
                          });
                        }}
                      />
                    ))}
            </div>
            <div className="card-buttons">
                    <button
                      onClick={() => saveInscriptions(serie.id)}
                      disabled={savingSeries === serie.id}
                    >
                      <Save /> {savingSeries === serie.id ? "جاري الحفظ..." : "حفظ"}
                    </button>
                    <button onClick={() => handleDeleteSerie(serie.id)}>
                      <Trash2 /> حذف
                    </button>
            </div>
          </div>
        )
      })}
    </div>
  </div>
      </div>
    </div>
  );
}
