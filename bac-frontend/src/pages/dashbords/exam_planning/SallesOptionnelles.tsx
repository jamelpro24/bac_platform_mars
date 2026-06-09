import { useEffect, useState, useRef } from "react";
import { FileText, Download, Printer, ChevronDown, ChevronUp, X, Loader, CheckSquare, Square } from "lucide-react";
import API from "../../../services/api";
import Header from "../../../components/Header";
import "../pagecss/salles.css";
import "../pagecss/general.css";

type Matiere = { id: number; nom: string };

type MatiereSection = { id: number; matiere: number; section: number; heures: number; type: string; matiere_nom?: string; section_nom?: string };
type Section = { id: number; nom: string };
type Salle   = { id: number; numero: number; capacite?: number };
type Serie   = { id: number; nom: string; section: number; section_nom?: string };
type Inscription = { id: number; num_ins: string; nom_prenom: string; cin?: string; section: string; serie: number; etablissement?: string };

type ExamenSalleRecord = {
  id: number; examen: number; salle: number; salle_numero: number;
  serie: number; serie_nom: string;
  surveillant_1: number | null; surveillant_2: number | null;
};

type Examen = {
  id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  matiere: number;
  section: number;
  session: number;
  candidat_assignments?: Record<string, any>;
};

type CandidatSelected = {
  num_ins: string;
  nom_prenom: string;
  cin?: string;
  section: string;
  section_nom: string;
  serie_id: number;
  serie_nom: string;
  etablissement?: string;
};

type SalleAssignment = {
  salle_id: number;
  layout: "15" | "18";
  section_ids: number[];
  serie_ids: number[];
  candidats: CandidatSelected[];
};

type GeneratedDoc = {
  doc_id: string;
  label: string;
  type: "presence" | "plan";
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-TN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function fmtTime(t: string) { return t.slice(0, 5); }

export default function SallesOptionnelles() {
  const [examens,  setExamens]  = useState<Examen[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [salles,   setSalles]   = useState<Salle[]>([]);
  const [series,   setSeries]   = useState<Serie[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [matiereSections, setMatiereSections] = useState<MatiereSection[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [selectedMatiere, setSelectedMatiere] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<SalleAssignment[]>([]);
  const [activeSalle, setActiveSalle] = useState<number | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [genError,   setGenError]   = useState("");
  const [dlError,    setDlError]    = useState("");
  const [docs,       setDocs]       = useState<GeneratedDoc[]>([]);
  const [showModal,  setShowModal]  = useState(false);
  const [presenceDocs, setPresenceDocs] = useState<GeneratedDoc[]>([]);

  const [savedExamenSalles, setSavedExamenSalles] = useState<ExamenSalleRecord[]>([]);
  const [savedRoomData, setSavedRoomData] = useState<SalleAssignment[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"saved" | "add">("saved");
  const [generateLayout, setGenerateLayout] = useState<"15" | "18">("18");
  const [usedCandidateNums, setUsedCandidateNums] = useState<Set<string>>(new Set());
  const [overlappingRoomIds, setOverlappingRoomIds] = useState<Set<number>>(new Set());
  const usedRoomIdsByExamen = useRef<Map<number, { roomIds: Set<number>; date: string; heure_debut: string; heure_fin: string }>>(new Map());

  // Load all candidat_assignments for all optional matieres to build usedCandidateNums
  const refreshUsedCandidates = async () => {
    const optMatIds = matiereSections.filter(ms => ms.type === 'optionnelle').map(ms => ms.matiere);
    const optExamens = examens.filter(ex => optMatIds.includes(ex.matiere));
    const usedNums = new Set<string>();
    const roomMap = new Map<number, { roomIds: Set<number>; date: string; heure_debut: string; heure_fin: string }>();
    for (const ex of optExamens) {
      try {
        const res = await API.get(`examens/${ex.id}/`);
        const ca = res.data.candidat_assignments;
        if (ca && ca.rooms) {
          const roomIds = new Set<number>();
          for (const room of ca.rooms) {
            roomIds.add(room.salle_id);
            for (const c of room.candidats) {
              usedNums.add(c.num_ins);
            }
          }
          roomMap.set(ex.id, { roomIds, date: ex.date, heure_debut: ex.heure_debut, heure_fin: ex.heure_fin });
        }
      } catch { /* ignore */ }
    }
    usedRoomIdsByExamen.current = roomMap;
    setUsedCandidateNums(usedNums);
    recomputeOverlappingRooms();
  };

  const recomputeOverlappingRooms = () => {
    const curEx = selectedMatiere ? examens.find(e => e.matiere === selectedMatiere) : null;
    if (!curEx) { setOverlappingRoomIds(new Set()); return; }
    const overlapIds = new Set<number>();
    for (const [exId, info] of usedRoomIdsByExamen.current) {
      if (exId === curEx.id) continue;
      if (info.date !== curEx.date) continue;
      if (info.heure_debut < curEx.heure_fin && curEx.heure_debut < info.heure_fin) {
        for (const rid of info.roomIds) overlapIds.add(rid);
      }
    }
    setOverlappingRoomIds(overlapIds);
  };

  useEffect(() => {
    (async () => {
      try {
        const [eR, mR, iR, sallR, serR, insR, msR] = await Promise.all([
          API.get("examens/"),
          API.get("matieres/"),
          API.get("general/"),
          API.get("salles-exam/"),
          API.get("series/"),
          API.get("inscriptions/"),
          API.get("matieres-sections/"),
        ]);
        setExamens(eR.data);
        setMatieres(mR.data);
        setSections(iR.data.sections || []);
        setSalles(sallR.data);
        setSeries(serR.data);
        setInscriptions(insR.data);
        setMatiereSections(msR.data);
        await refreshUsedCandidates();
      } catch { /* ignoré */ }
      finally { setLoading(false); }
    })();
  }, []);

  const getMatiere = (id: number) => matieres.find(m => m.id === id)?.nom || "?";

  const optionalMatIds = matiereSections.filter(ms => ms.type === 'optionnelle').map(ms => ms.matiere);
  const optionalMatieres = matieres.filter(m => optionalMatIds.includes(m.id));

  const getSectionsForMatiere = (matiereId: number): Section[] => {
    const relatedExams = examens.filter(ex => ex.matiere === matiereId);
    const sectionIds = [...new Set(relatedExams.map(ex => ex.section))];
    return sectionIds.map(id => sections.find(s => s.id === id)).filter(Boolean) as Section[];
  };

  const handleMatiereChange = async (matiereId: number) => {
    setSelectedMatiere(matiereId);
    setAssignments([]);
    setActiveSalle(null);
    setActiveRoomId(null);
    setSelectedKeys(new Set());
    setSavedExamenSalles([]);
    recomputeOverlappingRooms();
    // Load saved rooms for this matiere via candidat_assignments
    const ex = examens.find(e => e.matiere === matiereId);
    if (ex) {
      try {
        const res = await API.get(`examens/${ex.id}/`);
        const ca = res.data.candidat_assignments;
        if (ca && ca.rooms) {
          setSavedRoomData(ca.rooms);
          const records: ExamenSalleRecord[] = [];
          for (const room of ca.rooms) {
            for (const c of room.candidats) {
              records.push({
                id: 0, examen: ex.id, salle: room.salle_id,
                salle_numero: salles.find(s => s.id === room.salle_id)?.numero ?? 0,
                serie: c.serie_id, serie_nom: c.serie_nom,
                surveillant_1: null, surveillant_2: null,
              });
            }
          }
          setSavedExamenSalles(records);
        } else {
          setSavedRoomData([]);
        }
      } catch { setSavedRoomData([]); }
    }
    setViewMode("saved");
  };

  const addSalle = (salleId: number) => {
    if (assignments.find(a => a.salle_id === salleId)) return;
    const salle = salles.find(s => s.id === salleId);
    const defaultLayout = salle && salle.capacite && salle.capacite >= 18 ? "18" : "15";
    const allSections = selectedMatiere ? getSectionsForMatiere(selectedMatiere) : [];
    const allSerieIds = series.filter(s => allSections.find(sec => sec.id === s.section)).map(s => s.id);
    setAssignments(prev => [...prev, {
      salle_id: salleId,
      layout: defaultLayout,
      section_ids: allSections.map(s => s.id),
      serie_ids: allSerieIds,
      candidats: []
    }]);
    setActiveSalle(salleId);
  };

  const toggleCandidat = (salleId: number, candidat: CandidatSelected, layout: "15" | "18") => {
    const alreadySelectedInAnyRoom = assignments.some(a => a.salle_id === salleId && a.candidats.some(c => c.num_ins === candidat.num_ins));
    setAssignments(prev => prev.map(a => {
      if (a.salle_id !== salleId) return a;
      const alreadySelected = a.candidats.find(c => c.num_ins === candidat.num_ins);
      if (!alreadySelected && a.candidats.length >= parseInt(layout)) return a;
      return {
        ...a,
        candidats: alreadySelected
          ? a.candidats.filter(c => c.num_ins !== candidat.num_ins)
          : [...a.candidats, candidat]
      };
    }));

    setUsedCandidateNums(prev => {
      const n = new Set(prev);
      if (alreadySelectedInAnyRoom) n.delete(candidat.num_ins);
      else n.add(candidat.num_ins);
      return n;
    });
  };

  const removeSalle = (salleId: number) => {
    setAssignments(prev => prev.filter(a => a.salle_id !== salleId));
    if (activeSalle === salleId) setActiveSalle(null);
  };

  const refreshSavedExamenSalles = async () => {
    const ex = examens.find(e => e.matiere === selectedMatiere);
    if (!ex) return;
    try {
      const res = await API.get(`examens/${ex.id}/`);
      const ca = res.data.candidat_assignments;
      if (ca && ca.rooms) {
        setSavedRoomData(ca.rooms);
        const records: ExamenSalleRecord[] = [];
        for (const room of ca.rooms) {
          for (const c of room.candidats) {
            records.push({
              id: 0, examen: ex.id, salle: room.salle_id,
              salle_numero: salles.find(s => s.id === room.salle_id)?.numero ?? 0,
              serie: c.serie_id, serie_nom: c.serie_nom,
              surveillant_1: null, surveillant_2: null,
            });
          }
        }
        setSavedExamenSalles(records);
      } else {
        setSavedRoomData([]);
        setSavedExamenSalles([]);
      }
    } catch { setSavedRoomData([]); setSavedExamenSalles([]); }
  };

  const deleteSavedRoom = async (salleId: number) => {
    const examForMatiere = examens.find(ex => ex.matiere === selectedMatiere);
    if (!examForMatiere) return;
    try {
      const res = await API.get(`examens/${examForMatiere.id}/`);
      const ca = res.data.candidat_assignments;
      if (ca && ca.rooms) {
        ca.rooms = ca.rooms.filter((r: any) => r.salle_id !== salleId);
        await API.patch(`examens/${examForMatiere.id}/`, { candidat_assignments: ca });
      }
    } catch { /* ignore */ }
    // Also try to delete any legacy ExamenSalle records
    const records = savedExamenSalles.filter(r => r.salle === salleId);
    for (const rec of records) {
      try { await API.delete(`examen-salles/${rec.id}/`); } catch { /* ignore */ }
    }
    await refreshSavedExamenSalles();
    await refreshUsedCandidates();
    if (activeRoomId === salleId) setActiveRoomId(null);
  };

  const doSaveRooms = async () => {
    const examForMatiere = examens.find(ex => ex.matiere === selectedMatiere);
    if (!examForMatiere) return;
    // Merge current assignments with existing saved rooms (so editing one room doesn't delete others)
    const existingRooms = savedRoomData.filter(r => !assignments.find(a => a.salle_id === r.salle_id));
    const mergedRooms = [
      ...existingRooms,
      ...assignments.map(a => ({
        salle_id: a.salle_id,
        layout: a.layout,
        section_ids: a.section_ids,
        serie_ids: a.serie_ids,
        candidats: a.candidats,
      })),
    ];
    try {
      await API.patch(`examens/${examForMatiere.id}/`, {
        candidat_assignments: { rooms: mergedRooms },
      });
    } catch { /* ignore */ }
  };

  const saveRooms = async () => {
    if (!selectedMatiere) return;
    if (assignments.length === 0) { setGenError("أضف قاعة واحدة على الأقل"); return; }
    const overRooms: string[] = [];
    for (const a of assignments) {
      const maxL = parseInt(a.layout);
      if (a.candidats.length > maxL) {
        const salle = salles.find(s => s.id === a.salle_id);
        overRooms.push(`القاعة ${salle?.numero || a.salle_id} : ${a.candidats.length} مترشح، الحد الأقصى ${maxL}`);
      }
    }
    if (overRooms.length > 0) {
      setGenError(overRooms.join(" | "));
      return;
    }
    setSaving(true); setGenError(""); setSaved(false);
    await doSaveRooms();
    await refreshSavedExamenSalles();
    await refreshUsedCandidates();
    setSaving(false);
    setSaved(true);
    setViewMode("saved");
  };

  const generateAll = async () => {
    if (!selectedMatiere) return;
    if (assignments.length === 0) { setGenError("أضف قاعة واحدة على الأقل"); return; }
    if (assignments.some(a => a.candidats.length === 0)) { setGenError("كل قاعة يجب أن تحتوي على مترشح واحد على الأقل"); return; }
    const overRooms: string[] = [];
    for (const a of assignments) {
      const maxL = parseInt(a.layout);
      if (a.candidats.length > maxL) {
        const salle = salles.find(s => s.id === a.salle_id);
        overRooms.push(`القاعة ${salle?.numero || a.salle_id} : ${a.candidats.length} مترشح، الحد الأقصى ${maxL}`);
      }
    }
    if (overRooms.length > 0) {
      setGenError(overRooms.join(" | "));
      return;
    }

    setGenerating(true); setGenError(""); setDocs([]); setPresenceDocs([]);
    try {
    const examForMatiere = examens.find(ex => ex.matiere === selectedMatiere);
    await doSaveRooms();
    await refreshSavedExamenSalles();
    setSaved(true);

    const matiereNom = getMatiere(selectedMatiere);

    const allCands = assignments.flatMap(a => a.candidats);
    const sectionNom = [...new Set(allCands.map(c => c.section))].join("-");

    const sallesPayload = assignments.map(a => {
      const salle = salles.find(s => s.id === a.salle_id);
      const secStr = [...new Set(a.candidats.map(c => c.section))].join("-");
      const serStr = [...new Set(a.candidats.map(c => c.serie_nom))].join("-");
      const numsStr = a.candidats.map(c => c.num_ins).join("-");

      return {
        salle_id: a.salle_id,
        salle_numero: salle?.numero,
        section_str: secStr,
        series_str: serStr,
        nums_str: numsStr,
        layout: a.layout,
        candidats: a.candidats,
      };
    });

    const [planRes, presRes] = await Promise.allSettled([
      API.post("generate-documents/", {
        examen_id: examForMatiere?.id || 0,
        matiere: matiereNom,
        section: sectionNom,
        date: examForMatiere?.date || "",
        heure_debut: examForMatiere?.heure_debut || "08:30",
        heure_fin: examForMatiere?.heure_fin || "10:30",
        salles: sallesPayload,
      }),
      API.post("generate-presence/", {
        matiere: matiereNom,
        date: examForMatiere?.date || "",
        heure: fmtTime(examForMatiere?.heure_debut || "08:30"),
        salles: sallesPayload,
      }),
    ]);

    const planDocs: GeneratedDoc[] = planRes.status === "fulfilled" ? (planRes.value.data.documents || planRes.value.data || []) : [];
    const presDocs: GeneratedDoc[] = presRes.status === "fulfilled" ? (presRes.value.data.documents || []) : [];

    const errors: string[] = [];
    if (planRes.status === "rejected") errors.push((planRes.reason as any)?.response?.data?.error || "خطأ في مخطط القاعة");
    if (presRes.status === "rejected") errors.push((presRes.reason as any)?.response?.data?.error || "خطأ في بطاقات الحضور");
    if (errors.length) setGenError(errors.join(" | "));

    setDocs(planDocs);
    setPresenceDocs(presDocs);
    if (planDocs.length || presDocs.length) setShowModal(true);
    } catch (e: any) {
      setGenError(e?.response?.data?.error || e?.message || "خطأ غير متوقع");
    }
    setGenerating(false);
  };

  const generateSelected = async (selected: [number, SavedRoomGroup][]) => {
    setGenerating(true); setGenError(""); setDocs([]); setPresenceDocs([]);
    try {
    const examForMatiere = examens.find(ex => ex.matiere === selectedMatiere);
    if (!examForMatiere) { setGenError("الامتحان غير موجود"); setGenerating(false); return; }
    const matiereNom = getMatiere(selectedMatiere!);
    const maxPerRoom = parseInt(generateLayout);

    // Build payload using candidats (from per-candidate assignments) or fallback to inscriptions
    const allSections = [...new Set(selected.flatMap(([, g]) => {
      const src = g.candidats && g.candidats.length > 0 ? g.candidats : g.inscriptions;
      return src.map((i: any) => i.section);
    }))].join("-");
    const sallesPayload = selected.map(([salleId, g]) => {
      const useCands = g.candidats && g.candidats.length > 0;
      const limited = useCands
        ? g.candidats.slice(0, maxPerRoom)
        : g.inscriptions.slice(0, maxPerRoom);
      const sectionStr = [...new Set(limited.map((i: any) => i.section))].join("-");
      const seriesStr = g.series.map(s => s.nom).join("-");
      const numsStr = limited.map((i: any) => i.num_ins).join("-");
      return {
        salle_id: salleId,
        salle_numero: g.salle?.numero,
        section_str: sectionStr,
        series_str: seriesStr,
        nums_str: numsStr,
        layout: generateLayout,
        candidats: limited.map((i: any) => ({
          num_ins: i.num_ins,
          nom_prenom: i.nom_prenom,
          cin: i.cin,
          section: i.section,
          section_nom: i.section,
          serie_nom: i.serie_nom || g.series.find((s: Serie) => s.id === i.serie)?.nom || "",
          etablissement: i.etablissement,
        })),
      };
    });

    const [planRes, presRes] = await Promise.allSettled([
      API.post("generate-documents/", {
        examen_id: examForMatiere.id,
        matiere: matiereNom,
        section: allSections,
        date: examForMatiere.date,
        heure_debut: examForMatiere.heure_debut,
        heure_fin: examForMatiere.heure_fin,
        salles: sallesPayload,
      }),
      API.post("generate-presence/", {
        matiere: matiereNom,
        date: examForMatiere.date,
        heure: fmtTime(examForMatiere.heure_debut),
        salles: sallesPayload,
      }),
    ]);

    const planDocs: GeneratedDoc[] = planRes.status === "fulfilled" ? (planRes.value.data.documents || planRes.value.data || []) : [];
    const presDocs: GeneratedDoc[] = presRes.status === "fulfilled" ? (presRes.value.data.documents || []) : [];
    const errors: string[] = [];
    if (planRes.status === "rejected") errors.push((planRes.reason as any)?.response?.data?.error || "خطأ في مخطط القاعة");
    if (presRes.status === "rejected") errors.push((presRes.reason as any)?.response?.data?.error || "خطأ في بطاقات الحضور");
    if (errors.length) setGenError(errors.join(" | "));
    setDocs(planDocs);
    setPresenceDocs(presDocs);
    if (planDocs.length || presDocs.length) setShowModal(true);
    } catch (e: any) {
      setGenError(e?.response?.data?.error || e?.message || "خطأ غير متوقع");
    }
    setGenerating(false);
  };

  const download = async (docId: string, label: string) => {
    setDlError("");
    try {
      const res = await API.get(`download-document/${docId}/`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (res.data.type === "application/json") {
        const text = await (res.data as Blob).text();
        setDlError(JSON.parse(text).error || "خطأ في التحميل");
        return;
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url; link.download = `${label}.docx`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setDlError(`خطأ أثناء التحميل: ${e.response?.status || e.message}`);
    }
  };

  const downloadAll = () => [...docs, ...presenceDocs].forEach(d => download(d.doc_id, d.label));

  const c = {
    card:  { background: "#fff", borderRadius: 16, border: "1px solid #e8eaed", overflow: "hidden" as const },
    hd:    { padding: "1rem 1.25rem", borderBottom: "1px solid #f1f3f4", display: "flex", alignItems: "center", gap: 10 },
    pad:   { padding: "1.25rem" },
    badge: (color: string, bg: string): React.CSSProperties => ({
      background: bg, color, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 600 as const, display: "inline-block",
    }),
    btn: (bg: string, color = "#fff"): React.CSSProperties => ({
      background: bg, color, border: "none", borderRadius: 10, padding: "9px 18px",
      fontSize: 13, fontWeight: 600 as const, cursor: "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
    }),
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, fontFamily: "'Cairo',sans-serif", color: "#1e466e" }}>
      جاري التحميل...
    </div>
  );

  const savedRoomIds = new Set(savedRoomData.map(a => a.salle_id));
  const availableSalles = salles.filter(s => !assignments.find(a => a.salle_id === s.id) && !savedRoomIds.has(s.id) && !overlappingRoomIds.has(s.id));
  const examForMatiere = selectedMatiere ? examens.find(ex => ex.matiere === selectedMatiere) : null;

  // Build saved rooms list from candidat_assignments (per-candidate) or fallback to ExamenSalle
  type SavedRoomGroup = {
    salle: Salle | undefined;
    records: ExamenSalleRecord[];
    series: Serie[];
    inscriptions: Inscription[];
    candidats: CandidatSelected[];
    layout: "15" | "18";
  };
  const roomsBySalle = new Map<number, SavedRoomGroup>();
  if (savedRoomData.length > 0) {
    // New per-candidate assignments
    for (const a of savedRoomData) {
      const sal = salles.find(s => s.id === a.salle_id);
      const serieIds = [...new Set(a.candidats.map(c => c.serie_id))];
      const grp: SavedRoomGroup = {
        salle: sal, records: [], series: series.filter(s => serieIds.includes(s.id)),
        inscriptions: [], candidats: a.candidats, layout: a.layout,
      };
      roomsBySalle.set(a.salle_id, grp);
    }
  } else {
    // Fallback: ExamenSalle records (per-serie, load all inscriptions)
    for (const rec of savedExamenSalles) {
      if (!roomsBySalle.has(rec.salle)) {
        const sal = salles.find(s => s.id === rec.salle);
        roomsBySalle.set(rec.salle, { salle: sal, records: [], series: [], inscriptions: [], candidats: [], layout: "18" });
      }
      const group = roomsBySalle.get(rec.salle)!;
      group.records.push(rec);
    }
    for (const [, group] of roomsBySalle) {
      const serieIds = [...new Set(group.records.map(r => r.serie))];
      group.series = series.filter(s => serieIds.includes(s.id));
      group.inscriptions = inscriptions.filter(ins => serieIds.includes(ins.serie));
    }
  }
  const savedRoomsList = Array.from(roomsBySalle.entries()).map(([salleId, g]) => ({ salleId, ...g }));

  return (
    <div className="general" style={{ padding: "1.5rem" }}>
      <Header />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e466e", margin: 0 }}>إعداد وثائق الامتحانات الاختيارية</h1>
          <p style={{ color: "#5f6368", fontSize: 13, margin: "4px 0 0" }}>المواد الاختيارية · اختيار المترشحين · مخطط القاعة</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.25rem", alignItems: "start" }}>

          {/* ══════ LEFT SIDEBAR — Saved Rooms ══════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={c.card}>
              <div style={c.hd}>
                <FileText size={16} color="#1e466e" />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>القاعات المحفوظة</h2>
                <span style={c.badge("#1e466e", "#e8f0fe")}>{savedRoomsList.length}</span>
                {savedRoomsList.length > 0 && (
                  <div style={{ marginRight: "auto", display: "flex", gap: 4 }}>
                    <button onClick={() => setSelectedKeys(new Set(savedRoomsList.map(r => String(r.salleId))))}
                      style={{ ...c.btn("#e8f0fe", "#1a56db"), fontSize: 11, padding: "3px 8px" }}>
                      الكل
                    </button>
                    <button onClick={() => setSelectedKeys(new Set())}
                      style={{ ...c.btn("#f1f3f4", "#6b7280"), fontSize: 11, padding: "3px 8px" }}>
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
              <div style={c.pad}>
                {!selectedMatiere ? (
                  <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>اختر مادة للبدء</p>
                ) : savedRoomsList.length === 0 ? (
                  <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>لا توجد قاعات محفوظة</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {savedRoomsList.map(room => {
                      const key = String(room.salleId);
                      const checked = selectedKeys.has(key);
                      return (
                        <div key={key} onClick={() => { setActiveRoomId(room.salleId); setViewMode("saved"); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                            borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                            background: activeRoomId === room.salleId ? "#e8f0fe" : "#f8f9fa",
                            border: `1.5px solid ${activeRoomId === room.salleId ? "#1a56db" : "#e8eaed"}`,
                          }}>
                          <div onClick={e => { e.stopPropagation(); setSelectedKeys(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; }); }}
                            style={{ cursor: "pointer", color: checked ? "#1a56db" : "#9aa0a6", display: "flex" }}>
                            {checked ? <CheckSquare size={20} /> : <Square size={20} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#202124" }}>قاعة {room.salle?.numero}</div>
                            <div style={{ fontSize: 11, color: "#5f6368", marginTop: 1 }}>
                              {room.series.map(s => s.nom).join("، ") || "?"} · {(room.candidats?.length || room.inscriptions.length)} مترشح
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); deleteSavedRoom(room.salleId); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: 2 }}>
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: "0.75rem" }}>
                  <button onClick={() => setViewMode("add")}
                    style={{ ...c.btn("#e8f0fe", "#1a56db"), width: "100%", justifyContent: "center", fontSize: 13 }}>
                    + إضافة قاعة
                  </button>
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div style={c.card}>
              <div style={c.hd}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>ملخص</h2>
              </div>
              <div style={c.pad}>
                {selectedMatiere ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f3f4", paddingBottom: 6 }}>
                      <span style={{ color: "#5f6368" }}>المادة</span>
                      <span style={{ fontWeight: 500 }}>{getMatiere(selectedMatiere)}</span>
                    </div>
                    <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f3f4", paddingBottom: 6 }}>
                      <span style={{ color: "#5f6368" }}>القاعات</span>
                      <span style={{ fontWeight: 500 }}>{selectedKeys.size} / {savedRoomsList.length}</span>
                    </div>
                    <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#5f6368" }}>المترشحين</span>
                      <span style={{ fontWeight: 500 }}>
                        {Array.from(roomsBySalle.entries())
                          .filter(([id]) => selectedKeys.has(String(id)))
                          .reduce((acc, [, g]) => acc + ((g.candidats?.length) || g.inscriptions.length), 0)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ color: "#5f6368" }}>التصميم</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["15", "18"] as const).map(v => (
                          <button key={v} onClick={() => setGenerateLayout(v)}
                            style={{
                              padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 12,
                              border: `2px solid ${generateLayout === v ? "#1a56db" : "#d1d5db"}`,
                              background: generateLayout === v ? "#e8f0fe" : "#fff",
                              color: generateLayout === v ? "#1a56db" : "#374151",
                              cursor: "pointer", fontFamily: "inherit",
                            }}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center" }}>اختر مادة للبدء</p>
                )}
              </div>
            </div>
          </div>

          {/* ══════ MAIN AREA ══════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Étape 1 : choix matiere */}
            <div style={c.card}>
              <div style={c.hd}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1a56db" }}>1</div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>اختر المادة</h2>
              </div>
              <div style={c.pad}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {optionalMatieres.map(m => {
                    const sectionsWithExam = getSectionsForMatiere(m.id);
                    const hasExams = sectionsWithExam.length > 0;
                    return (
                      <button key={m.id}
                        onClick={() => hasExams && handleMatiereChange(m.id)}
                        disabled={!hasExams}
                        style={{
                          padding: "10px 20px", fontSize: 14, fontWeight: 600, borderRadius: 20,
                          border: `2px solid ${selectedMatiere === m.id ? "#1a56db" : "#e8eaed"}`,
                          background: selectedMatiere === m.id ? "#e8f0fe" : "#fff",
                          color: hasExams ? (selectedMatiere === m.id ? "#1a56db" : "#374151") : "#c0c4cc",
                          cursor: hasExams ? "pointer" : "not-allowed",
                          fontFamily: "inherit",
                          opacity: hasExams ? 1 : 0.5,
                        }}>
                        {selectedMatiere === m.id ? "✓ " : ""}{m.nom}
                      </button>
                    );
                  })}
                </div>
                {optionalMatieres.length === 0 && (
                  <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>لا توجد مواد اختيارية</p>
                )}
              </div>
            </div>

            {/* Main content: saved room detail OR add room flow */}
            {selectedMatiere && viewMode === "saved" && activeRoomId && (() => {
              const room = savedRoomsList.find(r => r.salleId === activeRoomId);
              if (!room) return null;
              const useCands = room.candidats && room.candidats.length > 0;
              const items = useCands ? room.candidats : room.inscriptions;
              return (
                <div style={c.card}>
                  <div style={c.hd}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0, flex: 1 }}>
                      قاعة {room.salle?.numero}
                    </h2>
                    <span style={c.badge("#15803d", "#dcfce7")}>{items.length} مترشح</span>
                    <button onClick={() => {
                      const existing = assignments.find(a => a.salle_id === activeRoomId);
                      if (!existing) {
                        setAssignments(prev => [...prev, {
                          salle_id: activeRoomId,
                          layout: room.layout,
                          section_ids: [...new Set(room.series.map(s => s.section).filter(Boolean))] as number[],
                          serie_ids: room.series.map(s => s.id),
                          candidats: useCands ? [...room.candidats] : [],
                        }]);
                      }
                      setActiveSalle(activeRoomId);
                      setViewMode("add");
                    }}
                      style={{ ...c.btn("#fef3c7", "#b45309"), fontSize: 12, padding: "6px 14px" }}>
                      تعديل
                    </button>
                  </div>
                  <div style={c.pad}>
                    {examForMatiere && (
                      <div style={{ padding: "10px 14px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fde68a", marginBottom: "1rem" }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#b45309", margin: 0 }}>
                          {fmtDate(examForMatiere.date)} | {fmtTime(examForMatiere.heure_debut)} – {fmtTime(examForMatiere.heure_fin)}
                        </p>
                      </div>
                    )}
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>
                      السلاسل: {room.series.map(s => s.nom).join("، ")}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>
                      قائمة المترشحين ({items.length}):
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 400, overflowY: "auto", padding: 10, background: "#f8f9fa", borderRadius: 12 }}>
                      {items.map((item: any, idx: number) => (
                        <div key={item.num_ins || idx}
                          style={{
                            padding: "6px 12px", fontSize: 11, fontWeight: 500, borderRadius: 8,
                            border: "2px solid #e8eaed", background: "#fff",
                            color: "#374151", fontFamily: "inherit", textAlign: "right", minWidth: 120,
                          }}>
                          <div style={{ fontWeight: 700 }}>{item.num_ins}</div>
                          <div style={{ fontSize: 10, opacity: 0.7 }}>{item.nom_prenom}</div>
                          <div style={{ fontSize: 9, color: "#1a56db" }}>{item.section || (item as any).serie_nom}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Add room flow */}
            {selectedMatiere && viewMode === "add" && (
              <>
                {/* Étape 2 : choix salle */}
                <div style={c.card}>
                  <div style={c.hd}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#b45309" }}>2</div>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>اختر القاعة</h2>
                    <span style={c.badge("#166534", "#f0fdf4")}>{getMatiere(selectedMatiere)}</span>
                    <button onClick={() => setViewMode("saved")}
                      style={{ ...c.btn("#f1f3f4", "#374151"), marginRight: "auto" }}>
                      عودة
                    </button>
                  </div>
                  <div style={c.pad}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {availableSalles.map(s => (
                        <button key={s.id}
                          onClick={() => addSalle(s.id)}
                          style={{
                            padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 20,
                            border: "2px solid #e8eaed",
                            background: "#fff",
                            color: "#374151",
                            cursor: "pointer", fontFamily: "inherit",
                          }}>
                          + قاعة {s.numero}
                        </button>
                      ))}
                    </div>
                    {availableSalles.length === 0 && (
                      <p style={{ color: "#9aa0a6", fontSize: 13 }}>جميع القاعات تم اختيارها</p>
                    )}
                  </div>
                </div>

                {/* Salles avec sections/series/candidats */}
                {assignments.length > 0 && (
                  assignments.map(a => {
                    const salle = salles.find(s => s.id === a.salle_id);
                    const open = activeSalle === a.salle_id;
                    const layout = a.layout;

                    return (
                      <div key={a.salle_id} style={{ ...c.card, border: `2px solid ${open ? "#1a56db" : "#e8eaed"}` }}>
                        <div style={{ ...c.hd, cursor: "pointer", background: open ? "#e8f0fe" : "#f8f9fa" }} onClick={() => setActiveSalle(open ? null : a.salle_id)}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#202124", flex: 1 }}>قاعة {salle?.numero}</span>
                          <span style={c.badge("#15803d", "#dcfce7")}>{a.candidats.length}/{layout} مترشح</span>
                          {open ? <ChevronUp size={20} color="#5f6368" /> : <ChevronDown size={20} color="#5f6368" />}
                          <button onClick={e => { e.stopPropagation(); removeSalle(a.salle_id); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: 4, marginRight: 8 }}>
                            <X size={18} />
                          </button>
                        </div>

                        {open && (
                          <div style={{ ...c.pad, display: "flex", flexDirection: "column", gap: "1rem" }}>

                            {examForMatiere && (
                              <div style={{ padding: "10px 14px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fde68a" }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "#b45309", margin: 0 }}>
                                  {fmtDate(examForMatiere.date)} | {fmtTime(examForMatiere.heure_debut)} – {fmtTime(examForMatiere.heure_fin)}
                                </p>
                              </div>
                            )}

                            {/* Layout */}
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>اختر التصميم:</p>
                              <div style={{ display: "flex", gap: 10 }}>
                                {(["15", "18"] as const).map(v => (
                                  <button key={v}
                                    onClick={() => setAssignments(prev => prev.map(a2 => a2.salle_id === a.salle_id ? { ...a2, layout: v } : a2))}
                                    style={{
                                      padding: "8px 24px", fontSize: 14, fontWeight: 700, borderRadius: 16,
                                      border: `2px solid ${a.layout === v ? "#1a56db" : "#d1d5db"}`,
                                      background: a.layout === v ? "#1a56db" : "#fff",
                                      color: a.layout === v ? "#fff" : "#374151",
                                      cursor: "pointer", fontFamily: "inherit",
                                    }}>
                                    {v} مقعد
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Assigned candidates list (with remove) */}
                            {a.candidats.length > 0 && (
                              <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>
                                  المترشحون في هذه القاعة ({a.candidats.length}/{layout}):
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, background: "#f0fdf4", borderRadius: 12 }}>
                                  {a.candidats.map(c => (
                                    <div key={c.num_ins}
                                      style={{
                                        padding: "6px 12px", fontSize: 11, fontWeight: 500, borderRadius: 8,
                                        border: "2px solid #bbf7d0", background: "#fff",
                                        color: "#15803d", fontFamily: "inherit", textAlign: "right", minWidth: 120,
                                        display: "flex", alignItems: "center", gap: 6,
                                      }}>
                                      <button onClick={() => {
                                        toggleCandidat(a.salle_id, c, layout);
                                      }}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 0, fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                                        ×
                                      </button>
                                      <div>
                                        <div style={{ fontWeight: 700 }}>{c.num_ins}</div>
                                        <div style={{ fontSize: 10, opacity: 0.7 }}>{c.serie_nom}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Available candidates (already-assigned ones hidden) */}
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>
                                اختر المترشحين {a.candidats.length >= parseInt(layout) && <span style={{ color: "#dc2626", fontSize: 11 }}>(القاعة ممتلئة)</span>}
                              </p>
                              {(() => {
                                const allMatSeries = series.filter(s => {
                                  const secs = selectedMatiere ? getSectionsForMatiere(selectedMatiere).map(x => x.id) : [];
                                  return secs.includes(s.section);
                                });
                                const allMatCands = inscriptions.filter(ins => allMatSeries.some(s => s.id === ins.serie));
                                const takenNums = new Set(assignments.flatMap(x => x.candidats.map(xc => xc.num_ins)));
                                const available = allMatCands.filter(c => !takenNums.has(c.num_ins) && !usedCandidateNums.has(c.num_ins));
                                if (available.length === 0) {
                                  return <p style={{ color: "#9aa0a6", fontSize: 12 }}>جميع المترشحين تم اختيارهم</p>;
                                }
                                return (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 300, overflowY: "auto", padding: 10, background: "#f8f9fa", borderRadius: 12 }}>
                                    {available.map(c => {
                                      const serie = series.find(s => s.id === c.serie);
                                      const sectionName = sections.find(s => s.id === serie?.section)?.nom || c.section;
                                      const disabled = a.candidats.length >= parseInt(layout);
                                      return (
                                        <button key={c.num_ins}
                                          onClick={() => !disabled && toggleCandidat(a.salle_id, {
                                            num_ins: c.num_ins,
                                            nom_prenom: c.nom_prenom,
                                            cin: c.cin,
                                            section: c.section,
                                            section_nom: sectionName,
                                            serie_id: c.serie,
                                            serie_nom: serie?.nom || "",
                                            etablissement: c.etablissement,
                                          }, layout)}
                                          disabled={disabled}
                                          style={{
                                            padding: "6px 12px", fontSize: 11, fontWeight: 500, borderRadius: 8,
                                            border: `2px solid ${disabled ? "#e8eaed" : "#e8eaed"}`,
                                            background: disabled ? "#f5f5f5" : "#fff",
                                            color: disabled ? "#c0c4cc" : "#64748b",
                                            cursor: disabled ? "not-allowed" : "pointer",
                                            fontFamily: "inherit",
                                            textAlign: "right",
                                            minWidth: 120,
                                            opacity: disabled ? 0.5 : 1,
                                          }}>
                                          <div style={{ fontWeight: 700 }}>{c.num_ins}</div>
                                          <div style={{ fontSize: 10, opacity: 0.7 }}>{c.nom_prenom}</div>
                                          {serie && <div style={{ fontSize: 9, color: "#1a56db" }}>{serie.nom}</div>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* Error + buttons */}
            {selectedMatiere && (
              <div style={{ ...c.card }}>
                <div style={c.pad}>
                  {genError && (
                    <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c0392b", margin: "0 0 0.75rem" }}>
                      {genError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    {viewMode === "saved" ? (
                      <button onClick={() => {
                        // Gather selected rooms and generate
                        const selectedRooms = Array.from(roomsBySalle.entries()).filter(([id]) => selectedKeys.has(String(id)));
                        if (selectedRooms.length === 0) { setGenError("اختر قاعة واحدة على الأقل"); return; }
                        generateSelected(selectedRooms);
                      }} disabled={generating || selectedKeys.size === 0}
                        style={{ ...c.btn(generating || selectedKeys.size === 0 ? "#9aa0a6" : "#1e466e"), flex: 1, justifyContent: "center", padding: "13px 0", fontSize: 14 }}>
                        {generating
                          ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> جاري الإنشاء...</>
                          : <><Printer size={15} /> إنشاء الوثائق</>}
                      </button>
                    ) : (
                      <>
                        <button onClick={saveRooms} disabled={saving || !selectedMatiere || assignments.length === 0}
                          style={{ ...c.btn(saving || !selectedMatiere || assignments.length === 0 ? "#9aa0a6" : "#0f6e56"), flex: 1, justifyContent: "center", padding: "13px 0", fontSize: 14 }}>
                          {saving
                            ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> جاري الحفظ...</>
                            : saved ? <>✓ حفظت القاعات</> : <><FileText size={15} /> حفظ القاعات</>}
                        </button>
                        <button onClick={generateAll} disabled={generating || !selectedMatiere || assignments.length === 0}
                          style={{ ...c.btn(generating || !selectedMatiere || assignments.length === 0 ? "#9aa0a6" : "#1e466e"), flex: 1, justifyContent: "center", padding: "13px 0", fontSize: 14 }}>
                          {generating
                            ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> جاري الإنشاء...</>
                            : <><Printer size={15} /> إنشاء الوثائق</>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "2rem", maxWidth: 500, width: "100%", direction: "rtl", fontFamily: "'Cairo',sans-serif", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px" }}>✅</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#202124", margin: "0 0 4px" }}>وثائقك جاهزة للتحميل</h3>
              <p style={{ fontSize: 13, color: "#5f6368", margin: 0 }}>
                {docs.length} مخطط قاعة · {presenceDocs.length} بطاقة حضور
              </p>
            </div>

            {dlError && (
              <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#c0392b", marginBottom: 12 }}>
                {dlError}
              </div>
            )}

            {docs.length > 0 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#5f6368", margin: "0 0 8px" }}>🗺️ مخططات القاعة</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
                  {docs.map(doc => (
                    <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #d1fae5" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>{doc.label}</p>
                        <p style={{ fontSize: 11, color: "#5f6368", margin: "1px 0 0" }}>.docx</p>
                      </div>
                      <button onClick={() => download(doc.doc_id, doc.label)} style={c.btn("#1e466e")}>
                        <Download size={14} /> تحميل
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {presenceDocs.length > 0 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#5f6368", margin: "0 0 8px" }}>📋 بطاقات الحضور</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
                  {presenceDocs.map(doc => (
                    <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#e8f0fe", borderRadius: 10, border: "1px solid #c7d7f9" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>{doc.label}</p>
                        <p style={{ fontSize: 11, color: "#5f6368", margin: "1px 0 0" }}>.docx</p>
                      </div>
                      <button onClick={() => download(doc.doc_id, doc.label)} style={c.btn("#0f6e56")}>
                        <Download size={14} /> تحميل
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={downloadAll} style={{ ...c.btn("#1e466e"), flex: 1, justifyContent: "center" }}>
                <Download size={15} /> تحميل الكل ({docs.length + presenceDocs.length})
              </button>
              <button onClick={() => setShowModal(false)} style={{ ...c.btn("#f1f3f4", "#374151"), flex: 1, justifyContent: "center" }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
