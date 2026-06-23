import React, { useEffect, useState } from "react";
import { FileText, Download, Printer, Save, Plus, Trash2, Loader } from "lucide-react";
import API from "../services/api";
import Header from "../components/Header";
import "./acceuil/home.css";
import "../pages/dashbords/pagecss/general.css";

type Matiere = { id: number; nom: string };
type Section = { id: number; nom: string };
type Salle   = { id: number; numero: number };
type Serie   = { id: number; nom: string; section: number; section_nom?: string; inscription_count?: number };
type Jour = { date: string; label: string };
type Session = { id: number; nom: string; jours: Jour[] };
type MatiereSection = { id: number; matiere: number; section: number; heures: number; type: string; matiere_nom?: string; section_nom?: string };
type Inscription = { id: number; num_ins: string; nom_prenom: string; cin?: string; section: string; serie: number; etablissement?: string; resultat?: string };

type Examen = {
  id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  matiere: number;
  section: number;
  session: number;
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

type DayAssignment = {
  id?: number;
  examen_id: number;
  salle_id: number;
  serie_id: number | null;
  salle_numero?: number;
  matiere_nom?: string;
  serie_nom?: string;
  heure_debut?: string;
  heure_fin?: string;
  section_id?: number;
  section_nom?: string;
  layout?: "15" | "18";
};

type ControleRoom = {
  uid: string;
  salle_id: number | null;
  salle_numero?: number;
  serie_ids: number[];
  layout: "15" | "18";
  candidats: CandidatSelected[];
};

type GeneratedDoc = {
  doc_id: string;
  label: string;
  type: "presence" | "plan" | "verif" | "envelope" | "numero" | "sortie" | "door";
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-TN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function fmtTime(t: string) { return t.slice(0, 5); }
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString("ar-TN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

const SECTIONS_ORDER = ["الآداب", "علوم تجريبية", "الاقتصاد و التصرف", "علوم تقنية", "علوم إعلامية", "رياضيات", "رياضة"];

export default function DocumentsPage() {
  const [examens,  setExamens]  = useState<Examen[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [salles,   setSalles]   = useState<Salle[]>([]);
  const [series,   setSeries]   = useState<Serie[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [matiereSections, setMatiereSections] = useState<MatiereSection[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dayAssignments, setDayAssignments] = useState<DayAssignment[]>([]);
  const [savingDay, setSavingDay] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [verifGenerating, setVerifGenerating] = useState(false);
  const [importingResults, setImportingResults] = useState(false);
  const [importResultMsg, setImportResultMsg] = useState("");
  const [genError,   setGenError]   = useState("");
  const [dlError,    setDlError]    = useState("");
  const [docs,       setDocs]       = useState<GeneratedDoc[]>([]);
  const [showModal,  setShowModal]  = useState(false);
  const [presenceDocs, setPresenceDocs] = useState<GeneratedDoc[]>([]);
  const [verifDocs, setVerifDocs] = useState<GeneratedDoc[]>([]);

  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<number>>(new Set());
  const [sessionRooms, setSessionRooms] = useState<ControleRoom[]>([]);
  const [savingSessionRooms, setSavingSessionRooms] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [showRoomSetup, setShowRoomSetup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 15000);
    (async () => {
      try {
        const results = await Promise.allSettled([
          API.get("examens/"),
          API.get("matieres/"),
          API.get("general/"),
          API.get("salles/"),
          API.get("series/"),
          API.get("sessions/"),
          API.get("matieres-sections/"),
          API.get("inscriptions/"),
        ]);
        if (results[0].status === "fulfilled") setExamens(results[0].value.data);
        if (results[1].status === "fulfilled") setMatieres(results[1].value.data);
        if (results[2].status === "fulfilled") {
          const sections = [...(results[2].value.data.sections || [])].sort((a, b) => {
            const ai = SECTIONS_ORDER.indexOf(a.nom);
            const bi = SECTIONS_ORDER.indexOf(b.nom);
            return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
          });
          setSections(sections);
        }
        if (results[3].status === "fulfilled") setSalles(results[3].value.data);
        if (results[4].status === "fulfilled") setSeries(results[4].value.data);
        if (results[5].status === "fulfilled") setSessions(results[5].value.data);
        if (results[6].status === "fulfilled") setMatiereSections(results[6].value.data);
        if (results[7].status === "fulfilled") setInscriptions(results[7].value.data);
      } catch (e) { console.warn(e); }
      finally { clearTimeout(timer); setLoading(false); }
    })();
    return () => clearTimeout(timer);
  }, []);

  const getMatiere          = (id: number) => matieres.find(m => m.id === id)?.nom || "?";
  const getSection          = (id: number) => sections.find(s => s.id === id)?.nom || "?";
  const getSeriesForSection = (sectionId: number) => series.filter(s => s.section === sectionId);
  const getSerie            = (id: number) => series.find(s => s.id === id);
  const isOptional = (matiereId: number, sectionId: number) =>
    matiereSections.some(ms => ms.matiere === matiereId && ms.section === sectionId && ms.type === 'optionnelle');
  const getInscriptionsBySerie = (serieId: number) => inscriptions.filter(ins => ins.serie === serieId);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportResults = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingResults(true);
    setImportResultMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await API.post("import-resultats/", form);
      setImportResultMsg(res.data.message || "تم الاستيراد");
      // Re-fetch inscriptions to get updated resultat field
      const insRes = await API.get("inscriptions/");
      setInscriptions(insRes.data);
    } catch (err: any) {
      setImportResultMsg(err?.response?.data?.error || "خطأ في استيراد النتائج");
    }
    setImportingResults(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const isControleSession = selectedSession?.nom?.includes("مراقبة") || selectedSession?.nom?.toLowerCase().includes("controle");
  const sessionDates = selectedSession?.jours?.map(j => j.date).sort() || [];
  const uniqueDates = sessionDates.length > 0 ? sessionDates
    : [...new Set(examens.filter(e => e.session === selectedSessionId).map(e => e.date))].sort();

  // Compute all unique time slots from exams for the selected date
  const allTimeSlots = selectedDate && isControleSession
    ? [...new Set(examens.filter(e => e.date === selectedDate && e.session === selectedSessionId && !isOptional(e.matiere, e.section)).map(e => e.heure_debut))].sort()
    : [];

  // ==================== SESSION ROOMS (contrôle) ====================

  const loadSessionRooms = async (sessionId: number) => {
    try {
      const res = await API.get(`controle-config/?session=${sessionId}`);
      if (res.data.length > 0 && res.data[0].rooms) {
        setSessionRooms(res.data[0].rooms.map((r: any, idx: number) => ({
          uid: `sr-${idx}`,
          salle_id: r.salle_id ?? null,
          salle_numero: r.salle_numero,
          serie_ids: r.serie_ids || [],
          layout: r.layout || "18",
          candidats: r.candidats || [],
        })));
      } else {
        setSessionRooms([]);
      }
    } catch {
      setSessionRooms([]);
    }
  };

  const saveSessionRooms = async () => {
    setSavingSessionRooms(true);
    try {
      const payload = sessionRooms.map(r => ({
        salle_id: r.salle_id,
        salle_numero: r.salle_numero,
        serie_ids: r.serie_ids,
        layout: r.layout,
        candidats: r.candidats,
      }));
      const res = await API.get(`controle-config/?session=${selectedSessionId}`);
      if (res.data.length > 0) {
        await API.patch(`controle-config/${res.data[0].id}/`, { rooms: payload, session: selectedSessionId });
      } else {
        await API.post("controle-config/", { rooms: payload, session: selectedSessionId });
      }
      setGenError("");
    } catch (err: any) {
      setGenError(err?.response?.data?.error || "خطأ في حفظ القاعات");
    }
    setSavingSessionRooms(false);
  };

  const addSessionRoom = () => {
    const newRoom: ControleRoom = {
      uid: `sr-${Date.now()}`,
      salle_id: null,
      serie_ids: [],
      layout: "18",
      candidats: [],
    };
    setSessionRooms(prev => [...prev, newRoom]);
  };

  const removeSessionRoom = (uid: string) => {
    setSessionRooms(prev => prev.filter(r => r.uid !== uid));
  };

  const changeSessionRoomSalle = (uid: string, salleId: number) => {
    setSessionRooms(prev => prev.map(r => {
      if (r.uid !== uid) return r;
      const salle = salles.find(s => s.id === salleId);
      return { ...r, salle_id: salleId, salle_numero: salle?.numero };
    }));
  };

  const changeSessionRoomLayout = (uid: string, layout: "15" | "18") => {
    setSessionRooms(prev => prev.map(r => r.uid !== uid ? r : { ...r, layout }));
  };

  const toggleSessionRoomSerie = (uid: string, serieId: number) => {
    setSessionRooms(prev => prev.map(r => {
      if (r.uid !== uid) return r;
      const has = r.serie_ids.includes(serieId);
      if (has) {
        return {
          ...r,
          serie_ids: r.serie_ids.filter(s => s !== serieId),
          candidats: r.candidats.filter(c => c.serie_id !== serieId),
        };
      } else {
        const sr = getSerie(serieId);
        const sectionNom = sr ? getSection(sr.section) : "?";
        const serieIns = getInscriptionsBySerie(serieId).filter(i => !isControleSession || i.resultat === 'controle');
        const ins = serieIns.map(i => ({
          num_ins: i.num_ins,
          nom_prenom: i.nom_prenom,
          cin: i.cin,
          section: String(i.section),
          section_nom: sectionNom,
          serie_id: serieId,
          serie_nom: sr?.nom || "?",
          etablissement: i.etablissement,
        }));
        return {
          ...r,
          serie_ids: [...r.serie_ids, serieId],
          candidats: [...r.candidats, ...ins],
        };
      }
    }));
  };

  const addCandidatToSessionRoom = (uid: string, candidat: CandidatSelected) => {
    setSessionRooms(prev => prev.map(r => {
      if (r.uid !== uid) return r;
      if (r.candidats.some(c => c.num_ins === candidat.num_ins)) return r;
      const serieId = candidat.serie_id;
      const serieIds = r.serie_ids.includes(serieId) ? r.serie_ids : [...r.serie_ids, serieId];
      return { ...r, serie_ids: serieIds, candidats: [...r.candidats, candidat] };
    }));
  };

  const removeCandidatFromSessionRoom = (uid: string, numIns: string) => {
    setSessionRooms(prev => prev.map(r => {
      if (r.uid !== uid) return r;
      const newCandidats = r.candidats.filter(c => c.num_ins !== numIns);
      const remainingSerieIds = [...new Set(newCandidats.map(c => c.serie_id))];
      return { ...r, candidats: newCandidats, serie_ids: remainingSerieIds };
    }));
  };

  // ==================== SESSION / DATE SELECTION ====================

  const selectSession = async (id: number) => {
    setSelectedSessionId(id);
    setSelectedDate("");
    setDayAssignments([]);
    setSelectedRoomIds(new Set());
    setSelectedTimeSlot(null);
    setShowRoomSetup(false);
    const sess = sessions.find(s => s.id === id);
    const isCtrl = sess?.nom?.includes("مراقبة") || sess?.nom?.toLowerCase().includes("controle");
    if (isCtrl) {
      await loadSessionRooms(id);
      setShowRoomSetup(true);
    } else {
      setSessionRooms([]);
    }
  };

  const loadSavedAssignments = async (date: string) => {
    const examsOnDate = examens.filter(e =>
      e.date === date && e.session === selectedSessionId && !isOptional(e.matiere, e.section)
    );
    const results = await Promise.allSettled(
      examsOnDate.map(ex => API.get(`examen-salles/?examen=${ex.id}`))
    );
    const loaded: DayAssignment[] = [];
    for (let i = 0; i < examsOnDate.length; i++) {
      const ex = examsOnDate[i];
      if (results[i].status !== "fulfilled") continue;
      const records = (results[i] as PromiseFulfilledResult<any>).value.data;
      if (!records || records.length === 0) continue;
      for (const rec of records) {
        loaded.push({
          examen_id: ex.id,
          salle_id: rec.salle,
          serie_id: rec.serie,
          salle_numero: rec.salle_numero,
          matiere_nom: getMatiere(ex.matiere),
          serie_nom: rec.serie_nom,
          heure_debut: ex.heure_debut,
          heure_fin: ex.heure_fin,
          section_id: ex.section,
          section_nom: getSection(ex.section),
          layout: rec.layout || "18",
        });
      }
    }
    if (loaded.length > 0) {
      loaded.sort((a, b) => {
        const ai = SECTIONS_ORDER.indexOf(a.section_nom || "");
        const bi = SECTIONS_ORDER.indexOf(b.section_nom || "");
        return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
      });
      setDayAssignments(loaded);
    } else autoAssignDay(date);
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedRoomIds(new Set());
    setSelectedTimeSlot(allTimeSlots.length > 0 ? allTimeSlots[0] : null);
    if (!isControleSession) {
      loadSavedAssignments(date);
    }
  };

  const autoAssignDay = (date: string) => {
    const examsOnDate = examens.filter(e =>
      e.date === date && e.session === selectedSessionId && !isOptional(e.matiere, e.section)
    ).sort((a, b) => {
      const t = a.heure_debut.localeCompare(b.heure_debut);
      if (t !== 0) return t;
      const sa = SECTIONS_ORDER.indexOf(getSection(a.section));
      const sb = SECTIONS_ORDER.indexOf(getSection(b.section));
      return (sa >= 0 ? sa : 999) - (sb >= 0 ? sb : 999);
    });
    const newAssignments: DayAssignment[] = [];
    const byTime: Record<string, typeof examsOnDate> = {};
    for (const ex of examsOnDate) {
      if (!byTime[ex.heure_debut]) byTime[ex.heure_debut] = [];
      byTime[ex.heure_debut].push(ex);
    }
    for (const time of Object.keys(byTime).sort()) {
      const examsInSlot = byTime[time];
      let roomIdx = 0;
      for (const ex of examsInSlot) {
        const matiereName = getMatiere(ex.matiere);
        const examSeries = getSeriesForSection(ex.section);
        for (const sr of examSeries) {
          const room = salles.length > 0 ? salles[roomIdx % salles.length] : null;
          if (room) {
            newAssignments.push({
              examen_id: ex.id,
              salle_id: room.id,
              serie_id: sr.id,
              salle_numero: room.numero,
              matiere_nom: matiereName,
              serie_nom: sr.nom,
              heure_debut: ex.heure_debut,
              heure_fin: ex.heure_fin,
              section_id: ex.section,
              section_nom: getSection(ex.section),
              layout: "18",
            });
          }
          roomIdx++;
        }
      }
    }
    setDayAssignments(newAssignments);
  };

  // ==================== PRINCIPAL ROOM MUTATORS ====================

  const changeRoom = (idx: number, newSalleId: number) => {
    setDayAssignments(prev => prev.map((a, i) => {
      if (i !== idx) return a;
      const salle = salles.find(s => s.id === newSalleId);
      return { ...a, salle_id: newSalleId, salle_numero: salle?.numero };
    }));
  };

  const changeLayout = (idx: number, layout: "15" | "18") => {
    setDayAssignments(prev => prev.map((a, i) => i !== idx ? a : { ...a, layout }));
  };

  const removeAssignment = (idx: number) => {
    const removed = dayAssignments[idx];
    setDayAssignments(prev => prev.filter((_, i) => i !== idx));
    if (removed) {
      setSelectedRoomIds(prev => {
        const next = new Set(prev);
        next.delete(removed.salle_id);
        return next;
      });
    }
  };

  const toggleRoomSelection = (salleId: number) => {
    setSelectedRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(salleId)) next.delete(salleId);
      else next.add(salleId);
      return next;
    });
  };

  // ==================== SAVE ====================

  const saveDayAssignments = async () => {
    setSavingDay(true);
    try {
      if (isControleSession) {
        const roomsWithSalle = sessionRooms.filter(r => r.salle_id);
        const examsOnDate = examens.filter(e =>
          e.date === selectedDate && e.session === selectedSessionId && !isOptional(e.matiere, e.section)
        );
        const times = [...new Set(examsOnDate.map(e => e.heure_debut))].sort();
        for (const time of times) {
          const examsInSlot = examsOnDate.filter(e => e.heure_debut === time);
          for (const ex of examsInSlot) {
            const sectionSerieIds = series.filter(sr => sr.section === ex.section).map(sr => sr.id);
            const roomsForExamen = roomsWithSalle.filter(r => r.serie_ids.some(sid => sectionSerieIds.includes(sid)));
            const roomsPayload = roomsForExamen.map(r => ({
              salle_id: r.salle_id!,
              layout: r.layout || "18",
              serie_ids: r.serie_ids.filter(sid => sectionSerieIds.includes(sid)),
              candidats: r.candidats.filter(c => c.serie_id && sectionSerieIds.includes(c.serie_id)),
            }));
            await API.patch(`examens/${ex.id}/`, {
              candidat_assignments: { rooms: roomsPayload },
            });
          }
        }
      } else {
        const affectedExams = [...new Set(dayAssignments.map(a => a.examen_id))];
        for (const eid of affectedExams) {
          await API.delete(`examen-salles/clear/?examen=${eid}`);
        }
        for (const a of dayAssignments) {
          await API.post("examen-salles/", {
            examen: a.examen_id,
            salle: a.salle_id,
            serie: a.serie_id,
            layout: a.layout || "18",
          });
        }
      }
    } catch (err: any) {
      setGenError(err?.response?.data?.error || "خطأ في الحفظ");
    }
    setSavingDay(false);
  };

  // ==================== GENERATE DOCUMENTS ====================

  const generateDocuments = async () => {
    if (isControleSession) {
      const selected = sessionRooms.filter(r => r.salle_id != null && selectedRoomIds.has(r.salle_id));
      if (selected.length === 0) { setGenError("اختر قاعة واحدة على الأقل"); return; }
      if (!selectedTimeSlot) { setGenError("اختر وقت"); return; }
      setGenerating(true); setGenError(""); setDocs([]); setPresenceDocs([]);
      const allPlanDocs: GeneratedDoc[] = [];
      const allPresDocs: GeneratedDoc[] = [];
      const errors: string[] = [];
      const examsInSlot = examens.filter(e =>
        e.date === selectedDate && e.session === selectedSessionId && e.heure_debut === selectedTimeSlot && !isOptional(e.matiere, e.section)
      );
      for (const ex of examsInSlot) {
        const sectionSerieIds = series.filter(sr => sr.section === ex.section).map(sr => sr.id);
        const roomsForExamen = selected.filter(r => r.serie_ids.some(sid => sectionSerieIds.includes(sid)));
        const sallesPayload = roomsForExamen.filter(r => r.salle_id).map(r => ({
          salle_id: r.salle_id!,
          salle_numero: r.salle_numero,
          layout: r.layout || "18",
          series: r.serie_ids.filter(sid => sectionSerieIds.includes(sid)).map(sid => {
            const sr = series.find(s => s.id === sid);
            return { id: sid, nom: sr?.nom || "?", section_id: ex.section };
          }),
        }));
        const [planRes, presRes] = await Promise.allSettled([
          API.post("generate-documents/", {
            examen_id: ex.id,
            matiere: getMatiere(ex.matiere),
            section: getSection(ex.section),
            date: ex.date,
            heure_debut: ex.heure_debut,
            heure_fin: ex.heure_fin,
            salles: sallesPayload,
          }),
          API.post("generate-presence/", {
            matiere: getMatiere(ex.matiere),
            date: ex.date,
            heure: selectedTimeSlot || fmtTime(ex.heure_debut),
            salles: sallesPayload,
          }),
        ]);
        if (planRes.status === "fulfilled") {
          allPlanDocs.push(...(planRes.value.data.documents || planRes.value.data || []));
        } else {
          errors.push((planRes.reason as any)?.response?.data?.error || "خطأ في مخطط القاعة");
        }
        if (presRes.status === "fulfilled") {
          allPresDocs.push(...(presRes.value.data.documents || []));
        } else {
          errors.push((presRes.reason as any)?.response?.data?.error || "خطأ في بطاقات الحضور");
        }
      }
      if (errors.length) setGenError(errors.join(" | "));
      setDocs(allPlanDocs); setPresenceDocs(allPresDocs);
      if (allPlanDocs.length || allPresDocs.length) setShowModal(true);
      setGenerating(false);
      return;
    }

    const selected = dayAssignments.filter(a => selectedRoomIds.has(a.salle_id) && (!selectedTimeSlot || a.heure_debut === selectedTimeSlot));
    if (selected.length === 0) { setGenError("اختر قاعة واحدة على الأقل"); return; }

    const byExam: Record<number, DayAssignment[]> = {};
    for (const a of selected) {
      if (!byExam[a.examen_id]) byExam[a.examen_id] = [];
      byExam[a.examen_id].push(a);
    }

    setGenerating(true); setGenError(""); setDocs([]); setPresenceDocs([]);
    const allPlanDocs: GeneratedDoc[] = [];
    const allPresDocs: GeneratedDoc[] = [];
    const errors: string[] = [];

    const warnMessages: string[] = [];
    for (const [, items] of Object.entries(byExam)) {
      for (const a of items) {
        const sr = series.find(s => s.id === a.serie_id);
        const capacity = parseInt(a.layout || "18");
        if (sr && sr.inscription_count && sr.inscription_count > capacity) {
          warnMessages.push(`السلسلة "${sr.nom}" فيها ${sr.inscription_count} مترشح والقاعة تسع ${capacity} فقط`);
        }
      }
    }
    if (warnMessages.length > 0) {
      setGenError(warnMessages.join(" | "));
      setGenerating(false);
      return;
    }

    for (const [examIdStr, items] of Object.entries(byExam)) {
      const examId = parseInt(examIdStr);
      const ex = examens.find(e => e.id === examId);
      if (!ex) continue;

      const sallesPayload = items.map(a => ({
        salle_id: a.salle_id,
        salle_numero: a.salle_numero,
        layout: a.layout || "18",
        series: [{ id: a.serie_id, nom: a.serie_nom, section_id: a.section_id }],
      }));

      const [planRes, presRes] = await Promise.allSettled([
        API.post("generate-documents/", {
          examen_id: examId,
          matiere: getMatiere(ex.matiere),
          section: getSection(ex.section),
          date: ex.date,
          heure_debut: ex.heure_debut,
          heure_fin: ex.heure_fin,
          salles: sallesPayload,
        }),
        API.post("generate-presence/", {
          matiere: getMatiere(ex.matiere),
          date: ex.date,
          heure: items[0].heure_debut || fmtTime(ex.heure_debut),
          salles: sallesPayload,
        }),
      ]);
      if (planRes.status === "fulfilled") {
        allPlanDocs.push(...(planRes.value.data.documents || planRes.value.data || []));
      } else {
        errors.push((planRes.reason as any)?.response?.data?.error || "خطأ في مخطط القاعة");
      }
      if (presRes.status === "fulfilled") {
        allPresDocs.push(...(presRes.value.data.documents || []));
      } else {
        errors.push((presRes.reason as any)?.response?.data?.error || "خطأ في بطاقات الحضور");
      }
    }
    if (errors.length) setGenError(errors.join(" | "));
    setDocs(allPlanDocs); setPresenceDocs(allPresDocs);
    if (allPlanDocs.length || allPresDocs.length) setShowModal(true);
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
        setDlError(JSON.parse(text).error || "خطأ في التحميل"); return;
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

  const downloadAll = async () => {
    const all = [...docs, ...presenceDocs, ...verifDocs];
    if (all.length === 0) return;
    try {
      const res = await API.post("download-zip/", {
        doc_ids: all.map(d => d.doc_id),
        filename: selectedDate || "documents",
      }, { responseType: "blob" });
      if (res.data.type === "application/json") {
        const text = await (res.data as Blob).text();
        setDlError(JSON.parse(text).error || "خطأ"); return;
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url; link.download = `${selectedDate || "documents"}.zip`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setDlError(`خطأ أثناء التحميل: ${e.response?.status || e.message}`);
    }
  };

  const generateVerification = async () => {
    setVerifGenerating(true); setGenError("");
    try {
      const res = await API.post("generate-verification/");
      setVerifDocs(res.data.documents || []);
      if (res.data.documents?.length) setShowModal(true);
    } catch (e: any) {
      setGenError(e?.response?.data?.error || "خطأ في بطاقات التثبت");
    }
    setVerifGenerating(false);
  };

  const downloadAllPdf = async () => {
    if (docs.length === 0) return;
    try {
      const res = await API.post("download-combined-pdf/", {
        doc_ids: docs.map(d => d.doc_id),
        filename: `مخططات_القاعات_${selectedDate || "documents"}`,
      }, { responseType: "blob" });
      if (res.data.type === "application/json") {
        const text = await (res.data as Blob).text();
        setDlError(JSON.parse(text).error || "خطأ"); return;
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url; link.download = `مخططات_القاعات_${selectedDate || "documents"}.pdf`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setDlError(`خطأ أثناء التحميل: ${e.response?.status || e.message}`);
    }
  };

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

  const selectedCount = selectedTimeSlot && isControleSession
    ? new Set(sessionRooms.filter(r => r.salle_id && selectedRoomIds.has(r.salle_id)).map(r => r.salle_id)).size
    : (!isControleSession && selectedTimeSlot)
        ? new Set(dayAssignments.filter(a => a.heure_debut === selectedTimeSlot && selectedRoomIds.has(a.salle_id)).map(a => a.salle_id)).size
        : 0;

  const sortedTimeSlots = isControleSession
    ? allTimeSlots
    : [...new Set(dayAssignments.map(a => a.heure_debut))].filter(Boolean).sort() as string[];

  // All series visible in the session room setup (contrôle)
  const visibleSeries = series;

  // Available inscriptions for the session room setup
  const sessionExamenSections = [...new Set(
    (selectedSessionId ? examens.filter(e => e.session === selectedSessionId) : []).map(e => e.section)
  )];
  const availableForSession = inscriptions.filter(ins => {
    if (!sessionExamenSections.map(sid => getSection(sid)).includes(ins.section)) return false;
    if (isControleSession && ins.resultat !== 'controle') return false;
    return true;
  });
  const groupedAvailableIns: Record<number, Inscription[]> = {};
  for (const ins of availableForSession) {
    if (!groupedAvailableIns[ins.serie]) groupedAvailableIns[ins.serie] = [];
    groupedAvailableIns[ins.serie].push(ins);
  }

  return (
    <div className="general" style={{ padding: "1.5rem 6cm 1.5rem 1.5rem", fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      <Header />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e466e", margin: 0 }}>إعداد وثائق الامتحانات</h1>
          <p style={{ color: "#5f6368", fontSize: 13, margin: "4px 0 0" }}>بطاقات الحضور · مخطط القاعة</p>
        </div>

        <div style={{ textAlign: "center", marginBottom: "1rem", display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={generateVerification} disabled={verifGenerating}
            style={{ padding: "12px 32px", fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer", background: verifGenerating ? "#9aa0a6" : "#0f6e56", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {verifGenerating
              ? <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> جاري الإنشاء...</span>
              : <span style={{display:"inline-flex",alignItems:"center",gap:6}}><FileText size={15} /> بطاقات التثبت</span>}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportResults} />
          <button onClick={() => fileInputRef.current?.click()} disabled={importingResults}
            style={{ padding: "12px 32px", fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer", background: importingResults ? "#9aa0a6" : "#7c3aed", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {importingResults
              ? <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> جاري الاستيراد...</span>
              : <span style={{display:"inline-flex",alignItems:"center",gap:6}}><svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> استيراد النتائج</span>}
          </button>
          {importResultMsg && (
            <div style={{ width: "100%", textAlign: "center", color: importResultMsg.includes("خطأ") ? "#dc2626" : "#0f6e56", fontSize: 13, fontWeight: 600 }}>
              {importResultMsg}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.25rem", alignItems: "start" }}>

          {/* ==================== LEFT ==================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Session */}
            <div style={c.card}>
              <div style={c.hd}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1a56db" }}>1</div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>اختر الدورة</h2>
              </div>
              <div style={{ padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sessions.length === 0 ? (
                  <p style={{ color: "#9aa0a6", fontSize: 13 }}>لا توجد دورات</p>
                ) : sessions.map(s => (
                  <button key={s.id} onClick={() => selectSession(s.id)}
                    style={{
                      padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                      border: `2px solid ${selectedSessionId === s.id ? "#1a56db" : "#e8eaed"}`,
                      background: selectedSessionId === s.id ? "#e8f0fe" : "#fff",
                      color: selectedSessionId === s.id ? "#1a56db" : "#374151",
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                    {s.nom}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Room Setup (contrôle only) */}
            {isControleSession && showRoomSetup && (
              <div style={c.card}>
                <div style={c.hd}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#b45309" }}>2</div>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0, flex: 1 }}>إنشاء القاعات (التحكم)</h2>
                  <span style={c.badge("#92400e", "#fef3c7")}>{sessionRooms.length} قاعة</span>
                </div>
                <div style={c.pad}>
                  {sessionRooms.length === 0 && (
                    <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>
                      لم يتم إنشاء قاعات بعد. أضف القاعات واختر المترشحين لكل قاعة.
                    </p>
                  )}
                  {sessionRooms.map(r => {
                    const usedCount = r.candidats.length;
                    const capacity = r.layout === "15" ? 15 : 18;
                    const overCapacity = usedCount > capacity;
                    return (
                      <div key={r.uid} style={{ marginBottom: 10, background: "#fafafa", borderRadius: 12, padding: "0.75rem", border: overCapacity ? "2px solid #ef4444" : "1px solid #e8eaed" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                          {/* Room selector */}
                          <div style={{ minWidth: 110 }}>
                            <div style={{ fontSize: 10, color: "#5f6368", marginBottom: 2 }}>القاعة</div>
                            <select value={r.salle_id || ""} onChange={e => changeSessionRoomSalle(r.uid, parseInt(e.target.value))}
                              style={{ width: "100%", padding: "4px 6px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 12, fontFamily: "inherit" }}>
                              <option value="">اختر</option>
                              {salles.map(s => (
                                <option key={s.id} value={s.id}>قاعة {s.numero}</option>
                              ))}
                            </select>
                          </div>
                          {/* Layout */}
                          <div style={{ minWidth: 80 }}>
                            <div style={{ fontSize: 10, color: "#5f6368", marginBottom: 2 }}>التصميم</div>
                            <select value={r.layout} onChange={e => changeSessionRoomLayout(r.uid, e.target.value as "15" | "18")}
                              style={{ width: "100%", padding: "4px 6px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 12, fontFamily: "inherit" }}>
                              <option value="15">15 مقعد</option>
                              <option value="18">18 مقعد</option>
                            </select>
                          </div>
                          {/* Series checkboxes */}
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 10, color: "#5f6368", marginBottom: 2 }}>السلاسل (اختر لإضافة كل المترشحين)</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                              {visibleSeries.filter(sr => sessionExamenSections.includes(sr.section)).map(sr => {
                                const count = inscriptions.filter(i => i.serie === sr.id).length;
                                const isChecked = r.serie_ids.includes(sr.id);
                                return (
                                  <label key={sr.id} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, cursor: "pointer", userSelect: "none" }}>
                                    <input type="checkbox" checked={isChecked}
                                      onChange={() => toggleSessionRoomSerie(r.uid, sr.id)}
                                      style={{ accentColor: "#1a56db" }} />
                                    {sr.nom} ({count})
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          {/* Remove */}
                          <button onClick={() => removeSessionRoom(r.uid)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: "14px 4px 0" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* Candidate list */}
                        <div style={{ marginTop: 8, borderTop: "1px solid #e8eaed", paddingTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>
                              المترشحون: {usedCount} / {capacity}
                              {overCapacity && <span style={{ color: "#ef4444", marginRight: 8 }}>! تجاوز السعة</span>}
                            </div>
                            <div style={{ fontSize: 10, color: "#5f6368" }}>
                              {r.serie_ids.length} سلسلة
                            </div>
                          </div>
                          {r.candidats.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {r.candidats.map(c => (
                                <div key={c.num_ins} style={{ display: "flex", alignItems: "center", gap: 3, background: "#e8f0fe", borderRadius: 6, padding: "2px 6px 2px 2px", fontSize: 11 }}>
                                  <button onClick={() => removeCandidatFromSessionRoom(r.uid, c.num_ins)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: 0, display: "flex", fontSize: 13, lineHeight: 1 }}>
                                    ×
                                  </button>
                                  <span>{c.nom_prenom}</span>
                                  <span style={{ color: "#5f6368", fontSize: 10 }}>({c.serie_nom})</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: 11, color: "#9aa0a6", margin: 0 }}>اختر السلاسل أو أضف المترشحين يدوياً</p>
                          )}
                        </div>
                        {/* Candidate picker */}
                        {r.salle_id && (
                          <details style={{ marginTop: 6, fontSize: 11 }}>
                            <summary style={{ cursor: "pointer", color: "#1a56db", fontWeight: 600 }}>إضافة مترشحين يدوياً</summary>
                            <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 6, border: "1px solid #e8eaed", borderRadius: 8, padding: 6 }}>
                              {Object.entries(groupedAvailableIns).map(([serieIdStr, insList]) => {
                                const sid = parseInt(serieIdStr);
                                const sr = getSerie(sid);
                                const available = insList.filter(i => !r.candidats.some(c => c.num_ins === i.num_ins));
                                if (available.length === 0) return null;
                                return (
                                  <div key={sid} style={{ marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600, color: "#374151", marginBottom: 2 }}>{sr?.nom}:</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                      {available.slice(0, 20).map(i => (
                                        <button key={i.num_ins} onClick={() => {
                                          const c: CandidatSelected = {
                                            num_ins: i.num_ins,
                                            nom_prenom: i.nom_prenom,
                                            cin: i.cin,
                                            section: String(i.section),
                                            section_nom: getSection(i.section),
                                            serie_id: i.serie,
                                            serie_nom: sr?.nom || "?",
                                            etablissement: i.etablissement,
                                          };
                                          addCandidatToSessionRoom(r.uid, c);
                                        }}
                                          style={{ background: "#f1f3f4", border: "1px solid #d1d5db", borderRadius: 4, padding: "1px 6px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>
                                          + {i.nom_prenom}
                                        </button>
                                      ))}
                                      {available.length > 20 && <span style={{ color: "#9aa0a6", fontSize: 10, padding: "2px 4px" }}>+{available.length - 20} آخرون</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", gap: 8, marginTop: "0.5rem", justifyContent: "flex-end" }}>
                    <button onClick={addSessionRoom}
                      style={c.btn("#f1f3f4", "#374151")}>
                      <Plus size={14} /> إضافة قاعة
                    </button>
                    <button onClick={saveSessionRooms} disabled={savingSessionRooms}
                      style={c.btn(savingSessionRooms ? "#9aa0a6" : "#1a56db")}>
                      <Save size={14} /> {savingSessionRooms ? "جاري الحفظ..." : "حفظ القاعات"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Date */}
            {selectedSessionId && !(isControleSession && showRoomSetup && sessionRooms.length === 0) && (
            <div style={c.card}>
              <div style={c.hd}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1a56db" }}>
                  {isControleSession ? "3" : "2"}
                </div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>اختر اليوم</h2>
              </div>
              <div style={{ padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {uniqueDates.length === 0 ? (
                  <p style={{ color: "#9aa0a6", fontSize: 13 }}>لا توجد امتحانات</p>
                ) : uniqueDates.map(d => (
                  <button key={d} onClick={() => selectDate(d)}
                    style={{
                      padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                      border: `2px solid ${selectedDate === d ? "#1a56db" : "#e8eaed"}`,
                      background: selectedDate === d ? "#e8f0fe" : "#fff",
                      color: selectedDate === d ? "#1a56db" : "#374151",
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                    {fmtDateShort(d)}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Day assignments */}
            {selectedDate && (
              <div style={c.card}>
                <div style={c.hd}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#b45309" }}>
                    {isControleSession ? "4" : "3"}
                  </div>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0, flex: 1 }}>{isControleSession ? "توزيع القاعات (التحكم)" : "توزيع القاعات والسلاسل"}</h2>
                  <span style={c.badge("#166534", "#f0fdf4")}>{fmtDate(selectedDate)}</span>
                </div>
                <div style={c.pad}>
                  {isControleSession ? (
                    sessionRooms.length === 0 ? (
                      <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>أنشئ القاعات أولاً في الخطوة 2</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: "#5f6368", marginBottom: 8 }}>
                          تم إنشاء {sessionRooms.filter(r => r.salle_id).length} قاعة بإجمالي {sessionRooms.reduce((s, r) => s + r.candidats.length, 0)} مترشح
                        </p>
                        <div style={{ background: "#f0fdf4", border: "1px solid #d1fae5", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534" }}>
                          القاعات والمترشحين مُعرفون مسبقاً في الدورة. يمكنك حفظ التوزيع لكل يوم/وقت عبر زر "تسجيل" أدناه.
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
                          <button onClick={saveDayAssignments} disabled={savingDay || sessionRooms.filter(r => r.salle_id).length === 0}
                            style={c.btn(savingDay ? "#9aa0a6" : "#1a56db")}>
                            <Save size={14} /> {savingDay ? "جاري الحفظ..." : "تسجيل التوزيع لليوم"}
                          </button>
                        </div>
                      </>
                    )
                  ) : (
                    dayAssignments.length === 0 ? (
                      <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>لا توجد سلاسل لهذا اليوم</p>
                    ) : (
                      <>
                        {(() => {
                          const groups: Record<string, { idx: number; a: DayAssignment }[]> = {};
                          dayAssignments.forEach((a, idx) => {
                            const key = a.heure_debut || "other";
                            if (!groups[key]) groups[key] = [];
                            groups[key].push({ idx, a });
                          });
                          const sortedTimes = Object.keys(groups).sort();
                          return sortedTimes.map(time => {
                            const items = groups[time].sort((x, y) => {
                              const sA = SECTIONS_ORDER.indexOf(getSection(x.a.section_id!));
                              const sB = SECTIONS_ORDER.indexOf(getSection(y.a.section_id!));
                              return (sA >= 0 ? sA : 999) - (sB >= 0 ? sB : 999);
                            });
                            return (
                              <div key={time} style={{ marginBottom: "1rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#b45309", background: "#fffbeb", padding: "4px 12px", borderRadius: 8, border: "1px solid #fde68a" }}>
                                    {fmtTime(time)}
                                  </span>
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr style={{ background: "#f8f9fa" }}>
                                      <th style={{ padding: "9px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>القاعة</th>
                                      <th style={{ padding: "9px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>المادة</th>
                                      <th style={{ padding: "9px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>الشعبة</th>
                                      <th style={{ padding: "9px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>السلسلة</th>
                                      <th style={{ padding: "9px 12px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>التصميم</th>
                                      <th style={{ padding: "9px 12px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>إجراءات</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map(({ idx, a }) => (
                                      <tr key={`${a.examen_id}-${a.serie_id}-${idx}`} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                                        <td style={{ padding: "8px 12px" }}>
                                          <select value={a.salle_id} onChange={e => changeRoom(idx, parseInt(e.target.value))}
                                            style={{ padding: "5px 8px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 13, fontFamily: "inherit" }}>
                                            {salles.map(s => (
                                              <option key={s.id} value={s.id}>قاعة {s.numero}</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 500, color: "#202124" }}>{a.matiere_nom}</td>
                                        <td style={{ padding: "8px 12px" }}>
                                          <span style={c.badge("#0f6e56", "#e1f5ee")}>{a.section_nom}</span>
                                        </td>
                                        <td style={{ padding: "8px 12px" }}>
                                          <span style={c.badge("#1a56db", "#e8f0fe")}>{a.serie_nom}</span>
                                        </td>
                                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                          <select value={a.layout || "18"} onChange={e => changeLayout(idx, e.target.value as "15" | "18")}
                                            style={{ padding: "4px 6px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 12, fontFamily: "inherit" }}>
                                            <option value="15">15 مقعد</option>
                                            <option value="18">18 مقعد</option>
                                          </select>
                                        </td>
                                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                          <button onClick={() => removeAssignment(idx)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: 4 }}>
                                            <Trash2 size={15} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          });
                        })()}
                        <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
                          <button onClick={autoAssignDay.bind(null, selectedDate)}
                            style={c.btn("#f1f3f4", "#374151")}>
                            <Plus size={14} /> إعادة توزيع
                          </button>
                          <button onClick={saveDayAssignments} disabled={savingDay}
                            style={c.btn(savingDay ? "#9aa0a6" : "#1a56db")}>
                            <Save size={14} /> {savingDay ? "جاري الحفظ..." : "تسجيل"}
                          </button>
                        </div>
                      </>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ==================== RIGHT ==================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div style={c.card}>
              <div style={c.hd}>
                <FileText size={16} color="#1e466e" />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>ملخص وإنشاء الوثائق</h2>
              </div>
              <div style={c.pad}>
                {!selectedDate ? (
                  <p style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>
                    اختر الدورة واليوم
                  </p>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f1f3f4", paddingBottom: 8 }}>
                        <span style={{ color: "#5f6368" }}>الدورة</span>
                        <span style={{ fontWeight: 500, color: "#202124" }}>{selectedSession?.nom}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f1f3f4", paddingBottom: 8 }}>
                        <span style={{ color: "#5f6368" }}>التاريخ</span>
                        <span style={{ fontWeight: 500, color: "#202124" }}>{fmtDate(selectedDate)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f1f3f4", paddingBottom: 8 }}>
                        <span style={{ color: "#5f6368" }}>القاعات</span>
                        <span style={{ fontWeight: 500, color: "#202124" }}>
                          {isControleSession ? `${sessionRooms.filter(r => r.salle_id).length} قاعة` : `${dayAssignments.length} توزيع`}
                        </span>
                      </div>
                    </div>

                    {sortedTimeSlots.length > 1 && (
                      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
                        {sortedTimeSlots.map(time => (
                          <button key={time} onClick={() => setSelectedTimeSlot(time)}
                            style={{
                              padding: "6px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8,
                              border: selectedTimeSlot === time ? "2px solid #1a56db" : "1.5px solid #d1d5db",
                              background: selectedTimeSlot === time ? "#e8f0fe" : "#fff",
                              color: selectedTimeSlot === time ? "#1a56db" : "#5f6368",
                              cursor: "pointer", fontFamily: "inherit",
                            }}>
                            {fmtTime(time)}
                          </button>
                        ))}
                      </div>
                    )}

                    {(isControleSession ? sessionRooms.filter(r => r.salle_id != null).length > 0 : dayAssignments.length > 0) && (
                      <div style={{ marginBottom: "1.25rem" }}>
                        {(() => {
                          if (isControleSession) {
                            return selectedTimeSlot ? (
                              <div key={selectedTimeSlot} style={{ marginBottom: 12 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                {sessionRooms.filter(r => r.salle_id).map(r => {
                                  const isSelected = selectedRoomIds.has(r.salle_id!);
                                  const seriesNames = r.serie_ids.map(sid => series.find(s => s.id === sid)?.nom).filter(Boolean).join(", ");
                                  const candidateCount = r.candidats.length;
                                  return (
                                  <div key={`cr-${r.uid}`}
                                    onClick={() => r.salle_id && toggleRoomSelection(r.salle_id)}
                                    style={{ background: isSelected ? "#e8f0fe" : "#fff", borderRadius: 12, border: isSelected ? "2px solid #1a56db" : "1px solid #e8eaed", padding: "16px 12px", cursor: "pointer", transition: "all .15s", textAlign: "center", userSelect: "none" }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: "#1e466e" }}>قاعة {r.salle_numero}</span>
                                    <div style={{ fontSize: 11, color: "#5f6368", marginTop: 4 }}>{seriesNames || "بدون سلاسل"}</div>
                                    <div style={{ fontSize: 10, color: "#5f6368", marginTop: 2 }}>{candidateCount} مترشح</div>
                                    {isSelected && <div style={{ fontSize: 11, color: "#1a56db", fontWeight: 600, marginTop: 4 }}>✓ مختارة</div>}
                                  </div>
                                  );
                                })}
                                </div>
                              </div>
                            ) : null;
                          } else {
                            const groups: Record<string, DayAssignment[]> = {};
                            dayAssignments.forEach(a => {
                              const key = a.heure_debut || "other";
                              if (!groups[key]) groups[key] = [];
                              groups[key].push(a);
                            });
                            return selectedTimeSlot && groups[selectedTimeSlot] ? (
                              <div key={selectedTimeSlot} style={{ marginBottom: 12 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                {groups[selectedTimeSlot].map((a) => {
                                  const isSelected = selectedRoomIds.has(a.salle_id);
                                  return (
                                  <div key={`${a.salle_id}-${a.serie_id}-${a.examen_id}`}
                                    onClick={() => toggleRoomSelection(a.salle_id)}
                                    style={{ background: isSelected ? "#e8f0fe" : "#fff", borderRadius: 12, border: isSelected ? "2px solid #1a56db" : "1px solid #e8eaed", padding: "16px 12px", cursor: "pointer", transition: "all .15s", textAlign: "center", userSelect: "none" }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: "#1e466e" }}>قاعة {a.salle_numero}</span>
                                    <div style={{ fontSize: 11, color: "#5f6368", marginTop: 4 }}>{a.section_nom} — {a.serie_nom}</div>
                                    {isSelected && <div style={{ fontSize: 11, color: "#1a56db", fontWeight: 600, marginTop: 4 }}>✓ مختارة</div>}
                                  </div>
                                  );
                                })}
                                </div>
                              </div>
                            ) : null;
                          }
                        })()}
                        <p style={{ fontSize: 12, color: "#5f6368", margin: "4px 0 0" }}>
                          {selectedCount > 0 ? `✓ ${selectedCount} قاعة محددة` : "اختر القاعات لإنشاء الوثائق"}
                        </p>
                      </div>
                    )}

                    {genError && (
                      <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c0392b", marginBottom: "0.75rem" }}>
                        {genError}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={generateDocuments} disabled={generating || selectedCount === 0}
                        style={{ ...c.btn(generating ? "#9aa0a6" : selectedCount === 0 ? "#d1d5db" : "#1e466e"), flex: 1, justifyContent: "center", padding: "13px 0", fontSize: 14 }}>
                        {generating
                          ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> جاري الإنشاء...</>
                          : <><Printer size={15} /> إنشاء الوثائق ({selectedCount})</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={c.card}>
              <div style={c.hd}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>الوثائق المُنشأة</h2>
              </div>
              <div style={c.pad}>
                {[
                  { icon: "📋", label: "بطاقات الحضور", desc: "قائمة المترشحين لكل قاعة وسلسلة", color: "#e8f0fe" },
                  { icon: "🗺️", label: "مخطط القاعة",   desc: "ترتيب المقاعد وتوزيع السلاسل",   color: "#f0fdf4" },
                ].map(doc => (
                  <div key={doc.label} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f3f4" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: doc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{doc.icon}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>{doc.label}</p>
                      <p style={{ fontSize: 11, color: "#5f6368", margin: "2px 0 0" }}>{doc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
                {docs.length + presenceDocs.length + verifDocs.length} وثائق جاهزة
              </p>
            </div>
            {dlError && (
              <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#c0392b", marginBottom: 12 }}>
                {dlError}
              </div>
            )}
            {(docs.length > 0 || presenceDocs.length > 0 || verifDocs.length > 0) ? (
              (() => {
                const allDocs = [...docs, ...presenceDocs, ...verifDocs];
                const grouped: Record<string, typeof allDocs> = {};
                for (const d of allDocs) {
                  if (!grouped[d.type]) grouped[d.type] = [];
                  grouped[d.type].push(d);
                }
                const typeInfo: Record<string, { icon: string; label: string; bg: string; border: string; btn: string }> = {
                  plan:     { icon: "🗺️", label: "مخطط القاعة",     bg: "#f0fdf4", border: "#d1fae5", btn: "#1e466e" },
                  envelope: { icon: "📋", label: "ملصق الظرف",       bg: "#f0fdf4", border: "#d1fae5", btn: "#1e466e" },
                  numero:   { icon: "📋", label: "أرقام المترشحين",  bg: "#f0fdf4", border: "#d1fae5", btn: "#1e466e" },
                  sortie:   { icon: "📋", label: "خروج طوارئ",       bg: "#f0fdf4", border: "#d1fae5", btn: "#1e466e" },
                  presence: { icon: "📋", label: "بطاقات الحضور",     bg: "#e8f0fe", border: "#c7d7f9", btn: "#0f6e56" },
                  door:     { icon: "📋", label: "سجل القاعة",        bg: "#e8f0fe", border: "#c7d7f9", btn: "#0f6e56" },
                  verif:    { icon: "📋", label: "بطاقات التثبت",     bg: "#fef3c7", border: "#fde68a", btn: "#92400e" },
                };
                return Object.entries(grouped).map(([type, docs]) => {
                  const info = typeInfo[type] || { icon: "📄", label: type, bg: "#f8f9fa", border: "#e8eaed", btn: "#5f6368" };
                  return (
                    <React.Fragment key={type}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#5f6368", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>{info.icon} {info.label}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
                        {docs.map(doc => (
                          <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: info.bg, borderRadius: 10, border: `1px solid ${info.border}` }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>{doc.label}</p>
                              <p style={{ fontSize: 11, color: "#5f6368", margin: "1px 0 0" }}>.docx</p>
                            </div>
                            <button onClick={() => download(doc.doc_id, doc.label)} style={c.btn(info.btn)}>
                              <Download size={14} /> تحميل
                            </button>
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={downloadAllPdf} disabled={docs.length === 0} style={{ ...c.btn("#b45309"), flex: 1, justifyContent: "center" }}>
                <Download size={15} /> PDF تحميل الكل
              </button>
              <button onClick={downloadAll} style={{ ...c.btn("#1e466e"), flex: 1, justifyContent: "center" }}>
                <Download size={15} /> تحميل الكل ({docs.length + presenceDocs.length + verifDocs.length})
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
  );
}
