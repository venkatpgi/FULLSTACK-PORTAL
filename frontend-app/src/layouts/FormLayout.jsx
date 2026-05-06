import Sidebar from "../Sidebar"; 
import "./FormLayout.css";

export default function FormLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div className="form-layout-container">
        {children}
      </div>
    </div>
  );
}