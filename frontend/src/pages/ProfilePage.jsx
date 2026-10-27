import { useState, useEffect } from 'react';
import { useAuth } from '../authContext';
import { updateProfile, changePassword } from '../api';
import Header from '../components/Header';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [countries,  setCountries]  = useState([]);
  const [provinces,  setProvinces]  = useState([]);
  const [loadingC,   setLoadingC]   = useState(true);
  const [loadingP,   setLoadingP]   = useState(false);

  const [form, setForm] = useState({
    phone_number: user?.phone_number  || '',
    country:      user?.country       || '',
    province:     user?.province      || '',
    city:         user?.city          || '',
    address_line: user?.address_line  || '',
    postal_code:  user?.postal_code   || '',
  });

  const [saving,       setSaving]       = useState(false);
  const [profileToast, setProfileToast] = useState('');
  const [profileError, setProfileError] = useState('');

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({
    old_password:         '',
    new_password:         '',
    confirm_new_password: '',
  });
  const [showPw,    setShowPw]    = useState({ old: false, new: false, confirm: false });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwToast,   setPwToast]   = useState('');
  const [pwError,   setPwError]   = useState('');

  const showToast = (setter, msg) => {
    setter(msg);
    setTimeout(() => setter(''), 2500);
  };

  // Fetch countries
  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries')
      .then(r => r.json())
      .then(data => {
        const names = (data.data || []).map(c => c.country).sort();
        setCountries(names);
      })
      .catch(() => {})
      .finally(() => setLoadingC(false));
  }, []);

  // Fetch provinces when country changes
  useEffect(() => {
    if (!form.country) { setProvinces([]); return; }
    setLoadingP(true);
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ country: form.country }),
    })
      .then(r => r.json())
      .then(data => {
        const states = (data.data?.states || []).map(s => s.name).sort();
        setProvinces(states);
      })
      .catch(() => setProvinces([]))
      .finally(() => setLoadingP(false));
  }, [form.country]);

  const updateForm = field => e =>
    setForm(f => ({
      ...f,
      [field]: e.target.value,
      // Reset province when country changes
      ...(field === 'country' ? { province: '' } : {}),
    }));

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setProfileError('');
    try {
      const data = await updateProfile(form);
      updateUser(data);
      showToast(setProfileToast, 'Profile updated successfully!');
    } catch (err) {
      setProfileError(
        err.response?.data?.detail ||
        'Failed to save profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    setPwSaving(true);
    setPwError('');
    try {
      await changePassword(pwForm);
      setPwForm({ old_password: '', new_password: '', confirm_new_password: '' });
      setShowChangePassword(false);
      showToast(setPwToast, 'Password updated successfully!');
    } catch (err) {
      const d = err.response?.data;
      setPwError(
        d?.old_password?.[0] ||
        d?.new_password?.[0] ||
        d?.confirm_new_password?.[0] ||
        d?.non_field_errors?.[0] ||
        'Failed to update password.'
      );
    } finally {
      setPwSaving(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <div className="page-wrapper">
      <Header />
      <div className="profile-page">
        <h1 className="profile-title">My Profile</h1>

        {/* Personal Info */}
        <div className="profile-section">
          <h2 className="profile-section-title">Personal Info</h2>
          <div className="profile-info-row">
            <span>Email</span>
            <span>{user?.email}</span>
          </div>
          {memberSince && (
            <div className="profile-info-row">
              <span>Member since</span>
              <span>{memberSince}</span>
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="profile-section">
          <h2 className="profile-section-title">Delivery Address</h2>
          <form className="profile-form" onSubmit={handleSave}>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                className="form-input"
                type="tel"
                required
                value={form.phone_number}
                onChange={updateForm('phone_number')}
                placeholder="+923001234567"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              {loadingC ? (
                <p style={{ fontSize: '13px', color: '#888' }}>Loading countries...</p>
              ) : (
                <select
                  className="filter-select"
                  style={{ width: '100%', padding: '10px 32px 10px 14px' }}
                  value={form.country}
                  onChange={updateForm('country')}
                >
                  <option value="">Select country</option>
                  {countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Province / State</label>
              <select
                className="filter-select"
                style={{ width: '100%', padding: '10px 32px 10px 14px' }}
                value={form.province}
                onChange={updateForm('province')}
                disabled={!form.country || loadingP}
              >
                <option value="">
                  {loadingP ? 'Loading...' : 'Select province'}
                </option>
                {provinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">City</label>
              <input
                className="form-input"
                type="text"
                value={form.city}
                onChange={updateForm('city')}
                placeholder="Lahore"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address Line</label>
              <input
                className="form-input"
                type="text"
                value={form.address_line}
                onChange={updateForm('address_line')}
                placeholder="123 Main Boulevard"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input
                className="form-input"
                type="text"
                value={form.postal_code}
                onChange={updateForm('postal_code')}
                placeholder="54000"
              />
            </div>

            {profileError && <p className="form-error">{profileError}</p>}

            <button
              className="btn-primary"
              type="submit"
              disabled={saving}
              style={{ width: '100%', padding: '12px 0' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Change Password */}
          <div className="change-password-section">
            <button
              className="change-password-toggle"
              onClick={() => setShowChangePassword(p => !p)}
            >
              {showChangePassword ? 'Cancel' : 'Change Password'}
            </button>

            {showChangePassword && (
              <form
                className="profile-form"
                style={{ marginTop: '16px' }}
                onSubmit={handleChangePassword}
              >
                {[
                  { key: 'old_password',         label: 'Current Password',  showKey: 'old'     },
                  { key: 'new_password',         label: 'New Password',      showKey: 'new'     },
                  { key: 'confirm_new_password', label: 'Confirm Password',  showKey: 'confirm' },
                ].map(({ key, label, showKey }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <div className="password-wrapper">
                      <input
                        className="form-input"
                        type={showPw[showKey] ? 'text' : 'password'}
                        required
                        value={pwForm[key]}
                        onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPw(p => ({ ...p, [showKey]: !p[showKey] }))}
                      >
                        {showPw[showKey] ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                ))}

                {pwError && <p className="form-error">{pwError}</p>}

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={pwSaving}
                  style={{ width: '100%', padding: '12px 0' }}
                >
                  {pwSaving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className={`pdp-toast${profileToast ? ' pdp-toast--visible' : ''}`}>
        {profileToast}
      </div>
      <div className={`pdp-toast${pwToast ? ' pdp-toast--visible' : ''}`}>
        {pwToast}
      </div>
    </div>
  );
}