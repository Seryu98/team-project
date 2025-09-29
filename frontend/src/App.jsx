import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProfileCreate from "./pages/ProfileCreate";
import Profile from "./pages/Profile";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile/create" element={<ProfileCreate />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default App;
