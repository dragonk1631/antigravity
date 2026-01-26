import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Reservations from './pages/Reservations';
import MessageGenerator from './pages/MessageGenerator';
import InstaBot from './pages/InstaBot';
import Book from './pages/Book';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Route */}
        <Route path="/book" element={<Book />} />

        {/* Admin Routes with Layout */}
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Navigate to="/admin/reservations" replace />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="messages" element={<MessageGenerator />} />
          <Route path="insta" element={<InstaBot />} />
        </Route>

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/admin/reservations" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
