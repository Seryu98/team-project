import { useEffect, useState } from "react"

function App() {
  const [msg, setMsg] = useState("loading...")

  useEffect(() => {
    fetch(import.meta.env.VITE_API_BASE_URL + "/api/hello")
      .then(res => res.json())
      .then(d => setMsg(d.message))
      .catch(() => setMsg("error"))
  }, [])

  return <h1>{msg}</h1>
}

export default App
