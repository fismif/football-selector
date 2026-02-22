import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, upsertGroup, deleteGroup } from '../storage';
import { useToast } from '../components/Toast';
import type { Group, GroupMode } from '../types';

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMode, setNewMode] = useState<GroupMode>('advanced');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setGroups(await getGroups());
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const g = await upsertGroup({ id: crypto.randomUUID(), name: newName.trim(), mode: newMode });
      setGroups((prev) => [...prev, g]);
      setShowCreate(false);
      setNewName('');
      setNewMode('advanced');
      showToast(`Group "${g.name}" created!`);
      navigate(`/groups/${g.id}/`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to create group', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(group: Group) {
    if (!window.confirm(`Delete group "${group.name}" and all its players and matches?`)) return;
    try {
      await deleteGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      showToast(`"${group.name}" deleted`, 'error');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚽ Football Groups</h1>
          <p className="page-subtitle">{loading ? 'Loading…' : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>➕ New Group</button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ New Group</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Football Group – ALB"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Player Mode</label>
                <div className="mode-picker">
                  {(['advanced', 'simplified'] as GroupMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`mode-btn${newMode === m ? ' active' : ''}`}
                      onClick={() => setNewMode(m)}
                    >
                      {m === 'advanced' ? '🎮' : '⚡'}
                      <strong>{m === 'advanced' ? 'Advanced' : 'Simplified'}</strong>
                      <span className="mode-btn-sub">
                        {m === 'advanced'
                          ? '5 skill attributes'
                          : 'Overall rating + position'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Creating…' : '✅ Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><div className="spinner" />Loading groups…</div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚽</div>
          <h3>No groups yet</h3>
          <p>Create your first group to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>➕ New Group</button>
        </div>
      ) : (
        <div className="group-grid">
          {groups.map((g) => (
            <div key={g.id} className="group-card" onClick={() => navigate(`/groups/${g.id}/`)}>
              <div className="group-card-header">
                <span className={`mode-badge mode-badge-${g.mode}`}>
                  {g.mode === 'advanced' ? '🎮 Advanced' : '⚡ Simplified'}
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(g); }}
                >🗑️</button>
              </div>
              <h2 className="group-card-name">⚽ {g.name}</h2>
              <div className="group-card-footer">
                <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Open →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
