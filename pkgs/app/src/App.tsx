import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import AuthGuard from "./components/AuthGuard"
import AuthOnly from "./components/AuthOnly"
import Home from "./pages/Home"
import Register from "./pages/Register"
import Listings from "./pages/Listings"
import NewListing from "./pages/NewListing"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="register" element={<AuthOnly />}>
          <Route index element={<Register />} />
        </Route>
        <Route element={<AuthGuard />}>
          <Route path="listings" element={<Listings />} />
          <Route path="listings/new" element={<NewListing />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
