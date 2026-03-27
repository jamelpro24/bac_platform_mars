import { useState } from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const [open] = useState(true);

  return (
    <div className="layout">

      <Sidebar open={open} />

      <div className={`main ${open ? "shift" : ""}`}>

       <Outlet />

      </div>

    </div>
  );
}