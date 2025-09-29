import { Routes, Route } from "react-router-dom";
import Home from "./profile/home_pages";
import ProfileCreate from "./profile/profileCreate_pages";
import Profile from "./profile/profile_pages";

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
