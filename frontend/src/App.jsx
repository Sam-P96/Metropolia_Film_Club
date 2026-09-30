
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import NavigationBar from './components/NavigationBar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'


//ALWAYS KEEP IN MIND, WE WANT A CARD BASE LAYOUT
function App() {
  return (
    <div className="flex min-h-screen flex-col">
       <ScrollToTop />
      <NavigationBar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App