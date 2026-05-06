// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from "react-router-dom";

import { FormProgressProvider } from "./context/FormProgressContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PatientProvider } from "./context/PatientContext";
import { useFormProgress } from "./context/FormProgressContext";

import ScreeningForm from "./ScreeningForm";
import BirthResuscitation from "./BirthResuscitationForm";
import FormC from "./FormC";
import FormD from "./FormD";
import FormE from "./FormE";
import FormF from "./FormF";
import FormG from "./FormG";
import FormH from "./FormH";
import FormI from "./FormI";
import FormJ from "./FormJ";

import FiO2AUC from "./FiO2AUC";
import RespCVNeuroLog from "./RespCVNeuroLog";
import InfectGIHemaLog from "./InfectGIHemaLog";
import MetabRenalVascEyeLog from "./MetabRenalVascEyeLog";

import FormY_SAE from "./FormY_SAE";
import AdverseEventsForm from "./AdverseEventsForm";
import SeriousAdverseEventsList from "./SeriousAdverseEventsList";

import ViewEntries from "./ViewEntries";
import EditScreening from "./EditScreening";
import Dashboard from "./Dashboard";
import Login from "./Login";

import ProtectedRoute from "./components/ProtectedRoute";
import FloatingLogout from "./components/FloatingLogout";
import FormLayout from "./layouts/FormLayout";

import "./App.css";


// =======================
// MAIN CONTENT
// =======================

function AppContent() {
  const { token } = useAuth();
  const { resetProgress } = useFormProgress();

  return (
    <Router>
      <div className="app-container">

        {/* HEADER */}
        <header className="app-header">
          <h1>PORTAL Trial</h1>
          <h2>Initial Oxygen for Delivery Room Resuscitation of Preterm Neonates: A triple-arm,multisite,randomized,controlled trial</h2>
        </header>

        {/* NAVBAR */}
        {token && (
          <nav className="nav-bar">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
              🏠 <span>Dashboard</span>
            </NavLink>

            <NavLink
  to="/form-a"
  className="nav-btn primary"
  onClick={() => {
    // 🔥 CLEAR OLD DATA
    localStorage.removeItem("current_screening_id");
    localStorage.removeItem("current_enrollment_id");
    localStorage.removeItem("enrollment_locked");

    // 🔥 RESET SIDEBAR
    window.dispatchEvent(new Event("storage"));

    // 🔥 FORCE FRESH LOAD (VERY IMPORTANT)
    window.location.href = "/form-a";
  }}
>
  ➕ New Entry
</NavLink>
            <NavLink to="/entries" className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
              📋 <span>View Entries</span>
            </NavLink>
          </nav>
        )}

        {token && <FloatingLogout />}

        {/* ROUTES */}
        <PatientProvider>
          <Routes>

            {/* LOGIN */}
            <Route path="/login" element={<Login />} />

            {/* PROTECTED */}
            <Route
              path="*"
              element={
                <main className="app-main">
                  <div className="content-wrapper">

                    <Routes>

                      <Route path="/" element={<Navigate to="/dashboard" />} />

                      {/* DASHBOARD */}
                      <Route path="/dashboard" element={
                        <ProtectedRoute><Dashboard /></ProtectedRoute>
                      } />

                      {/* ENTRIES */}
                      <Route path="/entries" element={
                        <ProtectedRoute><ViewEntries /></ProtectedRoute>
                      } />

                      <Route path="/edit/:id" element={
                        <ProtectedRoute><EditScreening /></ProtectedRoute>
                      } />

                      {/* ================= FORMS ================= */}

                      <Route path="/form-a/:screeningId?" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_a">
                            <ScreeningForm />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-b/:screeningId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_b">
                            <BirthResuscitation />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-c/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_c">
                            <FormC />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-d/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_d">
                            <FormD />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-e/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_e">
                            <FormE />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      {/* 🔥 FIXED ROUTES BELOW */}

                      <Route path="/form-f/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_f">
                            <FormF />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-g/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_g">
                            <FormG />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-h/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_h">
                            <FormH />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-i/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_i">
                            <FormI />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-j/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_j">
                            <FormJ />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/fio2-auc/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="fio2_auc">
                            <FiO2AUC />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/vs6-1/:enrollmentId?" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="vs6_1">
                            <RespCVNeuroLog />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/infect-gi-hema-log/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="infect_gi_hema">
                            <InfectGIHemaLog />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/metab-renal-vasc-eye-log/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="metab_renal_vasc_eye">
                            <MetabRenalVascEyeLog />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/form-y-sae/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="form_y_sae">
                            <FormY_SAE />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/adverse-events/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="adverse_events">
                            <AdverseEventsForm />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                      <Route path="/sae-list/:enrollmentId" element={
                        <ProtectedRoute>
                          <FormLayout currentForm="sae_list">
                            <SeriousAdverseEventsList />
                          </FormLayout>
                        </ProtectedRoute>
                      } />

                    </Routes>

                  </div>
                </main>
              }
            />

          </Routes>
        </PatientProvider>

        {/* FOOTER */}
        <footer className="app-footer">
          <p>© 2025 PORTAL Trial | Developed for Clinical Research Data Entry</p>
        </footer>

      </div>
    </Router>
  );
}


// =======================
// ROOT APP
// =======================

function App() {
  return (
    <FormProgressProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </FormProgressProvider>
  );
}

export default App;