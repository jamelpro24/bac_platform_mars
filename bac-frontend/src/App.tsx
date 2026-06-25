import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/acceuil/home";
import Login from "./pages/auth/login";

import AdminDashboard from "./pages/dashbords/AdminDashboard";
import General from "./pages/dashbords/general";
import Layout from "./pages/dashbords/layout";
import PrivateRoute from "./pages/auth/PrivateRoute";

import Centres from "./pages/centres";
import Salles from "./pages/salles";
import SallesControle from "./pages/SallesControle";
import Profs from "./pages/profs";
import Candidats from "./pages/candidats";
import Exams from "./pages/dashbords/Exams";
import Surveillance from "./pages/Surveillance";
import DirecteurDashboard from "./pages/dashbords/DirecteurDashbord";
import ProfsDashboard from "./pages/dashbords/ProfsDashboard";
import SurveillanceProfs from "./pages/dashbords/surveillanceprofs";
import ProfSurveillanceBalance from "./pages/dashbords/ProfSurveillanceBalance";
import ProfInvitations from "./pages/dashbords/ProfInvitations";
import ProfCalendrier from "./pages/dashbords/ProfCalendrier";

import SessionManagement from "./pages/dashbords/exam_planning/sessionmanagement";
import SerieManagement from "./pages/dashbords/exam_planning/seriemanagement";
import ExamCalendar from "./pages/dashbords/exam_planning/calendar";
import MatieresPage from "./pages/dashbords/exam_planning/MatieresPage";

// Nouvelles pages
import Badges from "./pages/padge";
import MatieresOptionnelles from "./pages/dashbords/exam_planning/SallesOptionnelles";
import Edition from "./pages/dashbords/Edition";
import Rapports from "./pages/dashbords/Rapports";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/auth/login" element={<Login />} />

        {/* DIRECTEUR DASHBOARD */}
        <Route
          path="/dashboarddirecteur"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DirecteurDashboard/>} />
          <Route path="general" element={<General />} />
          <Route path="calendrier" element={<ExamCalendar />} />
          <Route path="salles" element={<Salles />} />
          <Route path="salles/controle" element={<SallesControle />} />
          <Route path="profs" element={<ProfsDashboard />} />
          <Route path="profs/liste" element={<Profs />} />
          <Route path="profs/surveillance" element={<SurveillanceProfs />} />
          <Route path="profs/surveillance/equilibre" element={<ProfSurveillanceBalance />} />
          <Route path="profs/invitations" element={<ProfInvitations />} />
          <Route path="profs/calendrier" element={<ProfCalendrier />} />
          <Route path="profs" element={<ProfsDashboard />} />
          <Route path="profs/liste" element={<Profs />} />
          <Route path="candidats" element={<Candidats />} />
          <Route path="examens" element={<Exams />} />
          <Route path="surveillance" element={<Surveillance />} />
          <Route path="calendrier/sessionmanagement" element={<SessionManagement />} />
          <Route path="calendrier/seriemanagement" element={<SerieManagement />} />
          <Route path="calendrier/matieres" element={<MatieresPage />} />
          <Route path="badges" element={<Badges />} />
          <Route path="matieres-optionnelles" element={<MatieresOptionnelles />} />
          <Route path="edition" element={<Edition />} />
          <Route path="rapports" element={<Rapports />} />
        </Route>
        {/* ADMIN */}
        <Route
          path="/dashboardadmin"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="general" element={<General />} />
          <Route path="calendrier" element={<ExamCalendar />} />
          <Route path="salles" element={<Salles />} />
          <Route path="salles/controle" element={<SallesControle />} />
          <Route path="profs" element={<ProfsDashboard />} />
          <Route path="profs/liste" element={<Profs />} />
          <Route path="profs/surveillance" element={<SurveillanceProfs />} />
          <Route path="profs/surveillance/equilibre" element={<ProfSurveillanceBalance />} />
          <Route path="profs/invitations" element={<ProfInvitations />} />
          <Route path="profs/calendrier" element={<ProfCalendrier />} />
          <Route path="candidats" element={<Candidats />} />
          <Route path="examens" element={<Exams />} />
          <Route path="surveillance" element={<Surveillance />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
