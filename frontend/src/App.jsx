
import { Routes, Route } from 'react-router-dom'
import NavigationBar from './components/NavigationBar'
import Footer from './components/Footer'
import Home from './pages/Home'


//ALWAYS KEEP IN MIND, WE WANT A CARD BASE LAYOUT
function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavigationBar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App