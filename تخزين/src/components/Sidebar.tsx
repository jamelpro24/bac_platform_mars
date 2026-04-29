import { Link } from "react-router-dom";

type SidebarProps = {
  open: boolean;
  onClose?: () => void;
};

export default function Sidebar({ open }: SidebarProps) {
  return (
    <div className={`sidebar text-end ${open ? "open" : "closed"}`}>

      <h4 className="text-center mb-4">
        منصة البكالوريا
      </h4>

      <ul className="nav flex-column">

        <li>
          <Link className="nav-link" to="/dashboarddirecteur">
            معطيات عامة
          </Link>
        </li>

        <li>
          <Link className="nav-link" to="/dashboarddirecteur/salles">
            القاعات
          </Link>
        </li>

        <li>
          <Link className="nav-link" to="/dashboarddirecteur/profs">
            الأساتذة
          </Link>
        </li>

      </ul>

    </div>
  );
}