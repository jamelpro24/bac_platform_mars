import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Users, Download } from "lucide-react";
import API from "../../services/api";
import Header from "../../components/Header";
import "./pagecss/general.css";

type Professeur = { id: number; nom: string; specialite: string };
type Salle = { id: number; numero: string };
type Examen = { id: number; matiere: number; date: string };
type Matiere = { id: number; nom: string };
type SurveillanceItem = { id: number; professeur: number; salle: number; examen: number };
type Assignment = {
  id: number; professeur_nom: string; professeur_id: number; date: string;
  session_number: number; time_start: string; time_end: string;
  salle_numero: number; salle_label: string; type: "surveillant" | "suppleant";
  group_number: number; heures: number;
  professeur_institution: string; professeur_sexe: string; matiere_nom: string;
};
type SummaryItem = {
  professeur_id: number; nom: string; specialite: string;
  institution: string; sexe: string;
  sur_heures: number; sup_heures: number; sur_count: number; sup_count: number;
  total_heures: number; groupe: number | null;
};
type PlanDetail = {
  plan_id: number; session_nom: string; total_profs: number; group_size: number;
  created_at: string; assignments: Assignment[]; summary: SummaryItem[];
};

export default function SurveillanceProfs() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/dashboardadmin")
    ? "/dashboardadmin/profs"
    : "/dashboarddirecteur/profs";

  // Data
  const [surveillances, setSurveillances] = useState<SurveillanceItem[]>([]);
  const [profs, setProfs] = useState<Professeur[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [examens, setExamens] = useState<Examen[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Main tabs: المجموعات | الجدول | تعديل
  const [mainTab, setMainTab] = useState<"groups" | "schedule" | "edit">("groups");
  // Schedule sub-tabs
  const [schedView, setSchedView] = useState<"table"|"groupes"|"profs"|"salles">("table");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [editGroupFilter, setEditGroupFilter] = useState<number | "ctrl" | null>(null);

  // Groups
  const [group1, setGroup1] = useState<Professeur[]>([]);
  const [group2, setGroup2] = useState<Professeur[]>([]);
  const [controle, setControle] = useState<Professeur[]>([]);
  const [selG1, setSelG1] = useState<Set<number>>(new Set());
  const [selG2, setSelG2] = useState<Set<number>>(new Set());
  const [selCtrl, setSelCtrl] = useState<Set<number>>(new Set());
  const [selectedProf, setSelectedProf] = useState<number | "">("");
  const [selectedDate, setSelectedDate] = useState("");

  // Generation
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDocs, setReportDocs] = useState<{doc_id: string; label: string; group: string}[]>([]);
  const [reportModal, setReportModal] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  // Inline group edit filter (null = showing filter cards only)
  const [genFilter, setGenFilter] = useState<number | "ctrl" | null>(null);
  // Rooms view state
  const [roomsViewDate, setRoomsViewDate] = useState("");
  const [roomsViewSession, setRoomsViewSession] = useState(1);

  // Edit (drag-and-drop)
  const [editPlan, setEditPlan] = useState<PlanDetail | null>(null);
  const [editProfs, setEditProfs] = useState<{ id: number; nom: string; specialite: string; institution: string; sexe: string }[]>([]);
  const [dragInfo, setDragInfo] = useState<{ nom: string; assignment: Assignment } | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [controlePlanId, setControlePlanId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<number, number>>(new Map());
  const [recentlyModified, setRecentlyModified] = useState<Set<number>>(new Set());
  const [editProfFilter, setEditProfFilter] = useState<number | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(true);
  const [mainPairs, setMainPairs] = useState<string[]>([]);
  const [ctrlPairs, setCtrlPairs] = useState<string[]>([]);
  const scheduleScrollRef = useRef<HTMLDivElement>(null);
  const scheduleTopScrollRef = useRef<HTMLDivElement>(null);
  const editScrollRef = useRef<HTMLDivElement>(null);
  const editTopScrollRef = useRef<HTMLDivElement>(null);
  const syncScroll = (source: HTMLDivElement | null, target: HTMLDivElement | null) => {
    if (source && target) target.scrollLeft = source.scrollLeft;
  };

  // Fetch initial data
  const fetchAll = useCallback(async () => {
    try {
      const [survRes, profsRes, sallesRes, examensRes, matieresRes, sessRes, plansRes] = await Promise.all([
        API.get("surveillances/"),
        API.get("professeurs/"),
        API.get("salles/"),
        API.get("examens/"),
        API.get("matieres/"),
        API.get("sessions/"),
        API.get("surveillance-plans/"),
      ]);
      setSurveillances(survRes.data);
      setProfs(profsRes.data);
      setSalles(sallesRes.data);
      setExamens(examensRes.data);
      setMatieres(matieresRes.data);
      setSessions(sessRes.data);
      setPlans(plansRes.data);
      if (sessRes.data.length > 0 && !selectedSessionId) setSelectedSessionId(sessRes.data[0].id);
    } catch { setError("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Store current plan_id(s) for cross-page access (e.g. ProfInvitations)
  useEffect(() => {
    const mainId = genResult?.plan_id;
    const ctrlId = controlePlanId;
    if (mainId) {
      localStorage.setItem("current_plan_id", String(mainId));
    }
    if (mainId || ctrlId) {
      const ids = [];
      if (mainId) ids.push(mainId);
      if (ctrlId) ids.push(ctrlId);
      localStorage.setItem("current_plan_ids", JSON.stringify(ids));
    }
  }, [genResult, controlePlanId]);

  // Auto-show table when genResult is set (after generate or auto-restore)
  useEffect(() => {
    if (!genResult) return;
    const allDates = [...new Set((genResult.assignments || []).map((a: any) => a.date))].sort();
    if (allDates.length > 0 && !roomsViewDate) setRoomsViewDate(allDates[0]);
    if (genFilter === null) {
      setGenFilter(0);
      setEditPlan({ ...genResult, plan_id: genResult.plan_id, assignments: genResult.assignments || [], summary: genResult.summary || [] });
    } else {
      setEditPlan(prev => prev ? { ...prev, assignments: genResult.assignments || [], summary: genResult.summary || [] } : prev);
    }
  }, [genResult]);

  // Auto-restore last saved plan when session changes
  useEffect(() => {
    if (!selectedSessionId || !plans.length || genResult) return;
    const sessionPlans = plans
      .filter((p: any) => p.session_id === selectedSessionId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sessionPlans.length > 0) {
      const lastId = sessionPlans[0].id;
      API.get(`surveillance-plans/${lastId}/`).then(res => {
        setGenResult(res.data);
        // Try to load contrôle plan (same session)
        const ctrlSessionId = findControleSessionId();
        if (ctrlSessionId) {
          const ctrlPlans = plans
            .filter((p: any) => p.session_id === ctrlSessionId)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (ctrlPlans.length > 0) {
            setControlePlanId(ctrlPlans[0].id);
            API.get(`surveillance-plans/${ctrlPlans[0].id}/`).then(ctrlRes => {
              setGenResult(prev => {
                if (!prev) return prev;
                const mergedAssignments = [...(prev.assignments || []), ...(ctrlRes.data.assignments || [])];
                const mergedSummary = [...(prev.summary || [])];
                const sumMap = new Map(mergedSummary.map((s: any) => [s.professeur_id, s]));
                for (const s of (ctrlRes.data.summary || [])) {
                  if (!sumMap.has(s.professeur_id)) mergedSummary.push(s);
                }
                return { ...prev, assignments: mergedAssignments, summary: mergedSummary };
              });
              // Build pairs
              const ctrlKeys = [...new Set((ctrlRes.data.assignments || []).map((a: any) => `${a.date}|${a.session_number}`))].sort();
              setCtrlPairs(ctrlKeys);
            });
          }
        }
        const mainKeys = [...new Set((res.data.assignments || []).map((a: any) => `${a.date}|${a.session_number}`))].sort();
        setMainPairs(mainKeys);
      }).catch(() => {});
    }
  }, [selectedSessionId, plans]);

  const GROUP1_SPECS = ["الإعلامية", "الأنقليزية", "العربية", "العلوم الفيزيائية", "التاريخ والجغرافيا"];

  const shuffleArray = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const splitBySpecialty = (list: Professeur[]) => {
    const g1: Professeur[] = [];
    const rest: Professeur[] = [];
    for (const p of list) { (GROUP1_SPECS.includes(p.specialite || "أخرى") ? g1 : rest).push(p); }
    rest.sort((a, b) => a.nom.localeCompare(b.nom));
    const g2: Professeur[] = [];
    let turn = 0;
    for (const p of rest) {
      if (g2.length < g1.length) g2.push(p);
      else (turn++ % 2 === 0 ? g2 : g1).push(p);
    }
    g1.sort((a, b) => a.nom.localeCompare(b.nom));
    g2.sort((a, b) => a.nom.localeCompare(b.nom));
    return [g1, g2] as const;
  };

  const initialized = useRef(false);

  const saveGroupsToApi = useCallback(async (g1: Professeur[], g2: Professeur[]) => {
    if (!selectedSessionId) return;
    try {
      await API.put(`surveillance-groups/?session_id=${selectedSessionId}`, {
        group1_ids: g1.map(p => p.id),
        group2_ids: g2.map(p => p.id),
      });
    } catch { /* silencieux */ }
  }, [selectedSessionId]);

  useEffect(() => {
    if (initialized.current) return;
    if (profs.length === 0) return;
    if (!selectedSessionId) return;
    (async () => {
      try {
        const res = await API.get(`surveillance-groups/?session_id=${selectedSessionId}`);
        const ids1: number[] = res.data.group1_ids || [];
        const ids2: number[] = res.data.group2_ids || [];
        if (ids1.length + ids2.length > 0) {
          const g1 = ids1.map(id => profs.find(p => p.id === id)).filter(Boolean) as Professeur[];
          const g2 = ids2.map(id => profs.find(p => p.id === id)).filter(Boolean) as Professeur[];
          setGroup1(g1); setGroup2(g2);
        } else {
          const [g1, g2] = splitBySpecialty(shuffleArray(profs));
          setGroup1(g1); setGroup2(g2);
          saveGroupsToApi(g1, g2);
        }
      } catch {
        const [g1, g2] = splitBySpecialty(shuffleArray(profs));
        setGroup1(g1); setGroup2(g2);
        saveGroupsToApi(g1, g2);
      }
      initialized.current = true;
    })();
  }, [profs, selectedSessionId]);

  useEffect(() => {
    if (group1.length + group2.length > 0) saveGroupsToApi(group1, group2);
  }, [group1, group2]);

  useEffect(() => {
    const ids = new Set([...group1.map(p => p.id), ...group2.map(p => p.id)]);
    setControle(profs.filter(p => !ids.has(p.id)));
  }, [group1, group2, profs]);

  // Helpers
  const getProf = (id: number) => profs.find(p => p.id === id);
  const getSalle = (id: number) => salles.find(s => s.id === id);
  const getExamen = (id: number) => examens.find(e => e.id === id);
  const getMatiere = (id: number) => matieres.find(m => m.id === id);
  const getExamenLabel = (exId: number) => {
    const ex = getExamen(exId);
    if (!ex) return "-";
    const mat = getMatiere(ex.matiere);
    return `${mat?.nom || "-"} (${ex.date})`;
  };
  const fmtDate = (date: string) => {
    try { return new Date(date).toLocaleDateString("ar-TN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
    catch { return date; }
  };

  // Enriched surveillances
  const examsById = useMemo(() => { const m = new Map<number, Examen>(); examens.forEach(e => m.set(e.id, e)); return m; }, [examens]);
  const enrichedSurv = useMemo(() => surveillances.map(s => ({ ...s, profObj: getProf(s.professeur), salleObj: getSalle(s.salle), examenObj: examsById.get(s.examen) })), [surveillances, profs, salles, examsById]);
  type RoomSurv = { date: string; salleId: number; salleNumero: string; items: typeof enrichedSurv; };
  const roomsByDate = useMemo(() => {
    const map = new Map<string, RoomSurv[]>();
    const dateMap = new Map<string, Map<number, RoomSurv>>();
    for (const item of enrichedSurv) {
      const date = item.examenObj?.date;
      if (!date) continue;
      if (!dateMap.has(date)) dateMap.set(date, new Map());
      const sm = dateMap.get(date)!;
      const sid = item.salle;
      if (!sm.has(sid)) sm.set(sid, { date, salleId: sid, salleNumero: item.salleObj?.numero || `قاعة ${sid}`, items: [] });
      sm.get(sid)!.items.push(item);
    }
    const sortedDates = Array.from(dateMap.keys()).sort();
    sortedDates.forEach(d => map.set(d, Array.from(dateMap.get(d)!.values()).sort((a, b) => a.salleNumero.localeCompare(b.salleNumero))));
    return map;
  }, [enrichedSurv]);
  const dates = Array.from(roomsByDate.keys()).sort();

  // Old CRUD handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.professeur || !form.salle || !form.examen) { setError("جميع الحقول مطلوبة"); return; }
    try {
      if (editId) { await API.put(`surveillances/${editId}/`, { professeur: Number(form.professeur), salle: Number(form.salle), examen: Number(form.examen) }); setSuccess("تم تعديل المراقبة بنجاح"); }
      else { await API.post("surveillances/", { professeur: Number(form.professeur), salle: Number(form.salle), examen: Number(form.examen) }); setSuccess("تم إضافة المراقبة بنجاح"); }
      setForm({ professeur: "", salle: "", examen: "" }); setEditId(null); setShowForm(false); fetchAll();
    } catch { setError("حدث خطأ أثناء الحفظ"); }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التعيين؟")) return;
    try { await API.delete(`surveillances/${id}/`); setSuccess("تم الحذف بنجاح"); fetchAll(); }
    catch { setError("حدث خطأ أثناء الحذف"); }
  };
  const handleEditItem = (item: SurveillanceItem) => {
    setForm({ professeur: String(item.professeur), salle: String(item.salle), examen: String(item.examen) });
    setEditId(item.id); setShowForm(true);
  };
  const [form, setForm] = useState({ professeur: "", salle: "", examen: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Shared helpers for schedule views
  const schedCard = (surv: string[], sup: string[]) => (
    <span>{surv.map((r, i) => <span key={i} style={{ display: "inline-block", background: "#dbeafe", color: "#1e466e", borderRadius: 6, padding: "2px 6px", margin: 1, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{r}</span>)}{sup.map((r, i) => <span key={i} style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 6px", margin: 1, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{r}</span>)}{!surv.length && !sup.length ? <span style={{ color: "#ccc", fontSize: 10 }}>-</span> : null}</span>
  );
  const schedTC = (s?: string) => ({ padding: "6px 8px", border: "1px solid #d1d5db", textAlign: (s || "center") as any });

  // Auto-detect contrôle session from the sessions list
  const findControleSessionId = useCallback(() => {
    if (!selectedSessionId) return null;
    const mainS = sessions.find(s => s.id === selectedSessionId);
    // Prefer a session with "controle" in its name
    const ctrlByName = sessions.find(s =>
      s.id !== selectedSessionId &&
      ((s.nom || "").includes("مراقبة") || (s.nom || "").toLowerCase().includes("controle"))
    );
    if (ctrlByName) return ctrlByName.id;
    // Fall back to the next session in the list
    const idx = sessions.findIndex(s => s.id === selectedSessionId);
    if (idx >= 0 && idx + 1 < sessions.length) return sessions[idx + 1].id;
    return selectedSessionId; // same session as last resort
  }, [selectedSessionId, sessions]);

  // Confirm schedule handler
  const handleConfirmSchedule = async () => {
    if (!genResult?.plan_id && !controlePlanId) {
      setError("قم ببرمجة المراقبة أولاً");
      return;
    }
    setConfirmLoading(true);
    setError("");
    setSuccess("");
    try {
      await API.post("confirm-surveillance-schedule/", {
        plan_id: genResult?.plan_id,
        ctrl_plan_id: controlePlanId,
      });
      setSuccess("تم تأكيد برنامج الأساتذة بنجاح");
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "فشل تأكيد البرنامج");
    }
    setConfirmLoading(false);
  };

  // Generate per-group hour report
  const handleGenerateReport = async () => {
    if (!genResult?.plan_id && !controlePlanId) {
      setError("قم ببرمجة المراقبة أولاً");
      return;
    }
    setReportLoading(true);
    setError("");
    setSuccess("");
    try {
      const session = sessions.find(s => s.id === selectedSessionId);
      const res = await API.post("generate-surv-report/", {
        plan_id: genResult?.plan_id,
        ctrl_plan_id: controlePlanId,
        session_label: session?.nom || "",
      });
      setReportDocs(res.data.documents || []);
      setReportModal(true);
      setSuccess("تم إنشاء التقرير بنجاح");
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "فشل إنشاء التقرير");
    }
    setReportLoading(false);
  };

  // Generation handler
  const handleGenerate = async () => {
    const allIds = [...group1.map(p => p.id), ...group2.map(p => p.id), ...controle.map(p => p.id)];
    if (allIds.length < 4) { setError("يجب أن يكون هناك 4 أساتذة على الأقل"); return; }
    if (!selectedSessionId) { setError("اختر الدورة"); return; }
    setGenLoading(true); setError("");
    try {
      // Generate main plan
      const mainRes = await API.post("generate-groups-surveillance/", {
        session_id: selectedSessionId,
        group1_ids: group1.map(p => p.id), group2_ids: group2.map(p => p.id),
        controle_ids: controle.map(p => p.id),
        is_controle: false, use_all_rooms: true,
      });
      setGenResult(mainRes.data);
      // Auto-detect and generate contrôle plan
      const ctrlSessionId = findControleSessionId();
      const ctrlRes = await API.post("generate-groups-surveillance/", {
        session_id: ctrlSessionId, group1_ids: allIds, group2_ids: [],
        controle_ids: controle.map(p => p.id),
        is_controle: true, use_all_rooms: true,
      });
      setControlePlanId(ctrlRes.data.plan_id);
      // Merge contrôle assignments + summary into genResult
      const mainSumMap = new Map((mainRes.data.summary || []).map((s: any) => [s.professeur_id, s]));
      const mergedSummary = [...(mainRes.data.summary || [])];
      for (const s of (ctrlRes.data.summary || [])) {
        const existing = mainSumMap.get(s.professeur_id);
        if (existing) {
          existing.sur_heures += s.sur_heures;
          existing.sup_heures += s.sup_heures;
          existing.sur_count += s.sur_count;
          existing.sup_count += s.sup_count;
          existing.total_heures += s.total_heures;
        } else {
          mergedSummary.push({ ...s });
        }
      }
      // Store date|session keys for section headers
      const mainKeys = [...new Set((mainRes.data.assignments || []).map((a: any) => `${a.date}|${a.session_number}`))].sort();
      const ctrlKeys = [...new Set((ctrlRes.data.assignments || []).map((a: any) => `${a.date}|${a.session_number}`))].sort();
      setMainPairs(mainKeys);
      setCtrlPairs(ctrlKeys);
      setGenResult(prev => ({
        ...prev,
        assignments: [...(prev?.assignments || []), ...(ctrlRes.data.assignments || [])],
        summary: mergedSummary,
        total_assignments: (prev?.total_assignments || 0) + (ctrlRes.data.total_assignments || 0),
      }));
      setSuccess(`تم التوزيع: ${mainRes.data.total_assignments + ctrlRes.data.total_assignments} مراقبة (رئيسية + تحكم)`);
      setMainTab("schedule");
      setGenFilter(null);
    } catch (e: any) { setError(e?.response?.data?.error || e.message || "خطأ في التوزيع"); }
    setGenLoading(false);
  };

  // Fetch edit plan data
  const fetchEditPlan = useCallback(async (mainPlanId: number, ctrlPlanId?: number | null) => {
    try {
      const promises: Promise<any>[] = [
        API.get(`surveillance-plans/${mainPlanId}/`),
        API.get("professeurs/"),
      ];
      if (ctrlPlanId) promises.push(API.get(`surveillance-plans/${ctrlPlanId}/`));
      const [planRes, profsRes, ctrlRes] = await Promise.all(promises);

      const mainData = planRes.data;
      let combinedAssignments = [...(mainData.assignments || [])];
      let combinedSummary = [...(mainData.summary || [])];
      let mainDateSessions: string[] = [];
      let ctrlDateSessions: string[] = [];

      // Build main pairs
      const mainPairSet = new Set<string>();
      for (const a of (mainData.assignments || [])) {
        mainPairSet.add(`${a.date}|${a.session_number}`);
      }
      mainDateSessions = [...mainPairSet].sort();

      if (ctrlRes) {
        const ctrlData = ctrlRes.data;
        // Mark contrôle assignments — add them all
        combinedAssignments = [...combinedAssignments, ...(ctrlData.assignments || [])];
        // Merge summaries: keep main profs' group, add controle-only profs
        const mainSummaryMap = new Map((mainData.summary || []).map((s: any) => [s.professeur_id, s]));
        for (const s of (ctrlData.summary || [])) {
          if (!mainSummaryMap.has(s.professeur_id)) {
            combinedSummary.push(s);
          }
        }
        // Build contrôle pairs
        const ctrlPairSet = new Set<string>();
        for (const a of (ctrlData.assignments || [])) {
          ctrlPairSet.add(`${a.date}|${a.session_number}`);
        }
        ctrlDateSessions = [...ctrlPairSet].sort();
      }

      setEditPlan({ ...mainData, assignments: combinedAssignments, summary: combinedSummary });
      // Store date groupings for rendering
      setMainPairs(mainDateSessions);
      setCtrlPairs(ctrlDateSessions);
      setEditProfs(profsRes.data);
    } catch { setError("فشل تحميل بيانات التعديل"); }
  }, []);

  useEffect(() => {
    if (mainTab === "edit" && genResult?.plan_id) {
      fetchEditPlan(genResult.plan_id, controlePlanId);
    }
  }, [mainTab, genResult?.plan_id, controlePlanId]);

  // Drag-and-drop handlers
  const handleDragStart = (assignment: Assignment) => {
    setDragInfo({ nom: assignment.professeur_nom, assignment });
  };

  const findOtherSurveillantInRoom = (as: Assignment[], date: string, sessionNum: number, salleNum: number, excludeProfId: number): Assignment | null => {
    return as.find(a =>
      a.date === date && a.session_number === sessionNum &&
      a.salle_numero === salleNum && a.type === 'surveillant' &&
      a.professeur_id !== excludeProfId
    ) || null;
  };

  const checkDropConstraints = (sourceAs: Assignment, targetCellProfId: number, assigns: Assignment[], summ: SummaryItem[]): { hard: string | null; soft: string | null } => {
    // 1. Check if target prof already has any assignment in this time slot
    const targetSameSlot = assigns.filter(a =>
      a.date === sourceAs.date && a.session_number === sourceAs.session_number &&
      a.professeur_id === targetCellProfId
    );
    if (targetSameSlot.length > 0) return { hard: "لا يمكن: الأستاذ لديه تعيين في هذه الحصة بالفعل", soft: null };

    // 2. If surveillant, check specialty conflict with room's matiere
    if (sourceAs.type === 'surveillant' && sourceAs.matiere_nom) {
      const targetProf = summ.find(s => s.professeur_id === targetCellProfId);
      if (targetProf) {
        const specWords = targetProf.specialite.split(/\s+/);
        const matiereWords = sourceAs.matiere_nom.split(/\s+/);
        const hasOverlap = specWords.some((w: string) => matiereWords.includes(w));
        if (hasOverlap) return { hard: `لا يمكن: الأستاذ يدرس مادة ${sourceAs.matiere_nom}`, soft: null };
      }
    }

    // 3. If surveillant, check institution/gender conflict with other surveillant in same room
    if (sourceAs.type === 'surveillant') {
      const other = findOtherSurveillantInRoom(assigns, sourceAs.date, sourceAs.session_number, sourceAs.salle_numero, sourceAs.professeur_id);
      if (other) {
        const targetProf = summ.find(s => s.professeur_id === targetCellProfId);
        if (targetProf && other.professeur_institution && targetProf.institution &&
            other.professeur_institution === targetProf.institution) {
          return { hard: null, soft: "تنبيه: الأستاذان من نفس المؤسسة. هل تريد المتابعة؟" };
        }
        if (targetProf && targetProf.sexe && other.professeur_sexe &&
            targetProf.sexe === other.professeur_sexe) {
          return { hard: null, soft: "تنبيه: الأستاذان من نفس الجنس (يُفضل أن يكونا مختلفين). هل تريد المتابعة؟" };
        }
      }
    }

    return { hard: null, soft: null };
  };

  const handleDropOnCell = async (targetCell: { surv: Assignment[]; sup: Assignment[] }, targetCellDate: string, targetCellSession: number) => {
    if (!dragInfo || !editPlan) return;
    const sourceAs = dragInfo.assignment;
    const allTarget = [...targetCell.surv, ...targetCell.sup];

    // Find which professor the target cell belongs to (from the first item, or determine from the column)
    // We need to know the target prof. If cell is not empty, use the first assignment's prof.
    // We'll pass profProfId separately from the rendering context.

    setDragInfo(null);
  };

  // Store a pending professeur change for an assignment
  const setPending = (assignmentId: number, newProfId: number) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(assignmentId, newProfId);
      return next;
    });
  };

  const clearPending = (assignmentId: number) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.delete(assignmentId);
      return next;
    });
  };

  // Perform the actual move/swap (stores in pendingChanges, updates UI optimistically)
  const doSwap = (sourceId: number, sourceProfId: number, targetId: number, targetProfId_: number) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(sourceId, targetProfId_);
      next.set(targetId, sourceProfId);
      return next;
    });
    setEditPlan(prev => prev ? {
      ...prev,
      assignments: prev.assignments.map(a => {
        if (a.id === sourceId) {
          const p = editProfs.find(pr => pr.id === targetProfId_);
          return { ...a, professeur_id: targetProfId_, professeur_nom: p?.nom || a.professeur_nom };
        }
        if (a.id === targetId) {
          const p = editProfs.find(pr => pr.id === sourceProfId);
          return { ...a, professeur_id: sourceProfId, professeur_nom: p?.nom || a.professeur_nom };
        }
        return a;
      })
    } : prev);
  };
  const doMove = (sourceId: number, newProfId: number) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(sourceId, newProfId);
      return next;
    });
    setEditPlan(prev => prev ? {
      ...prev,
      assignments: prev.assignments.map(a => {
        if (a.id === sourceId) {
          const p = editProfs.find(pr => pr.id === newProfId);
          return { ...a, professeur_id: newProfId, professeur_nom: p?.nom || a.professeur_nom };
        }
        return a;
      })
    } : prev);
  };

  // Immediate-save versions (no pendingChanges)
  const doSwapImmediate = async (sourceId: number, sourceProfId: number, targetId: number, targetProfId_: number) => {
    setEditPlan(prev => prev ? {
      ...prev,
      assignments: prev.assignments.map(a => {
        if (a.id === sourceId) {
          const p = editProfs.find(pr => pr.id === targetProfId_);
          return { ...a, professeur_id: targetProfId_, professeur_nom: p?.nom || a.professeur_nom };
        }
        if (a.id === targetId) {
          const p = editProfs.find(pr => pr.id === sourceProfId);
          return { ...a, professeur_id: sourceProfId, professeur_nom: p?.nom || a.professeur_nom };
        }
        return a;
      })
    } : prev);
    await Promise.all([
      API.put(`surveillance-assignments/${sourceId}/`, { professeur_id: targetProfId_ }),
      API.put(`surveillance-assignments/${targetId}/`, { professeur_id: sourceProfId }),
    ]);
    setRecentlyModified(prev => { const n = new Set(prev); n.add(sourceId); n.add(targetId); return n; });
    setTimeout(() => setRecentlyModified(prev => { const n = new Set(prev); n.delete(sourceId); n.delete(targetId); return n; }), 2000);
    await reconfirmSchedule();
  };
  const doMoveImmediate = async (sourceId: number, newProfId: number) => {
    setEditPlan(prev => prev ? {
      ...prev,
      assignments: prev.assignments.map(a => {
        if (a.id === sourceId) {
          const p = editProfs.find(pr => pr.id === newProfId);
          return { ...a, professeur_id: newProfId, professeur_nom: p?.nom || a.professeur_nom };
        }
        return a;
      })
    } : prev);
    await API.put(`surveillance-assignments/${sourceId}/`, { professeur_id: newProfId });
    setRecentlyModified(prev => { const n = new Set(prev); n.add(sourceId); return n; });
    setTimeout(() => setRecentlyModified(prev => { const n = new Set(prev); n.delete(sourceId); return n; }), 2000);
    await reconfirmSchedule();
  };

  const executeMove = async (sourceAs: Assignment, targetProfId: number, allTarget: Assignment[]) => {
    if (!editPlan) return;
    const sourceId = sourceAs.id;
    const sourceProfId = sourceAs.professeur_id;
    const immediateSave = editGroupFilter !== null;
    try {
      if (allTarget.length > 0) {
        const targetId = allTarget[0].id;
        const targetProfId_ = allTarget[0].professeur_id;
        if (immediateSave) { await doSwapImmediate(sourceId, sourceProfId, targetId, targetProfId_); }
        else { doSwap(sourceId, sourceProfId, targetId, targetProfId_); }
        setSuccess(`تم تبديل ${dragInfo!.nom}`);
      } else {
        if (immediateSave) { await doMoveImmediate(sourceId, targetProfId); }
        else { doMove(sourceId, targetProfId); }
        setSuccess(`تم نقل ${dragInfo!.nom}`);
      }
      setDragInfo(null);
    } catch { setError("فشل التعديل"); }
  };

  // Wrapper to be called from JSX with the prof ID
  const handleDropOnCellFor = (targetCell: { surv: Assignment[]; sup: Assignment[] }, targetCellDate: string, targetCellSession: number, targetProfId: number) => {
    if (!dragInfo || !editPlan) return;
    const sourceAs = dragInfo.assignment;
    const allTarget = [...targetCell.surv, ...targetCell.sup];

    // Validate constraints
    const { hard, soft } = checkDropConstraints(sourceAs, targetProfId, editPlan.assignments, editPlan.summary);
    if (hard) {
      setError(hard);
      setDragInfo(null);
      return;
    }
    if (soft) {
      setConfirmDialog({
        message: soft,
        onConfirm: () => { setConfirmDialog(null); executeMove(sourceAs, targetProfId, allTarget); },
      });
      return;
    }

    executeMove(sourceAs, targetProfId, allTarget);
  };
  const handleProfChange = async (assignmentId: number, newProfId: number) => {
    await doMoveImmediate(assignmentId, newProfId);
    setEditingCell(null);
    setSuccess("تم تحديث التعيين");
  };

  // Re-confirm schedule after edits so ProfessorSchedule stays in sync
  const reconfirmSchedule = async () => {
    if (!editPlan?.plan_id && !controlePlanId) return;
    try {
      await API.post("confirm-surveillance-schedule/", {
        plan_id: editPlan?.plan_id,
        ctrl_plan_id: controlePlanId,
      });
    } catch { /* don't block edit flow */ }
  };

  // Save all pending changes
  const savePendingChanges = async () => {
    if (pendingChanges.size === 0) return;
    try {
      const entries = [...pendingChanges.entries()];
      // Update local editPlan immediately for responsiveness
      const updatedAs = (editPlan?.assignments || []).map(a => {
        const newP = pendingChanges.get(a.id);
        if (newP !== undefined) {
          const newProf = editProfs.find(p => p.id === newP);
          return { ...a, professeur_id: newP, professeur_nom: newProf?.nom || a.professeur_nom };
        }
        return a;
      });
      setEditPlan(prev => prev ? { ...prev, assignments: updatedAs } : prev);
      await Promise.all(entries.map(([id, pid]) =>
        API.put(`surveillance-assignments/${id}/`, { professeur_id: pid })
      ));
      setPendingChanges(new Map());
      await reconfirmSchedule();
      setSuccess("تم حفظ جميع التعديلات");
      fetchEditPlan(editPlan!.plan_id, controlePlanId);
    } catch { setError("فشل حفظ التعديلات"); }
  };

  const cancelPendingChanges = () => {
    setPendingChanges(new Map());
    fetchEditPlan(editPlan!.plan_id, controlePlanId);
    setSuccess("تم إلغاء التعديلات");
  };

  const resetPlan = () => {
    fetchEditPlan(editPlan!.plan_id, controlePlanId);
    setSuccess("تم إعادة تحميل الخطة");
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Header />
        <div className="dashboard-container" dir="rtl" style={{ textAlign: "center", padding: 60, color: "#1e466e" }}>
          جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-container" dir="rtl">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
          <button onClick={() => navigate(basePath)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, background: "#f1f3f4", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
            العودة
          </button>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: "1.5rem" }}>المراقبة</h1>
        </div>

        {error && <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: "1rem", fontSize: 13, color: "#b91c1c" }}>{error}</div>}
        {success && <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: "1rem", fontSize: 13, color: "#15803d" }}>{success}</div>}

        {confirmDialog && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
            onClick={() => setConfirmDialog(null)}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", maxWidth: 420, width: "90%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", textAlign: "center" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, color: "#374151", marginBottom: "1.5rem", lineHeight: 1.6 }}>{confirmDialog.message}</div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={() => { confirmDialog.onConfirm(); setError(""); }}
                  style={{ padding: "8px 24px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  نعم
                </button>
                <button onClick={() => setConfirmDialog(null)}
                  style={{ padding: "8px 24px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#f1f3f4", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                  لا
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
          {(["groups", "schedule", "edit"] as const).map(t => (
            <button key={t} onClick={() => setMainTab(t)}
              style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: mainTab === t ? "#1e466e" : "#f1f3f4", color: mainTab === t ? "#fff" : "#374151", cursor: "pointer", fontFamily: "inherit" }}>
              {t === "groups" ? <><Users size={16} style={{ marginLeft: 6, verticalAlign: "middle" }} />المجموعات</>
                : t === "schedule" ? "الجدول"
                : "تعديل"}
            </button>
          ))}
          <button onClick={() => { setShowForm(true); }}
            style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#f1f3f4", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={16} style={{ marginLeft: 6, verticalAlign: "middle" }} />إضافة مراقبة
          </button>
        </div>

        {/* Existing plans links */}
        {plans.length > 0 && (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ padding: "0.85rem 1.25rem" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#202124", margin: "0 0 10px" }}>الخطط المحفوظة</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {plans.slice(0, 3).map(p => (
                  <button key={p.id} onClick={() => {
                    const isCtrl = (p.session_nom || "").includes("مراقبة") || (p.session_nom || "").toLowerCase().includes("controle");
                    if (isCtrl) {
                      setControlePlanId(p.id);
                      // Keep existing genResult for main plan
                    } else {
                      setGenResult({ ...(genResult || {}), plan_id: p.id });
                      // Find matching contrôle plan
                      const ctrlMatch = plans.find(pp =>
                        pp.id !== p.id &&
                        ((pp.session_nom || "").includes("مراقبة") || (pp.session_nom || "").toLowerCase().includes("controle"))
                      );
                      setControlePlanId(ctrlMatch?.id || null);
                    }
                    setMainTab("edit");
                  }}
                    style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", color: "#1e466e", cursor: "pointer", fontFamily: "inherit" }}>
                    {p.session_nom} — {p.assignments_count} تعيين
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB: المجموعات ========== */}
        {mainTab === "groups" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={handleGenerate}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: genLoading ? "#9aa0a6" : "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                {genLoading ? "جاري التوزيع..." : "برمجة مراقبة"}
              </button>
              <button onClick={handleConfirmSchedule}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: confirmLoading ? "#9aa0a6" : "#1F4E79", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                {confirmLoading ? "جاري التأكيد..." : "تأكيد برنامج الأساتذة"}
              </button>
              <button onClick={handleGenerateReport}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: reportLoading ? "#9aa0a6" : "#b45309", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                {reportLoading ? "جاري التقرير..." : <><Download size={14} /> تقرير الحصص</>}
              </button>
              <button onClick={() => {
                const from1 = group1.filter(p => selG1.has(p.id));
                const from2 = group2.filter(p => selG2.has(p.id));
                setGroup1(prev => [...prev.filter(p => !selG1.has(p.id)), ...from2]);
                setGroup2(prev => [...prev.filter(p => !selG2.has(p.id)), ...from1]);
                setSelG1(new Set()); setSelG2(new Set());
              }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#1e466e", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                تبديل
              </button>
              <button onClick={() => {
                setGroup1(prev => prev.filter(p => !selG1.has(p.id)));
                setGroup2(prev => prev.filter(p => !selG2.has(p.id)));
                setControle(prev => prev.filter(p => !selCtrl.has(p.id)));
                setSelG1(new Set()); setSelG2(new Set()); setSelCtrl(new Set());
              }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                فسخ
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              {[group1, group2, controle].map((group, gi) => {
                const isCtrl = gi === 2;
                return (
                <div key={gi} className="card">
                  <div style={{ padding: "0.85rem 1.25rem", background: "#f8f9fa", borderBottom: "1px solid #e8eaed", fontSize: 14, fontWeight: 700, color: "#1e466e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span><Users size={16} style={{ marginLeft: 6, verticalAlign: "middle" }} />{isCtrl ? "التحكم" : `المجموعة ${gi + 1}`}</span>
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>{group.length} أستاذ</span>
                  </div>
                  <div style={{ padding: "0.75rem 1.25rem" }}>
                    {group.length === 0 ? <p style={{ fontSize: 12, color: "#9aa0a6", textAlign: "center" }}>لا يوجد أساتذة</p>
                    : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr style={{ background: "#f1f3f4" }}>
                          <th style={{ padding: "6px 8px", textAlign: "center", width: 24 }}></th>
                          <th style={{ padding: "6px 8px", textAlign: "right" }}>#</th>
                          <th style={{ padding: "6px 8px", textAlign: "right" }}>الاسم</th>
                          <th style={{ padding: "6px 8px", textAlign: "right" }}>الاختصاص</th>
                          {!isCtrl && <th style={{ padding: "6px 8px", textAlign: "center", width: 50 }}>تحكم</th>}
                        </tr></thead>
                        <tbody>
                          {group.map((p, idx) => {
                            const sel = gi === 0 ? selG1 : gi === 1 ? selG2 : selCtrl;
                            const setSel = gi === 0 ? setSelG1 : gi === 1 ? setSelG2 : setSelCtrl;
                            const isSelected = sel.has(p.id);
                            return (
                              <tr key={p.id} style={{ borderBottom: "1px solid #f1f3f4", background: isSelected ? "#e8f0fe" : "transparent" }}>
                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                  <input type="checkbox" checked={isSelected} onChange={() => {
                                    const next = new Set(sel);
                                    isSelected ? next.delete(p.id) : next.add(p.id);
                                    setSel(next);
                                  }} />
                                </td>
                                <td style={{ padding: "6px 8px", color: "#64748b" }}>{idx + 1}</td>
                                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{p.nom}</td>
                                <td style={{ padding: "6px 8px", color: "#64748b" }}>{p.specialite}</td>
                                {!isCtrl && (
                                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                    <button onClick={() => {
                                      // Move prof to contrôle group
                                      const from = gi === 0 ? group1 : group2;
                                      const setFrom = gi === 0 ? setGroup1 : setGroup2;
                                      setFrom(prev => prev.filter(pp => pp.id !== p.id));
                                      setControle(prev => [...prev, p]);
                                    }}
                                      style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "none", background: "#92400e", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                                      تحكم
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* ========== TAB: الجدول ========== */}
        {mainTab === "schedule" && genResult && (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", flexWrap: "wrap", padding: "0.75rem 0 0" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#202124", margin: 0 }}>جدول المراقبة — {genResult.total_assignments} مراقبة</h3>
              {genResult.plan_id && (
                <button onClick={() => setMainTab("edit")}
                  style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  تعديل
                </button>
              )}
            </div>

            {/* Sub-tab: جدول / قاعات */}
            <div style={{ display: "flex", gap: 8, marginBottom: "0.75rem", padding: "0 10px" }}>
              {(["table", "salles"] as const).map(v => (
                <button key={v} onClick={() => setSchedView(v)}
                  style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: schedView === v ? "#1e466e" : "#f1f3f4", color: schedView === v ? "#fff" : "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                  {v === "table" ? "جدول" : "القاعات"}
                </button>
              ))}
            </div>

            {/* Rooms view */}
            {schedView === "salles" && (() => {
              const allDates = [...new Set((genResult.assignments || []).map((a: any) => a.date))].sort();
              const dateForView = roomsViewDate || allDates[0] || "";
              const allSessions = [...new Set((genResult.assignments || []).filter((a: any) => a.date === dateForView).map((a: any) => a.session_number))].sort();
              const sessionForView = allSessions.includes(roomsViewSession) ? roomsViewSession : (allSessions[0] || 1);
              const filtered = (genResult.assignments || []).filter((a: any) => a.date === dateForView && a.session_number === sessionForView);
              const rooms: Record<number, any[]> = {};
              const supps: any[] = [];
              for (const a of filtered) {
                if (a.salle_numero > 0 && a.type === 'surveillant') {
                  if (!rooms[a.salle_numero]) rooms[a.salle_numero] = [];
                  rooms[a.salle_numero].push(a);
                } else if (a.type === 'suppleant') {
                  supps.push(a);
                }
              }
              const roomNums = Object.keys(rooms).map(Number).sort((a, b) => a - b);
              return (
                <div>
                  <div style={{ display: "flex", gap: 12, marginBottom: "1rem", padding: "0 10px" }}>
                    <select value={dateForView} onChange={e => { setRoomsViewDate(e.target.value); setRoomsViewSession(allSessions[0] || 1); }}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      {allDates.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={sessionForView} onChange={e => setRoomsViewSession(Number(e.target.value))}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      {allSessions.map(s => <option key={s} value={s}>الحصة {s}</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>
                      {filtered.length} تعيين
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "0 10px" }}>
                    {genResult?.plan_id && (
                      <div style={{ width: "100%", marginBottom: 4 }}>
                        <button onClick={async () => {
                          try {
                            const res = await API.post("surveillance-download-doc/", {
                              plan_id: genResult.plan_id,
                              date: dateForView,
                              session_number: sessionForView,
                            }, { responseType: "blob" });
                            const url = URL.createObjectURL(new Blob([res.data]));
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `حراسة_${dateForView}_حصة${sessionForView}.docx`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch { setError("فشل تحميل الوثيقة"); }
                        }}
                          style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                          تحميل وورد (جميع القاعات)
                        </button>
                      </div>
                    )}
                    {roomNums.map(rn => (
                      <div key={rn} style={{ width: 220, border: "1px solid #d1d5db", borderRadius: 10, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                        <div style={{ background: "#1e466e", color: "#fff", padding: "8px 12px", fontWeight: 700, fontSize: 13, textAlign: "center" }}>
                          {rooms[rn][0]?.salle_label || `قاعة ${rn}`}
                        </div>
                        <div style={{ padding: 8 }}>
                          {rooms[rn].map((a: any) => (
                            <div key={a.id} style={{ background: "#dbeafe", borderRadius: 6, padding: "6px 10px", marginBottom: 4, fontSize: 12 }}>
                              <div style={{ fontWeight: 600 }}>{a.professeur_nom}</div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>{a.professeur_institution || ''}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {supps.length > 0 && (
                      <div style={{ width: 200, border: "2px solid #f59e0b", borderRadius: 10, background: "#fffbeb", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                        <div style={{ background: "#92400e", color: "#fff", padding: "8px 12px", fontWeight: 700, fontSize: 13, textAlign: "center" }}>احتياط</div>
                        <div style={{ padding: 8 }}>
                          {supps.map((a: any) => (
                            <div key={a.id} style={{ background: "#fef3c7", borderRadius: 6, padding: "6px 10px", marginBottom: 4, fontSize: 12 }}>
                              <div style={{ fontWeight: 600 }}>{a.professeur_nom}</div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>{a.professeur_institution || ''}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 4 filter cards: الكل, مجموعة واحد, مجموعة 2, مجموعة تحكم (only in table view) */}
            {schedView === "table" && <>
              {(() => {
                const allDates = [...new Set((genResult.assignments || []).map((a: any) => a.date))].sort();
                const dateForView = roomsViewDate || allDates[0] || "";
                const allSessions = [...new Set((genResult.assignments || []).filter((a: any) => a.date === dateForView).map((a: any) => a.session_number))].sort();
                const sessionForView = allSessions.includes(roomsViewSession) ? roomsViewSession : (allSessions[0] || 1);
                if (!roomsViewDate && dateForView) setRoomsViewDate(dateForView);
                if (!allSessions.includes(roomsViewSession) && allSessions.length > 0) setRoomsViewSession(allSessions[0]);
                return (
                  <div style={{ display: "flex", gap: 10, marginBottom: "0.75rem", padding: "0 10px" }}>
                    <select value={dateForView} onChange={e => { setRoomsViewDate(e.target.value); setRoomsViewSession(1); }}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      {allDates.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={sessionForView} onChange={e => setRoomsViewSession(Number(e.target.value))}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      {allSessions.map(s => <option key={s} value={s}>الحصة {s}</option>)}
                    </select>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap", padding: "0 10px" }}>
              {([0, 1, 2, "ctrl"] as const).map(f => {
                const label = f === 0 ? "الكل" : f === "ctrl" ? "مجموعة تحكم" : `مجموعة ${f === 1 ? "واحد" : "2"}`;
                const count = f === 0
                  ? (genResult.summary || []).length
                  : f === "ctrl"
                    ? controle.length
                    : (genResult.summary || []).filter((s: any) => s.groupe === f).length;
                const selected = genFilter === f;
                return (
                  <div key={String(f)} onClick={() => {
                    setTableLoading(true);
                    let filteredAs = genResult.assignments || [];
                    let filteredSum = genResult.summary || [];
                    if (f === "ctrl") {
                      const ctrlIds = new Set(controle.map(p => p.id));
                      filteredAs = filteredAs.filter((a: any) => ctrlIds.has(a.professeur_id));
                      filteredSum = filteredSum.filter((s: any) => ctrlIds.has(s.professeur_id));
                    } else if (f === 1 || f === 2) {
                      const groupProfIds = new Set(
                        (genResult.summary || [])
                          .filter((s: any) => s.groupe === f)
                          .map((s: any) => s.professeur_id)
                      );
                      filteredAs = filteredAs.filter((a: any) => groupProfIds.has(a.professeur_id));
                      filteredSum = filteredSum.filter((s: any) => s.groupe === f);
                    }
                    setGenFilter(f);
                    setTimeout(() => { setEditPlan({ ...(editPlan || genResult), plan_id: genResult.plan_id, assignments: filteredAs, summary: filteredSum }); setTableLoading(false); }, 0);
                  }}
                    style={{
                      flex: "0 0 auto", minWidth: 160, cursor: "pointer", borderRadius: 10,
                      border: selected ? "2px solid #1e466e" : "2px solid #e5e7eb",
                      background: selected ? "#eff6ff" : "#fff",
                      padding: "10px 16px", boxShadow: selected ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.15s",
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#202124" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{count} أستاذ{count > 1 ? "ة" : ""}</div>
                  </div>
                );
              })}
            </div>
            </>}

            {schedView === "table" && genResult?.plan_id && (
              <div style={{ display: "flex", gap: 8, padding: "0 10px", marginBottom: "0.5rem" }}>
                <button onClick={async () => {
                  try {
                    const allDates = [...new Set((genResult.assignments || []).map((a: any) => a.date))].sort();
                    const date = roomsViewDate || allDates[0] || "";
                    const allSessions = [...new Set((genResult.assignments || []).filter((a: any) => a.date === date).map((a: any) => a.session_number))].sort();
                    const sn = allSessions.includes(roomsViewSession) ? roomsViewSession : (allSessions[0] || 1);
                    const res = await API.post("surveillance-download-doc/", {
                      plan_id: genResult.plan_id, date, session_number: sn,
                    }, { responseType: "blob" });
                    const url = URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement("a"); a.href = url;
                    a.download = `حراسة_${date}_حصة${sn}.docx`; a.click(); URL.revokeObjectURL(url);
                  } catch { setError("فشل تحميل الوثيقة"); }
                }}
                  style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  تحميل وورد
                </button>
              </div>
            )}

            {tableLoading && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: 14 }}>
                جاري التحميل...
              </div>
            )}
            {/* Inline edit table with drag-and-drop when a filter is selected */}
            {!tableLoading && genFilter !== null && editPlan && (() => {
              const gf = genFilter;
              let localMainPairs = mainPairs;
              let localCtrlPairs = ctrlPairs;
              if (gf === "ctrl") {
                const ctrlKeys = [...new Set((editPlan.assignments || []).map((a: any) => `${a.date}|${a.session_number}`))].sort();
                localMainPairs = ctrlKeys.filter((k: string) => mainPairs.includes(k));
                localCtrlPairs = ctrlKeys.filter((k: string) => ctrlPairs.includes(k));
              } else if (gf === 1 || gf === 2) {
                const grpKeys = [...new Set((editPlan.assignments || []).map((a: any) => `${a.date}|${a.session_number}`))].sort();
                localMainPairs = grpKeys.filter((k: string) => mainPairs.includes(k));
                localCtrlPairs = ctrlPairs;
              }
              // Filter by selected date+session
              if (roomsViewDate && roomsViewSession) {
                localMainPairs = localMainPairs.filter(k => {
                  const [d, sn] = k.split('|');
                  return d === roomsViewDate && parseInt(sn) === roomsViewSession;
                });
                localCtrlPairs = localCtrlPairs.filter(k => {
                  const [d, sn] = k.split('|');
                  return d === roomsViewDate && parseInt(sn) === roomsViewSession;
                });
              }
              const mainDates = [...new Set(localMainPairs.map(k => k.split('|')[0]))].sort();
              const ctrlDates = [...new Set(localCtrlPairs.map(k => k.split('|')[0]))].sort();
              const uniqueDates = [...mainDates, ...ctrlDates];
              const sessionNums = [...new Set([...localMainPairs, ...localCtrlPairs].map(k => parseInt(k.split('|')[1])))].sort();
              const mainSectionCols = mainDates.length * sessionNums.length;
              const ctrlSectionCols = ctrlDates.length * sessionNums.length;

              const profCells: Record<string, { specialite: string; cells: Record<string, { surv: any[]; sup: any[] }> }> = {};
              for (const s of (editPlan.summary || [])) profCells[s.nom] = { specialite: s.specialite, cells: {} };
              for (const a of (editPlan.assignments || [])) {
                const key = `${a.date}|${a.session_number}`;
                if (!profCells[a.professeur_nom]) continue;
                if (!profCells[a.professeur_nom].cells[key]) profCells[a.professeur_nom].cells[key] = { surv: [], sup: [] };
                if (a.type === 'surveillant') profCells[a.professeur_nom].cells[key].surv.push(a);
                else profCells[a.professeur_nom].cells[key].sup.push(a);
              }
              const profIdMap: Record<string, number> = {};
              for (const s of (editPlan.summary || [])) profIdMap[s.nom] = s.professeur_id;
              const colTotals: Record<string, { surv: number; sup: number }> = {};
              for (const a of (editPlan.assignments || [])) {
                const k = `${a.date}|${a.session_number}`;
                if (!colTotals[k]) colTotals[k] = { surv: 0, sup: 0 };
                if (a.type === 'surveillant') colTotals[k].surv += a.heures;
                else colTotals[k].sup += a.heures;
              }
              const profTotals: Record<string, { surv: number; sup: number }> = {};
              for (const a of (editPlan.assignments || [])) {
                if (!profTotals[a.professeur_nom]) profTotals[a.professeur_nom] = { surv: 0, sup: 0 };
                if (a.type === 'surveillant') profTotals[a.professeur_nom].surv += a.heures;
                else profTotals[a.professeur_nom].sup += a.heures;
              }
              const profNames = Object.keys(profCells).filter(nom => {
                const cells = Object.values(profCells[nom].cells);
                return cells.some(c => c.surv.length > 0 || c.sup.length > 0);
              }).sort();
              const cardStyle: React.CSSProperties = {
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                borderRadius: 6, padding: "2px 4px", margin: "1px 0", fontSize: 9,
                cursor: "grab", userSelect: "none", minHeight: 28, width: "100%",
                transition: "box-shadow 0.15s",
              };
              const sTC: React.CSSProperties = { padding: "4px 6px", textAlign: "center", border: "1px solid #d1d5db" };
              return (<>
                <div ref={scheduleTopScrollRef} style={{ overflowX: "auto", height: 0 }} onScroll={() => syncScroll(scheduleTopScrollRef.current, scheduleScrollRef.current)}>
                  <div style={{ width: editPlan.assignments.length * 85 + 300, height: 1 }} />
                </div>
                <div ref={scheduleScrollRef} style={{ overflowX: "auto" }} onScroll={() => syncScroll(scheduleScrollRef.current, scheduleTopScrollRef.current)}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      {(mainDates.length > 0 || ctrlDates.length > 0) && (
                        <tr>
                          <th colSpan={2} style={{ border: "none", padding: 0 }}></th>
                          {mainDates.length > 0 && (
                            <th colSpan={mainSectionCols} style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #d1d5db", background: "#e8f0fe", color: "#1e466e", fontSize: 11, fontWeight: 700 }}>
                              الدورة الرئيسية
                            </th>
                          )}
                          {ctrlDates.length > 0 && (
                            <th colSpan={ctrlSectionCols} style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #d1d5db", background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700 }}>
                              دورة التحكم
                            </th>
                          )}
                          <th colSpan={3} style={{ border: "none", padding: 0 }}></th>
                        </tr>
                      )}
                      <tr style={{ background: "#f1f3f4" }}>
                        <th rowSpan={2} style={{ ...sTC, minWidth: 100 }}>اسم الأستاذ</th>
                        <th rowSpan={2} style={{ ...sTC, minWidth: 70 }}>الاختصاص</th>
                        {mainDates.map(d => (
                          <th key={d} colSpan={sessionNums.length} style={{ ...sTC, background: "#e8f0fe" }}>{d}</th>
                        ))}
                        {ctrlDates.map(d => (
                          <th key={d} colSpan={sessionNums.length} style={{ ...sTC, background: "#fef3c7" }}>{d}</th>
                        ))}
                        <th rowSpan={2} style={{ ...sTC, minWidth: 45, color: "#1e466e", fontSize: 10 }}>س. مراقبة</th>
                        <th rowSpan={2} style={{ ...sTC, minWidth: 45, color: "#92400e", fontSize: 10 }}>س. احتياط</th>
                        <th rowSpan={2} style={{ ...sTC, minWidth: 45, color: "#059669", fontSize: 10 }}>المجموع</th>
                      </tr>
                      <tr style={{ background: "#f8f9fa" }}>
                        {uniqueDates.map(d => sessionNums.map(sn => (
                          <th key={`${d}-${sn}`} style={{ ...sTC, fontSize: 10 }}>الحصة {sn}</th>
                        )))}
                      </tr>
                    </thead>
                    <tbody>
                      {profNames.map((nom, ri) => {
                        const p = profCells[nom];
                        const targetProfId = profIdMap[nom];
                        return (
                          <tr key={nom} style={{ background: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
                            <td style={{ ...sTC, fontWeight: 600 }}>{nom}</td>
                            <td style={{ ...sTC, color: "#64748b", fontSize: 10 }}>{p.specialite}</td>
                            {uniqueDates.map(d => sessionNums.map(sn => {
                              const cell = p.cells[`${d}|${sn}`];
                              const hasSurv = cell?.surv?.length;
                              const hasSup = cell?.sup?.length;
                              return (
                                <td key={`${d}-${sn}`}
                                  style={{ padding: "2px", border: "1px solid #d1d5db", textAlign: "center", verticalAlign: "top", minWidth: 85 }}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => { e.preventDefault(); handleDropOnCellFor(cell || { surv: [], sup: [] }, d, sn, targetProfId); }}>
                                  {hasSurv ? cell.surv.map((a: any) => (
                                    editingCell === String(a.id) ? (
                                      <select key={a.id} value={a.professeur_id} onChange={e => handleProfChange(a.id, Number(e.target.value))}
                                        onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: 1, fontFamily: "inherit", width: "100%" }} autoFocus>
                                        {editProfs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                                      </select>
                                    ) : (
                                      <div key={a.id} draggable onDragStart={() => handleDragStart(a)}
                                        onClick={() => setEditingCell(String(a.id))}
                                        style={{ ...cardStyle, background: "#dbeafe", color: "#1e466e", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>{a.salle_label || `قاعة ${a.salle_numero}`}</div>
                                        <div style={{ fontWeight: 600, marginTop: 1 }}>{a.professeur_nom}</div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{a.professeur_institution || ''}</div>
                                      </div>
                                    )
                                  )) : null}
                                  {hasSup ? cell.sup.map((a: any) => (
                                    editingCell === String(a.id) ? (
                                      <select key={a.id} value={a.professeur_id} onChange={e => handleProfChange(a.id, Number(e.target.value))}
                                        onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: 1, fontFamily: "inherit", width: "100%" }} autoFocus>
                                        {editProfs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                                      </select>
                                    ) : (
                                      <div key={a.id} draggable onDragStart={() => handleDragStart(a)}
                                        onClick={() => setEditingCell(String(a.id))}
                                        style={{ ...cardStyle, background: "#fef3c7", color: "#92400e", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>احتياط</div>
                                        <div style={{ fontWeight: 600, marginTop: 1 }}>{a.professeur_nom}</div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{a.professeur_institution || ''}</div>
                                      </div>
                                    )
                                  )) : null}
                                  {!hasSurv && !hasSup ? (
                                    <div style={{ color: "#e5e7eb", fontSize: 10, padding: "12px 0" }}>-</div>
                                  ) : null}
                                </td>
                              );
                            }))}
                            <td style={{ ...sTC, color: "#1e466e", fontWeight: 700, fontSize: 11, background: "#eff6ff" }}>
                              {profTotals[nom]?.surv || 0}h
                            </td>
                            <td style={{ ...sTC, color: "#92400e", fontWeight: 700, fontSize: 11, background: "#fffbeb" }}>
                              {profTotals[nom]?.sup || 0}h
                            </td>
                            <td style={{ ...sTC, color: "#059669", fontWeight: 800, fontSize: 11, background: "#f0fdf4" }}>
                              {(profTotals[nom]?.surv || 0) + (profTotals[nom]?.sup || 0)}h
                            </td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr style={{ background: "#f0fdf4", fontWeight: 700 }}>
                        <td style={{ ...sTC, color: "#059669", fontSize: 12 }}>المجموع</td>
                        <td style={sTC}></td>
                        {uniqueDates.map(d => sessionNums.map(sn => {
                          const t = colTotals[`${d}|${sn}`];
                          const surv = t?.surv || 0;
                          const sup = t?.sup || 0;
                          return (
                            <td key={`tot-${d}-${sn}`} style={{ padding: "4px", border: "1px solid #d1d5db", textAlign: "center", fontSize: 10 }}>
                              <div style={{ color: "#1e466e" }}>م: {surv}h</div>
                              <div style={{ color: "#92400e" }}>ا: {sup}h</div>
                              <div style={{ color: "#059669", fontWeight: 800, borderTop: "1px dashed #d1d5db", marginTop: 2, paddingTop: 2 }}>{surv + sup}h</div>
                            </td>
                          );
                        }))}
                        <td style={{ ...sTC, color: "#1e466e", fontWeight: 700, fontSize: 11 }}>
                          {Object.values(colTotals).reduce((s, t) => s + t.surv, 0)}h
                        </td>
                        <td style={{ ...sTC, color: "#92400e", fontWeight: 700, fontSize: 11 }}>
                          {Object.values(colTotals).reduce((s, t) => s + t.sup, 0)}h
                        </td>
                        <td style={{ ...sTC, color: "#059669", fontWeight: 800, fontSize: 11 }}>
                          {Object.values(colTotals).reduce((s, t) => s + t.surv + t.sup, 0)}h
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
              );
            })()}
          </div>
        )}

        {mainTab === "schedule" && !genResult && (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#64748b" }}>لم يتم إنشاء جدول بعد. اذهب إلى "المجموعات" ثم اضغط "توزيع المراقبة".</p>
          </div>
        )}

        {/* ========== TAB: تعديل (drag-and-drop) ========== */}
        {mainTab === "edit" && editPlan && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", flexWrap: "wrap", padding: "0.75rem 10px 0" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#202124", margin: 0 }}>تعديل جدول المراقبة</h3>
              <span style={{ fontSize: 13, color: "#64748b" }}>{editPlan.session_nom} — {editPlan.assignments.length} تعيين</span>
            </div>

            {/* Date+session selectors and toolbar for edit tab */}
            <div style={{ display: "flex", gap: 10, marginBottom: "0.5rem", flexWrap: "wrap", padding: "0 10px", alignItems: "center" }}>
              {(() => {
                const allDates = [...new Set((editPlan.assignments || []).map((a: any) => a.date))].sort();
                const dateForView = roomsViewDate || allDates[0] || "";
                const allSessions = [...new Set((editPlan.assignments || []).filter((a: any) => a.date === dateForView).map((a: any) => a.session_number))].sort();
                const sessionForView = allSessions.includes(roomsViewSession) ? roomsViewSession : (allSessions[0] || 1);
                if (!roomsViewDate && dateForView) setRoomsViewDate(dateForView);
                if (!allSessions.includes(roomsViewSession) && allSessions.length > 0 && roomsViewSession !== 1) setRoomsViewSession(allSessions[0]);
                return (
                  <>
                    <select value={dateForView} onChange={e => { setRoomsViewDate(e.target.value); setRoomsViewSession(1); }}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      {allDates.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={sessionForView} onChange={e => setRoomsViewSession(Number(e.target.value))}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                      {allSessions.map(s => <option key={s} value={s}>الحصة {s}</option>)}
                    </select>
                    <button onClick={() => setShowAllSessions(p => !p)}
                      style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: showAllSessions ? "2px solid #059669" : "1px solid #d1d5db", background: showAllSessions ? "#ecfdf5" : "#fff", color: showAllSessions ? "#059669" : "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                      {showAllSessions ? 'عرض الكل ✓' : 'حسب الحصة'}
                    </button>
                  </>
                );
              })()}
              <button onClick={resetPlan}
                style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: "#f1f3f4", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                🔄 إعادة
              </button>
            </div>

            {/* Save/Cancel pending changes + Word download */}
            <div style={{ display: "flex", gap: 8, marginBottom: "0.75rem", padding: "0 10px", flexWrap: "wrap", alignItems: "center" }}>
              {pendingChanges.size > 0 && (<>
                <button onClick={savePendingChanges}
                  style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 11, opacity: 0.9 }}>تسليم ({pendingChanges.size} تعديل{pendingChanges.size > 1 ? "ات" : ""})</span>
                </button>
                <button onClick={cancelPendingChanges}
                  style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#f1f3f4", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                  إلغاء التعديلات
                </button>
              </>)}
              {pendingChanges.size === 0 && editPlan?.plan_id && (
                <button onClick={async () => {
                  try {
                    const allDates = [...new Set((editPlan.assignments || []).map((a: any) => a.date))].sort();
                    const date = roomsViewDate || allDates[0] || "";
                    const allSessions = [...new Set((editPlan.assignments || []).filter((a: any) => a.date === date).map((a: any) => a.session_number))].sort();
                    const sn = allSessions.includes(roomsViewSession) ? roomsViewSession : (allSessions[0] || 1);
                    const res = await API.post("surveillance-download-doc/", {
                      plan_id: editPlan.plan_id, date, session_number: sn,
                    }, { responseType: "blob" });
                    const url = URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement("a"); a.href = url;
                    a.download = `حراسة_${date}_حصة${sn}.docx`; a.click(); URL.revokeObjectURL(url);
                  } catch { setError("فشل تحميل الوثيقة"); }
                }}
                  style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  تحميل وورد
                </button>
              )}
            </div>

            {/* Group filter for edit tab */}
            <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap", padding: "0 10px" }}>
              {([-1, 1, 2, "ctrl"] as const).map(f => {
                const isAll = f === -1;
                const isCtrl = f === "ctrl";
                const selected = isAll ? (editGroupFilter === -1) : isCtrl ? (editGroupFilter === "ctrl") : (editGroupFilter === f);
                const count = isAll ? editPlan.assignments.length
                  : isCtrl ? controle.length
                  : (editPlan.summary || []).filter((s: any) => s.groupe === f).length;
                const label = isAll ? "الكل" : isCtrl ? "مجموعة تحكم" : `المجموعة ${f === 1 ? "الأولى" : "الثانية"}`;
                const borderColor = isCtrl ? "#f59e0b" : "#059669";
                const bgColor = isCtrl ? "#fffbeb" : "#ecfdf5";
                const textColor = isCtrl ? "#92400e" : "#202124";
                return (
                  <div key={String(f)} onClick={() => { setEditGroupFilter(selected ? null : f); setEditProfFilter(null); }}
                    style={{
                      flex: "0 0 auto", minWidth: 160, cursor: "pointer", borderRadius: 10,
                      border: selected ? `2px solid ${borderColor}` : "2px solid #e5e7eb",
                      background: selected ? bgColor : "#fff",
                      padding: "8px 14px", transition: "all 0.15s",
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: textColor }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{count} {isAll ? "تعيين" : "أستاذ"}</div>
                  </div>
                );
              })}
            </div>

            {(() => {
              let as = editPlan.assignments;
              let localMainPairs = mainPairs;
              let localCtrlPairs = ctrlPairs;
              if (editGroupFilter !== null && editGroupFilter !== -1) {
                // Filter profs for this group
                let groupProfIds: Set<number>;
                if (editGroupFilter === "ctrl") {
                  groupProfIds = new Set(controle.map((p: any) => p.id));
                } else {
                  groupProfIds = new Set(
                    (editPlan.summary || [])
                      .filter((s: any) => s.groupe === editGroupFilter)
                      .map((s: any) => s.professeur_id)
                  );
                }
                as = as.filter(a => groupProfIds.has(a.professeur_id));
                // Also filter columns to only show days where this group has sessions
                const groupKeys = new Set(as.map((a: Assignment) => `${a.date}|${a.session_number}`));
                localMainPairs = mainPairs.filter(k => groupKeys.has(k));
                localCtrlPairs = ctrlPairs.filter(k => groupKeys.has(k));
              }
              // Filter by selected date+session (skip when showAllSessions is active)
              if (!showAllSessions && roomsViewDate && roomsViewSession) {
                localMainPairs = localMainPairs.filter(k => {
                  const [d, sn] = k.split('|');
                  return d === roomsViewDate && parseInt(sn) === roomsViewSession;
                });
                localCtrlPairs = localCtrlPairs.filter(k => {
                  const [d, sn] = k.split('|');
                  return d === roomsViewDate && parseInt(sn) === roomsViewSession;
                });
              }
              const mainDates = [...new Set(localMainPairs.map(k => k.split('|')[0]))].sort();
              const ctrlDates = [...new Set(localCtrlPairs.map(k => k.split('|')[0]))].sort();
              const uniqueDates = [...mainDates, ...ctrlDates];
              const sessionNums = [...new Set([...localMainPairs, ...localCtrlPairs].map(k => parseInt(k.split('|')[1])))].sort();
              const mainSectionCols = mainDates.length * sessionNums.length;
              const ctrlSectionCols = ctrlDates.length * sessionNums.length;
              const summaryMap = new Map((editPlan.summary || []).map((s: any) => [s.nom, s.specialite]));
              const profCells: Record<string, { specialite: string; cells: Record<string, { surv: Assignment[]; sup: Assignment[] }> }> = {};
              for (const p of editProfs) {
                profCells[p.nom] = { specialite: summaryMap.get(p.nom) || p.specialite || '', cells: {} };
              }
              for (const a of as) {
                const key = `${a.date}|${a.session_number}`;
                if (!profCells[a.professeur_nom]) continue;
                if (!profCells[a.professeur_nom].cells[key]) profCells[a.professeur_nom].cells[key] = { surv: [], sup: [] };
                if (a.type === 'surveillant') profCells[a.professeur_nom].cells[key].surv.push(a);
                else profCells[a.professeur_nom].cells[key].sup.push(a);
              }
              const profIdMap: Record<string, number> = {};
              for (const s of editPlan.summary || []) profIdMap[s.nom] = s.professeur_id;
              for (const p of editProfs) {
                if (!(p.nom in profIdMap)) profIdMap[p.nom] = p.id;
              }
              // Column totals
              const colTotals: Record<string, { surv: number; sup: number }> = {};
              for (const a of as) {
                const k = `${a.date}|${a.session_number}`;
                if (!colTotals[k]) colTotals[k] = { surv: 0, sup: 0 };
                if (a.type === 'surveillant') colTotals[k].surv += a.heures;
                else colTotals[k].sup += a.heures;
              }

              // Per-prof totals
              const profTotals: Record<string, { surv: number; sup: number }> = {};
              for (const a of as) {
                if (!profTotals[a.professeur_nom]) profTotals[a.professeur_nom] = { surv: 0, sup: 0 };
                if (a.type === 'surveillant') profTotals[a.professeur_nom].surv += a.heures;
                else profTotals[a.professeur_nom].sup += a.heures;
              }

              const profNames = editGroupFilter !== null && editGroupFilter !== -1
                ? [...new Set(as.map((a: Assignment) => a.professeur_nom))].sort()
                : Object.keys(profCells).sort();
              const cardStyle: React.CSSProperties = {
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                borderRadius: 6, padding: "2px 4px", margin: "1px 0", fontSize: 9,
                cursor: "grab", userSelect: "none", minHeight: 28, width: "100%",
                transition: "box-shadow 0.15s",
              };
              return (<>
                {editProfFilter !== null ? (() => {
                  const profSessions = as.filter((a: Assignment) => a.professeur_id === editProfFilter);
                  const profSummary = (editPlan.summary || []).find((s: any) => s.professeur_id === editProfFilter);
                  const profSurvTot = profSessions.filter(a => a.type === 'surveillant').reduce((s: number, a: Assignment) => s + a.heures, 0);
                  const profSupTot = profSessions.filter(a => a.type === 'suppleant').reduce((s: number, a: Assignment) => s + a.heures, 0);
                  return (
                  <div style={{ padding: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#202124" }}>{profSummary?.nom || ''}</span>
                        <span style={{ fontSize: 13, color: "#64748b", marginRight: 8 }}>{profSummary?.specialite || ''}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                        {(profSurvTot + profSupTot)}h
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {profSessions.sort((a: Assignment, b: Assignment) => a.date.localeCompare(b.date) || a.session_number - b.session_number).map(a => (
                        <div key={a.id}
                          style={{
                            flex: "0 0 calc(33.33% - 6px)", borderRadius: 8,
                            border: "1px solid #e5e7eb", background: "#fff",
                            padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#202124" }}>{a.date} | الحصة {a.session_number}</div>
                            <div style={{
                              fontSize: 11, fontWeight: 600, borderRadius: 4, padding: "2px 8px",
                              background: a.type === 'surveillant' ? "#dbeafe" : "#fef3c7",
                              color: a.type === 'surveillant' ? "#1e466e" : "#92400e",
                            }}>
                              {a.type === 'surveillant' ? 'مراقبة' : 'احتياط'}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            <div style={{ fontWeight: 600 }}>{a.salle_label || `قاعة ${a.salle_numero}`}</div>
                            {a.type === 'surveillant' && a.matiere_nom && <div style={{ color: "#64748b", marginTop: 2 }}>{a.matiere_nom}</div>}
                            <div style={{ color: "#64748b", marginTop: 2, fontSize: 11 }}>{a.professeur_institution || ''}</div>
                          </div>
                        </div>
                      ))}
                      {profSessions.length === 0 && <div style={{ color: "#e5e7eb", fontSize: 13, padding: "20px 0", textAlign: "center", width: "100%" }}>لا توجد جلسات</div>}
                    </div>
                  </div>
                  );
                })() : editGroupFilter !== null && editGroupFilter !== -1 ? (
                <>
                <div ref={editTopScrollRef} style={{ overflowX: "auto", height: 0 }} onScroll={() => syncScroll(editTopScrollRef.current, editScrollRef.current)}>
                  <div style={{ width: as.length * 85 + 300, height: 1 }} />
                </div>
                <div ref={editScrollRef} style={{ overflowX: "auto" }} onScroll={() => syncScroll(editScrollRef.current, editTopScrollRef.current)}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      {(mainDates.length > 0 || ctrlDates.length > 0) && (
                        <tr>
                          <th colSpan={2} style={{ border: "none", padding: 0 }}></th>
                          {mainDates.length > 0 && (
                            <th colSpan={mainSectionCols} style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #d1d5db", background: "#e8f0fe", color: "#1e466e", fontSize: 11, fontWeight: 700 }}>
                              الدورة الرئيسية
                            </th>
                          )}
                          {ctrlDates.length > 0 && (
                            <th colSpan={ctrlSectionCols} style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #d1d5db", background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700 }}>
                              دورة التحكم
                            </th>
                          )}
                          <th colSpan={3} style={{ border: "none", padding: 0 }}></th>
                        </tr>
                      )}
                      <tr style={{ background: "#f1f3f4" }}>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 100 }}>اسم الأستاذ</th>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 70 }}>الاختصاص</th>
                        {mainDates.map(d => (
                          <th key={d} colSpan={sessionNums.length} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", background: "#e8f0fe" }}>{d}</th>
                        ))}
                        {ctrlDates.map(d => (
                          <th key={d} colSpan={sessionNums.length} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", background: "#fef3c7" }}>{d}</th>
                        ))}
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 45, color: "#1e466e", fontSize: 10 }}>س. مراقبة</th>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 45, color: "#92400e", fontSize: 10 }}>س. احتياط</th>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 45, color: "#059669", fontSize: 10 }}>المجموع</th>
                      </tr>
                      <tr style={{ background: "#f8f9fa" }}>
                        {uniqueDates.map(d => sessionNums.map(sn => (
                          <th key={`${d}-${sn}`} style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #d1d5db", fontSize: 10 }}>الحصة {sn}</th>
                        )))}
                      </tr>
                    </thead>
                    <tbody>
                      {profNames.map((nom, ri) => {
                        const p = profCells[nom];
                        const targetProfId = profIdMap[nom];
                        return (
                          <tr key={nom} style={{ background: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
                            <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", fontWeight: 600 }}>{nom}</td>
                            <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", color: "#64748b", fontSize: 10 }}>{p.specialite}</td>
                            {uniqueDates.map(d => sessionNums.map(sn => {
                              const cell = p.cells[`${d}|${sn}`];
                              const hasSurv = cell?.surv?.length;
                              const hasSup = cell?.sup?.length;
                              return (
                                <td key={`${d}-${sn}`}
                                  style={{ padding: "2px", border: "1px solid #d1d5db", textAlign: "center", verticalAlign: "top", minWidth: 85 }}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => { e.preventDefault(); handleDropOnCellFor(cell || { surv: [], sup: [] }, d, sn, targetProfId); }}>
                                  {hasSurv ? cell.surv.map((a) => (
                                    editingCell === String(a.id) ? (
                                      <select key={a.id} value={a.professeur_id} onChange={e => handleProfChange(a.id, Number(e.target.value))}
                                        onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: 1, fontFamily: "inherit", width: "100%" }} autoFocus>
                                        {editProfs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                                      </select>
                                    ) : (
                                      <div key={a.id} draggable onDragStart={() => handleDragStart(a)}
                                        onClick={() => setEditingCell(String(a.id))}
                                        style={{
                                          ...cardStyle, background: "#dbeafe", color: "#1e466e", boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                          border: pendingChanges.has(a.id) ? "2px solid #d97706" : undefined,
                                        }}>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>{a.salle_label || `قاعة ${a.salle_numero}`}</div>
                                        <div style={{ fontWeight: 600, marginTop: 1 }}>{a.professeur_nom}</div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{a.professeur_institution || ''}</div>
                                      </div>
                                    )
                                  )) : null}
                                  {hasSup ? cell.sup.map((a) => (
                                    editingCell === String(a.id) ? (
                                      <select key={a.id} value={a.professeur_id} onChange={e => handleProfChange(a.id, Number(e.target.value))}
                                        onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: 1, fontFamily: "inherit", width: "100%" }} autoFocus>
                                        {editProfs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                                      </select>
                                    ) : (
                                      <div key={a.id} draggable onDragStart={() => handleDragStart(a)}
                                        onClick={() => setEditingCell(String(a.id))}
                                        style={{
                                          ...cardStyle, background: "#fef3c7", color: "#92400e", boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                          border: pendingChanges.has(a.id) ? "2px solid #d97706" : undefined,
                                        }}>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>احتياط</div>
                                        <div style={{ fontWeight: 600, marginTop: 1 }}>{a.professeur_nom}</div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{a.professeur_institution || ''}</div>
                                      </div>
                                    )
                                  )) : null}
                                  {!hasSurv && !hasSup ? (
                                    <div style={{ color: "#e5e7eb", fontSize: 10, padding: "12px 0" }}>-</div>
                                  ) : null}
                                </td>
                              );
                            }))}
                              {/* Per-prof totals */}
                              <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#1e466e", fontWeight: 700, fontSize: 11, background: "#eff6ff" }}>
                                {(profTotals[nom]?.surv || 0)}h
                              </td>
                              <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#92400e", fontWeight: 700, fontSize: 11, background: "#fffbeb" }}>
                                {(profTotals[nom]?.sup || 0)}h
                              </td>
                              <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#059669", fontWeight: 800, fontSize: 11, background: "#f0fdf4" }}>
                                {(profTotals[nom]?.surv || 0) + (profTotals[nom]?.sup || 0)}h
                              </td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr style={{ background: "#f0fdf4", fontWeight: 700 }}>
                        <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", color: "#059669", fontSize: 12 }}>المجموع</td>
                        <td style={{ padding: "4px 6px", border: "1px solid #d1d5db" }}></td>
                        {uniqueDates.map(d => sessionNums.map(sn => {
                          const t = colTotals[`${d}|${sn}`];
                          const surv = t?.surv || 0;
                          const sup = t?.sup || 0;
                          return (
                            <td key={`tot-${d}-${sn}`} style={{ padding: "4px", border: "1px solid #d1d5db", textAlign: "center", verticalAlign: "middle", fontSize: 10 }}>
                              <div style={{ color: "#1e466e" }}>م: {surv}h</div>
                              <div style={{ color: "#92400e" }}>ا: {sup}h</div>
                              <div style={{ color: "#059669", fontWeight: 800, borderTop: "1px dashed #d1d5db", marginTop: 2, paddingTop: 2 }}>{surv + sup}h</div>
                            </td>
                          );
                        }))}
                          <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#1e466e", fontWeight: 700, fontSize: 11 }}>
                            {Object.values(colTotals).reduce((s, t) => s + t.surv, 0)}h
                          </td>
                          <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#92400e", fontWeight: 700, fontSize: 11 }}>
                            {Object.values(colTotals).reduce((s, t) => s + t.sup, 0)}h
                          </td>
                          <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#059669", fontWeight: 800, fontSize: 11 }}>
                            {Object.values(colTotals).reduce((s, t) => s + t.surv + t.sup, 0)}h
                          </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {editGroupFilter !== null && (
                  <select value={editProfFilter || ''} onChange={e => { setEditProfFilter(e.target.value ? Number(e.target.value) : null); setShowAllSessions(false); }}
                    style={{ margin: "10px", padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, fontFamily: "inherit", background: "#fff", minWidth: 180 }}>
                    <option value="">-- اختر أستاذ --</option>
                    {(editGroupFilter === "ctrl"
                      ? controle
                      : editGroupFilter === -1
                      ? (editPlan.summary || [])
                      : (editPlan.summary || []).filter((s: any) => s.groupe === editGroupFilter)
                    ).map((s: any) => (
                      <option key={s.professeur_id ?? s.id} value={s.professeur_id ?? s.id}>{s.nom} - {s.specialite}</option>
                    ))}
                  </select>
                )}
                </>
                ) : (
                <>
                <div ref={editTopScrollRef} style={{ overflowX: "auto", height: 0 }} onScroll={() => syncScroll(editTopScrollRef.current, editScrollRef.current)}>
                  <div style={{ width: editPlan.assignments.length * 85 + 300, height: 1 }} />
                </div>
                <div ref={editScrollRef} style={{ overflowX: "auto" }} onScroll={() => syncScroll(editScrollRef.current, editTopScrollRef.current)}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      {(mainDates.length > 0 || ctrlDates.length > 0) && (
                        <tr>
                          <th colSpan={2} style={{ border: "none", padding: 0 }}></th>
                          {mainDates.length > 0 && (
                            <th colSpan={mainSectionCols} style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #d1d5db", background: "#e8f0fe", color: "#1e466e", fontSize: 11, fontWeight: 700 }}>
                              الدورة الرئيسية
                            </th>
                          )}
                          {ctrlDates.length > 0 && (
                            <th colSpan={ctrlSectionCols} style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #d1d5db", background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700 }}>
                              دورة التحكم
                            </th>
                          )}
                          <th colSpan={3} style={{ border: "none", padding: 0 }}></th>
                        </tr>
                      )}
                      <tr style={{ background: "#f1f3f4" }}>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 100 }}>اسم الأستاذ</th>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 70 }}>الاختصاص</th>
                        {mainDates.map(d => (
                          <th key={d} colSpan={sessionNums.length} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", background: "#e8f0fe" }}>{d}</th>
                        ))}
                        {ctrlDates.map(d => (
                          <th key={d} colSpan={sessionNums.length} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", background: "#fef3c7" }}>{d}</th>
                        ))}
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 45, color: "#1e466e", fontSize: 10 }}>س. مراقبة</th>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 45, color: "#92400e", fontSize: 10 }}>س. احتياط</th>
                        <th rowSpan={2} style={{ padding: "6px 7px", textAlign: "center", border: "1px solid #d1d5db", minWidth: 45, color: "#059669", fontSize: 10 }}>المجموع</th>
                      </tr>
                      <tr style={{ background: "#f8f9fa" }}>
                        {uniqueDates.map(d => sessionNums.map(sn => (
                          <th key={`${d}-${sn}`} style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #d1d5db", fontSize: 10 }}>الحصة {sn}</th>
                        )))}
                      </tr>
                    </thead>
                    <tbody>
                      {profNames.map((nom, ri) => {
                        const p = profCells[nom];
                        const targetProfId = profIdMap[nom];
                        return (
                          <tr key={nom} style={{ background: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
                            <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", fontWeight: 600 }}>{nom}</td>
                            <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", color: "#64748b", fontSize: 10 }}>{p.specialite}</td>
                            {uniqueDates.map(d => sessionNums.map(sn => {
                              const cell = p.cells[`${d}|${sn}`];
                              const hasSurv = cell?.surv?.length;
                              const hasSup = cell?.sup?.length;
                              return (
                                <td key={`${d}-${sn}`}
                                  style={{ padding: "2px", border: "1px solid #d1d5db", textAlign: "center", verticalAlign: "top", minWidth: 85 }}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => { e.preventDefault(); handleDropOnCellFor(cell || { surv: [], sup: [] }, d, sn, targetProfId); }}>
                                  {hasSurv ? cell.surv.map((a) => (
                                    editingCell === String(a.id) ? (
                                      <select key={a.id} value={a.professeur_id} onChange={e => handleProfChange(a.id, Number(e.target.value))}
                                        onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: 1, fontFamily: "inherit", width: "100%" }} autoFocus>
                                        {editProfs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                                      </select>
                                    ) : (
                                      <div key={a.id} draggable onDragStart={() => handleDragStart(a)}
                                        onClick={() => setEditingCell(String(a.id))}
                                        style={{
                                          ...cardStyle, background: "#dbeafe", color: "#1e466e", boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                          border: pendingChanges.has(a.id) ? "2px solid #d97706" : undefined,
                                        }}>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>{a.salle_label || `قاعة ${a.salle_numero}`}</div>
                                        <div style={{ fontWeight: 600, marginTop: 1 }}>{a.professeur_nom}</div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{a.professeur_institution || ''}</div>
                                      </div>
                                    )
                                  )) : null}
                                  {hasSup ? cell.sup.map((a) => (
                                    editingCell === String(a.id) ? (
                                      <select key={a.id} value={a.professeur_id} onChange={e => handleProfChange(a.id, Number(e.target.value))}
                                        onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: 1, fontFamily: "inherit", width: "100%" }} autoFocus>
                                        {editProfs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                                      </select>
                                    ) : (
                                      <div key={a.id} draggable onDragStart={() => handleDragStart(a)}
                                        onClick={() => setEditingCell(String(a.id))}
                                        style={{
                                          ...cardStyle, background: "#fef3c7", color: "#92400e", boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                          border: pendingChanges.has(a.id) ? "2px solid #d97706" : undefined,
                                        }}>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>احتياط</div>
                                        <div style={{ fontWeight: 600, marginTop: 1 }}>{a.professeur_nom}</div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{a.professeur_institution || ''}</div>
                                      </div>
                                    )
                                  )) : null}
                                  {!hasSurv && !hasSup ? (
                                    <div style={{ color: "#e5e7eb", fontSize: 10, padding: "12px 0" }}>-</div>
                                  ) : null}
                                </td>
                              );
                            }))}
                              {/* Per-prof totals */}
                              <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#1e466e", fontWeight: 700, fontSize: 11, background: "#eff6ff" }}>
                                {(profTotals[nom]?.surv || 0)}h
                              </td>
                              <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#92400e", fontWeight: 700, fontSize: 11, background: "#fffbeb" }}>
                                {(profTotals[nom]?.sup || 0)}h
                              </td>
                              <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#059669", fontWeight: 800, fontSize: 11, background: "#f0fdf4" }}>
                                {(profTotals[nom]?.surv || 0) + (profTotals[nom]?.sup || 0)}h
                              </td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr style={{ background: "#f0fdf4", fontWeight: 700 }}>
                        <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", color: "#059669", fontSize: 12 }}>المجموع</td>
                        <td style={{ padding: "4px 6px", border: "1px solid #d1d5db" }}></td>
                        {uniqueDates.map(d => sessionNums.map(sn => {
                          const t = colTotals[`${d}|${sn}`];
                          const surv = t?.surv || 0;
                          const sup = t?.sup || 0;
                          return (
                            <td key={`tot-${d}-${sn}`} style={{ padding: "4px", border: "1px solid #d1d5db", textAlign: "center", verticalAlign: "middle", fontSize: 10 }}>
                              <div style={{ color: "#1e466e" }}>م: {surv}h</div>
                              <div style={{ color: "#92400e" }}>ا: {sup}h</div>
                              <div style={{ color: "#059669", fontWeight: 800, borderTop: "1px dashed #d1d5db", marginTop: 2, paddingTop: 2 }}>{surv + sup}h</div>
                            </td>
                          );
                        }))}
                          <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#1e466e", fontWeight: 700, fontSize: 11 }}>
                            {Object.values(colTotals).reduce((s, t) => s + t.surv, 0)}h
                          </td>
                          <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#92400e", fontWeight: 700, fontSize: 11 }}>
                            {Object.values(colTotals).reduce((s, t) => s + t.sup, 0)}h
                          </td>
                          <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "center", color: "#059669", fontWeight: 800, fontSize: 11 }}>
                            {Object.values(colTotals).reduce((s, t) => s + t.surv + t.sup, 0)}h
                          </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </>
              );
            })()}


          </div>
        )}

        {mainTab === "edit" && !editPlan && (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#64748b" }}>لم يتم إنشاء جدول بعد. اذهب إلى "المجموعات" ثم اضغط "توزيع المراقبة".</p>
          </div>
        )}
      </div>

      {/* Report download modal */}
      {reportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={() => setReportModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 420, width: "100%", direction: "rtl", fontFamily: "'Cairo',sans-serif" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#202124", margin: "0 0 16px", textAlign: "center" }}>تقرير حصص الحراسة</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reportDocs.map((doc: any) => (
                <button key={doc.doc_id} onClick={async () => {
                  try {
                    const res = await API.get(`download-document/${doc.doc_id}/`, { responseType: "blob" });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement("a");
                    a.href = url; a.download = `${doc.label}.docx`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch { setError("فشل التحميل"); }
                }}
                  style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: "1px solid #fde68a", background: "#fef3c7", color: "#92400e", cursor: "pointer", fontFamily: "inherit", textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
                  <Download size={16} /> {doc.label}
                </button>
              ))}
            </div>
            <button onClick={() => setReportModal(false)}
              style={{ marginTop: 16, padding: "10px 0", width: "100%", fontSize: 13, fontWeight: 600, borderRadius: 10, border: "none", background: "#f1f3f4", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
