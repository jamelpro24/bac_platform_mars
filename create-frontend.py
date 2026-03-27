import os
import subprocess

print("Creation du projet React TypeScript...")

# creer projet vite react-ts
subprocess.run(
    ["npm", "create", "vite@latest", "bac-frontend", "--", "--template", "react-ts"],
    shell=True
)

os.chdir("bac-frontend")

print("Installation des dependances...")

subprocess.run(["npm", "install"], shell=True)
subprocess.run(["npm", "install", "axios", "react-router-dom", "bootstrap"], shell=True)

# creer dossiers
os.makedirs("src/pages", exist_ok=True)
os.makedirs("src/components", exist_ok=True)
os.makedirs("src/services", exist_ok=True)

# API service
api = '''
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/"
});

export default API;
'''

with open("src/services/api.ts", "w", encoding="utf8") as f:
    f.write(api)

# Navbar
navbar = '''
import { Link } from "react-router-dom";

export default function Navbar() {

  return (

    <nav className="navbar navbar-dark bg-dark navbar-expand">
      <div className="container">

        <Link className="navbar-brand" to="/">
          Gestion BAC
        </Link>

        <div className="navbar-nav">

          <Link className="nav-link" to="/centres">
            Centres
          </Link>

          <Link className="nav-link" to="/salles">
            Salles
          </Link>

          <Link className="nav-link" to="/candidats">
            Candidats
          </Link>

        </div>

      </div>
    </nav>

  );
}
'''

with open("src/components/Navbar.tsx", "w", encoding="utf8") as f:
    f.write(navbar)

# Page Centres
centres = '''
import { useEffect, useState } from "react";
import API from "../services/api";

interface Centre {
  id: number
  nom: string
}

export default function Centres() {

  const [centres, setCentres] = useState<Centre[]>([])

  useEffect(() => {

    API.get("centres/")
      .then(res => setCentres(res.data))

  }, [])

  return (

    <div className="container mt-4">

      <h2>Centres</h2>

      <table className="table table-bordered">

        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
          </tr>
        </thead>

        <tbody>

          {centres.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.nom}</td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>

  )
}
'''

with open("src/pages/Centres.tsx", "w", encoding="utf8") as f:
    f.write(centres)

# App principale
app = '''
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Centres from "./pages/Centres"

function App() {

  return (

    <BrowserRouter>

      <Navbar />

      <Routes>

        <Route path="/centres" element={<Centres />} />

      </Routes>

    </BrowserRouter>

  )
}

export default App
'''

with open("src/App.tsx", "w", encoding="utf8") as f:
    f.write(app)

print("Frontend React TypeScript cree avec succes")
print("Lancer ensuite :")
print("cd bac-frontend")
print("npm run dev")
