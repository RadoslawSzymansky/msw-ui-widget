import React, { useState, useEffect } from 'react';
import { Pet } from '../types';
import { getPetById } from '../api/pets';

interface PetDetailProps {
  petId: number;
  onClose: () => void;
}

export const PetDetail: React.FC<PetDetailProps> = ({ petId, onClose }) => {
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPet = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPetById(petId);
        setPet(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pet');
      } finally {
        setLoading(false);
      }
    };

    loadPet();
  }, [petId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Pet Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        )}

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
            {error}
          </div>
        )}

        {pet && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID
              </label>
              <p className="text-lg font-semibold text-gray-800">{pet.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <p className="text-lg text-gray-800">{pet.name}</p>
            </div>
            {pet.tag && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag
                </label>
                <p className="text-lg text-gray-800">{pet.tag}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
