import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Check, X, AlertCircle, Heart } from 'lucide-react';

const AdminCharities = () => {
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState({ id: null, name: '', description: '', image_url: '' });
  const [error, setError] = useState('');

  const fetchCharities = async () => {
    try {
      const res = await adminService.getCharities();
      setCharities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharities();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await adminService.setCharityStatus(id, !currentStatus);
      fetchCharities();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (formState.id) {
        await adminService.updateCharity(formState.id, formState);
      } else {
        await adminService.createCharity(formState);
      }
      setShowForm(false);
      fetchCharities();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving charity');
    }
  };

  const handleEdit = (charity) => {
    setFormState({
      id: charity.id,
      name: charity.name,
      description: charity.description || '',
      image_url: charity.image_url || ''
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setFormState({ id: null, name: '', description: '', image_url: '' });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Charity Management</h1>
          <p className="text-slate-500 mt-1">Manage causes available for user subscriptions.</p>
        </div>
        {!showForm && (
          <button 
            onClick={handleAddNew}
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Charity
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">{formState.id ? 'Edit Charity' : 'Add New Charity'}</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Charity Name</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={e => setFormState({...formState, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={formState.image_url}
                  onChange={e => setFormState({...formState, image_url: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  rows="3"
                  value={formState.description}
                  onChange={e => setFormState({...formState, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors">
                Save Charity
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : charities.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">No charities added yet.</div>
        ) : (
          charities.map(charity => (
            <div key={charity.id} className={`bg-white rounded-2xl border ${charity.active ? 'border-slate-200 shadow-sm' : 'border-slate-200 opacity-60'} overflow-hidden`}>
              <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                {charity.image_url ? (
                  <img src={charity.image_url} alt={charity.name} className="w-full h-full object-cover" />
                ) : (
                  <Heart className="w-10 h-10 text-slate-300" />
                )}
                {!charity.active && (
                  <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Inactive</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{charity.name}</h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2">{charity.description || 'No description provided.'}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => handleToggleStatus(charity.id, charity.active)}
                    className={`flex items-center text-sm font-medium ${charity.active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                  >
                    {charity.active ? <><X className="w-4 h-4 mr-1" /> Deactivate</> : <><Check className="w-4 h-4 mr-1" /> Activate</>}
                  </button>
                  <button 
                    onClick={() => handleEdit(charity)}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCharities;
