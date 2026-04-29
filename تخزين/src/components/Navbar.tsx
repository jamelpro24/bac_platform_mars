import { Link } from "react-router-dom";

export default function Navbar(){

 return(

  <nav className="navbar navbar-dark bg-dark navbar-expand">

   <div className="container">

    <Link className="navbar-brand" to="/">
      Gestion BAC
    </Link>

    <div className="navbar-nav">

      <Link className="nav-link" to="/centres">Centres</Link>

      <Link className="nav-link" to="/salles">Salles</Link>

      <Link className="nav-link" to="/candidats">Candidats</Link>

      <Link className="nav-link" to="/profs">Professeurs</Link>

      <Link className="nav-link" to="/surveillance">Surveillance</Link>

    </div>

   </div>

  </nav>

 )

}
