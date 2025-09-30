import { Routes, Route } from "react-router-dom";
import Home from "./features/profile/home_pages";
import ProfileCreate from "./features/profile/profileCreate_pages";
import Profile from "./features/profile/profile_pages";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile/create" element={<ProfileCreate />} />
      <Route path="/profile/:userId" element={<Profile />} />
    </Routes>
  );
}

export default App;
