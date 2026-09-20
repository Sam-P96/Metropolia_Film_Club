import { useState } from 'react'
import NavigationBar from './components/NavigationBar'
import Footer from './components/Footer'

import './App.css'


//ALWAYS KEEP IN MIND, WE WANT A CARD BASE LAYOUT
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <NavigationBar />
      {/* <main>
        <Routes>

        </Routes>
      </main> */}
      <Footer />
    </>
  )
}

export default App
