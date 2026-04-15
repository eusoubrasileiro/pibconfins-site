import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import MonthDetail from "@/pages/MonthDetail";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <BrowserRouter basename="/pibconfins">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mes/:ref" element={<MonthDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
