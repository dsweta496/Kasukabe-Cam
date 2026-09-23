import { BrowserRouter, Routes, Route } from "react-router-dom"

import Landing from "./pages/Landing/Landing"
import PhotoSelection from "./pages/PhotoSelection/PhotoSelection"
import Review from "./pages/Review/Review"
import MakeStrip from "./pages/MakeStrip/MakeStrip"
import Stickers from "./pages/Stickers/Stickers"
import Result from "./pages/Result/Result"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/select" element={<PhotoSelection />} />
                <Route path="/review" element={<Review />} />
                <Route path="/make-strip" element={<MakeStrip />} />
                <Route path="/stickers" element={<Stickers />} />
                <Route path="/result" element={<Result />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App