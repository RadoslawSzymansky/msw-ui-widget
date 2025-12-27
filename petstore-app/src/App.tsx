import { useState } from 'react';
import { PetList } from './components/PetList';
import { PetDetail } from './components/PetDetail';

function App() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-100">
      <PetList />
      {selectedPetId && (
        <PetDetail
          petId={selectedPetId}
          onClose={() => setSelectedPetId(null)}
        />
      )}
    </div>
  );
}

export default App;
