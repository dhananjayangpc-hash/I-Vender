import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import RegisterWizard from './pages/RegisterWizard'
import Home from './pages/Home'

export default function App(){
  return (
    <div className="app">
      <header className="header">
        <h1>I-Vendor Starter</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/register">Vendor Register</Link>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterWizard />} />
        </Routes>
      </main>
    </div>
  )
}
