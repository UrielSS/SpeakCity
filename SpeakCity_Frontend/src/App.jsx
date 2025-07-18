import { useState, useEffect } from 'react';
//import reactLogo from './assets/react.svg';
//import viteLogo from '/vite.svg';
import './App.css';
import ChatBox from './ChatBox';
import CityCanvas from './CityCanvas'; // Importa el nuevo componente

function App() {
  const [users, setUsers] = useState([]);

  useEffect(()=>{
    fetch('http://localhost:5000/api/users')
    .then(res => res.json())
    .then(data =>setUsers(data.users))
  }, []);

  return (
    <>
    {/* Agrega el nuevo componente aquí 
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
*/}
      <h1>SpeakCity - IA Chat</h1>
{/*
      <ChatBox />
*/}     
      {/* Agrega el nuevo componente aquí */}
      <div style={{ margin: '20px 0' }}>
        <CityCanvas />
      </div>
      
      <div className="card">
        <h2>
          <ul>
            {users.map((user)=>(
              <li key={user.id}>
                {user.name}
              </li>
            ))}
          </ul>
        </h2>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App;
