import { NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Merge from "./pages/Merge";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition ${
    isActive
      ? "bg-blue-600 text-white"
      : "text-gray-700 hover:bg-gray-100"
  }`;

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <span className="font-bold text-gray-800 mr-auto">PDF Tools</span>
          <NavLink to="/" end className={navLinkClass}>
            JPG → PDF
          </NavLink>
          <NavLink to="/merge" className={navLinkClass}>
            Merge PDF
          </NavLink>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge" element={<Merge />} />
      </Routes>
    </div>
  );
}

export default App;